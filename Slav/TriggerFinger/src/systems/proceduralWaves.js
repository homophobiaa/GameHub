import { createEnemySpawnPattern, getEnemyPatternConsumeCount } from "./enemySpawnPatterns.js";
import { snapToHalfBeat } from "../utils/beatMath.js";
import { randomChoice, randomRange } from "../utils/random.js";

function randomLaneRule() {
  return Math.random() < 0.16 ? "same" : "random";
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

function createSpecialSetups(enemyPool, waveIndex, count, durationBeats, basicCount) {
  const specialTypes = enemyPool.filter((type) => type !== "basic");
  const setups = {
    spawns: [],
    patterns: [],
  };
  let remainingBudget = basicCount;

  for (let index = 0; index < count && specialTypes.length > 0; index += 1) {
    const availableTypes = specialTypes.filter((type) =>
      getEnemyPatternConsumeCount(type, { waveIndex, enemyPool }) <= remainingBudget
    );
    if (availableTypes.length === 0) {
      break;
    }

    const type = randomChoice(availableTypes);
    remainingBudget -= getEnemyPatternConsumeCount(type, { waveIndex, enemyPool });
    const beat = snapToHalfBeat(randomRange(3, Math.max(4, durationBeats - 4)));
    const setup = createEnemySpawnPattern(type, beat, { waveIndex, enemyPool });
    setups.spawns.push(...setup.spawns);
    setups.patterns.push(...setup.patterns);
  }

  return setups;
}

export function createProceduralWave(waveIndex, { enemyPool = ["basic"] } = {}) {
  const durationBeats = 22 + waveIndex * 2.6;
  const basicCount = 9 + Math.floor(waveIndex * 2.8);
  const specialCount = Math.max(0, Math.floor((basicCount - 5) / 3));
  const basics = createBasicSpawns(basicCount, durationBeats);
  const specials = createSpecialSetups(enemyPool, waveIndex, specialCount, durationBeats, basicCount);
  const spawns = [...basics, ...specials.spawns].sort((a, b) => a.beat - b.beat);

  return {
    name: `Procedural ${waveIndex + 1}`,
    durationBeats,
    spawns,
    patterns: specials.patterns,
  };
}
