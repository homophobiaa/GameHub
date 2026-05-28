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
    this.markerElements = new Map();
    this.lastMeasureBeat = null;
    this.lastWinddownRatio = null;
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
    if (this.lastMeasureBeat !== measureBeat) {
      this.beatCount.textContent = `${measureBeat}`;
      this.lastMeasureBeat = measureBeat;
    }
    this.toggleStripClass("is-pulsing", phase < 0.13);
    this.toggleStripClass("is-offbeat", Math.abs(phase - 0.5) < 0.08);
    this.toggleStripClass(
      "is-flash-good",
      beatFlashTtl > 0 && beatFlashKind === "good",
    );
    this.toggleStripClass(
      "is-flash-bad",
      beatFlashTtl > 0 && beatFlashKind === "bad",
    );
    this.toggleStripClass("is-winding-down", waveClearOutro);
    if (this.lastWinddownRatio !== winddownRatio) {
      this.beatStrip.style.setProperty("--beat-winddown", `${winddownRatio}`);
      this.lastWinddownRatio = winddownRatio;
    }

    this.renderMarkers({
      beat,
      track,
      suppressBeatBullets,
      bursts,
    });
  }

  toggleStripClass(className, enabled) {
    if (this.beatStrip.classList.contains(className) !== enabled) {
      this.beatStrip.classList.toggle(className, enabled);
    }
  }

  createMarkerElement(dotClass = "beat-cylinder") {
    const element = document.createElement("div");
    const left = document.createElement("span");
    const right = document.createElement("span");
    left.className = `${dotClass} is-left`;
    right.className = `${dotClass} is-right`;
    element.append(left, right);
    return element;
  }

  syncMarkerElement(key, { baseClass, classes = [], dotClass, offset, color, alpha = null }) {
    let element = this.markerElements.get(key);
    if (!element) {
      element = this.createMarkerElement(dotClass);
      this.markerElements.set(key, element);
      this.beatMarkers.append(element);
    }

    const className = [baseClass, ...classes].filter(Boolean).join(" ");
    if (element.className !== className) {
      element.className = className;
    }
    element.style.setProperty("--offset", `${offset}%`);
    element.style.setProperty("--marker-color", color);
    if (alpha === null) {
      element.style.removeProperty("--alpha");
    } else {
      element.style.setProperty("--alpha", `${alpha}`);
    }
  }

  renderMarkers({ beat, track, suppressBeatBullets, bursts }) {
    const bullets = suppressBeatBullets
      ? []
      : track.getPreview(beat, 8).map((entry, previewIndex) => ({
          ...entry,
          previewIndex,
        }));
    const firstMarker = floorToHalfBeat(beat - 0.12);
    const usedElementKeys = new Set();
    const usedVisualKeys = new Set();

    for (let i = 0; i < 11; i += 1) {
      const markerBeat = firstMarker + i * HALF_BEAT;
      const timeUntil = markerBeat - beat;
      if (timeUntil < -0.12 || timeUntil > BEAT_BAR_LOOKAHEAD) {
        continue;
      }

      const offset = markerOffsetPercent(timeUntil);
      const beatClass = isOnBeat(markerBeat) ? "is-beat" : "is-offbeat";
      const key = `beat:${markerBeat.toFixed(2)}`;
      usedElementKeys.add(key);

      this.syncMarkerElement(key, {
        baseClass: "beat-converge",
        classes: [beatClass],
        dotClass: "beat-cylinder",
        offset,
        color: "#738096",
      });
    }

    bullets.forEach((bullet) => {
      const key = `bullet:${bullet.uid}:${bullet.previewIndex}`;
      const isReloadLocked =
        bullet.isCurrent && beat < (track.reloadUntilBeat ?? -Infinity);
      const visualBeat = this.getVisualBeat(key, bullet.absoluteBeat, isReloadLocked, track.cycleBeats);
      const timeUntil = visualBeat - beat;
      usedVisualKeys.add(key);

      if (timeUntil < -0.12 || timeUntil > BEAT_BAR_LOOKAHEAD) {
        return;
      }

      const beatClass = isOnBeat(bullet.absoluteBeat) ? "is-beat" : "is-offbeat";
      usedElementKeys.add(key);
      this.syncMarkerElement(key, {
        baseClass: "beat-bullet-overlay",
        classes: [
          beatClass,
          bullet.upgraded ? "is-upgraded" : "",
          bullet.elapseActive === false ? "is-elapse-inactive" : "",
          bullet.isCurrent ? "is-current" : "",
        ],
        dotClass: "beat-cylinder",
        offset: markerOffsetPercent(timeUntil),
        color: bullet.color,
      });
    });

    bursts.forEach((burst, index) => {
      const alpha = clamp(burst.ttl / 0.24, 0, 1);
      const key = `burst:${burst.id ?? index}`;
      usedElementKeys.add(key);
      this.syncMarkerElement(key, {
        baseClass: "beat-burst",
        classes: [burst.isBeat ? "is-beat" : "is-offbeat"],
        dotClass: "beat-burst-dot",
        offset: burst.offset,
        color: burst.color,
        alpha,
      });
    });

    [...this.beatMarkerBeats.keys()].forEach((key) => {
      if (!usedVisualKeys.has(key)) {
        this.beatMarkerBeats.delete(key);
      }
    });

    [...this.markerElements.entries()].forEach(([key, element]) => {
      if (!usedElementKeys.has(key)) {
        element.remove();
        this.markerElements.delete(key);
      }
    });
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
