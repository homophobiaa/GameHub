const STORAGE_KEY = "color-match-arena-leaderboards";
const PLAYER_PROGRESS_KEY = "color-match-arena-player-progress";
const ROUND_DURATION = 60000;
const MAX_LEADERBOARD_ENTRIES = 10;
const MAX_ROUND_SCORE = 1000;
const TIMER_TICK_MS = 150;
const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

const DIFFICULTIES = {
  easy: {
    label: "Easy",
    multiplier: 1,
    timeBonusFactor: 70,
    roundPalette: { hue: [0, 360], sat: [65, 100], light: [40, 68] },
  },
  medium: {
    label: "Medium",
    multiplier: 1.08,
    timeBonusFactor: 85,
    roundPalette: { hue: [0, 360], sat: [35, 92], light: [28, 72] },
  },
  hard: {
    label: "Hard",
    multiplier: 1.16,
    timeBonusFactor: 100,
    roundPalette: { hue: [0, 360], sat: [12, 88], light: [18, 82] },
  },
};

const dom = {
  views: {
    setup: document.getElementById("setupView"),
    game: document.getElementById("gameView"),
    result: document.getElementById("resultView"),
  },
  playerName: document.getElementById("playerName"),
  setupMessage: document.getElementById("setupMessage"),
  difficultyPicker: document.getElementById("difficultyPicker"),
  leaderboardTabs: document.getElementById("leaderboardTabs"),
  leaderboardTitle: document.getElementById("leaderboardTitle"),
  leaderboardList: document.getElementById("leaderboardList"),
  homeButton: document.getElementById("homeButton"),
  resultLeaderboardTitle: document.getElementById("resultLeaderboardTitle"),
  resultLeaderboardList: document.getElementById("resultLeaderboardList"),
  startButton: document.getElementById("startButton"),
  displayPlayerName: document.getElementById("displayPlayerName"),
  displayDifficulty: document.getElementById("displayDifficulty"),
  scoreValue: document.getElementById("scoreValue"),
  comboValue: document.getElementById("comboValue"),
  roundValue: document.getElementById("roundValue"),
  timerValue: document.getElementById("timerValue"),
  timerFill: document.getElementById("timerFill"),
  targetSwatch: document.getElementById("targetSwatch"),
  playerSwatch: document.getElementById("playerSwatch"),
  targetLabel: document.getElementById("targetLabel"),
  playerLabel: document.getElementById("playerLabel"),
  hSlider: document.getElementById("hSlider"),
  sSlider: document.getElementById("sSlider"),
  lSlider: document.getElementById("lSlider"),
  hValue: document.getElementById("hValue"),
  sValue: document.getElementById("sValue"),
  lValue: document.getElementById("lValue"),
  pauseButton: document.getElementById("pauseButton"),
  restartButton: document.getElementById("restartButton"),
  submitButton: document.getElementById("submitButton"),
  feedbackBadge: document.getElementById("feedbackBadge"),
  accuracyValue: document.getElementById("accuracyValue"),
  distanceValue: document.getElementById("distanceValue"),
  speedValue: document.getElementById("speedValue"),
  roundScoreValue: document.getElementById("roundScoreValue"),
  perfectBonusValue: document.getElementById("perfectBonusValue"),
  multiplierValue: document.getElementById("multiplierValue"),
  pausedOverlay: document.getElementById("pausedOverlay"),
  resumeButton: document.getElementById("resumeButton"),
  resultHeadline: document.getElementById("resultHeadline"),
  resultTargetSwatch: document.getElementById("resultTargetSwatch"),
  resultPlayerSwatch: document.getElementById("resultPlayerSwatch"),
  resultTargetText: document.getElementById("resultTargetText"),
  resultPlayerText: document.getElementById("resultPlayerText"),
  resultAccuracy: document.getElementById("resultAccuracy"),
  resultScore: document.getElementById("resultScore"),
  resultTotal: document.getElementById("resultTotal"),
  resultRank: document.getElementById("resultRank"),
  resultDetail: document.getElementById("resultDetail"),
  finalScorePanel: document.getElementById("finalScorePanel"),
  finalScoreValue: document.getElementById("finalScoreValue"),
  finalScoreCopy: document.getElementById("finalScoreCopy"),
  nextRoundButton: document.getElementById("nextRoundButton"),
  backToLobbyButton: document.getElementById("backToLobbyButton"),
  confettiLayer: document.getElementById("confettiLayer"),
  particles: document.getElementById("particles"),
  leaderboardItemTemplate: document.getElementById("leaderboardItemTemplate"),
};

const state = {
  playerName: "",
  difficulty: "easy",
  lobbyBoard: "easy",
  totalScore: 0,
  combo: 0,
  round: 1,
  roundActive: false,
  paused: false,
  roundStartTime: 0,
  pausedAt: 0,
  timerHandle: null,
  timeLeftSnapshot: ROUND_DURATION,
  latestEntryId: null,
  currentTarget: { h: 0, s: 100, l: 50 },
  currentPlayer: { h: 0, s: 100, l: 50 },
  roundResult: null,
  leaderboards: loadLeaderboards(),
  playerProgress: loadPlayerProgress(),
};

function init() {
  createParticles();
  bindEvents();
  syncDifficultyCards();
  updatePlayerPreview();
  renderLeaderboard(state.lobbyBoard, dom.leaderboardList, dom.leaderboardTitle);
}

function bindEvents() {
  dom.difficultyPicker.addEventListener("click", handleDifficultyPick);
  dom.leaderboardTabs.addEventListener("click", handleLeaderboardTab);
  dom.startButton.addEventListener("click", startGame);
  dom.hSlider.addEventListener("input", handleSliderInput);
  dom.sSlider.addEventListener("input", handleSliderInput);
  dom.lSlider.addEventListener("input", handleSliderInput);
  dom.submitButton.addEventListener("click", () => submitRound(false));
  dom.pauseButton.addEventListener("click", togglePause);
  dom.resumeButton.addEventListener("click", togglePause);
  dom.restartButton.addEventListener("click", restartCurrentSession);
  dom.nextRoundButton.addEventListener("click", goToNextRound);
  dom.backToLobbyButton.addEventListener("click", backToLobby);
  dom.homeButton.addEventListener("click", backToLobby);
  dom.playerName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      startGame();
    }
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (key === "p" && dom.views.game.classList.contains("active")) {
      event.preventDefault();
      togglePause();
    }

    if (key === "r" && dom.views.game.classList.contains("active")) {
      event.preventDefault();
      restartCurrentSession();
    }

    if (event.key === "Enter" && dom.views.game.classList.contains("active") && state.roundActive) {
      event.preventDefault();
      submitRound(false);
    }
  });
}

function handleDifficultyPick(event) {
  const card = event.target.closest("[data-difficulty]");
  if (!card) return;

  state.difficulty = card.dataset.difficulty;
  state.lobbyBoard = state.difficulty;
  syncDifficultyCards();
  syncLeaderboardTabs();
  renderLeaderboard(state.lobbyBoard, dom.leaderboardList, dom.leaderboardTitle);
}

function handleLeaderboardTab(event) {
  const button = event.target.closest("[data-board]");
  if (!button) return;

  state.lobbyBoard = button.dataset.board;
  syncLeaderboardTabs();
  renderLeaderboard(state.lobbyBoard, dom.leaderboardList, dom.leaderboardTitle);
}

function startGame() {
  const playerName = dom.playerName.value.trim();
  if (!playerName) {
    dom.setupMessage.textContent = "Enter a player name before entering the arena.";
    dom.playerName.focus();
    return;
  }

  const normalizedName = normalizePlayerName(playerName);
  const nextDifficulty = getFirstUnplayedDifficulty(normalizedName);

  if (!nextDifficulty) {
    dom.setupMessage.textContent = "This player has already finished Easy, Medium, and Hard.";
    dom.playerName.focus();
    return;
  }

  state.playerName = playerName;
  state.difficulty = nextDifficulty;
  state.totalScore = 0;
  state.combo = 0;
  state.round = DIFFICULTY_ORDER.indexOf(nextDifficulty) + 1;
  state.latestEntryId = null;
  state.lobbyBoard = state.difficulty;
  syncDifficultyCards();
  syncLeaderboardTabs();
  dom.setupMessage.textContent = "Choose a difficulty and enter your name to begin.";

  dom.displayPlayerName.textContent = playerName;
  dom.displayDifficulty.textContent = DIFFICULTIES[state.difficulty].label;
  setActiveView("game");
  beginRound();
}

function beginRound() {
  clearTimer();
  setActiveView("game");
  state.roundActive = true;
  state.paused = false;
  dom.pausedOverlay.classList.add("hidden");
  dom.pauseButton.textContent = "Pause";
  dom.displayDifficulty.textContent = DIFFICULTIES[state.difficulty].label;
  dom.roundValue.textContent = String(state.round);
  dom.scoreValue.textContent = String(state.totalScore);
  dom.comboValue.textContent = `${state.combo}x`;
  dom.feedbackBadge.textContent = "Dial it in";
  dom.timerValue.textContent = "60.0s";
  dom.timerFill.style.width = "100%";
  dom.speedValue.textContent = "0";
  dom.roundScoreValue.textContent = "0";
  dom.perfectBonusValue.textContent = "0";

  state.currentTarget = generateTargetColor(state.difficulty);
  state.currentPlayer = createInitialPlayerColor(state.currentTarget);
  state.roundStartTime = performance.now();
  state.timeLeftSnapshot = ROUND_DURATION;

  setSliderValues(state.currentPlayer);
  updateTargetPreview();
  updatePlayerPreview();
  startTimerLoop();
}

function generateTargetColor(difficulty) {
  const palette = DIFFICULTIES[difficulty].roundPalette;
  return {
    h: randomInt(palette.hue[0], palette.hue[1]),
    s: randomInt(palette.sat[0], palette.sat[1]),
    l: randomInt(palette.light[0], palette.light[1]),
  };
}

function createInitialPlayerColor(target) {
  return {
    h: (target.h + randomInt(60, 180)) % 360,
    s: clamp(target.s + randomInt(-25, 25), 0, 100),
    l: clamp(target.l + randomInt(-18, 18), 0, 100),
  };
}

function handleSliderInput() {
  state.currentPlayer = {
    h: Number(dom.hSlider.value),
    s: Number(dom.sSlider.value),
    l: Number(dom.lSlider.value),
  };
  updatePlayerPreview();
}

function updateTargetPreview() {
  const label = formatHsl(state.currentTarget);
  const color = hslCss(state.currentTarget);

  dom.targetSwatch.style.background = color;
  dom.targetSwatch.style.boxShadow = "none";
  dom.targetLabel.textContent = label;
}

function updatePlayerPreview() {
  const label = formatHsl(state.currentPlayer);
  const color = hslCss(state.currentPlayer);

  dom.playerSwatch.style.background = color;
  dom.playerSwatch.style.boxShadow = "none";
  dom.playerLabel.textContent = label;
  dom.hValue.textContent = String(state.currentPlayer.h);
  dom.sValue.textContent = `${state.currentPlayer.s}%`;
  dom.lValue.textContent = `${state.currentPlayer.l}%`;
  paintSliderTracks();
}

function updateLiveMetrics() {
  const metrics = evaluateMatch(state.currentTarget, state.currentPlayer, getTimeLeft());
  dom.accuracyValue.textContent = `${metrics.accuracy.toFixed(1)}%`;
  dom.distanceValue.textContent = metrics.deltaE.toFixed(2);
  dom.speedValue.textContent = String(metrics.speedBonus);
  dom.roundScoreValue.textContent = String(metrics.roundScore);
  dom.perfectBonusValue.textContent = String(metrics.perfectBonus);
  dom.multiplierValue.textContent = `x${metrics.multiplier.toFixed(2)}`;
  dom.feedbackBadge.textContent = metrics.feedback;
}

function startTimerLoop() {
  clearTimer();
  state.timerHandle = window.setInterval(() => {
    if (!state.roundActive || state.paused) return;

    const timeLeft = getTimeLeft();
    state.timeLeftSnapshot = timeLeft;
    const progress = (timeLeft / ROUND_DURATION) * 100;

    dom.timerValue.textContent = `${(timeLeft / 1000).toFixed(1)}s`;
    dom.timerFill.style.width = `${Math.max(progress, 0)}%`;

    if (timeLeft <= 0) {
      submitRound(true);
    }
  }, TIMER_TICK_MS);
}

function getTimeLeft() {
  if (!state.roundActive && !state.paused) {
    return state.timeLeftSnapshot;
  }

  const elapsed = performance.now() - state.roundStartTime;
  return Math.max(0, ROUND_DURATION - elapsed);
}

function submitRound(autoSubmitted) {
  if (!state.roundActive) return;

  state.roundActive = false;
  clearTimer();

  const timeLeft = getTimeLeft();
  const metrics = evaluateMatch(state.currentTarget, state.currentPlayer, timeLeft);
  state.totalScore += metrics.roundScore;
  state.combo = metrics.accuracy >= 88 ? state.combo + 1 : 0;

  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: state.playerName,
    accuracy: Number(metrics.accuracy.toFixed(2)),
    score: metrics.roundScore,
    totalScore: state.totalScore,
    difficulty: state.difficulty,
    date: new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  };

  state.latestEntryId = entry.id;
  saveLeaderboardEntry(entry);
  markDifficultyCompleted(normalizePlayerName(state.playerName), state.difficulty);

  state.roundResult = {
    autoSubmitted,
    metrics,
    entry,
    target: { ...state.currentTarget },
    player: { ...state.currentPlayer },
  };

  if (metrics.accuracy >= 95) {
    burstConfetti(metrics.accuracy >= 99 ? 36 : 20);
  }

  showResultView();
  state.round += 1;
}

function evaluateMatch(targetHsl, playerHsl, timeLeft) {
  const targetLab = rgbToLab(hslToRgb(targetHsl));
  const playerLab = rgbToLab(hslToRgb(playerHsl));
  const deltaE = calculateDeltaE(targetLab, playerLab);
  const normalizedAccuracy = clamp(100 - (deltaE / 60) * 100, 0, 100);
  const comboMultiplier = 1 + Math.min(state.combo * 0.03, 0.15);
  const difficultyMultiplier = DIFFICULTIES[state.difficulty].multiplier;
  const accuracyMultiplier = 1 + normalizedAccuracy / 100;
  const speedBonus = Math.round((timeLeft / ROUND_DURATION) * DIFFICULTIES[state.difficulty].timeBonusFactor);
  const perfectBonus = normalizedAccuracy >= 99.3 ? Math.round(90 * difficultyMultiplier) : 0;
  const distanceScore = Math.round((normalizedAccuracy * 8.2) * difficultyMultiplier);
  const rawRoundScore = Math.round((distanceScore + speedBonus + perfectBonus) * comboMultiplier);
  const roundScore = Math.min(rawRoundScore, MAX_ROUND_SCORE);

  return {
    deltaE,
    accuracy: normalizedAccuracy,
    speedBonus,
    perfectBonus,
    multiplier: accuracyMultiplier * comboMultiplier * difficultyMultiplier,
    roundScore,
    feedback: getFeedback(normalizedAccuracy),
  };
}

function showResultView() {
  const { metrics, entry, target, player, autoSubmitted } = state.roundResult;
  const nextDifficulty = getNextUnplayedDifficulty(normalizePlayerName(state.playerName), state.difficulty);
  const isFinalRunComplete = !nextDifficulty;
  const detail = [
    `${metrics.feedback} ${autoSubmitted ? "Time expired, so the arena locked in your current color." : "You locked the round in before the timer ended."}`,
    `Delta E ${metrics.deltaE.toFixed(2)} translated to ${metrics.accuracy.toFixed(1)}% perceptual accuracy.`,
    `Speed bonus: ${metrics.speedBonus}. Perfect bonus: ${metrics.perfectBonus}. Combo streak now at ${state.combo}x.`,
  ].join(" ");

  dom.resultHeadline.textContent = metrics.feedback;
  dom.resultTargetSwatch.style.background = hslCss(target);
  dom.resultPlayerSwatch.style.background = hslCss(player);
  dom.resultTargetText.textContent = formatHsl(target);
  dom.resultPlayerText.textContent = formatHsl(player);
  dom.resultAccuracy.textContent = `${metrics.accuracy.toFixed(1)}%`;
  dom.resultScore.textContent = String(entry.score);
  dom.resultTotal.textContent = String(state.totalScore);
  dom.resultRank.textContent = getRank(state.totalScore);
  dom.resultDetail.textContent = detail;
  dom.resultLeaderboardTitle.textContent = isFinalRunComplete
    ? "Final Score Leaderboard"
    : `${DIFFICULTIES[state.difficulty].label} Leaderboard`;
  dom.nextRoundButton.textContent = nextDifficulty ? `Go To ${DIFFICULTIES[nextDifficulty].label}` : "Arena Finished";
  dom.nextRoundButton.disabled = !nextDifficulty;
  dom.finalScorePanel.classList.toggle("hidden", !isFinalRunComplete);
  dom.finalScoreValue.textContent = String(state.totalScore);
  dom.finalScoreCopy.textContent = isFinalRunComplete
    ? `${state.playerName}, you cleared Easy, Medium, and Hard.`
    : "You finished all three levels.";

  if (isFinalRunComplete) {
    saveFinalLeaderboardEntry({
      id: `${entry.id}-final`,
      name: state.playerName,
      totalScore: state.totalScore,
      rank: getRank(state.totalScore),
      date: entry.date,
    });
  }

  renderLeaderboard(isFinalRunComplete ? "final" : state.difficulty, dom.resultLeaderboardList, dom.resultLeaderboardTitle);
  setActiveView("result");
}

function backToLobby() {
  clearTimer();
  state.roundActive = false;
  setActiveView("setup");
  state.lobbyBoard = state.difficulty;
  syncLeaderboardTabs();
  renderLeaderboard(state.lobbyBoard, dom.leaderboardList, dom.leaderboardTitle);
}

function restartCurrentSession() {
  const nextDifficulty = getFirstUnplayedDifficulty(normalizePlayerName(state.playerName));
  if (!nextDifficulty) {
    backToLobby();
    return;
  }

  state.difficulty = nextDifficulty;
  state.totalScore = 0;
  state.combo = 0;
  state.round = DIFFICULTY_ORDER.indexOf(nextDifficulty) + 1;
  syncDifficultyCards();
  beginRound();
}

function goToNextRound() {
  const nextDifficulty = getNextUnplayedDifficulty(normalizePlayerName(state.playerName), state.difficulty);

  if (!nextDifficulty) {
    backToLobby();
    return;
  }

  state.difficulty = nextDifficulty;
  state.round = DIFFICULTY_ORDER.indexOf(nextDifficulty) + 1;
  syncDifficultyCards();
  beginRound();
}

function getNextDifficulty(currentDifficulty) {
  const currentIndex = DIFFICULTY_ORDER.indexOf(currentDifficulty);
  if (currentIndex === -1 || currentIndex === DIFFICULTY_ORDER.length - 1) {
    return null;
  }

  return DIFFICULTY_ORDER[currentIndex + 1];
}

function getFirstUnplayedDifficulty(playerNameKey) {
  const completed = state.playerProgress[playerNameKey] || [];
  return DIFFICULTY_ORDER.find((difficulty) => !completed.includes(difficulty)) || null;
}

function getNextUnplayedDifficulty(playerNameKey, currentDifficulty) {
  const completed = state.playerProgress[playerNameKey] || [];
  const currentIndex = DIFFICULTY_ORDER.indexOf(currentDifficulty);

  for (let index = currentIndex + 1; index < DIFFICULTY_ORDER.length; index += 1) {
    const difficulty = DIFFICULTY_ORDER[index];
    if (!completed.includes(difficulty)) {
      return difficulty;
    }
  }

  return null;
}

function markDifficultyCompleted(playerNameKey, difficulty) {
  const completed = state.playerProgress[playerNameKey] || [];
  if (completed.includes(difficulty)) {
    return;
  }

  state.playerProgress[playerNameKey] = [...completed, difficulty];
  localStorage.setItem(PLAYER_PROGRESS_KEY, JSON.stringify(state.playerProgress));
}

function loadPlayerProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(PLAYER_PROGRESS_KEY));
    return raw && typeof raw === "object" ? raw : {};
  } catch (error) {
    return {};
  }
}

function normalizePlayerName(name) {
  return name.trim().toLowerCase();
}

function togglePause() {
  if (!state.roundActive && !state.paused) return;

  if (!state.paused) {
    state.paused = true;
    state.pausedAt = performance.now();
    clearTimer();
    dom.pausedOverlay.classList.remove("hidden");
    dom.pauseButton.textContent = "Resume";
    return;
  }

  state.paused = false;
  const pausedDuration = performance.now() - state.pausedAt;
  state.roundStartTime += pausedDuration;
  dom.pausedOverlay.classList.add("hidden");
  dom.pauseButton.textContent = "Pause";
  startTimerLoop();
}

function setActiveView(viewName) {
  Object.entries(dom.views).forEach(([key, element]) => {
    element.classList.toggle("active", key === viewName);
  });
  dom.homeButton.classList.toggle("hidden", viewName === "setup");
}

function setSliderValues(color) {
  dom.hSlider.value = color.h;
  dom.sSlider.value = color.s;
  dom.lSlider.value = color.l;
}

function paintSliderTracks() {
  const h = state.currentPlayer.h;
  const s = state.currentPlayer.s;
  const l = state.currentPlayer.l;

  dom.hSlider.style.background = `linear-gradient(90deg,
    hsl(0 ${s}% ${l}%),
    hsl(60 ${s}% ${l}%),
    hsl(120 ${s}% ${l}%),
    hsl(180 ${s}% ${l}%),
    hsl(240 ${s}% ${l}%),
    hsl(300 ${s}% ${l}%),
    hsl(360 ${s}% ${l}%)
  )`;
  dom.sSlider.style.background = `linear-gradient(90deg, hsl(${h} 0% ${l}%), hsl(${h} 100% ${l}%))`;
  dom.lSlider.style.background = `linear-gradient(90deg, hsl(${h} ${s}% 0%), hsl(${h} ${s}% 50%), hsl(${h} ${s}% 100%))`;
}

function syncDifficultyCards() {
  document.querySelectorAll(".difficulty-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.difficulty === state.difficulty);
  });
}

function syncLeaderboardTabs() {
  document.querySelectorAll(".leaderboard-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.board === state.lobbyBoard);
  });
}

function renderLeaderboard(difficulty, container, titleElement) {
  titleElement.textContent = difficulty === "final"
    ? "Final Score Leaderboard"
    : `${DIFFICULTIES[difficulty].label} Leaderboard`;

  const entries = [...state.leaderboards[difficulty]].sort((a, b) => {
    if (difficulty === "final") {
      return b.totalScore - a.totalScore;
    }

    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.score - a.score;
  });

  container.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-board";
    empty.textContent = "No champions yet. Land a great match to claim the first spot.";
    container.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const fragment = dom.leaderboardItemTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".leaderboard-item");
    fragment.querySelector(".board-name").textContent = entry.name;
    fragment.querySelector(".board-date").textContent = entry.date;
    fragment.querySelector(".board-accuracy").textContent = difficulty === "final"
      ? entry.rank
      : `${entry.accuracy.toFixed(1)}%`;
    fragment.querySelector(".board-score").textContent = difficulty === "final"
      ? `${entry.totalScore} pts`
      : `${entry.score} pts`;
    if (entry.id === state.latestEntryId) item.classList.add("latest");
    container.appendChild(fragment);
  });
}

function saveLeaderboardEntry(entry) {
  const board = state.leaderboards[entry.difficulty];
  board.push(entry);
  board.sort((a, b) => {
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.score - a.score;
  });
  state.leaderboards[entry.difficulty] = board.slice(0, MAX_LEADERBOARD_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.leaderboards));
}

function saveFinalLeaderboardEntry(entry) {
  const board = state.leaderboards.final.filter((item) => normalizePlayerName(item.name) !== normalizePlayerName(entry.name));
  board.push(entry);
  board.sort((a, b) => b.totalScore - a.totalScore);
  state.leaderboards.final = board.slice(0, MAX_LEADERBOARD_ENTRIES);
  state.latestEntryId = entry.id;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.leaderboards));
}

function loadLeaderboards() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      easy: Array.isArray(raw?.easy) ? raw.easy : [],
      medium: Array.isArray(raw?.medium) ? raw.medium : [],
      hard: Array.isArray(raw?.hard) ? raw.hard : [],
      final: Array.isArray(raw?.final) ? raw.final : [],
    };
  } catch (error) {
    return { easy: [], medium: [], hard: [], final: [] };
  }
}

function getFeedback(accuracy) {
  if (accuracy >= 99.3) return "Perfect!";
  if (accuracy >= 96) return "Legendary!";
  if (accuracy >= 90) return "Excellent!";
  if (accuracy >= 80) return "Close!";
  if (accuracy >= 65) return "Promising!";
  return "Keep tuning";
}

function getRank(score) {
  if (score >= 9000) return "Diamond";
  if (score >= 6500) return "Platinum";
  if (score >= 4200) return "Gold";
  if (score >= 2200) return "Silver";
  return "Bronze";
}

function burstConfetti(count) {
  if (window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 1400px)").matches) {
    return;
  }

  dom.confettiLayer.innerHTML = "";
  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${8 + Math.random() * 12}%`;
    piece.style.width = `${6 + Math.random() * 8}px`;
    piece.style.height = `${10 + Math.random() * 14}px`;
    piece.style.background = `hsl(${Math.random() * 360} 100% 65%)`;
    piece.style.setProperty("--drift", `${-80 + Math.random() * 160}px`);
    dom.confettiLayer.appendChild(piece);
  }

  window.setTimeout(() => {
    dom.confettiLayer.innerHTML = "";
  }, 1800);
}

function createParticles() {
  const total = 0;
  for (let index = 0; index < total; index += 1) {
    const particle = document.createElement("span");
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.width = `${2 + Math.random() * 4}px`;
    particle.style.height = particle.style.width;
    particle.style.animationDuration = `${10 + Math.random() * 14}s`;
    particle.style.animationDelay = `${-Math.random() * 8}s`;
    dom.particles.appendChild(particle);
  }
}

function clearTimer() {
  if (state.timerHandle) {
    window.clearInterval(state.timerHandle);
    state.timerHandle = null;
  }
}

function formatHsl({ h, s, l }) {
  return `hsl(${h} ${s}% ${l}%)`;
}

function hslCss({ h, s, l }) {
  return `hsl(${h} ${s}% ${l}%)`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hslToRgb({ h, s, l }) {
  const normalizedS = s / 100;
  const normalizedL = l / 100;
  const chroma = (1 - Math.abs(2 * normalizedL - 1)) * normalizedS;
  const huePrime = h / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (huePrime >= 0 && huePrime < 1) [r1, g1, b1] = [chroma, x, 0];
  else if (huePrime < 2) [r1, g1, b1] = [x, chroma, 0];
  else if (huePrime < 3) [r1, g1, b1] = [0, chroma, x];
  else if (huePrime < 4) [r1, g1, b1] = [0, x, chroma];
  else if (huePrime < 5) [r1, g1, b1] = [x, 0, chroma];
  else [r1, g1, b1] = [chroma, 0, x];

  const match = normalizedL - chroma / 2;
  return {
    r: Math.round((r1 + match) * 255),
    g: Math.round((g1 + match) * 255),
    b: Math.round((b1 + match) * 255),
  };
}

function rgbToLab({ r, g, b }) {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function rgbToXyz(r, g, b) {
  const [rn, gn, bn] = [r, g, b].map((value) => {
    const normalized = value / 255;
    return normalized > 0.04045
      ? ((normalized + 0.055) / 1.055) ** 2.4
      : normalized / 12.92;
  });

  const x = (rn * 0.4124 + gn * 0.3576 + bn * 0.1805) * 100;
  const y = (rn * 0.2126 + gn * 0.7152 + bn * 0.0722) * 100;
  const z = (rn * 0.0193 + gn * 0.1192 + bn * 0.9505) * 100;

  return [x, y, z];
}

function xyzToLab(x, y, z) {
  const reference = { x: 95.047, y: 100, z: 108.883 };
  const [xn, yn, zn] = [x / reference.x, y / reference.y, z / reference.z].map((value) => (
    value > 0.008856 ? Math.cbrt(value) : (7.787 * value) + (16 / 116)
  ));

  return {
    l: (116 * yn) - 16,
    a: 500 * (xn - yn),
    b: 200 * (yn - zn),
  };
}

function calculateDeltaE(labA, labB) {
  const deltaL = labA.l - labB.l;
  const deltaA = labA.a - labB.a;
  const deltaB = labA.b - labB.b;
  return Math.sqrt((deltaL ** 2) + (deltaA ** 2) + (deltaB ** 2));
}

init();
