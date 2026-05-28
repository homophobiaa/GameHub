import { GameScene } from "./GameScene.js";
import {
  getStoredPlayerTag,
  hasLeaderboardTag,
  readLeaderboard,
  savePlayerTag,
} from "../systems/leaderboard.js";

function renderLeaderboard() {
  const entries = readLeaderboard().slice(0, 10);
  if (entries.length === 0) {
    return `<p class="leaderboard-empty">No scores yet.</p>`;
  }

  return `
    <ol class="leaderboard-list">
      ${entries.map((entry) => `
        <li>
          <span>${entry.tag}</span>
          <strong>${entry.score}</strong>
        </li>
      `).join("")}
    </ol>
  `;
}

export class MenuScene {
  constructor({ manager }) {
    this.manager = manager;
  }

  mount(root) {
    this.el = document.createElement("section");
    this.el.className = "scene menu-scene";
    this.el.innerHTML = `
      <div class="menu-shell">
        <aside class="menu-side">
          <section class="tag-panel">
            <label class="tag-field">
              <span>Tag</span>
              <input
                data-player-tag
                maxlength="3"
                pattern="[A-Za-z]{3}"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
                value="${getStoredPlayerTag()}"
                aria-label="Player tag"
              >
            </label>
          </section>
          <section class="leaderboard-panel">
            <div class="leaderboard-heading">
              <span>Leaderboard</span>
              <small>Best scores</small>
            </div>
            ${renderLeaderboard()}
          </section>
        </aside>
        <section class="menu-main">
          <h1 class="game-title">Trigger Finger</h1>
          <div class="menu-actions">
            <button class="primary-button menu-play-button" data-action="play">Play</button>
          </div>
        </section>
      </div>
    `;

    this.el.addEventListener("click", this.onClick);
    this.el.addEventListener("input", this.onInput);
    window.addEventListener("keydown", this.onKeyDown);
    root.append(this.el);
  }

  getPlayerTag() {
    const input = this.el?.querySelector("[data-player-tag]");
    return savePlayerTag(input?.value);
  }

  onInput = (event) => {
    if (!event.target.matches("[data-player-tag]")) {
      return;
    }

    const cursor = event.target.selectionStart;
    event.target.value = String(event.target.value)
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 3);
    const nextCursor = Math.min(cursor, event.target.value.length);
    event.target.setSelectionRange(nextCursor, nextCursor);
    if (event.target.value.length === 3) {
      savePlayerTag(event.target.value);
    }
  };

  loadDebug = async () => {
    const { DebugScene } = await import("./DebugScene.js");
    this.manager.load(DebugScene, {
      playerTag: this.getPlayerTag(),
      saveScore: false,
    });
  };

  onClick = (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;

    if (action === "play") {
      const playerTag = this.getPlayerTag();
      this.manager.load(GameScene, {
        playerTag,
        tutorialMode: !hasLeaderboardTag(playerTag),
      });
    }
  };

  onKeyDown = (event) => {
    if (event.repeat || (event.key !== "`" && event.code !== "Backquote")) {
      return;
    }

    event.preventDefault();
    this.loadDebug();
  };

  destroy() {
    this.el?.removeEventListener("click", this.onClick);
    this.el?.removeEventListener("input", this.onInput);
    window.removeEventListener("keydown", this.onKeyDown);
    this.el?.remove();
  }
}
