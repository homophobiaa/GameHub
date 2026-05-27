import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { TopNav } from "@/components/TopNav";
import { OnboardingScreen } from "@/screens/OnboardingScreen";
import { MenuScreen } from "@/screens/MenuScreen";
import { DifficultyScreen } from "@/screens/DifficultyScreen";
import { GameScreen, type GameResult } from "@/screens/GameScreen";
import { ResultScreen } from "@/screens/ResultScreen";
import { LeaderboardScreen } from "@/screens/LeaderboardScreen";
import { ScoringScreen } from "@/screens/ScoringScreen";
import { ProfilesScreen } from "@/screens/ProfilesScreen";
import { usePlayers } from "@/hooks/usePlayers";
import { useSettings } from "@/hooks/useSettings";
import {
  appendScore,
  clearAllScores,
  loadScores,
} from "@/storage/storage";
import { computeScore } from "@/lib/scoring";
import type { Difficulty, ScoreRecord, ScreenId } from "@/types";
import { ROUND_DURATION_MS } from "@/lib/difficulty";

export default function App() {
  const players = usePlayers();
  const { settings, toggleMute } = useSettings();

  const [screen, setScreen] = useState<ScreenId>("menu");
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty>("easy");
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [scores, setScores] = useState<ScoreRecord[]>(() => loadScores());

  // Auto-select most recent player if active player is missing.
  const hasActive = !!players.activePlayer;
  const playerCount = players.players.length;
  useEffect(() => {
    if (!hasActive && playerCount > 0) {
      const recent = [...players.players].sort(
        (a, b) => b.lastPlayedAt - a.lastPlayedAt
      )[0];
      players.selectPlayer(recent.id);
    }
  }, [hasActive, playerCount, players]);

  const refreshScores = useCallback(() => {
    setScores(loadScores());
  }, []);

  const navigate = useCallback((s: ScreenId) => {
    setScreen(s);
  }, []);

  const handleCreatePlayer = useCallback(
    (name: string) => {
      players.createPlayer(name);
      setScreen("menu");
    },
    [players]
  );

  const handleStartGame = useCallback((d: Difficulty) => {
    setPendingDifficulty(d);
    setScreen("game");
  }, []);

  const handleRoundComplete = useCallback(
    (result: GameResult) => {
      setLastResult(result);
      const player = players.activePlayer;
      if (player) {
        const breakdown = computeScore({
          difficulty: result.difficulty,
          discs: result.discs,
          moves: result.moves,
          remainingSeconds: Math.floor(result.remainingMs / 1000),
          solved: result.solved,
          progressPercent: result.progressPercent,
        });
        appendScore({
          playerId: player.id,
          playerName: player.name,
          difficulty: result.difficulty,
          discs: result.discs,
          score: breakdown.finalScore,
          moves: result.moves,
          minMoves: result.minMoves,
          efficiency: result.efficiency,
          timeUsedMs: result.elapsedMs,
          timeLeftMs: result.remainingMs,
          solved: result.solved,
        });
        players.markPlayed(player.id);
        refreshScores();
      }
      setScreen("result");
    },
    [players, refreshScores]
  );

  const activePlayer = players.activePlayer;

  const view = useMemo(() => {
    if (!activePlayer || screen === "onboarding") {
      return <OnboardingScreen key="onboarding" onCreate={handleCreatePlayer} />;
    }
    switch (screen) {
      case "menu":
        return (
          <MenuScreen
            key="menu"
            player={activePlayer}
            scores={scores}
            onNavigate={navigate}
          />
        );
      case "difficulty":
        return (
          <DifficultyScreen
            key="difficulty"
            onBack={() => navigate("menu")}
            onPick={handleStartGame}
          />
        );
      case "game":
        return (
          <GameScreen
            key={`game-${pendingDifficulty}-${activePlayer.id}`}
            player={activePlayer}
            difficulty={pendingDifficulty}
            onBack={() => navigate("menu")}
            onComplete={handleRoundComplete}
          />
        );
      case "result":
        return lastResult ? (
          <ResultScreen
            key="result"
            result={lastResult}
            onPlayAgain={() => {
              setScreen("game");
            }}
            onChangeDifficulty={() => navigate("difficulty")}
            onMenu={() => navigate("menu")}
            onLeaderboard={() => navigate("leaderboard")}
          />
        ) : (
          <MenuScreen
            key="menu-fallback"
            player={activePlayer}
            scores={scores}
            onNavigate={navigate}
          />
        );
      case "leaderboard":
        return (
          <LeaderboardScreen
            key="leaderboard"
            scores={scores}
            players={players.players}
            activePlayerId={activePlayer.id}
            onBack={() => navigate("menu")}
            onClearAll={() => {
              clearAllScores();
              refreshScores();
            }}
          />
        );
      case "scoring":
        return <ScoringScreen key="scoring" onBack={() => navigate("menu")} />;
      case "profiles":
        return (
          <ProfilesScreen
            key="profiles"
            players={players.players}
            activePlayerId={activePlayer.id}
            scores={scores}
            onBack={() => navigate("menu")}
            onCreate={(name) => players.createPlayer(name)}
            onSelect={(id) => {
              players.selectPlayer(id);
              navigate("menu");
            }}
            onRename={(id, name) => players.renamePlayer(id, name)}
            onDelete={(id) => {
              players.deletePlayer(id);
              refreshScores();
            }}
          />
        );
    }
  }, [
    screen,
    activePlayer,
    scores,
    pendingDifficulty,
    lastResult,
    handleCreatePlayer,
    handleStartGame,
    handleRoundComplete,
    navigate,
    players,
    refreshScores,
  ]);

  const showNav = !!activePlayer && screen !== "onboarding" && screen !== "game";

  return (
    <>
      <AuroraBackground />
      {showNav && (
        <TopNav
          current={screen}
          muted={settings.muted}
          onToggleMute={toggleMute}
          onNavigate={navigate}
          playerName={activePlayer?.name}
        />
      )}
      <main className="relative">
        <AnimatePresence mode="wait">{view}</AnimatePresence>
      </main>
      {/* Helpful global hint about timer */}
      {screen === "game" && (
        <span className="sr-only">Round duration is {ROUND_DURATION_MS / 1000} seconds.</span>
      )}
    </>
  );
}
