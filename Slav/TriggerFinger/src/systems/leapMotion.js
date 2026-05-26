import {
  LEAP_AIR_BEATS,
  LEAP_FALLBACK_TARGET_Y,
  LEAP_LANDING_OFFSET,
  LEAP_MAX_LANDING_Y,
  LEAP_MIN_TARGET_Y,
  LEAP_SHORT_AIR_BEAT_DISCOUNT,
  LEAP_SHORT_TARGET_Y,
} from "../config/gameplay.js";
import { clamp } from "../utils/math.js";

export function leapAirBeatsForTargetY(targetY) {
  const safeTargetY = Number.isFinite(targetY) ? targetY : LEAP_FALLBACK_TARGET_Y;
  const discount = safeTargetY < LEAP_SHORT_TARGET_Y
    ? LEAP_SHORT_AIR_BEAT_DISCOUNT
    : 0;
  return Math.max(0.5, LEAP_AIR_BEATS - discount);
}

export function getLeapLandBeat(startBeat, targetY) {
  return startBeat + leapAirBeatsForTargetY(targetY);
}

export function getLeapDestinationY(targetY) {
  const safeTargetY = Number.isFinite(targetY) ? targetY : LEAP_MIN_TARGET_Y;
  return clamp(
    safeTargetY + LEAP_LANDING_OFFSET,
    LEAP_MIN_TARGET_Y,
    LEAP_MAX_LANDING_Y,
  );
}
