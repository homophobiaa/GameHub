import { getAspectForSource } from "../defs/aspects.js";
import { getEnemyDef } from "../defs/enemies.js";
import { tryActivateEnemySpawnPattern } from "./enemySpawnPatterns.js";
import { createProceduralWave } from "./proceduralWaves.js";
import {
  EPSILON,
  nextBetweenHalfBeatAfter,
  nextBetweenHalfBeatAtOrAfter,
} from "../utils/beatMath.js";
import {
  LANE_COUNT,
  LANES,
  LEAP_FIELD_COOLDOWN_SECONDS,
} from "../config/gameplay.js";
import { toEnemyFrameIndex } from "./enemyFrameIndex.js";
import { getLeapLandBeat } from "./leapMotion.js";
import { randomInt } from "../utils/random.js";

const PATTERN_ACTIVATION_GAP_BEATS = 1.25;
const LOW_ENEMY_HURRY_PROGRESS = 0.5;
const LOW_ENEMY_HURRY_LIVE_COUNT = 2;
const LOW_ENEMY_HURRY_MIN_GAP_BEATS = 0.75;

let enemyId = 0;

function randomLane() {
  return randomInt(LANE_COUNT);
}

function resolveScheduleLane(rule, lastLane) {
  if (Number.isInteger(rule)) {
    return rule;
  }

  if (rule === "same") {
    return lastLane;
  }

  return randomLane();
}

function liveEnemies(enemies) {
  return toEnemyFrameIndex(enemies).liveEnemies();
}

function resolveSpawnBeat(spawn) {
  return spawn.lockedBeat
    ? spawn.beat
    : nextBetweenHalfBeatAtOrAfter(spawn.beat);
}

function leapTargets(enemies) {
  return toEnemyFrameIndex(enemies).leapTargets();
}

function countLiveByLane(enemies) {
  return toEnemyFrameIndex(enemies).liveCountsByLane();
}

function laneWithMostLive(enemies, blockedLanes) {
  const counts = countLiveByLane(enemies);
  const lanes = LANES
    .filter((lane) => !blockedLanes.has(lane))
    .sort((a, b) => counts[b] - counts[a]);
  return lanes[0] ?? randomLane();
}

function getWaveDefinition(waveIndex, options = {}) {
  return createProceduralWave(waveIndex, options);
}

function spreadGrantorFor(type, aspectGrantors = []) {
  return aspectGrantors.includes(type) && getAspectForSource(type) ? type : null;
}

export class WaveRunner {
  constructor() {
    this.waveIndex = 0;
    this.active = false;
    this.lastLane = randomLane();
    this.wave = null;
    this.startBeat = 0;
    this.spawnIndex = 0;
    this.spawnSchedule = [];
    this.patterns = [];
    this.hurrySpawnBeat = null;
    this.healthMultiplier = 1;
    this.aspectGrantors = [];
    this.lastLeapFieldSecond = -Infinity;
    this.lastBarrierLaneSeconds = [-Infinity, -Infinity, -Infinity];
    this.nextPatternBeat = 0;
  }

  start(waveIndex, currentBeat, options = {}) {
    this.waveIndex = waveIndex;
    this.wave = getWaveDefinition(waveIndex, options);
    this.healthMultiplier = options.healthMultiplier ?? 1;
    this.aspectGrantors = [...(options.aspectGrantors ?? [])];
    this.startBeat = currentBeat;
    this.spawnIndex = 0;
    this.hurrySpawnBeat = null;
    this.lastLeapFieldSecond = -Infinity;
    this.lastBarrierLaneSeconds = [-Infinity, -Infinity, -Infinity];
    this.nextPatternBeat = 0;
    this.patterns = (this.wave.patterns ?? []).map((pattern, index) => ({
      ...pattern,
      id: pattern.id ?? `${pattern.pattern}:${index}`,
      aspectGrantor: spreadGrantorFor(pattern.type, this.aspectGrantors),
      done: false,
    })).sort((a, b) => (a.earliestBeat ?? 0) - (b.earliestBeat ?? 0));
    this.spawnSchedule = this.prepareSpawnSchedule(this.wave.spawns);
    this.active = true;
  }

  prepareSpawnSchedule(spawns) {
    let lastLane = this.lastLane;
    return spawns.map((spawn) => {
      const lane = resolveScheduleLane(spawn.lane, lastLane);
      lastLane = lane;
      return {
        ...spawn,
        beat: resolveSpawnBeat(spawn),
        lane,
        aspectGrantor: spreadGrantorFor(spawn.type, this.aspectGrantors) ?? spawn.aspectGrantor,
        color: getEnemyDef(spawn.type).color,
      };
    }).sort((a, b) => a.beat - b.beat);
  }

  queueSpawns(spawns) {
    const processed = this.spawnSchedule.slice(0, this.spawnIndex);
    const pending = [
      ...this.spawnSchedule.slice(this.spawnIndex),
      ...this.prepareSpawnSchedule(spawns),
    ].sort((a, b) => a.beat - b.beat);
    this.spawnSchedule = [...processed, ...pending];
  }

  replacePendingSpawns(spawns) {
    const processed = this.spawnSchedule.slice(0, this.spawnIndex);
    const pending = this.spawnSchedule.slice(this.spawnIndex);
    let consumed = 0;
    const kept = pending.filter((spawn) => {
      if (!spawn.lockedBeat && consumed < spawns.length) {
        consumed += 1;
        return false;
      }

      return true;
    });

    this.spawnSchedule = [...processed, ...kept];
    this.queueSpawns(spawns);
  }

  hasPendingLeapSpawn() {
    return this.spawnSchedule
      .slice(this.spawnIndex)
      .some((spawn) => spawn.type === "leap");
  }

  getReservedLeapTargetIds(enemies) {
    const reserved = new Set();
    this.spawnSchedule
      .slice(this.spawnIndex)
      .filter((spawn) => spawn.type === "leap" && Number.isFinite(spawn.leapTargetId))
      .forEach((spawn) => reserved.add(spawn.leapTargetId));
    liveEnemies(enemies)
      .filter((enemy) => enemy.type === "leap" && enemy.leap && Number.isFinite(enemy.leap.targetId))
      .forEach((enemy) => reserved.add(enemy.leap.targetId));
    return reserved;
  }

  hasPendingBarrierInLane(lane) {
    return this.spawnSchedule
      .slice(this.spawnIndex)
      .some((spawn) => spawn.type === "barrier" && spawn.lane === lane);
  }

  hasPendingSpecials() {
    return this.spawnSchedule
      .slice(this.spawnIndex)
      .some((spawn) => spawn.type !== "basic") ||
      this.patterns.some((pattern) => !pattern.done && pattern.type !== "basic");
  }

  pendingLockedLanesFor(type) {
    return this.spawnSchedule
      .slice(this.spawnIndex)
      .filter((spawn) => spawn.lockedBeat && spawn.type === type)
      .map((spawn) => spawn.lane);
  }

  updateRecentBarrierLanes(enemies, currentSecond) {
    liveEnemies(enemies)
      .filter((enemy) => enemy.type === "barrier")
      .forEach((enemy) => {
        this.lastBarrierLaneSeconds[enemy.lane] = currentSecond;
      });
  }

  getBarrierBlockedLanes(currentSecond, enemies) {
    const blocked = new Set();
    liveEnemies(enemies)
      .filter((enemy) => enemy.type === "barrier")
      .forEach((enemy) => blocked.add(enemy.lane));

    for (const lane of LANES) {
      if (
        this.hasPendingBarrierInLane(lane) ||
        currentSecond - this.lastBarrierLaneSeconds[lane] < 3
      ) {
        blocked.add(lane);
      }
    }

    return [...blocked];
  }

  queueReadyPatterns(localBeat, enemies, options = {}) {
    const currentSecond = options.currentSecond ?? localBeat;

    this.patterns.forEach((pattern) => {
      if (pattern.done) {
        return;
      }

      if (localBeat < this.nextPatternBeat - EPSILON) {
        return;
      }

      if (Number.isFinite(pattern.retryAfterBeat) && localBeat < pattern.retryAfterBeat - EPSILON) {
        return;
      }

      const leapSeatAvailable =
        pattern.pattern === "leapAmbush" &&
        !this.hasPendingLeapSpawn() &&
        currentSecond - this.lastLeapFieldSecond >= LEAP_FIELD_COOLDOWN_SECONDS;
      const result = tryActivateEnemySpawnPattern(pattern, {
        localBeat,
        enemies,
        leapSeatAvailable,
        reservedLeapTargetIds: this.getReservedLeapTargetIds(enemies),
        blockedBarrierLanes:
          pattern.pattern === "crowdedBarrier"
            ? this.getBarrierBlockedLanes(currentSecond, enemies)
            : [],
        blockedCheerLanes:
          pattern.pattern === "cheerPack"
            ? this.pendingLockedLanesFor("cheer")
            : [],
      });
      if (result.spawns.length > 0) {
        this.replacePendingSpawns(result.spawns);
        pattern.done = Boolean(result.done);
        this.nextPatternBeat = localBeat + PATTERN_ACTIVATION_GAP_BEATS;
        if (Number.isFinite(result.retryAfterBeat)) {
          pattern.retryAfterBeat = result.retryAfterBeat;
        } else {
          delete pattern.retryAfterBeat;
        }
        if (Number.isFinite(result.blockLaneUntilBeat)) {
          pattern.blockLaneUntilBeat = result.blockLaneUntilBeat;
        }
        if (Number.isInteger(result.blockLane)) {
          pattern.blockLane = result.blockLane;
        }
        return;
      }

      if (result.done) {
        pattern.done = true;
      }
    });
  }

  getBlockedLaneMap(localBeat) {
    const blocked = new Map();
    this.patterns.forEach((pattern) => {
      if (pattern.pattern !== "emptyLaneGhost") {
        return;
      }

      const lane = Number.isInteger(pattern.blockLane) ? pattern.blockLane : pattern.lane;
      if (!Number.isInteger(lane)) {
        return;
      }

      if (
        pattern.done &&
        Number.isFinite(pattern.blockLaneUntilBeat) &&
        localBeat < pattern.blockLaneUntilBeat - EPSILON
      ) {
        blocked.set(lane, Math.max(
          blocked.get(lane) ?? 0,
          pattern.blockLaneUntilBeat,
        ));
      }
    });
    return blocked;
  }

  deferBlockedSpawns(localBeat) {
    const blockedLanes = this.getBlockedLaneMap(localBeat);
    if (blockedLanes.size === 0) {
      return;
    }

    const processed = this.spawnSchedule.slice(0, this.spawnIndex);
    let changed = false;
    const pending = this.spawnSchedule.slice(this.spawnIndex).map((spawn) => {
      const blockUntil = blockedLanes.get(spawn.lane);
      if (spawn.lockedBeat || blockUntil === undefined) {
        return spawn;
      }

      const shouldDefer = Number.isFinite(blockUntil)
        ? spawn.beat <= blockUntil + EPSILON
        : spawn.beat <= localBeat + EPSILON;
      if (!shouldDefer) {
        return spawn;
      }

      changed = true;
      return {
        ...spawn,
        beat: nextBetweenHalfBeatAfter(Number.isFinite(blockUntil) ? blockUntil : localBeat),
      };
    });

    if (changed) {
      this.spawnSchedule = [
        ...processed,
        ...pending.sort((a, b) => a.beat - b.beat),
      ];
    }
  }

  ensurePendingPatternSeed(localBeat, enemies, currentSecond = localBeat) {
    const live = liveEnemies(enemies);
    const hasPendingSpawns = this.spawnIndex < this.spawnSchedule.length;
    const hasPendingPatterns = this.patterns.some((pattern) => !pattern.done);
    if (hasPendingSpawns || !hasPendingPatterns) {
      return;
    }

    const pendingPatterns = this.patterns.filter((pattern) => !pattern.done);
    const laneCounts = countLiveByLane(enemies);
    const needsCheerSeed = pendingPatterns.some((pattern) => pattern.pattern === "cheerPack") &&
      live.length === 0;
    const needsBarrierSeed = pendingPatterns.some((pattern) => pattern.pattern === "crowdedBarrier") &&
      laneCounts.every((count) => count < 2);
    const needsLeapSeed = pendingPatterns.some((pattern) => pattern.pattern === "leapAmbush") &&
      leapTargets(enemies).length === 0;
    if (!needsCheerSeed && !needsBarrierSeed && !needsLeapSeed && live.length > 0) {
      return;
    }

    const blockedLanes = this.getBlockedLaneMap(localBeat);
    const barrierBlockedLanes = new Set(this.getBarrierBlockedLanes(currentSecond, enemies));
    const lanes = LANES.filter((lane) =>
      !blockedLanes.has(lane) &&
      (!needsBarrierSeed || !barrierBlockedLanes.has(lane))
    );
    const lane = needsBarrierSeed && live.length > 0
      ? laneWithMostLive(enemies, new Set([...blockedLanes.keys(), ...barrierBlockedLanes]))
      : lanes.length > 0
        ? lanes[randomInt(lanes.length)]
        : randomLane();
    this.queueSpawns([{
      beat: nextBetweenHalfBeatAfter(localBeat),
      type: "basic",
      lane,
    }]);
  }

  update(currentBeat, spawnEnemy, enemies = [], options = {}) {
    if (!this.active) {
      return;
    }

    const localBeat = currentBeat - this.startBeat;
    const currentSecond = options.currentSecond ?? currentBeat;
    const enemyIndex = toEnemyFrameIndex(enemies);
    if (liveEnemies(enemyIndex).some((enemy) => enemy.type === "leap")) {
      this.lastLeapFieldSecond = currentSecond;
    }
    this.updateRecentBarrierLanes(enemyIndex, currentSecond);
    const liveCount = liveEnemies(enemyIndex).length;
    const hasEnemies = liveCount > 0;
    this.queueReadyPatterns(localBeat, enemyIndex, { currentSecond });
    this.deferBlockedSpawns(localBeat);
    this.ensurePendingPatternSeed(localBeat, enemyIndex, currentSecond);

    if (this.spawnIndex < this.spawnSchedule.length) {
      const nextSpawn = this.spawnSchedule[this.spawnIndex];
      const spawnedProgress = this.spawnSchedule.length > 0
        ? this.spawnIndex / this.spawnSchedule.length
        : 0;
      const gapToNextSpawn = nextSpawn.beat - localBeat;
      const shouldHurryEmpty = !hasEnemies;
      const shouldHurryLowEnemies =
        spawnedProgress >= LOW_ENEMY_HURRY_PROGRESS &&
        liveCount <= LOW_ENEMY_HURRY_LIVE_COUNT &&
        gapToNextSpawn > LOW_ENEMY_HURRY_MIN_GAP_BEATS;
      if (nextSpawn.lockedBeat) {
        this.hurrySpawnBeat = null;
      } else if (
        (shouldHurryEmpty || shouldHurryLowEnemies) &&
        nextSpawn.beat > localBeat + EPSILON &&
        !Number.isFinite(this.hurrySpawnBeat)
      ) {
        this.hurrySpawnBeat = nextBetweenHalfBeatAfter(localBeat);
      } else if (!shouldHurryEmpty && !shouldHurryLowEnemies) {
        this.hurrySpawnBeat = null;
      }
    } else {
      this.hurrySpawnBeat = null;
    }

    while (
      this.spawnIndex < this.spawnSchedule.length
    ) {
      const spawn = this.spawnSchedule[this.spawnIndex];
      const effectiveBeat =
        Number.isFinite(this.hurrySpawnBeat)
          ? Math.min(spawn.beat, this.hurrySpawnBeat)
          : spawn.beat;

      if (effectiveBeat > localBeat + EPSILON) {
        break;
      }

      spawnEnemy(createEnemy(spawn.type, spawn.lane, {
        spawn,
        currentBeat,
        healthMultiplier: this.healthMultiplier,
        aspectGrantors: this.aspectGrantors,
      }));
      if (spawn.type === "leap") {
        this.lastLeapFieldSecond = currentSecond;
      }
      if (spawn.type === "barrier") {
        this.lastBarrierLaneSeconds[spawn.lane] = currentSecond;
      }
      this.lastLane = spawn.lane;
      this.spawnIndex += 1;
      this.hurrySpawnBeat = null;
    }
  }

  getSpawnWarnings(currentBeat, lookaheadBeats = 1.4) {
    if (!this.active) {
      return [];
    }

    const localBeat = currentBeat - this.startBeat;
    const warnings = [];
    for (let index = this.spawnIndex; index < this.spawnSchedule.length; index += 1) {
      const spawn = this.spawnSchedule[index];
      const isNext = index === this.spawnIndex;
      const timeUntil = (
        isNext && Number.isFinite(this.hurrySpawnBeat)
          ? Math.min(spawn.beat, this.hurrySpawnBeat)
          : spawn.beat
      ) - localBeat;

      if (timeUntil < 0) {
        continue;
      }

      if (timeUntil > lookaheadBeats) {
        break;
      }

      warnings.push({
        lane: spawn.lane,
        color: spawn.color,
        timeUntil,
        strength: 1 - timeUntil / lookaheadBeats,
      });
    }

    return warnings;
  }

  pendingPatternSpawnCount() {
    let total = 0;
    this.patterns.forEach((pattern) => {
      if (!pattern.done) {
        total += Math.max(1, pattern.consumeCount ?? 1);
      }
    });
    return total;
  }

  remainingSpawnCount() {
    return Math.max(0, this.spawnSchedule.length - this.spawnIndex) +
      this.pendingPatternSpawnCount();
  }

  cancelPendingSpawns() {
    const canceled = this.remainingSpawnCount();
    this.spawnIndex = this.spawnSchedule.length;
    this.patterns.forEach((pattern) => {
      pattern.done = true;
    });
    this.hurrySpawnBeat = null;
    return canceled;
  }

  getProgress(kills = 0, enemies = []) {
    const alive = toEnemyFrameIndex(enemies).liveCount();
    let pendingPatternSpawns = 0;
    let pendingPatternCount = 0;
    this.patterns.forEach((pattern) => {
      if (!pattern.done) {
        pendingPatternCount += 1;
        pendingPatternSpawns += Math.max(1, pattern.consumeCount ?? 1);
      }
    });
    const total = Math.max(
      kills + alive,
      this.spawnSchedule.length + pendingPatternSpawns,
      this.spawnIndex + pendingPatternSpawns,
    );
    return {
      kills,
      alive,
      total,
      spawned: this.spawnIndex,
      remainingScheduled: Math.max(0, this.spawnSchedule.length - this.spawnIndex) + pendingPatternSpawns,
      pendingPatterns: pendingPatternCount,
      active: this.active,
    };
  }

  isComplete(enemies) {
    return (
      this.active &&
      this.spawnIndex >= this.spawnSchedule.length &&
      this.patterns.every((pattern) => pattern.done) &&
      toEnemyFrameIndex(enemies).liveCount() === 0
    );
  }

  finish() {
    this.active = false;
    this.spawnSchedule = [];
    this.spawnIndex = 0;
    this.patterns = [];
    this.hurrySpawnBeat = null;
    this.aspectGrantors = [];
    this.lastLeapFieldSecond = -Infinity;
    this.lastBarrierLaneSeconds = [-Infinity, -Infinity, -Infinity];
    this.nextPatternBeat = 0;
  }
}

export function createEnemy(type, lane, options = {}) {
  const def = getEnemyDef(type);
  const healthMultiplier = options.healthMultiplier ?? 1;
  const hp = def.hp * healthMultiplier;
  enemyId += 1;

  const enemy = {
    id: enemyId,
    type,
    lane,
    y: 0.02,
    visualY: -0.14,
    hp,
    maxHp: hp,
    speed: def.speed,
    ghostCharges: def.phasingHits ?? 0,
    dots: [],
    lastDamagedBeat: -999,
    lastInterceptBeat: -999,
  };

  if (options.spawn?.aspectGrantor === type && getAspectForSource(type)) {
    enemy.aspectGrantor = type;
  }

  if (type === "leap" && Number.isFinite(options.spawn?.leapTargetY)) {
    const startBeat = options.currentBeat ?? options.spawn.beat ?? 0;
    const targetId = Number.isFinite(options.spawn.leapTargetId)
      ? options.spawn.leapTargetId
      : null;
    enemy.targetable = false;
    enemy.y = 0.02;
    enemy.visualY = 0.02;
    enemy.leap = {
      targetId,
      targetY: options.spawn.leapTargetY,
      destinationY: options.spawn.leapFallback ? options.spawn.leapTargetY : null,
      startBeat,
      landBeat: getLeapLandBeat(startBeat, options.spawn.leapTargetY),
      startY: 0.02,
      arcSide: enemyId % 2 === 0 ? 1 : -1,
    };
  }

  return enemy;
}
