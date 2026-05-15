import { SPECIAL_ENEMY_POOL, getEnemyDef } from "../defs/enemies.js";
import { pickRandom } from "../utils/random.js";

export function getLockedEnemyTypes(unlockedEnemyTypes) {
  const unlocked = new Set(unlockedEnemyTypes);
  return SPECIAL_ENEMY_POOL.filter((type) => !unlocked.has(type));
}

export function shouldDraftEnemy(wavesCleared, unlockedEnemyTypes) {
  return wavesCleared > 0 &&
    wavesCleared % 3 === 0 &&
    getLockedEnemyTypes(unlockedEnemyTypes).length > 0;
}

export function createEnemyDraftChoices(unlockedEnemyTypes, count = 3) {
  return pickRandom(getLockedEnemyTypes(unlockedEnemyTypes), count).map((type) => {
    const def = getEnemyDef(type);
    return {
      type,
      title: `Add ${def.name}`,
      copy: def.description,
      color: def.color,
    };
  });
}
