import { clamp } from "../utils/math.js";

export const MAX_COMBO_CAP = 3;

export function rateTiming(delta) {
  if (!Number.isFinite(delta)) {
    return {
      label: "late",
      color: "#e65d5d",
      damageFactor: 0.4,
      comboDelta: -0.14,
      score: 0,
    };
  }

  const abs = Math.abs(delta);

  if (abs <= 0.08) {
    return {
      label: "perfect",
      color: "#f3bf4d",
      damageFactor: 1.08,
      comboDelta: 0.08,
      score: 25,
    };
  }

  if (abs <= 0.18) {
    return {
      label: "good",
      color: "#48d39b",
      damageFactor: 1,
      comboDelta: 0.05,
      score: 12,
    };
  }

  if (delta < -0.18) {
    const severe = delta < -0.5;
    return {
      label: severe ? "early!" : "early",
      color: "#58a9ff",
      damageFactor: severe ? 0.55 : 0.74,
      comboDelta: severe ? -0.15 : -0.09,
      score: 0,
    };
  }

  const heldBeats = Math.max(1, Math.floor(delta + 0.5));
  return {
    label: heldBeats > 1 ? "held" : "late",
    color: "#e65d5d",
    damageFactor: Math.max(0.4, 1 - heldBeats * 0.16),
    comboDelta: -0.07 * heldBeats,
    score: 0,
  };
}

export function getComboCap(context = {}) {
  const rawCap = context.comboCap ?? context.runState?.comboCap ?? 1.5;
  return Number.isFinite(rawCap) ? clamp(rawCap, 1, MAX_COMBO_CAP) : 1.5;
}

export function getDamageMultiplier(combo, context = {}) {
  const cap = getComboCap(context);
  const safeCombo = Number.isFinite(combo) ? combo : 0;
  return 1 + clamp(safeCombo, 0, 1) * (cap - 1);
}
