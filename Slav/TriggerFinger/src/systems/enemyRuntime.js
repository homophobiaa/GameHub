import { getAspectDef, getAspectForSource } from "../defs/aspects.js";
import { getEnemyDef } from "../defs/enemies.js";
import { clamp } from "../utils/math.js";
import { pickRandom } from "../utils/random.js";

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
  const candidates = enemies.filter((enemy) =>
    enemy.type === "basic" &&
    enemy.hp > 0 &&
    !enemy.aspect
  );

  return pickRandom(candidates, count).filter((enemy) => applyAspectToBasic(enemy, sourceType));
}

export function findLeapRetarget(enemy, enemies, previousTargetY) {
  return enemies
    .filter((candidate) =>
      candidate.id !== enemy.id &&
      candidate.hp > 0 &&
      candidate.targetable !== false &&
      candidate.type !== "leap" &&
      candidate.lane === enemy.lane &&
      candidate.y < previousTargetY
    )
    .sort((a, b) => b.y - a.y)[0] ?? null;
}

export function updateLeapEnemy(enemy, enemies, beat) {
  const leap = enemy.leap;
  const target = enemies.find((candidate) => candidate.id === leap.targetId);

  if (target?.hp > 0) {
    leap.targetY = target.y;
    leap.destinationY = null;
    leap.retargetedAfterDeath = false;
  } else if (!leap.retargetedAfterDeath) {
    const lastTargetY = target?.y ?? leap.targetY;
    if (Number.isFinite(lastTargetY)) {
      leap.targetY = lastTargetY;
    }

    if ((leap.targetY ?? 0) >= 0.5) {
      const nextTarget = findLeapRetarget(enemy, enemies, leap.targetY);
      if (nextTarget) {
        leap.targetId = nextTarget.id;
        leap.targetY = nextTarget.y;
        leap.destinationY = null;
        leap.retargetedAfterDeath = false;
      } else {
        leap.destinationY = 0.5;
        leap.retargetedAfterDeath = true;
      }
    }
  }

  const destinationY = Number.isFinite(leap.destinationY)
    ? leap.destinationY
    : clamp((leap.targetY ?? 0.35) + 0.07, 0.12, 0.88);
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
  const boosts = [];

  for (let lane = 0; lane < 3; lane += 1) {
    const front = enemies
      .filter((enemy) => enemy.lane === lane && enemy.hp > 0)
      .sort((a, b) => b.y - a.y)[0];
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
  const multipliers = new Map();
  const joyBasics = enemies.filter((enemy) => enemy.type === "basic" && enemy.aspect === "joy" && enemy.hp > 0);

  joyBasics.forEach((joy) => {
    const aspect = getAspectDef("joy");
    const target = enemies
      .filter((enemy) =>
        enemy.id !== joy.id &&
        enemy.hp > 0 &&
        enemy.targetable !== false &&
        enemy.lane === joy.lane &&
        enemy.y > joy.y
      )
      .sort((a, b) => a.y - b.y)[0];

    if (target) {
      multipliers.set(target.id, Math.max(multipliers.get(target.id) ?? 1, aspect.speedBoost));
    }
  });

  return multipliers;
}
