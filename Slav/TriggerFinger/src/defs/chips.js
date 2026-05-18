export const CHIP_TUNING = {
  chipsPerScrap: 2,
  secondaryEffectScale: 1 / 3,
  elapseSecondaryDamageScale: 1 / 3,
  elapseSecondarySlowScale: 1 / 3,
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
};

export function getChipDef(sourceId) {
  return CHIP_DEFS[sourceId] ?? null;
}
