import {
  getBulletDef,
  getElapseHalf,
  getSlotColor,
  getSlotFollowBeats,
  getSlotName,
  isElapsePiece,
} from "../defs/bullets.js";
import { EPSILON, QUARTER_BEAT } from "../utils/beatMath.js";
import { getTimelineDomainMetrics, timelineLeft } from "./timelineMetrics.js";

function timingLabel(timing) {
  if (timing === "beat") {
    return "on";
  }

  if (timing === "offbeat") {
    return "off";
  }

  return "on/off";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHighlightedText(text, highlight) {
  const safeText = String(text ?? "");
  const marker = String(highlight ?? "");
  if (!marker || !safeText.includes(marker)) {
    return escapeHtml(safeText);
  }

  const index = safeText.indexOf(marker);
  return [
    escapeHtml(safeText.slice(0, index)),
    `<span class="upgrade-highlight">${escapeHtml(marker)}</span>`,
    escapeHtml(safeText.slice(index + marker.length)),
  ].join("");
}

function renderTimingStats(piece, def) {
  const follow = getSlotFollowBeats(piece);
  const text = `${timingLabel(def.timing)} | lead ${def.leadBeats ?? 0} | follow ${follow}`;
  if (piece.upgraded && piece.id === "pair") {
    return renderHighlightedText(text, "follow 0");
  }

  return escapeHtml(text);
}

function renderBulletDescription(piece, def) {
  if (piece.upgraded && piece.id === "pair") {
    return escapeHtml(def.description ?? "");
  }

  if (piece.upgraded && def.upgradeDescription) {
    return renderHighlightedText(def.upgradeDescription, def.upgradeHighlight);
  }

  return escapeHtml(def.description ?? "");
}

function timingClass(def) {
  return `is-timing-${def.timing}`;
}

function elapseClasses(piece) {
  if (!isElapsePiece(piece)) {
    return "";
  }

  return `is-elapse-half is-elapse-${getElapseHalf(piece)}`;
}

function renderBulletGlyph(def) {
  return `
    <span class="bullet-glyph ${timingClass(def)}">
      <span class="bullet-glyph-main"></span>
    </span>
  `;
}

function renderMiniBullet({
  def,
  color,
  draggable = false,
  uid = "",
  source = "inventory",
  disabled = false,
  upgraded = false,
  extraClasses = "",
  domainMetrics,
}) {
  const style = `--piece-color:${color}`;
  const domainAttrs = domainMetrics
    ? `data-domain-width="${domainMetrics.width}" data-domain-offset="${domainMetrics.offset}"`
    : "";
  const classes = [
    "inventory-token",
    timingClass(def),
    extraClasses,
    upgraded ? "is-upgraded" : "",
    disabled ? "is-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const token = draggable
    ? `
        <button
          class="${classes}"
          draggable="true"
          style="${style}"
          data-piece-uid="${uid}"
          data-piece-source="${source}"
          ${domainAttrs}
          data-action="select-piece:${uid}"
          aria-label="Drag bullet"
        >
          ${renderBulletGlyph(def)}
        </button>
      `
    : `
        <span
          class="${classes}"
          style="${style}"
          ${uid ? `data-piece-uid="${uid}" data-piece-source="${source}"` : ""}
          ${domainAttrs}
        >
          ${renderBulletGlyph(def)}
        </span>
      `;

  return `
    <span class="inventory-token-slot">
      ${token}
    </span>
  `;
}

function renderBulletCard({ piece, domainMetrics, onTrack = false, action = "", choiceIndex = null, disabled = false }) {
  const def = piece.def ?? getBulletDef(piece.id);
  const name = piece.name ?? getSlotName(piece);
  const color = piece.color ?? getSlotColor(piece);
  const classes = [
    "inventory-card",
    onTrack ? "is-on-track" : "",
    piece.upgraded ? "is-upgraded" : "",
    disabled ? "is-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const actionAttr = action ? `data-action="${action}:${choiceIndex}"` : `data-action="select-piece:${piece.uid}"`;
  const buttonDisabled = disabled ? "disabled" : "";

  return `
    <div class="${classes}" style="--piece-color:${color}">
      <button class="inventory-card-main" ${actionAttr} ${buttonDisabled}>
        <span class="piece-copy">
          <strong>${name}</strong>
          <small>${renderTimingStats(piece, def)}</small>
          <small>${renderBulletDescription(piece, def)}</small>
        </span>
      </button>
      ${renderMiniBullet({
        def,
        color,
        draggable: !onTrack && !disabled && Boolean(piece.uid),
        uid: piece.uid,
        source: "inventory",
        disabled: onTrack || disabled,
        upgraded: Boolean(piece.upgraded),
        extraClasses: elapseClasses(piece),
        domainMetrics,
      })}
    </div>
  `;
}

function renderElapseInventoryCard(track, pieces, unavailableUids = new Set()) {
  const left = pieces.find((piece) => getElapseHalf(piece) === "left");
  const right = pieces.find((piece) => getElapseHalf(piece) === "right");
  const representative = left ?? right;
  const def = getBulletDef("elapse");
  const inventoryIds = new Set(track.inventory.map((piece) => piece.uid));
  const allOnTrack = pieces.every((piece) =>
    !inventoryIds.has(piece.uid) || unavailableUids.has(piece.uid)
  );
  const upgraded = pieces.some((piece) => piece.upgraded);
  const classes = [
    "inventory-card",
    "is-elapse-card",
    allOnTrack ? "is-on-track" : "",
    upgraded ? "is-upgraded" : "",
  ].filter(Boolean).join(" ");
  const renderHalf = (piece) => {
    if (!piece) {
      return "";
    }

    const halfDef = getBulletDef(piece.id);
    const inInventory = inventoryIds.has(piece.uid) && !unavailableUids.has(piece.uid);
    return renderMiniBullet({
      def: halfDef,
      color: getSlotColor(piece),
      draggable: inInventory,
      uid: piece.uid,
      source: "inventory",
      disabled: !inInventory,
      upgraded: Boolean(piece.upgraded),
      extraClasses: elapseClasses(piece),
      domainMetrics: getTimelineDomainMetrics(
        track.getDomain(piece, 0.5),
        track.cycleBeats,
        0.5,
      ),
    });
  };

  return `
    <div class="${classes}" style="--piece-color:${def.color}">
      <button class="inventory-card-main" data-action="select-piece:${representative?.uid ?? ""}">
        <span class="piece-copy">
          <strong>${def.name}</strong>
          <small>off | lead 0.5 | follow 0.5</small>
          <small>${upgraded
            ? renderHighlightedText(def.upgradeDescription, def.upgradeHighlight)
            : escapeHtml(def.description)
          }</small>
        </span>
      </button>
      <span class="elapse-token-pair">
        ${renderHalf(left)}
        ${renderHalf(right)}
      </span>
    </div>
  `;
}

function getQuarterBeatMarks(track) {
  const marks = [];
  for (let beat = 0; beat < track.cycleBeats - EPSILON; beat += QUARTER_BEAT) {
    marks.push(Number(beat.toFixed(2)));
  }

  return marks;
}

function renderTrackEditor(track, hiddenUids = new Set(), scrapChips = []) {
  const placementViews = track
    .getPlacementViews()
    .filter((entry) => !hiddenUids.has(entry.uid));
  const marks = track
    .getTimelineMarks()
    .map(
      (mark) => `
        <span class="timeline-mark ${mark.isBeat ? "is-beat" : "is-off"}" style="left:${timelineLeft(mark.beat, track.cycleBeats)}%">
          ${mark.isBeat ? `<span>${mark.beat}</span>` : ""}
        </span>
      `,
    )
    .join("");

  const drops = track
    .getTimelineMarks()
    .map(
      (mark) => `
        <button
          class="timeline-drop"
          style="left:${timelineLeft(mark.beat, track.cycleBeats)}%"
          data-drop-beat="${mark.beat}"
          aria-label="Place at beat ${mark.beat}"
        ></button>
      `,
    )
    .join("");

  const chipDrops = getQuarterBeatMarks(track)
    .map(
      (beat) => `
        <button
          class="chip-timeline-drop"
          style="left:${timelineLeft(beat, track.cycleBeats)}%"
          data-chip-drop-beat="${beat}"
          aria-label="Place chip at beat ${beat}"
        ></button>
      `,
    )
    .join("");

  const elapseGroups = new Map();
  placementViews.forEach((entry) => {
    if (!isElapsePiece(entry) || !entry.groupId) {
      return;
    }

    const group = elapseGroups.get(entry.groupId) ?? {};
    group[getElapseHalf(entry)] = entry;
    elapseGroups.set(entry.groupId, group);
  });
  const elapseLinks = [...elapseGroups.values()]
    .map((group) => {
      const left = group.left;
      const right = group.right;
      if (!left || !right || right.position <= left.position) {
        return "";
      }

      const leftPercent = timelineLeft(left.position, track.cycleBeats);
      const rightPercent = timelineLeft(right.position, track.cycleBeats);
      return `
        <span
          class="timeline-elapse-link ${left.elapseActive && right.elapseActive ? "" : "is-elapse-inactive"}"
          style="left:${leftPercent}%;width:${rightPercent - leftPercent}%;--piece-color:${left.color}"
        ></span>
      `;
    })
    .join("");

  const placements = placementViews
    .map((entry) => {
      const bulletLeft = timelineLeft(entry.position, track.cycleBeats);
      const domainMetrics = getTimelineDomainMetrics(entry.domain, track.cycleBeats, entry.position);
      const selected = entry.uid === track.selectedUid ? " is-selected" : "";
      const pieceClasses = [
        timingClass(entry.def),
        elapseClasses(entry),
        entry.elapseActive ? "" : "is-elapse-inactive",
        entry.upgraded ? "is-upgraded" : "",
        selected,
      ].filter(Boolean).join(" ");
      return `
        <span
          class="timeline-domain ${entry.elapseActive ? "" : "is-elapse-inactive"}"
          style="left:${domainMetrics.left}%;width:${domainMetrics.width}%;--piece-color:${entry.color}"
        ></span>
        <button
          class="timeline-piece ${pieceClasses}"
          draggable="true"
          style="left:${bulletLeft}%;--piece-color:${entry.color}"
          data-piece-uid="${entry.uid}"
          data-piece-source="track"
          data-domain-width="${domainMetrics.width}"
          data-domain-offset="${domainMetrics.offset}"
          data-action="select-piece:${entry.uid}"
          title="${entry.name} | ${timingLabel(entry.def.timing)} beat"
        >
          ${renderBulletGlyph(entry.def)}
        </button>
      `;
    })
    .join("");
  const placementUids = new Set(placementViews.map((entry) => entry.uid));
  const chips = scrapChips
    .filter((chip) =>
      chip.hostUid &&
      Number.isFinite(chip.beat) &&
      placementUids.has(chip.hostUid) &&
      !hiddenUids.has(chip.hostUid)
    )
    .map((chip) => {
      const host = track.findPiece(chip.hostUid);
      const color = chip.color ?? (host ? getSlotColor(host) : "#9aa1ad");
      return `
        <button
          class="scrap-chip-token timeline-chip"
          draggable="true"
          style="left:${timelineLeft(chip.beat, track.cycleBeats)}%;--chip-color:${color};--piece-color:${color}"
          data-chip-uid="${chip.uid}"
          data-chip-source="track"
          data-chip-host="${chip.hostUid}"
          title="${escapeHtml(chip.sourceName ?? "Chip")} at ${chip.beat}"
          aria-label="Drag placed chip"
        >
          <span class="scrap-chip-body"></span>
        </button>
      `;
    })
    .join("");

  return `
    <div class="timeline-editor" data-timeline>
      <div class="timeline-head">
        <span>Track</span>
        <span>${track.cycleBeats} beats</span>
      </div>
      <div class="timeline-body">
        ${marks}
        ${drops}
        ${chipDrops}
        ${elapseLinks}
        ${chips}
        ${placements}
      </div>
    </div>
  `;
}

function renderInventory(track, unavailableUids = new Set()) {
  const inventoryIds = new Set(track.inventory.map((piece) => piece.uid));
  const owned = track.allPieces
    .map((piece) => ({
      ...piece,
      def: getBulletDef(piece.id),
      name: getSlotName(piece),
      color: getSlotColor(piece),
    }));
  const renderedElapseGroups = new Set();
  const contents = owned.length
    ? owned
        .map((piece) => {
          if (isElapsePiece(piece) && piece.groupId) {
            if (renderedElapseGroups.has(piece.groupId)) {
              return "";
            }

            renderedElapseGroups.add(piece.groupId);
            return renderElapseInventoryCard(
              track,
              owned.filter((candidate) => candidate.groupId === piece.groupId),
              unavailableUids,
            );
          }

          return renderBulletCard({
            piece,
            domainMetrics: getTimelineDomainMetrics(track.getDomain(piece, 0), track.cycleBeats, 0),
            onTrack: !inventoryIds.has(piece.uid) || unavailableUids.has(piece.uid),
          });
        })
        .join("")
    : `<p class="inventory-empty">Inventory empty.</p>`;

  return `
    <div class="inventory-panel" data-inventory-drop>
      <div class="timeline-head">
        <span>Inventory</span>
        <span>drag bullets here to remove them</span>
      </div>
      <div class="inventory-list">${contents}</div>
    </div>
  `;
}

export {
  elapseClasses,
  escapeHtml,
  renderBulletDescription,
  renderHighlightedText,
  renderInventory,
  renderMiniBullet,
  renderTimingStats,
  renderTrackEditor,
  timingLabel,
};
