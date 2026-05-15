import { HALF_BEAT, beatPhase, floorToHalfBeat, isOnBeat } from "../utils/beatMath.js";
import { clamp } from "../utils/math.js";

const BEAT_BAR_LOOKAHEAD = 2.5;
const BEAT_BAR_EDGE_OFFSET = 46;

export function markerOffsetPercent(timeUntilBeat) {
  return clamp(
    (timeUntilBeat / BEAT_BAR_LOOKAHEAD) * BEAT_BAR_EDGE_OFFSET,
    0,
    BEAT_BAR_EDGE_OFFSET,
  );
}

export class BeatBarView {
  constructor({ beatCount, beatStrip, beatMarkers }) {
    this.beatCount = beatCount;
    this.beatStrip = beatStrip;
    this.beatMarkers = beatMarkers;
    this.beatMarkerBeats = new Map();
  }

  clearMotion() {
    this.beatMarkerBeats.clear();
  }

  update({
    beat,
    track,
    suppressBeatBullets,
    beatFlashTtl,
    beatFlashKind,
    waveClearOutro,
    winddownRatio,
    bursts,
  }) {
    if (!this.beatCount || !this.beatStrip || !this.beatMarkers) {
      return;
    }

    const phase = beatPhase(beat);
    const measureBeat = (Math.floor(beat) % 4) + 1;
    this.beatCount.textContent = `${measureBeat}`;
    this.beatStrip.classList.toggle("is-pulsing", phase < 0.13);
    this.beatStrip.classList.toggle("is-offbeat", Math.abs(phase - 0.5) < 0.08);
    this.beatStrip.classList.toggle(
      "is-flash-good",
      beatFlashTtl > 0 && beatFlashKind === "good",
    );
    this.beatStrip.classList.toggle(
      "is-flash-bad",
      beatFlashTtl > 0 && beatFlashKind === "bad",
    );
    this.beatStrip.classList.toggle("is-winding-down", waveClearOutro);
    this.beatStrip.style.setProperty("--beat-winddown", `${winddownRatio}`);

    this.renderMarkers({
      beat,
      track,
      suppressBeatBullets,
      bursts,
    });
  }

  renderMarkers({ beat, track, suppressBeatBullets, bursts }) {
    const bullets = suppressBeatBullets
      ? []
      : track.getPreview(beat, 8).map((entry, previewIndex) => ({
          ...entry,
          previewIndex,
        }));
    const firstMarker = floorToHalfBeat(beat - 0.12);
    const markerHtml = [];
    const usedKeys = new Set();

    for (let i = 0; i < 11; i += 1) {
      const markerBeat = firstMarker + i * HALF_BEAT;
      const timeUntil = markerBeat - beat;
      if (timeUntil < -0.12 || timeUntil > BEAT_BAR_LOOKAHEAD) {
        continue;
      }

      const offset = markerOffsetPercent(timeUntil);
      const beatClass = isOnBeat(markerBeat) ? "is-beat" : "is-offbeat";

      markerHtml.push(`
        <div
          class="beat-converge ${beatClass}"
          style="--offset:${offset}%;--marker-color:#738096"
        >
          <span class="beat-cylinder is-left"></span>
          <span class="beat-cylinder is-right"></span>
        </div>
      `);
    }

    bullets.forEach((bullet) => {
      const key = `bullet:${bullet.uid}:${bullet.previewIndex}`;
      const isReloadLocked =
        bullet.isCurrent && beat < (track.reloadUntilBeat ?? -Infinity);
      const visualBeat = this.getVisualBeat(key, bullet.absoluteBeat, isReloadLocked, track.cycleBeats);
      const timeUntil = visualBeat - beat;
      usedKeys.add(key);

      if (timeUntil < -0.12 || timeUntil > BEAT_BAR_LOOKAHEAD) {
        return;
      }

      const beatClass = isOnBeat(bullet.absoluteBeat) ? "is-beat" : "is-offbeat";
      markerHtml.push(`
        <div
          class="beat-bullet-overlay ${beatClass} ${bullet.upgraded ? "is-upgraded" : ""} ${bullet.elapseActive === false ? "is-elapse-inactive" : ""} ${bullet.isCurrent ? "is-current" : ""}"
          style="--offset:${markerOffsetPercent(timeUntil)}%;--marker-color:${bullet.color}"
        >
          <span class="beat-cylinder is-left"></span>
          <span class="beat-cylinder is-right"></span>
        </div>
      `);
    });

    bursts.forEach((burst) => {
      const alpha = clamp(burst.ttl / 0.24, 0, 1);
      markerHtml.push(`
        <div
          class="beat-burst ${burst.isBeat ? "is-beat" : "is-offbeat"}"
          style="--offset:${burst.offset}%;--marker-color:${burst.color};--alpha:${alpha}"
        >
          <span class="beat-burst-dot is-left"></span>
          <span class="beat-burst-dot is-right"></span>
        </div>
      `);
    });

    [...this.beatMarkerBeats.keys()].forEach((key) => {
      if (!usedKeys.has(key)) {
        this.beatMarkerBeats.delete(key);
      }
    });

    this.beatMarkers.innerHTML = markerHtml.join("");
  }

  getVisualBeat(key, targetBeat, forceSnap = false, cycleBeats = 1) {
    const state = this.beatMarkerBeats.get(key);
    if (!state || forceSnap) {
      this.beatMarkerBeats.set(key, { visualBeat: targetBeat, targetBeat });
      return targetBeat;
    }

    if (state.targetBeat !== targetBeat) {
      state.targetBeat = targetBeat;
    }

    if (Math.abs(state.visualBeat - state.targetBeat) > cycleBeats * 0.5) {
      state.visualBeat = state.targetBeat;
    } else {
      state.visualBeat += (state.targetBeat - state.visualBeat) * 0.34;
      if (Math.abs(state.visualBeat - state.targetBeat) < 0.01) {
        state.visualBeat = state.targetBeat;
      }
    }

    return state.visualBeat;
  }
}
