import { getAspectDef, getAspectForSource } from "../defs/aspects.js";
import { getEnemyDef } from "../defs/enemies.js";
import {
  LANES,
  LEAP_FALLBACK_TARGET_Y,
  LEAP_LANDING_OFFSET,
  LEAP_MAX_LANDING_Y,
  LEAP_MIN_TARGET_Y,
} from "../config/gameplay.js";
import { clamp } from "../utils/math.js";
import { pickRandom } from "../utils/random.js";
import { isTargetable, toEnemyFrameIndex } from "./enemyFrameIndex.js";

function nextWholeBeatAfter(beat) {
  return Math.floor(beat) + 1;
}

function pushHealEffect(enemy, color, effects, floaters) {
  effects.push({
    kind: "ring",
    lane: enemy.lane,
    y: enemy.visualY ?? enemy.y,
    color,
    radius: 24,
    growth: 44,
    ttl: 0.42,
    duration: 0.42,
  });
  floaters.push({
    lane: enemy.lane,
    y: enemy.y,
    text: "+",
    color,
    ttl: 0.55,
  });
}

function healEnemy(enemy, amount, color, effects, floaters) {
  const nextHp = Math.min(enemy.maxHp, enemy.hp + amount);
  if (nextHp <= enemy.hp) {
    return false;
  }

  enemy.hp = nextHp;
  pushHealEffect(enemy, color, effects, floaters);
  return true;
}

export function applyEnemyBeatEffects({ enemies, fromBeat, toBeat, effects, floaters }) {
  for (let beat = fromBeat + 1; beat <= toBeat; beat += 1) {
    enemies.forEach((enemy) => {
      if (enemy.hp <= 0) {
        return;
      }

      const def = getEnemyDef(enemy.type);
      if (def.healPerBeat && enemy.lastDamagedBeat < beat - 1) {
        healEnemy(enemy, def.healPerBeat, def.color, effects, floaters);
      }

      const aspect = getAspectDef(enemy.aspect);
      if (
        aspect?.id === "vigor" &&
        !enemy.aspectVigorUsed &&
        enemy.lastDamagedBeat < beat - 1 &&
        healEnemy(enemy, enemy.maxHp * aspect.healFraction, aspect.color, effects, floaters)
      ) {
        enemy.aspectVigorUsed = true;
      }
    });
  }
}

export function applyAspectToBasic(enemy, sourceType) {
  const aspect = getAspectForSource(sourceType);
  if (!aspect || !enemy || enemy.type !== "basic" || enemy.hp <= 0 || enemy.aspect) {
    return false;
  }

  enemy.aspect = aspect.id;
  enemy.aspectSource = sourceType;
  if (aspect.id === "embrace") {
    enemy.y = clamp(enemy.y + aspect.forwardBoost, 0.02, 0.88);
  }

  return true;
}

export function grantAspectToBasics(enemies, sourceType, count = 4) {
  return pickAspectSpreadTargets(enemies, count).filter((enemy) => applyAspectToBasic(enemy, sourceType));
}

export function pickAspectSpreadTargets(enemies, count = 4) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const candidates = enemyIndex.enemies.filter((enemy) =>
    enemy.type === "basic" &&
    enemy.hp > 0 &&
    !enemy.aspect
  );

  return pickRandom(candidates, count);
}

export function findLeapRetarget(enemy, enemies) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const candidates = enemyIndex
    .targetableInLane(enemy.lane)
    .filter((candidate) =>
      candidate.id !== enemy.id &&
      candidate.type !== "leap" &&
      candidate.y >= LEAP_MIN_TARGET_Y
    );
  return candidates[0] ?? null;
}

function readjustLeapArc(enemy, beat) {
  const leap = enemy.leap;
  leap.startY = enemy.y;
  leap.startBeat = beat;
  leap.landBeat = nextWholeBeatAfter(Math.max(beat, leap.landBeat));
  leap.arcSide *= -1;
}

function setLeapTarget(enemy, target, beat) {
  const leap = enemy.leap;
  const previousTargetId = leap.targetId;
  leap.targetId = target.id;
  leap.targetY = target.y;
  leap.destinationY = null;

  if (previousTargetId !== target.id) {
    readjustLeapArc(enemy, beat);
  }
}

function setLeapFallback(enemy, beat) {
  const leap = enemy.leap;
  if (leap.targetId === null && leap.destinationY === LEAP_FALLBACK_TARGET_Y) {
    return;
  }

  leap.targetId = null;
  leap.targetY = LEAP_FALLBACK_TARGET_Y;
  leap.destinationY = LEAP_FALLBACK_TARGET_Y;
  readjustLeapArc(enemy, beat);
}

export function updateLeapEnemy(enemy, enemies, beat) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const leap = enemy.leap;
  const target = enemyIndex.findById(leap.targetId);

  if (target?.hp > 0) {
    if (target.y < LEAP_MIN_TARGET_Y) {
      setLeapFallback(enemy, beat);
    } else {
      leap.targetY = target.y;
      leap.destinationY = null;
    }
  } else if (leap.targetId !== null) {
    const lastTargetY = target?.y ?? leap.targetY;
    if (Number.isFinite(lastTargetY)) {
      leap.targetY = lastTargetY;
    }

    const nextTarget = findLeapRetarget(enemy, enemyIndex);
    if (nextTarget) {
      setLeapTarget(enemy, nextTarget, beat);
    } else {
      setLeapFallback(enemy, beat);
    }
  }

  const destinationY = Number.isFinite(leap.destinationY)
    ? leap.destinationY
    : clamp((leap.targetY ?? LEAP_MIN_TARGET_Y) + LEAP_LANDING_OFFSET, LEAP_MIN_TARGET_Y, LEAP_MAX_LANDING_Y);
  const progress = clamp(
    (beat - leap.startBeat) / Math.max(0.001, leap.landBeat - leap.startBeat),
    0,
    1,
  );
  const eased = progress * (2 - progress);

  enemy.y = leap.startY + (destinationY - leap.startY) * eased;
  enemy.visualY = enemy.y;
  enemy.visualLaneOffset = Math.sin(progress * Math.PI) * 0.14 * leap.arcSide;

  if (progress >= 1) {
    enemy.y = destinationY;
    enemy.visualY = destinationY;
    enemy.visualLaneOffset = 0;
    enemy.targetable = true;
    delete enemy.leap;
  }
}

export function getLaneSpeedBoosts(enemies) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const boosts = [];

  for (const lane of LANES) {
    const front = enemyIndex.frontLiveInLane(lane);
    const def = front ? getEnemyDef(front.type) : null;

    if (def?.laneSpeedBoost) {
      boosts.push({
        lane,
        amount: def.laneSpeedBoost,
        color: def.color,
      });
    }
  }

  return boosts;
}

export function getEnemySpeedMultipliers(enemies) {
  const enemyIndex = toEnemyFrameIndex(enemies);
  const multipliers = new Map();
  const joyBasics = enemyIndex.enemies.filter((enemy) =>
    enemy.type === "basic" &&
    enemy.aspect === "joy" &&
    enemy.hp > 0
  );

  joyBasics.forEach((joy) => {
    const aspect = getAspectDef("joy");
    const target = enemyIndex.closestAheadInLane(joy.lane, joy.y, joy.id);

    if (target && isTargetable(target)) {
      multipliers.set(target.id, Math.max(multipliers.get(target.id) ?? 1, aspect.speedBoost));
    }
  });

  return multipliers;
}
