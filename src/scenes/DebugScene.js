import { BULLET_POOL } from "../defs/bullets.js";
import { ENEMY_DEFS, SPECIAL_ENEMY_POOL, getEnemyDef } from "../defs/enemies.js";
import { LANES } from "../config/gameplay.js";
import { getComboCap } from "../systems/timing.js";
import { createEnemy, WaveRunner } from "../systems/waveRunner.js";
import { createStoreOffer } from "../systems/upgrades.js";
import { createDebugWoeChoices } from "../systems/woeDraft.js";
import { renderWhetstoneSlot, renderWreckerSlot } from "../ui/intermissionPanel.js";
import { GameScene } from "./GameScene.js";

const STORE_IDS = ["warehouse", "whetstone", "wrecker", "workshop"];

function selectedAttr(value, selected) {
  return value === selected ? "selected" : "";
}

export class DebugScene extends GameScene {
  constructor(args) {
    super(args);
    this.debugReady = false;
    this.debugPanelOpen = false;
    this.wavesEnabled = false;
    this.invincible = true;
    this.enemiesPaused = false;
    this.debugStoreId = "warehouse";
    this.debugWaveNumber = 1;
    this.debugEnemyType = "basic";
    this.debugLane = 1;
    this.enemyPool = ["basic"];
    this.aspectGrantors = [];
  }

  mount(root) {
    super.mount(root);
    this.el.classList.add("debug-scene");
    this.debugReady = true;
    this.active = true;
    this.intermission = false;
    this.intermissionView.hide();
    this.intermissionView.clear();
    this.track.start(this.beat);
    this.lastWholeBeat = Math.floor(this.beat);
    this.waveRunner.finish();
    this.enableDebugBeatPreview();
    this.editorMessage = "Debug mode. Press Tab for tools.";
  }

  enableDebugBeatPreview() {
    this.suppressBeatBullets = false;
    this.beatBarWinddownTtl = 0;
    this.beatStrip?.classList.remove("is-winding-down");
    this.progressEl?.classList.remove("is-complete-flash");
  }

  showIntermission(isFirst = false) {
    if (!this.debugReady) {
      super.showIntermission(isFirst);
      return;
    }

    this.enableDebugBeatPreview();
    if (this.debugPanelOpen) {
      this.showDebugPanel();
      return;
    }

    this.intermissionView.hide();
  }

  shouldUpdateWaves() {
    return this.wavesEnabled;
  }

  areEnemiesPaused() {
    return this.enemiesPaused;
  }

  canTakeDamage() {
    return !this.invincible;
  }

  handleSceneKey(event) {
    if (event.key !== "Tab") {
      return false;
    }

    event.preventDefault();
    this.toggleDebugPanel();
    return true;
  }

  handleDebugAction(action) {
    if (action === "toggle-panel") {
      this.toggleDebugPanel();
      return true;
    }

    if (action === "toggle-invincible") {
      this.invincible = !this.invincible;
      this.editorMessage = `Invincibility ${this.invincible ? "on" : "off"}.`;
      this.showDebugPanel();
      return true;
    }

    if (action === "toggle-enemy-pause") {
      this.enemiesPaused = !this.enemiesPaused;
      this.editorMessage = `Enemies ${this.enemiesPaused ? "paused" : "moving"}.`;
      this.showDebugPanel();
      return true;
    }

    if (action === "spawn-enemy") {
      this.readDebugControls();
      this.spawnDebugEnemy();
      this.showDebugPanel();
      return true;
    }

    if (action === "clear-enemies") {
      this.enemies = [];
      this.echoes = [];
      this.editorMessage = "Enemies cleared.";
      this.showDebugPanel();
      return true;
    }

    if (action === "open-shop" || action === "refresh-shop") {
      this.readDebugControls();
      this.openDebugStore();
      this.showDebugPanel();
      return true;
    }

    if (action === "open-woe") {
      this.openDebugWoe();
      this.showDebugPanel();
      return true;
    }

    if (action === "play-wave") {
      this.readDebugControls();
      this.playDebugWave();
      this.showDebugPanel();
      return true;
    }

    if (action === "stop-wave") {
      this.stopDebugWave();
      this.showDebugPanel();
      return true;
    }

    return false;
  }

  toggleDebugPanel() {
    this.debugPanelOpen = !this.debugPanelOpen;
    if (this.debugPanelOpen) {
      this.showDebugPanel();
      return;
    }

    this.intermissionView.hide();
    this.clearPlacementHighlights();
  }

  showDebugPanel() {
    this.enableDebugBeatPreview();
    this.debugPanelOpen = true;
    this.intermissionView.renderIntermission({
      isFirst: false,
      waveIndex: this.waveIndex,
      track: this.track,
      choices: this.choices,
      pendingUpgrade: this.pendingUpgrade,
      storeOffer: this.storeOffer,
      storePicks: this.storePicks,
      bankedStorePicks: this.bankedStorePicks,
      whetstoneCandidateUid: this.whetstoneCandidateUid,
      wreckerCandidateUid: this.wreckerCandidateUid,
      scrapChips: this.scrapChips,
      debugTools: this.renderDebugTools(),
      message: this.editorMessage,
    });
  }

  readDebugControls() {
    const enemyType = this.overlay.querySelector("[data-debug-enemy-type]")?.value;
    const lane = Number(this.overlay.querySelector("[data-debug-lane]")?.value);
    const storeId = this.overlay.querySelector("[data-debug-store]")?.value;
    const waveNumber = Number(this.overlay.querySelector("[data-debug-wave]")?.value);

    if (enemyType && ENEMY_DEFS[enemyType]) {
      this.debugEnemyType = enemyType;
    }

    if (Number.isInteger(lane) && LANES.includes(lane)) {
      this.debugLane = lane;
    }

    if (STORE_IDS.includes(storeId)) {
      this.debugStoreId = storeId;
    }

    if (Number.isFinite(waveNumber) && waveNumber >= 1) {
      this.debugWaveNumber = Math.floor(waveNumber);
    }
  }

  spawnDebugEnemy() {
    const enemy = createEnemy(this.debugEnemyType, this.debugLane, {
      healthMultiplier: this.enemyHealthMultiplier(),
      aspectGrantors: this.aspectGrantors,
    });
    enemy.y = 0.12;
    enemy.visualY = -0.08;
    this.spawnEnemy(enemy);
    this.editorMessage = `Spawned ${getEnemyDef(this.debugEnemyType).name}.`;
  }

  openDebugStore() {
    this.pendingWoe = false;
    this.woeChoices = [];
    this.storeOffer = createStoreOffer(this.track, {
      ...this.getRunState(),
      forceStoreId: this.debugStoreId,
    });
    this.choices = this.storeOffer.choices;
    this.storePicks = 99;
    this.pendingUpgrade = true;
    this.editorMessage = `${this.storeOffer.store.name} opened with free picks.`;
  }

  openDebugWoe() {
    this.storeOffer = null;
    this.choices = [];
    this.storePicks = 0;
    this.pendingUpgrade = false;
    this.whetstoneCandidateUid = null;
    this.wreckerCandidateUid = null;
    this.pendingWoe = true;
    this.woeChoices = createDebugWoeChoices(this.enemyPool, this.aspectGrantors);
    this.editorMessage = "Woe opened with every special option.";
  }

  playDebugWave() {
    this.waveIndex = Math.max(0, this.debugWaveNumber - 1);
    this.waveRunner = new WaveRunner();
    this.resetWaveResources();
    this.prepareTrackForWaveStart();
    this.waveRunner.start(this.waveIndex, this.beat, {
      enemyPool: this.enemyPool,
      healthMultiplier: this.enemyHealthMultiplier(),
      aspectGrantors: this.aspectGrantors,
      platingReserve: this.plating,
    });
    this.wavesEnabled = true;
    this.active = true;
    this.intermission = false;
    this.enemies = [];
    this.effects = [];
    this.floaters = [];
    this.echoes = [];
    this.waveKills = 0;
    this.visualWaveProgress = 0;
    this.waveClearOutro = false;
    this.waveClearOutroTimer = 0;
    this.waveProgressFlashTtl = 0;
    this.beatBarWinddownTtl = 0;
    this.suppressBeatBullets = false;
    this.progressEl?.classList.remove("is-complete-flash");
    this.beatStrip?.classList.remove("is-winding-down");
    this.editorMessage = `Playing wave ${this.debugWaveNumber}.`;
  }

  stopDebugWave() {
    this.waveRunner.finish();
    this.wavesEnabled = false;
    this.resetPlatingFinisher();
    this.enableDebugBeatPreview();
    this.editorMessage = "Wave player stopped.";
  }

  clearWave() {
    this.waveRunner.finish();
    this.wavesEnabled = false;
    this.resetPlatingFinisher();
    this.score += 260 + this.waveIndex * 40;
    this.visualWaveProgress = 0;
    this.waveProgressFlashTtl = 0;
    this.beatBarWinddownTtl = 0;
    this.enableDebugBeatPreview();
    this.editorMessage = `Wave ${this.waveIndex + 1} complete.`;
    if (this.debugPanelOpen) {
      this.showDebugPanel();
    }
  }

  renderDebugChoiceList() {
    if (this.pendingWoe) {
      return `
        <div class="debug-shop-list">
          <span class="debug-section-title">Woe | free</span>
          ${this.woeChoices.map((choice) => {
            const isAlreadyActive = choice.kind === "aspect"
              ? this.aspectGrantors.includes(choice.type)
              : this.enemyPool.includes(choice.type);
            return `
              <button class="debug-tool-button ${isAlreadyActive ? "is-active" : ""}" data-action="woe-choice:${choice.kind}:${choice.type}">
                <span>${choice.title}</span>
                <small>${choice.copy}</small>
              </button>
            `;
          }).join("")}
        </div>
      `;
    }

    if (this.storeOffer?.store.id === "whetstone") {
      const upgradeableCount = this.track.allPieces.filter((piece) => !piece.upgraded).length;
      return `
        <div class="debug-shop-list">
          <span class="debug-section-title">${this.storeOffer.store.name} | free</span>
          ${renderWhetstoneSlot(this.track, upgradeableCount === 0, this.whetstoneCandidateUid)}
        </div>
      `;
    }

    if (this.storeOffer?.store.id === "wrecker") {
      const scrappableCount = this.getScrappablePieceCount();
      return `
        <div class="debug-shop-list">
          <span class="debug-section-title">${this.storeOffer.store.name} | free</span>
          ${renderWreckerSlot(this.track, scrappableCount === 0, this.wreckerCandidateUid)}
        </div>
      `;
    }

    if (!this.storeOffer || this.choices.length === 0) {
      return `<p class="inventory-empty">No debug shop open.</p>`;
    }

    return `
      <div class="debug-shop-list">
        <span class="debug-section-title">${this.storeOffer.store.name} | free</span>
        ${this.choices.map((choice, index) => `
          <button class="debug-tool-button" data-action="choice:${index}">
            <span>${choice.title}</span>
            <small>${choice.copy}</small>
          </button>
        `).join("")}
      </div>
    `;
  }

  renderDebugTools() {
    const enemyOptions = Object.values(ENEMY_DEFS)
      .map((def) => `<option value="${def.id}" ${selectedAttr(def.id, this.debugEnemyType)}>${def.name}</option>`)
      .join("");
    const storeOptions = STORE_IDS
      .map((id) => `<option value="${id}" ${selectedAttr(id, this.debugStoreId)}>${id}</option>`)
      .join("");
    const laneLabels = ["Left", "Mid", "Right"];
    const laneOptions = LANES
      .map((lane) => `<option value="${lane}" ${selectedAttr(lane, this.debugLane)}>${laneLabels[lane] ?? lane}</option>`)
      .join("");
    const comboCap = getComboCap({ comboCap: this.comboCap }).toFixed(2);
    const damageMultiplier = this.damageMultiplier().toFixed(2);

    return `
      <div class="debug-tools">
        <div class="store-header">
          <span>Debug Tools</span>
          <small>Tab toggles this panel. The play area uses the normal game scene.</small>
          <small>${this.wavesEnabled ? `Wave ${this.waveIndex + 1} running` : "Waves disabled"} | ${this.enemies.length} enemies | damage x${damageMultiplier} / cap x${comboCap}</small>
        </div>

        <div class="debug-tool-grid">
          <button class="debug-tool-button ${this.invincible ? "is-active" : ""}" data-debug-action="toggle-invincible">
            Invincible ${this.invincible ? "On" : "Off"}
          </button>
          <button class="debug-tool-button ${this.enemiesPaused ? "is-active" : ""}" data-debug-action="toggle-enemy-pause">
            Enemies ${this.enemiesPaused ? "Paused" : "Moving"}
          </button>
          <button class="debug-tool-button" data-debug-action="clear-enemies">Clear Enemies</button>
        </div>

        <label class="debug-field">
          <span>Enemy</span>
          <select data-debug-enemy-type>${enemyOptions}</select>
        </label>
        <label class="debug-field">
          <span>Lane</span>
          <select data-debug-lane>
            ${laneOptions}
          </select>
        </label>
        <button class="debug-tool-button" data-debug-action="spawn-enemy">Spawn Enemy</button>

        <label class="debug-field">
          <span>Shop</span>
          <select data-debug-store>${storeOptions}</select>
        </label>
        <button class="debug-tool-button" data-debug-action="open-shop">Open Free Shop</button>
        <button class="debug-tool-button" data-debug-action="open-woe">Open Free Woe</button>
        ${this.renderDebugChoiceList()}

        <label class="debug-field">
          <span>Wave</span>
          <input data-debug-wave type="number" min="1" step="1" value="${this.debugWaveNumber}">
        </label>
        <div class="debug-tool-grid">
          <button class="debug-tool-button" data-debug-action="play-wave">Play Wave</button>
          <button class="debug-tool-button" data-debug-action="stop-wave">Stop Wave</button>
        </div>

        <div class="debug-pool">
          <span class="debug-section-title">Woe Pool</span>
          <small>${this.enemyPool
            .filter((type) => type !== "basic")
            .map((type) => getEnemyDef(type).name)
            .join(", ") || "No specials"}</small>
          <small>Spreading: ${this.aspectGrantors.map((type) => getEnemyDef(type).name).join(", ") || "None"}</small>
        </div>
        <div class="debug-pool">
          <span class="debug-section-title">Bullets</span>
          <small>${BULLET_POOL.join(", ")}</small>
        </div>
      </div>
    `;
  }
}
