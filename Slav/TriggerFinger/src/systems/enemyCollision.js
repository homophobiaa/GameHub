import { LANES, MIN_ENEMY_Y } from "../config/gameplay.js";
import { clamp } from "../utils/math.js";

const ENEMY_COLLISION_RADII = {
  barrier: 0.043,
  leap: 0.039,
  default: 0.036,
};

const LANE_BACKSTOP_Y = 0.02;
const KNOCKBACK_TRANSFER_FRACTION = 0.78;
const KNOCKBACK_TRANSFER_MINIMUM = 0.018;
const KNOCKBACK_MIN_SPEED_PER_SECOND = 0.32;
const KNOCKBACK_EASE_FRACTION = 0.34;
const KNOCKBACK_MAX_STEP = 0.064;
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

function moveEnemyY(enemy, y, { snapVisual = false } = {}) {
  if (!Number.isFinite(y) || Math.abs(enemy.y - y) <= KNOCKBACK_EPSILON) {
    return;
  }

  enemy.y = y;
  if (snapVisual) {
    enemy.snapVisualY = true;
  }
}

function resolveBackstopPressure(stack) {
  const backIndex = stack.length - 1;
  const back = stack[backIndex];
  if (!back || back.y >= LANE_BACKSTOP_Y) {
    return;
  }

  moveEnemyY(back, LANE_BACKSTOP_Y);
  let pusher = back;

  for (let index = backIndex - 1; index >= 0; index -= 1) {
    const current = stack[index];
    const minY = pusher.y + minSpacing(current, pusher);
    if (current.y >= minY - KNOCKBACK_EPSILON) {
      break;
    }

    moveEnemyY(current, minY);
    pusher = current;
  }
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
        moveEnemyY(current, maxY);
      }
    }

    resolveBackstopPressure(stack);
  }
}

function knockbackStep(enemy, dt) {
  return Math.min(
    enemy.knockbackRemaining,
    Math.max(KNOCKBACK_MIN_SPEED_PER_SECOND * dt, enemy.knockbackRemaining * KNOCKBACK_EASE_FRACTION),
    KNOCKBACK_MAX_STEP,
  );
}

export function updateEnemyKnockbacks(enemies, dt) {
  if (!Number.isFinite(dt) || dt <= 0) {
    return false;
  }

  const active = enemies
    .filter((enemy) =>
      collisionBlocks(enemy) &&
      (enemy.knockbackRemaining ?? 0) > KNOCKBACK_EPSILON
    )
    .sort((a, b) => b.y - a.y);

  if (active.length === 0) {
    return false;
  }

  active.forEach((enemy) => {
    if ((enemy.knockbackRemaining ?? 0) <= KNOCKBACK_EPSILON) {
      clearKnockback(enemy);
      return;
    }

    const step = knockbackStep(enemy, dt);
    const behind = findEnemyBehind(enemies, enemy);
    const collisionY = behind ? behind.y + minSpacing(enemy, behind) : LANE_BACKSTOP_Y;
    const targetY = clamp(enemy.y - step, LANE_BACKSTOP_Y, 0.98);

    if (targetY <= collisionY + KNOCKBACK_EPSILON) {
      const allowedStep = Math.max(0, enemy.y - collisionY);
      const blockedStep = Math.max(0, step - allowedStep);
      moveEnemyY(enemy, Math.max(collisionY, LANE_BACKSTOP_Y), { snapVisual: true });
      enemy.knockbackRemaining = Math.max(0, enemy.knockbackRemaining - step);

      if (behind && blockedStep > KNOCKBACK_EPSILON) {
        queueEnemyKnockback(
          behind,
          Math.max(blockedStep * KNOCKBACK_TRANSFER_FRACTION, KNOCKBACK_TRANSFER_MINIMUM),
        );
      }
    } else {
      moveEnemyY(enemy, targetY, { snapVisual: true });
      enemy.knockbackRemaining = Math.max(0, enemy.knockbackRemaining - step);
    }

    if (enemy.y <= LANE_BACKSTOP_Y + KNOCKBACK_EPSILON) {
      clearKnockback(enemy);
    } else if (enemy.knockbackRemaining <= KNOCKBACK_EPSILON) {
      clearKnockback(enemy);
    }
  });

  resolveEnemyLaneSpacing(enemies);
  return true;
}
