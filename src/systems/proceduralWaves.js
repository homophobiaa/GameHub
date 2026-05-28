import { createEnemySpawnPattern, getEnemyPatternConsumeCount } from "./enemySpawnPatterns.js";
import { STARTING_PLATING } from "../config/gameplay.js";
import { snapToHalfBeat } from "../utils/beatMath.js";
import { randomChoice, randomRange } from "../utils/random.js";

const BASE_DURATION_BEATS = 22;
const DURATION_PER_WAVE_BEATS = 2.6;
const EARLY_DURATION_TRIM_BY_WAVE = {
  0: 6,
  1: 6,
  2: 5,
  3: 4,
  4: 2,
};
const DURATION_MULTIPLIER_BY_WAVE = {
  0: 4 / 3,
};
const BASE_BASIC_COUNT = 11;
const BASIC_COUNT_PER_WAVE = 2.8;
const SPECIAL_START_FRACTION = 0.16;
const SPECIAL_END_FRACTION = 0.62;
const SPECIAL_END_MARGIN_BEATS = 3;
const SPECIAL_MIN_START_BEATS = 3;

function randomLaneRule() {
  return Math.random() < 0.16 ? "same" : "random";
}

function getDurationBeats(waveIndex) {
  const trim = EARLY_DURATION_TRIM_BY_WAVE[waveIndex] ?? 0;
  const baseDuration = BASE_DURATION_BEATS + waveIndex * DURATION_PER_WAVE_BEATS - trim;
  return baseDuration * (DURATION_MULTIPLIER_BY_WAVE[waveIndex] ?? 1);
}

function createSpecialBeat(index, count, durationBeats) {
  const start = Math.max(SPECIAL_MIN_START_BEATS, durationBeats * SPECIAL_START_FRACTION);
  const end = Math.max(
    start + count,
    Math.min(durationBeats * SPECIAL_END_FRACTION, durationBeats - SPECIAL_END_MARGIN_BEATS),
  );
  const progress = (index + 0.5) / Math.max(1, count);
  const jitter = randomRange(-0.8, 0.8);
  return snapToHalfBeat(Math.max(start, Math.min(durationBeats - 2, start + (end - start) * progress + jitter)));
}

function createBasicSpawns(count, durationBeats) {
  const spawns = [];

  for (let index = 0; index < count; index += 1) {
    const progress = count <= 1 ? 0 : index / (count - 1);
    const jitter = randomRange(-0.7, 0.7);
    const beat = index === 0
      ? 0
      : snapToHalfBeat(Math.max(1, Math.min(durationBeats - 1.5, progress * durationBeats + jitter)));
    spawns.push({
      beat,
      type: "basic",
      lane: randomLaneRule(),
    });
  }

  return spawns;
}

function createSpecialSetups(enemyPool, waveIndex, count, durationBeats, safeBasicBudget) {
  const specialTypes = enemyPool.filter((type) => type !== "basic");
  const setups = {
    spawns: [],
    patterns: [],
  };
  let remainingBudget = safeBasicBudget;
  let previousType = null;

  for (let index = 0; index < count && specialTypes.length > 0; index += 1) {
    const affordableTypes = specialTypes.filter((type) =>
      getEnemyPatternConsumeCount(type, { waveIndex, enemyPool }) <= remainingBudget
    );
    const availableTypes = affordableTypes.filter((type) => type !== previousType);
    const typePool = availableTypes.length > 0 ? availableTypes : affordableTypes;
    if (typePool.length === 0) {
      break;
    }

    const type = randomChoice(typePool);
    previousType = type;
    remainingBudget -= getEnemyPatternConsumeCount(type, { waveIndex, enemyPool });
    const beat = createSpecialBeat(index, count, durationBeats);
    const setup = createEnemySpawnPattern(type, beat, { waveIndex, enemyPool });
    setups.spawns.push(...setup.spawns);
    setups.patterns.push(...setup.patterns);
  }

  return setups;
}

export function createProceduralWave(waveIndex, { enemyPool = ["basic"], platingReserve = STARTING_PLATING } = {}) {
  const durationBeats = getDurationBeats(waveIndex);
  const basicCount = BASE_BASIC_COUNT + Math.floor(waveIndex * BASIC_COUNT_PER_WAVE);
  const safeBasicBudget = Math.max(0, basicCount - Math.max(0, Math.floor(platingReserve)));
  const specialCount = Math.max(0, Math.floor((safeBasicBudget - 4) / 3));
  const basics = createBasicSpawns(basicCount, durationBeats);
  const specials = createSpecialSetups(enemyPool, waveIndex, specialCount, durationBeats, safeBasicBudget);
  const spawns = [...basics, ...specials.spawns].sort((a, b) => a.beat - b.beat);

  return {
    name: `Procedural ${waveIndex + 1}`,
    durationBeats,
    spawns,
    patterns: specials.patterns,
  };
}
