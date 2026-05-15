import {
  addHorizontalBar,
  addLaneProjectile,
  addSlashEffect,
  applyDamage,
  applyDot,
  closestEnemies,
  hitClosestInLaneDetailed,
  hitHorizontalBand,
  hitLine,
  hitShellLine,
} from "./combatPrimitives.js";

function reflectedLane(sourceLane, nextLane) {
  if (nextLane < 0 || nextLane > 2) {
    return sourceLane;
  }

  return nextLane;
}

const BULLET_HANDLERS = {
  stinger({ def, slot, lane, enemies, currentBeat, events, scale }) {
    const maxTargets = (def.pierce ?? 0) + 1 + (slot.upgraded ? 1 : 0);
    const result = hitLine(enemies, lane, scale(def.damage), currentBeat, events, maxTargets);
    const endY = result.hits < result.maxTargets ? 0.04 : result.touched.at(-1)?.y ?? 0.04;
    addLaneProjectile(events, lane, def.color, false, endY);
  },

  shell({ def, slot, lane, enemies, currentBeat, events, scale }) {
    const result = hitShellLine(
      enemies,
      lane,
      scale(def.damage),
      slot.upgraded ? def.knockback * 1.6 : def.knockback,
      currentBeat,
      events,
    );
    addLaneProjectile(events, lane, def.color, false, result.endY);
  },

  brittle({ def, slot, lane, enemies, currentBeat, events, scale }) {
    const result = hitLine(enemies, lane, scale(def.damage), currentBeat, events, 1);
    const impactY = result.touched.at(-1)?.y;
    addLaneProjectile(events, lane, def.color, false, impactY ?? 0.04);

    if (!Number.isFinite(impactY)) {
      return;
    }

    const radius = slot.upgraded ? def.upgradedSplashRadius : def.splashRadius;
    const damage = scale(slot.upgraded ? def.splashDamage * 1.5 : def.splashDamage);
    hitHorizontalBand(enemies, impactY, radius, damage, currentBeat, events);
    addHorizontalBar(events, def.color, impactY, radius);
  },

  pair({ def, slot, lane, enemies, currentBeat, echoAnchorBeat, events, scale, scheduleEcho }) {
    const result = hitLine(enemies, lane, scale(def.damage), currentBeat, events, 1);
    addLaneProjectile(events, lane, def.color, false, result.touched.at(-1)?.y ?? 0.04);
    scheduleEcho({
      lane,
      slot,
      fireBeat: (echoAnchorBeat ?? currentBeat) + def.echoDelayBeats,
    });
  },

  chip({ def, slot, enemies, currentBeat, events, scale }) {
    const count = slot.upgraded ? def.upgradedTargetCount : def.targetCount;
    closestEnemies(enemies, count).forEach((enemy) => {
      addSlashEffect(events, enemy);
      applyDamage(enemy, scale(def.damage), currentBeat, events, { enemies });
    });
  },

  toxic({ def, slot, lane, enemies, currentBeat, beatSeconds, events, scale }) {
    const lanes = [lane - 1, lane, lane + 1].map((nextLane) => reflectedLane(lane, nextLane));

    lanes.forEach((nextLane) => {
      const hit = hitClosestInLaneDetailed(enemies, nextLane, scale(def.damage), currentBeat, events);
      addLaneProjectile(events, nextLane, def.color, nextLane !== lane, hit.target?.y ?? 0.04);
      if (hit.result?.damaged) {
        applyDot(hit.target, def, slot, currentBeat, beatSeconds);
      }
    });
  },
};

export function resolveBulletHandler(def, context) {
  BULLET_HANDLERS[def.id]?.({
    ...context,
    def,
  });
}
