import type { AppSettings, PlayerProfile, ScoreRecord } from "@/types";

const KEYS = {
  players: "hanoi-royale:players:v1",
  activePlayer: "hanoi-royale:activePlayer:v1",
  scores: "hanoi-royale:scores:v1",
  settings: "hanoi-royale:settings:v1",
} as const;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeParse<T>(window.localStorage.getItem(key), fallback);
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/* -------- Players -------- */

export function loadPlayers(): PlayerProfile[] {
  return read<PlayerProfile[]>(KEYS.players, []);
}

export function savePlayers(players: PlayerProfile[]): void {
  write(KEYS.players, players);
}

export function loadActivePlayerId(): string | null {
  return read<string | null>(KEYS.activePlayer, null);
}

export function saveActivePlayerId(id: string | null): void {
  write(KEYS.activePlayer, id);
}

export function createPlayer(name: string): PlayerProfile {
  const trimmed = name.trim().slice(0, 24);
  const now = Date.now();
  const profile: PlayerProfile = {
    id: cryptoId(),
    name: trimmed || "Player",
    createdAt: now,
    lastPlayedAt: now,
  };
  const players = loadPlayers();
  players.push(profile);
  savePlayers(players);
  return profile;
}

export function renamePlayer(id: string, name: string): void {
  const players = loadPlayers();
  const idx = players.findIndex((p) => p.id === id);
  if (idx >= 0) {
    players[idx] = { ...players[idx], name: name.trim().slice(0, 24) || players[idx].name };
    savePlayers(players);
  }
}

export function deletePlayer(id: string): void {
  const players = loadPlayers().filter((p) => p.id !== id);
  savePlayers(players);
  const scores = loadScores().filter((s) => s.playerId !== id);
  saveScores(scores);
  if (loadActivePlayerId() === id) saveActivePlayerId(null);
}

export function touchPlayer(id: string): void {
  const players = loadPlayers();
  const idx = players.findIndex((p) => p.id === id);
  if (idx >= 0) {
    players[idx] = { ...players[idx], lastPlayedAt: Date.now() };
    savePlayers(players);
  }
}

/* -------- Scores -------- */

export function loadScores(): ScoreRecord[] {
  return read<ScoreRecord[]>(KEYS.scores, []);
}

export function saveScores(scores: ScoreRecord[]): void {
  write(KEYS.scores, scores);
}

export function appendScore(record: Omit<ScoreRecord, "id" | "createdAt">): ScoreRecord {
  const full: ScoreRecord = {
    ...record,
    id: cryptoId(),
    createdAt: Date.now(),
  };
  const scores = loadScores();
  scores.push(full);
  saveScores(scores);
  return full;
}

export function clearAllScores(): void {
  saveScores([]);
}

/* -------- Settings -------- */

export function loadSettings(): AppSettings {
  return read<AppSettings>(KEYS.settings, { muted: false });
}

export function saveSettings(s: AppSettings): void {
  write(KEYS.settings, s);
}

/* -------- Utils -------- */

function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
