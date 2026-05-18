import { getEnemyDef } from "../defs/enemies.js";
import {
  BARRIER_SPAWN_MAX_LANE_Y,
  LANES,
  LEAP_FALLBACK_TARGET_Y,
  LEAP_MIN_TARGET_Y,
} from "../config/gameplay.js";
import { randomChoice } from "../utils/random.js";
import { toEnemyFrameIndex } from "./enemyFrameIndex.js";

const WARNING_BEATS = 1.25;
const SETUP_WINDOW_BEATS = 8;
const BARRIER_DELAY_BASIC_BEATS = 0.5;
const BARRIER_RETRY_BEATS = 1.5;

function makeScheduledSpawn(spawn) {
  return {
    ...spawn,
    color: getEnemyDef(spawn.type).color,
  };
}

function createBasePattern(type, beat, context = {}) {
  return {
    kind: "conditional",
    type,
    earliestBeat: beat,
    expiresBeat: beat + SETUP_WINDOW_BEATS,
    warningBeats: WARNING_BEATS,
    waveIndex: context.waveIndex ?? 0,
  };
}

function createPattern(type, beat, context = {}) {
  const pattern = createBasePattern(type, beat, context);

  if (type === "cheer") {
    return {
      ...pattern,
      pattern: "cheerPack",
      consumeCount: getEnemyPatternConsumeCount(type, context),
      followerSpacing: 0.5,
    };
  }

  if (type === "ghost") {
    return {
      ...pattern,
      pattern: "emptyLaneGhost",
      consumeCount: getEnemyPatternConsumeCount(type, context),
      lane: randomChoice(LANES),
    };
  }

  if (type === "regen") {
    return {
      ...pattern,
      pattern: "regenSplit",
      consumeCount: getEnemyPatternConsumeCount(type, context),
      followerSpacing: 0.5,
    };
  }

  if (type === "leap") {
    return {
      ...pattern,
      pattern: "leapAmbush",
      consumeCount: getEnemyPatternConsumeCount(type, context),
      lane: randomChoice(LANES),
    };
  }

  return {
    ...pattern,
    pattern: "crowdedBarrier",
    consumeCount: getEnemyPatternConsumeCount(type, context),
  };
}

export function getEnemyPatternConsumeCount(type, context = {}) {
  if (type === "cheer") {
    return 1 + Math.min(4, 1 + Math.floor((context.waveIndex ?? 0) / 3));
  }

  if (type === "regen") {
    return 3;
  }

  return 1;
}

export function createEnemySpawnPattern(type, beat, context = {}) {
  return {
    spawns: [],
    patterns: [createPattern(type, beat, context)],
  };
}

function liveCountInLane(enemies, lane) {
  return toEnemyFrameIndex(enemies).liveInLane(lane).length;
}

function leapTargets(enemies) {
  return toEnemyFrameIndex(enemies).leapTargets();
}

function lanesWithLiveCount(enemies, min, max = Infinity) {
  return LANES.filter((lane) => {
    const count = liveCountInLane(enemies, lane);
    return count >= min && count <= max;
  });
}

function laneWithFewestLive(enemies) {
  const liveCounts = toEnemyFrameIndex(enemies).liveCountsByLane();
  const lowestCount = Math.min(...liveCounts);
  const lanes = LANES.filter((lane) => liveCounts[lane] === lowestCount);
  return randomChoice(lanes);
}

function preferredGhostLane(pattern, enemies) {
  const emptyLanes = lanesWithLiveCount(enemies, 0, 0);
  if (Number.isInteger(pattern.lane) && emptyLanes.includes(pattern.lane)) {
    return pattern.lane;
  }

  if (emptyLanes.length > 0) {
    return randomChoice(emptyLanes);
  }

  return laneWithFewestLive(enemies);
}

function lanesWithOtherLaneEnemies(enemies) {
  const liveCounts = toEnemyFrameIndex(enemies).liveCountsByLane();
  const totalLive = liveCounts.reduce((total, count) => total + count, 0);
  if (totalLive === 0) {
    return [];
  }

  const emptyLanes = LANES.filter((lane) => liveCounts[lane] === 0);
  if (emptyLanes.length > 0) {
    return emptyLanes;
  }

  const lowestCount = Math.min(...liveCounts);
  return LANES.filter((lane) =>
    liveCounts[lane] === lowestCount &&
    totalLive - liveCounts[lane] > 0
  );
}

function lockedSpawn(beat, type, lane, extra = {}) {
  return makeScheduledSpawn({
    beat,
    type,
    lane,
    lockedBeat: true,
    ...extra,
  });
}

function aspectGrantorExtra(pattern, extra = {}) {
  return pattern.aspectGrantor
    ? { ...extra, aspectGrantor: pattern.aspectGrantor }
    : extra;
}

function activateCheerPack(pattern, localBeat, enemies, { blockedLanes = [] } = {}) {
  const blocked = new Set(blockedLanes);
  const eligibleLanes = lanesWithOtherLaneEnemies(enemies).filter((lane) => !blocked.has(lane));
  if (eligibleLanes.length === 0) {
    return null;
  }

  const lane = randomChoice(eligibleLanes);
  const spawnBeat = localBeat + pattern.warningBeats;
  const spawns = [lockedSpawn(spawnBeat, pattern.type, lane, aspectGrantorExtra(pattern))];

  for (let i = 1; i < pattern.consumeCount; i += 1) {
    spawns.push(lockedSpawn(spawnBeat + i * pattern.followerSpacing, "basic", lane));
  }

  return spawns;
}

function activateGhost(pattern, localBeat, enemies) {
  const lane = preferredGhostLane(pattern, enemies);
  if (!Number.isInteger(lane)) {
    return null;
  }

  return [lockedSpawn(localBeat + pattern.warningBeats, pattern.type, lane, aspectGrantorExtra(pattern))];
}

function activateRegen(pattern, localBeat) {
  const lane = randomChoice(LANES);
  const spawnBeat = localBeat + pattern.warningBeats;
  return [
    lockedSpawn(spawnBeat, pattern.type, lane, aspectGrantorExtra(pattern)),
    ...LANES
      .filter((nextLane) => nextLane !== lane)
      .map((nextLane) => lockedSpawn(spawnBeat + pattern.followerSpacing, "basic", nextLane)),
  ];
}

function barrierOpenLanes(blockedLanes = []) {
  const blocked = new Set(blockedLanes);
  return LANES.filter((lane) => !blocked.has(lane));
}

function barrierSafeLanes(enemies, blockedLanes = []) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  return barrierOpenLanes(blockedLanes).filter((lane) =>
    !enemyIndex.liveInLane(lane).some((enemy) => enemy.y >= BARRIER_SPAWN_MAX_LANE_Y)
  );
}

function pickLeastAdvancedLane(enemies, lanes) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const ranked = lanes.map((lane) => ({
    lane,
    y: enemyIndex.frontLiveInLane(lane)?.y ?? 0,
  }));
  const lowestY = Math.min(...ranked.map((entry) => entry.y));
  return randomChoice(ranked.filter((entry) => entry.y === lowestY)).lane;
}

function createBarrierSetupPack(pattern, localBeat, lanes) {
  if (lanes.length === 0) {
    return null;
  }

  const lane = randomChoice(lanes);
  const spawnBeat = localBeat + pattern.warningBeats;
  return [
    lockedSpawn(spawnBeat, "basic", lane),
    lockedSpawn(spawnBeat + 0.5, "basic", lane),
    lockedSpawn(spawnBeat + 1, pattern.type, lane, aspectGrantorExtra(pattern)),
  ];
}

function activateBarrier(pattern, localBeat, enemies, { blockedLanes = [] } = {}) {
  const safeLanes = barrierSafeLanes(enemies, blockedLanes);
  if (safeLanes.length === 0) {
    const openLanes = barrierOpenLanes(blockedLanes);
    if (openLanes.length === 0) {
      return null;
    }

    return {
      spawns: [lockedSpawn(
        localBeat + BARRIER_DELAY_BASIC_BEATS,
        "basic",
        pickLeastAdvancedLane(enemies, openLanes),
      )],
      done: false,
      retryAfterBeat: localBeat + BARRIER_RETRY_BEATS,
    };
  }

  const crowdedLanes = lanesWithLiveCount(enemies, 2)
    .filter((lane) => safeLanes.includes(lane));
  if (crowdedLanes.length > 0) {
    return [
      lockedSpawn(
        localBeat + pattern.warningBeats,
        pattern.type,
        randomChoice(crowdedLanes),
        aspectGrantorExtra(pattern),
      ),
    ];
  }

  if (localBeat >= pattern.expiresBeat) {
    return createBarrierSetupPack(pattern, localBeat, safeLanes);
  }

  return null;
}

function closestToBase(enemies) {
  return toEnemyFrameIndex(enemies).closestToBase();
}

function createLeapFallbackSpawn(pattern, localBeat) {
  const lane = Number.isInteger(pattern.lane) ? pattern.lane : randomChoice(LANES);
  return [lockedSpawn(localBeat + pattern.warningBeats, pattern.type, lane, aspectGrantorExtra(pattern, {
    leapTargetId: null,
    leapTargetY: LEAP_FALLBACK_TARGET_Y,
    leapFallback: true,
  }))];
}

function activateLeap(pattern, localBeat, enemies, { priority = false, reservedTargetIds = new Set() } = {}) {
  const targets = leapTargets(enemies);
  const fallbackAllowed = localBeat >= pattern.expiresBeat;
  if (targets.length === 0) {
    return fallbackAllowed ? createLeapFallbackSpawn(pattern, localBeat) : null;
  }

  const laneTargets = targets.filter((enemy) =>
    enemy.lane === pattern.lane &&
    !reservedTargetIds.has(enemy.id)
  );
  const priorityTarget = priority
    ? closestToBase(laneTargets.filter((enemy) => enemy.y >= 0.5))
    : null;
  const regularTarget = closestToBase(laneTargets.filter((enemy) => enemy.y >= LEAP_MIN_TARGET_Y));
  const lastTarget = targets.length === 1 && !reservedTargetIds.has(targets[0].id) ? targets[0] : null;
  const target = priorityTarget ?? regularTarget ?? lastTarget;
  if (!target) {
    return fallbackAllowed ? createLeapFallbackSpawn(pattern, localBeat) : null;
  }

  return [lockedSpawn(localBeat + pattern.warningBeats, pattern.type, target.lane, aspectGrantorExtra(pattern, {
    leapTargetId: target.id,
    leapTargetY: target.y,
    leapPriority: priority,
  }))];
}

export function tryActivateEnemySpawnPattern(
  pattern,
  {
    localBeat,
    enemies,
    leapSeatAvailable = false,
    reservedLeapTargetIds = new Set(),
    blockedBarrierLanes = [],
    blockedCheerLanes = [],
  },
) {
  if (pattern.kind !== "conditional") {
    return { spawns: [], consumeCount: 0, done: false };
  }

  const isLeap = pattern.pattern === "leapAmbush";
  if (isLeap && !leapSeatAvailable) {
    return { spawns: [], consumeCount: 0, done: false };
  }

  const leapPriority = isLeap &&
    leapSeatAvailable &&
    leapTargets(enemies).some((enemy) => enemy.lane === pattern.lane && enemy.y >= 0.5);
  if (localBeat < pattern.earliestBeat && !leapPriority) {
    return { spawns: [], consumeCount: 0, done: false };
  }

  const spawnsByPattern = {
    cheerPack: () => activateCheerPack(pattern, localBeat, enemies, {
      blockedLanes: blockedCheerLanes,
    }),
    emptyLaneGhost: () => activateGhost(pattern, localBeat, enemies),
    regenSplit: () => activateRegen(pattern, localBeat, enemies),
    crowdedBarrier: () => activateBarrier(pattern, localBeat, enemies, {
      blockedLanes: blockedBarrierLanes,
    }),
    leapAmbush: () => activateLeap(pattern, localBeat, enemies, {
      priority: leapPriority,
      reservedTargetIds: reservedLeapTargetIds,
    }),
  };
  const activation = spawnsByPattern[pattern.pattern]?.() ?? null;
  const spawns = Array.isArray(activation) ? activation : activation?.spawns;

  if (!spawns?.length) {
    return {
      spawns: [],
      consumeCount: 0,
      done: false,
    };
  }

  return {
    spawns,
    consumeCount: activation?.consumeCount ?? spawns.length,
    blockLaneUntilBeat: pattern.pattern === "emptyLaneGhost" ? spawns[0]?.beat : null,
    blockLane: pattern.pattern === "emptyLaneGhost" ? spawns[0]?.lane : null,
    retryAfterBeat: activation?.retryAfterBeat,
    done: activation?.done ?? true,
  };
}
