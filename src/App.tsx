import { AnimatePresence } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { MenuScreen } from "@/screens/MenuScreen";
import { NewPlayerScreen } from "@/screens/NewPlayerScreen";
import { GameScreen, type GameResult } from "@/screens/GameScreen";
import { ResultScreen } from "@/screens/ResultScreen";
import { LeaderboardScreen } from "@/screens/LeaderboardScreen";
import { ScoringScreen } from "@/screens/ScoringScreen";
import { useSettings } from "@/hooks/useSettings";
import { appendScore, clearAllScores, loadScores } from "@/storage/storage";
import { computeScore } from "@/lib/scoring";
import type { Difficulty, ScoreRecord, ScreenId } from "@/types";

export default function App() {
  const { settings, toggleMute } = useSettings();

  const [screen, setScreen] = useState<ScreenId>("menu");
  const [playerName, setPlayerName] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [latestScoreId, setLatestScoreId] = useState<string | null>(null);
  const [scores, setScores] = useState<ScoreRecord[]>(() => loadScores());
  // Increment to force GameScreen remount for a fresh game
  const gameKeyRef = useRef(0);
  const [gameKey, setGameKey] = useState(0);

  const refreshScores = useCallback(() => setScores(loadScores()), []);

  const navigate = useCallback((s: ScreenId) => setScreen(s), []);

  const handleStartGame = useCallback((name: string, diff: Difficulty) => {
    setPlayerName(name);
    setDifficulty(diff);
    gameKeyRef.current += 1;
    setGameKey(gameKeyRef.current);
    setScreen("game");
  }, []);

  const handleRoundComplete = useCallback(
    (result: GameResult) => {
      setLastResult(result);
      const breakdown = computeScore({
        difficulty: result.difficulty,
        discs: result.discs,
        moves: result.moves,
        remainingSeconds: Math.floor(result.remainingMs / 1000),
        solved: result.solved,
        progressPercent: result.progressPercent,
      });
      const saved = appendScore({
        playerId: `session_${Date.now()}`,
        playerName,
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
      setLatestScoreId(saved.id);
      refreshScores();
      setScreen("result");
    },
    [playerName, refreshScores]
  );

  return (
    <>
      <AuroraBackground />
      <main className="relative">
        <AnimatePresence mode="wait">
          {screen === "menu" && (
            <MenuScreen
              key="menu"
              muted={settings.muted}
              onToggleMute={toggleMute}
              onStartNewPlayer={() => navigate("new-player")}
              onLeaderboard={() => {
                setLatestScoreId(null);
                navigate("leaderboard");
              }}
              onScoring={() => navigate("scoring")}
              onClearScores={() => {
                clearAllScores();
                refreshScores();
              }}
              scores={scores}
            />
          )}

          {screen === "new-player" && (
            <NewPlayerScreen
              key="new-player"
              onStart={handleStartGame}
              onBack={() => navigate("menu")}
            />
          )}

          {screen === "game" && (
            <GameScreen
              key={`game-${gameKey}`}
              playerName={playerName}
              difficulty={difficulty}
              onComplete={handleRoundComplete}
            />
          )}

          {screen === "result" && lastResult && (
            <ResultScreen
              key="result"
              result={lastResult}
              playerName={playerName}
              onNextPlayer={() => navigate("new-player")}
              onPlayAgain={() => {
                gameKeyRef.current += 1;
                setGameKey(gameKeyRef.current);
                setScreen("game");
              }}
              onLeaderboard={() => navigate("leaderboard")}
              onScoring={() => navigate("scoring")}
              onMenu={() => navigate("menu")}
            />
          )}

          {screen === "result" && !lastResult && (
            <MenuScreen
              key="menu-fallback"
              muted={settings.muted}
              onToggleMute={toggleMute}
              onStartNewPlayer={() => navigate("new-player")}
              onLeaderboard={() => navigate("leaderboard")}
              onScoring={() => navigate("scoring")}
              onClearScores={() => {
                clearAllScores();
                refreshScores();
              }}
              scores={scores}
            />
          )}

          {screen === "leaderboard" && (
            <LeaderboardScreen
              key="leaderboard"
              scores={scores}
              latestScoreId={latestScoreId}
              onBack={() => navigate("menu")}
              onClearAll={() => {
                clearAllScores();
                refreshScores();
              }}
            />
          )}

          {screen === "scoring" && (
            <ScoringScreen key="scoring" onBack={() => navigate("menu")} />
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
