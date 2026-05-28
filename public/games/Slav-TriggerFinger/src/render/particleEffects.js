import { clamp } from "../utils/math.js";

export function drawDeathPuffParticles(ctx, {
  x,
  y,
  radius,
  progress,
  color,
  seed = 0,
}) {
  const particleCount = 12;
  const fade = 1 - clamp(progress, 0, 1);
  const easedProgress = 1 - (1 - progress) * (1 - progress);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = color;
  ctx.shadowBlur = 0;

  for (let i = 0; i < particleCount; i += 1) {
    const angleSeed = seed * 0.097 + i * 0.618;
    const angle = angleSeed * Math.PI * 2;
    const speed = radius * (0.65 + (i % 5) * 0.18);
    const startDistance = radius * (0.24 + (i % 3) * 0.12);
    const distance = startDistance + speed * easedProgress;
    const drift = Math.sin(progress * Math.PI + i * 1.7) * radius * 0.14;
    const particleX = x + Math.cos(angle) * distance + Math.cos(angle + Math.PI / 2) * drift;
    const particleY = y + Math.sin(angle) * distance + Math.sin(angle * 1.3) * radius * 0.12 * progress;
    const particleRadius = radius * (0.08 + ((i * 7) % 5) * 0.014) * (1 - progress * 0.45);
    const alpha = fade * (0.36 + (i % 4) * 0.06);

    ctx.globalAlpha = alpha * 0.78;
    ctx.fillStyle = "#080b0f";
    ctx.beginPath();
    ctx.arc(particleX, particleY, particleRadius + 1.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(particleX, particleY, particleRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawPhaseBurstParticles(ctx, { x, y, progress }) {
  const spread = 0.16 + progress * 0.84;
  const coneWidth = Math.PI / 6;

  for (let i = 0; i < 12; i += 1) {
    const lift = (28 + i * 8) * spread;
    const fanPosition = ((i % 6) / 5) * 2 - 1;
    const drift = fanPosition * lift * Math.tan(coneWidth / 2);
    const particleX = x + drift;
    const particleY = y - lift + Math.sin(spread * Math.PI + i) * 2;
    const radius = 1.4 + (i % 3) * 0.45;

    ctx.globalAlpha = (1 - progress) * 0.46;
    ctx.fillStyle = "#16101f";
    ctx.beginPath();
    ctx.arc(particleX, particleY, radius + 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = (1 - progress) * (0.56 + (i % 4) * 0.05);
    ctx.fillStyle = "#f2eaff";
    ctx.beginPath();
    ctx.arc(particleX, particleY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPoisonParticles(ctx, {
  x,
  y,
  radius,
  beat,
  enemyId = 0,
  intensity = 0.2,
  color = "#38f58b",
}) {
  const particleCount = 8;
  const clampedIntensity = clamp(intensity, 0, 1);

  ctx.save();

  for (let i = 0; i < particleCount; i += 1) {
    const seed = enemyId * 0.137 + i * 0.271;
    const cycle = (beat * 0.58 + seed) % 1;
    const angle = seed * Math.PI * 2 + Math.sin(beat * 0.7 + i) * 0.55;
    const particleRadius = radius * (0.28 + cycle * 0.34);
    const distance = radius * (1.18 + cycle * 2.05) + particleRadius * 0.35;
    const wobble = Math.sin(beat * 1.9 + i * 2.1) * radius * 0.2;
    const particleX = x + Math.cos(angle) * (distance + wobble);
    const particleY = y + Math.sin(angle) * distance - cycle * radius * 0.62;
    const alpha = (1 - cycle) * clampedIntensity * 0.34;

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = "#03150a";
    ctx.shadowBlur = 0;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(particleX, particleY, particleRadius + 1.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(particleX, particleY, particleRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
