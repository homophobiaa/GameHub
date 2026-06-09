import { getBulletDef } from "../defs/bullets.js";
import {
  createChipImpactEffects,
  elapseSecondaryDamagePerBeat,
  elapseSecondarySlowMultiplier,
  pairChipDamage,
  summarizeChipEffects,
} from "./chipEffects.js";
import { resolveBulletHandler } from "./bulletHandlers.js";
import {
  addLaneProjectile,
  applyDamage,
  applyImpactEffectsToTarget,
  elapseBeamEnemies,
  findBarrierInterceptor,
  findElapseTarget,
  hitClosestInLaneDetailed,
  knockEnemyBack,
  PROJECTILE_END_Y,
  pushGuardEvent,
} from "./combatPrimitives.js";
import { toEnemyFrameIndex } from "./enemyFrameIndex.js";

export function resolveBulletShot({
  slot,
  lane,
  enemies,
  currentBeat,
  targetBeat,
  echoAnchorBeat,
  beatSeconds,
  damageMultiplier,
  chipEffects = [],
  scheduleEcho = () => {},
}) {
  const def = getBulletDef(slot.id);
  const enemyIndex = toEnemyFrameIndex(enemies);
  const events = [];
  const scale = (value) => value * damageMultiplier;

  resolveBulletHandler(def, {
    slot,
    lane,
    enemies: enemyIndex,
    currentBeat,
    targetBeat,
    echoAnchorBeat,
    beatSeconds,
    damageMultiplier,
    chipEffects,
    scheduleEcho,
    events,
    scale,
  });

  return events;
}

function getImpactLane(impact, originalTarget = null) {
  return Number.isInteger(impact.lane)
    ? impact.lane
    : originalTarget?.lane;
}

function getImpactY(impact, originalTarget = null) {
  return Number.isFinite(impact.y)
    ? impact.y
    : originalTarget?.y;
}

function findFallbackImpactTarget(enemyIndex, impact, originalTarget) {
  if (originalTarget?.hp > 0 && originalTarget.targetable !== false) {
    return originalTarget;
  }

  const lane = getImpactLane(impact, originalTarget);
  if (!Number.isInteger(lane)) {
    return null;
  }

  const plannedY = getImpactY(impact, originalTarget);
  const candidates = enemyIndex
    .targetableInLane(lane)
    .filter((enemy) => enemy.id !== originalTarget?.id);
  if (candidates.length === 0) {
    return null;
  }

  if (!Number.isFinite(plannedY)) {
    return candidates[0];
  }

  return candidates.reduce((best, enemy) => {
    const bestDistance = Math.abs(best.y - plannedY);
    const enemyDistance = Math.abs(enemy.y - plannedY);
    return enemyDistance < bestDistance ? enemy : best;
  }, candidates[0]);
}

function pushLostPiercingImpactEvent(events, impact, originalTarget) {
  const lane = getImpactLane(impact, originalTarget) ?? 1;
  const y = getImpactY(impact, originalTarget) ?? 0.82;
  events.push({
    kind: "hit",
    lane,
    y,
    text: "miss",
    color: "#e65d5d",
  });
  console.warn("Piercing impact had no valid target", { impact, originalTarget });
}

export function resolvePiercingImpact({ impact, enemies, currentBeat }) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const originalTarget = enemyIndex.findById(impact.targetId);
  const target = findFallbackImpactTarget(enemyIndex, impact, originalTarget);
  const events = [];
  if (!target) {
    pushLostPiercingImpactEvent(events, impact, originalTarget);
    return events;
  }

  const retargeted = target.id !== originalTarget?.id;
  const lane = retargeted ? target.lane : impact.lane ?? target.lane;
  const y = retargeted ? target.y : impact.y ?? target.y;

  if (impact.guard && !retargeted) {
    const protectedTarget = enemyIndex.findById(impact.guardedTargetId) ?? {
      id: impact.guardedTargetId,
      lane: impact.lane,
      y: impact.y,
    };
    pushGuardEvent(events, impact.lane ?? target.lane, target, currentBeat, protectedTarget);
  }

  const result = applyDamage(target, impact.amount, currentBeat, events, {
    enemies: enemyIndex,
  });
  if (result.damaged) {
    applyImpactEffectsToTarget({
      effects: impact.effects,
      target,
      enemies: enemyIndex,
      lane,
      y,
      currentBeat,
      events,
    });
  }
  if (!result.damaged && !result.passedThrough) {
    events.push({
      kind: "hit",
      lane,
      y,
      text: "no hit",
      color: "#e65d5d",
    });
    console.warn("Piercing impact did not apply damage", { impact, target });
  }
  if (Number.isFinite(impact.knockback) && !result.passedThrough) {
    const knockbackTarget = !retargeted && impact.knockbackTargetId
      ? enemyIndex.findById(impact.knockbackTargetId)
      : target;
    knockEnemyBack(knockbackTarget, impact.knockback);
  }

  return events;
}

export function resolvePairChipShot({
  lane,
  enemies,
  currentBeat,
  damageMultiplier = 1,
}) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const def = getBulletDef("pair");
  const events = [];
  const amount = pairChipDamage(def.damage) * damageMultiplier;
  const hit = hitClosestInLaneDetailed(enemyIndex, lane, amount, currentBeat, events);
  addLaneProjectile(events, lane, def.color, true, hit.target?.y ?? PROJECTILE_END_Y, 5);
  return events;
}

export function updateDamageOverTime(enemies, dt, currentBeat, events) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  enemyIndex.enemies.forEach((enemy) => {
    enemy.dots = enemy.dots.filter((dot) => {
      if (
        dot.damageRemaining <= 0 ||
        dot.secondsRemaining <= 0 ||
        enemy.hp <= 0 ||
        enemy.targetable === false
      ) {
        return false;
      }

      const step = Math.min(dt, dot.secondsRemaining);
      const damage = (dot.damageRemaining / dot.secondsRemaining) * step;
      dot.damageRemaining -= damage;
      dot.secondsRemaining -= step;
      applyDamage(enemy, damage, currentBeat, events, {
        enemies: enemyIndex,
        ignoreGhost: true,
        quiet: true,
      });
      return dot.damageRemaining > 0.01 && dot.secondsRemaining > 0.01;
    });
  });
}

export function resolveElapseStart({
  lane,
  enemies,
  currentBeat,
  beatSeconds = 1,
  damageMultiplier = 1,
  chipEffects = [],
  upgraded = false,
}) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const events = [];
  const chipSummary = summarizeChipEffects(chipEffects);
  const intendedTarget = elapseBeamEnemies(enemyIndex, lane)[0] ?? null;
  if (!intendedTarget) {
    return { targetId: null, events };
  }

  const interceptor = findBarrierInterceptor(enemyIndex, lane, currentBeat, intendedTarget);
  if (interceptor) {
    pushGuardEvent(events, lane, interceptor, currentBeat, intendedTarget);
  }
  const damageTarget = interceptor ?? intendedTarget;
  if (chipSummary.shellKnockback > 0) {
    knockEnemyBack(interceptor ? intendedTarget : damageTarget, chipSummary.shellKnockback);
  }
  applyImpactEffectsToTarget({
    effects: createChipImpactEffects(chipSummary, { amount: 0, beatSeconds }),
    target: damageTarget,
    enemies: enemyIndex,
    lane,
    y: intendedTarget.y,
    currentBeat,
    events,
  });

  const secondaryTarget = chipSummary.stingerPierce > 0
    ? elapseBeamEnemies(enemyIndex, lane).find((enemy) => enemy.id !== intendedTarget.id)
    : null;
  const def = getBulletDef("elapse-left");
  const parentDef = getBulletDef("elapse");
  const secondaryDamagePerBeat = secondaryTarget
    ? elapseSecondaryDamagePerBeat(def.damagePerBeat) * damageMultiplier
    : 0;
  const secondarySlowMultiplier = secondaryTarget && upgraded
    ? elapseSecondarySlowMultiplier(parentDef.upgradedSlowMultiplier ?? 0.7)
    : 1;

  return {
    targetId: intendedTarget.id,
    guardId: interceptor?.id ?? null,
    secondaryTargetId: secondaryTarget?.id ?? null,
    secondaryDamagePerBeat,
    secondarySlowMultiplier,
    events,
  };
}

export function updateElapseBeamDamage({
  beam,
  enemies,
  dt,
  currentBeat,
  beatSeconds,
  damageMultiplier,
}) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const events = [];
  const def = getBulletDef("elapse-left");
  const target = findElapseTarget(enemyIndex, beam.lane, beam.targetId);
  if (!target) {
    return { targetId: null, target: null, events };
  }

  const guard = enemyIndex.findById(beam.guardId);
  const damageTarget = guard?.hp > 0 ? guard : target;
  const damage = def.damagePerBeat * damageMultiplier * (dt / beatSeconds);
  applyDamage(damageTarget, damage, currentBeat, events, {
    enemies: enemyIndex,
    ignoreGhost: true,
    quiet: true,
  });
  const secondaryTarget = enemyIndex.findById(beam.secondaryTargetId);
  if (
    secondaryTarget?.hp > 0 &&
    secondaryTarget.id !== target.id &&
    secondaryTarget.targetable !== false &&
    beam.secondaryDamagePerBeat > 0
  ) {
    applyDamage(secondaryTarget, beam.secondaryDamagePerBeat * (dt / beatSeconds), currentBeat, events, {
      enemies: enemyIndex,
      ignoreGhost: true,
      quiet: true,
    });
  }
  return {
    targetId: target.hp > 0 ? target.id : null,
    guardId: guard?.hp > 0 ? guard.id : null,
    secondaryTargetId: secondaryTarget?.hp > 0 && secondaryTarget.id !== target.id ? secondaryTarget.id : null,
    target,
    events,
  };
}

export function resolveElapseFinish({
  lane,
  enemies,
  currentBeat,
  damageMultiplier,
  weak = false,
  beatSeconds = 1,
  chipEffects = [],
}) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const def = getBulletDef("elapse-right");
  const events = [];
  const amount = (weak ? def.weakDamage : def.damage) * damageMultiplier;
  const chipSummary = summarizeChipEffects(chipEffects);
  if (chipSummary.stingerPierce > 0) {
    resolveBulletHandler(def, {
      slot: { id: "elapse-right", upgraded: false, weak },
      lane,
      enemies: enemyIndex,
      currentBeat,
      targetBeat: currentBeat,
      echoAnchorBeat: currentBeat,
      beatSeconds,
      damageMultiplier,
      chipEffects,
      events,
      scale: (value) => value * (weak ? def.weakDamage / def.damage : 1) * damageMultiplier,
    });
    return events;
  }

  const hit = hitClosestInLaneDetailed(enemyIndex, lane, amount, currentBeat, events);
  if (chipSummary.shellKnockback > 0 && hit.damageTarget && !hit.result?.passedThrough) {
    knockEnemyBack(hit.target ?? hit.damageTarget, chipSummary.shellKnockback);
  }
  if (hit.result?.damaged && hit.damageTarget) {
    applyImpactEffectsToTarget({
      effects: createChipImpactEffects(chipSummary, { amount, beatSeconds }),
      target: hit.damageTarget,
      enemies: enemyIndex,
      lane,
      y: hit.target?.y ?? PROJECTILE_END_Y,
      currentBeat,
      events,
    });
  }
  addLaneProjectile(
    events,
    lane,
    weak ? "#a86674" : def.color,
    weak,
    hit.target?.y ?? PROJECTILE_END_Y,
    weak ? 4 : 12,
  );
  return events;
}
