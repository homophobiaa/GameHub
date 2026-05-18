import { COMBO_METER } from "../config/comboMeter.js";
import { ENEMY_BREACH_Y } from "../config/gameplay.js";
import { beatPhase } from "../utils/beatMath.js";
import { clamp } from "../utils/math.js";

function pulseSinceBeat(phase, anchor, strength) {
  const { attackBeats, decayBeats, attackCurve, decayCurve } = COMBO_METER.visualizer;
  const elapsed = phase >= anchor ? phase - anchor : phase + 1 - anchor;
  if (elapsed > attackBeats + decayBeats) {
    return 0;
  }

  if (elapsed < attackBeats) {
    const attackProgress = elapsed / attackBeats;
    return strength * (1 - (1 - attackProgress) ** attackCurve);
  }

  const decayProgress = (elapsed - attackBeats) / decayBeats;
  return strength * (1 - decayProgress) ** decayCurve;
}

function getComboVisualizerPulse(beat) {
  const { beatStrength, offbeatStrength, offbeatAnchor } = COMBO_METER.visualizer;
  const phase = beatPhase(beat);
  return Math.max(
    pulseSinceBeat(phase, 0, beatStrength),
    pulseSinceBeat(phase, offbeatAnchor, offbeatStrength),
  );
}

function drawComboBar(
  ctx,
  x,
  topY,
  bottomY,
  playHeight,
  barWidth,
  fillWidth,
  capSegment,
  comboSegment,
  visualizerSegment,
) {
  const capHeight = playHeight * capSegment;
  const capTop = bottomY - capHeight;
  const fillHeight = playHeight * comboSegment;
  const fillTop = bottomY - fillHeight;
  const fillX = x + (barWidth - fillWidth) / 2;
  const visualizerWidth = Math.min(barWidth, fillWidth + COMBO_METER.visualizerWidthBonus);
  const visualizerHeight = playHeight * visualizerSegment;
  const visualizerTop = bottomY - visualizerHeight;
  const visualizerX = x + (barWidth - visualizerWidth) / 2;

  ctx.save();

  const capGradient = ctx.createLinearGradient(0, capTop, 0, bottomY);
  capGradient.addColorStop(0, "#6b4a13");
  capGradient.addColorStop(0.48, "#3b260b");
  capGradient.addColorStop(1, "#160f08");
  ctx.fillStyle = capGradient;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.roundRect(x, capTop, barWidth, capHeight, 3);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 235, 164, 0.32)";
  ctx.lineWidth = 1;
  ctx.stroke();

  if (visualizerSegment > 0) {
    const visualizerGradient = ctx.createLinearGradient(0, visualizerTop, 0, bottomY);
    visualizerGradient.addColorStop(0, "#baff6f");
    visualizerGradient.addColorStop(0.35, "#4dff7a");
    visualizerGradient.addColorStop(1, "#118b45");
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.74;
    ctx.shadowColor = "#4dff7a";
    ctx.shadowBlur = 10;
    ctx.fillStyle = visualizerGradient;
    ctx.beginPath();
    ctx.roundRect(visualizerX, visualizerTop, visualizerWidth, visualizerHeight, 3);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
  }

  if (comboSegment > 0) {
    const fillGradient = ctx.createLinearGradient(0, fillTop, 0, bottomY);
    fillGradient.addColorStop(0, "#fff37a");
    fillGradient.addColorStop(0.45, "#ffd21f");
    fillGradient.addColorStop(1, "#b06e00");
    ctx.globalAlpha = 1;
    ctx.shadowColor = "#ffd21f";
    ctx.shadowBlur = 8;
    ctx.fillStyle = fillGradient;
    ctx.beginPath();
    ctx.roundRect(fillX, fillTop, fillWidth, fillHeight, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 1, capTop);
  ctx.lineTo(x + barWidth + 1, capTop);
  ctx.stroke();

  ctx.restore();
}

export function drawComboMeter(renderer, comboMultiplier, comboCap, beat) {
  const capExtra = Math.max(0, comboCap - 1);
  if (capExtra <= 0) {
    return;
  }

  const comboExtra = clamp(comboMultiplier - 1, 0, capExtra);
  const visualizerPulse = getComboVisualizerPulse(beat);
  const pairCount = Math.ceil(capExtra);
  const topY = 24 + COMBO_METER.verticalMargin;
  const bottomY = renderer.yToScreen(ENEMY_BREACH_Y) - COMBO_METER.verticalMargin;
  const playHeight = bottomY - topY;
  const sideGutter = Math.max(0, renderer.arena.x - COMBO_METER.sideGutterInset);
  const arenaGap = Math.min(
    COMBO_METER.arenaGap.preferred,
    Math.max(COMBO_METER.arenaGap.min, sideGutter * COMBO_METER.arenaGap.gutterScale),
  );
  const availableForBars = Math.max(
    COMBO_METER.barWidth.min,
    sideGutter - arenaGap - COMBO_METER.barGap * Math.max(0, pairCount - 1),
  );
  const barWidth = clamp(
    availableForBars / pairCount,
    COMBO_METER.barWidth.min,
    COMBO_METER.barWidth.max,
  );
  const fillWidth = Math.max(COMBO_METER.minFillWidth, barWidth - COMBO_METER.fillInset);

  for (let index = 0; index < pairCount; index += 1) {
    const capSegment = clamp(capExtra - index, 0, 1);
    const comboSegment = clamp(comboExtra - index, 0, capSegment);
    const visualizerSegment = comboSegment * visualizerPulse;
    if (capSegment <= 0) {
      continue;
    }

    const offset = index * (barWidth + COMBO_METER.barGap);
    const leftX = renderer.arena.x - arenaGap - barWidth - offset;
    const rightX = renderer.arena.x + renderer.arena.width + arenaGap + offset;
    drawComboBar(
      renderer.ctx,
      leftX,
      topY,
      bottomY,
      playHeight,
      barWidth,
      fillWidth,
      capSegment,
      comboSegment,
      visualizerSegment,
    );
    drawComboBar(
      renderer.ctx,
      rightX,
      topY,
      bottomY,
      playHeight,
      barWidth,
      fillWidth,
      capSegment,
      comboSegment,
      visualizerSegment,
    );
  }
}
