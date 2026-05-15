export const TIMELINE_MARGIN = 5;
export const TIMELINE_WIDTH = 100 - TIMELINE_MARGIN * 2;

export function timelineLeft(beat, cycleBeats) {
  return TIMELINE_MARGIN + (beat / cycleBeats) * TIMELINE_WIDTH;
}

export function timelineWidth(beats, cycleBeats) {
  return (beats / cycleBeats) * TIMELINE_WIDTH;
}

export function getTimelineDomainMetrics(domain, cycleBeats, beat) {
  const width = timelineWidth(domain.end - domain.start, cycleBeats);
  const left = timelineLeft(domain.start, cycleBeats);
  const center = left + width / 2;

  return {
    left,
    width,
    offset: center - timelineLeft(beat, cycleBeats),
  };
}
