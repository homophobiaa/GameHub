import { getAspectDef } from "../defs/aspects.js";
import { getEnemyDef } from "../defs/enemies.js";

export const MIN_ENEMY_Y = 0.05;

export function isTargetable(enemy) {
  return enemy.hp > 0 && enemy.targetable !== false;
}

export function laneEnemies(enemies, lane) {
  return enemies
    .filter((enemy) => enemy.lane === lane && isTargetable(enemy))
    .sort((a, b) => b.y - a.y);
}

export function elapseBeamEnemies(enemies, lane) {
  return enemies
    .filter((enemy) =>
      enemy.lane === lane &&
      isTargetable(enemy) &&
      !(enemy.type === "ghost" && enemy.ghostCharges > 0)
    )
    .sort((a, b) => b.y - a.y);
}

export function closestEnemies(enemies, count) {
  return enemies
    .filter(isTargetable)
    .sort((a, b) => b.y - a.y)
    .slice(0, count);
}

export function findBarrierInterceptor(enemies, lane, currentBeat, intendedTarget) {
  const beatIndex = Math.floor(currentBeat);
  const barriers = laneEnemies(enemies, lane).filter(
    (enemy) =>
      enemy.type === "barrier" &&
      enemy !== intendedTarget &&
      enemy.lastInterceptBeat !== beatIndex,
  );

  return barriers[0] ?? null;
}

export function pushGuardEvent(events, lane, interceptor, currentBeat) {
  interceptor.lastInterceptBeat = Math.floor(currentBeat);
  events.push({
    kind: "guard",
    lane,
    y: interceptor.y,
    text: "guard",
    color: "#58a9ff",
  });
}

function findHeroProtector(enemies = [], target) {
  return laneEnemies(enemies, target.lane).find((enemy) =>
    enemy !== target &&
    enemy.type === "basic" &&
    enemy.aspect === "hero"
  ) ?? null;
}

function getAspectDamageAmount(enemy, amount) {
  const aspect = getAspectDef(enemy.aspect);
  if (aspect?.id === "gloom" && enemy.hp >= enemy.maxHp - 0.001) {
    return amount * aspect.fullHealthDamageMultiplier;
  }

  return amount;
}

export function applyDamage(enemy, amount, currentBeat, events, options = {}) {
  if (!enemy || enemy.hp <= 0 || enemy.targetable === false) {
    return { damaged: false, passedThrough: false, killed: false };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { damaged: false, passedThrough: false, killed: false };
  }

  if (!options.ignoreGhost && enemy.ghostCharges > 0) {
    enemy.ghostCharges -= 1;
    events.push({
      kind: "phase",
      lane: enemy.lane,
      y: enemy.y,
      text: "phase",
      color: "#bd84ff",
    });
    return { damaged: false, passedThrough: true, killed: false };
  }

  let finalAmount = getAspectDamageAmount(enemy, amount);
  if (!options.ignoreHero) {
    const hero = findHeroProtector(options.enemies, enemy);
    const aspect = getAspectDef(hero?.aspect);
    if (hero && aspect?.interceptFraction > 0) {
      const intercepted = finalAmount * aspect.interceptFraction;
      finalAmount -= intercepted;
      applyDamage(hero, intercepted, currentBeat, events, {
        ...options,
        ignoreHero: true,
      });
    }
  }

  enemy.hp -= finalAmount;
  enemy.lastDamagedBeat = Math.floor(currentBeat);
  if (!options.quiet) {
    events.push({
      kind: "hit",
      lane: enemy.lane,
      y: enemy.y,
      text: finalAmount.toFixed(finalAmount >= 10 ? 0 : 1),
      color: getEnemyDef(enemy.type).color,
    });
  }

  return {
    damaged: true,
    passedThrough: false,
    killed: enemy.hp <= 0,
  };
}

export function hitLine(enemies, lane, amount, currentBeat, events, maxTargets = 1) {
  let hits = 0;
  const touched = [];

  for (const target of laneEnemies(enemies, lane)) {
    const interceptor = findBarrierInterceptor(enemies, lane, currentBeat, target);
    const actualTarget = interceptor ?? target;

    if (interceptor) {
      pushGuardEvent(events, lane, interceptor, currentBeat);
    }

    const result = applyDamage(actualTarget, amount, currentBeat, events, { enemies });
    touched.push(actualTarget);

    if (result.passedThrough && !interceptor) {
      continue;
    }

    hits += 1;
    if (hits >= maxTargets) {
      break;
    }
  }

  return { touched, hits, maxTargets };
}

export function hitClosestInLaneDetailed(enemies, lane, amount, currentBeat, events) {
  const target = laneEnemies(enemies, lane)[0];
  if (!target) {
    return { target: null, result: null };
  }

  const interceptor = findBarrierInterceptor(enemies, lane, currentBeat, target);
  const actualTarget = interceptor ?? target;

  if (interceptor) {
    pushGuardEvent(events, lane, interceptor, currentBeat);
  }

  const result = applyDamage(actualTarget, amount, currentBeat, events, { enemies });
  return { target: actualTarget, result };
}

export function knockEnemyBack(enemy, amount) {
  if (!enemy || enemy.hp <= 0) {
    return;
  }

  enemy.y = Math.max(MIN_ENEMY_Y, enemy.y - amount);
}

export function hitShellLine(enemies, lane, amount, knockback, currentBeat, events) {
  let remainingDamage = amount;
  let endY = 0.04;
  const touched = new Set();

  if (!Number.isFinite(remainingDamage) || remainingDamage <= 0) {
    return { endY };
  }

  while (remainingDamage > 0.01) {
    const target = laneEnemies(enemies, lane).find((enemy) => !touched.has(enemy));
    if (!target) {
      endY = 0.04;
      break;
    }

    const interceptor = findBarrierInterceptor(enemies, lane, currentBeat, target);
    const actualTarget = interceptor ?? target;
    touched.add(actualTarget);
    endY = actualTarget.y;

    if (interceptor) {
      pushGuardEvent(events, lane, interceptor, currentBeat);
    }

    const hpBefore = actualTarget.hp;
    const result = applyDamage(actualTarget, remainingDamage, currentBeat, events, { enemies });
    if (result.passedThrough) {
      continue;
    }

    knockEnemyBack(actualTarget, knockback);
    if (!result.killed) {
      break;
    }

    remainingDamage = Math.max(0, remainingDamage - hpBefore);
  }

  return { endY };
}

export function hitHorizontalBand(enemies, centerY, radius, amount, currentBeat, events) {
  return enemies
    .filter((enemy) => isTargetable(enemy) && Math.abs(enemy.y - centerY) <= radius)
    .sort((a, b) => b.y - a.y)
    .map((enemy) => {
      applyDamage(enemy, amount, currentBeat, events, { enemies });
      return enemy;
    });
}

export function applyDot(enemy, def, slot, currentBeat, beatSeconds) {
  if (!enemy || enemy.hp <= 0) {
    return;
  }

  const durationBeats = slot.upgraded
    ? def.upgradedDotDurationBeats
    : def.dotDurationBeats;
  const totalDamage = def.dotDamage;

  enemy.dots.push({
    damageRemaining: totalDamage,
    secondsRemaining: durationBeats * beatSeconds,
    totalSeconds: durationBeats * beatSeconds,
    source: def.id,
  });
  enemy.lastDamagedBeat = Math.floor(currentBeat);
}

export function addLaneProjectile(events, lane, color, secondary = false, endY = 0.04, width = null) {
  events.push({
    kind: "projectile",
    lane,
    color,
    secondary,
    endY,
    width,
  });
}

export function addHorizontalBar(events, color, y, radius) {
  events.push({
    kind: "horizontalBar",
    color,
    y,
    radius,
  });
}

export function addSlashEffect(events, enemy) {
  events.push({
    kind: "slash",
    lane: enemy.lane,
    y: enemy.y,
    rotation: Math.random() * Math.PI * 2,
    color: "#ffffff",
  });
}

export function findLiveEnemyById(enemies, id) {
  return enemies.find((enemy) => enemy.id === id && isTargetable(enemy)) ?? null;
}

export function findElapseTarget(enemies, lane, targetId = null) {
  const current = findLiveEnemyById(enemies, targetId);
  if (current?.lane === lane && current.type === "barrier") {
    return current;
  }

  return elapseBeamEnemies(enemies, lane)[0] ?? null;
}
