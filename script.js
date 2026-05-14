const GAME_DURATION = 60;
const DEFAULT_LEADERBOARD_DIFFICULTY = "normal";
const SOUND_STORAGE_KEY = "typingSoundMuted";

// Each difficulty owns both its own text pool and its own localStorage leaderboard.
const DIFFICULTIES = {
  easy: {
    label: "Easy",
    storageKey: "typingLeaderboard_easy",
    texts: [
      "Fast hands win.",
      "Type each word well.",
      "Stay calm and focus.",
      "Quick keys, clean score.",
      "Green letters mean correct.",
      "Speed grows with practice."
    ]
  },
  normal: {
    label: "Normal",
    storageKey: "typingLeaderboard_normal",
    texts: [
      "The best typing runs happen when speed and accuracy stay balanced from start to finish.",
      "Strong focus helps you recover from mistakes and keep your score climbing every second.",
      "A steady rhythm often beats wild rushing when the goal is clean typing under pressure.",
      "Each match rewards players who keep moving forward with confidence and careful timing.",
      "Practice turns nervous key presses into smooth streaks that feel natural and controlled.",
      "The arena looks simple at first, but every sentence tests both patience and precision."
    ]
  },
  hard: {
    label: "Hard",
    storageKey: "typingLeaderboard_hard",
    texts: [
      "Level 3 challenge: type this cleanly, keep 98% accuracy, and do not panic when symbols like #, %, and 42 appear.",
      "Code-like sprint -> const score = base + bonus * 2; if (mistakes > 3) { focusAgain(); }",
      "Precision matters when the text includes commas, semicolons, numbers like 2026, and short bursts of logic.",
      "Hard mode rewards discipline: finish the full line correctly, manage every punctuation mark, and keep your streak alive.",
      "System check: player_id=7, rank=alpha, status=ready. Type every character exactly, or the combo breaks instantly.",
      "A fast typist still loses points when accuracy slips, so treat every bracket, dash, and digit as part of the mission."
    ]
  }
};

const COMBO_CONFIG = {
  normal: {
    multiplier: 1,
    label: "COMBO x1",
    flavor: "Build a 10-hit streak to ignite Combo x2."
  },
  x2: {
    multiplier: 2,
    label: "COMBO x2",
    flavor: "Purple surge active. Hold the streak to unlock Combo x3 at 25."
  },
  x3: {
    multiplier: 3,
    label: "COMBO x3",
    flavor: "Overdrive engaged. Neon heat is live, so cash in the maximum multiplier."
  }
};

const elements = {
  body: document.body,
  screens: {
    start: document.getElementById("start-screen"),
    game: document.getElementById("game-screen"),
    result: document.getElementById("result-screen"),
    leaderboard: document.getElementById("leaderboard-screen")
  },
  startForm: document.getElementById("start-form"),
  startGameButton: document.getElementById("start-game-btn"),
  playerNameInput: document.getElementById("player-name"),
  difficultyInputs: document.querySelectorAll('input[name="difficulty"]'),
  startError: document.getElementById("start-error"),
  startLeaderboardButton: document.getElementById("start-leaderboard-btn"),
  soundToggleButton: document.getElementById("sound-toggle-btn"),
  gameSoundToggleButton: document.getElementById("game-sound-toggle-btn"),
  previewDifficultyBadge: document.getElementById("preview-difficulty-badge"),
  startPreviewList: document.getElementById("start-preview-list"),
  startPreviewEmpty: document.getElementById("start-preview-empty"),
  gamePanel: document.getElementById("game-panel"),
  completionProgress: document.getElementById("completion-progress"),
  completionPercent: document.getElementById("completion-percent"),
  gamePlayerTag: document.getElementById("game-player-tag"),
  gameDifficultyTag: document.getElementById("game-difficulty-tag"),
  heroBestStreak: document.getElementById("hero-best-streak"),
  comboBanner: document.getElementById("combo-banner"),
  comboText: document.getElementById("combo-text"),
  comboFlavor: document.getElementById("combo-flavor"),
  comboMultiplierDisplay: document.getElementById("combo-multiplier-display"),
  comboStreakDisplay: document.getElementById("combo-streak-display"),
  comboTrackFill: document.getElementById("combo-track-fill"),
  comboTrackNote: document.getElementById("combo-track-note"),
  comboTrackNodes: document.querySelectorAll(".combo-track-node"),
  comboStat: document.getElementById("combo-stat"),
  textDisplay: document.getElementById("text-display"),
  typingStage: document.getElementById("typing-stage"),
  typingInput: document.getElementById("typing-input"),
  gamePauseOverlay: document.getElementById("game-pause-overlay"),
  timer: document.getElementById("timer"),
  wpm: document.getElementById("wpm"),
  accuracy: document.getElementById("accuracy"),
  mistakes: document.getElementById("mistakes"),
  streak: document.getElementById("streak"),
  bestStreak: document.getElementById("best-streak"),
  scorePreview: document.getElementById("score-preview"),
  pauseGameButton: document.getElementById("pause-game-btn"),
  giveUpButton: document.getElementById("give-up-btn"),
  topGiveUpButton: document.getElementById("top-give-up-btn"),
  resultPlayer: document.getElementById("result-player"),
  resultDifficulty: document.getElementById("result-difficulty"),
  resultScore: document.getElementById("result-score"),
  resultWpm: document.getElementById("result-wpm"),
  resultAccuracy: document.getElementById("result-accuracy"),
  resultMistakes: document.getElementById("result-mistakes"),
  resultBestStreak: document.getElementById("result-best-streak"),
  playAgainButton: document.getElementById("play-again-btn"),
  resultLeaderboardButton: document.getElementById("result-leaderboard-btn"),
  leaderboardNote: document.getElementById("leaderboard-note"),
  leaderboardSwitchButtons: document.querySelectorAll(".switch-btn"),
  leaderboardBody: document.getElementById("leaderboard-body"),
  leaderboardEmpty: document.getElementById("leaderboard-empty"),
  leaderboardBackButton: document.getElementById("leaderboard-back-btn"),
  clearLeaderboardButton: document.getElementById("clear-leaderboard-btn")
};

const state = {
  playerName: "",
  selectedDifficulty: "",
  activeLeaderboardDifficulty: DEFAULT_LEADERBOARD_DIFFICULTY,
  currentText: "",
  timeLeft: GAME_DURATION,
  timerId: null,
  gameStartedAt: 0,
  previousInputValue: "",
  typedAttempts: 0,
  correctAttempts: 0,
  matchedChars: 0,
  mistakes: 0,
  currentStreak: 0,
  bestStreak: 0,
  comboState: "normal",
  comboMultiplier: 1,
  isMuted: loadMutePreference(),
  isRunning: false,
  isPaused: false,
  gameEnded: false,
  lastScreen: "start"
};

const activeAnimations = new WeakMap();

const soundManager = {
  context: null,
  masterGain: null,
  isUnlocked: false,
  lastPlayed: {
    key: 0,
    error: 0,
    success: 0
  },

  ensureContext() {
    if (state.isMuted) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    if (!this.context) {
      this.context = new AudioContextClass();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.95;
      this.masterGain.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      this.context.resume().catch(() => {});
    }
  },

  setMuted(muted) {
    state.isMuted = muted;
    saveMutePreference(muted);
    updateSoundToggle();

    if (!muted) {
      this.ensureContext();
    }

    if (this.context && this.masterGain) {
      const target = muted ? 0 : 0.95;
      this.masterGain.gain.cancelScheduledValues(this.context.currentTime);
      this.masterGain.gain.setTargetAtTime(target, this.context.currentTime, 0.015);
    }
  },

  unlock() {
    if (state.isMuted) {
      return;
    }

    this.ensureContext();

    if (!this.context || this.isUnlocked) {
      return;
    }

    this.isUnlocked = true;

    // Tiny near-silent blip to make browser audio policies treat the context as active.
    this.playTone({
      frequency: 440,
      duration: 0.01,
      type: "sine",
      volume: 0.0002
    });
  },

  canPlay(type, minGap) {
    const now = performance.now();

    if (now - this.lastPlayed[type] < minGap) {
      return false;
    }

    this.lastPlayed[type] = now;
    return true;
  },

  playTone({ frequency, duration, type = "sine", volume = 0.03, startOffset = 0, glideTo = null }) {
    if (state.isMuted) {
      return;
    }

    this.ensureContext();

    if (!this.context || !this.masterGain) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    const startTime = this.context.currentTime + startOffset;
    const endTime = startTime + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    if (glideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(glideTo, endTime);
    }

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    oscillator.start(startTime);
    oscillator.stop(endTime + 0.03);
  },

  playKey() {
    if (!this.canPlay("key", 26)) {
      return;
    }

    this.playTone({
      frequency: 620,
      duration: 0.05,
      type: "square",
      volume: 0.055,
      glideTo: 760
    });

    this.playTone({
      frequency: 410,
      duration: 0.04,
      type: "triangle",
      volume: 0.035,
      startOffset: 0.01,
      glideTo: 520
    });
  },

  playError() {
    if (!this.canPlay("error", 70)) {
      return;
    }

    this.playTone({
      frequency: 260,
      duration: 0.08,
      type: "sawtooth",
      volume: 0.07,
      glideTo: 180
    });

    this.playTone({
      frequency: 180,
      duration: 0.05,
      type: "triangle",
      volume: 0.04,
      startOffset: 0.02,
      glideTo: 120
    });
  },

  playSuccess() {
    if (!this.canPlay("success", 260)) {
      return;
    }

    this.playTone({
      frequency: 520,
      duration: 0.12,
      type: "triangle",
      volume: 0.065,
      glideTo: 660
    });

    this.playTone({
      frequency: 660,
      duration: 0.13,
      type: "triangle",
      volume: 0.065,
      startOffset: 0.08,
      glideTo: 820
    });

    this.playTone({
      frequency: 840,
      duration: 0.18,
      type: "sine",
      volume: 0.075,
      startOffset: 0.16,
      glideTo: 980
    });
  }
};

function loadMutePreference() {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function saveMutePreference(isMuted) {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(isMuted));
  } catch (error) {
    // Ignore storage errors and keep the in-memory preference.
  }
}

function updateSoundToggle() {
  const toggleButtons = [elements.soundToggleButton, elements.gameSoundToggleButton].filter(Boolean);

  toggleButtons.forEach((button) => {
    button.textContent = state.isMuted ? "Sound: Off" : "Sound: On";
    button.classList.toggle("is-muted", state.isMuted);
    button.setAttribute("aria-pressed", String(!state.isMuted));
  });
}

function updatePauseUI() {
  if (!elements.pauseGameButton) {
    return;
  }

  const paused = state.isPaused;
  elements.pauseGameButton.textContent = paused ? "Resume" : "Pause";
  elements.pauseGameButton.setAttribute("aria-pressed", String(paused));
  elements.gamePanel.classList.toggle("is-paused", paused);

  if (elements.gamePauseOverlay) {
    elements.gamePauseOverlay.hidden = !paused;
  }
}

function registerAudioUnlockHandlers() {
  const unlockAudio = () => {
    soundManager.unlock();
  };

  document.addEventListener("pointerdown", unlockAudio, { passive: true });
  document.addEventListener("keydown", unlockAudio);
  document.addEventListener("touchstart", unlockAudio, { passive: true });
}

function getDifficultyConfig(difficulty) {
  return DIFFICULTIES[difficulty] || DIFFICULTIES[DEFAULT_LEADERBOARD_DIFFICULTY];
}

function getSelectedDifficultyFromForm() {
  const checkedInput = Array.from(elements.difficultyInputs).find((input) => input.checked);
  return checkedInput ? checkedInput.value : "";
}

function updateStartButtonState() {
  elements.startGameButton.disabled = elements.playerNameInput.value.trim().length === 0;
}

function clearDifficultySelection() {
  elements.difficultyInputs.forEach((input) => {
    input.checked = false;
  });
}

function showScreen(screenName) {
  Object.entries(elements.screens).forEach(([name, screen]) => {
    screen.classList.toggle("is-active", name === screenName);
  });

  elements.body.dataset.activeScreen = screenName;

  if (screenName !== "leaderboard") {
    state.lastScreen = screenName;
  }
}

function updateGameMeta() {
  elements.gamePlayerTag.textContent = state.playerName ? `Player: ${state.playerName}` : "";
  elements.gameDifficultyTag.textContent = state.selectedDifficulty
    ? `Difficulty: ${getDifficultyConfig(state.selectedDifficulty).label}`
    : "";
}

function updateTimerDisplay() {
  const clampedTime = Math.max(0, state.timeLeft);
  const percentage = Math.max(0, Math.min(100, (clampedTime / GAME_DURATION) * 100));

  elements.timer.textContent = `${clampedTime}s`;
  elements.gamePanel.style.setProperty("--timer-progress", `${percentage}%`);
}

function updateCompletionProgress(typedValue = "") {
  let completionCharacters = 0;

  for (let index = 0; index < typedValue.length; index += 1) {
    if (typedValue[index] !== state.currentText[index]) {
      break;
    }

    completionCharacters += 1;
  }

  const percentage = state.currentText.length
    ? Math.round((completionCharacters / state.currentText.length) * 100)
    : 0;

  elements.completionProgress.style.width = `${percentage}%`;
  elements.completionPercent.textContent = `${percentage}%`;
}

function animateNumber(element, value, duration = 180) {
  const targetValue = Math.round(value);
  const startingValue = Number.parseInt(element.dataset.numericValue || element.textContent, 10) || 0;

  if (startingValue === targetValue) {
    element.textContent = String(targetValue);
    element.dataset.numericValue = String(targetValue);
    return;
  }

  const existingFrame = activeAnimations.get(element);

  if (existingFrame) {
    cancelAnimationFrame(existingFrame);
  }

  const startedAt = performance.now();

  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const easedProgress = 1 - ((1 - progress) * (1 - progress));
    const nextValue = Math.round(startingValue + ((targetValue - startingValue) * easedProgress));

    element.textContent = String(nextValue);
    element.dataset.numericValue = String(nextValue);

    if (progress < 1) {
      activeAnimations.set(element, requestAnimationFrame(tick));
      return;
    }

    activeAnimations.delete(element);
  };

  activeAnimations.set(element, requestAnimationFrame(tick));
}

function pulseNumericValue(element) {
  element.classList.remove("score-pop");
  void element.offsetWidth;
  element.classList.add("score-pop");
}

function updateComboMeter() {
  if (!elements.comboTrackFill || !elements.comboTrackNote) {
    return;
  }

  const streak = Math.max(0, state.currentStreak);
  const fillPercentage = Math.min(100, (streak / 25) * 100);
  let note = "10 clean hits to Combo x2.";

  if (streak >= 25) {
    note = "Max combo active. Keep the fire burning.";
  } else if (streak >= 10) {
    note = `${25 - streak} clean hits to Combo x3.`;
  } else if (streak > 0) {
    note = `${10 - streak} clean hits to Combo x2.`;
  }

  elements.comboTrackFill.style.width = `${fillPercentage}%`;
  elements.comboTrackNote.textContent = note;

  elements.comboTrackNodes.forEach((node) => {
    const threshold = Number.parseInt(node.dataset.threshold || "0", 10);
    node.classList.toggle("is-active", streak >= threshold);
  });
}

function triggerComboPulse() {
  elements.comboBanner.classList.remove("combo-pop");
  void elements.comboBanner.offsetWidth;
  elements.comboBanner.classList.add("combo-pop");
}

function triggerSuccessFlash() {
  elements.typingStage.classList.remove("success-flash");
  void elements.typingStage.offsetWidth;
  elements.typingStage.classList.add("success-flash");
}

function getComboStateForStreak(streak) {
  if (streak >= 25) {
    return "x3";
  }

  if (streak >= 10) {
    return "x2";
  }

  return "normal";
}

function updateComboState() {
  const previousMultiplier = state.comboMultiplier;
  const comboState = getComboStateForStreak(state.currentStreak);
  const comboConfig = COMBO_CONFIG[comboState];

  state.comboState = comboState;
  state.comboMultiplier = comboConfig.multiplier;

  elements.comboBanner.dataset.comboState = comboState;
  elements.gamePanel.dataset.comboState = comboState;
  elements.body.dataset.arenaState = comboState;
  elements.comboText.textContent = comboConfig.label;
  elements.comboFlavor.textContent = comboConfig.flavor;
  elements.comboMultiplierDisplay.textContent = `x${comboConfig.multiplier}`;
  elements.comboStreakDisplay.textContent = state.currentStreak;
  if (elements.comboStat) {
    elements.comboStat.textContent = `x${comboConfig.multiplier}`;
  }
  updateComboMeter();

  if (comboConfig.multiplier > previousMultiplier) {
    triggerComboPulse();
  }
}

function getRandomText() {
  const texts = getDifficultyConfig(state.selectedDifficulty).texts;

  if (texts.length === 1) {
    return texts[0];
  }

  let nextText = texts[Math.floor(Math.random() * texts.length)];

  while (nextText === state.currentText) {
    nextText = texts[Math.floor(Math.random() * texts.length)];
  }

  return nextText;
}

function renderCurrentText() {
  elements.textDisplay.innerHTML = "";

  state.currentText.split("").forEach((character, index) => {
    const span = document.createElement("span");
    span.textContent = character;

    if (index === 0) {
      span.classList.add("current");
    }

    elements.textDisplay.appendChild(span);
  });
}

function loadNewText() {
  state.currentText = getRandomText();
  state.previousInputValue = "";
  state.matchedChars = 0;
  elements.typingInput.value = "";
  elements.typingStage.classList.remove("is-typing");
  renderCurrentText();
  updateCompletionProgress("");
}

function getElapsedSeconds() {
  if (!state.gameStartedAt) {
    return 0;
  }

  const elapsed = (Date.now() - state.gameStartedAt) / 1000;
  return Math.max(1, elapsed);
}

function calculateWpm() {
  if (state.matchedChars === 0) {
    return 0;
  }

  const elapsedSeconds = getElapsedSeconds();
  return Math.round((state.matchedChars / 5) / (elapsedSeconds / 60));
}

function calculateAccuracy() {
  if (state.typedAttempts === 0) {
    return 100;
  }

  return Math.round((state.correctAttempts / state.typedAttempts) * 100);
}

function calculateBaseScore() {
  if (state.typedAttempts === 0) {
    return 0;
  }

  const wpm = calculateWpm();
  const accuracy = calculateAccuracy();
  let score = Math.round((wpm * (accuracy / 100)) + (state.bestStreak * 2) - (state.mistakes * 3));

  if (accuracy > 95) {
    score += 10;
  }

  if (state.mistakes === 0) {
    score += 20;
  }

  return Math.max(0, score);
}

function calculateScore() {
  return Math.max(0, calculateBaseScore() * state.comboMultiplier);
}

function updateStats() {
  const nextScore = calculateScore();
  const previousScore = Number.parseInt(elements.scorePreview.dataset.numericValue || elements.scorePreview.textContent, 10) || 0;

  elements.wpm.textContent = calculateWpm();
  elements.accuracy.textContent = `${calculateAccuracy()}%`;
  elements.mistakes.textContent = state.mistakes;
  elements.streak.textContent = state.currentStreak;
  elements.bestStreak.textContent = state.bestStreak;
  if (elements.heroBestStreak) {
    elements.heroBestStreak.textContent = state.bestStreak;
  }
  animateNumber(elements.scorePreview, nextScore, 160);

  if (nextScore !== previousScore) {
    pulseNumericValue(elements.scorePreview);
  }
}

function getTypingValue() {
  const rawValue = elements.typingInput.value;
  const typedValue = rawValue.slice(0, state.currentText.length);

  if (typedValue !== rawValue) {
    elements.typingInput.value = typedValue;
  }

  return typedValue;
}

function countMatchedCharacters(typedValue) {
  let matchedCharacters = 0;

  for (let index = 0; index < typedValue.length; index += 1) {
    if (typedValue[index] === state.currentText[index]) {
      matchedCharacters += 1;
    }
  }

  return matchedCharacters;
}

function updateTextFeedback(typedValue) {
  const characters = elements.textDisplay.querySelectorAll("span");

  characters.forEach((characterSpan, index) => {
    characterSpan.classList.remove("correct", "incorrect", "current");

    const typedChar = typedValue[index];

    if (typedChar == null) {
      return;
    }

    if (typedChar === state.currentText[index]) {
      characterSpan.classList.add("correct");
    } else {
      characterSpan.classList.add("incorrect");
    }
  });

  if (typedValue.length < characters.length) {
    characters[typedValue.length].classList.add("current");
  }
}

function triggerMistakeEffect() {
  elements.typingStage.classList.remove("mistake-shake");
  void elements.typingStage.offsetWidth;
  elements.typingStage.classList.add("mistake-shake");
}

function registerCharacterAttempt(character, index) {
  state.typedAttempts += 1;

  if (character === state.currentText[index]) {
    state.correctAttempts += 1;
    state.currentStreak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
    updateComboState();
    soundManager.playKey();
    return;
  }

  state.mistakes += 1;
  state.currentStreak = 0;
  updateComboState();
  soundManager.playError();
  triggerMistakeEffect();
}

function findFirstDifference(previousValue, nextValue) {
  const limit = Math.min(previousValue.length, nextValue.length);

  for (let index = 0; index < limit; index += 1) {
    if (previousValue[index] !== nextValue[index]) {
      return index;
    }
  }

  return limit;
}

function processNewCharacters(previousValue, typedValue) {
  const startIndex = findFirstDifference(previousValue, typedValue);

  for (let index = startIndex; index < typedValue.length; index += 1) {
    if (typedValue[index] === previousValue[index]) {
      continue;
    }

    registerCharacterAttempt(typedValue[index], index);
  }
}

function handleTyping(event) {
  if (!state.isRunning || state.gameEnded || state.isPaused) {
    return;
  }

  const isDeletion = typeof event?.inputType === "string" && event.inputType.startsWith("delete");
  const typedValue = getTypingValue();

  if (!isDeletion && (typedValue.length > state.previousInputValue.length || typedValue !== state.previousInputValue)) {
    processNewCharacters(state.previousInputValue, typedValue);
  }

  state.previousInputValue = typedValue;
  state.matchedChars = countMatchedCharacters(typedValue);
  elements.typingStage.classList.toggle("is-typing", typedValue.length > 0);
  updateTextFeedback(typedValue);
  updateCompletionProgress(typedValue);
  updateStats();
  checkIfCompleted(typedValue);
}

function isAttemptComplete(typedValue = getTypingValue()) {
  if (!state.currentText || typedValue.length !== state.currentText.length) {
    return false;
  }

  return countMatchedCharacters(typedValue) === state.currentText.length;
}

function checkIfCompleted(typedValue = getTypingValue()) {
  if (!state.isRunning || state.gameEnded || state.isPaused) {
    return false;
  }

  const normalizedValue = typedValue.slice(0, state.currentText.length);

  if (isAttemptComplete(normalizedValue)) {
    endGame();
    return true;
  }

  return false;
}

function canSubmitAttempt() {
  if (!state.isRunning || state.gameEnded || state.isPaused) {
    return false;
  }

  return getTypingValue().length > 0 || state.typedAttempts > 0;
}

function resetGameState() {
  clearInterval(state.timerId);

  state.currentText = "";
  state.timeLeft = GAME_DURATION;
  state.timerId = null;
  state.gameStartedAt = 0;
  state.previousInputValue = "";
  state.typedAttempts = 0;
  state.correctAttempts = 0;
  state.matchedChars = 0;
  state.mistakes = 0;
  state.currentStreak = 0;
  state.bestStreak = 0;
  state.comboState = "normal";
  state.comboMultiplier = 1;
  state.isRunning = false;
  state.isPaused = false;
  state.gameEnded = false;

  elements.typingStage.classList.remove("is-typing");
  elements.textDisplay.innerHTML = "";
  elements.typingInput.value = "";
  elements.typingInput.disabled = false;
  elements.startError.textContent = "";
  updateTimerDisplay();
  updatePauseUI();
  updateComboState();
  updateCompletionProgress("");
  updateStats();
}

function startTimer() {
  if (state.timerId || state.gameEnded || state.isPaused) {
    return;
  }

  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    updateTimerDisplay();

    if (state.timeLeft <= 0) {
      endGame({ timedOut: true });
    }
  }, 1000);
}

function pauseGame() {
  if (!state.isRunning || state.gameEnded || state.isPaused) {
    return;
  }

  state.isPaused = true;
  clearInterval(state.timerId);
  state.timerId = null;
  elements.typingInput.disabled = true;
  updatePauseUI();
}

function resumeGame() {
  if (!state.isRunning || state.gameEnded || !state.isPaused) {
    return;
  }

  state.isPaused = false;
  elements.typingInput.disabled = false;
  updatePauseUI();
  startTimer();
  elements.typingInput.focus();
}

function togglePauseGame() {
  if (!state.isRunning || state.gameEnded) {
    return;
  }

  if (state.isPaused) {
    resumeGame();
    return;
  }

  pauseGame();
}

function giveUpGame() {
  if (!state.isRunning || state.gameEnded) {
    return;
  }

  endGame({ gaveUp: true });
}

function getLeaderboard(difficulty = state.activeLeaderboardDifficulty) {
  const { storageKey } = getDifficultyConfig(difficulty);

  try {
    const storedValue = localStorage.getItem(storageKey);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    return [];
  }
}

function renderStartLeaderboardPreview(difficulty = getSelectedDifficultyFromForm() || DEFAULT_LEADERBOARD_DIFFICULTY) {
  const config = getDifficultyConfig(difficulty);
  const leaderboard = getLeaderboard(difficulty)
    .sort((first, second) => second.score - first.score)
    .slice(0, 3);

  elements.previewDifficultyBadge.textContent = config.label;
  elements.startPreviewList.innerHTML = "";

  if (leaderboard.length === 0) {
    elements.startPreviewEmpty.classList.add("is-visible");
    return;
  }

  elements.startPreviewEmpty.classList.remove("is-visible");

  leaderboard.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "preview-entry";

    const rank = document.createElement("span");
    rank.className = "preview-rank";
    rank.textContent = index + 1;

    const player = document.createElement("div");
    player.className = "preview-player";

    const playerName = document.createElement("strong");
    playerName.textContent = entry.playerName;

    const playerMeta = document.createElement("span");
    playerMeta.textContent = `${entry.wpm} WPM | ${entry.accuracy}% accuracy`;

    player.append(playerName, playerMeta);

    const score = document.createElement("div");
    score.className = "preview-score";

    const scoreValue = document.createElement("strong");
    scoreValue.textContent = `${entry.score}`;

    const streakValue = document.createElement("span");
    streakValue.textContent = `Best streak ${entry.bestStreak}`;

    score.append(scoreValue, streakValue);
    item.append(rank, player, score);
    elements.startPreviewList.appendChild(item);
  });
}

function saveResult(result) {
  const { storageKey } = getDifficultyConfig(state.selectedDifficulty);
  const leaderboard = getLeaderboard(state.selectedDifficulty);
  leaderboard.push(result);
  leaderboard.sort((first, second) => second.score - first.score);

  try {
    localStorage.setItem(storageKey, JSON.stringify(leaderboard));
  } catch (error) {
    console.warn("Unable to save leaderboard data.", error);
  }
}

function updateLeaderboardSwitches() {
  elements.leaderboardSwitchButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.boardDifficulty === state.activeLeaderboardDifficulty);
  });
}

function renderLeaderboard(difficulty = state.activeLeaderboardDifficulty) {
  state.activeLeaderboardDifficulty = difficulty;

  const config = getDifficultyConfig(difficulty);
  const leaderboard = getLeaderboard(difficulty)
    .sort((first, second) => second.score - first.score)
    .slice(0, 10);

  elements.leaderboardNote.textContent = `${config.label} leaderboard stored locally on this device`;
  elements.leaderboardBody.innerHTML = "";
  updateLeaderboardSwitches();

  if (leaderboard.length === 0) {
    elements.leaderboardEmpty.textContent = `No ${config.label} results yet. Finish a match to claim a spot.`;
    elements.leaderboardEmpty.classList.add("is-visible");
    return;
  }

  elements.leaderboardEmpty.classList.remove("is-visible");

  leaderboard.forEach((entry, index) => {
    const row = document.createElement("tr");
    const values = [
      index + 1,
      entry.playerName,
      entry.score,
      entry.wpm,
      `${entry.accuracy}%`,
      entry.mistakes,
      entry.bestStreak,
      entry.date
    ];

    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    elements.leaderboardBody.appendChild(row);
  });
}

function showLeaderboard(difficulty = getSelectedDifficultyFromForm() || state.selectedDifficulty || state.activeLeaderboardDifficulty) {
  renderLeaderboard(difficulty || DEFAULT_LEADERBOARD_DIFFICULTY);
  showScreen("leaderboard");
}

function populateResults() {
  const difficultyLabel = getDifficultyConfig(state.selectedDifficulty).label;
  const finalWpm = calculateWpm();
  const finalAccuracy = calculateAccuracy();
  const finalScore = calculateScore();

  elements.resultPlayer.textContent = `Player: ${state.playerName}`;
  elements.resultDifficulty.textContent = `Difficulty: ${difficultyLabel}`;
  animateNumber(elements.resultScore, finalScore, 420);
  pulseNumericValue(elements.resultScore);
  elements.resultWpm.textContent = finalWpm;
  elements.resultAccuracy.textContent = `${finalAccuracy}%`;
  elements.resultMistakes.textContent = state.mistakes;
  elements.resultBestStreak.textContent = state.bestStreak;

  saveResult({
    playerName: state.playerName,
    difficulty: difficultyLabel,
    score: finalScore,
    wpm: finalWpm,
    accuracy: finalAccuracy,
    mistakes: state.mistakes,
    bestStreak: state.bestStreak,
    date: new Date().toLocaleString()
  });

  renderStartLeaderboardPreview(state.selectedDifficulty);
}

function endGame({ timedOut = false, gaveUp = false } = {}) {
  if (state.gameEnded) {
    return;
  }

  state.gameEnded = true;
  state.isRunning = false;
  state.isPaused = false;
  clearInterval(state.timerId);
  state.timerId = null;

  if (timedOut) {
    state.timeLeft = 0;
  }

  const typedValue = getTypingValue();
  const wasSuccessful = !timedOut && !gaveUp && typedValue === state.currentText;

  elements.typingInput.disabled = true;
  elements.typingStage.classList.remove("is-typing");
  state.previousInputValue = typedValue;
  state.matchedChars = countMatchedCharacters(typedValue);
  updateTimerDisplay();
  updatePauseUI();
  updateTextFeedback(typedValue);
  updateCompletionProgress(typedValue);
  updateStats();

  if (wasSuccessful) {
    triggerSuccessFlash();
    soundManager.playSuccess();
  }

  populateResults();
  showScreen("result");
}

function startGame(playerName, difficulty) {
  resetGameState();
  state.playerName = playerName;
  state.selectedDifficulty = difficulty;
  state.activeLeaderboardDifficulty = difficulty;
  state.isRunning = true;
  state.isPaused = false;
  state.gameEnded = false;
  state.gameStartedAt = Date.now();

  soundManager.ensureContext();
  updatePauseUI();
  updateGameMeta();
  showScreen("game");
  loadNewText();
  updateTimerDisplay();
  updateStats();
  startTimer();
  elements.typingInput.focus();
}

function returnToStart() {
  resetGameState();
  state.playerName = "";
  state.selectedDifficulty = "";
  elements.playerNameInput.value = "";
  clearDifficultySelection();
  updateStartButtonState();
  renderStartLeaderboardPreview(DEFAULT_LEADERBOARD_DIFFICULTY);
  updateGameMeta();
  showScreen("start");
}

function getStartValidationMessage(playerName, difficulty) {
  if (!playerName && !difficulty) {
    return "Please enter your name and choose a difficulty before starting.";
  }

  if (!playerName) {
    return "Please enter your name before starting the game.";
  }

  if (!difficulty) {
    return "Please choose a difficulty level before starting the game.";
  }

  return "";
}

function handleStart(event) {
  event.preventDefault();

  const playerName = elements.playerNameInput.value.trim();
  const difficulty = getSelectedDifficultyFromForm();
  const validationMessage = getStartValidationMessage(playerName, difficulty);

  if (validationMessage) {
    elements.startError.textContent = validationMessage;

    if (!playerName) {
      elements.playerNameInput.focus();
    }

    return;
  }

  startGame(playerName, difficulty);
}

function clearLeaderboard() {
  const difficulty = state.activeLeaderboardDifficulty || DEFAULT_LEADERBOARD_DIFFICULTY;
  const config = getDifficultyConfig(difficulty);
  const leaderboard = getLeaderboard(difficulty);

  if (leaderboard.length === 0) {
    return;
  }

  const shouldClear = window.confirm(`Clear all saved ${config.label} leaderboard results?`);

  if (!shouldClear) {
    return;
  }

  localStorage.removeItem(config.storageKey);
  renderLeaderboard(difficulty);
}

function bindEvents() {
  elements.startForm.addEventListener("submit", handleStart);
  elements.startLeaderboardButton.addEventListener("click", () => showLeaderboard());
  elements.resultLeaderboardButton.addEventListener("click", () => showLeaderboard(state.selectedDifficulty));
  elements.playAgainButton.addEventListener("click", returnToStart);
  elements.leaderboardBackButton.addEventListener("click", () => showScreen(state.lastScreen || "start"));
  elements.clearLeaderboardButton.addEventListener("click", clearLeaderboard);

  const toggleSound = () => {
    soundManager.setMuted(!state.isMuted);
    soundManager.unlock();
  };

  elements.soundToggleButton.addEventListener("click", toggleSound);
  if (elements.gameSoundToggleButton) {
    elements.gameSoundToggleButton.addEventListener("click", toggleSound);
  }

  elements.typingInput.addEventListener("focus", () => {
    soundManager.unlock();
  });

  elements.typingInput.addEventListener("input", handleTyping);
  elements.typingInput.addEventListener("keyup", () => {
    checkIfCompleted(getTypingValue());
  });
  elements.typingInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (checkIfCompleted(getTypingValue())) {
        return;
      }

      if (canSubmitAttempt()) {
        endGame();
      }
    }
  });

  if (elements.pauseGameButton) {
    elements.pauseGameButton.addEventListener("click", togglePauseGame);
  }

  if (elements.giveUpButton) {
    elements.giveUpButton.addEventListener("click", giveUpGame);
  }

  if (elements.topGiveUpButton) {
    elements.topGiveUpButton.addEventListener("click", giveUpGame);
  }

  elements.playerNameInput.addEventListener("input", () => {
    if (elements.playerNameInput.value.trim()) {
      elements.startError.textContent = "";
    }

    updateStartButtonState();
  });

  elements.difficultyInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (getSelectedDifficultyFromForm()) {
        elements.startError.textContent = "";
      }

      renderStartLeaderboardPreview(input.value);
    });
  });

  elements.leaderboardSwitchButtons.forEach((button) => {
    button.addEventListener("click", () => {
      renderLeaderboard(button.dataset.boardDifficulty);
    });
  });
}

function init() {
  elements.body.dataset.activeScreen = "start";
  registerAudioUnlockHandlers();
  bindEvents();
  updateSoundToggle();
  updatePauseUI();
  updateStartButtonState();
  renderStartLeaderboardPreview(DEFAULT_LEADERBOARD_DIFFICULTY);
  updateGameMeta();
  updateTimerDisplay();
  updateComboState();
  updateStats();
  renderLeaderboard(DEFAULT_LEADERBOARD_DIFFICULTY);
}

init();
