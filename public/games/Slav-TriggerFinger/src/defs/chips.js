export const CHIP_TUNING = {
  chipsPerScrap: 2,
  chipChunksPerScrap: 1,
  chipDomainReductionBeats: 0.5,
  secondaryEffectScale: 1 / 3,
  elapseSecondaryDamageScale: 1 / 3,
  elapseSecondarySlowScale: 1 / 3,
  pairShotDamageScale: 1 / 2,
  pairShotIntervalBeats: 0.25,
  brittleImpactRadius: 0.085,
  brittleImpactRadiusPerStack: 0.035,
  toxicDotDamageScale: 1 / 3,
  toxicDotDurationBeats: 2.5,
  elapseSlowAmount: 0.15,
  elapseSlowAmountPerStack: 0.1,
  elapseSlowDurationSeconds: 1,
  elapseSlowDurationPerStack: 0.7,
};

export const CHIP_CORNERS = [
  "top-left",
  "top-right",
  "bottom-right",
  "bottom-left",
];

export const CHIP_CORNER_LABELS = {
  "top-left": "top left",
  "top-right": "top right",
  "bottom-right": "bottom right",
  "bottom-left": "bottom left",
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
  chip: {
    id: "chip",
    sourceId: "chip",
    domainReductionBeats: CHIP_TUNING.chipDomainReductionBeats,
  },
  "elapse-left": {
    id: "elapse",
    sourceId: "elapse-left",
    slowAmount: CHIP_TUNING.elapseSlowAmount,
    slowAmountPerStack: CHIP_TUNING.elapseSlowAmountPerStack,
    slowDurationSeconds: CHIP_TUNING.elapseSlowDurationSeconds,
    slowDurationPerStack: CHIP_TUNING.elapseSlowDurationPerStack,
  },
  "elapse-right": {
    id: "elapse",
    sourceId: "elapse-right",
    slowAmount: CHIP_TUNING.elapseSlowAmount,
    slowAmountPerStack: CHIP_TUNING.elapseSlowAmountPerStack,
    slowDurationSeconds: CHIP_TUNING.elapseSlowDurationSeconds,
    slowDurationPerStack: CHIP_TUNING.elapseSlowDurationPerStack,
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

export function getChunkCountForSource(sourceId) {
  return sourceId === "chip"
    ? CHIP_TUNING.chipChunksPerScrap
    : CHIP_TUNING.chipsPerScrap;
}
