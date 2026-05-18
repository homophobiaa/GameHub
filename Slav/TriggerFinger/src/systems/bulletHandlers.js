import {
  addHorizontalBar,
  addLaneProjectile,
  addPiercingProjectile,
  addSlashEffect,
  applyDamage,
  applyDot,
  closestEnemies,
  hitClosestInLaneDetailed,
  hitHorizontalBand,
  hitLine,
  planHitLine,
  planShellLine,
} from "./combatPrimitives.js";
import {
  LANE_COUNT,
  PIERCING_PROJECTILE_MIN_STAGE_SECONDS,
  PIERCING_PROJECTILE_TARGET_OFFSET_BEATS,
} from "../config/gameplay.js";
import {
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

function lineOptions({ chipSummary, primaryHits = 1, effectsForImpact = null }) {
  return {
    isSecondary: ({ hitIndex }) => hitIndex >= primaryHits,
    knockbackForImpact: () => chipSummary.shellKnockback || undefined,
    effectsForImpact,
  };
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
    result.path.at(-1)?.y ?? 0.04,
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
      lineOptions({ chipSummary, primaryHits: baseTargets }),
    );
    const endY = result.hits < result.maxTargets ? 0.04 : result.touched.at(-1)?.y ?? 0.04;
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
        }),
      );
      addPlannedLine({ events, lane, color: def.color, result, currentBeat, targetBeat, beatSeconds });
      return;
    }

    const result = hitLine(enemies, lane, scale(def.damage), currentBeat, events, 1);
    const impactY = result.touched.at(-1)?.y;
    addLaneProjectile(events, lane, def.color, false, impactY ?? 0.04);

    if (!Number.isFinite(impactY)) {
      return;
    }

    hitHorizontalBand(enemies, impactY, radius, splashDamage, currentBeat, events);
    addHorizontalBar(events, def.color, impactY, radius);
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
        lineOptions({ chipSummary }),
      );
      addPlannedLine({ events, lane, color: def.color, result, currentBeat, targetBeat, beatSeconds });
      scheduleEcho({
        lane,
        slot,
        fireBeat: (echoAnchorBeat ?? currentBeat) + def.echoDelayBeats,
      });
      return;
    }

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

  toxic({ def, slot, lane, enemies, currentBeat, targetBeat, beatSeconds, events, scale, chipEffects }) {
    const chipSummary = summarizeChipEffects(chipEffects);
    const lanes = [lane - 1, lane, lane + 1].map((nextLane) => reflectedLane(lane, nextLane));

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
          secondary: nextLane !== lane,
        });
      });
      return;
    }

    lanes.forEach((nextLane) => {
      const hit = hitClosestInLaneDetailed(enemies, nextLane, scale(def.damage), currentBeat, events);
      addLaneProjectile(events, nextLane, def.color, nextLane !== lane, hit.target?.y ?? 0.04);
      if (hit.result?.damaged) {
        applyDot(hit.target, def, slot, currentBeat, beatSeconds);
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
      lineOptions({ chipSummary }),
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
