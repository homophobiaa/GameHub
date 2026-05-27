# Hanoi Royale

A polished, competitive Tower of Hanoi score game. Pure browser, no backend.

## Stack

- **React 18 + TypeScript**
- **Vite** for dev/build
- **Tailwind CSS** for styling (premium glassmorphism + aurora background)
- **Framer Motion** for animation
- **Web Audio API** for procedural SFX
- **localStorage** for player profiles, score history, and settings

## Run

```bash
npm install   # if dependencies are missing
npm run dev   # http://localhost:5173
npm run build
npm run preview
```

## Game rules

- Standard Tower of Hanoi (3 rods).
- One disc moves at a time. A larger disc cannot rest on a smaller one.
- Win when all discs are restacked on the rightmost (Target) rod.
- Each round is exactly **5:00**. The timer starts on your first move.
- Difficulties:
  - **Easy** — 3 discs (×1.00 multiplier, lowest score potential)
  - **Medium** — 4 discs (×1.65, balanced)
  - **Hard** — 5 discs (×2.50, highest score potential)

## Scoring (transparent)

```
minimumMoves   = 2^discCount - 1
moveEfficiency = clamp(minimumMoves / actualMoves, 0, 1)
timeBonus      = baseScore * 0.4 * (remainingSeconds / 300)
completionBonus = baseScore * 0.25      (solved only)

solved:    finalScore = round((baseScore * moveEfficiency + timeBonus + completionBonus) * difficultyMultiplier)
unsolved:  finalScore = round((baseScore * 0.15 * progressPercent) * difficultyMultiplier)
```

The Scoring page in-app shows worked examples for every difficulty.

## Project layout

```
src/
  components/        shared UI (AuroraBackground, TopNav, AnimatedNumber, PageShell)
    game/            board, disc, hint area
  screens/           one component per route-like screen
  hooks/             useGame, usePlayers, useSettings
  lib/               difficulty, hanoi rules, scoring, audio, format helpers
  storage/           localStorage adapters (players, scores, settings)
  types/             shared TypeScript types
```

- `src/lib/hanoi.ts` — pure game rules
- `src/lib/scoring.ts` — pure scoring formula
- `src/storage/storage.ts` — all persistence
- `src/hooks/useGame.ts` — game state machine + timer