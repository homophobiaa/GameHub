import { GameScene } from "./GameScene.js";
import { MenuScene } from "./MenuScene.js";

export class TutorialScene {
  constructor({ manager }) {
    this.manager = manager;
  }

  mount(root) {
    this.el = document.createElement("section");
    this.el.className = "scene tutorial-scene";
    this.el.innerHTML = `
      <div class="tutorial-shell">
        <h1 class="game-title">Tutorial</h1>
        <ul class="tutorial-list">
          <li><strong>Fire lanes:</strong> A/S/D, J/K/L, arrow keys, or the lane buttons.</li>
          <li><strong>Read the track:</strong> the bright tile is the next placed bullet. On beat is the end of the bar; off beat is the middle.</li>
          <li><strong>Edit between waves:</strong> drag bullets between inventory and the beat timeline. Domains cannot overlap.</li>
          <li><strong>Bad shots fire immediately:</strong> early or late shots do not advance the bullet loop.</li>
          <li><strong>Missed beats do not stack:</strong> waiting keeps your current bullet for the next valid timing.</li>
          <li><strong>Clear waves:</strong> between waves, replace, upgrade, add, and reorder bullets before starting again.</li>
        </ul>
        <div class="tutorial-actions">
          <button class="primary-button" data-action="play">Play</button>
          <button class="secondary-button" data-action="menu">Menu</button>
        </div>
      </div>
    `;

    this.el.addEventListener("click", this.onClick);
    root.append(this.el);
  }

  onClick = (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;

    if (action === "play") {
      this.manager.load(GameScene);
    }

    if (action === "menu") {
      this.manager.load(MenuScene);
    }
  };

  destroy() {
    this.el?.removeEventListener("click", this.onClick);
    this.el?.remove();
  }
}
