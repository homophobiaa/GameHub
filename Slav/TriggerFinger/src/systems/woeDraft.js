import { getAspectForSource } from "../defs/aspects.js";
import { SPECIAL_ENEMY_POOL, getEnemyDef } from "../defs/enemies.js";
import { pickRandom } from "../utils/random.js";

export function getLockedWoeEnemyTypes(unlockedEnemyTypes) {
  const unlocked = new Set(unlockedEnemyTypes);
  return SPECIAL_ENEMY_POOL.filter((type) => !unlocked.has(type));
}

export function getLockedWoeAspectGrantors(unlockedEnemyTypes, aspectGrantors = []) {
  const unlocked = new Set(unlockedEnemyTypes);
  const grantors = new Set(aspectGrantors);
  return SPECIAL_ENEMY_POOL.filter((type) =>
    unlocked.has(type) &&
    !grantors.has(type) &&
    getAspectForSource(type)
  );
}

export function getNextWoeKind(unlockedEnemyTypes, aspectGrantors = []) {
  const lockedEnemies = getLockedWoeEnemyTypes(unlockedEnemyTypes);
  const lockedGrantors = getLockedWoeAspectGrantors(unlockedEnemyTypes, aspectGrantors);
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

export function shouldOfferWoe(wavesCleared, unlockedEnemyTypes, aspectGrantors = []) {
  return wavesCleared > 0 &&
    wavesCleared % 3 === 0 &&
    Boolean(getNextWoeKind(unlockedEnemyTypes, aspectGrantors));
}

export function createWoeEnemyChoice(type) {
  const def = getEnemyDef(type);
  return {
    kind: "enemy",
    type,
    title: `Add ${def.name}`,
    copy: def.description,
    color: def.color,
  };
}

export function createWoeAspectChoice(type) {
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

export function createDebugWoeChoices(unlockedEnemyTypes, aspectGrantors = []) {
  const unlocked = new Set(unlockedEnemyTypes);
  return SPECIAL_ENEMY_POOL.map((type) =>
    unlocked.has(type) && getAspectForSource(type)
      ? createWoeAspectChoice(type)
      : createWoeEnemyChoice(type)
  );
}

export function createWoeChoices(unlockedEnemyTypes, aspectGrantors = [], count = 3) {
  const kind = getNextWoeKind(unlockedEnemyTypes, aspectGrantors);
  if (kind === "aspect") {
    return pickRandom(getLockedWoeAspectGrantors(unlockedEnemyTypes, aspectGrantors), count)
      .map(createWoeAspectChoice);
  }

  if (kind === "enemy") {
    return pickRandom(getLockedWoeEnemyTypes(unlockedEnemyTypes), count).map(createWoeEnemyChoice);
  }

  return [];
}
