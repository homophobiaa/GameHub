import { getBulletDef } from "../defs/bullets.js";
import { CHIP_TUNING, getChipDef } from "../defs/chips.js";

function getSecondaryEffectScale(def) {
  return Number.isFinite(def?.secondaryEffectScale)
    ? def.secondaryEffectScale
    : CHIP_TUNING.secondaryEffectScale;
}

export function summarizeChipEffects(chipEffects = []) {
  const shell = getBulletDef("shell");
  const toxic = getBulletDef("toxic");
  return chipEffects.reduce((summary, chip) => {
    const def = getChipDef(chip.sourceId);
    if (!def) {
      return summary;
    }

    if (def.extraPierce) {
      summary.stingerPierce += def.extraPierce;
      const scale = getSecondaryEffectScale(def);
      for (let index = 0; index < def.extraPierce; index += 1) {
        summary.secondaryEffectScales.push(scale);
      }
    }

    if (def.knockbackScale) {
      const upgradeMultiplier = chip.sourceUpgraded
        ? def.upgradedKnockbackMultiplier ?? 1
        : 1;
      summary.shellKnockback += shell.knockback *
        upgradeMultiplier *
        def.knockbackScale *
        getSecondaryEffectScale(def);
    }

    if (def.timedShotDamageScale) {
      summary.pairShotCount += 1;
      summary.pairShotDamageScale = Math.max(summary.pairShotDamageScale, def.timedShotDamageScale);
    }

    if (Number.isFinite(def.slowAmount)) {
      summary.elapseSlowStacks += 1;
      const extraStacks = Math.max(0, summary.elapseSlowStacks - 1);
      summary.elapseSlowAmount = def.slowAmount +
        extraStacks * (def.slowAmountPerStack ?? 0);
      summary.elapseSlowDurationSeconds = def.slowDurationSeconds +
        extraStacks * (def.slowDurationPerStack ?? 0);
    }

    if (Number.isFinite(def.radius)) {
      summary.brittleRadiusStacks += 1;
      summary.brittleRadius = def.radius +
        Math.max(0, summary.brittleRadiusStacks - 1) * (def.radiusPerStack ?? 0);
      summary.brittleDamageScale = getSecondaryEffectScale(def);
    }

    if (Number.isFinite(def.dotDamageScale)) {
      summary.toxicDotDamage += toxic.dotDamage * def.dotDamageScale;
      summary.toxicDotDurationBeats = def.dotDurationBeats ?? CHIP_TUNING.toxicDotDurationBeats;
    }

    return summary;
  }, {
    stingerPierce: 0,
    shellKnockback: 0,
    secondaryEffectScales: [],
    pairShotCount: 0,
    pairShotDamageScale: CHIP_TUNING.pairShotDamageScale,
    elapseSlowStacks: 0,
    elapseSlowAmount: 0,
    elapseSlowDurationSeconds: 0,
    brittleRadiusStacks: 0,
    brittleRadius: 0,
    brittleDamageScale: CHIP_TUNING.secondaryEffectScale,
    toxicDotDamage: 0,
    toxicDotDurationBeats: CHIP_TUNING.toxicDotDurationBeats,
  });
}

export function hasLineChipModifiers(chipSummary) {
  return chipSummary.stingerPierce > 0 || chipSummary.shellKnockback > 0;
}

export function hasImpactChipEffects(chipSummary) {
  return chipSummary.brittleRadius > 0 ||
    chipSummary.toxicDotDamage > 0 ||
    chipSummary.elapseSlowAmount > 0;
}

export function createToxicChipImpactEffects(chipSummary, beatSeconds = 1) {
  if (chipSummary.toxicDotDamage <= 0) {
    return [];
  }

  return [{
    kind: "dot",
    damage: chipSummary.toxicDotDamage,
    durationSeconds: chipSummary.toxicDotDurationBeats * beatSeconds,
    source: "toxic-chip",
  }];
}

export function createChipImpactEffects(chipSummary, { amount = 0, beatSeconds = 1 } = {}) {
  const effects = createToxicChipImpactEffects(chipSummary, beatSeconds);
  if (chipSummary.elapseSlowAmount > 0 && chipSummary.elapseSlowDurationSeconds > 0) {
    effects.push({
      kind: "slow",
      multiplier: Math.max(0.05, 1 - chipSummary.elapseSlowAmount),
      durationSeconds: chipSummary.elapseSlowDurationSeconds,
      source: "elapse-chunk",
    });
  }

  if (chipSummary.brittleRadius > 0 && amount > 0) {
    effects.push({
      kind: "impactRadius",
      color: getBulletDef("brittle").color,
      radius: chipSummary.brittleRadius,
      amount: amount * chipSummary.brittleDamageScale,
      effects: createToxicChipImpactEffects(chipSummary, beatSeconds),
    });
  }

  return effects;
}

export function pairChipDamage(amount) {
  return amount * CHIP_TUNING.pairShotDamageScale;
}

export function secondaryChipScale(chipSummary = null, secondaryIndex = 0) {
  return chipSummary?.secondaryEffectScales?.[secondaryIndex] ?? CHIP_TUNING.secondaryEffectScale;
}

export function secondaryChipAmount(amount, chipSummary = null, secondaryIndex = 0) {
  return amount * secondaryChipScale(chipSummary, secondaryIndex);
}

export function secondaryChipDotDamage(amount, chipSummary = null, secondaryIndex = 0) {
  return Math.ceil(amount * secondaryChipScale(chipSummary, secondaryIndex));
}

export function elapseSecondaryDamagePerBeat(damagePerBeat) {
  return Math.ceil(damagePerBeat * CHIP_TUNING.elapseSecondaryDamageScale);
}

export function elapseSecondarySlowMultiplier(primarySlowMultiplier) {
  return 1 - (1 - primarySlowMultiplier) * CHIP_TUNING.elapseSecondarySlowScale;
}
