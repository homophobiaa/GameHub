import {
  getBulletDef,
  getElapseHalf,
  getSlotColor,
  getSlotFollowBeats,
  getSlotName,
  isElapsePiece,
} from "../defs/bullets.js";
import {
  EPSILON,
  HALF_BEAT,
  alignTimingAtOrAfter,
  isOffBeat,
  isOnBeat,
  isValidTiming,
  snapToHalfBeat,
} from "../utils/beatMath.js";
import { GOOD_WINDOW_BEATS, TRACK_RELOAD_BEATS } from "../config/gameplay.js";

function clonePiece(piece) {
  return {
    uid: piece.uid,
    id: piece.id,
    upgraded: Boolean(piece.upgraded),
    groupId: piece.groupId,
  };
}

function clonePlacement(placement) {
  return {
    ...clonePiece(placement),
    beat: placement.beat,
  };
}

function finiteBeat(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function beatReleaseAfter(targetBeat) {
  return Math.floor(finiteBeat(targetBeat)) + 1;
}

function domainsOverlap(a, b) {
  return a.start < b.end - EPSILON && a.end > b.start + EPSILON;
}

function nextUid(pieces) {
  const max = pieces.reduce((highest, piece) => {
    const numeric = Number(String(piece.uid).replace("p", ""));
    return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest;
  }, 0);
  return `p${max + 1}`;
}

function nextGroupId(pieces) {
  const max = pieces.reduce((highest, piece) => {
    const numeric = Number(String(piece.groupId ?? "").replace("g", ""));
    return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest;
  }, 0);
  return `g${max + 1}`;
}

export function cloneTrackConfig(config) {
  return {
    cycleBeats: config.cycleBeats,
    placements: config.placements.map(clonePlacement),
    inventory: config.inventory.map(clonePiece),
  };
}

export class BeatTrack {
  constructor(config) {
    const initial = Array.isArray(config)
      ? {
          cycleBeats: Math.max(4, config.length * 2),
          placements: config.map((slot, index) => ({
            uid: `p${index + 1}`,
            id: slot.id,
            upgraded: Boolean(slot.upgraded),
            beat: index + 1,
          })),
          inventory: [],
        }
      : cloneTrackConfig(config);

    this.cycleBeats = initial.cycleBeats;
    this.placements = initial.placements;
    this.inventory = initial.inventory;
    this.pieceOrder = [...initial.placements, ...initial.inventory].map((piece) => piece.uid);
    this.selectedUid = this.placements[0]?.uid ?? this.inventory[0]?.uid ?? null;
    this.invalidateTrackCache();
    this.start(0);
  }

  invalidatePieceCache() {
    this._allPieces = null;
    this._piecesByUid = null;
    this._groupPiecesById = null;
  }

  invalidatePlacementCache() {
    this._sortedPlacements = null;
    this._placementUids = null;
    this._timelineMarks = null;
  }

  invalidateTrackCache() {
    this.invalidatePieceCache();
    this.invalidatePlacementCache();
  }

  get allPieces() {
    if (!this._allPieces) {
      this._piecesByUid = new Map(
        [...this.placements, ...this.inventory].map((piece) => [piece.uid, piece]),
      );
      this._allPieces = this.pieceOrder
        .map((uid) => this._piecesByUid.get(uid))
        .filter(Boolean);
    }

    return this._allPieces;
  }

  get piecesByUid() {
    if (!this._piecesByUid) {
      this.allPieces;
    }

    return this._piecesByUid;
  }

  get slots() {
    return this.placements;
  }

  get sortedPlacements() {
    if (!this._sortedPlacements) {
      this._sortedPlacements = [...this.placements].sort((a, b) => a.beat - b.beat);
    }

    return this._sortedPlacements;
  }

  get placementUids() {
    if (!this._placementUids) {
      this._placementUids = new Set(this.placements.map((placement) => placement.uid));
    }

    return this._placementUids;
  }

  get currentEntry() {
    const placement = this.sortedPlacements[this.currentIndex];
    return placement ? this.createEntry(placement) : null;
  }

  createEntry(placement) {
    const def = getBulletDef(placement.id);
    return {
      ...placement,
      slot: {
        uid: placement.uid,
        id: placement.id,
        upgraded: placement.upgraded,
        groupId: placement.groupId,
      },
      def,
      leadBeats: def.leadBeats ?? 0,
      followBeats: getSlotFollowBeats(placement),
      position: placement.beat,
      name: getSlotName(placement),
      color: getSlotColor(placement),
      domain: this.getDomain(placement),
      elapseHalf: getElapseHalf(placement),
      elapseActive: isElapsePiece(placement)
        ? this.isElapseGroupCompleteOnTrack(placement.groupId)
        : true,
    };
  }

  getDomain(piece, beat = piece.beat) {
    const def = getBulletDef(piece.id);
    return {
      start: beat - (def.leadBeats ?? 0),
      end: beat + getSlotFollowBeats(piece),
    };
  }

  getPlacementViews() {
    return this.sortedPlacements.map((placement) => this.createEntry(placement));
  }

  getInventoryViews() {
    const inventoryUids = new Set(this.inventory.map((piece) => piece.uid));
    return this.allPieces.filter((piece) => inventoryUids.has(piece.uid)).map((piece) => ({
      ...piece,
      name: getSlotName(piece),
      color: getSlotColor(piece),
      def: getBulletDef(piece.id),
    }));
  }

  getTimelineMarks() {
    if (!this._timelineMarks) {
      const marks = [];
      for (let beat = 0; beat < this.cycleBeats - EPSILON; beat += HALF_BEAT) {
        marks.push({
          beat,
          isBeat: isOnBeat(beat),
          isOffBeat: isOffBeat(beat),
          left: (beat / this.cycleBeats) * 100,
        });
      }

      this._timelineMarks = marks;
    }

    return this._timelineMarks;
  }

  start(currentBeat) {
    const safeCurrentBeat = finiteBeat(currentBeat);
    this.currentIndex = 0;
    this.readyAfterBeat = safeCurrentBeat;
    this.lockUntilBeat = safeCurrentBeat;
    this.reloadUntilBeat = null;
    this.baseTargetBeat = null;
    this.syncTarget(safeCurrentBeat);
  }

  setSelected(uid) {
    if (this.piecesByUid.has(uid)) {
      this.selectedUid = uid;
    }
  }

  findPiece(uid) {
    return this.piecesByUid.get(uid) ?? null;
  }

  getGroupPieces(groupId) {
    if (!this._groupPiecesById) {
      this._groupPiecesById = new Map();
      this.allPieces.forEach((piece) => {
        if (!piece.groupId) {
          return;
        }

        const group = this._groupPiecesById.get(piece.groupId) ?? [];
        group.push(piece);
        this._groupPiecesById.set(piece.groupId, group);
      });
    }

    return this._groupPiecesById.get(groupId) ?? [];
  }

  getElapseMate(piece) {
    if (!isElapsePiece(piece) || !piece.groupId) {
      return null;
    }

    const mateId = getElapseHalf(piece) === "left" ? "elapse-right" : "elapse-left";
    return this.getGroupPieces(piece.groupId).find((candidate) => candidate.id === mateId) ?? null;
  }

  isPieceOnTrack(uid) {
    return this.placementUids.has(uid);
  }

  isElapseGroupCompleteOnTrack(groupId) {
    const pieces = this.getGroupPieces(groupId);
    return ["elapse-left", "elapse-right"].every((id) =>
      pieces.some((piece) => piece.id === id && this.isPieceOnTrack(piece.uid)),
    );
  }

  getCurrentCycleStart(currentBeat) {
    return Math.floor(finiteBeat(currentBeat) / this.cycleBeats) * this.cycleBeats;
  }

  getInitialTargetBeat(placement, currentBeat) {
    const safeCurrentBeat = finiteBeat(currentBeat);
    const def = getBulletDef(placement.id);
    let cycleBeat = this.getCurrentCycleStart(currentBeat) + placement.beat;
    let absoluteBeat = alignTimingAtOrAfter(cycleBeat, def.timing);

    while (absoluteBeat < safeCurrentBeat - GOOD_WINDOW_BEATS) {
      cycleBeat += this.cycleBeats;
      absoluteBeat = alignTimingAtOrAfter(cycleBeat, def.timing);
    }

    return absoluteBeat;
  }

  getGapBetweenPlacements(fromIndex, toIndex) {
    const sorted = this.sortedPlacements;
    const from = sorted[fromIndex];
    const to = sorted[toIndex];
    if (!from || !to) {
      return HALF_BEAT;
    }

    return to.beat > from.beat
      ? to.beat - from.beat
      : to.beat + this.cycleBeats - from.beat;
  }

  isWrapTransition(fromIndex, toIndex) {
    return this.sortedPlacements.length > 0 && toIndex <= fromIndex;
  }

  getTransitionGap(fromIndex, toIndex) {
    const gap = this.getGapBetweenPlacements(fromIndex, toIndex);
    return this.isWrapTransition(fromIndex, toIndex)
      ? Math.max(gap, TRACK_RELOAD_BEATS)
      : gap;
  }

  getTargetBeat(currentBeat) {
    const safeCurrentBeat = finiteBeat(currentBeat, finiteBeat(this.targetBeat));
    const entry = this.currentEntry;
    if (!entry) {
      return safeCurrentBeat;
    }

    if (!Number.isFinite(this.baseTargetBeat)) {
      this.baseTargetBeat = this.getInitialTargetBeat(entry, safeCurrentBeat);
    }

    const minBeat = Math.max(finiteBeat(this.readyAfterBeat), finiteBeat(this.lockUntilBeat));
    const target = this.baseTargetBeat;
    if (Number.isFinite(target) && target >= minBeat - EPSILON && safeCurrentBeat - target <= GOOD_WINDOW_BEATS) {
      return target;
    }

    this.baseTargetBeat = alignTimingAtOrAfter(Math.max(safeCurrentBeat, minBeat), entry.def.timing);
    return this.baseTargetBeat;
  }

  syncTarget(currentBeat) {
    this.targetBeat = this.getTargetBeat(currentBeat);
    return this.targetBeat;
  }

  judgeShot(currentBeat) {
    const safeCurrentBeat = finiteBeat(currentBeat, finiteBeat(this.targetBeat));
    this.syncTarget(safeCurrentBeat);

    if (!this.currentEntry) {
      return {
        blocked: true,
        reason: "empty",
        entry: null,
        targetBeat: this.targetBeat,
        waitBeats: 0,
      };
    }

    if (safeCurrentBeat < finiteBeat(this.lockUntilBeat) - EPSILON) {
      return {
        blocked: true,
        reason: safeCurrentBeat < finiteBeat(this.reloadUntilBeat, -Infinity) - EPSILON ? "reload" : "wait",
        entry: this.currentEntry,
        targetBeat: this.targetBeat,
        waitBeats: finiteBeat(this.lockUntilBeat) - safeCurrentBeat,
      };
    }

    const delta = safeCurrentBeat - this.targetBeat;
    return {
      blocked: false,
      entry: this.currentEntry,
      targetBeat: this.targetBeat,
      delta,
      shouldAdvance: Math.abs(delta) <= GOOD_WINDOW_BEATS,
    };
  }

  advanceFromShot(targetBeat) {
    const sorted = this.sortedPlacements;
    if (sorted.length === 0) {
      return;
    }
    const safeTargetBeat = finiteBeat(targetBeat, finiteBeat(this.targetBeat));

    const previousIndex = this.currentIndex;
    this.currentIndex += 1;
    if (this.currentIndex >= sorted.length) {
      this.currentIndex = 0;
    }

    const nextEntry = this.currentEntry;
    const didWrap = this.isWrapTransition(previousIndex, this.currentIndex);
    const gap = this.getTransitionGap(previousIndex, this.currentIndex);
    const nextTargetBeat = alignTimingAtOrAfter(safeTargetBeat + gap, nextEntry.def.timing);
    const reloadReleaseBeat = didWrap ? safeTargetBeat + TRACK_RELOAD_BEATS : null;
    this.reloadUntilBeat = reloadReleaseBeat;
    this.readyAfterBeat = didWrap ? reloadReleaseBeat : safeTargetBeat + HALF_BEAT;
    this.lockUntilBeat = this.readyAfterBeat;
    this.baseTargetBeat = nextTargetBeat;
    this.targetBeat = this.getTargetBeat(this.readyAfterBeat);
  }

  registerBadShot(targetBeat) {
    const safeTargetBeat = finiteBeat(targetBeat, finiteBeat(this.targetBeat));
    const releaseBeat = beatReleaseAfter(safeTargetBeat);
    this.reloadUntilBeat = null;
    this.readyAfterBeat = Math.max(finiteBeat(this.readyAfterBeat), releaseBeat);
    this.lockUntilBeat = releaseBeat;
    if (!this.currentEntry) {
      this.baseTargetBeat = null;
      this.targetBeat = releaseBeat;
      return;
    }
    this.baseTargetBeat = alignTimingAtOrAfter(releaseBeat, this.currentEntry.def.timing);
    this.targetBeat = this.getTargetBeat(releaseBeat);
  }

  getPreview(currentBeat, count = 8) {
    const sorted = this.sortedPlacements;
    if (sorted.length === 0) {
      return [];
    }

    const preview = [];
    let index = this.currentIndex;
    let absoluteBeat = this.getTargetBeat(currentBeat);

    for (let i = 0; i < count; i += 1) {
      const placement = sorted[index];
      const entry = this.createEntry(placement);
      preview.push({
        ...entry,
        absoluteBeat,
        isCurrent: i === 0,
      });

      const previousIndex = index;
      index += 1;
      if (index >= sorted.length) {
        index = 0;
      }

      const next = this.createEntry(sorted[index]);
      const gap = this.getTransitionGap(previousIndex, index);
      absoluteBeat = alignTimingAtOrAfter(absoluteBeat + gap, next.def.timing);
    }

    return preview;
  }

  canPlace(uid, rawBeat) {
    const piece = this.findPiece(uid);
    if (!piece) {
      return { ok: false, reason: "Missing bullet." };
    }

    const beat = Number(rawBeat);
    const def = getBulletDef(piece.id);
    if (!Number.isFinite(beat) || Math.abs(beat - snapToHalfBeat(beat)) > EPSILON) {
      return { ok: false, reason: "Use a beat marker." };
    }

    if (beat < 0 || beat >= this.cycleBeats - EPSILON) {
      return { ok: false, reason: "Outside the track." };
    }

    if (!isValidTiming(def.timing, beat)) {
      return {
        ok: false,
        reason: def.timing === "beat" ? "On-beat only." : "Off-beat only.",
      };
    }

    if (isElapsePiece(piece)) {
      const half = getElapseHalf(piece);
      const mate = this.getElapseMate(piece);
      const matePlacement = mate
        ? this.placements.find((placement) => placement.uid === mate.uid)
        : null;

      if (half === "left" && matePlacement && beat >= matePlacement.beat - EPSILON) {
        return { ok: false, reason: "Left half must be before right." };
      }

      if (half === "right" && matePlacement && beat <= matePlacement.beat + EPSILON) {
        return { ok: false, reason: "Right half must be after left." };
      }

      if (half === "left" && !matePlacement && beat >= this.cycleBeats - HALF_BEAT - EPSILON) {
        return { ok: false, reason: "Leave room for the right half." };
      }

      if (half === "right" && !matePlacement && beat <= HALF_BEAT + EPSILON) {
        return { ok: false, reason: "Leave room for the left half." };
      }
    }

    const occupied = this.placements.find(
      (placement) => placement.uid !== uid && Math.abs(placement.beat - beat) < EPSILON,
    );
    if (occupied) {
      return { ok: false, reason: `Already has ${getSlotName(occupied)}.` };
    }

    const domain = this.getDomain(piece, beat);
    if (domain.start < -EPSILON || domain.end > this.cycleBeats + EPSILON) {
      return { ok: false, reason: "Lead/follow time leaves the loop." };
    }

    const overlapping = this.placements.find((placement) => {
      if (placement.uid === uid) {
        return false;
      }

      return domainsOverlap(domain, this.getDomain(placement));
    });

    if (overlapping) {
      return { ok: false, reason: `Overlaps ${getSlotName(overlapping)}.` };
    }

    return { ok: true, beat, domain };
  }

  movePieceToTrack(uid, beat) {
    const result = this.canPlace(uid, beat);
    if (!result.ok) {
      return result;
    }

    const existing = this.findPiece(uid);
    this.inventory = this.inventory.filter((piece) => piece.uid !== uid);
    this.placements = this.placements.filter((placement) => placement.uid !== uid);
    this.placements.push({
      ...clonePiece(existing),
      beat: result.beat,
    });
    this.invalidateTrackCache();
    this.selectedUid = uid;
    this.currentIndex = Math.min(this.currentIndex ?? 0, this.sortedPlacements.length - 1);
    this.baseTargetBeat = null;
    this.syncTarget(this.targetBeat ?? 0);
    return result;
  }

  movePieceToInventory(uid) {
    const placement = this.placements.find((piece) => piece.uid === uid);
    if (!placement) {
      return false;
    }

    const uidsToMove = isElapsePiece(placement) && placement.groupId
      ? this.getGroupPieces(placement.groupId).map((piece) => piece.uid)
      : [uid];
    const inventoryUids = new Set(this.inventory.map((piece) => piece.uid));
    const movingPieces = this.allPieces.filter((piece) => uidsToMove.includes(piece.uid));
    this.placements = this.placements.filter((piece) => !uidsToMove.includes(piece.uid));
    movingPieces.forEach((piece) => {
      if (!inventoryUids.has(piece.uid)) {
        this.inventory.push(clonePiece(piece));
      }
    });
    this.invalidateTrackCache();
    this.selectedUid = uid;
    this.currentIndex = Math.min(this.currentIndex ?? 0, Math.max(0, this.sortedPlacements.length - 1));
    this.baseTargetBeat = null;
    this.syncTarget(this.targetBeat ?? 0);
    return true;
  }

  removePiece(uid) {
    const piece = this.findPiece(uid);
    if (!piece) {
      return [];
    }

    const uidsToRemove = isElapsePiece(piece) && piece.groupId
      ? this.getGroupPieces(piece.groupId).map((groupPiece) => groupPiece.uid)
      : [uid];
    const removeSet = new Set(uidsToRemove);
    const removedPieces = this.allPieces
      .filter((nextPiece) => removeSet.has(nextPiece.uid))
      .map(clonePiece);

    this.placements = this.placements.filter((nextPiece) => !removeSet.has(nextPiece.uid));
    this.inventory = this.inventory.filter((nextPiece) => !removeSet.has(nextPiece.uid));
    this.pieceOrder = this.pieceOrder.filter((nextUid) => !removeSet.has(nextUid));
    this.invalidateTrackCache();

    if (removeSet.has(this.selectedUid)) {
      this.selectedUid = this.placements[0]?.uid ?? this.inventory[0]?.uid ?? null;
    }
    this.currentIndex = Math.min(this.currentIndex ?? 0, Math.max(0, this.sortedPlacements.length - 1));
    this.baseTargetBeat = null;
    this.syncTarget(this.targetBeat ?? 0);
    return removedPieces;
  }

  addInventoryPiece(id) {
    if (id === "elapse") {
      const pieces = this.allPieces;
      const groupId = nextGroupId(pieces);
      const leftUid = nextUid(pieces);
      const rightUid = nextUid([...pieces, { uid: leftUid }]);
      this.pieceOrder.push(leftUid, rightUid);
      this.inventory.push(
        { uid: leftUid, id: "elapse-left", upgraded: false, groupId },
        { uid: rightUid, id: "elapse-right", upgraded: false, groupId },
      );
      this.invalidatePieceCache();
      this.selectedUid = leftUid;
      return;
    }

    const uid = nextUid(this.allPieces);
    this.pieceOrder.push(uid);
    this.inventory.push({ uid, id, upgraded: false });
    this.invalidatePieceCache();
    this.selectedUid = uid;
  }

  upgradePiece(uid) {
    const piece = this.findPiece(uid);
    if (piece) {
      const piecesToUpgrade = isElapsePiece(piece) && piece.groupId
        ? this.getGroupPieces(piece.groupId)
        : [piece];
      piecesToUpgrade.forEach((nextPiece) => {
        nextPiece.upgraded = true;
      });
      this.baseTargetBeat = null;
      this.syncTarget(this.targetBeat ?? 0);
    }
  }

  expandCycle(beats = 1) {
    this.cycleBeats = Math.min(12, this.cycleBeats + beats);
    this._timelineMarks = null;
    this.baseTargetBeat = null;
  }
}
