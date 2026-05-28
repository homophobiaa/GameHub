export const CHIP_TUNING = {
  chipsPerScrap: 2,
  secondaryEffectScale: 1 / 3,
  elapseSecondaryDamageScale: 1 / 3,
  elapseSecondarySlowScale: 1 / 3,
  pairShotDamageScale: 1 / 2,
  brittleImpactRadius: 0.085,
  brittleImpactRadiusPerStack: 0.035,
  toxicDotDamageScale: 1 / 3,
  toxicDotDurationBeats: 2.5,
};

export const CHIP_DEFS = {
  stinger: {
    id: "stinger",
    sourceId: "stinger",
    extraPierce: 1,
    secondaryEffectScale: null,
  },
  shell: {
    id: "shell",
    sourceId: "shell",
    knockbackScale: 1,
    upgradedKnockbackMultiplier: 1.6,
    secondaryEffectScale: 1 / 4,
  },
  pair: {
    id: "pair",
    sourceId: "pair",
    timedShotDamageScale: CHIP_TUNING.pairShotDamageScale,
  },
  brittle: {
    id: "brittle",
    sourceId: "brittle",
    radius: CHIP_TUNING.brittleImpactRadius,
    radiusPerStack: CHIP_TUNING.brittleImpactRadiusPerStack,
    secondaryEffectScale: null,
  },
  toxic: {
    id: "toxic",
    sourceId: "toxic",
    dotDamageScale: CHIP_TUNING.toxicDotDamageScale,
    dotDurationBeats: CHIP_TUNING.toxicDotDurationBeats,
  },
};

export function getChipDef(sourceId) {
  return CHIP_DEFS[sourceId] ?? null;
}
