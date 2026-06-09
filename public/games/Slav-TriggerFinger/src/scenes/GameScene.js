import {
  STARTING_TRACK,
  getBulletDef,
  getElapseHalf,
  getSlotColor,
  getSlotFollowBeats,
  getSlotName,
  isElapsePiece,
} from "../defs/bullets.js";
import {
  CHIP_CORNERS,
  CHIP_CORNER_LABELS,
  CHIP_TUNING,
  getChunkCountForSource,
} from "../defs/chips.js";
import { getAspectForSource } from "../defs/aspects.js";
import { ENEMY_KILL_SCORE, getEnemyDef } from "../defs/enemies.js";
import { BeatTrack } from "../systems/track.js";
import {
  applyEnemyBeatEffects,
  applyAspectToBasic,
  getEnemySpeedMultipliers,
  getLaneSpeedBoosts,
  pickAspectSpreadTargets,
  updateCheerLeadStates,
  updateLeapEnemy,
} from "../systems/enemyRuntime.js";
import {
  resolveBulletShot,
  resolveElapseFinish,
  resolveElapseStart,
  resolvePairChipShot,
  resolvePiercingImpact,
  updateDamageOverTime,
  updateElapseBeamDamage,
} from "../systems/combat.js";
import { createEnemy, WaveRunner } from "../systems/waveRunner.js";
import { applyUpgradeChoice, createStoreOffer } from "../systems/upgrades.js";
import { createWoeChoices, shouldOfferWoe } from "../systems/woeDraft.js";
import { getDamageMultiplier, rateTiming } from "../systems/timing.js";
import { createEnemyFrameIndex } from "../systems/enemyFrameIndex.js";
import { knockEnemyBack } from "../systems/combatPrimitives.js";
import {
  KNOCKBACK_SIMULATION_STEP_SECONDS,
  placeEnemyAtLaneBack,
  resolveEnemyLaneSpacing,
  updateEnemyKnockbacks,
  updateKnockbackRecoverySpeedMultiplier,
} from "../systems/enemyCollision.js";
import {
  BEAT_BURST_SECONDS,
  BEAT_FLASH_SECONDS,
  ASPECT_SPREAD_TARGET_COUNT,
  ENEMY_BREACH_Y,
  GOOD_WINDOW_BEATS,
  LANE_COUNT,
  PROJECTILE_END_Y,
  SHOCKWAVE_MIN_Y,
  STARTING_PLATING,
  TRACK_WAVE_START_LEAD_BEATS,
} from "../config/gameplay.js";
import { GameRenderer } from "../render/GameRenderer.js";
import { getComboMeterRects } from "../render/comboMeterRenderer.js";
import { BeatBarView, markerOffsetPercent } from "../ui/beatBarView.js";
import { appendCombatEvents } from "../ui/combatEventView.js";
import { IntermissionView } from "../ui/intermissionView.js";
import { playShockwaveScreenEffect } from "../ui/screenEffects.js";
import { clearTutorialOverlay, renderReadyCheckTutorialOverlay } from "../ui/tutorialOverlayView.js";
import { updateWaveProgressView } from "../ui/waveProgressView.js";
import { getStoredPlayerTag, normalizePlayerTag, recordLeaderboardScore } from "../systems/leaderboard.js";
import { createGameplayTutorialController } from "../systems/gameplayTutorial.js";
import { EPSILON, isOnBeat, nextHalfBeatAfter } from "../utils/beatMath.js";
import { clamp } from "../utils/math.js";
import { MenuScene } from "./MenuScene.js";

const LANE_KEYS = new Map([
  ["a", 0],
  ["s", 1],
  ["d", 2],
  ["j", 0],
  ["k", 1],
  ["l", 2],
  ["arrowleft", 0],
  ["arrowdown", 1],
  ["arrowright", 2],
]);

const WAVE_CLEAR_OUTRO_SECONDS = 0.85;
const WAVE_PROGRESS_FLASH_SECONDS = 0.5;
const BEAT_BAR_WINDDOWN_SECONDS = 0.7;
const CHIP_CORNER_SET = new Set(CHIP_CORNERS);
const ENEMY_DEATH_PUFF_SECONDS = 0.34;
const RESOURCE_FLASH_SECONDS = 0.36;
const RESOURCE_RECENTER_SECONDS = 0.24;
const PLATING_FINISH_TRAIL_SECONDS = 0.38;
const PLATING_FINISH_CLEAR_DELAY_SECONDS = 0.45;
const PLATING_FINISH_OUTRO_EXTRA_SECONDS = 0.35;
const PLATING_FINISH_COLOR = "#d9e2ef";
const PLATING_FINISH_SPECIAL_GRACE_SECONDS = 1.0;
const FIRST_WAVE_TUTORIAL_KILL_TARGET = 3;
const FIRST_WAVE_TUTORIAL_COMPLETE_DELAY_SECONDS = 1.0;
const FIRST_WAVE_TUTORIAL_ENEMY_Y = 0.32;
const FIRST_WAVE_TUTORIAL_SPAWN_WARNING_SECONDS = 0.75;
const PLATING_IMPACT_SECONDS = 0.32;
const PLATING_IMPACT_RADIUS = 10;
const PLATING_IMPACT_GROWTH = 54;
export class GameScene {
  constructor({ manager, props = {} }) {
    this.manager = manager;
    this.props = props;
    this.track = new BeatTrack(STARTING_TRACK);
    this.waveRunner = new WaveRunner();
    this.enemies = [];
    this.effects = [];
    this.floaters = [];
    this.echoes = [];
    this.pendingChipShots = [];
    this.pendingPiercingImpacts = [];
    this.pendingAspectSpreads = [];
    this.pendingPlatingStrikes = [];
    this.platingFinisherActive = false;
    this.platingFinisherTriggered = false;
    this.platingFinisherClearDelay = 0;
    this.platingFinisherDelayUntil = -Infinity;
    this.activeElapse = null;
    this.frameEnemyIndex = null;
    this.knockbackStepAccumulator = 0;
    this.beat = 0;
    this.runSeconds = 0;
    this.beatSeconds = 1;
    this.score = 0;
    this.playerTag = normalizePlayerTag(props.playerTag ?? getStoredPlayerTag());
    this.scoreSaveResult = null;
    this.tutorial = createGameplayTutorialController({
      enabled: Boolean(props.tutorialMode),
      tag: this.playerTag,
    });
    this.combo = 0;
    this.comboCap = 1.5;
    this.maxPlating = STARTING_PLATING;
    this.plating = this.maxPlating;
    this.maxShockwaves = 0;
    this.shockwaves = 0;
    this.resourceFlashes = [];
    this.resourceFlashState = {
      plating: this.plating,
      shockwaves: this.shockwaves,
    };
    this.resourceTransitions = {
      plating: null,
      shockwaves: null,
    };
    this.waveIndex = 0;
    this.waveKills = 0;
    this.visualWaveProgress = 0;
    this.waveClearOutro = false;
    this.waveClearOutroTimer = 0;
    this.waveProgressFlashTtl = 0;
    this.beatBarWinddownTtl = 0;
    this.suppressBeatBullets = false;
    this.active = false;
    this.intermission = true;
    this.lastShotAt = -999;
    this.lastWholeBeat = 0;
    this.pendingUpgrade = false;
    this.choices = [];
    this.storeOffer = null;
    this.storePicks = 0;
    this.bankedStorePicks = 0;
    this.shopCycleIndex = 0;
    this.enemyPool = ["basic"];
    this.aspectGrantors = [];
    this.pendingWoe = false;
    this.woeChoices = [];
    this.editorMessage = "";
    this.beatFlashKind = "";
    this.beatFlashTtl = 0;
    this.beatBursts = [];
    this.beatBurstSerial = 0;
    this.beatBarView = null;
    this.dragProxy = null;
    this.dragSource = null;
    this.dragPayload = null;
    this.storeSlotAnimating = false;
    this.whetstoneCandidateUid = null;
    this.wreckerCandidateUid = null;
    this.scrapChips = [];
    this.scrapChipSerial = 0;
    this.lastScrappedChipUids = [];
    this.activeElapse = null;
    this.pointerLane = null;
    this.tutorialEnemyId = null;
    this.gameplayInputDisabled = false;
    this.tutorialBeatPauseTarget = null;
    this.tutorialBeatPauseActive = false;
    this.tutorialBeatPauseConsumed = false;
    this.tutorialTimelinePaused = false;
    this.tutorialAllowedLanes = null;
    this.tutorialChallengeKills = 0;
    this.tutorialChallengeActive = false;
    this.tutorialChallengeCompleteTimer = null;
    this.tutorialSpawnQueue = [];
  }

  mount(root) {
    this.el = document.createElement("section");
    this.el.className = "scene game-scene";
    this.el.innerHTML = `
      <div class="screen-effects" data-screen-effects></div>
      <header class="hud">
        <div class="hud-item"><span class="hud-label">Wave</span><span class="hud-value" data-hud="wave">1</span></div>
        <div class="hud-item"><span class="hud-label">Score</span><span class="hud-value" data-hud="score">0</span></div>
        <div class="hud-item"><span class="hud-label">Combo</span><span class="hud-value" data-hud="combo">x1.00</span></div>
        <div class="hud-item"><span class="hud-label">Plating</span><span class="hud-value" data-hud="plating">3</span></div>
        <div class="hud-item"><span class="hud-label">Shock</span><span class="hud-value" data-hud="shockwaves">0</span></div>
        <div class="hud-item"><span class="hud-label">Next</span><span class="hud-value" data-hud="next">Stinger</span></div>
      </header>
      <div class="beat-strip" data-beat-strip>
        <div class="beat-count" data-beat-count>1</div>
        <div class="beat-rail" data-beat-rail>
          <div class="beat-rail-line"></div>
          <div class="beat-center"></div>
          <div class="beat-marker-layer" data-beat-markers></div>
        </div>
      </div>
      <div class="canvas-wrap">
        <canvas class="game-canvas"></canvas>
        <div class="overlay" data-overlay></div>
      </div>
      <footer class="wave-progress" data-wave-progress></footer>
    `;

    this.canvas = this.el.querySelector("canvas");
    this.renderer = new GameRenderer(this.canvas);
    this.overlay = this.el.querySelector("[data-overlay]");
    this.intermissionView = new IntermissionView(this.overlay);
    this.screenEffects = this.el.querySelector("[data-screen-effects]");
    this.progressEl = this.el.querySelector("[data-wave-progress]");
    this.beatCount = this.el.querySelector("[data-beat-count]");
    this.beatStrip = this.el.querySelector("[data-beat-strip]");
    this.beatMarkers = this.el.querySelector("[data-beat-markers]");
    this.beatBarView = new BeatBarView({
      beatCount: this.beatCount,
      beatStrip: this.beatStrip,
      beatMarkers: this.beatMarkers,
    });
    this.hud = Object.fromEntries(
      [...this.el.querySelectorAll("[data-hud]")].map((node) => [node.dataset.hud, node]),
    );

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(this.canvas);
    this.el.addEventListener("click", this.onClick);
    this.el.addEventListener("contextmenu", this.onContextMenu);
    this.overlay.addEventListener("dragstart", this.onDragStart);
    this.overlay.addEventListener("dragover", this.onDragOver);
    this.overlay.addEventListener("drop", this.onDrop);
    this.overlay.addEventListener("dragend", this.onDragEnd);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("pointerup", this.onPointerUp);
    root.append(this.el);
    this.resize();
    this.showIntermission(true);
  }

  onContextMenu = (event) => {
    event.preventDefault();
  };

  handleTutorialClick(event) {
    const layer = event.target.closest("[data-game-tutorial-layer]");
    if (!layer) {
      return false;
    }

    if (
      this.intermission &&
      this.tutorial.isReadyCheckBlocking()
    ) {
      event.preventDefault();
      this.tutorial.advanceReadyCheckStep();
      this.syncTutorialOverlay();
      return true;
    }

    if (!this.intermission && this.tutorial.isGameplayBlocking()) {
      event.preventDefault();
      const step = this.tutorial.advanceGameplayStep();
      if (step?.id === "enemy-intro") {
        this.beginFirstWaveTutorialTimeline();
      } else if (step?.id === "beat-tracker-combo") {
        this.continueFirstWaveTutorialTimeline();
      }
      this.syncTutorialOverlay();
      return true;
    }

    return false;
  }

  resize = () => {
    this.renderer?.resize();
    this.syncTutorialOverlay();
  };

  onClick = (event) => {
    const debugAction = event.target.closest("[data-debug-action]")?.dataset.debugAction;
    if (debugAction && this.handleDebugAction(debugAction, event)) {
      return;
    }

    if (this.handleTutorialClick(event)) {
      return;
    }

    if (this.storeSlotAnimating) {
      return;
    }

    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) {
      return;
    }

    if (action === "menu") {
      this.persistRunScore();
      this.manager.load(MenuScene);
    }

    if (action === "start-wave") {
      this.startWave();
    }

    if (action === "skip-store") {
      this.skipStore();
    }

    if (action === "hone-candidate") {
      this.honeCandidate();
      return;
    }

    if (action === "wreck-candidate") {
      this.wreckCandidate();
      return;
    }

    if (action.startsWith("woe-choice:")) {
      const [, kind, type] = action.split(":");
      this.chooseWoeChoice(type ?? kind, type ? kind : null);
    }

    if (action.startsWith("select-piece:")) {
      this.track.setSelected(action.split(":")[1]);
      this.editorMessage = "";
      this.showIntermission();
    }

    if (action.startsWith("choice:")) {
      const index = Number(action.split(":")[1]);
      const choice = this.choices[index];
      if (this.storePicks <= 0) {
        this.editorMessage = "No store picks left.";
        this.showIntermission();
        return;
      }

      if (choice) {
        const runState = this.getRunState();
        applyUpgradeChoice(this.track, choice, runState);
        this.comboCap = runState.comboCap;
        this.maxPlating = runState.maxPlating;
        this.plating = runState.plating;
        this.maxShockwaves = runState.maxShockwaves;
        this.shockwaves = runState.shockwaves;
        this.storePicks = Math.max(0, this.storePicks - 1);
        this.choices.splice(index, 1);
        this.editorMessage = "";
        if (this.storePicks <= 0 || this.choices.length === 0) {
          const leftoverPicks = Math.max(0, this.storePicks);
          this.bankedStorePicks += leftoverPicks;
          this.pendingUpgrade = false;
          this.storePicks = 0;
          if (this.storeOffer) {
            this.storeOffer = {
              ...this.storeOffer,
              choices: this.choices,
            };
          }
          if (leftoverPicks > 0) {
            this.editorMessage = `${leftoverPicks} unused pick${leftoverPicks === 1 ? "" : "s"} banked for the next store.`;
          }
        } else if (this.storeOffer) {
          this.storeOffer = {
            ...this.storeOffer,
            choices: this.choices,
          };
        }
        this.showIntermission();
      }
    }
  };

  onDragStart = (event) => {
    if (this.storeSlotAnimating) {
      event.preventDefault();
      return;
    }

    const chip = event.target.closest("[data-chip-uid]");
    if (chip && event.dataTransfer) {
      const payload = {
        kind: "chip",
        chipUid: chip.dataset.chipUid,
        source: chip.dataset.chipSource,
      };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify(payload));
      event.dataTransfer.setDragImage(this.getTransparentDragImage(), 0, 0);
      this.startDragProxy(chip, event);
      this.dragPayload = payload;
      this.highlightValidChipPlacements(payload.chipUid);
      return;
    }

    const piece = event.target.closest("[data-piece-uid]");
    if (!piece || !event.dataTransfer) {
      return;
    }

    const payload = {
      kind: "piece",
      uid: piece.dataset.pieceUid,
      source: piece.dataset.pieceSource,
    };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
    event.dataTransfer.setDragImage(this.getTransparentDragImage(), 0, 0);
    this.track.setSelected(payload.uid);
    this.startDragProxy(piece, event);
    this.dragPayload = payload;
    this.highlightValidPlacements(payload.uid);
  };

  onDragOver = (event) => {
    this.moveDragProxy(event);
    const chipDrop = event.target.closest("[data-chip-drop-host][data-chip-drop-corner]");
    const whetstoneDrop = event.target.closest("[data-whetstone-drop]");
    const wreckerDrop = event.target.closest("[data-wrecker-drop]");
    const inventoryDrop = event.target.closest("[data-inventory-drop]");
    const isChipDrag = this.dragPayload?.kind === "chip";
    const pieceDrop = isChipDrag ? null : this.getPieceDropTarget(event);
    const isTimelineIntent = !isChipDrag && this.isPointerInsideTimeline(event);
    this.updateDropHover(pieceDrop?.element ?? null);
    this.updateChipDropHover(isChipDrag ? chipDrop : null);

    if (
      (isChipDrag && (chipDrop || inventoryDrop)) ||
      pieceDrop ||
      (whetstoneDrop && this.canHonePiece(this.dragPayload?.uid)) ||
      (wreckerDrop && this.canWreckPiece(this.dragPayload?.uid)) ||
      (inventoryDrop && !isChipDrag && !isTimelineIntent) ||
      isTimelineIntent
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  };

  onDrop = (event) => {
    const data = event.dataTransfer?.getData("text/plain");
    if (!data) {
      return;
    }

    event.preventDefault();
    const payload = JSON.parse(data);
    const chipDrop = event.target.closest("[data-chip-drop-host][data-chip-drop-corner]");
    const whetstoneDrop = event.target.closest("[data-whetstone-drop]");
    const wreckerDrop = event.target.closest("[data-wrecker-drop]");
    const chipTrayDrop = event.target.closest("[data-chip-tray-drop]");
    const pieceDrop = payload.kind === "piece" ? this.getPieceDropTarget(event, payload) : null;

    if (payload.kind === "chip") {
      if (chipDrop) {
        this.endDragProxy();
        this.placeChipAt(
          payload.chipUid,
          chipDrop.dataset.chipDropHost,
          chipDrop.dataset.chipDropCorner,
        );
        return;
      }

      if (chipTrayDrop || event.target.closest("[data-inventory-drop]")) {
        const didReturn = this.returnChipToTray(payload.chipUid);
        if (didReturn) {
          this.editorMessage = chipTrayDrop
            ? "Chunk returned to the tray."
            : "Chunk returned with the inventory.";
        }
        this.endDragProxy();
        this.showIntermission();
        return;
      }

      this.editorMessage = "Chunks need an open bullet corner.";
      this.endDragProxy();
      this.showIntermission();
      return;
    }

    if (whetstoneDrop) {
      this.whetstoneCandidateUid = this.canHonePiece(payload.uid) ? payload.uid : null;
      this.wreckerCandidateUid = null;
      this.track.setSelected(payload.uid);
      this.editorMessage = this.whetstoneCandidateUid
        ? "Click the Whetstone panel to hone."
        : "That bullet cannot be upgraded.";
      this.endDragProxy();
      this.showIntermission();
      return;
    }

    if (wreckerDrop) {
      this.wreckerCandidateUid = this.canWreckPiece(payload.uid) ? payload.uid : null;
      this.whetstoneCandidateUid = null;
      this.track.setSelected(payload.uid);
      this.editorMessage = this.wreckerCandidateUid
        ? "Click the Wrecker panel to scrap."
        : "That bullet cannot be scrapped.";
      this.endDragProxy();
      this.showIntermission();
      return;
    }

    if (pieceDrop) {
      this.track.setSelected(payload.uid);
      this.endDragProxy();
      this.placeSelectedAt(pieceDrop.beat);
      return;
    }

    if (this.isPointerInsideTimeline(event)) {
      this.editorMessage = "Use a highlighted beat marker.";
      this.endDragProxy();
      this.showIntermission();
      return;
    }

    if (event.target.closest("[data-inventory-drop]")) {
      this.moveDragProxy(event);
      const returnSnapshot = this.getInventoryReturnSnapshot();
      const hostUids = this.getPieceRemovalUids(this.track.findPiece(payload.uid)).filter(Boolean);
      const didMove = this.track.movePieceToInventory(payload.uid);
      if (didMove) {
        this.returnChipsForHosts(hostUids);
      }
      this.editorMessage = "";
      this.endDragProxy();
      this.showIntermission();
      if (didMove) {
        this.animateInventoryReturn(payload.uid, returnSnapshot);
      }
    }
  };

  onDragEnd = () => {
    this.endDragProxy();
  };

  isPointerInsideNode(event, node) {
    if (!node) {
      return false;
    }

    const rect = node.getBoundingClientRect();
    return event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
  }

  isPointerInsideTimeline(event) {
    return this.isPointerInsideNode(event, this.overlay?.querySelector(".timeline-body"));
  }

  findDropForBeat(beat) {
    if (!Number.isFinite(beat)) {
      return null;
    }

    return [...this.overlay.querySelectorAll("[data-drop-beat]")]
      .find((drop) => Math.abs(Number(drop.dataset.dropBeat) - beat) < EPSILON) ?? null;
  }

  getPieceDropTarget(event, payload = this.dragPayload) {
    const directDrop = event.target.closest("[data-drop-beat]");
    if (directDrop) {
      return {
        element: directDrop,
        beat: Number(directDrop.dataset.dropBeat),
      };
    }

    if (payload?.kind !== "piece" || !this.isPointerInsideTimeline(event)) {
      return null;
    }

    const hoveredPiece = event.target.closest("[data-piece-uid][data-piece-source]");
    if (
      payload.source === "track" &&
      hoveredPiece?.dataset.pieceUid === payload.uid &&
      hoveredPiece?.dataset.pieceSource === "track"
    ) {
      const beat = this.track.placements.find((placement) => placement.uid === payload.uid)?.beat;
      return Number.isFinite(beat)
        ? {
            element: this.findDropForBeat(beat),
            beat,
          }
        : null;
    }

    const coveredDrop = [...this.overlay.querySelectorAll("[data-drop-beat]")]
      .find((drop) => this.isPointerInsideNode(event, drop));
    if (coveredDrop) {
      return {
        element: coveredDrop,
        beat: Number(coveredDrop.dataset.dropBeat),
      };
    }

    return null;
  }

  getTransparentDragImage() {
    if (!this.transparentDragImage) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      this.transparentDragImage = canvas;
    }

    return this.transparentDragImage;
  }

  startDragProxy(source, event) {
    this.endDragProxy();
    this.dragSource = source;
    source.classList.add("is-drag-source");

    const styles = getComputedStyle(source);
    const proxy = document.createElement("div");
    const timingClass = [...source.classList].find((className) =>
      className.startsWith("is-timing-"),
    );
    const elapseClasses = [...source.classList].filter((className) =>
      className.startsWith("is-elapse-"),
    );
    const upgradedClass = source.classList.contains("is-upgraded") ? "is-upgraded" : "";
    const isScrapChip = source.classList.contains("scrap-chip-token");
    const cornerClass = [...source.classList].find((className) =>
      className.startsWith("is-corner-"),
    );
    proxy.className = [
      "drag-proxy",
      isScrapChip ? "is-scrap-chip" : "",
      timingClass,
      ...elapseClasses,
      upgradedClass,
      cornerClass,
    ]
      .filter(Boolean)
      .join(" ");
    const pieceColor = styles.getPropertyValue("--piece-color").trim();
    const chipColor = styles.getPropertyValue("--chip-color").trim();
    proxy.style.setProperty("--piece-color", pieceColor || chipColor);
    if (chipColor) {
      proxy.style.setProperty("--chip-color", chipColor);
    }
    const dragDomain = this.getDragDomainMetrics(source);
    if (dragDomain) {
      proxy.style.setProperty("--domain-width", `${dragDomain.width}px`);
      proxy.style.setProperty("--domain-offset", `${dragDomain.offset}px`);
      proxy.style.setProperty("--proxy-width", `${dragDomain.proxyWidth}px`);
    }

    if (!isScrapChip) {
      const domain = document.createElement("span");
      domain.className = "drag-proxy-domain";
      proxy.append(domain);
    }

    const visual = source.querySelector(".bullet-glyph, .scrap-chip-body")?.cloneNode(true);
    if (visual) {
      proxy.append(visual);
    }

    document.body.append(proxy);
    this.dragProxy = proxy;
    this.moveDragProxy(event);
  }

  getDragDomainMetrics(source) {
    const widthPercent = Number(source.dataset.domainWidth);
    const offsetPercent = Number(source.dataset.domainOffset);
    const timelineBody = this.overlay?.querySelector(".timeline-body");
    if (!Number.isFinite(widthPercent) || !Number.isFinite(offsetPercent) || !timelineBody) {
      return null;
    }

    const timelinePixelWidth = timelineBody.getBoundingClientRect().width;
    const width = (widthPercent / 100) * timelinePixelWidth;
    const offset = (offsetPercent / 100) * timelinePixelWidth;
    const bulletHalfWidth = 21;
    const leftEdge = Math.min(-bulletHalfWidth, offset - width / 2);
    const rightEdge = Math.max(bulletHalfWidth, offset + width / 2);

    return {
      width: Math.max(2, width),
      offset,
      proxyWidth: Math.max(88, rightEdge - leftEdge + 16),
    };
  }

  moveDragProxy(event) {
    if (!this.dragProxy) {
      return;
    }

    this.dragProxy.style.left = `${event.clientX}px`;
    this.dragProxy.style.top = `${event.clientY}px`;
  }

  endDragProxy() {
    this.dragProxy?.remove();
    this.dragProxy = null;
    this.dragSource?.classList.remove("is-drag-source");
    this.dragSource = null;
    this.dragPayload = null;
    this.clearPlacementHighlights();
  }

  getInventoryReturnSnapshot() {
    const source = this.dragSource;
    if (!source) {
      return null;
    }

    const visual = this.dragProxy?.querySelector(".bullet-glyph") ?? source;
    const rect = visual.getBoundingClientRect();
    const styles = getComputedStyle(source);
    return {
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      color: styles.getPropertyValue("--piece-color").trim(),
      timingClass: [...source.classList].find((className) => className.startsWith("is-timing-")) ?? "",
      extraClasses: [...source.classList]
        .filter((className) => className.startsWith("is-elapse-"))
        .join(" "),
      upgradedClass: source.classList.contains("is-upgraded") ? "is-upgraded" : "",
    };
  }

  getPieceReturnTarget(uid) {
    const source = this.track.isPieceOnTrack(uid) ? "track" : "inventory";
    return this.overlay.querySelector(`[data-piece-uid="${uid}"][data-piece-source="${source}"]`);
  }

  animateInventoryReturn(uid, snapshot) {
    if (!snapshot) {
      return;
    }

    const target = this.getPieceReturnTarget(uid);
    if (!target) {
      console.warn("Missing return animation target", {
        uid,
        source: this.track.isPieceOnTrack(uid) ? "track" : "inventory",
      });
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = [
      "inventory-return-ghost",
      "inventory-token",
      snapshot.timingClass,
      snapshot.extraClasses,
      snapshot.upgradedClass,
    ]
      .filter(Boolean)
      .join(" ");
    ghost.style.setProperty("--piece-color", snapshot.color);
    ghost.style.left = `${snapshot.rect.left}px`;
    ghost.style.top = `${snapshot.rect.top}px`;
    ghost.style.width = `${snapshot.rect.width}px`;
    ghost.style.height = `${snapshot.rect.height}px`;
    ghost.innerHTML = `
      <span class="bullet-glyph ${snapshot.timingClass}">
        <span class="bullet-glyph-main"></span>
      </span>
    `;

    target.classList.add("is-return-arriving");
    document.body.append(ghost);

    const startCenterX = snapshot.rect.left + snapshot.rect.width / 2;
    const startCenterY = snapshot.rect.top + snapshot.rect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const scaleX = targetRect.width / snapshot.rect.width;
    const scaleY = targetRect.height / snapshot.rect.height;
    const animation = ghost.animate(
      [
        {
          opacity: 1,
          transform: "translate(0, 0) scale(1)",
        },
        {
          opacity: 0.96,
          transform: `translate(${targetCenterX - startCenterX}px, ${targetCenterY - startCenterY}px) scale(${scaleX}, ${scaleY})`,
        },
      ],
      {
        duration: 210,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards",
      },
    );

    const cleanup = () => {
      ghost.remove();
      target.classList.remove("is-return-arriving");
    };
    animation.addEventListener("finish", cleanup, { once: true });
    animation.addEventListener("cancel", cleanup, { once: true });
  }

  getSlotStoreSnapshot(slotDrop, source = this.dragSource) {
    if (!source) {
      return null;
    }

    const visual = this.dragProxy?.querySelector(".bullet-glyph") ?? source;
    const visualRect = visual.getBoundingClientRect();
    const socketRect = (slotDrop.querySelector(".slot-store-socket") ?? slotDrop)
      .getBoundingClientRect();
    const styles = getComputedStyle(source);
    return {
      rect: {
        left: visualRect.left,
        top: visualRect.top,
        width: visualRect.width,
        height: visualRect.height,
      },
      socketCenter: {
        x: socketRect.left + socketRect.width / 2,
        y: socketRect.top + socketRect.height / 2,
      },
      color: styles.getPropertyValue("--piece-color").trim(),
      timingClass: [...source.classList].find((className) => className.startsWith("is-timing-")) ?? "",
      extraClasses: [...source.classList]
        .filter((className) => className.startsWith("is-elapse-"))
        .join(" "),
      source,
    };
  }

  async animateWhetstoneHone(uid, snapshot) {
    if (!snapshot || !this.canHonePiece(uid)) {
      this.honePiece(uid);
      return;
    }

    this.storeSlotAnimating = true;
    this.whetstoneCandidateUid = uid;
    snapshot.source?.classList.add("is-store-action-source");
    const ghost = document.createElement("div");
    ghost.className = ["whetstone-upgrade-ghost", "drag-proxy", snapshot.timingClass, snapshot.extraClasses]
      .filter(Boolean)
      .join(" ");
    ghost.style.setProperty("--piece-color", snapshot.color);
    ghost.style.setProperty("--proxy-width", "42px");
    ghost.style.left = `${snapshot.rect.left + snapshot.rect.width / 2}px`;
    ghost.style.top = `${snapshot.rect.top + snapshot.rect.height / 2}px`;
    ghost.innerHTML = `
      <span class="bullet-glyph ${snapshot.timingClass}">
        <span class="bullet-glyph-main"></span>
      </span>
    `;
    document.body.append(ghost);

    const startCenterX = snapshot.rect.left + snapshot.rect.width / 2;
    const startCenterY = snapshot.rect.top + snapshot.rect.height / 2;
    const dx = snapshot.socketCenter.x - startCenterX;
    const dy = snapshot.socketCenter.y - startCenterY;
    const move = ghost.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)" },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(1.05)` },
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards",
      },
    );

    await move.finished.catch(() => {});
    move.cancel();
    ghost.style.left = `${snapshot.socketCenter.x}px`;
    ghost.style.top = `${snapshot.socketCenter.y}px`;
    ghost.style.transform = "translate(-50%, -50%)";
    ghost.classList.add("is-upgraded", "is-honing");
    this.createStoreSparks(snapshot.socketCenter, snapshot.color);

    const didHone = this.applyHonePiece(uid);
    if (!didHone) {
      ghost.remove();
      snapshot.source?.classList.remove("is-store-action-source");
      this.storeSlotAnimating = false;
      this.showIntermission();
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 850));
    const glyphRect = ghost.querySelector(".bullet-glyph")?.getBoundingClientRect() ?? {
      left: snapshot.socketCenter.x - 21,
      top: snapshot.socketCenter.y - 21,
      width: 42,
      height: 42,
    };
    const returnSnapshot = {
      rect: {
        left: glyphRect.left,
        top: glyphRect.top,
        width: glyphRect.width,
        height: glyphRect.height,
      },
      color: snapshot.color,
      timingClass: snapshot.timingClass,
      extraClasses: snapshot.extraClasses,
      upgradedClass: "is-upgraded",
    };
    ghost.remove();
    snapshot.source?.classList.remove("is-store-action-source");
    this.storeSlotAnimating = false;
    this.whetstoneCandidateUid = null;
    this.showIntermission();
    this.animateInventoryReturn(uid, returnSnapshot);
  }

  createStoreSparks(center, color) {
    const sparks = 18;
    for (let i = 0; i < sparks; i += 1) {
      const spark = document.createElement("span");
      const angle = -Math.PI * 0.92 + (Math.PI * 1.84 * i) / Math.max(1, sparks - 1);
      const distance = 28 + (i % 5) * 8;
      spark.className = "store-spark";
      spark.style.left = `${center.x}px`;
      spark.style.top = `${center.y}px`;
      spark.style.setProperty("--spark-color", color);
      document.body.append(spark);
      const animation = spark.animate(
        [
          { opacity: 0, transform: "translate(-50%, -50%) scale(0.45)" },
          { opacity: 1, offset: 0.18, transform: "translate(-50%, -50%) scale(1)" },
          {
            opacity: 0,
            transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(0.18)`,
          },
        ],
        {
          duration: 620,
          delay: (i % 4) * 22,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "forwards",
        },
      );
      animation.addEventListener("finish", () => spark.remove(), { once: true });
      animation.addEventListener("cancel", () => spark.remove(), { once: true });
    }
  }

  createWreckerFlash(center, color) {
    const flash = document.createElement("span");
    flash.className = "wrecker-flash";
    flash.style.left = `${center.x}px`;
    flash.style.top = `${center.y}px`;
    flash.style.setProperty("--spark-color", color);
    document.body.append(flash);
    const animation = flash.animate(
      [
        { opacity: 0, transform: "translate(-50%, -50%) scale(0.35)" },
        { opacity: 0.92, offset: 0.24, transform: "translate(-50%, -50%) scale(1)" },
        { opacity: 0, transform: "translate(-50%, -50%) scale(1.55)" },
      ],
      {
        duration: 420,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards",
      },
    );
    animation.addEventListener("finish", () => flash.remove(), { once: true });
    animation.addEventListener("cancel", () => flash.remove(), { once: true });
  }

  createChipGhost(rect, color) {
    const ghost = document.createElement("div");
    ghost.className = "wrecker-chip-ghost scrap-chip-token";
    ghost.style.setProperty("--chip-color", color);
    ghost.style.setProperty("--piece-color", color);
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.innerHTML = `<span class="scrap-chip-body"></span>`;
    document.body.append(ghost);
    return ghost;
  }

  getChipReturnTarget(chipUid) {
    return this.overlay.querySelector(`[data-chip-uid="${chipUid}"][data-chip-source="inventory"]`);
  }

  animateChipGhostToTarget(chipUid, ghost) {
    if (!chipUid) {
      ghost.remove();
      return Promise.resolve();
    }

    const target = this.getChipReturnTarget(chipUid);
    if (!target) {
      console.warn("Missing chunk animation target", { chipUid });
      ghost.remove();
      return Promise.resolve();
    }

    const startRect = ghost.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    target.classList.add("is-chip-arriving");

    const startCenterX = startRect.left + startRect.width / 2;
    const startCenterY = startRect.top + startRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const scaleX = targetRect.width / startRect.width;
    const scaleY = targetRect.height / startRect.height;
    const animation = ghost.animate(
      [
        { opacity: 1, transform: "translate(0, 0) scale(1)" },
        {
          opacity: 0.98,
          transform: `translate(${targetCenterX - startCenterX}px, ${targetCenterY - startCenterY}px) scale(${scaleX}, ${scaleY})`,
        },
      ],
      {
        duration: 330,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards",
      },
    );

    return animation.finished.catch(() => {}).then(() => {
      ghost.remove();
      target.classList.remove("is-chip-arriving");
    });
  }

  async animateWreckerScrap(uid, snapshot) {
    if (!snapshot || !this.canWreckPiece(uid)) {
      this.wreckPiece(uid);
      return;
    }

    this.storeSlotAnimating = true;
    this.wreckerCandidateUid = uid;
    snapshot.source?.classList.add("is-store-action-source");

    const center = {
      x: snapshot.rect.left + snapshot.rect.width / 2,
      y: snapshot.rect.top + snapshot.rect.height / 2,
    };
    const bulletGhost = document.createElement("div");
    bulletGhost.className = ["wrecker-scrap-ghost", "drag-proxy", snapshot.timingClass, snapshot.extraClasses]
      .filter(Boolean)
      .join(" ");
    bulletGhost.style.setProperty("--piece-color", snapshot.color);
    bulletGhost.style.left = `${center.x}px`;
    bulletGhost.style.top = `${center.y}px`;
    bulletGhost.innerHTML = `
      <span class="bullet-glyph ${snapshot.timingClass}">
        <span class="bullet-glyph-main"></span>
      </span>
    `;
    document.body.append(bulletGhost);

    const crush = bulletGhost.animate(
      [
        { filter: "brightness(1)", transform: "translate(-50%, -50%) scale(1)" },
        { filter: "brightness(1.9)", transform: "translate(-50%, -50%) scale(1.12, 0.82)" },
        { filter: "brightness(1.25)", transform: "translate(-50%, -50%) scale(0.42, 1.08)" },
      ],
      {
        duration: 340,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards",
      },
    );

    await crush.finished.catch(() => {});
    this.createWreckerFlash(center, snapshot.color);
    this.createStoreSparks(center, snapshot.color);
    bulletGhost.remove();

    const chipRect = {
      left: center.x - 12,
      top: center.y - 12,
      width: 24,
      height: 24,
    };
    const piece = this.track.findPiece(uid);
    const chunkCount = piece ? getChunkCountForSource(piece.id) : CHIP_TUNING.chipsPerScrap;
    const chipOffsets = Array.from(
      { length: chunkCount },
      (_, index) => (index - (chunkCount - 1) / 2) * 26,
    );
    const chipGhosts = chipOffsets.map((offset) =>
      this.createChipGhost({ ...chipRect, left: chipRect.left + offset }, snapshot.color)
    );

    const didWreck = this.applyWreckPiece(uid);
    if (!didWreck) {
      chipGhosts.forEach((ghost) => ghost.remove());
      snapshot.source?.classList.remove("is-store-action-source");
      this.storeSlotAnimating = false;
      this.showIntermission();
      return;
    }

    const chipUids = [...this.lastScrappedChipUids];
    snapshot.source?.classList.remove("is-store-action-source");
    this.showIntermission();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await Promise.all(chipGhosts.map((ghost, index) =>
      this.animateChipGhostToTarget(chipUids[index], ghost)
    ));
    this.storeSlotAnimating = false;
    this.wreckerCandidateUid = null;
  }

  highlightValidPlacements(uid) {
    this.syncChunkDomainReductions();
    const timeline = this.overlay.querySelector(".timeline-body");
    timeline?.classList.add("is-dragging");

    this.overlay.querySelectorAll("[data-drop-beat]").forEach((drop) => {
      const result = this.track.canPlace(uid, Number(drop.dataset.dropBeat));
      drop.classList.toggle("is-valid-drop", result.ok);
      drop.classList.toggle("is-invalid-drop", !result.ok);
      drop.title = result.ok ? "Place here" : result.reason;
    });
  }

  highlightValidChipPlacements(chipUid) {
    const timeline = this.overlay.querySelector(".timeline-body");
    timeline?.classList.add("is-chip-dragging");

    this.overlay.querySelectorAll("[data-chip-drop-host][data-chip-drop-corner]").forEach((drop) => {
      const result = this.canPlaceChip(
        chipUid,
        drop.dataset.chipDropHost,
        drop.dataset.chipDropCorner,
      );
      drop.classList.toggle("is-valid-drop", result.ok);
      drop.classList.toggle("is-invalid-drop", !result.ok);
      drop.title = result.ok ? "Place chunk here" : result.reason;
    });
  }

  clearPlacementHighlights() {
    this.overlay?.querySelector(".timeline-body")?.classList.remove("is-dragging");
    this.overlay?.querySelector(".timeline-body")?.classList.remove("is-chip-dragging");
    this.overlay?.querySelectorAll("[data-drop-beat]").forEach((drop) => {
      drop.classList.remove("is-valid-drop", "is-invalid-drop", "is-hover-drop");
      drop.removeAttribute("title");
    });
    this.overlay?.querySelectorAll("[data-chip-drop-host][data-chip-drop-corner]").forEach((drop) => {
      drop.classList.remove("is-valid-drop", "is-invalid-drop", "is-hover-drop");
      drop.removeAttribute("title");
    });
  }

  updateDropHover(activeDrop) {
    this.overlay.querySelectorAll(".timeline-drop.is-hover-drop").forEach((drop) => {
      if (drop !== activeDrop) {
        drop.classList.remove("is-hover-drop");
      }
    });

    activeDrop?.classList.add("is-hover-drop");
  }

  updateChipDropHover(activeDrop) {
    this.overlay.querySelectorAll(".chunk-corner-drop.is-hover-drop").forEach((drop) => {
      if (drop !== activeDrop) {
        drop.classList.remove("is-hover-drop");
      }
    });

    activeDrop?.classList.add("is-hover-drop");
  }

  findChip(chipUid) {
    return this.scrapChips.find((chip) => chip.uid === chipUid) ?? null;
  }

  getChunkDomainSide(corner) {
    if (corner === "top-left" || corner === "bottom-left") {
      return "lead";
    }

    if (corner === "top-right" || corner === "bottom-right") {
      return "follow";
    }

    return null;
  }

  getHostDomainSideBeats(host, side) {
    if (!host) {
      return 0;
    }

    if (side === "lead") {
      return getBulletDef(host.id).leadBeats ?? 0;
    }

    if (side === "follow") {
      return getSlotFollowBeats(host);
    }

    return 0;
  }

  addChunkDomainReduction(reductions, chip) {
    if (chip?.sourceId !== "chip" || !chip.hostUid || !CHIP_CORNER_SET.has(chip.corner)) {
      return;
    }

    const side = this.getChunkDomainSide(chip.corner);
    if (!side) {
      return;
    }

    const entry = reductions.get(chip.hostUid) ?? { lead: 0, follow: 0 };
    entry[side] += CHIP_TUNING.chipDomainReductionBeats;
    reductions.set(chip.hostUid, entry);
  }

  getChunkDomainReductions({ excludeUid = null, include = null } = {}) {
    const reductions = new Map();
    this.scrapChips.forEach((chip) => {
      if (chip.uid !== excludeUid) {
        this.addChunkDomainReduction(reductions, chip);
      }
    });

    if (include) {
      this.addChunkDomainReduction(reductions, include);
    }

    return reductions;
  }

  syncChunkDomainReductions() {
    this.track.setDomainReductions(this.getChunkDomainReductions());
  }

  getReducedDomain(piece, reductions, beat = piece.beat) {
    const reduction = reductions.get(piece.uid) ?? {};
    const leadBeats = Math.max(0, (getBulletDef(piece.id).leadBeats ?? 0) - (reduction.lead ?? 0));
    const followBeats = Math.max(0, getSlotFollowBeats(piece) - (reduction.follow ?? 0));
    return {
      start: beat - leadBeats,
      end: beat + followBeats,
    };
  }

  domainsOverlap(a, b) {
    return a.start < b.end - EPSILON && a.end > b.start + EPSILON;
  }

  trackDomainsFitWithReductions(reductions) {
    const domains = this.track.placements.map((placement) => ({
      placement,
      domain: this.getReducedDomain(placement, reductions),
    }));

    const outOfBounds = domains.find(({ domain }) =>
      domain.start < this.track.domainStartBeat - EPSILON ||
      domain.end > this.track.domainEndBeat + EPSILON
    );
    if (outOfBounds) {
      return false;
    }

    return !domains.some(({ placement, domain }, index) =>
      domains.slice(index + 1).some((other) =>
        placement.uid !== other.placement.uid &&
        this.domainsOverlap(domain, other.domain)
      )
    );
  }

  canRemoveChunkDomainReduction(chipUid) {
    const reductions = this.getChunkDomainReductions({ excludeUid: chipUid });
    return this.trackDomainsFitWithReductions(reductions);
  }

  canPlaceChipDomainReduction(chip, host, corner) {
    if (chip.sourceId !== "chip") {
      return { ok: true };
    }

    const side = this.getChunkDomainSide(corner);
    const sideName = side === "lead" ? "left" : "right";
    const sideCapacity = this.getHostDomainSideBeats(host, side);
    const currentReduction = this.getChunkDomainReductions({ excludeUid: chip.uid })
      .get(host.uid)?.[side] ?? 0;
    if (sideCapacity - currentReduction < CHIP_TUNING.chipDomainReductionBeats - EPSILON) {
      return { ok: false, reason: `That ${sideName} half has no domain to shrink.` };
    }

    const reductions = this.getChunkDomainReductions({
      excludeUid: chip.uid,
      include: {
        ...chip,
        hostUid: host.uid,
        corner,
      },
    });
    if (!this.trackDomainsFitWithReductions(reductions)) {
      return { ok: false, reason: "That chunk is holding bullet domains apart." };
    }

    return { ok: true };
  }

  canPlaceChip(chipUid, hostUid, corner) {
    const chip = this.findChip(chipUid);
    if (!chip) {
      return { ok: false, reason: "Missing chunk." };
    }

    const host = hostUid ? this.track.findPiece(hostUid) : null;
    if (!host) {
      return { ok: false, reason: "Place on a bullet." };
    }

    if (!this.track.isPieceOnTrack(host.uid)) {
      return { ok: false, reason: "Place on a bullet in the track." };
    }

    if (!CHIP_CORNER_SET.has(corner)) {
      return { ok: false, reason: "Pick a bullet corner." };
    }

    if (this.isChunkHostBlocked(host)) {
      return { ok: false, reason: `${getSlotName(host)} has no chunk socket space.` };
    }

    const domainResult = this.canPlaceChipDomainReduction(chip, host, corner);
    if (!domainResult.ok) {
      return domainResult;
    }

    const occupied = this.scrapChips.find((otherChip) =>
      otherChip.uid !== chipUid &&
      otherChip.hostUid === host.uid &&
      otherChip.corner === corner
    );
    if (occupied) {
      return { ok: false, reason: "That chunk corner is occupied." };
    }

    return {
      ok: true,
      hostUid: host.uid,
      hostName: getSlotName(host),
      corner,
      cornerName: CHIP_CORNER_LABELS[corner] ?? corner,
    };
  }

  placeChipAt(chipUid, hostUid, corner) {
    const result = this.canPlaceChip(chipUid, hostUid, corner);
    const chip = this.findChip(chipUid);
    if (result.ok && chip) {
      chip.hostUid = result.hostUid;
      chip.corner = result.corner;
      chip.beat = null;
      this.syncChunkDomainReductions();
      this.editorMessage = `Chunk placed on ${result.hostName}'s ${result.cornerName} corner.`;
    } else {
      this.editorMessage = result.reason;
    }

    this.showIntermission();
  }

  returnChipToTray(chipUid) {
    const chip = this.findChip(chipUid);
    if (!chip) {
      this.editorMessage = "Missing chunk.";
      return false;
    }

    if (chip.sourceId === "chip" && chip.hostUid && !this.canRemoveChunkDomainReduction(chipUid)) {
      this.editorMessage = "That chunk is holding bullet domains apart.";
      return false;
    }

    chip.hostUid = null;
    chip.corner = null;
    chip.beat = null;
    this.syncChunkDomainReductions();
    return true;
  }

  returnChipsForHosts(hostUids) {
    const hostSet = new Set(hostUids.filter(Boolean));
    if (hostSet.size === 0) {
      return;
    }

    this.scrapChips.forEach((chip) => {
      if (hostSet.has(chip.hostUid)) {
        chip.hostUid = null;
        chip.corner = null;
        chip.beat = null;
      }
    });
    this.syncChunkDomainReductions();
  }

  returnInvalidChipPlacements() {
    this.scrapChips.forEach((chip) => {
      if (!chip.hostUid && !chip.corner && !Number.isFinite(chip.beat)) {
        return;
      }

      const host = this.track.findPiece(chip.hostUid);
      const isHostOnTrack = host && this.track.isPieceOnTrack(host.uid);
      const occupied = this.scrapChips.some((otherChip) =>
        otherChip.uid !== chip.uid &&
        otherChip.hostUid === chip.hostUid &&
        otherChip.corner === chip.corner
      );
      if (
        !host ||
        !isHostOnTrack ||
        !CHIP_CORNER_SET.has(chip.corner) ||
        this.isChunkHostBlocked(host) ||
        occupied ||
        !this.canPlaceChipDomainReduction(chip, host, chip.corner).ok
      ) {
        chip.hostUid = null;
        chip.corner = null;
        chip.beat = null;
      }
    });
    this.syncChunkDomainReductions();
  }

  isChunkHostBlocked(host) {
    return host?.id === "chip" && host.upgraded;
  }

  getCombatChipsForSlot(uid) {
    return this.scrapChips
      .filter((chip) => chip.hostUid === uid && CHIP_CORNER_SET.has(chip.corner))
      .map((chip) => ({
        uid: chip.uid,
        sourceId: chip.sourceId,
        sourceUpgraded: Boolean(chip.sourceUpgraded),
        corner: chip.corner,
      }));
  }

  canHonePiece(uid) {
    const piece = uid ? this.track.findPiece(uid) : null;
    return Boolean(
      this.storeOffer?.store.id === "whetstone" &&
      this.storePicks > 0 &&
      piece &&
      !piece.upgraded,
    );
  }

  applyHonePiece(uid) {
    const piece = this.track.findPiece(uid);
    if (this.storeOffer?.store.id !== "whetstone") {
      return false;
    }

    if (this.storePicks <= 0) {
      this.editorMessage = "No store picks left.";
      return false;
    }

    if (!piece) {
      this.editorMessage = "Missing bullet.";
      return false;
    }

    if (piece.upgraded) {
      this.editorMessage = "That bullet is already upgraded.";
      return false;
    }

    this.track.upgradePiece(uid);
    this.returnInvalidChipPlacements();
    this.track.setSelected(uid);
    this.whetstoneCandidateUid = null;
    this.wreckerCandidateUid = null;
    this.storePicks = Math.max(0, this.storePicks - 1);
    const remainingUpgradeable = this.track.allPieces.filter((nextPiece) => !nextPiece.upgraded).length;
    this.storeOffer = {
      ...this.storeOffer,
      choices: [],
      upgradeableCount: remainingUpgradeable,
    };
    this.editorMessage = "Bullet honed.";

    if (this.storePicks <= 0 || remainingUpgradeable === 0) {
      const leftoverPicks = Math.max(0, this.storePicks);
      this.bankedStorePicks += leftoverPicks;
      this.pendingUpgrade = false;
      this.storePicks = 0;
      if (leftoverPicks > 0) {
        this.editorMessage = `${leftoverPicks} unused pick${leftoverPicks === 1 ? "" : "s"} banked for the next store.`;
      }
    }

    return true;
  }

  honePiece(uid) {
    this.applyHonePiece(uid);
    this.showIntermission();
  }

  honeCandidate() {
    const uid = this.whetstoneCandidateUid;
    if (!uid) {
      this.editorMessage = "Drop a bullet into the Whetstone slot first.";
      this.showIntermission();
      return;
    }

    const whetstoneDrop = this.overlay.querySelector("[data-whetstone-drop]");
    const source = this.overlay.querySelector(`[data-whetstone-candidate-token][data-piece-uid="${uid}"]`);
    if (!whetstoneDrop || !source) {
      this.honePiece(uid);
      return;
    }

    const snapshot = this.getSlotStoreSnapshot(whetstoneDrop, source);
    this.animateWhetstoneHone(uid, snapshot);
  }

  getPieceRemovalUids(piece) {
    if (!piece) {
      return [];
    }

    if (isElapsePiece(piece) && piece.groupId) {
      return this.track.getGroupPieces(piece.groupId).map((groupPiece) => groupPiece.uid);
    }

    return [piece.uid];
  }

  getScrappablePieceCount() {
    const seenGroups = new Set();
    return this.track.allPieces.filter((piece) => {
      if (isElapsePiece(piece) && piece.groupId) {
        if (seenGroups.has(piece.groupId)) {
          return false;
        }
        seenGroups.add(piece.groupId);
      }

      return this.track.allPieces.length - this.getPieceRemovalUids(piece).length > 0;
    }).length;
  }

  canWreckPiece(uid) {
    const piece = uid ? this.track.findPiece(uid) : null;
    if (!piece || this.storeOffer?.store.id !== "wrecker" || this.storePicks <= 0) {
      return false;
    }

    return this.track.allPieces.length - this.getPieceRemovalUids(piece).length > 0;
  }

  createScrapChips(piece) {
    return Array.from({ length: getChunkCountForSource(piece.id) }, () => {
      this.scrapChipSerial += 1;
      return {
        uid: `chip-${this.scrapChipSerial}`,
        sourceUid: piece.uid,
        sourceId: piece.id,
        sourceName: getSlotName(piece),
        sourceUpgraded: Boolean(piece.upgraded),
        color: getSlotColor(piece),
        hostUid: null,
        corner: null,
        beat: null,
      };
    });
  }

  applyWreckPiece(uid) {
    this.lastScrappedChipUids = [];
    const piece = this.track.findPiece(uid);
    if (this.storeOffer?.store.id !== "wrecker") {
      return false;
    }

    if (this.storePicks <= 0) {
      this.editorMessage = "No store picks left.";
      return false;
    }

    if (!piece) {
      this.editorMessage = "Missing bullet.";
      return false;
    }

    if (!this.canWreckPiece(uid)) {
      this.editorMessage = "That bullet cannot be scrapped.";
      return false;
    }

    const chips = this.createScrapChips(piece);
    this.lastScrappedChipUids = chips.map((chip) => chip.uid);
    const scrappedName = getSlotName(piece);
    const removedHostUids = this.getPieceRemovalUids(piece);
    this.returnChipsForHosts(removedHostUids);
    this.track.removePiece(uid);
    this.scrapChips.push(...chips);
    this.whetstoneCandidateUid = null;
    this.wreckerCandidateUid = null;
    this.storePicks = Math.max(0, this.storePicks - 1);

    const remainingScrappable = this.getScrappablePieceCount();
    this.storeOffer = {
      ...this.storeOffer,
      choices: [],
      scrappableCount: remainingScrappable,
    };
    this.editorMessage = `Scrapped ${scrappedName} into ${chips.length} chunk${chips.length === 1 ? "" : "s"}.`;

    if (this.storePicks <= 0 || remainingScrappable === 0) {
      const leftoverPicks = Math.max(0, this.storePicks);
      this.bankedStorePicks += leftoverPicks;
      this.pendingUpgrade = false;
      this.storePicks = 0;
      if (leftoverPicks > 0) {
        this.editorMessage = `${leftoverPicks} unused pick${leftoverPicks === 1 ? "" : "s"} banked for the next store.`;
      }
    }

    return true;
  }

  wreckPiece(uid) {
    this.applyWreckPiece(uid);
    this.showIntermission();
  }

  wreckCandidate() {
    const uid = this.wreckerCandidateUid;
    if (!uid) {
      this.editorMessage = "Drop a bullet into the Wrecker slot first.";
      this.showIntermission();
      return;
    }

    const wreckerDrop = this.overlay.querySelector("[data-wrecker-drop]");
    const source = this.overlay.querySelector(`[data-wrecker-candidate-token][data-piece-uid="${uid}"]`);
    if (!wreckerDrop || !source) {
      this.wreckPiece(uid);
      return;
    }

    const snapshot = this.getSlotStoreSnapshot(wreckerDrop, source);
    this.animateWreckerScrap(uid, snapshot);
  }

  onPointerDown = (event) => {
    if (!this.active) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const lane = this.renderer.laneFromCanvasX(event.clientX - rect.left);
    if (lane === null) {
      return;
    }

    if (!this.canUseGameplayInputLane(lane)) {
      return;
    }

    this.pointerLane = lane;
    this.fireLane(lane);
  };

  onPointerUp = () => {
    if (this.pointerLane === null) {
      return;
    }

    const lane = this.pointerLane;
    this.pointerLane = null;
    this.releaseLane(lane);
  };

  onKeyDown = (event) => {
    if (event.repeat) {
      return;
    }

    if (this.handleSceneKey(event)) {
      return;
    }

    const lane = LANE_KEYS.get(event.key.toLowerCase());
    if (lane !== undefined) {
      event.preventDefault();
      this.fireLane(lane);
    }

    if (event.key === "Escape") {
      this.manager.load(MenuScene);
    }
  };

  onKeyUp = (event) => {
    const lane = LANE_KEYS.get(event.key.toLowerCase());
    if (lane !== undefined) {
      event.preventDefault();
      this.releaseLane(lane);
    }
  };

  handleDebugAction() {
    return false;
  }

  handleSceneKey() {
    return false;
  }

  canUseGameplayInputLane(lane) {
    if (this.gameplayInputDisabled) {
      return false;
    }

    return !this.tutorialAllowedLanes || this.tutorialAllowedLanes.has(lane);
  }

  startWave() {
    if (this.pendingWoe) {
      this.editorMessage = "Choose a Woe first.";
      this.showIntermission();
      return;
    }

    if (this.storePicks > 0) {
      this.editorMessage = "Pick a store reward first.";
      this.showIntermission();
      return;
    }

    if (this.storeSlotAnimating) {
      this.editorMessage = "Store animation in progress.";
      this.showIntermission();
      return;
    }

    if (this.track.placements.length === 0) {
      this.editorMessage = "Place at least one bullet on the timeline.";
      this.showIntermission();
      return;
    }

    this.tutorial.completeReadyCheck();
    clearTutorialOverlay(this.el);
    this.intermissionView.hide();
    this.active = false;
    this.intermission = false;
    this.pendingUpgrade = false;
    this.choices = [];
    this.storeOffer = null;
    this.storePicks = 0;
    this.whetstoneCandidateUid = null;
    this.wreckerCandidateUid = null;
    this.enemies = [];
    this.effects = [];
    this.floaters = [];
    this.echoes = [];
    this.pendingChipShots = [];
    this.pendingPiercingImpacts = [];
    this.pendingAspectSpreads = [];
    this.resetPlatingFinisher();
    this.frameEnemyIndex = null;
    this.knockbackStepAccumulator = 0;
    this.waveKills = 0;
    this.visualWaveProgress = 0;
    this.waveClearOutro = false;
    this.waveClearOutroTimer = 0;
    this.waveProgressFlashTtl = 0;
    this.beatBarWinddownTtl = 0;
    this.suppressBeatBullets = false;
    this.gameplayInputDisabled = false;
    this.tutorialBeatPauseTarget = null;
    this.tutorialBeatPauseActive = false;
    this.tutorialBeatPauseConsumed = false;
    this.tutorialTimelinePaused = false;
    this.tutorialAllowedLanes = null;
    this.tutorialChallengeKills = 0;
    this.tutorialChallengeActive = false;
    this.tutorialChallengeCompleteTimer = null;
    this.tutorialSpawnQueue = [];
    this.progressEl?.classList.remove("is-complete-flash");
    this.beatStrip?.classList.remove("is-winding-down");
    this.resetWaveResources();
    if (this.tutorial.shouldStartFirstWaveIntro(this.waveIndex)) {
      this.startFirstWaveTutorialIntro();
      return;
    }

    this.beginWaveTimeline();
    this.startWaveRunner();
  }

  beginWaveTimeline() {
    this.active = true;
    this.suppressBeatBullets = false;
    this.prepareTrackForWaveStart();
  }

  startWaveRunner() {
    this.tutorial.onWaveStart({
      scene: this,
      waveIndex: this.waveIndex,
      beat: this.beat,
    });
    this.waveRunner.start(this.waveIndex, this.beat, {
      enemyPool: this.enemyPool,
      healthMultiplier: this.enemyHealthMultiplier(),
      aspectGrantors: this.aspectGrantors,
      platingReserve: this.plating,
    });
  }

  startFirstWaveTutorialIntro() {
    this.tutorial.startFirstWaveIntro();
    this.gameplayInputDisabled = true;
    this.tutorialAllowedLanes = null;
    this.tutorialTimelinePaused = false;
    this.suppressBeatBullets = true;
    const enemy = this.spawnTutorialEnemy(1);
    this.tutorialEnemyId = enemy?.id ?? null;
    this.syncTutorialOverlay();
  }

  beginFirstWaveTutorialTimeline() {
    this.beginWaveTimeline();
    this.gameplayInputDisabled = true;
    this.tutorialBeatPauseTarget = this.track.targetBeat;
    this.tutorialBeatPauseActive = false;
    this.tutorialTimelinePaused = false;
  }

  continueFirstWaveTutorialTimeline() {
    this.tutorialBeatPauseActive = false;
    this.tutorialBeatPauseTarget = null;
    this.tutorialBeatPauseConsumed = true;
    this.active = true;
    this.gameplayInputDisabled = false;
    this.tutorialAllowedLanes = new Set([1]);
    this.tutorialTimelinePaused = true;
    this.track.syncTarget(this.beat);
  }

  spawnTutorialEnemy(lane, { y = FIRST_WAVE_TUTORIAL_ENEMY_Y, challengeTarget = false } = {}) {
    const enemy = createEnemy("basic", lane, {
      currentBeat: this.beat,
      healthMultiplier: this.enemyHealthMultiplier(),
    });
    enemy.y = y;
    enemy.visualY = y;
    enemy.movementDisabled = true;
    enemy.tutorialDummy = true;
    enemy.tutorialChallengeTarget = Boolean(challengeTarget);
    this.spawnEnemy(enemy);
    return enemy;
  }

  scheduleTutorialEnemySpawn(
    lane,
    {
      y = FIRST_WAVE_TUTORIAL_ENEMY_Y,
      challengeTarget = true,
      warningSeconds = FIRST_WAVE_TUTORIAL_SPAWN_WARNING_SECONDS,
    } = {},
  ) {
    this.tutorialSpawnQueue.push({
      lane,
      y,
      challengeTarget,
      warningSeconds,
      secondsRemaining: warningSeconds,
      color: getEnemyDef("basic").color,
    });
  }

  updateTutorialSpawnQueue(dt) {
    if (this.tutorialSpawnQueue.length === 0) {
      return;
    }

    const ready = [];
    this.tutorialSpawnQueue = this.tutorialSpawnQueue
      .map((spawn) => ({ ...spawn, secondsRemaining: spawn.secondsRemaining - dt }))
      .filter((spawn) => {
        if (spawn.secondsRemaining <= 0) {
          ready.push(spawn);
          return false;
        }

        return true;
      });

    ready.forEach((spawn) => {
      const enemy = this.spawnTutorialEnemy(spawn.lane, {
        y: spawn.y,
        challengeTarget: spawn.challengeTarget,
      });
      if (enemy) {
        enemy.visualY = -0.14;
      }
    });
  }

  getTutorialSpawnWarnings() {
    return this.tutorialSpawnQueue.map((spawn) => {
      const duration = Math.max(0.001, spawn.warningSeconds);
      const ratio = clamp(spawn.secondsRemaining / duration, 0, 1);
      return {
        lane: spawn.lane,
        color: spawn.color,
        timeUntil: spawn.secondsRemaining / Math.max(0.001, this.beatSeconds),
        strength: 1 - ratio,
      };
    });
  }

  startFirstWaveCleanShotChallenge() {
    if (this.tutorial.getGameplayStep()?.id !== "middle-lane-shot") {
      return;
    }

    this.tutorial.advanceGameplayStep({ force: true });
    this.tutorialTimelinePaused = false;
    this.gameplayInputDisabled = false;
    this.tutorialAllowedLanes = null;
    this.tutorialChallengeKills = 0;
    this.tutorialChallengeActive = true;
    this.tutorialChallengeCompleteTimer = null;
    this.enemies.forEach((enemy) => {
      if (enemy.tutorialDummy && enemy.hp > 0) {
        enemy.tutorialChallengeTarget = true;
      }
    });
    [0, 2].forEach((lane) => this.scheduleTutorialEnemySpawn(lane));
    this.syncTutorialOverlay();
  }

  resetFirstWaveChallengeCounter() {
    if (!this.tutorialChallengeActive || this.tutorialChallengeKills === 0) {
      return;
    }

    this.tutorialChallengeKills = 0;
    this.syncTutorialOverlay();
  }

  handleTutorialEnemyKilled(enemy) {
    if (
      !this.tutorialChallengeActive ||
      !enemy.tutorialChallengeTarget ||
      this.tutorial.getGameplayStep()?.id !== "clean-shot-challenge"
    ) {
      return;
    }

    this.tutorialChallengeKills += 1;
    if (this.tutorialChallengeKills >= FIRST_WAVE_TUTORIAL_KILL_TARGET) {
      this.finishFirstWaveTutorialChallenge();
      return;
    }

    this.scheduleTutorialEnemySpawn(enemy.lane);
    this.syncTutorialOverlay();
  }

  finishFirstWaveTutorialChallenge() {
    this.tutorialChallengeActive = false;
    this.gameplayInputDisabled = true;
    this.tutorialAllowedLanes = null;
    this.active = true;
    this.tutorial.advanceGameplayStep({ force: true });
    this.tutorialChallengeCompleteTimer = FIRST_WAVE_TUTORIAL_COMPLETE_DELAY_SECONDS;
    this.syncTutorialOverlay();
  }

  updateFirstWaveTutorialCompletion(dt) {
    if (!Number.isFinite(this.tutorialChallengeCompleteTimer)) {
      return;
    }

    this.tutorialChallengeCompleteTimer = Math.max(0, this.tutorialChallengeCompleteTimer - dt);
    if (this.tutorialChallengeCompleteTimer > 0) {
      return;
    }

    this.tutorialChallengeCompleteTimer = null;
    this.completeFirstWaveTutorial();
  }

  completeFirstWaveTutorial() {
    this.enemies.forEach((enemy) => {
      if (enemy.tutorialDummy && enemy.hp > 0) {
        this.addEnemyDeathPuff(enemy);
      }
    });
    this.enemies = this.enemies.filter((enemy) => !enemy.tutorialDummy);
    this.frameEnemyIndex = null;
    this.activeElapse = null;
    this.pendingChipShots = [];
    this.pendingPiercingImpacts = [];
    this.pendingAspectSpreads = [];
    this.resetPlatingFinisher();
    this.score = 0;
    this.waveKills = 0;
    this.visualWaveProgress = 0;
    this.gameplayInputDisabled = false;
    this.tutorialAllowedLanes = null;
    this.tutorialTimelinePaused = false;
    this.tutorialChallengeKills = 0;
    this.tutorialChallengeActive = false;
    this.tutorialEnemyId = null;
    this.tutorialSpawnQueue = [];
    clearTutorialOverlay(this.el);
    this.resetWaveResources();
    this.active = true;
    this.suppressBeatBullets = false;
    this.track.syncTarget(this.beat);
    this.startWaveRunner();
  }

  resetWaveResources() {
    this.plating = this.maxPlating;
    this.shockwaves = this.maxShockwaves;
    this.resetPlatingFinisher();
    this.resourceFlashState.plating = this.plating;
    this.resourceFlashState.shockwaves = this.shockwaves;
    this.resourceTransitions.plating = null;
    this.resourceTransitions.shockwaves = null;
  }

  resetPlatingFinisher() {
    this.platingFinisherActive = false;
    this.platingFinisherTriggered = false;
    this.platingFinisherClearDelay = 0;
    this.platingFinisherDelayUntil = -Infinity;
    this.pendingPlatingStrikes = [];
  }

  prepareTrackForWaveStart() {
    this.beat = Math.max(0, Math.ceil(this.beat - EPSILON));
    this.track.start(this.beat, {
      startDelayBeats: TRACK_WAVE_START_LEAD_BEATS,
    });
    this.beatBarView?.clearMotion();
    this.lastWholeBeat = Math.floor(this.beat);
  }

  showIntermission(isFirst = false) {
    this.active = false;
    this.intermission = true;
    this.suppressBeatBullets = true;
    this.syncChunkDomainReductions();
    const isOpeningReadyCheck = isFirst ||
      (this.waveIndex === 0 && !this.pendingUpgrade && !this.pendingWoe && !this.storeOffer);
    this.intermissionView.renderIntermission({
      isFirst: isOpeningReadyCheck,
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
      woeDraft: this.pendingWoe
        ? {
            choices: this.woeChoices,
            unlocked: this.enemyPool,
            aspectGrantors: this.aspectGrantors,
            kind: this.woeChoices[0]?.kind ?? "enemy",
          }
        : null,
      message: this.editorMessage,
      tutorial: this.tutorial.getContext(),
    });
    this.syncTutorialOverlay();
  }

  syncTutorialOverlay() {
    clearTutorialOverlay(this.el);
    const isReadyCheck =
      this.intermission &&
      (this.waveIndex === 0 && !this.pendingUpgrade && !this.pendingWoe && !this.storeOffer);
    let step = isReadyCheck ? this.tutorial.getReadyCheckStep() : null;
    let container = this.overlay;
    if (!step && !this.intermission) {
      step = this.getGameplayTutorialOverlayStep();
      container = this.el;
    }
    if (!step) {
      return;
    }

    const render = () => renderReadyCheckTutorialOverlay({
      container,
      layerContainer: this.el,
      step,
    });
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(render);
    } else {
      render();
    }
  }

  getGameplayTutorialOverlayStep() {
    const step = this.tutorial.getGameplayStep();
    if (!step) {
      return null;
    }

    if (step.waitFor === "firstBulletConverge" && !this.tutorialBeatPauseActive) {
      return null;
    }

    if (Array.isArray(step.callouts)) {
      const callouts = step.callouts
        .map((callout) => this.resolveGameplayTutorialCallout(callout))
        .filter(Boolean);
      return callouts.length > 0 ? { ...step, callouts } : null;
    }

    return this.resolveGameplayTutorialCallout(step);
  }

  resolveGameplayTutorialCallout(step) {
    if (step.target === "scriptedEnemy") {
      const targetRect = this.getTutorialEnemyTargetRect();
      return targetRect ? { ...step, targetRect } : null;
    }

    if (step.target === "comboBars") {
      const targetRects = this.getComboMeterTargetRects();
      if (targetRects.length === 0) {
        return null;
      }

      return {
        ...step,
        targetRects,
        anchorRect: targetRects[0],
      };
    }

    if (step.target === "playArea") {
      const targetRect = this.getPlayAreaTargetRect();
      if (!targetRect) {
        return null;
      }

      const resolved = { ...step, targetRect };
      if (step.id === "clean-shot-challenge") {
        resolved.counter = {
          current: this.tutorialChallengeKills,
          total: FIRST_WAVE_TUTORIAL_KILL_TARGET,
        };
      }
      return resolved;
    }

    return step;
  }

  canvasLocalRectToViewport(rect) {
    const canvasRect = this.canvas.getBoundingClientRect();
    return {
      left: canvasRect.left + rect.left,
      top: canvasRect.top + rect.top,
      right: canvasRect.left + rect.right,
      bottom: canvasRect.top + rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }

  getComboMeterTargetRects() {
    if (!this.canvas || !this.renderer) {
      return [];
    }

    return getComboMeterRects(this.renderer, this.comboCap)
      .map((rect) => this.canvasLocalRectToViewport(rect));
  }

  getPlayAreaTargetRect() {
    if (!this.canvas || !this.renderer) {
      return null;
    }

    return this.canvasLocalRectToViewport({
      left: this.renderer.arena.x,
      top: 0,
      right: this.renderer.arena.x + this.renderer.arena.width,
      bottom: this.renderer.yToScreen(ENEMY_BREACH_Y),
      width: this.renderer.arena.width,
      height: this.renderer.yToScreen(ENEMY_BREACH_Y),
    });
  }

  getTutorialEnemyTargetRect() {
    const enemy = this.enemies.find((candidate) => candidate.id === this.tutorialEnemyId);
    if (!enemy || !this.canvas || !this.renderer) {
      return null;
    }

    const canvasRect = this.canvas.getBoundingClientRect();
    const laneWidth = this.renderer.arena.width / LANE_COUNT;
    const x = this.renderer.laneCenter(enemy.lane) + (enemy.visualLaneOffset ?? 0) * laneWidth;
    const y = this.renderer.yToScreen(enemy.visualY ?? enemy.y);
    const radius = 34;
    return {
      left: canvasRect.left + x - radius,
      top: canvasRect.top + y - radius,
      right: canvasRect.left + x + radius,
      bottom: canvasRect.top + y + radius,
      width: radius * 2,
      height: radius * 2,
    };
  }

  placeSelectedAt(beat) {
    this.syncChunkDomainReductions();
    const result = this.track.movePieceToTrack(this.track.selectedUid, beat);
    if (result.ok) {
      this.returnInvalidChipPlacements();
    }
    this.editorMessage = result.ok ? "" : result.reason;
    this.showIntermission();
  }

  maybePauseFirstWaveTutorialTimeline() {
    const step = this.tutorial.getGameplayStep();
    if (
      step?.waitFor !== "firstBulletConverge" ||
      this.tutorialBeatPauseActive ||
      this.tutorialBeatPauseConsumed ||
      !Number.isFinite(this.tutorialBeatPauseTarget) ||
      this.beat < this.tutorialBeatPauseTarget - EPSILON
    ) {
      return false;
    }

    this.beat = this.tutorialBeatPauseTarget;
    this.track.syncTarget(this.beat);
    this.active = false;
    this.tutorialBeatPauseActive = true;
    this.syncTutorialOverlay();
    return true;
  }

  update(dt) {
    if (this.active) {
      this.runSeconds += dt;
      if (!this.tutorialTimelinePaused) {
        this.beat += dt / this.beatSeconds;
      }
      this.track.syncTarget(this.beat);
      this.maybePauseFirstWaveTutorialTimeline();
    }

    this.updateWaveClearOutro(dt);
    this.beatFlashTtl = Math.max(0, this.beatFlashTtl - dt);
    this.waveProgressFlashTtl = Math.max(0, this.waveProgressFlashTtl - dt);
    this.beatBursts = this.beatBursts
      .map((burst) => ({ ...burst, ttl: burst.ttl - dt }))
      .filter((burst) => burst.ttl > 0);
    this.updateHud();
    this.updateBeatIndicator();
    this.updateWaveProgressTracker(dt);
    this.updateResourceVisuals(dt);
    this.updateTutorialSpawnQueue(dt);
    this.updateFirstWaveTutorialCompletion(dt);
    this.tutorial.update({
      scene: this,
      dt,
      beat: this.beat,
      active: this.active,
    });

    if (!this.active) {
      return;
    }

    this.processBeatTicks();
    let enemyIndex = this.frameEnemyIndex?.enemies === this.enemies
      ? this.frameEnemyIndex
      : createEnemyFrameIndex(this.enemies);
    this.frameEnemyIndex = enemyIndex;
    this.maybeTriggerPlatingFinisher(enemyIndex);
    if (this.shouldUpdateWaves() && !this.platingFinisherActive) {
      this.waveRunner.update(this.beat, (enemy) => this.spawnEnemy(enemy), this.enemies, {
        currentSecond: this.runSeconds,
        kills: this.waveKills,
      });
    }
    this.updateEchoes();
    this.updateChipShots();
    enemyIndex = createEnemyFrameIndex(this.enemies);
    this.frameEnemyIndex = enemyIndex;
    this.updateEnemies(dt, enemyIndex);
    if (this.activeElapse) {
      enemyIndex = createEnemyFrameIndex(this.enemies);
      this.frameEnemyIndex = enemyIndex;
      this.updateElapse(dt, enemyIndex);
    }
    this.updateEffects(dt);
    this.processPendingPiercingImpacts();
    this.processPendingPlatingStrikes();
    this.updatePlatingFinisherDelay(dt);
    this.removeDeadEnemies();
    this.processPendingAspectSpreads();
    this.frameEnemyIndex = createEnemyFrameIndex(this.enemies);

    this.maybeTriggerPlatingFinisher(this.frameEnemyIndex);

    if (this.plating <= 0 && !this.platingFinisherActive && !this.platingFinisherTriggered) {
      this.endRun();
    }

    if (
      this.waveRunner.isComplete(this.frameEnemyIndex) &&
      !this.waveClearOutro &&
      !this.hasPendingPlatingFinish()
    ) {
      this.beginWaveClearOutro();
    }
  }

  updateWaveClearOutro(dt) {
    if (!this.waveClearOutro) {
      return;
    }

    this.waveClearOutroTimer -= dt;
    this.beatBarWinddownTtl = Math.max(0, this.beatBarWinddownTtl - dt);

    if (this.waveClearOutroTimer > 0) {
      return;
    }

    this.waveClearOutro = false;
    this.waveClearOutroTimer = 0;
    this.beatBarWinddownTtl = 0;
    this.track.start(this.beat);
    this.beatBarView?.clearMotion();
    this.beatBursts = [];
    this.clearWave();
  }

  shouldUpdateWaves() {
    return true;
  }

  spawnEnemy(enemy) {
    placeEnemyAtLaneBack(enemy, this.enemies);
    this.enemies.push(enemy);
    this.frameEnemyIndex = null;
    if (enemy.type !== "basic") {
      this.platingFinisherDelayUntil = Math.max(
        this.platingFinisherDelayUntil,
        this.runSeconds + PLATING_FINISH_SPECIAL_GRACE_SECONDS,
      );
    }
    resolveEnemyLaneSpacing(this.enemies);
  }

  areEnemiesPaused() {
    return false;
  }

  canTakeDamage() {
    return true;
  }

  triggerShockwave() {
    if (this.shockwaves <= 0) {
      return false;
    }

    this.shockwaves -= 1;
    const knockback = getBulletDef("shell").knockback;
    this.enemies.forEach((enemy) => {
      if (enemy.hp <= 0 || enemy.targetable === false || enemy.y < SHOCKWAVE_MIN_Y) {
        return;
      }

      knockEnemyBack(enemy, knockback);
    });
    playShockwaveScreenEffect({
      screenEffects: this.screenEffects,
      sceneEl: this.el,
      canvas: this.canvas,
      renderer: this.renderer,
    });
    this.floaters.push({
      lane: 1,
      y: 0.88,
      text: "shockwave",
      color: "#f8fbff",
      ttl: 0.7,
    });
    return true;
  }

  hasPendingPlatingFinish() {
    return this.pendingPlatingStrikes.length > 0 || this.platingFinisherClearDelay > 0;
  }

  updatePlatingFinisherDelay(dt) {
    if (this.pendingPlatingStrikes.length > 0 || this.platingFinisherClearDelay <= 0) {
      return;
    }

    this.platingFinisherClearDelay = Math.max(0, this.platingFinisherClearDelay - dt);
  }

  remainingWaveEnemyCount(enemyIndex = createEnemyFrameIndex(this.enemies)) {
    if (!this.waveRunner.active) {
      return 0;
    }

    const live = enemyIndex.liveCount();
    return live + this.waveRunner.remainingSpawnCount();
  }

  maybeTriggerPlatingFinisher(enemyIndex = createEnemyFrameIndex(this.enemies)) {
    if (
      this.platingFinisherActive ||
      this.waveClearOutro ||
      !this.waveRunner.active ||
      this.plating <= 0 ||
      this.waveRunner.hasPendingSpecials?.() ||
      this.runSeconds < this.platingFinisherDelayUntil
    ) {
      return false;
    }

    const remaining = this.remainingWaveEnemyCount(enemyIndex);
    if (remaining <= 0 || this.plating < remaining) {
      return false;
    }

    this.startPlatingFinisher();
    return true;
  }

  startPlatingFinisher() {
    const platingBefore = Math.max(0, Math.floor(this.plating));
    const maxPlating = Math.max(this.maxPlating, platingBefore, 1);
    const liveTargets = createEnemyFrameIndex(this.enemies)
      .liveEnemies()
      .sort((a, b) => b.y - a.y);
    const canceledSpawns = this.waveRunner.cancelPendingSpawns();
    const strikeCount = Math.max(platingBefore, liveTargets.length + canceledSpawns);
    const arrivalSecond = this.runSeconds + PLATING_FINISH_TRAIL_SECONDS;

    this.platingFinisherActive = true;
    this.platingFinisherTriggered = true;
    this.activeElapse = null;
    this.pendingChipShots = [];
    this.pendingPiercingImpacts = [];
    this.plating = 0;
    this.trackResourceLoss("plating", this.plating, maxPlating);

    for (let index = 0; index < strikeCount; index += 1) {
      const target = liveTargets[index] ?? null;
      const strike = {
        arrivalSecond,
        targetId: target?.id ?? null,
      };
      this.pendingPlatingStrikes.push(strike);
      this.effects.push({
        kind: "platingTrail",
        sourceIndex: index % Math.max(1, platingBefore),
        sourceCount: platingBefore,
        sourceMaxCount: maxPlating,
        targetId: target?.id ?? null,
        targetLane: target?.lane ?? null,
        targetY: target ? target.visualY ?? target.y : null,
        targetOffscreen: !target,
        arcLean: Math.random() < 0.5 ? -1 : 1,
        arcBend: 34 + Math.random() * 34,
        color: PLATING_FINISH_COLOR,
        ttl: PLATING_FINISH_TRAIL_SECONDS,
        duration: PLATING_FINISH_TRAIL_SECONDS,
      });
    }
  }

  addPlatingImpact(target) {
    if (!target || !Number.isInteger(target.lane) || !Number.isFinite(target.y)) {
      return;
    }

    this.effects.push({
      kind: "platingImpact",
      lane: target.lane,
      y: target.visualY ?? target.y,
      color: "#ffffff",
      radius: PLATING_IMPACT_RADIUS,
      growth: PLATING_IMPACT_GROWTH,
      ttl: PLATING_IMPACT_SECONDS,
      duration: PLATING_IMPACT_SECONDS,
    });
  }

  processPendingPlatingStrikes() {
    if (this.pendingPlatingStrikes.length === 0) {
      return;
    }

    const ready = [];
    this.pendingPlatingStrikes = this.pendingPlatingStrikes.filter((strike) => {
      if (strike.arrivalSecond <= this.runSeconds) {
        ready.push(strike);
        return false;
      }

      return true;
    });

    ready.forEach((strike) => {
      const target = this.enemies.find((enemy) => enemy.id === strike.targetId);
      if (target?.hp > 0) {
        this.addPlatingImpact(target);
        target.hp = 0;
        target.flashTtl = Math.max(target.flashTtl ?? 0, 0.16);
        target.flashDuration = 0.16;
        target.flashColor = PLATING_FINISH_COLOR;
      }
    });

    if (this.pendingPlatingStrikes.length === 0) {
      this.platingFinisherActive = false;
      this.platingFinisherClearDelay = PLATING_FINISH_CLEAR_DELAY_SECONDS;
    }
  }

  beginWaveClearOutro() {
    this.active = false;
    this.activeElapse = null;
    this.combo = 0;
    this.shockwaves = this.maxShockwaves;
    this.pendingChipShots = [];
    this.waveClearOutro = true;
    this.waveClearOutroTimer = WAVE_CLEAR_OUTRO_SECONDS +
      (this.platingFinisherTriggered ? PLATING_FINISH_OUTRO_EXTRA_SECONDS : 0);
    this.waveProgressFlashTtl = WAVE_PROGRESS_FLASH_SECONDS;
    this.beatBarWinddownTtl = BEAT_BAR_WINDDOWN_SECONDS;
    this.visualWaveProgress = 1;
    this.updateWaveProgressTracker(0);
  }

  processBeatTicks() {
    const whole = Math.floor(this.beat);
    if (whole === this.lastWholeBeat) {
      return;
    }

    applyEnemyBeatEffects({
      enemies: this.enemies,
      fromBeat: this.lastWholeBeat,
      toBeat: whole,
      effects: this.effects,
      floaters: this.floaters,
    });
    this.lastWholeBeat = whole;
  }

  updateEchoes() {
    const ready = this.echoes.filter((echo) => echo.fireBeat <= this.beat);
    this.echoes = this.echoes.filter((echo) => echo.fireBeat > this.beat);

    ready.forEach((echo) => {
      const enemyIndex = createEnemyFrameIndex(this.enemies);
      const events = resolveBulletShot({
        slot: echo.slot,
        lane: echo.lane,
        enemies: enemyIndex,
        currentBeat: this.beat,
        targetBeat: this.beat,
        beatSeconds: this.beatSeconds,
        damageMultiplier: this.damageMultiplier() * 0.95,
        chipEffects: echo.slot.uid ? this.getCombatChipsForSlot(echo.slot.uid) : [],
        scheduleEcho: () => {},
      });
      this.consumeCombatEvents(events, "echo");
    });
  }

  schedulePairChipShots({ hostUid, lane, targetBeat, damageMultiplier }) {
    this.scrapChips
      .filter((chip) =>
        chip.hostUid === hostUid &&
        chip.sourceId === "pair" &&
        CHIP_CORNER_SET.has(chip.corner)
      )
      .sort((a, b) => {
        const cornerDelta = CHIP_CORNERS.indexOf(a.corner) - CHIP_CORNERS.indexOf(b.corner);
        return cornerDelta || String(a.uid).localeCompare(String(b.uid));
      })
      .forEach((chip, index) => {
        this.pendingChipShots.push({
          chipUid: chip.uid,
          lane,
          fireBeat: Math.max(
            this.beat,
            targetBeat + (index + 1) * CHIP_TUNING.pairShotIntervalBeats,
          ),
          damageMultiplier,
        });
      });
  }

  updateChipShots() {
    const ready = this.pendingChipShots.filter((shot) => shot.fireBeat <= this.beat);
    this.pendingChipShots = this.pendingChipShots.filter((shot) => shot.fireBeat > this.beat);

    ready.forEach((shot) => {
      const enemyIndex = createEnemyFrameIndex(this.enemies);
      const events = resolvePairChipShot({
        lane: shot.lane,
        enemies: enemyIndex,
        currentBeat: this.beat,
        damageMultiplier: shot.damageMultiplier,
      });
      this.consumeCombatEvents(events, "chip");
    });
  }

  updateEnemySlowEffects(enemy, dt) {
    if (!enemy.slowEffects?.length) {
      return 1;
    }

    let multiplier = 1;
    enemy.slowEffects = enemy.slowEffects.filter((slow) => {
      if (!Number.isFinite(slow.secondsRemaining) || slow.secondsRemaining <= 0) {
        return false;
      }

      multiplier = Math.min(multiplier, slow.multiplier ?? 1);
      slow.secondsRemaining -= dt;
      return slow.secondsRemaining > 0;
    });

    return multiplier;
  }

  updateEnemies(dt, enemyIndex = createEnemyFrameIndex(this.enemies)) {
    updateCheerLeadStates(enemyIndex);
    const laneBoosts = [1, 1, 1];
    getLaneSpeedBoosts(enemyIndex).forEach((boost) => {
      laneBoosts[boost.lane] = boost.amount;
    });
    const speedMultipliers = getEnemySpeedMultipliers(enemyIndex);

    const dotEvents = [];
    updateDamageOverTime(enemyIndex, dt, this.beat, dotEvents);
    this.consumeCombatEvents(dotEvents, "dot");

    const movementDt = this.areEnemiesPaused() || this.platingFinisherActive ? 0 : dt;

    this.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) {
        return;
      }

      if (enemy.leap && !enemy.targetable) {
        updateLeapEnemy(enemy, enemyIndex, this.beat);
        return;
      }

      const elapseSlow = this.activeElapse?.slowMultiplier < 1 && enemy.id === this.activeElapse.targetId
        ? this.activeElapse.slowMultiplier
        : this.activeElapse?.secondarySlowMultiplier < 1 && enemy.id === this.activeElapse.secondaryTargetId
        ? this.activeElapse.secondarySlowMultiplier
        : 1;
      const chunkSlow = this.updateEnemySlowEffects(enemy, movementDt);
      const knockbackRecoverySpeed = updateKnockbackRecoverySpeedMultiplier(enemy, movementDt);
      if (!enemy.movementDisabled) {
        enemy.y += enemy.speed *
          laneBoosts[enemy.lane] *
          (speedMultipliers.get(enemy.id) ?? 1) *
          elapseSlow *
          chunkSlow *
          knockbackRecoverySpeed *
          movementDt;
      }
    });

    const knockbacksResolvedSpacing = this.updateKnockbacksFixedStep(movementDt);
    if (!knockbacksResolvedSpacing) {
      resolveEnemyLaneSpacing(this.enemies);
    }

    this.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) {
        return;
      }

      enemy.visualY ??= enemy.y;
      if (enemy.snapVisualY) {
        enemy.visualY = enemy.y;
        delete enemy.snapVisualY;
      } else {
        enemy.visualY += (enemy.y - enemy.visualY) * Math.min(1, dt * 9);
      }
      if (enemy.y >= ENEMY_BREACH_Y) {
        enemy.hp = 0;
        if (this.canTakeDamage()) {
          this.plating -= 1;
          this.triggerShockwave();
        }
        this.floaters.push({
          lane: enemy.lane,
          y: ENEMY_BREACH_Y,
          text: "breach",
          color: "#e65d5d",
          ttl: 0.8,
        });
      }
    });
  }

  updateKnockbacksFixedStep(dt) {
    if (!Number.isFinite(dt) || dt <= 0) {
      return false;
    }

    this.knockbackStepAccumulator = Math.min(
      this.knockbackStepAccumulator + dt,
      KNOCKBACK_SIMULATION_STEP_SECONDS * 4,
    );

    let updated = false;
    while (this.knockbackStepAccumulator >= KNOCKBACK_SIMULATION_STEP_SECONDS) {
      updated = updateEnemyKnockbacks(this.enemies, KNOCKBACK_SIMULATION_STEP_SECONDS) || updated;
      this.knockbackStepAccumulator -= KNOCKBACK_SIMULATION_STEP_SECONDS;
    }

    return updated;
  }

  updateEffects(dt) {
    this.effects = this.effects
      .map((effect) => {
        const nextEffect = { ...effect, ttl: effect.ttl - dt };
        if (nextEffect.kind === "aspectTrail" || nextEffect.kind === "platingTrail") {
          const target = this.enemies.find((enemy) => enemy.id === nextEffect.targetId);
          if (target?.hp > 0) {
            nextEffect.targetLane = target.lane;
            nextEffect.targetY = target.visualY ?? target.y;
          }
        }

        return nextEffect;
      })
      .filter((effect) => effect.ttl > 0);
    this.enemies.forEach((enemy) => {
      if (enemy.flashTtl > 0) {
        enemy.flashTtl = Math.max(0, enemy.flashTtl - dt);
      }
      if (enemy.cheerStateTtl > 0) {
        enemy.cheerStateTtl = Math.max(0, enemy.cheerStateTtl - dt);
      }
    });
    this.floaters = this.floaters
      .map((floater) => ({ ...floater, ttl: floater.ttl - dt, y: floater.y - dt * 0.08 }))
      .filter((floater) => floater.ttl > 0);
  }

  removeDeadEnemies() {
    const killed = this.enemies.filter((enemy) => enemy.hp <= 0 && enemy.y < 1);
    killed.forEach((enemy) => {
      this.addEnemyDeathPuff(enemy);
      this.spreadAspectFromDeath(enemy);
      this.handleTutorialEnemyKilled(enemy);
      if (!enemy.tutorialDummy && !enemy.scored) {
        enemy.scored = true;
        this.waveKills += 1;
        if (this.waveRunner.active) {
          this.score += ENEMY_KILL_SCORE;
        }
      }
    });

    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
  }

  addEnemyDeathPuff(enemy) {
    const def = getEnemyDef(enemy.type);
    this.effects.push({
      kind: "deathPuff",
      lane: enemy.lane,
      laneOffset: enemy.visualLaneOffset ?? 0,
      y: enemy.visualY ?? enemy.y,
      color: def.color,
      radius: enemy.type === "barrier" ? 25 : enemy.type === "leap" ? 23 : 21,
      seed: enemy.id,
      ttl: ENEMY_DEATH_PUFF_SECONDS,
      duration: ENEMY_DEATH_PUFF_SECONDS,
    });
  }

  spreadAspectFromDeath(enemy) {
    if (!enemy.aspectGrantor || enemy.aspectSpread) {
      return;
    }

    enemy.aspectSpread = true;
    const aspect = getAspectForSource(enemy.aspectGrantor);
    if (!aspect) {
      return;
    }

    const arrivalBeat = nextHalfBeatAfter(this.beat);
    const duration = Math.max(0.08, (arrivalBeat - this.beat) * this.beatSeconds);
    const sourceY = enemy.visualY ?? enemy.y;
    const affected = pickAspectSpreadTargets(this.enemies, ASPECT_SPREAD_TARGET_COUNT);
    affected.forEach((basic) => {
      this.pendingAspectSpreads.push({
        arrivalBeat,
        targetId: basic.id,
        sourceType: enemy.aspectGrantor,
      });
      this.effects.push({
        kind: "aspectTrail",
        sourceLane: enemy.lane,
        sourceY,
        targetId: basic.id,
        targetLane: basic.lane,
        targetY: basic.visualY ?? basic.y,
        color: aspect.color,
        ttl: duration,
        duration,
      });
    });
  }

  processPendingAspectSpreads() {
    if (this.pendingAspectSpreads.length === 0) {
      return;
    }

    const ready = [];
    this.pendingAspectSpreads = this.pendingAspectSpreads.filter((spread) => {
      if (spread.arrivalBeat <= this.beat) {
        ready.push(spread);
        return false;
      }

      return true;
    });

    ready.forEach((spread) => {
      const target = this.enemies.find((enemy) => enemy.id === spread.targetId);
      if (target) {
        applyAspectToBasic(target, spread.sourceType);
      }
    });
  }

  applyTimingResult(lane, timing, targetBeat, color, isCorrect) {
    const combo = Number.isFinite(this.combo) ? this.combo : 0;
    const comboDelta = Number.isFinite(timing.comboDelta) ? timing.comboDelta : -0.14;
    this.combo = clamp(combo + comboDelta, 0, 1);
    if (this.waveRunner.active) {
      this.score += Number.isFinite(timing.score) ? timing.score : 0;
    }
    this.floaters.push({
      lane,
      y: 0.88,
      text: timing.label,
      color: timing.color,
      ttl: 0.62,
    });
    this.flashBeatBar(isCorrect, targetBeat, color);
    this.tutorial.onTimingResult({
      scene: this,
      lane,
      timing,
      targetBeat,
      color,
      isCorrect,
      beat: this.beat,
    });
    this.handleFirstWaveTutorialTiming({ lane, isCorrect });
  }

  handleFirstWaveTutorialTiming({ lane, isCorrect }) {
    const step = this.tutorial.getGameplayStep();
    if (step?.id === "middle-lane-shot" && lane === 1) {
      this.startFirstWaveCleanShotChallenge();
      return;
    }

    if (step?.id === "clean-shot-challenge" && !isCorrect) {
      this.resetFirstWaveChallengeCounter();
    }
  }

  finishShotProgress(shot) {
    this.track.advanceFromShot(shot.targetBeat);
  }

  getElapseRightPlacement(entry) {
    if (!entry?.groupId) {
      return null;
    }

    return this.track.placements.find((placement) =>
      placement.groupId === entry.groupId && getElapseHalf(placement) === "right"
    ) ?? null;
  }

  getElapseBeamView() {
    if (!this.activeElapse) {
      return [];
    }

    const target = this.enemies.find((enemy) => enemy.id === this.activeElapse.targetId);
    return [{
      lane: this.activeElapse.lane,
      color: this.activeElapse.color,
      targetY: target?.hp > 0 ? target.visualY ?? target.y : PROJECTILE_END_Y,
    }];
  }

  startElapseBeam(lane, shot, timing, damageMultiplier, enemyIndex = createEnemyFrameIndex(this.enemies)) {
    const rightPlacement = this.getElapseRightPlacement(shot.entry);
    if (!shot.entry.elapseActive || !rightPlacement) {
      this.applyTimingResult(lane, timing, shot.targetBeat, shot.entry.color, shot.shouldAdvance);
      this.floaters.push({
        lane,
        y: 0.8,
        text: "empty",
        color: "#aeb8c7",
        ttl: 0.5,
      });
      this.finishShotProgress(shot);
      return;
    }

    const start = resolveElapseStart({
      lane,
      enemies: enemyIndex,
      currentBeat: this.beat,
      beatSeconds: this.beatSeconds,
      damageMultiplier,
      chipEffects: this.getCombatChipsForSlot(shot.entry.uid),
      upgraded: shot.entry.upgraded || rightPlacement.upgraded,
    });
    this.consumeCombatEvents(start.events, timing.label);
    this.activeElapse = {
      lane,
      groupId: shot.entry.groupId,
      rightUid: rightPlacement.uid,
      rightTargetBeat: shot.targetBeat + (rightPlacement.beat - shot.entry.beat),
      targetId: start.targetId,
      guardId: start.guardId,
      damageMultiplier,
      slowMultiplier: shot.entry.upgraded || rightPlacement.upgraded
        ? getBulletDef("elapse").upgradedSlowMultiplier ?? 0.7
        : 1,
      secondaryTargetId: start.secondaryTargetId,
      secondaryDamagePerBeat: start.secondaryDamagePerBeat,
      secondarySlowMultiplier: start.secondarySlowMultiplier,
      color: shot.entry.color,
      observedUid: null,
      observedTargetBeat: null,
    };
    this.applyTimingResult(lane, timing, shot.targetBeat, shot.entry.color, shot.shouldAdvance);
    this.finishShotProgress(shot);
  }

  finishElapseBeam(
    { lane, weak, timing, targetBeat, shouldAdvance = false },
    enemyIndex = createEnemyFrameIndex(this.enemies),
  ) {
    if (!this.activeElapse) {
      return;
    }

    const events = resolveElapseFinish({
      lane,
      enemies: enemyIndex,
      currentBeat: this.beat,
      damageMultiplier: this.damageMultiplier() * timing.damageFactor,
      weak,
      chipEffects: this.getCombatChipsForSlot(this.activeElapse.rightUid),
      beatSeconds: this.beatSeconds,
    });
    this.consumeCombatEvents(events, weak ? "weak" : timing.label);
    this.applyTimingResult(lane, timing, targetBeat, this.activeElapse.color, !weak && shouldAdvance);
    this.activeElapse = null;
  }

  failElapseBeam(reason = "late", registerCurrentMiss = false) {
    if (!this.activeElapse) {
      return;
    }

    const lane = this.activeElapse.lane;
    const targetBeat = this.activeElapse.rightTargetBeat;
    const missedTargetBeat = this.activeElapse.observedTargetBeat ?? this.track.targetBeat;
    const timing = rateTiming(this.beat - targetBeat);
    this.finishElapseBeam({
      lane,
      weak: true,
      timing: {
        ...timing,
        label: reason === "early" ? "early" : timing.label,
      },
      targetBeat,
      shouldAdvance: false,
    });

    if (registerCurrentMiss) {
      this.track.advanceFromShot(missedTargetBeat);
    }
  }

  releaseLane(lane) {
    if (
      !this.active ||
      !this.canUseGameplayInputLane(lane) ||
      !this.activeElapse ||
      this.activeElapse.lane !== lane
    ) {
      return;
    }

    const current = this.track.currentEntry;
    if (current?.uid === this.activeElapse.rightUid) {
      const shot = this.track.judgeShot(this.beat);
      if (shot.blocked) {
        const targetBeat = Number.isFinite(shot.targetBeat)
          ? shot.targetBeat
          : this.activeElapse.rightTargetBeat;
        const timing = rateTiming(this.beat - targetBeat);
        this.finishElapseBeam({
          lane,
          weak: true,
          timing: {
            ...timing,
            label: "early",
          },
          targetBeat,
          shouldAdvance: false,
        });
        this.track.advanceFromShot(targetBeat);
        this.lastShotAt = this.beat;
        return;
      }

      const timing = rateTiming(shot.delta);
      if (shot.shouldAdvance) {
        this.finishElapseBeam({
          lane,
          weak: false,
          timing,
          targetBeat: shot.targetBeat,
          shouldAdvance: true,
        });
        this.finishShotProgress(shot);
        this.lastShotAt = this.beat;
        return;
      }

      this.finishElapseBeam({
        lane,
        weak: true,
        timing,
        targetBeat: shot.targetBeat,
        shouldAdvance: false,
      });
      this.finishShotProgress(shot);
      this.lastShotAt = this.beat;
      return;
    }

    const isEarly = this.beat < this.activeElapse.rightTargetBeat - GOOD_WINDOW_BEATS;
    this.failElapseBeam(isEarly ? "early" : "late");
    this.lastShotAt = this.beat;
  }

  updateElapse(dt, enemyIndex = createEnemyFrameIndex(this.enemies)) {
    if (!this.activeElapse) {
      return;
    }

    const current = this.track.currentEntry;
    if (current && this.activeElapse.observedUid !== current.uid) {
      this.activeElapse.observedUid = current.uid;
      this.activeElapse.observedTargetBeat = this.track.targetBeat;
    }

    const isRightTurn = current?.uid === this.activeElapse.rightUid;
    const missedIntervening =
      current &&
      current.uid !== this.activeElapse.rightUid &&
      current.groupId !== this.activeElapse.groupId &&
      this.activeElapse.observedTargetBeat < this.activeElapse.rightTargetBeat - GOOD_WINDOW_BEATS &&
      this.beat - this.activeElapse.observedTargetBeat > GOOD_WINDOW_BEATS;
    const missedRight =
      this.beat - this.activeElapse.rightTargetBeat > GOOD_WINDOW_BEATS &&
      (!current || isRightTurn || this.track.targetBeat >= this.activeElapse.rightTargetBeat - GOOD_WINDOW_BEATS);

    if (missedIntervening || missedRight) {
      this.failElapseBeam("late", missedIntervening || isRightTurn);
      return;
    }

    const result = updateElapseBeamDamage({
      beam: this.activeElapse,
      enemies: enemyIndex,
      dt,
      currentBeat: this.beat,
      beatSeconds: this.beatSeconds,
      damageMultiplier: this.activeElapse.damageMultiplier,
    });
    this.activeElapse.targetId = result.targetId;
    this.activeElapse.guardId = result.guardId;
    this.activeElapse.secondaryTargetId = result.secondaryTargetId;
    this.consumeCombatEvents(result.events, "dot");
  }

  fireLane(lane) {
    if (!this.active || !this.canUseGameplayInputLane(lane) || this.beat - this.lastShotAt < 0.12) {
      return;
    }

    if (this.activeElapse?.lane === lane && this.track.currentEntry?.uid !== this.activeElapse.rightUid) {
      this.floaters.push({
        lane,
        y: 0.88,
        text: "held",
        color: this.activeElapse.color,
        ttl: 0.42,
      });
      return;
    }

    const shot = this.track.judgeShot(this.beat);
    this.lastShotAt = this.beat;

    if (shot.blocked) {
      this.floaters.push({
        lane,
        y: 0.88,
        text: shot.reason ?? "wait",
        color: "#aeb8c7",
        ttl: 0.48,
      });
      return;
    }

    const timing = rateTiming(shot.delta);
    const multiplier = this.damageMultiplier() * timing.damageFactor;
    const enemyIndex = createEnemyFrameIndex(this.enemies);
    this.schedulePairChipShots({
      hostUid: shot.entry.uid,
      lane,
      targetBeat: shot.targetBeat,
      damageMultiplier: multiplier,
    });
    if (isElapsePiece(shot.entry)) {
      if (getElapseHalf(shot.entry) === "left") {
        this.startElapseBeam(lane, shot, timing, multiplier, enemyIndex);
        return;
      }

      if (this.activeElapse?.rightUid === shot.entry.uid && this.activeElapse.lane === lane) {
        this.finishElapseBeam({
          lane,
          weak: !shot.shouldAdvance,
          timing,
          targetBeat: shot.targetBeat,
          shouldAdvance: shot.shouldAdvance,
        }, enemyIndex);
        this.finishShotProgress(shot);
        return;
      }

      if (this.activeElapse?.rightUid === shot.entry.uid && this.activeElapse.lane !== lane) {
        this.failElapseBeam("late");
        this.finishShotProgress(shot);
        return;
      }

      this.applyTimingResult(lane, timing, shot.targetBeat, shot.entry.color, shot.shouldAdvance);
      this.floaters.push({
        lane,
        y: 0.8,
        text: "empty",
        color: "#aeb8c7",
        ttl: 0.5,
      });
      this.finishShotProgress(shot);
      return;
    }

    const events = resolveBulletShot({
      slot: shot.entry.slot,
      lane,
      enemies: enemyIndex,
      currentBeat: this.beat,
      targetBeat: shot.targetBeat,
      echoAnchorBeat: shot.shouldAdvance ? shot.targetBeat : this.beat,
      beatSeconds: this.beatSeconds,
      damageMultiplier: multiplier,
      chipEffects: this.getCombatChipsForSlot(shot.entry.uid),
      scheduleEcho: (echo) => this.echoes.push(echo),
    });

    this.consumeCombatEvents(events, timing.label);
    this.applyTimingResult(lane, timing, shot.targetBeat, shot.entry.color, shot.shouldAdvance);
    const brokeHeldElapse = this.activeElapse && !shot.shouldAdvance;

    this.finishShotProgress(shot);
    if (brokeHeldElapse) {
      this.failElapseBeam("late");
    }
  }

  damageMultiplier() {
    return getDamageMultiplier(this.combo, {
      waveIndex: this.waveIndex,
      track: this.track,
      comboCap: this.comboCap,
    });
  }

  getRunState() {
    return {
      comboCap: this.comboCap,
      maxPlating: this.maxPlating,
      plating: this.plating,
      maxShockwaves: this.maxShockwaves,
      shockwaves: this.shockwaves,
    };
  }

  enemyHealthMultiplier() {
    return 1.15 ** this.enemyHealthTier();
  }

  enemyHealthTier() {
    const specialAdditions = Math.max(0, this.enemyPool.length - 1);
    return Math.floor(specialAdditions / 2);
  }

  skipStore() {
    if (!this.pendingUpgrade) {
      return;
    }

    this.whetstoneCandidateUid = null;
    this.wreckerCandidateUid = null;
    this.bankedStorePicks += Math.max(1, this.storePicks);
    this.storePicks = 0;
    this.pendingUpgrade = false;
    this.editorMessage = "Store skipped. Extra pick banked for the next store.";
    this.showIntermission();
  }

  chooseWoeChoice(type, kind = null) {
    const choice = this.woeChoices.find((woeChoice) =>
      woeChoice.type === type &&
      (!kind || woeChoice.kind === kind)
    );
    if (!this.pendingWoe || !choice) {
      return;
    }

    if (choice.kind === "aspect") {
      this.chooseAspectGrantor(type);
      return;
    }

    if (!this.enemyPool.includes(type)) {
      this.enemyPool.push(type);
    }

    const def = getEnemyDef(type);
    this.pendingWoe = false;
    this.woeChoices = [];
    this.storeOffer = null;
    this.choices = [];
    this.storePicks = 0;
    this.pendingUpgrade = false;
    this.whetstoneCandidateUid = null;
    this.wreckerCandidateUid = null;
    this.editorMessage = `${def.name} added to the spawn pool.`;
    this.showIntermission();
  }

  chooseAspectGrantor(type) {
    const aspect = getAspectForSource(type);
    if (!aspect) {
      this.editorMessage = "That special has no spreading aspect.";
      this.showIntermission();
      return;
    }

    if (!this.aspectGrantors.includes(type)) {
      this.aspectGrantors.push(type);
    }

    const def = getEnemyDef(type);
    this.pendingWoe = false;
    this.woeChoices = [];
    this.storeOffer = null;
    this.choices = [];
    this.storePicks = 0;
    this.pendingUpgrade = false;
    this.whetstoneCandidateUid = null;
    this.wreckerCandidateUid = null;
    this.editorMessage = `Defeated ${def.name}s now make nearby basics ${aspect.spreadDescription}.`;
    this.showIntermission();
  }

  openStoreAfterWave(show = false) {
    this.storePicks = this.bankedStorePicks + 1;
    this.bankedStorePicks = 0;
    this.whetstoneCandidateUid = null;
    this.wreckerCandidateUid = null;
    this.storeOffer = createStoreOffer(this.track, {
      ...this.getRunState(),
      storeCycleIndex: this.shopCycleIndex,
    });
    this.shopCycleIndex += this.storeOffer.cycleAdvance ?? 1;
    this.choices = this.storeOffer.choices;
    this.pendingUpgrade = true;

    if (show) {
      this.showIntermission();
    }
  }

  flashBeatBar(isCorrect, targetBeat, color) {
    this.beatFlashKind = isCorrect ? "good" : "bad";
    this.beatFlashTtl = BEAT_FLASH_SECONDS;
    this.beatBursts.push({
      id: this.beatBurstSerial += 1,
      offset: markerOffsetPercent(targetBeat - this.beat),
      color,
      isBeat: isOnBeat(targetBeat),
      ttl: BEAT_BURST_SECONDS,
    });
  }

  queuePiercingImpacts(event, label) {
    const beatDelay = Number.isFinite(event.stageDelaySeconds)
      ? event.stageDelaySeconds / this.beatSeconds
      : 0;
    (event.impacts ?? []).forEach((impact, index) => {
      const stageIndex = Number.isFinite(impact.stageIndex) ? impact.stageIndex : index;
      this.pendingPiercingImpacts.push({
        arrivalBeat: this.beat + beatDelay * stageIndex,
        impact,
        label,
      });
    });
  }

  processPendingPiercingImpacts() {
    if (this.pendingPiercingImpacts.length === 0) {
      return;
    }

    const ready = [];
    this.pendingPiercingImpacts = this.pendingPiercingImpacts.filter((queued) => {
      if (queued.arrivalBeat <= this.beat) {
        ready.push(queued);
        return false;
      }

      return true;
    });

    ready.forEach((queued) => {
      const events = resolvePiercingImpact({
        impact: queued.impact,
        enemies: this.enemies,
        currentBeat: this.beat,
      });
      appendCombatEvents({
        events,
        label: queued.label,
        enemies: this.enemies,
        effects: this.effects,
        floaters: this.floaters,
      });
    });
  }

  consumeCombatEvents(events, label) {
    const visibleEvents = events.map((event) => {
      if (event.kind !== "piercingProjectile") {
        return event;
      }

      this.queuePiercingImpacts(event, label);
      const { impacts, ...visibleEvent } = event;
      return visibleEvent;
    });

    appendCombatEvents({
      events: visibleEvents,
      label,
      enemies: this.enemies,
      effects: this.effects,
      floaters: this.floaters,
    });
    this.processPendingPiercingImpacts();
  }

  clearWave() {
    this.waveRunner.finish();
    this.activeElapse = null;
    this.pendingChipShots = [];
    this.pendingPiercingImpacts = [];
    this.pendingAspectSpreads = [];
    this.resetPlatingFinisher();
    this.frameEnemyIndex = null;
    this.score += 260 + this.waveIndex * 40;
    this.waveIndex += 1;
    this.visualWaveProgress = 0;
    this.waveProgressFlashTtl = 0;
    this.beatBarWinddownTtl = 0;
    this.suppressBeatBullets = false;
    this.progressEl?.classList.remove("is-complete-flash");
    this.beatStrip?.classList.remove("is-winding-down");
    if (this.waveIndex >= 3) {
      this.beatSeconds = Math.max(0.82, 1 - (this.waveIndex - 2) * 0.025);
    }
    if (shouldOfferWoe(this.waveIndex, this.enemyPool, this.aspectGrantors)) {
      this.pendingWoe = true;
      this.woeChoices = createWoeChoices(this.enemyPool, this.aspectGrantors);
      this.storeOffer = null;
      this.choices = [];
      this.storePicks = 0;
      this.pendingUpgrade = false;
    } else {
      this.openStoreAfterWave();
    }
    this.showIntermission();
  }

  endRun() {
    this.active = false;
    this.pendingChipShots = [];
    this.pendingPiercingImpacts = [];
    this.pendingAspectSpreads = [];
    this.frameEnemyIndex = null;
    this.persistRunScore();
    this.intermissionView.renderGameOver(this.score, this.waveIndex, this.scoreSaveResult);
  }

  persistRunScore() {
    if (this.props.saveScore === false || this.scoreSaveResult || this.score <= 0) {
      return this.scoreSaveResult;
    }

    this.scoreSaveResult = recordLeaderboardScore(this.playerTag, this.score);
    return this.scoreSaveResult;
  }

  updateHud() {
    if (!this.hud.wave) {
      return;
    }

    this.setHudText("wave", `${this.waveIndex + 1}`);
    this.setHudText("score", `${Math.round(this.score)}`);
    this.setHudText("combo", `x${this.damageMultiplier().toFixed(2)}`);
    this.setHudText("plating", `${Math.max(0, this.plating)}`);
    this.setHudText("shockwaves", `${this.shockwaves}`);
    this.setHudText("next", this.track.currentEntry?.name ?? "");
  }

  setHudText(key, value) {
    const node = this.hud[key];
    if (node && node.textContent !== value) {
      node.textContent = value;
    }
  }

  updateBeatIndicator() {
    this.beatBarView?.update({
      beat: this.beat,
      track: this.track,
      suppressBeatBullets: this.suppressBeatBullets,
      beatFlashTtl: this.beatFlashTtl,
      beatFlashKind: this.beatFlashKind,
      waveClearOutro: this.waveClearOutro,
      winddownRatio: clamp(this.beatBarWinddownTtl / BEAT_BAR_WINDDOWN_SECONDS, 0, 1),
      bursts: this.beatBursts,
    });
  }

  updateWaveProgressTracker(dt = 0) {
    const progress = this.waveRunner.getProgress(this.waveKills, this.enemies);
    this.visualWaveProgress = updateWaveProgressView({
      el: this.progressEl,
      dt,
      progress,
      platingCoverage: this.plating,
      waveIndex: this.waveIndex,
      waveClearOutro: this.waveClearOutro,
      flashTtl: this.waveProgressFlashTtl,
      visualProgress: this.visualWaveProgress,
    });
  }

  updateResourceVisuals(dt = 0) {
    this.trackResourceLoss("plating", this.plating, this.maxPlating);
    this.trackResourceLoss("shockwaves", this.shockwaves, this.maxShockwaves);
    this.resourceFlashes = this.resourceFlashes
      .map((flash) => ({ ...flash, ttl: flash.ttl - dt }))
      .filter((flash) => flash.ttl > 0);
    Object.entries(this.resourceTransitions).forEach(([kind, transition]) => {
      if (!transition) {
        return;
      }

      const nextTransition = { ...transition, ttl: transition.ttl - dt };
      this.resourceTransitions[kind] = nextTransition.ttl > 0 ? nextTransition : null;
    });
  }

  trackResourceLoss(kind, value, maxValue) {
    const current = Math.max(0, Math.floor(value ?? 0));
    const previous = this.resourceFlashState[kind] ?? current;
    if (current < previous) {
      const maxCount = Math.max(maxValue ?? previous, previous, 1);
      this.addResourceLossFlashes(kind, previous, current, maxCount);
      this.resourceTransitions[kind] = {
        fromCount: previous,
        toCount: current,
        maxCount,
        ttl: RESOURCE_RECENTER_SECONDS,
        duration: RESOURCE_RECENTER_SECONDS,
      };
    } else if (current > previous) {
      this.resourceTransitions[kind] = null;
    }

    this.resourceFlashState[kind] = current;
  }

  addResourceLossFlashes(kind, previous, current, maxCount) {
    for (let index = current; index < previous; index += 1) {
      this.resourceFlashes.push({
        kind,
        index,
        countBefore: previous,
        maxCount,
        ttl: RESOURCE_FLASH_SECONDS,
        duration: RESOURCE_FLASH_SECONDS,
      });
    }
  }

  render() {
    const enemyIndex = this.frameEnemyIndex?.enemies === this.enemies
      ? this.frameEnemyIndex
      : createEnemyFrameIndex(this.enemies);
    this.renderer?.render({
      enemies: this.enemies,
      effects: this.effects,
      floaters: this.floaters,
      track: this.track,
      beat: this.beat,
      spawnWarnings: [
        ...this.waveRunner.getSpawnWarnings(this.beat),
        ...this.getTutorialSpawnWarnings(),
      ],
      speedBoosts: getLaneSpeedBoosts(enemyIndex),
      activeBeams: this.getElapseBeamView(),
      comboMultiplier: this.damageMultiplier(),
      comboCap: this.comboCap,
      suppressBeatBullets: this.suppressBeatBullets,
      beatFlashTtl: this.beatFlashTtl,
      beatFlashKind: this.beatFlashKind,
      resources: {
        plating: Math.max(0, this.plating),
        maxPlating: this.maxPlating,
        shockwaves: this.shockwaves,
        maxShockwaves: this.maxShockwaves,
        flashes: this.resourceFlashes,
        transitions: this.resourceTransitions,
      },
    });
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.el?.removeEventListener("click", this.onClick);
    this.el?.removeEventListener("contextmenu", this.onContextMenu);
    this.overlay?.removeEventListener("dragstart", this.onDragStart);
    this.overlay?.removeEventListener("dragover", this.onDragOver);
    this.overlay?.removeEventListener("drop", this.onDrop);
    this.overlay?.removeEventListener("dragend", this.onDragEnd);
    this.endDragProxy();
    this.canvas?.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.el?.remove();
  }
}
