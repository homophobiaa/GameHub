import { BASE_DAMAGE } from "./bullets.js";

export const ENEMY_DEFS = {
  basic: {
    id: "basic",
    name: "Basic",
    color: "#d9e2ef",
    hp: BASE_DAMAGE * 2,
    speed: 0.074,
    score: 80,
  },
  cheer: {
    id: "cheer",
    name: "Cheer",
    color: "#f3bf4d",
    hp: BASE_DAMAGE * 1.75,
    speed: 0.083,
    score: 120,
    laneSpeedBoost: 1.45,
    description: "Boosts its lane when leading the pack.",
  },
  ghost: {
    id: "ghost",
    name: "Ghost",
    color: "#bd84ff",
    hp: BASE_DAMAGE,
    speed: 0.092,
    score: 140,
    phasingHits: 2,
    description: "Lets the first two hits pass through.",
  },
  regen: {
    id: "regen",
    name: "Regen",
    color: "#48d39b",
    hp: BASE_DAMAGE * 3,
    speed: 0.064,
    score: 150,
    healPerBeat: BASE_DAMAGE * 0.65,
    description: "Heals when left untouched for a beat.",
  },
  barrier: {
    id: "barrier",
    name: "Barrier",
    color: "#58a9ff",
    hp: BASE_DAMAGE * 2.75,
    speed: 0.048,
    score: 190,
    interceptsPerBeat: 1,
    description: "Transfers damage on its lane to itself",
  },
  leap: {
    id: "leap",
    name: "Leap",
    color: "#c8a174",
    hp: BASE_DAMAGE * 2.75,
    speed: 0.074,
    score: 170,
    description: "Vaults past the leading enemy before it can be targeted.",
  },
};

export const SPECIAL_ENEMY_POOL = ["cheer", "ghost", "regen", "barrier", "leap"];

export function getEnemyDef(id) {
  return ENEMY_DEFS[id];
}
