export const HALF_BEAT = 0.5;
export const EPSILON = 0.0001;

export function beatPhase(beat) {
  return beat - Math.floor(beat);
}

export function isOnBeat(beat, epsilon = EPSILON) {
  return Math.abs(beat - Math.round(beat)) < epsilon;
}

export function isOffBeat(beat, epsilon = EPSILON) {
  return Math.abs((beat % 1) - 0.5) < epsilon;
}

export function snapToHalfBeat(value) {
  return Math.round(value / HALF_BEAT) * HALF_BEAT;
}

export function floorToHalfBeat(value) {
  return Math.floor(value / HALF_BEAT) * HALF_BEAT;
}

export function nextHalfBeatAfter(beat) {
  return Math.floor(beat / HALF_BEAT + EPSILON) * HALF_BEAT + HALF_BEAT;
}

export function halfBeatKey(beat) {
  return Math.round(beat / HALF_BEAT);
}

export function isValidTiming(timing, beat) {
  if (timing === "beat") {
    return isOnBeat(beat);
  }

  if (timing === "offbeat") {
    return isOffBeat(beat);
  }

  return isOnBeat(beat) || isOffBeat(beat);
}

export function timingStep(timing) {
  return timing === "either" ? HALF_BEAT : 1;
}

export function timingOffset(timing) {
  return timing === "offbeat" ? HALF_BEAT : 0;
}

export function alignTimingAtOrAfter(value, timing) {
  const step = timingStep(timing);
  const offset = timingOffset(timing);
  return offset + Math.ceil((value - offset - EPSILON) / step) * step;
}
