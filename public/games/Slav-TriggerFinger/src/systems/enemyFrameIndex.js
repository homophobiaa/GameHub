import { LANES, LANE_COUNT } from "../config/gameplay.js";

export { LANES, LANE_COUNT };

export function isTargetable(enemy) {
  return enemy.hp > 0 && enemy.targetable !== false;
}

function byFrontY(a, b) {
  return b.y - a.y;
}

function createLaneBuckets() {
  return Array.from({ length: LANE_COUNT }, () => []);
}

export class EnemyFrameIndex {
  constructor(enemies = []) {
    this.enemies = enemies;
    this.byId = new Map();
    this.live = [];
    this.liveByLane = createLaneBuckets();
    this.frontToBack = [];

    enemies.forEach((enemy) => {
      this.byId.set(enemy.id, enemy);

      if (enemy.hp <= 0) {
        return;
      }

      this.live.push(enemy);
      this.frontToBack.push(enemy);
      this.liveByLane[enemy.lane]?.push(enemy);
    });

    this.frontToBack.sort(byFrontY);
    this.liveByLane.forEach((laneEnemies) => laneEnemies.sort(byFrontY));
  }

  liveEnemies() {
    return this.live.filter((enemy) => enemy.hp > 0);
  }

  liveCount() {
    return this.liveEnemies().length;
  }

  liveCountsByLane() {
    const counts = [0, 0, 0];
    this.live.forEach((enemy) => {
      if (enemy.hp > 0) {
        counts[enemy.lane] += 1;
      }
    });
    return counts;
  }

  liveInLane(lane) {
    return (this.liveByLane[lane] ?? []).filter((enemy) => enemy.hp > 0);
  }

  frontLiveInLane(lane) {
    return (this.liveByLane[lane] ?? []).find((enemy) => enemy.hp > 0) ?? null;
  }

  targetableEnemies() {
    return this.frontToBack.filter(isTargetable);
  }

  targetableInLane(lane) {
    return (this.liveByLane[lane] ?? []).filter(isTargetable);
  }

  elapseTargetsInLane(lane) {
    return this.targetableInLane(lane).filter((enemy) =>
      !(enemy.type === "ghost" && enemy.ghostCharges > 0)
    );
  }

  closestTargetable(count) {
    return this.targetableEnemies().slice(0, count);
  }

  leapTargets() {
    return this.live.filter((enemy) =>
      enemy.hp > 0 &&
      enemy.targetable !== false &&
      enemy.type !== "leap"
    );
  }

  closestToBase(enemies = this.liveEnemies()) {
    let closest = null;
    enemies.forEach((enemy) => {
      if (!closest || enemy.y > closest.y) {
        closest = enemy;
      }
    });
    return closest;
  }

  findById(id) {
    return this.byId.get(id) ?? null;
  }

  findLiveById(id) {
    const enemy = this.findById(id);
    return enemy && isTargetable(enemy) ? enemy : null;
  }

  closestAheadInLane(lane, sourceY, excludedId = null) {
    const laneEnemies = this.liveByLane[lane] ?? [];
    for (let index = laneEnemies.length - 1; index >= 0; index -= 1) {
      const enemy = laneEnemies[index];
      if (
        enemy.id !== excludedId &&
        enemy.y > sourceY &&
        isTargetable(enemy)
      ) {
        return enemy;
      }
    }
    return null;
  }
}

export function createEnemyFrameIndex(enemies = []) {
  return new EnemyFrameIndex(enemies);
}

export function toEnemyFrameIndex(enemies) {
  return enemies instanceof EnemyFrameIndex
    ? enemies
    : createEnemyFrameIndex(enemies);
}
