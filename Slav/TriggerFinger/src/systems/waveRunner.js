import { WAVE_DEFS } from "../defs/waves.js";
import { getAspectForSource } from "../defs/aspects.js";
import { getEnemyDef } from "../defs/enemies.js";
import { tryActivateEnemySpawnPattern } from "./enemySpawnPatterns.js";
import { createProceduralWave } from "./proceduralWaves.js";
import { EPSILON, nextHalfBeatAfter } from "../utils/beatMath.js";
import { randomInt } from "../utils/random.js";

let enemyId = 0;

function randomLane() {
  return randomInt(3);
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
  return enemies.filter((enemy) => enemy.hp > 0);
}

function leapTargets(enemies) {
  return liveEnemies(enemies).filter((enemy) =>
    enemy.targetable !== false &&
    enemy.type !== "leap"
  );
}

function countLiveByLane(enemies) {
  const counts = [0, 0, 0];
  liveEnemies(enemies).forEach((enemy) => {
    counts[enemy.lane] += 1;
  });
  return counts;
}

function laneWithMostLive(enemies, blockedLanes) {
  const counts = countLiveByLane(enemies);
  const lanes = [0, 1, 2]
    .filter((lane) => !blockedLanes.has(lane))
    .sort((a, b) => counts[b] - counts[a]);
  return lanes[0] ?? randomLane();
}

function getWaveDefinition(waveIndex, options = {}) {
  if (waveIndex === 0) {
    return WAVE_DEFS[0];
  }

  return createProceduralWave(waveIndex, options);
}

export class WaveRunner {
  constructor() {
    this.waveIndex = 0;
    this.active = false;
    this.lastLane = randomLane();
    this.spawnSchedule = [];
    this.patterns = [];
    this.hurrySpawnBeat = null;
    this.healthMultiplier = 1;
    this.aspectGrantors = [];
    this.lastLeapFieldSecond = -Infinity;
    this.lastBarrierLaneSeconds = [-Infinity, -Infinity, -Infinity];
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
    this.patterns = (this.wave.patterns ?? []).map((pattern, index) => ({
      ...pattern,
      id: pattern.id ?? `${pattern.pattern}:${index}`,
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
        lane,
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

  hasPendingBarrierInLane(lane) {
    return this.spawnSchedule
      .slice(this.spawnIndex)
      .some((spawn) => spawn.type === "barrier" && spawn.lane === lane);
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

    for (let lane = 0; lane < 3; lane += 1) {
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

      const leapSeatAvailable =
        pattern.pattern === "leapAmbush" &&
        !this.hasPendingLeapSpawn() &&
        currentSecond - this.lastLeapFieldSecond >= 3;
      const result = tryActivateEnemySpawnPattern(pattern, {
        localBeat,
        enemies,
        leapSeatAvailable,
        blockedBarrierLanes:
          pattern.pattern === "crowdedBarrier"
            ? this.getBarrierBlockedLanes(currentSecond, enemies)
            : [],
      });
      if (result.spawns.length > 0) {
        this.replacePendingSpawns(result.spawns);
        pattern.done = true;
        if (Number.isFinite(result.blockLaneUntilBeat)) {
          pattern.blockLaneUntilBeat = result.blockLaneUntilBeat;
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
      if (pattern.pattern !== "emptyLaneGhost" || !Number.isInteger(pattern.lane)) {
        return;
      }

      if (!pattern.done && localBeat >= pattern.earliestBeat - EPSILON) {
        blocked.set(pattern.lane, Infinity);
        return;
      }

      if (
        pattern.done &&
        Number.isFinite(pattern.blockLaneUntilBeat) &&
        localBeat < pattern.blockLaneUntilBeat - EPSILON
      ) {
        blocked.set(pattern.lane, Math.max(
          blocked.get(pattern.lane) ?? 0,
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
        beat: nextHalfBeatAfter(Number.isFinite(blockUntil) ? blockUntil : localBeat),
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
    const lanes = [0, 1, 2].filter((lane) =>
      !blockedLanes.has(lane) &&
      (!needsBarrierSeed || !barrierBlockedLanes.has(lane))
    );
    const lane = needsBarrierSeed && live.length > 0
      ? laneWithMostLive(enemies, new Set([...blockedLanes.keys(), ...barrierBlockedLanes]))
      : lanes.length > 0
        ? lanes[randomInt(lanes.length)]
        : randomLane();
    this.queueSpawns([{
      beat: nextHalfBeatAfter(localBeat),
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
    if (liveEnemies(enemies).some((enemy) => enemy.type === "leap")) {
      this.lastLeapFieldSecond = currentSecond;
    }
    this.updateRecentBarrierLanes(enemies, currentSecond);
    const hasEnemies = liveEnemies(enemies).length > 0;
    this.queueReadyPatterns(localBeat, enemies, { currentSecond });
    this.deferBlockedSpawns(localBeat);
    this.ensurePendingPatternSeed(localBeat, enemies, currentSecond);

    if (!hasEnemies && this.spawnIndex < this.spawnSchedule.length) {
      const nextSpawn = this.spawnSchedule[this.spawnIndex];
      if (nextSpawn.lockedBeat) {
        this.hurrySpawnBeat = null;
      } else if (nextSpawn.beat > localBeat + EPSILON && !Number.isFinite(this.hurrySpawnBeat)) {
        this.hurrySpawnBeat = nextHalfBeatAfter(localBeat);
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
    return this.spawnSchedule
      .slice(this.spawnIndex)
      .map((spawn, index) => ({
        lane: spawn.lane,
        color: spawn.color,
        timeUntil:
          (index === 0 && Number.isFinite(this.hurrySpawnBeat)
            ? Math.min(spawn.beat, this.hurrySpawnBeat)
            : spawn.beat) - localBeat,
      }))
      .filter((warning) => warning.timeUntil >= 0 && warning.timeUntil <= lookaheadBeats)
      .map((warning) => ({
        ...warning,
        strength: 1 - warning.timeUntil / lookaheadBeats,
      }));
  }

  getProgress(kills = 0, enemies = []) {
    const alive = enemies.filter((enemy) => enemy.hp > 0).length;
    const total = Math.max(
      kills + alive,
      this.spawnSchedule.length,
      this.spawnIndex,
    );
    return {
      kills,
      alive,
      total,
      spawned: this.spawnIndex,
      remainingScheduled: Math.max(0, this.spawnSchedule.length - this.spawnIndex),
      pendingPatterns: this.patterns.filter((pattern) => !pattern.done).length,
      active: this.active,
    };
  }

  isComplete(enemies) {
    return (
      this.active &&
      this.spawnIndex >= this.spawnSchedule.length &&
      this.patterns.every((pattern) => pattern.done) &&
      enemies.every((enemy) => enemy.hp <= 0)
    );
  }

  finish() {
    this.active = false;
    this.spawnSchedule = [];
    this.patterns = [];
    this.hurrySpawnBeat = null;
    this.aspectGrantors = [];
    this.lastLeapFieldSecond = -Infinity;
    this.lastBarrierLaneSeconds = [-Infinity, -Infinity, -Infinity];
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

  if ((options.aspectGrantors ?? []).includes(type) && getAspectForSource(type)) {
    enemy.aspectGrantor = type;
  }

  if (type === "leap" && Number.isFinite(options.spawn?.leapTargetY)) {
    const startBeat = options.currentBeat ?? options.spawn.beat ?? 0;
    enemy.targetable = false;
    enemy.y = 0.02;
    enemy.visualY = 0.02;
    enemy.leap = {
      targetId: options.spawn.leapTargetId,
      targetY: options.spawn.leapTargetY,
      startBeat,
      landBeat: startBeat + 2,
      startY: 0.02,
      arcSide: enemyId % 2 === 0 ? 1 : -1,
    };
  }

  return enemy;
}
