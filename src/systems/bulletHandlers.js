import {
  addHorizontalBar,
  addLaneProjectile,
  addPiercingProjectile,
  addSlashEffect,
  applyDamage,
  applyDot,
  applyImpactEffectsToTarget,
  closestEnemies,
  hitClosestInLaneDetailed,
  hitHorizontalBand,
  planHitLine,
  planShellLine,
  PROJECTILE_END_Y,
} from "./combatPrimitives.js";
import {
  LANE_COUNT,
  PIERCING_PROJECTILE_MIN_STAGE_SECONDS,
  PIERCING_PROJECTILE_TARGET_OFFSET_BEATS,
} from "../config/gameplay.js";
import {
  createChipImpactEffects,
  hasLineChipModifiers,
  secondaryChipAmount,
  secondaryChipDotDamage,
  secondaryChipScale,
  summarizeChipEffects,
} from "./chipEffects.js";

function reflectedLane(sourceLane, nextLane) {
  if (nextLane < 0 || nextLane >= LANE_COUNT) {
    return sourceLane;
  }

  return nextLane;
}

function getPiercingStageDelaySeconds({ stageCount, currentBeat, targetBeat, beatSeconds }) {
  const stepCount = Math.max(0, (stageCount ?? 0) - 1);
  if (stepCount <= 0) {
    return 0;
  }

  const safeTargetBeat = Number.isFinite(targetBeat) ? targetBeat : currentBeat;
  const safeBeatSeconds = Number.isFinite(beatSeconds) ? beatSeconds : 1;
  const totalDelayBeats = Math.max(
    0,
    safeTargetBeat + PIERCING_PROJECTILE_TARGET_OFFSET_BEATS - currentBeat,
  );
  return Math.max(
    PIERCING_PROJECTILE_MIN_STAGE_SECONDS,
    (totalDelayBeats * safeBeatSeconds) / stepCount,
  );
}

function lineAmount(primaryAmount, secondaryAmount, primaryHits = 1) {
  return ({ hitIndex }) => {
    if (hitIndex < primaryHits) {
      return primaryAmount;
    }

    const secondaryIndex = hitIndex - primaryHits;
    return typeof secondaryAmount === "function"
      ? secondaryAmount(secondaryIndex)
      : secondaryAmount;
  };
}

function getChipImpactEffects(chipSummary, beatSeconds, amount) {
  return createChipImpactEffects(chipSummary, { amount, beatSeconds });
}

function lineOptions({ chipSummary, primaryHits = 1, beatSeconds = 1, effectsForImpact = null }) {
  return {
    isSecondary: ({ hitIndex }) => hitIndex >= primaryHits,
    knockbackForImpact: () => chipSummary.shellKnockback || undefined,
    effectsForImpact: (context) => [
      ...(effectsForImpact?.(context) ?? []),
      ...getChipImpactEffects(chipSummary, beatSeconds, context.amount),
    ],
  };
}

function applyImmediateChipImpact({
  chipSummary,
  beatSeconds = 1,
  hit,
  enemies,
  lane,
  y,
  amount,
  currentBeat,
  events,
}) {
  if (!hit?.result?.damaged || !hit.damageTarget) {
    return;
  }

  applyImpactEffectsToTarget({
    effects: getChipImpactEffects(chipSummary, beatSeconds, amount),
    target: hit.damageTarget,
    enemies,
    lane,
    y,
    currentBeat,
    events,
  });
}

function addPlannedLine({
  events,
  lane,
  color,
  result,
  currentBeat,
  targetBeat,
  beatSeconds,
  secondary = false,
  width = null,
}) {
  addPiercingProjectile(
    events,
    lane,
    color,
    result.path,
    getPiercingStageDelaySeconds({ stageCount: result.stageCount, currentBeat, targetBeat, beatSeconds }),
    result.path.at(-1)?.y ?? PROJECTILE_END_Y,
    result.impacts,
    result.stageCount,
    secondary,
    width,
  );
}

const BULLET_HANDLERS = {
  stinger({ def, slot, lane, enemies, currentBeat, targetBeat, beatSeconds, events, scale, chipEffects }) {
    const chipSummary = summarizeChipEffects(chipEffects);
    const baseTargets = (def.pierce ?? 0) + 1 + (slot.upgraded ? 1 : 0);
    const maxTargets = baseTargets + chipSummary.stingerPierce;
    const result = planHitLine(
      enemies,
      lane,
      lineAmount(
        scale(def.damage),
        (secondaryIndex) => secondaryChipAmount(scale(def.damage), chipSummary, secondaryIndex),
        baseTargets,
      ),
      currentBeat,
      maxTargets,
      lineOptions({ chipSummary, primaryHits: baseTargets, beatSeconds }),
    );
    const endY = result.hits < result.maxTargets
      ? PROJECTILE_END_Y
      : result.touched.at(-1)?.y ?? PROJECTILE_END_Y;
    addPiercingProjectile(
      events,
      lane,
      def.color,
      result.path,
      getPiercingStageDelaySeconds({ stageCount: result.stageCount, currentBeat, targetBeat, beatSeconds }),
      endY,
      result.impacts,
      result.stageCount,
    );
  },

  shell({ def, slot, lane, enemies, currentBeat, targetBeat, beatSeconds, events, scale, chipEffects }) {
    const chipSummary = summarizeChipEffects(chipEffects);
    const baseKnockback = slot.upgraded ? def.knockback * 1.6 : def.knockback;
    const result = planShellLine(
      enemies,
      lane,
      scale(def.damage),
      baseKnockback + chipSummary.shellKnockback,
      currentBeat,
      {
        extraPierceCount: chipSummary.stingerPierce,
        secondaryDamageFraction: (secondaryIndex) => secondaryChipScale(chipSummary, secondaryIndex),
        secondaryKnockbackFraction: (secondaryIndex) => secondaryChipScale(chipSummary, secondaryIndex),
        effectsForImpact: ({ amount }) => getChipImpactEffects(chipSummary, beatSeconds, amount),
      },
    );
    addPiercingProjectile(
      events,
      lane,
      def.color,
      result.path,
      getPiercingStageDelaySeconds({ stageCount: result.stageCount, currentBeat, targetBeat, beatSeconds }),
      result.endY,
      result.impacts,
      result.stageCount,
    );
  },

  brittle({ def, slot, lane, enemies, currentBeat, targetBeat, beatSeconds, events, scale, chipEffects }) {
    const chipSummary = summarizeChipEffects(chipEffects);
    const radius = slot.upgraded ? def.upgradedSplashRadius : def.splashRadius;
    const splashDamage = scale(slot.upgraded ? def.splashDamage * 1.5 : def.splashDamage);
    if (hasLineChipModifiers(chipSummary)) {
      const result = planHitLine(
        enemies,
        lane,
        lineAmount(
          scale(def.damage),
          (secondaryIndex) => secondaryChipAmount(scale(def.damage), chipSummary, secondaryIndex),
        ),
        currentBeat,
        1 + chipSummary.stingerPierce,
        lineOptions({
          chipSummary,
          effectsForImpact: ({ secondary, hitIndex }) => [{
            kind: "horizontalBand",
            color: def.color,
            radius: secondary ? secondaryChipAmount(radius, chipSummary, hitIndex - 1) : radius,
            amount: secondary ? secondaryChipAmount(splashDamage, chipSummary, hitIndex - 1) : splashDamage,
          }],
          beatSeconds,
        }),
      );
      addPlannedLine({ events, lane, color: def.color, result, currentBeat, targetBeat, beatSeconds });
      return;
    }

    const hit = hitClosestInLaneDetailed(enemies, lane, scale(def.damage), currentBeat, events);
    const impactY = hit.target?.y;
    addLaneProjectile(events, lane, def.color, false, impactY ?? PROJECTILE_END_Y);

    if (!Number.isFinite(impactY)) {
      return;
    }

    hitHorizontalBand(enemies, impactY, radius, splashDamage, currentBeat, events);
    addHorizontalBar(events, def.color, impactY, radius);
    applyImmediateChipImpact({
      chipSummary,
      beatSeconds,
      hit,
      enemies,
      lane,
      y: impactY,
      amount: scale(def.damage),
      currentBeat,
      events,
    });
  },

  pair({ def, slot, lane, enemies, currentBeat, targetBeat, beatSeconds, echoAnchorBeat, events, scale, chipEffects, scheduleEcho }) {
    const chipSummary = summarizeChipEffects(chipEffects);
    if (hasLineChipModifiers(chipSummary)) {
      const result = planHitLine(
        enemies,
        lane,
        lineAmount(
          scale(def.damage),
          (secondaryIndex) => secondaryChipAmount(scale(def.damage), chipSummary, secondaryIndex),
        ),
        currentBeat,
        1 + chipSummary.stingerPierce,
        lineOptions({ chipSummary, beatSeconds }),
      );
      addPlannedLine({ events, lane, color: def.color, result, currentBeat, targetBeat, beatSeconds });
      scheduleEcho({
        lane,
        slot,
        fireBeat: (echoAnchorBeat ?? currentBeat) + def.echoDelayBeats,
      });
      return;
    }

    const hit = hitClosestInLaneDetailed(enemies, lane, scale(def.damage), currentBeat, events);
    addLaneProjectile(events, lane, def.color, false, hit.target?.y ?? PROJECTILE_END_Y);
    applyImmediateChipImpact({
      chipSummary,
      beatSeconds,
      hit,
      enemies,
      lane,
      y: hit.target?.y ?? PROJECTILE_END_Y,
      amount: scale(def.damage),
      currentBeat,
      events,
    });
    scheduleEcho({
      lane,
      slot,
      fireBeat: (echoAnchorBeat ?? currentBeat) + def.echoDelayBeats,
    });
  },

  chip({ def, slot, enemies, currentBeat, beatSeconds, events, scale, chipEffects }) {
    const chipSummary = summarizeChipEffects(chipEffects);
    const count = slot.upgraded ? def.upgradedTargetCount : def.targetCount;
    closestEnemies(enemies, count, { phasingGhostsLast: true }).forEach((enemy) => {
      addSlashEffect(events, enemy);
      const result = applyDamage(enemy, scale(def.damage), currentBeat, events, { enemies });
      if (result.damaged) {
        applyImpactEffectsToTarget({
          effects: getChipImpactEffects(chipSummary, beatSeconds, scale(def.damage)),
          target: enemy,
          enemies,
          lane: enemy.lane,
          y: enemy.y,
          currentBeat,
          events,
        });
      }
    });
  },

  toxic({ def, slot, lane, enemies, currentBeat, targetBeat, beatSeconds, events, scale, chipEffects }) {
    const chipSummary = summarizeChipEffects(chipEffects);
    const lanes = [lane - 1, lane, lane + 1].map((nextLane) => reflectedLane(lane, nextLane));
    const beamWidth = def.beamWidth ?? 6;

    if (hasLineChipModifiers(chipSummary)) {
      lanes.forEach((nextLane) => {
        const result = planHitLine(
          enemies,
          nextLane,
          lineAmount(
            scale(def.damage),
            (secondaryIndex) => secondaryChipAmount(scale(def.damage), chipSummary, secondaryIndex),
          ),
          currentBeat,
          1 + chipSummary.stingerPierce,
          lineOptions({
            chipSummary,
            effectsForImpact: ({ secondary, hitIndex }) => [{
              kind: "dot",
              damage: secondary ? secondaryChipDotDamage(def.dotDamage, chipSummary, hitIndex - 1) : def.dotDamage,
              durationSeconds: (slot.upgraded ? def.upgradedDotDurationBeats : def.dotDurationBeats) * beatSeconds,
              source: def.id,
            }],
            beatSeconds,
          }),
        );
        addPlannedLine({
          events,
          lane: nextLane,
          color: def.color,
          result,
          currentBeat,
          targetBeat,
          beatSeconds,
          secondary: false,
          width: beamWidth,
        });
      });
      return;
    }

    lanes.forEach((nextLane) => {
      const hit = hitClosestInLaneDetailed(enemies, nextLane, scale(def.damage), currentBeat, events);
      addLaneProjectile(events, nextLane, def.color, false, hit.target?.y ?? PROJECTILE_END_Y, beamWidth);
      if (hit.result?.damaged) {
        applyDot(hit.target, def, slot, currentBeat, beatSeconds);
        applyImmediateChipImpact({
          chipSummary,
          beatSeconds,
          hit,
          enemies,
          lane: nextLane,
          y: hit.target?.y ?? PROJECTILE_END_Y,
          amount: scale(def.damage),
          currentBeat,
          events,
        });
      }
    });
  },

  "elapse-right"({ def, slot, lane, enemies, currentBeat, targetBeat, beatSeconds, events, scale, chipEffects }) {
    const chipSummary = summarizeChipEffects(chipEffects);
    const result = planHitLine(
      enemies,
      lane,
      lineAmount(
        scale(def.damage),
        (secondaryIndex) => secondaryChipAmount(scale(def.damage), chipSummary, secondaryIndex),
      ),
      currentBeat,
      1 + chipSummary.stingerPierce,
      lineOptions({ chipSummary, beatSeconds }),
    );
    addPlannedLine({
      events,
      lane,
      color: def.color,
      result,
      currentBeat,
      targetBeat,
      beatSeconds,
      width: slot.weak ? 4 : 12,
      secondary: Boolean(slot.weak),
    });
  },
};

export function resolveBulletHandler(def, context) {
  BULLET_HANDLERS[def.id]?.({
    ...context,
    def,
  });
}
