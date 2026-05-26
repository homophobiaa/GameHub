# Speed Typing Arena

Speed Typing Arena is a browser-based mini-game built with plain HTML, CSS, and JavaScript. The player enters a name, chooses a difficulty, and tries to type the shown text as quickly and accurately as possible before the 60-second limit runs out.

The game can also be submitted early by pressing `Enter`, which saves the current attempt and shows the result immediately.

## Features

- Start screen with player name and difficulty selection
- Three difficulty levels:
  - `Easy`
  - `Normal`
  - `Hard`
- Live typing feedback:
  - correct characters in green
  - wrong characters in red
  - current character highlighted
- Live stats during the match:
  - WPM
  - accuracy
  - mistakes
  - current streak
  - best streak
  - score preview
- Result screen with final score and performance summary
- Separate Top 10 leaderboard for each difficulty
- Leaderboards stored with `localStorage`
- Clear leaderboard button for each difficulty board
- Responsive dark gaming UI

## How To Play

1. Open `index.html` in your browser.
2. Enter your player name.
3. Choose a difficulty.
4. Click `Start Game`.
5. Type the target text as accurately as possible.
6. Finish the full text to end the game automatically, or press `Enter` to submit your current attempt early.
7. View your result and check the leaderboard.

## Difficulty Levels

### Easy
Short and simple words or sentences.

### Normal
Medium-length sentences with a balanced typing pace.

### Hard
Longer texts that may include punctuation, numbers, and code-like content.

## Scoring

Base score formula:

```text
score = Math.round((wpm * (accuracy / 100)) + (bestStreak * 2) - (mistakes * 3))
```

Bonuses:

- `+10` points if accuracy is above `95%`
- `+20` points if mistakes are `0`
- score multiplier `x2` if best streak is above `30`
- final score cannot go below `0`

## Leaderboards

Each difficulty has its own separate leaderboard in `localStorage`:

- `typingLeaderboard_easy`
- `typingLeaderboard_normal`
- `typingLeaderboard_hard`

Each saved result includes:

- player name
- difficulty
- score
- WPM
- accuracy
- mistakes
- best streak
- date

## Project Files

- [index.html](./index.html) - game structure and screens
- [style.css](./style.css) - styling, layout, and responsive UI
- [script.js](./script.js) - game logic, scoring, difficulty handling, and leaderboards

## Running The Project

No installation is required.

Just open [index.html](./index.html) in any modern browser:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript

## Notes

- The game works fully offline.
- No external libraries are used.
- Results are stored only in the browser on the current device.
