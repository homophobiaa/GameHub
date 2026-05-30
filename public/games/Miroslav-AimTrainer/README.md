# 🎯 Aim Trainer

A mini-game module for **SoftUni GameHub**.

Targets pop up at random positions inside the play field. Click them as fast and
as accurately as you can. Each game is a fixed **30-second round** — when the
timer hits zero the round ends and your score is submitted to the leaderboard.

## Features

- ✅ Pure vanilla **HTML / CSS / JS** — no build step, no dependencies
- ✅ Modular ES module (`game.js`) with a small exposed API
- ✅ Fixed **30-second rounds** with a live countdown
- ✅ **Score system** rewarding speed, accuracy and hit streaks (combo)
- ✅ Difficulty ramps within the round (targets shrink and expire faster)
- ✅ **Leaderboard** (Top 10) saved in `localStorage`
- ✅ Reads the shared `gamehub:player` profile if the hub provides one
- ✅ Keyboard support (Enter / Space to start) + pointer/touch input
- ✅ Responsive, dark-themed UI that matches GameHub's vibe
- ✅ Bulgarian UI text (matches the project spec)

## How it integrates with GameHub

The folder is self-contained. It sits next to the other games at the repo root:

```
GameHub/
├── directionMemoryGame/
└── aimTrainerGame/        ← this folder
    ├── index.html
    ├── style.css
    ├── game.js
    └── README.md
```

The "back" link in `index.html` points to `../../index.html`. Adjust if the
hub uses a different launcher path.

### Shared player profile (optional)

If the main GameHub launcher stores the active player like this:

```js
localStorage.setItem(
  'gamehub:player',
  JSON.stringify({ initials: 'РД' })
);
```

…this game will pick up that name automatically. Otherwise it falls back to a
one-time `prompt()` and stores the name under its own key.

## Scoring

| Source             | Points                                              |
|--------------------|-----------------------------------------------------|
| Each hit           | 10 + up to 15 speed bonus (faster hit = more)       |
| Combo multiplier   | ×1 → ×2, +10% per consecutive hit (caps at combo 10)|
| Missed click       | breaks the combo and lowers accuracy                |
| Expired target     | counts as a miss (combo broken, accuracy down)      |
| End-of-round bonus | + accuracy% (up to +100 for a flawless round)       |

The combo multiplier applies to `(base + speed bonus)`, so streaks of fast,
accurate hits are worth far more than isolated clicks.

## Module API

```js
import { AimTrainerGame } from './game.js';

AimTrainerGame.start();          // start a new 30-second round
AimTrainerGame.reset();          // reset state to idle
AimTrainerGame.getLeaderboard(); // returns array of {name, score, accuracy, at}
```

## Local testing

Open `index.html` directly in a browser — no server needed.

> If you load via `file://` and see module errors in some older browsers,
> serve the folder instead: `npx serve .` or `python -m http.server`.

## Storage keys used

- `gamehub:aim-trainer:leaderboard` — Top 10 entries
- `gamehub:aim-trainer:player` — fallback player name
- `gamehub:player` — *read-only*, shared GameHub profile (optional)
