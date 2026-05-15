import { getBulletDef } from "../defs/bullets.js";
import { resolveBulletHandler } from "./bulletHandlers.js";
import {
  addLaneProjectile,
  applyDamage,
  elapseBeamEnemies,
  findBarrierInterceptor,
  findElapseTarget,
  hitClosestInLaneDetailed,
  pushGuardEvent,
} from "./combatPrimitives.js";

export function resolveBulletShot({
  slot,
  lane,
  enemies,
  currentBeat,
  echoAnchorBeat,
  beatSeconds,
  damageMultiplier,
  scheduleEcho = () => {},
}) {
  const def = getBulletDef(slot.id);
  const events = [];
  const scale = (value) => value * damageMultiplier;

  resolveBulletHandler(def, {
    slot,
    lane,
    enemies,
    currentBeat,
    echoAnchorBeat,
    beatSeconds,
    damageMultiplier,
    scheduleEcho,
    events,
    scale,
  });

  return events;
}

export function updateDamageOverTime(enemies, dt, currentBeat, events) {
  enemies.forEach((enemy) => {
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
      applyDamage(enemy, damage, currentBeat, events, { enemies, ignoreGhost: true, quiet: true });
      return dot.damageRemaining > 0.01 && dot.secondsRemaining > 0.01;
    });
  });
}

export function resolveElapseStart({ lane, enemies, currentBeat }) {
  const events = [];
  const intendedTarget = elapseBeamEnemies(enemies, lane)[0] ?? null;
  if (!intendedTarget) {
    return { targetId: null, events };
  }

  const interceptor = findBarrierInterceptor(enemies, lane, currentBeat, intendedTarget);
  const target = interceptor ?? intendedTarget;
  if (interceptor) {
    pushGuardEvent(events, lane, interceptor, currentBeat);
  }

  return { targetId: target.id, events };
}

export function updateElapseBeamDamage({
  beam,
  enemies,
  dt,
  currentBeat,
  beatSeconds,
  damageMultiplier,
}) {
  const events = [];
  const def = getBulletDef("elapse-left");
  const target = findElapseTarget(enemies, beam.lane, beam.targetId);
  if (!target) {
    return { targetId: null, target: null, events };
  }

  const damage = def.damagePerBeat * damageMultiplier * (dt / beatSeconds);
  applyDamage(target, damage, currentBeat, events, { enemies, ignoreGhost: true, quiet: true });
  return { targetId: target.hp > 0 ? target.id : null, target, events };
}

export function resolveElapseFinish({
  lane,
  enemies,
  currentBeat,
  damageMultiplier,
  weak = false,
}) {
  const def = getBulletDef("elapse-right");
  const events = [];
  const amount = (weak ? def.weakDamage : def.damage) * damageMultiplier;
  const hit = hitClosestInLaneDetailed(enemies, lane, amount, currentBeat, events);
  addLaneProjectile(
    events,
    lane,
    weak ? "#a86674" : def.color,
    weak,
    hit.target?.y ?? 0.04,
    weak ? 4 : 12,
  );
  return events;
}
