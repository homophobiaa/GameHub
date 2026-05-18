import {
  DOT_FLOATER_SECONDS,
  HIT_FLOATER_SECONDS,
  HORIZONTAL_BAR_SECONDS,
  PHASE_BURST_SECONDS,
  PROJECTILE_SECONDS,
  SECONDARY_PROJECTILE_SECONDS,
  SLASH_SECONDS,
} from "../config/gameplay.js";

function findVisualEnemy(enemies, event) {
  if (Number.isFinite(event.targetId)) {
    return enemies.find((enemy) => enemy.id === event.targetId) ?? null;
  }

  return enemies.find((enemy) =>
    enemy.lane === event.lane &&
    Math.abs(enemy.y - event.y) < 0.001
  ) ?? null;
}

function addProjectile({ event, effects }) {
  effects.push({
    kind: "projectile",
    lane: event.lane,
    color: event.color,
    ttl: event.secondary ? SECONDARY_PROJECTILE_SECONDS : PROJECTILE_SECONDS,
    secondary: event.secondary,
    endY: event.endY ?? 0.04,
    width: event.width,
  });
}

function maxPiercingStageIndex(path = []) {
  return path.reduce((maxStage, point, index) => Math.max(
    maxStage,
    Number.isFinite(point.stageIndex) ? point.stageIndex : index,
  ), 0);
}

function addPiercingProjectile({ event, effects }) {
  const stageDelaySeconds = Math.max(0, event.stageDelaySeconds ?? 0);
  const revealSeconds = stageDelaySeconds * maxPiercingStageIndex(event.path);
  effects.push({
    kind: "piercingProjectile",
    lane: event.lane,
    color: event.color,
    ttl: revealSeconds + PROJECTILE_SECONDS,
    duration: revealSeconds + PROJECTILE_SECONDS,
    revealSeconds,
    stageDelaySeconds,
    path: event.path ?? [],
    secondary: event.secondary,
    width: event.width,
  });
}

function addHorizontalBar({ event, effects }) {
  effects.push({
    kind: "horizontalBar",
    color: event.color,
    y: event.y,
    radius: event.radius,
    ttl: HORIZONTAL_BAR_SECONDS,
  });
}

function addImpactRadius({ event, effects }) {
  effects.push({
    kind: "impactRadius",
    lane: event.lane,
    y: event.y,
    color: event.color,
    radius: event.radius,
    ttl: HORIZONTAL_BAR_SECONDS,
  });
}

function addPhaseBurst({ event, effects }) {
  effects.push({
    kind: "phaseBurst",
    lane: event.lane,
    y: event.y,
    color: event.color,
    ttl: PHASE_BURST_SECONDS,
    duration: PHASE_BURST_SECONDS,
  });
}

function addSlash({ event, enemies, effects }) {
  const visualEnemy = findVisualEnemy(enemies, event);
  effects.push({
    kind: "slash",
    lane: event.lane,
    y: visualEnemy?.visualY ?? event.y,
    rotation: event.rotation,
    color: event.color,
    ttl: SLASH_SECONDS,
    duration: SLASH_SECONDS,
  });
}

function addHitFloater({ event, label, enemies, floaters }) {
  const visualEnemy = findVisualEnemy(enemies, event);
  floaters.push({
    lane: event.lane,
    y: visualEnemy?.visualY ?? event.y,
    text: event.text,
    color: event.color,
    ttl: label === "dot" ? DOT_FLOATER_SECONDS : HIT_FLOATER_SECONDS,
  });
}

function addGuardEffects({ event, enemies, effects }) {
  const protectedEnemy = findVisualEnemy(enemies, event);
  if (protectedEnemy) {
    protectedEnemy.flashColor = event.color;
    protectedEnemy.flashTtl = 0.18;
    protectedEnemy.flashDuration = 0.18;
  }

  const barrierEnemy = findVisualEnemy(enemies, {
    targetId: event.barrierId,
    lane: event.barrierLane ?? event.lane,
    y: event.barrierY ?? event.y,
  });
  effects.push({
    kind: "ring",
    lane: barrierEnemy?.lane ?? event.barrierLane ?? event.lane,
    y: barrierEnemy?.visualY ?? barrierEnemy?.y ?? event.barrierY ?? event.y,
    color: event.color,
    radius: 24,
    growth: 44,
    ttl: 0.42,
    duration: 0.42,
  });
}

function addUnhandledEventFloater({ event, floaters }) {
  console.warn("Unhandled combat event", event);
  floaters.push({
    lane: Number.isInteger(event.lane) ? event.lane : 1,
    y: Number.isFinite(event.y) ? event.y : 0.82,
    text: "event?",
    color: "#e65d5d",
    ttl: HIT_FLOATER_SECONDS,
  });
}

const COMBAT_EVENT_VIEW_HANDLERS = {
  projectile: addProjectile,
  piercingProjectile: addPiercingProjectile,
  horizontalBar: addHorizontalBar,
  impactRadius: addImpactRadius,
  phase: addPhaseBurst,
  slash: addSlash,
  hit: addHitFloater,
  guard: addGuardEffects,
};

export function appendCombatEvents({ events, label, enemies, effects, floaters }) {
  events.forEach((event) => {
    const handler = COMBAT_EVENT_VIEW_HANDLERS[event.kind] ?? addUnhandledEventFloater;
    handler({ event, label, enemies, effects, floaters });
  });
}
