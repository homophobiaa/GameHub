import { getAspectDef } from "../defs/aspects.js";
import { getEnemyDef } from "../defs/enemies.js";
import { MIN_ENEMY_Y } from "../config/gameplay.js";
import { isTargetable, toEnemyFrameIndex } from "./enemyFrameIndex.js";

export { MIN_ENEMY_Y };
export { isTargetable };

export function laneEnemies(enemies, lane) {
  return toEnemyFrameIndex(enemies).targetableInLane(lane);
}

export function elapseBeamEnemies(enemies, lane) {
  return toEnemyFrameIndex(enemies).elapseTargetsInLane(lane);
}

export function closestEnemies(enemies, count) {
  return toEnemyFrameIndex(enemies).closestTargetable(count);
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

export function pushGuardEvent(events, lane, interceptor, currentBeat, protectedTarget = interceptor) {
  interceptor.lastInterceptBeat = Math.floor(currentBeat);
  events.push({
    kind: "guard",
    lane: protectedTarget.lane ?? lane,
    y: protectedTarget.y,
    targetId: protectedTarget.id,
    barrierLane: interceptor.lane,
    barrierY: interceptor.y,
    barrierId: interceptor.id,
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
  const enemyIndex = toEnemyFrameIndex(enemies);
  let hits = 0;
  const touched = [];
  const path = [];
  const interceptedBarrierIds = new Set();

  for (const target of laneEnemies(enemyIndex, lane)) {
    if (target.type === "barrier" && interceptedBarrierIds.has(target.id)) {
      continue;
    }

    const interceptor = findPlannedBarrierInterceptor(
      enemyIndex,
      lane,
      currentBeat,
      target,
      interceptedBarrierIds,
    );
    const damageTarget = interceptor ?? target;
    const impactY = target.y;

    if (interceptor) {
      interceptedBarrierIds.add(interceptor.id);
      pushGuardEvent(events, lane, interceptor, currentBeat, target);
    }

    const result = applyDamage(damageTarget, amount, currentBeat, events, { enemies: enemyIndex });
    touched.push(target);
    path.push({
      lane: target.lane,
      y: impactY,
    });

    if (result.passedThrough && !interceptor) {
      continue;
    }

    hits += 1;
    if (hits >= maxTargets) {
      break;
    }
  }

  return { touched, hits, maxTargets, path };
}

function findPlannedBarrierInterceptor(enemies, lane, currentBeat, intendedTarget, interceptedBarrierIds) {
  const beatIndex = Math.floor(currentBeat);
  const barriers = laneEnemies(enemies, lane).filter(
    (enemy) =>
      enemy.type === "barrier" &&
      enemy !== intendedTarget &&
      enemy.lastInterceptBeat !== beatIndex &&
      !interceptedBarrierIds.has(enemy.id),
  );

  return barriers[0] ?? null;
}

function previewDamage(enemy, amount, enemies) {
  if (!enemy || enemy.hp <= 0 || enemy.targetable === false) {
    return { damaged: false, passedThrough: false, killed: false };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { damaged: false, passedThrough: false, killed: false };
  }

  if (enemy.ghostCharges > 0) {
    return { damaged: false, passedThrough: true, killed: false };
  }

  let finalAmount = getAspectDamageAmount(enemy, amount);
  const hero = findHeroProtector(enemies, enemy);
  const aspect = getAspectDef(hero?.aspect);
  if (hero && aspect?.interceptFraction > 0) {
    finalAmount -= finalAmount * aspect.interceptFraction;
  }

  return {
    damaged: true,
    passedThrough: false,
    killed: enemy.hp - finalAmount <= 0,
  };
}

function assignPiercingStages(path, impacts) {
  let nextStage = 0;
  const assignedStages = impacts.map((impact) => {
    if (!impact.countsForPierce) {
      return null;
    }

    const stage = nextStage;
    nextStage += 1;
    return stage;
  });
  const stageForIndex = (index) => {
    if (Number.isInteger(assignedStages[index])) {
      return assignedStages[index];
    }

    for (let nextIndex = index + 1; nextIndex < assignedStages.length; nextIndex += 1) {
      if (Number.isInteger(assignedStages[nextIndex])) {
        return assignedStages[nextIndex];
      }
    }

    for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
      if (Number.isInteger(assignedStages[previousIndex])) {
        return assignedStages[previousIndex];
      }
    }

    return 0;
  };
  const stagedPath = path.map((point, index) => ({
    ...point,
    stageIndex: stageForIndex(index),
  }));
  const stagedImpacts = impacts.map((impact, index) => {
    const { countsForPierce, ...stagedImpact } = impact;
    return {
      ...stagedImpact,
      stageIndex: stageForIndex(index),
    };
  });

  return {
    path: stagedPath,
    impacts: stagedImpacts,
    stageCount: nextStage,
  };
}

function resolveImpactAmount(amount, context) {
  return typeof amount === "function" ? amount(context) : amount;
}

export function planHitLine(enemies, lane, amount, currentBeat, maxTargets = 1, options = {}) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  let hits = 0;
  const touched = [];
  const path = [];
  const impacts = [];
  const interceptedBarrierIds = new Set();

  for (const target of laneEnemies(enemyIndex, lane)) {
    if (target.type === "barrier" && interceptedBarrierIds.has(target.id)) {
      continue;
    }

    const interceptor = findPlannedBarrierInterceptor(
      enemyIndex,
      lane,
      currentBeat,
      target,
      interceptedBarrierIds,
    );
    const damageTarget = interceptor ?? target;
    const impactY = target.y;
    const hitIndex = hits;
    const impactAmount = resolveImpactAmount(amount, {
      hitIndex,
      target,
      damageTarget,
    });
    const secondary = Boolean(options.isSecondary?.({
      hitIndex,
      target,
      damageTarget,
    }));
    const result = previewDamage(damageTarget, impactAmount, enemyIndex);

    if (interceptor) {
      interceptedBarrierIds.add(interceptor.id);
    }

    touched.push(target);
    path.push({
      lane: target.lane,
      y: impactY,
      secondary,
    });
    const impactKnockback = options.knockbackForImpact?.({
      hitIndex,
      target,
      damageTarget,
      secondary,
    });
    const impact = {
      targetId: damageTarget.id,
      guardedTargetId: interceptor ? target.id : null,
      barrierId: interceptor?.id ?? null,
      barrierLane: interceptor?.lane ?? null,
      barrierY: interceptor?.y ?? null,
      lane: target.lane,
      y: impactY,
      amount: impactAmount,
      secondary,
      knockback: impactKnockback,
      knockbackTargetId: interceptor && Number.isFinite(impactKnockback) ? target.id : null,
      guard: Boolean(interceptor),
      countsForPierce: !(result.passedThrough && !interceptor),
    };
    const effects = options.effectsForImpact?.({
      hitIndex,
      target,
      damageTarget,
      secondary,
      amount: impactAmount,
    });
    if (effects?.length) {
      impact.effects = effects;
    }
    impacts.push(impact);

    if (result.passedThrough && !interceptor) {
      continue;
    }

    hits += 1;
    if (hits >= maxTargets) {
      break;
    }
  }

  return { touched, hits, maxTargets, ...assignPiercingStages(path, impacts) };
}

export function hitClosestInLaneDetailed(enemies, lane, amount, currentBeat, events) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const target = laneEnemies(enemyIndex, lane)[0];
  if (!target) {
    return { target: null, result: null };
  }

  const interceptor = findBarrierInterceptor(enemyIndex, lane, currentBeat, target);
  const damageTarget = interceptor ?? target;

  if (interceptor) {
    pushGuardEvent(events, lane, interceptor, currentBeat, target);
  }

  const result = applyDamage(damageTarget, amount, currentBeat, events, { enemies: enemyIndex });
  return { target, damageTarget, result };
}

export function knockEnemyBack(enemy, amount) {
  if (!enemy || enemy.hp <= 0) {
    return;
  }

  enemy.y = Math.max(MIN_ENEMY_Y, enemy.y - amount);
}

export function hitShellLine(enemies, lane, amount, knockback, currentBeat, events) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  let remainingDamage = amount;
  let endY = 0.04;
  const touched = new Set();
  const path = [];
  const interceptedBarrierIds = new Set();

  if (!Number.isFinite(remainingDamage) || remainingDamage <= 0) {
    return { endY };
  }

  while (remainingDamage > 0.01) {
    const target = laneEnemies(enemyIndex, lane).find((enemy) => !touched.has(enemy));
    if (!target) {
      endY = 0.04;
      break;
    }

    const interceptor = findPlannedBarrierInterceptor(
      enemyIndex,
      lane,
      currentBeat,
      target,
      interceptedBarrierIds,
    );
    const damageTarget = interceptor ?? target;
    touched.add(target);
    touched.add(damageTarget);
    endY = target.y;
    path.push({
      lane: target.lane,
      y: target.y,
    });

    if (interceptor) {
      interceptedBarrierIds.add(interceptor.id);
      pushGuardEvent(events, lane, interceptor, currentBeat, target);
    }

    const hpBefore = damageTarget.hp;
    const result = applyDamage(damageTarget, remainingDamage, currentBeat, events, { enemies: enemyIndex });
    if (result.passedThrough) {
      continue;
    }

    knockEnemyBack(interceptor ? target : damageTarget, knockback);
    if (!result.killed) {
      break;
    }

    remainingDamage = Math.max(0, remainingDamage - hpBefore);
  }

  return { endY, path };
}

export function planShellLine(enemies, lane, amount, knockback, currentBeat, options = {}) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  let remainingDamage = amount;
  let endY = 0.04;
  const touched = new Set();
  const path = [];
  const impacts = [];
  const interceptedBarrierIds = new Set();

  if (!Number.isFinite(remainingDamage) || remainingDamage <= 0) {
    return { endY, path, impacts, stageCount: 0 };
  }

  while (remainingDamage > 0.01) {
    const target = laneEnemies(enemyIndex, lane).find((enemy) => !touched.has(enemy));
    if (!target) {
      endY = 0.04;
      break;
    }

    const interceptor = findPlannedBarrierInterceptor(
      enemyIndex,
      lane,
      currentBeat,
      target,
      interceptedBarrierIds,
    );
    const damageTarget = interceptor ?? target;
    touched.add(target);
    touched.add(damageTarget);
    endY = target.y;
    const hpBefore = damageTarget.hp;
    const result = previewDamage(damageTarget, remainingDamage, enemyIndex);
    path.push({
      lane: target.lane,
      y: target.y,
    });
    const impact = {
      targetId: damageTarget.id,
      guardedTargetId: interceptor ? target.id : null,
      barrierId: interceptor?.id ?? null,
      barrierLane: interceptor?.lane ?? null,
      barrierY: interceptor?.y ?? null,
      lane: target.lane,
      y: target.y,
      amount: remainingDamage,
      knockback,
      knockbackTargetId: interceptor && Number.isFinite(knockback) ? target.id : null,
      guard: Boolean(interceptor),
      countsForPierce: !result.passedThrough,
    };
    const effects = options.effectsForImpact?.({
      hitIndex: impacts.filter((nextImpact) => !nextImpact.secondary).length,
      target,
      damageTarget,
      secondary: false,
      amount: remainingDamage,
    });
    if (effects?.length) {
      impact.effects = effects;
    }
    impacts.push(impact);

    if (interceptor) {
      interceptedBarrierIds.add(interceptor.id);
    }

    if (result.passedThrough) {
      continue;
    }

    if (!result.killed) {
      const extraPierceCount = Math.max(0, options.extraPierceCount ?? 0);
      for (let extraIndex = 0; extraIndex < extraPierceCount; extraIndex += 1) {
        const damageFraction = typeof options.secondaryDamageFraction === "function"
          ? options.secondaryDamageFraction(extraIndex)
          : options.secondaryDamageFraction ?? 0;
        const knockbackFraction = typeof options.secondaryKnockbackFraction === "function"
          ? options.secondaryKnockbackFraction(extraIndex)
          : options.secondaryKnockbackFraction ?? damageFraction;
        const secondaryAmount = Math.max(0, remainingDamage * damageFraction);
        if (secondaryAmount <= 0.01) {
          break;
        }

        const secondaryTarget = laneEnemies(enemyIndex, lane).find((enemy) => !touched.has(enemy));
        if (!secondaryTarget) {
          break;
        }

        const secondaryInterceptor = findPlannedBarrierInterceptor(
          enemyIndex,
          lane,
          currentBeat,
          secondaryTarget,
          interceptedBarrierIds,
        );
        const secondaryDamageTarget = secondaryInterceptor ?? secondaryTarget;
        touched.add(secondaryTarget);
        touched.add(secondaryDamageTarget);
        if (secondaryInterceptor) {
          interceptedBarrierIds.add(secondaryInterceptor.id);
        }

        const secondaryResult = previewDamage(secondaryDamageTarget, secondaryAmount, enemyIndex);
        path.push({
          lane: secondaryTarget.lane,
          y: secondaryTarget.y,
          secondary: true,
        });
        const secondaryImpact = {
          targetId: secondaryDamageTarget.id,
          guardedTargetId: secondaryInterceptor ? secondaryTarget.id : null,
          barrierId: secondaryInterceptor?.id ?? null,
          barrierLane: secondaryInterceptor?.lane ?? null,
          barrierY: secondaryInterceptor?.y ?? null,
          lane: secondaryTarget.lane,
          y: secondaryTarget.y,
          amount: secondaryAmount,
          knockback: knockback * knockbackFraction,
          knockbackTargetId: secondaryInterceptor && Number.isFinite(knockback * knockbackFraction)
            ? secondaryTarget.id
            : null,
          secondary: true,
          guard: Boolean(secondaryInterceptor),
          countsForPierce: !secondaryResult.passedThrough,
        };
        const secondaryEffects = options.effectsForImpact?.({
          hitIndex: impacts.filter((nextImpact) => !nextImpact.secondary).length + extraIndex,
          target: secondaryTarget,
          damageTarget: secondaryDamageTarget,
          secondary: true,
          amount: secondaryAmount,
        });
        if (secondaryEffects?.length) {
          secondaryImpact.effects = secondaryEffects;
        }
        impacts.push(secondaryImpact);
        if (secondaryResult.passedThrough) {
          extraIndex -= 1;
        }
      }
      break;
    }

    remainingDamage = Math.max(0, remainingDamage - hpBefore);
  }

  return { endY, ...assignPiercingStages(path, impacts) };
}

export function hitHorizontalBand(enemies, centerY, radius, amount, currentBeat, events) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  return enemyIndex
    .targetableEnemies()
    .filter((enemy) => Math.abs(enemy.y - centerY) <= radius)
    .map((enemy) => {
      applyDamage(enemy, amount, currentBeat, events, { enemies: enemyIndex });
      return enemy;
    });
}

function impactDistance(enemy, lane, centerY) {
  const laneDistance = Math.abs((enemy.lane ?? lane) - lane) / 3;
  const yDistance = Math.abs(enemy.y - centerY);
  return Math.hypot(laneDistance, yDistance);
}

export function hitImpactRadius(enemies, lane, centerY, radius, amount, currentBeat, events, options = {}) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const excludeIds = new Set(options.excludeIds ?? []);
  return enemyIndex
    .targetableEnemies()
    .filter((enemy) =>
      !excludeIds.has(enemy.id) &&
      impactDistance(enemy, lane, centerY) <= radius
    )
    .map((enemy) => {
      const result = applyDamage(enemy, amount, currentBeat, events, { enemies: enemyIndex });
      if (result.damaged && options.effects?.length) {
        applyImpactEffectsToTarget({
          effects: options.effects,
          target: enemy,
          enemies: enemyIndex,
          lane: enemy.lane,
          y: enemy.y,
          currentBeat,
          events,
          excludeIds,
        });
      }
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

export function applyDotDamage(enemy, { damage, durationSeconds, source }, currentBeat) {
  if (!enemy || enemy.hp <= 0 || !Number.isFinite(damage) || damage <= 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return;
  }

  enemy.dots.push({
    damageRemaining: damage,
    secondsRemaining: durationSeconds,
    totalSeconds: durationSeconds,
    source,
  });
  enemy.lastDamagedBeat = Math.floor(currentBeat);
}

export function applyImpactEffectsToTarget({
  effects = [],
  target,
  enemies,
  lane = target?.lane,
  y = target?.y,
  currentBeat,
  events,
  excludeIds = [],
}) {
  effects.forEach((effect) => {
    if (effect.kind === "dot") {
      applyDotDamage(target, effect, currentBeat);
      return;
    }

    if (effect.kind === "horizontalBand") {
      hitHorizontalBand(enemies, y, effect.radius, effect.amount, currentBeat, events);
      addHorizontalBar(events, effect.color, y, effect.radius);
      return;
    }

    if (effect.kind === "impactRadius") {
      const excluded = new Set(excludeIds);
      if (Number.isFinite(target?.id)) {
        excluded.add(target.id);
      }
      hitImpactRadius(enemies, lane, y, effect.radius, effect.amount, currentBeat, events, {
        excludeIds: excluded,
        effects: effect.effects ?? [],
      });
      addImpactRadius(events, effect.color, lane, y, effect.radius);
      return;
    }

    console.warn("Unhandled impact effect", effect);
  });
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

export function addPiercingProjectile(
  events,
  lane,
  color,
  path,
  stageDelaySeconds,
  endY = 0.04,
  impacts = [],
  stageCount = null,
  secondary = false,
  width = null,
) {
  if (!Array.isArray(path) || path.length === 0) {
    addLaneProjectile(events, lane, color, secondary, endY, width);
    return;
  }

  events.push({
    kind: "piercingProjectile",
    lane,
    color,
    path,
    stageDelaySeconds,
    impacts,
    stageCount,
    secondary,
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

export function addImpactRadius(events, color, lane, y, radius) {
  events.push({
    kind: "impactRadius",
    color,
    lane,
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
  return toEnemyFrameIndex(enemies).findLiveById(id);
}

export function findElapseTarget(enemies, lane, targetId = null) {
  const current = findLiveEnemyById(enemies, targetId);
  if (current?.lane === lane && current.type === "barrier") {
    return current;
  }

  return elapseBeamEnemies(enemies, lane)[0] ?? null;
}
