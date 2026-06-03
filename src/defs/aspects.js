import { ENEMY_DEFS } from "./enemies.js";

export const ASPECT_DEFS = {
  joy: {
    id: "joy",
    source: "cheer",
    name: "Joy",
    color: ENEMY_DEFS.cheer.color,
    speedBoost: 1.3,
    spreadDescription: "boost the enemy directly ahead",
  },
  gloom: {
    id: "gloom",
    source: "ghost",
    name: "Gloom",
    color: ENEMY_DEFS.ghost.color,
    firstHitDamageMultiplier: 0.5,
    spreadDescription: "take half damage from their first hit",
  },
  vigor: {
    id: "vigor",
    source: "regen",
    name: "Vigor",
    color: ENEMY_DEFS.regen.color,
    healFraction: 1 / 3,
    spreadDescription: "heal once after a beat without damage",
  },
  hero: {
    id: "hero",
    source: "barrier",
    name: "Resolve",
    color: ENEMY_DEFS.barrier.color,
    interceptFraction: 0.2,
    spreadDescription: "absorb part of lane damage",
  },
  embrace: {
    id: "embrace",
    source: "leap",
    name: "Dexterity",
    color: ENEMY_DEFS.leap.color,
    forwardBoost: 0.12,
    spreadDescription: "lunge forward",
  },
};

export const ASPECT_BY_SOURCE = Object.fromEntries(
  Object.values(ASPECT_DEFS).map((aspect) => [aspect.source, aspect]),
);

export function getAspectDef(aspectId) {
  return ASPECT_DEFS[aspectId] ?? null;
}

export function getAspectForSource(sourceType) {
  return ASPECT_BY_SOURCE[sourceType] ?? null;
}
