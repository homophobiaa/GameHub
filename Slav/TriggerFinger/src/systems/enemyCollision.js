import { LANES, MIN_ENEMY_Y } from "../config/gameplay.js";
import { clamp } from "../utils/math.js";

const ENEMY_COLLISION_RADII = {
  barrier: 0.057,
  leap: 0.051,
  default: 0.048,
};

const LANE_BACKSTOP_Y = 0.02;
const KNOCKBACK_TRANSFER_FRACTION = 0.55;
const KNOCKBACK_SPEED_PER_SECOND = 1.25;
const KNOCKBACK_MAX_STEP = 0.028;
const KNOCKBACK_EPSILON = 0.0005;

function collisionRadius(enemy) {
  return ENEMY_COLLISION_RADII[enemy?.type] ?? ENEMY_COLLISION_RADII.default;
}

function minSpacing(a, b) {
  return collisionRadius(a) + collisionRadius(b);
}

function collisionBlocks(enemy) {
  return enemy?.hp > 0 && enemy.targetable !== false;
}

function laneEnemies(enemies, lane) {
  return enemies
    .filter((enemy) => enemy.lane === lane && collisionBlocks(enemy))
    .sort((a, b) => b.y - a.y);
}

function findEnemyBehind(enemies, enemy) {
  return laneEnemies(enemies, enemy.lane)
    .filter((candidate) => candidate.id !== enemy.id && candidate.y < enemy.y)
    .reduce((closest, candidate) => {
      if (!closest || candidate.y > closest.y) {
        return candidate;
      }
      return closest;
    }, null);
}

function clearKnockback(enemy) {
  delete enemy.knockbackRemaining;
}

export function queueEnemyKnockback(enemy, amount) {
  if (!enemy || enemy.hp <= 0 || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  enemy.knockbackRemaining = Math.max(enemy.knockbackRemaining ?? 0, 0) + amount;
}

export function placeEnemyAtLaneBack(enemy, enemies) {
  if (!enemy || !Number.isInteger(enemy.lane)) {
    return enemy;
  }

  let y = Number.isFinite(enemy.y) ? enemy.y : MIN_ENEMY_Y;
  laneEnemies(enemies, enemy.lane)
    .sort((a, b) => a.y - b.y)
    .forEach((other) => {
      const spacing = minSpacing(enemy, other);
      if (Math.abs(y - other.y) < spacing) {
        y = other.y - spacing;
      }
    });

  enemy.y = Math.max(LANE_BACKSTOP_Y, y);
  return enemy;
}

export function resolveEnemyLaneSpacing(enemies) {
  for (const lane of LANES) {
    const stack = laneEnemies(enemies, lane);
    for (let index = 1; index < stack.length; index += 1) {
      const front = stack[index - 1];
      const current = stack[index];
      const maxY = front.y - minSpacing(front, current);
      if (current.y > maxY) {
        current.y = maxY;
      }
    }

    const back = stack.at(-1);
    if (!back || back.y >= LANE_BACKSTOP_Y) {
      continue;
    }

    const shift = LANE_BACKSTOP_Y - back.y;
    stack.forEach((enemy) => {
      enemy.y += shift;
    });
  }
}

export function updateEnemyKnockbacks(enemies, dt) {
  if (!Number.isFinite(dt) || dt <= 0) {
    return;
  }

  const active = enemies
    .filter((enemy) =>
      collisionBlocks(enemy) &&
      (enemy.knockbackRemaining ?? 0) > KNOCKBACK_EPSILON
    )
    .sort((a, b) => b.y - a.y);

  active.forEach((enemy) => {
    if ((enemy.knockbackRemaining ?? 0) <= KNOCKBACK_EPSILON) {
      clearKnockback(enemy);
      return;
    }

    const step = Math.min(
      enemy.knockbackRemaining,
      KNOCKBACK_SPEED_PER_SECOND * dt,
      KNOCKBACK_MAX_STEP,
    );
    const behind = findEnemyBehind(enemies, enemy);
    const collisionY = behind ? behind.y + minSpacing(enemy, behind) : LANE_BACKSTOP_Y;
    const targetY = clamp(enemy.y - step, LANE_BACKSTOP_Y, 0.98);

    if (targetY <= collisionY + KNOCKBACK_EPSILON) {
      const allowedStep = Math.max(0, enemy.y - collisionY);
      const blockedStep = Math.max(0, step - allowedStep);
      enemy.y = Math.max(collisionY, LANE_BACKSTOP_Y);
      enemy.knockbackRemaining = Math.max(0, enemy.knockbackRemaining - step);

      if (behind && blockedStep > KNOCKBACK_EPSILON) {
        queueEnemyKnockback(behind, blockedStep * KNOCKBACK_TRANSFER_FRACTION);
      }
    } else {
      enemy.y = targetY;
      enemy.knockbackRemaining = Math.max(0, enemy.knockbackRemaining - step);
    }

    if (enemy.y <= LANE_BACKSTOP_Y + KNOCKBACK_EPSILON) {
      clearKnockback(enemy);
    } else if (enemy.knockbackRemaining <= KNOCKBACK_EPSILON) {
      clearKnockback(enemy);
    }
  });

  resolveEnemyLaneSpacing(enemies);
}
