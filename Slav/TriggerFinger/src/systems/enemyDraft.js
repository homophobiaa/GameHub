import { getAspectForSource } from "../defs/aspects.js";
import { SPECIAL_ENEMY_POOL, getEnemyDef } from "../defs/enemies.js";
import { pickRandom } from "../utils/random.js";

export function getLockedEnemyTypes(unlockedEnemyTypes) {
  const unlocked = new Set(unlockedEnemyTypes);
  return SPECIAL_ENEMY_POOL.filter((type) => !unlocked.has(type));
}

export function getLockedAspectGrantors(unlockedEnemyTypes, aspectGrantors = []) {
  const unlocked = new Set(unlockedEnemyTypes);
  const grantors = new Set(aspectGrantors);
  return SPECIAL_ENEMY_POOL.filter((type) =>
    unlocked.has(type) &&
    !grantors.has(type) &&
    getAspectForSource(type)
  );
}

export function getNextEnemyDraftKind(unlockedEnemyTypes, aspectGrantors = []) {
  const lockedEnemies = getLockedEnemyTypes(unlockedEnemyTypes);
  const lockedGrantors = getLockedAspectGrantors(unlockedEnemyTypes, aspectGrantors);
  const progressChoicesTaken = Math.max(0, unlockedEnemyTypes.length - 1) + aspectGrantors.length;
  const scheduledKind = progressChoicesTaken % 3 === 2 ? "aspect" : "enemy";

  if (scheduledKind === "enemy" && lockedEnemies.length > 0) {
    return "enemy";
  }

  if (scheduledKind === "aspect" && lockedGrantors.length > 0) {
    return "aspect";
  }

  if (lockedEnemies.length > 0) {
    return "enemy";
  }

  if (lockedGrantors.length > 0) {
    return "aspect";
  }

  return null;
}

export function shouldDraftEnemy(wavesCleared, unlockedEnemyTypes, aspectGrantors = []) {
  return wavesCleared > 0 &&
    wavesCleared % 3 === 0 &&
    Boolean(getNextEnemyDraftKind(unlockedEnemyTypes, aspectGrantors));
}

function createEnemyChoice(type) {
  const def = getEnemyDef(type);
  return {
    kind: "enemy",
    type,
    title: `Add ${def.name}`,
    copy: def.description,
    color: def.color,
  };
}

function createAspectChoice(type) {
  const def = getEnemyDef(type);
  const aspect = getAspectForSource(type);
  return {
    kind: "aspect",
    type,
    title: `${def.name} Spreading`,
    copy: `All ${def.name}s spread ${aspect.name} to nearby basics when killed.`,
    color: aspect.color ?? def.color,
  };
}

export function createEnemyDraftChoices(unlockedEnemyTypes, aspectGrantors = [], count = 3) {
  const kind = getNextEnemyDraftKind(unlockedEnemyTypes, aspectGrantors);
  if (kind === "aspect") {
    return pickRandom(getLockedAspectGrantors(unlockedEnemyTypes, aspectGrantors), count)
      .map(createAspectChoice);
  }

  if (kind === "enemy") {
    return pickRandom(getLockedEnemyTypes(unlockedEnemyTypes), count).map(createEnemyChoice);
  }

  return [];
}
