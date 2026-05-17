import { HALF_BEAT } from "../utils/beatMath.js";

export const TIMELINE_MARGIN = 5;
export const TIMELINE_WIDTH = 100 - TIMELINE_MARGIN * 2;
export const DOMAIN_EDGE_VISUAL_GAP = HALF_BEAT * 0.2;

export function timelineLeft(beat, cycleBeats) {
  return TIMELINE_MARGIN + (beat / cycleBeats) * TIMELINE_WIDTH;
}

export function timelineWidth(beats, cycleBeats) {
  return (beats / cycleBeats) * TIMELINE_WIDTH;
}

export function getTimelineDomainMetrics(domain, cycleBeats, beat) {
  const visualStart = domain.start < beat
    ? Math.min(beat, domain.start + DOMAIN_EDGE_VISUAL_GAP)
    : domain.start;
  const visualEnd = domain.end > beat
    ? Math.max(beat, domain.end - DOMAIN_EDGE_VISUAL_GAP)
    : domain.end;
  const width = timelineWidth(Math.max(0, visualEnd - visualStart), cycleBeats);
  const left = timelineLeft(visualStart, cycleBeats);
  const center = left + width / 2;

  return {
    left,
    width,
    offset: center - timelineLeft(beat, cycleBeats),
  };
}
