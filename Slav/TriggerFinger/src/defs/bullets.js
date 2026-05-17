export const BASE_DAMAGE = 10;

export const BULLET_DEFS = {
  stinger: {
    id: "stinger",
    name: "Stinger",
    color: "#f3bf4d",
    timing: "beat",
    leadBeats: 0.5,
    followBeats: 0,
    damage: BASE_DAMAGE,
    pierce: 2,
    description: "Solid damage and pierces two enemies.",
    upgradeName: "Needle",
    upgradeDescription: "Solid damage and pierces three enemies.",
    upgradeHighlight: "three",
  },
  shell: {
    id: "shell",
    name: "Shell",
    color: "#ff9f57",
    timing: "beat",
    leadBeats: 0,
    followBeats: 1,
    damage: 12,
    knockback: 0.24,
    description: "Keeps going if it kills, knocks back when stopped.",
    upgradeName: "Kicker",
    upgradeDescription: "Keeps going if it kills, knocks back significantly when stopped.",
    upgradeHighlight: "significantly",
  },
  brittle: {
    id: "brittle",
    name: "Brittle",
    color: "#58a9ff",
    timing: "either",
    leadBeats: 1,
    followBeats: 0.5,
    damage: BASE_DAMAGE,
    splashDamage: 4,
    splashRadius: 0.065,
    upgradedSplashRadius: 0.11,
    description: "Breaks into a horizontal bar at the impact point.",
    upgradeName: "Shatter",
    upgradeDescription: "Breaks into a large horizontal bar at the impact point.",
    upgradeHighlight: "large",
  },
  pair: {
    id: "pair",
    name: "Pair",
    color: "#bd84ff",
    timing: "either",
    leadBeats: 0,
    followBeats: 1,
    upgradedFollowBeats: 0,
    damage: 7,
    echoDelayBeats: 0.5,
    description: "Fires again on the next half-beat.",
    upgradeName: "Double",
    upgradeDescription: "on/off | lead 0 | follow 0",
    upgradeHighlight: "follow 0",
  },
  chip: {
    id: "chip",
    name: "Chip",
    color: "#43d7dd",
    timing: "offbeat",
    leadBeats: 0,
    followBeats: 0,
    damage: 3,
    targetCount: 6,
    upgradedTargetCount: 10,
    description: "Pings the closest enemies for light damage.",
    upgradeName: "Cover",
    upgradeDescription: "Pings a heap of enemies for light damage.",
    upgradeHighlight: "a heap of enemies",
  },
  toxic: {
    id: "toxic",
    name: "Toxic",
    color: "#48d39b",
    timing: "beat",
    leadBeats: 1,
    followBeats: 0,
    damage: 3,
    dotDamage: BASE_DAMAGE * 0.7,
    dotDurationBeats: 2.5,
    upgradedDotDurationBeats: 1,
    description: "Hits three lanes and poisons what it touches.",
    upgradeName: "Caustic",
    upgradeDescription: "Hits three lanes and poisons what it touches rapidly.",
    upgradeHighlight: "rapidly",
  },
  elapse: {
    id: "elapse",
    name: "Elapse",
    color: "#ed8ebc",
    timing: "offbeat",
    leadBeats: 0.5,
    followBeats: 0.5,
    description: "Hold the left half to fire a continuous beam, release the right half to finish it off.",
    upgradeName: "Elapse+",
    upgradeDescription: "Hold the left half to fire a slowing beam, release the right half to finish it off.",
    upgradeHighlight: "slowing",
  },
  "elapse-left": {
    id: "elapse-left",
    name: "Elapse",
    color: "#ed8ebc",
    timing: "offbeat",
    leadBeats: 0.5,
    followBeats: 0,
    damagePerBeat: 4,
    half: "left",
    parentId: "elapse",
    description: "Hold the left half to fire a continuous beam.",
    upgradeName: "Elapse+",
    upgradeDescription: "Hold the left half to fire a slowing beam, release the right half to finish it off.",
    upgradeHighlight: "slowing",
  },
  "elapse-right": {
    id: "elapse-right",
    name: "Elapse",
    color: "#ed8ebc",
    timing: "offbeat",
    leadBeats: 0,
    followBeats: 0.5,
    damage: 9,
    weakDamage: 3,
    half: "right",
    parentId: "elapse",
    description: "Release the right half to finish the beam.",
    upgradeName: "Elapse+",
    upgradeDescription: "Hold the left half to fire a slowing beam, release the right half to finish it off.",
    upgradeHighlight: "slowing",
  },
};

export const BULLET_POOL = [
  "stinger",
  "shell",
  "brittle",
  "pair",
  "chip",
  "toxic",
  "elapse",
];

export const STARTING_TRACK = {
  cycleBeats: 3.5,
  placements: [
    { uid: "p1", id: "stinger", upgraded: false, beat: 3 },
    { uid: "p2", id: "shell", upgraded: false, beat: 0 },
  ],
  inventory: [],
};

export function getBulletDef(id) {
  return BULLET_DEFS[id];
}

export function getSlotName(slot) {
  const def = getBulletDef(slot.id);
  const baseName = slot.upgraded ? def.upgradeName : def.name;
  if (def.parentId === "elapse") {
    return `${baseName} ${def.half === "left" ? "Left" : "Right"}`;
  }

  return baseName;
}

export function getSlotColor(slot) {
  return getBulletDef(slot.id).color;
}

export function getSlotFollowBeats(slot) {
  const def = getBulletDef(slot.id);
  if (slot.upgraded && Number.isFinite(def.upgradedFollowBeats)) {
    return def.upgradedFollowBeats;
  }

  return def.followBeats;
}

export function isElapseId(id) {
  return id === "elapse-left" || id === "elapse-right";
}

export function isElapsePiece(piece) {
  return Boolean(piece && isElapseId(piece.id));
}

export function getElapseHalf(pieceOrId) {
  const id = typeof pieceOrId === "string" ? pieceOrId : pieceOrId?.id;
  if (id === "elapse-left") {
    return "left";
  }

  if (id === "elapse-right") {
    return "right";
  }

  return null;
}
