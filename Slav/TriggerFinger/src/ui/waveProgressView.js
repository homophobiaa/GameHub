import { clamp } from "../utils/math.js";

function buildProgressStamp({ progress, waveClearOutro, waveIndex, total }) {
  return [
    progress.active ? 1 : 0,
    waveClearOutro ? 1 : 0,
    waveIndex,
    progress.spawned,
    total,
    progress.kills,
    progress.alive,
    progress.pendingPatterns,
  ].join("|");
}

export function updateWaveProgressView({
  el,
  dt = 0,
  progress,
  waveIndex,
  waveClearOutro = false,
  flashTtl = 0,
  visualProgress = 0,
}) {
  if (!el) {
    return visualProgress;
  }

  const total = progress.total;
  const targetRatio = waveClearOutro
    ? 1
    : total > 0
      ? clamp(progress.spawned / total, 0, 1)
      : 0;
  const catchup = dt > 0 ? clamp(dt * 5.5, 0, 1) : 1;
  let nextVisualProgress = targetRatio >= visualProgress
    ? visualProgress + (targetRatio - visualProgress) * catchup
    : visualProgress;
  if (Math.abs(nextVisualProgress - targetRatio) < 0.005) {
    nextVisualProgress = Math.max(nextVisualProgress, targetRatio);
  }

  const ratio = clamp(nextVisualProgress, 0, 1);
  const label = progress.active
    ? `${progress.spawned}/${total} spawned`
    : `Wave ${waveIndex + 1} ready`;
  const detail = progress.active
    ? `${progress.kills} defeated | ${progress.alive} alive${progress.pendingPatterns ? ` | ${progress.pendingPatterns} pattern${progress.pendingPatterns === 1 ? "" : "s"}` : ""}`
    : "Start a wave to track kills.";
  const contentStamp = buildProgressStamp({ progress, waveClearOutro, waveIndex, total });

  el.classList.toggle("is-complete-flash", flashTtl > 0);

  if (el.dataset.stamp === contentStamp) {
    const fill = el.querySelector("[data-progress-fill]");
    if (fill) {
      fill.style.width = `${ratio * 100}%`;
    }
    return nextVisualProgress;
  }

  el.dataset.stamp = contentStamp;
  el.innerHTML = `
    <div class="wave-progress-copy">
      <span>Wave ${waveIndex + 1}</span>
      <small>${label}</small>
    </div>
    <div class="wave-progress-bar" aria-label="${label}">
      <span data-progress-fill style="width:${ratio * 100}%"></span>
    </div>
    <div class="wave-progress-copy is-right">
      <span>${Math.round(ratio * 100)}%</span>
      <small>${detail}</small>
    </div>
  `;

  return nextVisualProgress;
}
