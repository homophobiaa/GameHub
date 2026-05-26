# SIMON

## 🕹️ How to Play

1.  **Select a Profile**: Enter your name to create a new profile or select an existing one.
2.  **Start the Game**: Click **START** or press **Space**.
3.  **Watch the Sequence**: The game will flash a series of colored buttons in a specific order.
4.  **Repeat the Sequence**: Click the buttons in the exact same order.
5.  **Quick time Events**: Orange and Blue cirles will appear randomly. Don't miss the ORANGE circle and avoid the BLUE.
6.  **Advance**: Every successful round adds one more color to the sequence.
7.  **Game Over**: If you press the wrong button, the game resets. Try to beat your "Best" score!

## ⌨️ Keyboard Controls

| Key | Action |
| :--- | :--- |
| **Space** | Start / Restart Game |
| **W** | Top-Lest Button |
| **E** | Top-Right Button |
| **S** | Bottom-Left Button |
| **D** | Bottom-Right Button |

## 🚀 Features

- **Profile System**: Create multiple player profiles to track individual progress.
- **Session Leaderboard**: Compete against other players or your own best scores.
- **Adaptive Difficulty**: Three speed settings — **Normal**, **Fast**, and **Ludicrous**.
- **Procedural Audio**: Real-time sound generation using the Web Audio API (no external audio files required).
- **Responsive Controls**: Fully playable via mouse, touch, or keyboard.

## 🛠️ Technical Overview

- **Language**: Vanilla JavaScript, HTML5, CSS3.
- **Audio**: Built with the **Web Audio API** using oscillators and gain nodes for synthesized tones.
- **Data Persistence**: Uses `sessionStorage` to keep profiles and high scores active for the duration of the browser session.
- **Styling**: Leverages CSS Variables for easy theme management and CSS Keyframe animations for visual feedback (flicker, bump, and toast notifications).

## 📂 Installation

1.  Save the `index.html` file to your computer.
2.  Open the file in any modern web browser (Chrome, Firefox, Edge, Safari).
3.  No internet connection or local server is required.