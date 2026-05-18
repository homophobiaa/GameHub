import { getAspectDef, getAspectForSource } from "../defs/aspects.js";
import { getEnemyDef } from "../defs/enemies.js";
import { ASPECT_SPREAD_TRAIL_ARC_PIXELS, ENEMY_BREACH_Y, LANE_COUNT, LANES } from "../config/gameplay.js";
import { beatPhase } from "../utils/beatMath.js";
import { clamp } from "../utils/math.js";
import { drawComboMeter } from "./comboMeterRenderer.js";
import { easeInOut, mixHex } from "./renderUtils.js";

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = 0;
    this.height = 0;
    this.arena = { x: 0, width: 0 };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * scale));
    this.canvas.height = Math.max(1, Math.floor(rect.height * scale));
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
    this.updateArena();
  }

  updateArena() {
    const width = Math.min(Math.max(320, this.width * 0.74), 560, this.width - 32);
    this.arena = {
      x: (this.width - width) / 2,
      width,
    };
  }

  render({
    enemies,
    effects,
    floaters,
    track,
    beat,
    spawnWarnings = [],
    speedBoosts = [],
    activeBeams = [],
    comboMultiplier = 1,
    comboCap = 1,
  }) {
    if (!this.width || !this.height) {
      return;
    }

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawArena(track, beat);
    drawComboMeter(this, comboMultiplier, comboCap, beat);
    this.drawSpawnWarnings(spawnWarnings, beat);
    this.drawSpeedBoosts(speedBoosts, beat);
    this.drawEffects(effects);
    this.drawActiveBeams(activeBeams, beat);
    this.drawEnemies(enemies, beat);
    this.drawSlashEffects(effects);
    this.drawFloaters(floaters);
  }

  laneCenter(lane) {
    return this.arena.x + ((lane + 0.5) / LANE_COUNT) * this.arena.width;
  }

  laneFromCanvasX(x) {
    if (x < this.arena.x || x > this.arena.x + this.arena.width) {
      return null;
    }

    return clamp(Math.floor(((x - this.arena.x) / this.arena.width) * LANE_COUNT), 0, LANE_COUNT - 1);
  }

  yToScreen(y) {
    return y * (this.height - 72) + 24;
  }

  drawArena(track, beat) {
    const ctx = this.ctx;
    ctx.fillStyle = "#12151b";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#0e1117";
    ctx.fillRect(0, 0, this.arena.x, this.height);
    ctx.fillRect(this.arena.x + this.arena.width, 0, this.arena.x, this.height);

    const laneWidth = this.arena.width / LANE_COUNT;
    for (const lane of LANES) {
      ctx.fillStyle = lane % 2 === 0 ? "#151922" : "#181d26";
      ctx.fillRect(this.arena.x + lane * laneWidth, 0, laneWidth, this.height);
      ctx.strokeStyle = "#2c3442";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.arena.x + lane * laneWidth, 0);
      ctx.lineTo(this.arena.x + lane * laneWidth, this.height);
      ctx.stroke();
    }

    ctx.strokeStyle = "#f3bf4d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.arena.x, this.yToScreen(ENEMY_BREACH_Y));
    ctx.lineTo(this.arena.x + this.arena.width, this.yToScreen(ENEMY_BREACH_Y));
    ctx.stroke();

    const phase = beatPhase(beat);
    const beatPulse = Math.max(0, 1 - phase / 0.24);
    const targetY = this.yToScreen(ENEMY_BREACH_Y);
    ctx.fillStyle = `rgba(243, 191, 77, ${0.1 + beatPulse * 0.26})`;
    ctx.fillRect(
      this.arena.x,
      targetY - 4 - beatPulse * 5,
      this.arena.width,
      8 + beatPulse * 10,
    );

    for (const lane of LANES) {
      const radius = 16 + phase * 26;
      ctx.strokeStyle = `rgba(243, 191, 77, ${0.58 * (1 - phase)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.laneCenter(lane), targetY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    const delta = track.targetBeat - beat;
    const pulse = Math.max(0, 1 - Math.abs(delta) * 2);
    ctx.fillStyle = `rgba(243, 191, 77, ${0.08 + pulse * 0.16})`;
    ctx.fillRect(this.arena.x, this.yToScreen(ENEMY_BREACH_Y) - 18, this.arena.width, 36);
  }

  drawSpawnWarnings(warnings, beat) {
    if (!warnings.length) {
      return;
    }

    const ctx = this.ctx;
    const laneWidth = this.arena.width / LANE_COUNT;
    warnings.forEach((warning) => {
      const strength = clamp(warning.strength, 0, 1);
      const pulse = 0.74 + Math.sin((beat + warning.timeUntil) * Math.PI * 2) * 0.18;
      const x = this.arena.x + warning.lane * laneWidth;
      const width = laneWidth;
      const height = 54 + strength * 72;
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, warning.color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.save();
      ctx.globalAlpha = (0.12 + strength * 0.3) * pulse;
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 2, 0, width - 4, height);

      ctx.globalAlpha = (0.38 + strength * 0.4) * pulse;
      ctx.shadowColor = warning.color;
      ctx.shadowBlur = 18 + strength * 24;
      ctx.lineWidth = 2 + strength * 3;
      ctx.strokeStyle = warning.color;
      ctx.beginPath();
      ctx.moveTo(x + 8, 2);
      ctx.lineTo(x + width - 8, 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  drawSpeedBoosts(boosts, beat) {
    if (!boosts.length) {
      return;
    }

    const ctx = this.ctx;
    const laneWidth = this.arena.width / LANE_COUNT;
    boosts.forEach((boost) => {
      const x = this.arena.x + boost.lane * laneWidth;
      const strength = clamp((boost.amount ?? 1) - 1, 0, 1);
      const alpha = 0.18 + strength * 0.24;
      const color = boost.color ?? "#f3bf4d";

      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 2, 0, laneWidth - 4, this.height);
      ctx.clip();

      const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(0.35, color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalAlpha = alpha * 0.16;
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 2, 0, laneWidth - 4, this.height);

      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      for (let i = 0; i < 14; i += 1) {
        const offset = (beat * 0.9 + i * 0.173) % 1;
        const y = offset * (this.height + 90) - 60;
        const laneOffset = ((i * 37) % 100) / 100;
        const lineX = x + 14 + laneOffset * (laneWidth - 28);
        const length = 26 + ((i * 19) % 22);

        ctx.globalAlpha = alpha * (0.28 + ((i * 11) % 9) / 30);
        ctx.beginPath();
        ctx.moveTo(lineX, y);
        ctx.lineTo(lineX, y + length);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  drawEnemies(enemies, beat) {
    const ctx = this.ctx;
    enemies.forEach((enemy) => {
      const def = getEnemyDef(enemy.type);
      const aspect = getAspectDef(enemy.aspect);
      const grantAspect = getAspectForSource(enemy.aspectGrantor);
      const laneWidth = this.arena.width / LANE_COUNT;
      const x = this.laneCenter(enemy.lane) + (enemy.visualLaneOffset ?? 0) * laneWidth;
      const visualY = enemy.visualY ?? enemy.y;
      const y = this.yToScreen(visualY);
      const radius = enemy.type === "barrier" ? 25 : enemy.type === "leap" ? 23 : 21;
      const fillColor = enemy.type === "basic" && aspect
        ? mixHex(def.color, aspect.color, 0.34)
        : def.color;

      const ghostAlpha = 0.5 + Math.sin((beat * 2.6 + enemy.id * 1.7) * Math.PI) * 0.2;
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = enemy.targetable === false
        ? 0.68
        : enemy.ghostCharges > 0
          ? ghostAlpha
          : 1;
      ctx.beginPath();
      ctx.roundRect(
        x - radius,
        y - radius,
        radius * 2,
        radius * 2,
        enemy.type === "barrier" ? 5 : 16,
      );
      ctx.fill();
      ctx.globalAlpha = 1;

      if (enemy.flashTtl > 0) {
        const duration = Math.max(0.001, enemy.flashDuration ?? 0.18);
        const progress = 1 - clamp(enemy.flashTtl / duration, 0, 1);
        const flashColor = enemy.flashColor ?? "#58a9ff";
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = mixHex(flashColor, "#ffffff", 0.36);
        ctx.strokeStyle = flashColor;
        ctx.shadowColor = flashColor;
        ctx.shadowBlur = 16;
        ctx.globalAlpha = (1 - progress) * 0.62;
        ctx.beginPath();
        ctx.roundRect(
          x - radius - 4,
          y - radius - 4,
          radius * 2 + 8,
          radius * 2 + 8,
          enemy.type === "barrier" ? 7 : 18,
        );
        ctx.fill();
        ctx.globalAlpha = (1 - progress) * 0.9;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      if (grantAspect) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = mixHex(grantAspect.color, "#ffffff", 0.48);
        ctx.shadowColor = grantAspect.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const barWidth = 44;
      const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = "#0b0d12";
      ctx.fillRect(x - barWidth / 2, y + radius + 7, barWidth, 5);
      ctx.fillStyle = hpRatio > 0.45 ? "#48d39b" : "#e65d5d";
      ctx.fillRect(x - barWidth / 2, y + radius + 7, barWidth * hpRatio, 5);

    });

    enemies.forEach((enemy) => {
      if (enemy.leap) {
        this.drawLeapTargetIndicator(enemy, getEnemyDef(enemy.type), beat);
      }
    });
  }

  drawLeapTargetIndicator(enemy, def, beat) {
    const leap = enemy.leap;
    const targetY = Number.isFinite(leap.targetY)
      ? leap.targetY
      : leap.destinationY;
    if (!Number.isFinite(targetY)) {
      return;
    }

    const ctx = this.ctx;
    const x = this.laneCenter(enemy.lane);
    const y = this.yToScreen(targetY);
    const pulse = 0.72 + Math.sin((beat * 4 + enemy.id * 0.37) * Math.PI) * 0.18;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = def.color;
    ctx.fillStyle = def.color;
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.08 + pulse * 0.08;
    ctx.beginPath();
    ctx.arc(x, y, 21 + pulse * 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.34 + pulse * 0.16;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 13, y);
    ctx.lineTo(x + 13, y);
    ctx.moveTo(x, y - 13);
    ctx.lineTo(x, y + 13);
    ctx.stroke();
    ctx.restore();
  }

  drawEffects(effects) {
    const ctx = this.ctx;
    const projectileGroups = new Map();

    effects.forEach((effect) => {
      if (effect.kind === "horizontalBar") {
        const alpha = clamp(effect.ttl / 0.22, 0, 1);
        const y = this.yToScreen(effect.y);
        const halfHeight = effect.radius * (this.height - 72);

        ctx.globalAlpha = alpha * 0.18;
        ctx.fillStyle = effect.color;
        ctx.fillRect(this.arena.x, y - halfHeight, this.arena.width, halfHeight * 2);

        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.arena.x, y);
        ctx.lineTo(this.arena.x + this.arena.width, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        return;
      }

      if (effect.kind === "ring") {
        const progress = 1 - clamp(effect.ttl / effect.duration, 0, 1);
        const radius = effect.radius + progress * effect.growth;
        const y = this.yToScreen(effect.y);
        const x = this.laneCenter(effect.lane);

        ctx.globalAlpha = (1 - progress) * 0.75;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        return;
      }

      if (effect.kind === "phaseBurst") {
        const progress = 1 - clamp(effect.ttl / effect.duration, 0, 1);
        const spread = 0.16 + progress * 0.84;
        const coneWidth = Math.PI / 6;
        const baseX = this.laneCenter(effect.lane);
        const baseY = this.yToScreen(effect.y);

        for (let i = 0; i < 12; i += 1) {
          const lift = (28 + i * 8) * spread;
          const fanPosition = ((i % 6) / 5) * 2 - 1;
          const drift = fanPosition * lift * Math.tan(coneWidth / 2);
          const x = baseX + drift;
          const y = baseY - lift + Math.sin(spread * Math.PI + i) * 2;
          const radius = 1.4 + (i % 3) * 0.45;

          ctx.globalAlpha = (1 - progress) * 0.46;
          ctx.fillStyle = "#16101f";
          ctx.beginPath();
          ctx.arc(x, y, radius + 1.6, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = (1 - progress) * (0.56 + (i % 4) * 0.05);
          ctx.fillStyle = "#f2eaff";
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        return;
      }

      if (effect.kind === "aspectTrail") {
        this.drawAspectTrailEffect(effect);
        return;
      }

      if (effect.kind === "piercingProjectile") {
        this.drawPiercingProjectileEffect(effect);
        return;
      }

      if (effect.kind === "projectile") {
        const group = projectileGroups.get(effect.lane) ?? [];
        group.push(effect);
        projectileGroups.set(effect.lane, group);
      }
    });

    projectileGroups.forEach((projectiles, lane) => {
      projectiles.forEach((effect, index) => {
        const offset = (index - (projectiles.length - 1) / 2) * 11;
        this.drawProjectileEffect(effect, lane, offset);
      });
    });
  }

  drawPiercingProjectileEffect(effect) {
    const path = effect.path ?? [];
    if (path.length === 0) {
      return;
    }

    const ctx = this.ctx;
    const elapsed = effect.duration - effect.ttl;
    const stageDelay = effect.stageDelaySeconds ?? 0;
    const activeStage = stageDelay > 0
      ? Math.floor(elapsed / stageDelay)
      : Infinity;
    const fadeProgress = clamp(
      (elapsed - (effect.revealSeconds ?? 0)) / Math.max(0.001, effect.duration - (effect.revealSeconds ?? 0)),
      0,
      1,
    );
    const alpha = 1 - fadeProgress;
    const x = this.laneCenter(effect.lane);

    ctx.save();
    ctx.strokeStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 10;
    ctx.lineCap = "round";

    for (let index = 0; index < path.length; index += 1) {
      const stageIndex = Number.isFinite(path[index].stageIndex)
        ? path[index].stageIndex
        : index;
      if (stageIndex > activeStage) {
        continue;
      }

      const isSecondary = effect.secondary || path[index].secondary;
      ctx.globalAlpha = alpha * (isSecondary ? 0.46 : 1);
      ctx.lineWidth = effect.width ?? (isSecondary ? 4 : 8);
      const fromY = index === 0 ? ENEMY_BREACH_Y : path[index - 1].y;
      const toY = path[index].y;
      ctx.beginPath();
      ctx.moveTo(x, this.yToScreen(fromY));
      ctx.lineTo(x, this.yToScreen(toY));
      ctx.stroke();
    }

    ctx.restore();
  }

  drawAspectTrailEffect(effect) {
    const ctx = this.ctx;
    const progress = 1 - clamp(effect.ttl / effect.duration, 0, 1);
    const headT = easeInOut(progress);
    const tailT = easeInOut(Math.max(0, progress - 0.18));
    const sourceX = this.laneCenter(effect.sourceLane);
    const sourceY = this.yToScreen(effect.sourceY);
    const targetX = this.laneCenter(effect.targetLane);
    const targetY = this.yToScreen(effect.targetY);
    const controlX = (sourceX + targetX) / 2;
    const controlY = Math.min(sourceY, targetY) - ASPECT_SPREAD_TRAIL_ARC_PIXELS - Math.abs(targetX - sourceX) * 0.08;
    const pointAt = (t) => {
      const inverse = 1 - t;
      return {
        x: inverse * inverse * sourceX + 2 * inverse * t * controlX + t * t * targetX,
        y: inverse * inverse * sourceY + 2 * inverse * t * controlY + t * t * targetY,
      };
    };
    const head = pointAt(headT);
    const tail = pointAt(tailT);
    const alpha = 0.28 + Math.sin(progress * Math.PI) * 0.46;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = effect.color;
    ctx.fillStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 10;
    ctx.globalAlpha = alpha * 0.62;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.quadraticCurveTo(controlX, controlY, head.x, head.y);
    ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawProjectileEffect(effect, lane, xOffset = 0) {
    const ctx = this.ctx;
    const x = this.laneCenter(lane) + xOffset;
    const alpha = clamp(effect.ttl / 0.25, 0, 1);
    ctx.strokeStyle = effect.color;
    ctx.globalAlpha = effect.secondary ? alpha * 0.55 : alpha;
    ctx.lineWidth = effect.width ?? (effect.secondary ? 5 : 8);
    ctx.beginPath();
    ctx.moveTo(x, this.yToScreen(ENEMY_BREACH_Y));
    ctx.lineTo(x, this.yToScreen(effect.endY ?? 0.04));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawActiveBeams(beams, beat) {
    if (!beams.length) {
      return;
    }

    const ctx = this.ctx;
    beams.forEach((beam) => {
      const x = this.laneCenter(beam.lane);
      const startY = this.yToScreen(ENEMY_BREACH_Y);
      const endY = this.yToScreen(beam.targetY ?? 0.04);
      const pulse = 0.72 + Math.sin(beat * Math.PI * 4) * 0.18;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = beam.color;
      ctx.shadowColor = beam.color;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.34 * pulse;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();

      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
      ctx.restore();
    });
  }

  drawSlashEffects(effects) {
    const ctx = this.ctx;
    effects.forEach((effect) => {
      if (effect.kind !== "slash") {
        return;
      }

      const duration = effect.duration ?? 0.2;
      const progress = 1 - clamp(effect.ttl / duration, 0, 1);
      const alpha = 1 - progress;
      const x = this.laneCenter(effect.lane);
      const y = this.yToScreen(effect.y);
      const length = 76 + progress * 28;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(effect.rotation ?? 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 12;
      ctx.globalAlpha = alpha * 0.35;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-length / 2, 0);
      ctx.lineTo(length / 2, 0);
      ctx.stroke();

      ctx.shadowBlur = 4;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-length / 2, 0);
      ctx.lineTo(length / 2, 0);
      ctx.stroke();
      ctx.restore();
    });
  }

  drawFloaters(floaters) {
    const ctx = this.ctx;
    floaters.forEach((floater) => {
      ctx.fillStyle = floater.color;
      ctx.globalAlpha = clamp(floater.ttl / 0.45, 0, 1);
      ctx.font = "800 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(floater.text, this.laneCenter(floater.lane), this.yToScreen(floater.y));
      ctx.globalAlpha = 1;
    });
  }
}
