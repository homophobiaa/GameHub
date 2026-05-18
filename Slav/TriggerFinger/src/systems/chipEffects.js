import { getBulletDef } from "../defs/bullets.js";
import { CHIP_TUNING, getChipDef } from "../defs/chips.js";

function getSecondaryEffectScale(def) {
  return Number.isFinite(def?.secondaryEffectScale)
    ? def.secondaryEffectScale
    : CHIP_TUNING.secondaryEffectScale;
}

export function summarizeChipEffects(chipEffects = []) {
  const shell = getBulletDef("shell");
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

    return summary;
  }, {
    stingerPierce: 0,
    shellKnockback: 0,
    secondaryEffectScales: [],
  });
}

export function hasLineChipModifiers(chipSummary) {
  return chipSummary.stingerPierce > 0 || chipSummary.shellKnockback > 0;
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
