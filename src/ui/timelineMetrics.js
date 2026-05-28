import { HALF_BEAT } from "../utils/beatMath.js";

export const TIMELINE_MARGIN = 5;
export const TIMELINE_WIDTH = 100 - TIMELINE_MARGIN * 2;
export const DOMAIN_EDGE_VISUAL_GAP = HALF_BEAT * 0.2;

function getTimelineScale(source) {
  if (source && typeof source === "object") {
    return {
      start: source.timelineStartBeat ?? 0,
      span: source.timelineSpanBeats ?? source.cycleBeats ?? 1,
    };
  }

  return {
    start: 0,
    span: source ?? 1,
  };
}

export function timelineLeft(beat, source) {
  const scale = getTimelineScale(source);
  return TIMELINE_MARGIN + ((beat - scale.start) / scale.span) * TIMELINE_WIDTH;
}

export function timelineWidth(beats, source) {
  const scale = getTimelineScale(source);
  return (beats / scale.span) * TIMELINE_WIDTH;
}

export function getTimelineDomainMetrics(domain, source, beat) {
  const visualStart = domain.start < beat
    ? Math.min(beat, domain.start + DOMAIN_EDGE_VISUAL_GAP)
    : domain.start;
  const visualEnd = domain.end > beat
    ? Math.max(beat, domain.end - DOMAIN_EDGE_VISUAL_GAP)
    : domain.end;
  const width = timelineWidth(Math.max(0, visualEnd - visualStart), source);
  const left = timelineLeft(visualStart, source);
  const center = left + width / 2;

  return {
    left,
    width,
    offset: center - timelineLeft(beat, source),
  };
}
