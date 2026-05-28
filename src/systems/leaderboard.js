const SCORE_STORAGE_KEY = "triggerFinger.leaderboard.v1";
const TAG_STORAGE_KEY = "triggerFinger.playerTag.v1";
export const DEFAULT_PLAYER_TAG = "AAA";

function storage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function normalizePlayerTag(value) {
  const letters = String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
  return letters.padEnd(3, "A");
}

export function getStoredPlayerTag() {
  let stored = null;
  try {
    stored = storage()?.getItem(TAG_STORAGE_KEY);
  } catch {
    stored = null;
  }
  return normalizePlayerTag(stored || DEFAULT_PLAYER_TAG);
}

export function savePlayerTag(value) {
  const tag = normalizePlayerTag(value);
  try {
    storage()?.setItem(TAG_STORAGE_KEY, tag);
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
  return tag;
}

function readScoreMap() {
  let raw = null;
  try {
    raw = storage()?.getItem(SCORE_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function writeScoreMap(scores) {
  try {
    storage()?.setItem(SCORE_STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // Best-effort cache only.
  }
}

export function readLeaderboard() {
  return Object.entries(readScoreMap())
    .map(([tag, score]) => ({
      tag: normalizePlayerTag(tag),
      score: Math.max(0, Math.round(Number(score) || 0)),
    }))
    .sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag));
}

export function hasLeaderboardTag(tagValue) {
  const tag = normalizePlayerTag(tagValue);
  const scores = readScoreMap();
  return Number.isFinite(Number(scores[tag]));
}

export function recordLeaderboardScore(tagValue, scoreValue) {
  const tag = savePlayerTag(tagValue);
  const score = Math.max(0, Math.round(Number(scoreValue) || 0));
  const scores = readScoreMap();
  const previous = Math.max(0, Math.round(Number(scores[tag]) || 0));
  const isNewBest = score > previous;

  if (isNewBest) {
    scores[tag] = score;
    writeScoreMap(scores);
  }

  return {
    tag,
    score,
    previous,
    best: Math.max(previous, score),
    isNewBest,
  };
}
