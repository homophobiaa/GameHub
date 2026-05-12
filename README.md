# Reaction Grid Game

A modern browser reaction game built with HTML, CSS, and vanilla JavaScript.

Players create a local nickname, choose a difficulty, and click the active square in a 5x5 grid as fast as possible before the 30 second timer ends. The game includes combo scoring, local leaderboard saving, player statistics, sound effects, and looping background music.

## Features

- Local nickname user system with `localStorage`
- 5x5 reaction grid
- 30 second game timer
- START, STOP, and RESTART controls
- Easy, Normal, and Hard difficulty modes
- Combo-based scoring system
- Animated targets, score popups, combo glow, and screen shake
- Top 10 local leaderboard
- Saved player statistics:
  - Highest combo
  - Accuracy
  - Clicks per second
  - Best score
  - Total games played
- Background music with ON/OFF toggle
- Click, combo, wrong-click, countdown, and game-over sound effects
- Responsive dark arcade UI

## Scoring

| Combo | Points |
| --- | --- |
| 1-4 | +1 |
| 5-9 | +2 |
| 10-14 | +3 |
| 15-19 | +4 |
| 20+ | +5 |

## Difficulty Modes

| Mode | Start Speed | Minimum Speed | Notes |
| --- | --- | --- | --- |
| Easy | 1200ms | 500ms | Larger targets, slower acceleration |
| Normal | 1000ms | 300ms | Balanced gameplay |
| Hard | 700ms | 150ms | Smaller targets, faster acceleration, fake flashes |

## Project Structure

```text
GameHub/
  index.html
  style.css
  script.js
  music.mp3
  README.md
```

## How To Run

Open `index.html` in a browser.

For the best audio behavior, start the game by pressing `START`. Browsers block autoplay, so the background music begins only after the player interacts with the page.

## Audio

The game uses:

```html
<audio id="bgMusic" src="./music.mp3" loop preload="auto"></audio>
```

Music volume is set to 15% by default. The music loops automatically while enabled, and the player can turn it on or off using the Music button.

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- Web Audio API
- localStorage

## Notes

No registration, login, password, email, backend, or database is required. All player data is stored locally in the browser.
