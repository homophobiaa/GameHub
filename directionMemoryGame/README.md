# 🧭 Direction Memory Game

A mini-game module for **SoftUni GameHub**.

A sequence of directions (← ↑ → ↓) flashes on screen. The player must repeat
it. Every round the sequence grows by one. Similar to *Simon Says*, but with
directions instead of colors.

## Features

- ✅ Pure vanilla **HTML / CSS / JS** — no build step, no dependencies
- ✅ Modular ES module (`game.js`) with a small exposed API
- ✅ **Score system** with speed bonuses and per-round bonus points
- ✅ **Leaderboard** (Top 10) saved in `localStorage`
- ✅ Reads the shared `gamehub:player` profile if the hub provides one
- ✅ **Keyboard support** (arrow keys) + on-screen touch pad
- ✅ Responsive, dark-themed UI that matches GameHub's vibe
- ✅ Bulgarian UI text (matches the project spec)

## How it integrates with GameHub

The folder is self-contained. Drop it into the repo:

```
GameHub/
└── Games/
    └── direction-memory/      ← this folder
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

| Source            | Points                                      |
|-------------------|---------------------------------------------|
| Each correct tap  | 1 + up to 5 speed bonus (faster = more)     |
| Round cleared     | +10                                         |
| Time-out / wrong  | game over, score submitted to leaderboard   |

The sequence playback also speeds up slightly each round, so later rounds
are both longer **and** quicker.

## Module API

```js
import { DirectionMemoryGame } from './game.js';

DirectionMemoryGame.start();          // start a new game
DirectionMemoryGame.reset();          // reset state
DirectionMemoryGame.getLeaderboard(); // returns array of {name, score, round, at}
```

## Local testing

Open `index.html` directly in a browser — no server needed.

> If you load via `file://` and see module errors in some older browsers,
> serve the folder instead: `npx serve .` or `python -m http.server`.

## Storage keys used

- `gamehub:direction-memory:leaderboard` — Top 10 entries
- `gamehub:direction-memory:player` — fallback player name
- `gamehub:player` — *read-only*, shared GameHub profile (optional)
