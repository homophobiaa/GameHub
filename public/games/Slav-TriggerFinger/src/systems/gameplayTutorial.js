import {
  FIRST_WAVE_TUTORIAL_STEPS,
  READY_CHECK_TUTORIAL_STEPS,
} from "../defs/tutorial.js";

const EMPTY_TUTORIAL_CONTEXT = {
  enabled: false,
  notes: [],
  tooltips: [],
  script: [],
};

export class GameplayTutorialController {
  constructor({ enabled = false, tag = "" } = {}) {
    this.enabled = Boolean(enabled);
    this.tag = tag;
    this.notes = [];
    this.tooltips = [];
    this.script = [];
    this.stageId = null;
    this.readyCheckStepIndex = 0;
    this.readyCheckComplete = false;
    this.firstWaveIntroStarted = false;
    this.firstWaveIntroComplete = false;
    this.gameplayStepIndex = 0;
  }

  getContext() {
    if (!this.enabled) {
      return EMPTY_TUTORIAL_CONTEXT;
    }

    return {
      enabled: true,
      tag: this.tag,
      stageId: this.stageId,
      notes: this.notes,
      tooltips: this.tooltips,
      script: this.script,
    };
  }

  getReadyCheckStep() {
    if (!this.enabled || this.readyCheckComplete) {
      return null;
    }

    return READY_CHECK_TUTORIAL_STEPS[this.readyCheckStepIndex] ?? null;
  }

  isReadyCheckBlocking() {
    return Boolean(this.getReadyCheckStep()?.blocking);
  }

  advanceReadyCheckStep() {
    if (!this.isReadyCheckBlocking()) {
      return false;
    }

    this.readyCheckStepIndex += 1;
    return true;
  }

  completeReadyCheck() {
    this.readyCheckComplete = true;
  }

  shouldStartFirstWaveIntro(waveIndex) {
    return this.enabled &&
      waveIndex === 0 &&
      !this.firstWaveIntroStarted &&
      !this.firstWaveIntroComplete;
  }

  startFirstWaveIntro() {
    if (!this.enabled || this.firstWaveIntroStarted || this.firstWaveIntroComplete) {
      return false;
    }

    this.stageId = "first-wave-intro";
    this.firstWaveIntroStarted = true;
    this.gameplayStepIndex = 0;
    return true;
  }

  getGameplayStep() {
    if (!this.enabled || this.stageId !== "first-wave-intro" || this.firstWaveIntroComplete) {
      return null;
    }

    return FIRST_WAVE_TUTORIAL_STEPS[this.gameplayStepIndex] ?? null;
  }

  isGameplayBlocking() {
    return Boolean(this.getGameplayStep()?.blocking);
  }

  advanceGameplayStep({ force = false } = {}) {
    if (!force && !this.isGameplayBlocking()) {
      return null;
    }

    const step = this.getGameplayStep();
    if (!step) {
      return null;
    }

    this.gameplayStepIndex += 1;
    if (!this.getGameplayStep()) {
      this.firstWaveIntroComplete = true;
      this.stageId = null;
    }
    return step;
  }

  onWaveStart() {}

  onTimingResult() {}

  update() {}
}

export function createGameplayTutorialController(options = {}) {
  return new GameplayTutorialController(options);
}
