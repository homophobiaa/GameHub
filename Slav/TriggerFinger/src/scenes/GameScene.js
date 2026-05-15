import { STARTING_TRACK, getBulletDef, getElapseHalf, isElapsePiece } from "../defs/bullets.js";
import { getAspectForSource } from "../defs/aspects.js";
import { getEnemyDef } from "../defs/enemies.js";
import { BeatTrack } from "../systems/track.js";
import {
  applyEnemyBeatEffects,
  getEnemySpeedMultipliers,
  getLaneSpeedBoosts,
  grantAspectToBasics,
  updateLeapEnemy,
} from "../systems/enemyRuntime.js";
import {
  resolveBulletShot,
  resolveElapseFinish,
  resolveElapseStart,
  updateDamageOverTime,
  updateElapseBeamDamage,
} from "../systems/combat.js";
import { WaveRunner } from "../systems/waveRunner.js";
import { applyUpgradeChoice, createStoreOffer } from "../systems/upgrades.js";
import { createEnemyDraftChoices, shouldDraftEnemy } from "../systems/enemyDraft.js";
import { getDamageMultiplier, rateTiming } from "../systems/timing.js";
import { GameRenderer } from "../render/GameRenderer.js";
import { BeatBarView, markerOffsetPercent } from "../ui/beatBarView.js";
import { renderGameOverPanel, renderIntermissionPanel } from "../ui/intermissionPanel.js";
import { isOnBeat } from "../utils/beatMath.js";
import { clamp } from "../utils/math.js";
import { pickRandom } from "../utils/random.js";
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

const STARTING_HEALTH = 10;
const WAVE_CLEAR_OUTRO_SECONDS = 0.85;
const WAVE_PROGRESS_FLASH_SECONDS = 0.5;
const BEAT_BAR_WINDDOWN_SECONDS = 0.7;
const GOOD_WINDOW_BEATS = 0.18;

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
    this.activeElapse = null;
    this.beat = 0;
    this.runSeconds = 0;
    this.beatSeconds = 1;
    this.score = 0;
    this.combo = 0;
    this.comboCap = 1.5;
    this.health = STARTING_HEALTH;
    this.shockwaves = 0;
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
    this.pendingEnemyDraft = false;
    this.enemyDraftChoices = [];
    this.editorMessage = "";
    this.beatFlashKind = "";
    this.beatFlashTtl = 0;
    this.beatBursts = [];
    this.beatBarView = null;
    this.dragProxy = null;
    this.dragSource = null;
    this.dragPayload = null;
    this.forgeryAnimating = false;
    this.forgeCandidateUid = null;
    this.activeElapse = null;
    this.pointerLane = null;
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
        <div class="hud-item"><span class="hud-label">Health</span><span class="hud-value" data-hud="health">10</span></div>
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
        <div class="lane-buttons">
          <button class="lane-button" data-lane="0">Left</button>
          <button class="lane-button" data-lane="1">Mid</button>
          <button class="lane-button" data-lane="2">Right</button>
        </div>
        <div class="overlay" data-overlay></div>
      </div>
      <footer class="wave-progress" data-wave-progress></footer>
    `;

    this.canvas = this.el.querySelector("canvas");
    this.renderer = new GameRenderer(this.canvas);
    this.overlay = this.el.querySelector("[data-overlay]");
    this.laneButtons = this.el.querySelector(".lane-buttons");
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
    this.overlay.addEventListener("dragstart", this.onDragStart);
    this.overlay.addEventListener("dragover", this.onDragOver);
    this.overlay.addEventListener("drop", this.onDrop);
    this.overlay.addEventListener("dragend", this.onDragEnd);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.laneButtons.addEventListener("pointerdown", this.onLaneButtonPointerDown);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("pointerup", this.onPointerUp);
    root.append(this.el);
    this.resize();
    this.showIntermission(true);
  }

  resize = () => {
    this.renderer?.resize();
  };

  onClick = (event) => {
    const debugAction = event.target.closest("[data-debug-action]")?.dataset.debugAction;
    if (debugAction && this.handleDebugAction(debugAction, event)) {
      return;
    }

    if (this.forgeryAnimating) {
      return;
    }

    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) {
      return;
    }

    if (action === "menu") {
      this.manager.load(MenuScene);
    }

    if (action === "start-wave") {
      this.startWave();
    }

    if (action === "skip-store") {
      this.skipStore();
    }

    if (action === "forge-candidate") {
      this.forgeCandidate();
      return;
    }

    if (action.startsWith("enemy-choice:")) {
      this.chooseEnemyType(action.split(":")[1]);
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
        this.health = runState.health;
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
    if (this.forgeryAnimating) {
      event.preventDefault();
      return;
    }

    const piece = event.target.closest("[data-piece-uid]");
    if (!piece || !event.dataTransfer) {
      return;
    }

    const payload = {
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
    const dropBeat = event.target.closest("[data-drop-beat]");
    const forgeryDrop = event.target.closest("[data-forgery-drop]");
    this.updateDropHover(dropBeat);

    if (
      dropBeat ||
      (forgeryDrop && this.canForgePiece(this.dragPayload?.uid)) ||
      event.target.closest("[data-inventory-drop]")
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
    const dropBeat = event.target.closest("[data-drop-beat]");
    const forgeryDrop = event.target.closest("[data-forgery-drop]");

    if (forgeryDrop) {
      this.forgeCandidateUid = this.canForgePiece(payload.uid) ? payload.uid : null;
      this.track.setSelected(payload.uid);
      this.editorMessage = this.forgeCandidateUid
        ? "Click the forgery panel to upgrade."
        : "That bullet cannot be upgraded.";
      this.endDragProxy();
      this.showIntermission();
      return;
    }

    if (dropBeat) {
      this.track.setSelected(payload.uid);
      this.endDragProxy();
      this.placeSelectedAt(Number(dropBeat.dataset.dropBeat));
      return;
    }

    if (event.target.closest("[data-inventory-drop]")) {
      this.moveDragProxy(event);
      const returnSnapshot = this.getInventoryReturnSnapshot();
      const didMove = this.track.movePieceToInventory(payload.uid);
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
    proxy.className = ["drag-proxy", timingClass, ...elapseClasses, upgradedClass]
      .filter(Boolean)
      .join(" ");
    proxy.style.setProperty("--piece-color", styles.getPropertyValue("--piece-color").trim());
    const dragDomain = this.getDragDomainMetrics(source);
    if (dragDomain) {
      proxy.style.setProperty("--domain-width", `${dragDomain.width}px`);
      proxy.style.setProperty("--domain-offset", `${dragDomain.offset}px`);
      proxy.style.setProperty("--proxy-width", `${dragDomain.proxyWidth}px`);
    }

    const domain = document.createElement("span");
    domain.className = "drag-proxy-domain";
    proxy.append(domain);

    const glyph = source.querySelector(".bullet-glyph")?.cloneNode(true);
    if (glyph) {
      proxy.append(glyph);
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

  animateInventoryReturn(uid, snapshot) {
    if (!snapshot) {
      return;
    }

    const target = this.overlay.querySelector(`[data-piece-uid="${uid}"][data-piece-source="inventory"]`);
    if (!target) {
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

  getForgeryUpgradeSnapshot(forgeryDrop, source = this.dragSource) {
    if (!source) {
      return null;
    }

    const visual = this.dragProxy?.querySelector(".bullet-glyph") ?? source;
    const visualRect = visual.getBoundingClientRect();
    const socketRect = (forgeryDrop.querySelector(".forgery-socket") ?? forgeryDrop)
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

  async animateForgeryUpgrade(uid, snapshot) {
    if (!snapshot || !this.canForgePiece(uid)) {
      this.forgePiece(uid);
      return;
    }

    this.forgeryAnimating = true;
    this.forgeCandidateUid = uid;
    snapshot.source?.classList.add("is-forging-source");
    const ghost = document.createElement("div");
    ghost.className = ["forgery-upgrade-ghost", "drag-proxy", snapshot.timingClass, snapshot.extraClasses]
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
    ghost.classList.add("is-upgraded", "is-forging");
    this.createForgerySparks(snapshot.socketCenter, snapshot.color);

    const didForge = this.applyForgePiece(uid);
    if (!didForge) {
      ghost.remove();
      snapshot.source?.classList.remove("is-forging-source");
      this.forgeryAnimating = false;
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
    snapshot.source?.classList.remove("is-forging-source");
    this.forgeryAnimating = false;
    this.forgeCandidateUid = null;
    this.showIntermission();
    this.animateInventoryReturn(uid, returnSnapshot);
  }

  createForgerySparks(center, color) {
    const sparks = 18;
    for (let i = 0; i < sparks; i += 1) {
      const spark = document.createElement("span");
      const angle = -Math.PI * 0.92 + (Math.PI * 1.84 * i) / Math.max(1, sparks - 1);
      const distance = 28 + (i % 5) * 8;
      spark.className = "forgery-spark";
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

  highlightValidPlacements(uid) {
    const timeline = this.overlay.querySelector(".timeline-body");
    timeline?.classList.add("is-dragging");

    this.overlay.querySelectorAll("[data-drop-beat]").forEach((drop) => {
      const result = this.track.canPlace(uid, Number(drop.dataset.dropBeat));
      drop.classList.toggle("is-valid-drop", result.ok);
      drop.classList.toggle("is-invalid-drop", !result.ok);
      drop.title = result.ok ? "Place here" : result.reason;
    });
  }

  clearPlacementHighlights() {
    this.overlay?.querySelector(".timeline-body")?.classList.remove("is-dragging");
    this.overlay?.querySelectorAll("[data-drop-beat]").forEach((drop) => {
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

  canForgePiece(uid) {
    const piece = uid ? this.track.findPiece(uid) : null;
    return Boolean(
      this.storeOffer?.store.id === "forgery" &&
      this.storePicks > 0 &&
      piece &&
      !piece.upgraded,
    );
  }

  applyForgePiece(uid) {
    const piece = this.track.findPiece(uid);
    if (this.storeOffer?.store.id !== "forgery") {
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
    this.track.setSelected(uid);
    this.forgeCandidateUid = null;
    this.storePicks = Math.max(0, this.storePicks - 1);
    const remainingUpgradeable = this.track.allPieces.filter((nextPiece) => !nextPiece.upgraded).length;
    this.storeOffer = {
      ...this.storeOffer,
      choices: [],
      upgradeableCount: remainingUpgradeable,
    };
    this.editorMessage = "Bullet upgraded.";

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

  forgePiece(uid) {
    this.applyForgePiece(uid);
    this.showIntermission();
  }

  forgeCandidate() {
    const uid = this.forgeCandidateUid;
    if (!uid) {
      this.editorMessage = "Drop a bullet into the forgery slot first.";
      this.showIntermission();
      return;
    }

    const forgeryDrop = this.overlay.querySelector("[data-forgery-drop]");
    const source = this.overlay.querySelector("[data-forge-candidate-token]");
    if (!forgeryDrop || !source) {
      this.forgePiece(uid);
      return;
    }

    const snapshot = this.getForgeryUpgradeSnapshot(forgeryDrop, source);
    this.animateForgeryUpgrade(uid, snapshot);
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

    this.pointerLane = lane;
    this.fireLane(lane);
  };

  onLaneButtonPointerDown = (event) => {
    const laneButton = event.target.closest("[data-lane]");
    if (!laneButton) {
      return;
    }

    event.preventDefault();
    const lane = Number(laneButton.dataset.lane);
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

  startWave() {
    if (this.pendingEnemyDraft) {
      this.editorMessage = "Pick an enemy type first.";
      this.showIntermission();
      return;
    }

    if (this.storePicks > 0) {
      this.editorMessage = "Pick a store reward first.";
      this.showIntermission();
      return;
    }

    if (this.forgeryAnimating) {
      this.editorMessage = "Forgery in progress.";
      this.showIntermission();
      return;
    }

    if (this.track.placements.length === 0) {
      this.editorMessage = "Place at least one bullet on the timeline.";
      this.showIntermission();
      return;
    }

    this.overlay.hidden = true;
    this.active = true;
    this.intermission = false;
    this.pendingUpgrade = false;
    this.choices = [];
    this.storeOffer = null;
    this.storePicks = 0;
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
    this.track.start(this.beat);
    this.beatBarView?.clearMotion();
    this.lastWholeBeat = Math.floor(this.beat);
    this.waveRunner.start(this.waveIndex, this.beat, {
      enemyPool: this.enemyPool,
      healthMultiplier: this.enemyHealthMultiplier(),
      aspectGrantors: this.aspectGrantors,
    });
  }

  getScrollableIntermissionNodes() {
    if (!this.overlay) {
      return [];
    }

    return [
      ".upgrade-panel",
      ".intermission-shell",
      ".store-menu",
      ".store-choice-list",
      ".editor-tab",
      ".debug-menu",
    ].flatMap((selector) =>
      [...this.overlay.querySelectorAll(selector)].map((node, index) => ({
        selector,
        index,
        node,
      })),
    );
  }

  captureIntermissionScroll() {
    return this.getScrollableIntermissionNodes().map(({ selector, index, node }) => ({
      selector,
      index,
      top: node.scrollTop,
      left: node.scrollLeft,
    }));
  }

  restoreIntermissionScroll(scrollState) {
    if (!scrollState?.length || !this.overlay) {
      return;
    }

    const apply = () => {
      scrollState.forEach(({ selector, index, top, left }) => {
        const node = this.overlay.querySelectorAll(selector)[index];
        if (node) {
          node.scrollTop = top;
          node.scrollLeft = left;
        }
      });
    };

    apply();
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(apply);
    }
  }

  showIntermission(isFirst = false) {
    const scrollState = this.captureIntermissionScroll();
    this.active = false;
    this.intermission = true;
    this.suppressBeatBullets = true;
    this.overlay.hidden = false;
    this.overlay.innerHTML = renderIntermissionPanel({
      isFirst,
      waveIndex: this.waveIndex,
      track: this.track,
      choices: this.choices,
      pendingUpgrade: this.pendingUpgrade,
      storeOffer: this.storeOffer,
      storePicks: this.storePicks,
      bankedStorePicks: this.bankedStorePicks,
      forgeCandidateUid: this.forgeCandidateUid,
      enemyDraft: this.pendingEnemyDraft
        ? {
            choices: this.enemyDraftChoices,
            unlocked: this.enemyPool,
          }
        : null,
      message: this.editorMessage,
    });
    this.restoreIntermissionScroll(scrollState);
  }

  placeSelectedAt(beat) {
    const result = this.track.movePieceToTrack(this.track.selectedUid, beat);
    this.editorMessage = result.ok ? "" : result.reason;
    this.showIntermission();
  }

  update(dt) {
    if (this.active) {
      this.runSeconds += dt;
      this.beat += dt / this.beatSeconds;
      this.track.syncTarget(this.beat);
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

    if (!this.active) {
      return;
    }

    this.processBeatTicks();
    if (this.shouldUpdateWaves()) {
      this.waveRunner.update(this.beat, (enemy) => this.enemies.push(enemy), this.enemies, {
        currentSecond: this.runSeconds,
      });
    }
    this.updateEchoes();
    this.updateEnemies(dt);
    this.updateElapse(dt);
    this.updateEffects(dt);
    this.removeDeadEnemies();

    if (this.health <= 0) {
      this.endRun();
    }

    if (this.waveRunner.isComplete(this.enemies) && !this.waveClearOutro) {
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
      if (enemy.hp <= 0 || enemy.targetable === false) {
        return;
      }

      enemy.y = Math.max(0.05, enemy.y - knockback);
    });
    this.playShockwaveEffect();
    this.floaters.push({
      lane: 1,
      y: 0.88,
      text: "shockwave",
      color: "#f8fbff",
      ttl: 0.7,
    });
    return true;
  }

  playShockwaveEffect() {
    if (!this.screenEffects || !this.el || !this.canvas || !this.renderer) {
      return;
    }

    const sceneRect = this.el.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    const x = canvasRect.left - sceneRect.left + this.renderer.arena.x + this.renderer.arena.width / 2;
    const y = canvasRect.top - sceneRect.top + this.renderer.yToScreen(0.9);
    const finalDiameter = Math.hypot(sceneRect.width, sceneRect.height) * 2;
    const startSize = 46;
    const ring = document.createElement("span");
    ring.className = "shockwave-screen-ring";
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    ring.style.setProperty("--shockwave-scale", `${finalDiameter / startSize}`);
    this.screenEffects.append(ring);
    ring.addEventListener("animationend", () => ring.remove(), { once: true });
  }

  beginWaveClearOutro() {
    this.active = false;
    this.activeElapse = null;
    this.combo = 0;
    this.waveClearOutro = true;
    this.waveClearOutroTimer = WAVE_CLEAR_OUTRO_SECONDS;
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
      const events = resolveBulletShot({
        slot: echo.slot,
        lane: echo.lane,
        enemies: this.enemies,
        currentBeat: this.beat,
        beatSeconds: this.beatSeconds,
        damageMultiplier: this.damageMultiplier() * 0.95,
        scheduleEcho: () => {},
      });
      this.consumeCombatEvents(events, "echo");
    });
  }

  updateEnemies(dt) {
    const laneBoosts = [1, 1, 1];
    getLaneSpeedBoosts(this.enemies).forEach((boost) => {
      laneBoosts[boost.lane] = boost.amount;
    });
    const speedMultipliers = getEnemySpeedMultipliers(this.enemies);

    const dotEvents = [];
    updateDamageOverTime(this.enemies, dt, this.beat, dotEvents);
    this.consumeCombatEvents(dotEvents, "dot");

    const movementDt = this.areEnemiesPaused() ? 0 : dt;

    this.enemies.forEach((enemy) => {
      if (enemy.leap && !enemy.targetable) {
        updateLeapEnemy(enemy, this.enemies, this.beat);
        return;
      }

      const elapseSlow = this.activeElapse?.slowMultiplier < 1 && enemy.id === this.activeElapse.targetId
        ? this.activeElapse.slowMultiplier
        : 1;
      enemy.y += enemy.speed *
        laneBoosts[enemy.lane] *
        (speedMultipliers.get(enemy.id) ?? 1) *
        elapseSlow *
        movementDt;
      enemy.visualY ??= enemy.y;
      enemy.visualY += (enemy.y - enemy.visualY) * Math.min(1, dt * 9);
      if (enemy.y >= 1) {
        enemy.hp = 0;
        if (this.canTakeDamage()) {
          this.health -= 1;
          this.triggerShockwave();
        }
        this.combo = Math.max(0, this.combo - 0.16);
        this.floaters.push({
          lane: enemy.lane,
          y: 0.92,
          text: "breach",
          color: "#e65d5d",
          ttl: 0.8,
        });
      }
    });
  }

  updateEffects(dt) {
    this.effects = this.effects
      .map((effect) => ({ ...effect, ttl: effect.ttl - dt }))
      .filter((effect) => effect.ttl > 0);
    this.floaters = this.floaters
      .map((floater) => ({ ...floater, ttl: floater.ttl - dt, y: floater.y - dt * 0.08 }))
      .filter((floater) => floater.ttl > 0);
  }

  removeDeadEnemies() {
    const killed = this.enemies.filter((enemy) => enemy.hp <= 0 && enemy.y < 1);
    killed.forEach((enemy) => {
      this.spreadAspectFromDeath(enemy);
      if (!enemy.scored) {
        enemy.scored = true;
        this.waveKills += 1;
        this.score += getEnemyDef(enemy.type).score;
      }
    });

    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
  }

  spreadAspectFromDeath(enemy) {
    if (!enemy.aspectGrantor || enemy.aspectSpread) {
      return;
    }

    enemy.aspectSpread = true;
    const aspect = getAspectForSource(enemy.aspectGrantor);
    const affected = grantAspectToBasics(this.enemies, enemy.aspectGrantor, 4);
    affected.forEach((basic) => {
      this.effects.push({
        kind: "ring",
        lane: basic.lane,
        y: basic.visualY ?? basic.y,
        color: aspect.color,
        radius: 14,
        growth: 24,
        ttl: 0.34,
        duration: 0.34,
      });
    });
  }

  applyTimingResult(lane, timing, targetBeat, color, isCorrect) {
    const combo = Number.isFinite(this.combo) ? this.combo : 0;
    const comboDelta = Number.isFinite(timing.comboDelta) ? timing.comboDelta : -0.14;
    this.combo = clamp(combo + comboDelta, 0, 1);
    this.score += Number.isFinite(timing.score) ? timing.score : 0;
    this.floaters.push({
      lane,
      y: 0.88,
      text: timing.label,
      color: timing.color,
      ttl: 0.62,
    });
    this.flashBeatBar(isCorrect, targetBeat, color);
  }

  finishShotProgress(shot) {
    if (shot.shouldAdvance) {
      this.track.advanceFromShot(shot.targetBeat);
    } else {
      this.track.registerBadShot(shot.targetBeat);
    }
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
      targetY: target?.hp > 0 ? target.visualY ?? target.y : 0.04,
    }];
  }

  startElapseBeam(lane, shot, timing, damageMultiplier) {
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
      enemies: this.enemies,
      currentBeat: this.beat,
    });
    this.consumeCombatEvents(start.events, timing.label);
    this.activeElapse = {
      lane,
      groupId: shot.entry.groupId,
      rightUid: rightPlacement.uid,
      rightTargetBeat: shot.targetBeat + (rightPlacement.beat - shot.entry.beat),
      targetId: start.targetId,
      damageMultiplier,
      slowMultiplier: shot.entry.upgraded || rightPlacement.upgraded ? 0.7 : 1,
      color: shot.entry.color,
      observedUid: null,
      observedTargetBeat: null,
    };
    this.applyTimingResult(lane, timing, shot.targetBeat, shot.entry.color, shot.shouldAdvance);
    this.finishShotProgress(shot);
  }

  finishElapseBeam({ lane, weak, timing, targetBeat, shouldAdvance = false }) {
    if (!this.activeElapse) {
      return;
    }

    const events = resolveElapseFinish({
      lane,
      enemies: this.enemies,
      currentBeat: this.beat,
      damageMultiplier: this.damageMultiplier() * timing.damageFactor,
      weak,
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
      this.track.registerBadShot(missedTargetBeat);
    }
  }

  releaseLane(lane) {
    if (!this.active || !this.activeElapse || this.activeElapse.lane !== lane) {
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
        this.track.registerBadShot(targetBeat);
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
        this.track.advanceFromShot(shot.targetBeat);
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
      this.track.registerBadShot(shot.targetBeat);
      this.lastShotAt = this.beat;
      return;
    }

    const isEarly = this.beat < this.activeElapse.rightTargetBeat - GOOD_WINDOW_BEATS;
    this.failElapseBeam(isEarly ? "early" : "late");
    this.lastShotAt = this.beat;
  }

  updateElapse(dt) {
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
      enemies: this.enemies,
      dt,
      currentBeat: this.beat,
      beatSeconds: this.beatSeconds,
      damageMultiplier: this.activeElapse.damageMultiplier,
    });
    this.activeElapse.targetId = result.targetId;
    this.consumeCombatEvents(result.events, "dot");
  }

  fireLane(lane) {
    if (!this.active || this.beat - this.lastShotAt < 0.12) {
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
    if (isElapsePiece(shot.entry)) {
      if (getElapseHalf(shot.entry) === "left") {
        this.startElapseBeam(lane, shot, timing, multiplier);
        return;
      }

      if (this.activeElapse?.rightUid === shot.entry.uid && this.activeElapse.lane === lane) {
        this.finishElapseBeam({
          lane,
          weak: !shot.shouldAdvance,
          timing,
          targetBeat: shot.targetBeat,
          shouldAdvance: shot.shouldAdvance,
        });
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
      enemies: this.enemies,
      currentBeat: this.beat,
      echoAnchorBeat: shot.shouldAdvance ? shot.targetBeat : this.beat,
      beatSeconds: this.beatSeconds,
      damageMultiplier: multiplier,
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
      health: this.health,
      shockwaves: this.shockwaves,
    };
  }

  enemyHealthMultiplier() {
    return 1.25 ** this.enemyHealthTier();
  }

  enemyHealthTier() {
    const specialAdditions = Math.max(0, this.enemyPool.length - 1);
    return Math.floor(specialAdditions / 2);
  }

  unlockAspectGrantor() {
    const candidates = this.enemyPool.filter((type) =>
      type !== "basic" &&
      getAspectForSource(type) &&
      !this.aspectGrantors.includes(type)
    );
    const [grantor] = pickRandom(candidates, 1);
    if (grantor) {
      this.aspectGrantors.push(grantor);
    }

    return grantor ?? null;
  }

  skipStore() {
    if (!this.pendingUpgrade) {
      return;
    }

    this.forgeCandidateUid = null;
    this.bankedStorePicks += Math.max(1, this.storePicks);
    this.storePicks = 0;
    this.pendingUpgrade = false;
    this.editorMessage = "Store skipped. Extra pick banked for the next store.";
    this.showIntermission();
  }

  chooseEnemyType(type) {
    if (!this.pendingEnemyDraft || !this.enemyDraftChoices.some((choice) => choice.type === type)) {
      return;
    }

    const previousHealthTier = this.enemyHealthTier();
    if (!this.enemyPool.includes(type)) {
      this.enemyPool.push(type);
    }
    const newHealthTier = this.enemyHealthTier();

    const def = getEnemyDef(type);
    const grantor = newHealthTier > previousHealthTier ? this.unlockAspectGrantor() : null;
    const aspect = getAspectForSource(grantor);
    this.pendingEnemyDraft = false;
    this.enemyDraftChoices = [];
    this.storeOffer = null;
    this.choices = [];
    this.storePicks = 0;
    this.pendingUpgrade = false;
    this.forgeCandidateUid = null;
    this.editorMessage = `${def.name} added to the spawn pool.${
      grantor && aspect
        ? ` ${getEnemyDef(grantor).name} now grants ${aspect.name} to basics.`
        : ""
    }`;
    this.showIntermission();
  }

  openStoreAfterWave(show = false) {
    this.storePicks = this.bankedStorePicks + 1;
    this.bankedStorePicks = 0;
    this.forgeCandidateUid = null;
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
    this.beatFlashTtl = 0.18;
    this.beatBursts.push({
      offset: markerOffsetPercent(targetBeat - this.beat),
      color,
      isBeat: isOnBeat(targetBeat),
      ttl: 0.24,
    });
  }

  consumeCombatEvents(events, label) {
    events.forEach((event) => {
      if (event.kind === "projectile") {
        this.effects.push({
          kind: "projectile",
          lane: event.lane,
          color: event.color,
          ttl: event.secondary ? 0.18 : 0.25,
          secondary: event.secondary,
          endY: event.endY ?? 0.04,
          width: event.width,
        });
      }

      if (event.kind === "horizontalBar") {
        this.effects.push({
          kind: "horizontalBar",
          color: event.color,
          y: event.y,
          radius: event.radius,
          ttl: 0.22,
        });
      }

      if (event.kind === "phase") {
        this.effects.push({
          kind: "phaseBurst",
          lane: event.lane,
          y: event.y,
          color: event.color,
          ttl: 0.26,
          duration: 0.26,
        });
      }

      if (event.kind === "slash") {
        const visualEnemy = this.enemies.find(
          (enemy) => enemy.lane === event.lane && Math.abs(enemy.y - event.y) < 0.001,
        );
        this.effects.push({
          kind: "slash",
          lane: event.lane,
          y: visualEnemy?.visualY ?? event.y,
          rotation: event.rotation,
          color: event.color,
          ttl: 0.2,
          duration: 0.2,
        });
      }

      if (event.kind === "hit" || event.kind === "guard") {
        const visualEnemy = this.enemies.find(
          (enemy) => enemy.lane === event.lane && Math.abs(enemy.y - event.y) < 0.001,
        );
        this.floaters.push({
          lane: event.lane,
          y: visualEnemy?.visualY ?? event.y,
          text: event.text,
          color: event.color,
          ttl: label === "dot" ? 0.18 : 0.55,
        });
      }
    });
  }

  clearWave() {
    this.waveRunner.finish();
    this.activeElapse = null;
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
    if (shouldDraftEnemy(this.waveIndex, this.enemyPool)) {
      this.pendingEnemyDraft = true;
      this.enemyDraftChoices = createEnemyDraftChoices(this.enemyPool);
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
    this.overlay.hidden = false;
    this.overlay.innerHTML = renderGameOverPanel(this.score, this.waveIndex);
  }

  updateHud() {
    if (!this.hud.wave) {
      return;
    }

    this.hud.wave.textContent = `${this.waveIndex + 1}`;
    this.hud.score.textContent = `${Math.round(this.score)}`;
    this.hud.combo.textContent = `x${this.damageMultiplier().toFixed(2)}`;
    this.hud.health.textContent = `${Math.max(0, this.health)}`;
    this.hud.shockwaves.textContent = `${this.shockwaves}`;
    this.hud.next.textContent = this.track.currentEntry?.name ?? "";
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
    if (!this.progressEl) {
      return;
    }

    const progress = this.waveRunner.getProgress(this.waveKills, this.enemies);
    const total = progress.total;
    const targetRatio = this.waveClearOutro
      ? 1
      : total > 0
        ? clamp(progress.spawned / total, 0, 1)
        : 0;
    const catchup = dt > 0 ? clamp(dt * 5.5, 0, 1) : 1;
    this.visualWaveProgress = targetRatio >= this.visualWaveProgress
      ? this.visualWaveProgress + (targetRatio - this.visualWaveProgress) * catchup
      : this.visualWaveProgress;
    if (Math.abs(this.visualWaveProgress - targetRatio) < 0.005) {
      this.visualWaveProgress = Math.max(this.visualWaveProgress, targetRatio);
    }
    const ratio = clamp(this.visualWaveProgress, 0, 1);
    const label = progress.active
      ? `${progress.spawned}/${total} spawned`
      : `Wave ${this.waveIndex + 1} ready`;
    const detail = progress.active
      ? `${progress.kills} defeated | ${progress.alive} alive${progress.pendingPatterns ? ` | ${progress.pendingPatterns} pattern${progress.pendingPatterns === 1 ? "" : "s"}` : ""}`
      : "Start a wave to track kills.";
    const contentStamp = [
      progress.active ? 1 : 0,
      this.waveClearOutro ? 1 : 0,
      this.waveIndex,
      progress.spawned,
      total,
      progress.kills,
      progress.alive,
      progress.pendingPatterns,
    ].join("|");

    this.progressEl.classList.toggle("is-complete-flash", this.waveProgressFlashTtl > 0);

    if (this.progressEl.dataset.stamp === contentStamp) {
      const fill = this.progressEl.querySelector("[data-progress-fill]");
      if (fill) {
        fill.style.width = `${ratio * 100}%`;
      }
      return;
    }

    this.progressEl.dataset.stamp = contentStamp;
    this.progressEl.innerHTML = `
      <div class="wave-progress-copy">
        <span>Wave ${this.waveIndex + 1}</span>
        <small>${label}</small>
      </div>
      <div class="wave-progress-bar" aria-label="${label}">
        <span data-progress-fill style="width:${ratio * 100}%"></span>
      </div>
      <div class="wave-progress-copy is-right">
        <span>${Math.round(ratio * 100)}%</span>
        <small>${detail}</small>
      </div>
    `;
  }

  render() {
    this.renderer?.render({
      enemies: this.enemies,
      effects: this.effects,
      floaters: this.floaters,
      track: this.track,
      beat: this.beat,
      spawnWarnings: this.waveRunner.getSpawnWarnings(this.beat),
      speedBoosts: getLaneSpeedBoosts(this.enemies),
      activeBeams: this.getElapseBeamView(),
    });
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.el?.removeEventListener("click", this.onClick);
    this.overlay?.removeEventListener("dragstart", this.onDragStart);
    this.overlay?.removeEventListener("dragover", this.onDragOver);
    this.overlay?.removeEventListener("drop", this.onDrop);
    this.overlay?.removeEventListener("dragend", this.onDragEnd);
    this.endDragProxy();
    this.canvas?.removeEventListener("pointerdown", this.onPointerDown);
    this.laneButtons?.removeEventListener("pointerdown", this.onLaneButtonPointerDown);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.el?.remove();
  }
}
