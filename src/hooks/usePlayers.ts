import { useCallback, useEffect, useState } from "react";
import type { PlayerProfile } from "@/types";
import {
  createPlayer as createPlayerInStorage,
  deletePlayer as deletePlayerInStorage,
  loadActivePlayerId,
  loadPlayers,
  renamePlayer as renamePlayerInStorage,
  saveActivePlayerId,
  touchPlayer,
} from "@/storage/storage";

export interface PlayersAPI {
  players: PlayerProfile[];
  activePlayer: PlayerProfile | null;
  createPlayer: (name: string) => PlayerProfile;
  selectPlayer: (id: string | null) => void;
  renamePlayer: (id: string, name: string) => void;
  deletePlayer: (id: string) => void;
  markPlayed: (id: string) => void;
  refresh: () => void;
}

export function usePlayers(): PlayersAPI {
  const [players, setPlayers] = useState<PlayerProfile[]>(() => loadPlayers());
  const [activeId, setActiveId] = useState<string | null>(() => loadActivePlayerId());

  const refresh = useCallback(() => {
    setPlayers(loadPlayers());
    setActiveId(loadActivePlayerId());
  }, []);

  useEffect(() => {
    // Cross-tab sync
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const createPlayer = useCallback((name: string): PlayerProfile => {
    const p = createPlayerInStorage(name);
    saveActivePlayerId(p.id);
    setPlayers(loadPlayers());
    setActiveId(p.id);
    return p;
  }, []);

  const selectPlayer = useCallback((id: string | null) => {
    saveActivePlayerId(id);
    setActiveId(id);
  }, []);

  const rename = useCallback((id: string, name: string) => {
    renamePlayerInStorage(id, name);
    setPlayers(loadPlayers());
  }, []);

  const remove = useCallback((id: string) => {
    deletePlayerInStorage(id);
    setPlayers(loadPlayers());
    setActiveId(loadActivePlayerId());
  }, []);

  const markPlayed = useCallback((id: string) => {
    touchPlayer(id);
    setPlayers(loadPlayers());
  }, []);

  const activePlayer = players.find((p) => p.id === activeId) ?? null;

  return {
    players,
    activePlayer,
    createPlayer,
    selectPlayer,
    renamePlayer: rename,
    deletePlayer: remove,
    markPlayed,
    refresh,
  };
}
