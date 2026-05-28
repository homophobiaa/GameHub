import { GameScene } from "./GameScene.js";
import { TutorialScene } from "./TutorialScene.js";

export class MenuScene {
  constructor({ manager }) {
    this.manager = manager;
  }

  mount(root) {
    this.el = document.createElement("section");
    this.el.className = "scene menu-scene";
    this.el.innerHTML = `
      <div class="menu-shell">
        <h1 class="game-title">Trigger Finger</h1>
        <div class="menu-actions">
          <button class="primary-button" data-action="play">Play</button>
          <button class="secondary-button" data-action="tutorial">Tutorial</button>
          <button class="secondary-button" data-action="debug">Debug</button>
        </div>
      </div>
    `;

    this.el.addEventListener("click", this.onClick);
    root.append(this.el);
  }

  onClick = async (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;

    if (action === "play") {
      this.manager.load(GameScene);
    }

    if (action === "tutorial") {
      this.manager.load(TutorialScene);
    }

    if (action === "debug") {
      const { DebugScene } = await import("./DebugScene.js");
      this.manager.load(DebugScene);
    }
  };

  destroy() {
    this.el?.removeEventListener("click", this.onClick);
    this.el?.remove();
  }
}
