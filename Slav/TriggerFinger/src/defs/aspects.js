import { ENEMY_DEFS } from "./enemies.js";

export const ASPECT_DEFS = {
  joy: {
    id: "joy",
    source: "cheer",
    name: "Joy",
    color: ENEMY_DEFS.cheer.color,
    speedBoost: 1.3,
  },
  gloom: {
    id: "gloom",
    source: "ghost",
    name: "Gloom",
    color: ENEMY_DEFS.ghost.color,
    fullHealthDamageMultiplier: 0.3,
  },
  vigor: {
    id: "vigor",
    source: "regen",
    name: "Vigor",
    color: ENEMY_DEFS.regen.color,
    healFraction: 1 / 3,
  },
  hero: {
    id: "hero",
    source: "barrier",
    name: "Resolve",
    color: ENEMY_DEFS.barrier.color,
    interceptFraction: 0.2,
  },
  embrace: {
    id: "embrace",
    source: "leap",
    name: "Dexterity",
    color: ENEMY_DEFS.leap.color,
    forwardBoost: 0.12,
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
