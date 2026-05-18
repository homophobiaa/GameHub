import { getBulletDef } from "../defs/bullets.js";
import {
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

export function resolvePiercingImpact({ impact, enemies, currentBeat }) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const target = enemyIndex.findById(impact.targetId);
  const events = [];
  if (!target || target.hp <= 0) {
    return events;
  }

  if (impact.guard) {
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
      lane: impact.lane ?? target.lane,
      y: impact.y ?? target.y,
      currentBeat,
      events,
    });
  }
  if (Number.isFinite(impact.knockback) && !result.passedThrough) {
    const knockbackTarget = impact.knockbackTargetId
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
  addLaneProjectile(events, lane, def.color, true, hit.target?.y ?? 0.04, 5);
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
  addLaneProjectile(events, lane, weak ? "#a86674" : def.color, weak, hit.target?.y ?? 0.04, weak ? 4 : 12);
  return events;
}
