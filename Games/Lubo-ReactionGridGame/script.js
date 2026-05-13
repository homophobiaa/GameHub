const GRID_SIZE = 25;
const GAME_SECONDS = 30;
const USERS_KEY = "reactionGridUsers";
const CURRENT_USER_KEY = "reactionGridCurrentUser";
const LEADERBOARD_KEY = "reactionGridLeaderboard";
const STATS_KEY = "reactionGridStats";

const DIFFICULTIES = {
  easy: {
    label: "Easy",
    startSpeed: 1200,
    minSpeed: 500,
    acceleration: 12,
    targetClass: "target-easy",
    fakeChance: 0
  },
  normal: {
    label: "Normal",
    startSpeed: 1000,
    minSpeed: 300,
    acceleration: 20,
    targetClass: "target-normal",
    fakeChance: 0
  },
  hard: {
    label: "Hard",
    startSpeed: 700,
    minSpeed: 150,
    acceleration: 32,
    targetClass: "target-hard",
    fakeChance: 0.28
  }
};

const grid = document.getElementById("grid");
const bgMusic = document.getElementById("bgMusic");
const gameCard = document.getElementById("gameCard");
const popupLayer = document.getElementById("popupLayer");
const countdown = document.getElementById("countdown");
const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const loadingOverlay = document.getElementById("loadingOverlay");
const nicknameInput = document.getElementById("nicknameInput");
const newUserBtn = document.getElementById("newUserBtn");
const enterGameBtn = document.getElementById("enterGameBtn");
const homeBtn = document.getElementById("homeBtn");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const restartBtn = document.getElementById("restartBtn");
const musicToggle = document.getElementById("musicToggle");
const soundToggle = document.getElementById("soundToggle");
const musicToggleGame = document.getElementById("musicToggleGame");
const soundToggleGame = document.getElementById("soundToggleGame");
const currentUserText = document.getElementById("currentUser");
const scoreText = document.getElementById("score");
const comboText = document.getElementById("combo");
const timeText = document.getElementById("time");
const finalScoreText = document.getElementById("finalScore");
const userMessage = document.getElementById("userMessage");
const leaderboardList = document.getElementById("leaderboard");
const modeLabel = document.getElementById("modeLabel");
const multiplierLabel = document.getElementById("multiplierLabel");
const speedLabel = document.getElementById("speedLabel");
const comboTile = document.getElementById("comboTile");
const highestComboText = document.getElementById("highestCombo");
const accuracyText = document.getElementById("accuracy");
const clicksPerSecondText = document.getElementById("clicksPerSecond");
const bestScoreText = document.getElementById("bestScore");
const totalGamesText = document.getElementById("totalGames");
const modeButtons = document.querySelectorAll(".mode-card");

let cells = [];
let currentUser = null;
let selectedMode = "easy";
let score = 0;
let combo = 0;
let highestCombo = 0;
let totalClicks = 0;
let successfulClicks = 0;
let timeLeft = GAME_SECONDS;
let speed = DIFFICULTIES.easy.startSpeed;
let targetIndex = -1;
let spawnTimer = null;
let countdownTimer = null;
let statTimer = null;
let fakeTimer = null;
let runStartedAt = 0;
let elapsedBeforePause = 0;
let isPlaying = false;
let isCountingDown = false;
let runInProgress = false;
let leaderboard = [];
let stats = getDefaultStats();
let audioContext = null;
let musicEnabled = true;
let isSoundOn = true;
bgMusic.volume = 0.15;
bgMusic.loop = true;

function createCells() {
  grid.innerHTML = "";
  cells = [];

  for (let index = 0; index < GRID_SIZE; index += 1) {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.type = "button";
    cell.setAttribute("aria-label", `Grid square ${index + 1}`);
    cell.addEventListener("click", (event) => handleCellClick(index, event));
    grid.appendChild(cell);
    cells.push(cell);
  }
}

function createNewUser() {
  const nickname = nicknameInput.value.trim().slice(0, 14);

  if (!nickname) {
    userMessage.textContent = "Enter initials or a nickname first.";
    nicknameInput.focus();
    return;
  }

  const users = readJson(USERS_KEY, []);
  const newUser = {
    id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
    name: nickname,
    points: 0
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

  currentUser = newUser;
  stats = getDefaultStats();
  saveStats();
  resetRun();
  userMessage.textContent = `${nickname} is ready. Choose a mode and enter the game.`;
}

function startGame() {
  if (!currentUser) {
    showHome();
    userMessage.textContent = "Create a new user before starting.";
    nicknameInput.focus();
    return;
  }

  if (isPlaying || isCountingDown) {
    return;
  }

  if (!runInProgress || timeLeft <= 0) {
    resetRun();
    runInProgress = true;
  }

  finalScoreText.textContent = "";
  userMessage.textContent = "Game armed. Countdown started.";
  startMusic();
  startCountdown();
}

function stopGame() {
  if (!isPlaying && !isCountingDown) {
    return;
  }

  if (isPlaying) {
    elapsedBeforePause += performance.now() - runStartedAt;
  }

  isPlaying = false;
  isCountingDown = false;
  clearTimers();
  clearTarget();
  hideCountdown();
  updateControls();
  userMessage.textContent = "Paused. Press START to continue this run.";
}

function endGame() {
  const finishedScore = score;

  if (isPlaying) {
    elapsedBeforePause += performance.now() - runStartedAt;
  }

  isPlaying = false;
  isCountingDown = false;
  runInProgress = false;
  clearTimers();
  clearTarget();
  hideCountdown();
  playSound("gameOver");
  addLeaderboardEntry(currentUser.name, finishedScore);
  saveLeaderboard();
  updateLeaderboard();
  updateStoredStats();
  finalScoreText.textContent = `Final score: ${finishedScore} points. Accuracy ${getAccuracy()}%.`;
  userMessage.textContent = "Time is up. Your score and stats were saved.";
  updateStats();
  updateControls();
}

function spawnTarget() {
  if (!isPlaying) {
    return;
  }

  clearTarget();

  let nextIndex = Math.floor(Math.random() * cells.length);

  if (cells.length > 1) {
    while (nextIndex === targetIndex) {
      nextIndex = Math.floor(Math.random() * cells.length);
    }
  }

  targetIndex = nextIndex;
  cells[targetIndex].classList.add("active");
  cells[targetIndex].setAttribute("aria-label", `Active target at square ${targetIndex + 1}`);
  maybeFlashFakeTarget();
}

function restartSpawn() {
  clearInterval(spawnTimer);
  spawnTimer = setInterval(spawnTarget, speed);
}

function addScore(points) {
  score += points;
  updateStats();
}

function saveLeaderboard() {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

function loadLeaderboard() {
  leaderboard = readJson(LEADERBOARD_KEY, []);
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);
  updateLeaderboard();
}

function updateLeaderboard() {
  leaderboardList.innerHTML = "";

  if (leaderboard.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-board";
    emptyItem.textContent = "No scores yet. Start the first run.";
    leaderboardList.appendChild(emptyItem);
    return;
  }

  leaderboard.forEach((entry, index) => {
    const item = document.createElement("li");
    const rank = document.createElement("span");
    const name = document.createElement("span");
    const playerScore = document.createElement("span");

    rank.className = "rank";
    name.className = "player-name";
    playerScore.className = "player-score";
    rank.textContent = index + 1;
    name.textContent = entry.name;
    playerScore.textContent = entry.score;

    item.append(rank, name, playerScore);
    leaderboardList.appendChild(item);
  });
}

function handleCellClick(index, event) {
  if (!isPlaying) {
    return;
  }

  totalClicks += 1;

  if (index === targetIndex) {
    successfulClicks += 1;
    combo += 1;
    highestCombo = Math.max(highestCombo, combo);

    const points = getPointsForCombo(combo);
    addScore(points);
    showScorePopup(event, `+${points}`);
    playSound(combo >= 5 && combo % 5 === 0 ? "combo" : "click");
    triggerComboEffects();

    speed = Math.max(getMode().minSpeed, speed - getMode().acceleration);
    spawnTarget();
    restartSpawn();
  } else {
    combo = 0;
    playSound("wrong");
    clearFakeTargets();
  }

  updateStats();
}

function restartGame() {
  stopGame();
  resetRun();
  startGame();
}

function selectMode(mode) {
  selectedMode = mode;
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  applyModeVisuals();
  resetRun();
}

function showGame() {
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  updateStats();
}

function showHome() {
  stopGame();
  gameScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
}

function startCountdown() {
  const steps = ["3", "2", "1", "GO!"];
  let stepIndex = 0;

  isCountingDown = true;
  updateControls();
  countdown.classList.remove("hidden");
  countdown.textContent = steps[stepIndex];
  playSound("count");

  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    stepIndex += 1;

    if (stepIndex >= steps.length) {
      clearInterval(countdownTimer);
      hideCountdown();
      beginActivePlay();
      return;
    }

    countdown.textContent = steps[stepIndex];
    countdown.style.animation = "none";
    countdown.offsetHeight;
    countdown.style.animation = "";
    playSound(stepIndex === steps.length - 1 ? "go" : "count");
  }, 760);
}

function beginActivePlay() {
  isCountingDown = false;
  isPlaying = true;
  runStartedAt = performance.now();
  userMessage.textContent = "Game running. Hit the active square.";
  spawnTarget();
  restartSpawn();
  clearInterval(statTimer);
  statTimer = setInterval(updateStats, 250);
  updateControls();
}

function resetRun() {
  clearTimers();
  clearTarget();
  hideCountdown();
  score = 0;
  combo = 0;
  highestCombo = 0;
  totalClicks = 0;
  successfulClicks = 0;
  timeLeft = GAME_SECONDS;
  speed = getMode().startSpeed;
  targetIndex = -1;
  elapsedBeforePause = 0;
  runStartedAt = 0;
  isPlaying = false;
  isCountingDown = false;
  runInProgress = false;
  finalScoreText.textContent = "";
  updateStats();
  updateControls();
}

function updateStats() {
  if (isPlaying) {
    const elapsed = elapsedBeforePause + performance.now() - runStartedAt;
    timeLeft = Math.max(0, GAME_SECONDS - Math.floor(elapsed / 1000));

    if (timeLeft <= 0) {
      endGame();
      return;
    }
  }

  currentUserText.textContent = currentUser ? currentUser.name : "Guest";
  scoreText.textContent = score;
  comboText.textContent = combo;
  timeText.textContent = timeLeft;
  modeLabel.textContent = getMode().label;
  multiplierLabel.textContent = `x${getPointsForCombo(Math.max(combo, 1))}`;
  speedLabel.textContent = `${speed}ms`;
  highestComboText.textContent = Math.max(highestCombo, stats.highestCombo);
  accuracyText.textContent = `${getAccuracy()}%`;
  clicksPerSecondText.textContent = getClicksPerSecond().toFixed(2);
  bestScoreText.textContent = Math.max(score, stats.bestScore);
  totalGamesText.textContent = stats.totalGames;
}

function getPointsForCombo(currentCombo) {
  if (currentCombo >= 20) return 5;
  if (currentCombo >= 15) return 4;
  if (currentCombo >= 10) return 3;
  if (currentCombo >= 5) return 2;
  return 1;
}

function addLeaderboardEntry(name, finalScore) {
  leaderboard.push({
    name,
    score: finalScore,
    mode: getMode().label,
    date: new Date().toISOString()
  });

  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);
}

function updateStoredStats() {
  stats.highestCombo = Math.max(stats.highestCombo, highestCombo);
  stats.bestScore = Math.max(stats.bestScore, score);
  stats.totalGames += 1;
  stats.totalClicks += totalClicks;
  stats.successfulClicks += successfulClicks;
  stats.bestAccuracy = Math.max(stats.bestAccuracy, Number(getAccuracy()));
  saveStats();
}

function saveStats() {
  if (!currentUser) {
    return;
  }

  const allStats = readJson(STATS_KEY, {});
  allStats[currentUser.id] = stats;
  localStorage.setItem(STATS_KEY, JSON.stringify(allStats));
}

function loadStats() {
  if (!currentUser) {
    stats = getDefaultStats();
    return;
  }

  const allStats = readJson(STATS_KEY, {});
  stats = allStats[currentUser.id] || getDefaultStats();
}

function getDefaultStats() {
  return {
    highestCombo: 0,
    bestScore: 0,
    totalGames: 0,
    totalClicks: 0,
    successfulClicks: 0,
    bestAccuracy: 0
  };
}

function getAccuracy() {
  if (totalClicks === 0) {
    return 0;
  }

  return Math.round((successfulClicks / totalClicks) * 100);
}

function getClicksPerSecond() {
  const elapsedSeconds = isPlaying
    ? (elapsedBeforePause + performance.now() - runStartedAt) / 1000
    : elapsedBeforePause / 1000;

  if (elapsedSeconds <= 0) {
    return 0;
  }

  return totalClicks / elapsedSeconds;
}

function getMode() {
  return DIFFICULTIES[selectedMode];
}

function applyModeVisuals() {
  Object.values(DIFFICULTIES).forEach((mode) => grid.classList.remove(mode.targetClass));
  grid.classList.add(getMode().targetClass);
  updateStats();
}

function triggerComboEffects() {
  comboTile.classList.toggle("combo-glow", combo >= 5);

  if (combo >= 10) {
    gameCard.classList.remove("shake");
    gameCard.offsetHeight;
    gameCard.classList.add("shake");
  }
}

function showScorePopup(event, text) {
  const wrapRect = popupLayer.getBoundingClientRect();
  const popup = document.createElement("span");
  popup.className = "score-popup";
  popup.textContent = text;
  popup.style.left = `${event.clientX - wrapRect.left}px`;
  popup.style.top = `${event.clientY - wrapRect.top}px`;
  popupLayer.appendChild(popup);
  setTimeout(() => popup.remove(), 720);
}

function maybeFlashFakeTarget() {
  clearTimeout(fakeTimer);

  if (getMode().fakeChance === 0 || Math.random() > getMode().fakeChance) {
    return;
  }

  const available = cells
    .map((cell, index) => ({ cell, index }))
    .filter((item) => item.index !== targetIndex);
  const fake = available[Math.floor(Math.random() * available.length)];

  if (!fake) {
    return;
  }

  fake.cell.classList.add("fake");
  fakeTimer = setTimeout(() => fake.cell.classList.remove("fake"), 190);
}

function clearTarget() {
  cells.forEach((cell, index) => {
    cell.classList.remove("active", "fake");
    cell.setAttribute("aria-label", `Grid square ${index + 1}`);
  });
  comboTile.classList.remove("combo-glow");
}

function clearFakeTargets() {
  cells.forEach((cell) => cell.classList.remove("fake"));
}

function clearTimers() {
  clearInterval(spawnTimer);
  clearInterval(countdownTimer);
  clearInterval(statTimer);
  clearTimeout(fakeTimer);
  spawnTimer = null;
  countdownTimer = null;
  statTimer = null;
  fakeTimer = null;
}

function hideCountdown() {
  countdown.classList.add("hidden");
  countdown.textContent = "";
}

function updateControls() {
  startBtn.disabled = isPlaying || isCountingDown;
  stopBtn.disabled = !isPlaying && !isCountingDown;
  restartBtn.disabled = isCountingDown;
}

function loadCurrentUser() {
  currentUser = readJson(CURRENT_USER_KEY, null);
  loadStats();
  updateStats();
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function initAudio() {
  if (audioContext) {
    return;
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;

  if (!AudioCtor) {
    musicEnabled = false;
    isSoundOn = false;
    syncAudioButtons();
    return;
  }

  audioContext = new AudioCtor();
}

function resumeAudio() {
  initAudio();

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playMusic() {
  if (!musicEnabled || !bgMusic) {
    return;
  }

  bgMusic.volume = 0.15;
  const playPromise = bgMusic.play();

  if (playPromise) {
    playPromise.catch((error) => {
      console.log("Music could not start:", error);
    });
  }
}

function startMusic() {
  playMusic();
}

function stopMusic() {
  if (!bgMusic) {
    return;
  }

  bgMusic.pause();
}

function playSound(type) {
  if (!isSoundOn) {
    return;
  }

  resumeAudio();

  if (!audioContext) {
    return;
  }

  const output = audioContext.createGain();
  output.gain.value = 0.05;
  output.connect(audioContext.destination);

  if (type === "click") playTone(640, 0.055, "triangle", output, 0.16);
  if (type === "combo") playArp([620, 780, 980], output);
  if (type === "wrong") playTone(150, 0.08, "sawtooth", output, 0.08);
  if (type === "gameOver") playArp([392, 293, 196], output);
  if (type === "count") playTone(420, 0.06, "sine", output, 0.08);
  if (type === "go") playArp([520, 660, 880], output);
}

function playTone(frequency, duration, type, destination, volume) {
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playArp(notes, destination) {
  notes.forEach((note, index) => {
    setTimeout(() => {
      if (audioContext) {
        playTone(note, 0.07, "triangle", destination, 0.13);
      }
    }, index * 55);
  });
}

function toggleMusic() {
  if (!bgMusic || bgMusic.paused) {
    musicEnabled = true;
    playMusic();
  } else {
    musicEnabled = false;
    stopMusic();
  }

  syncAudioButtons();
}

function toggleSound() {
  resumeAudio();
  isSoundOn = !isSoundOn;
  syncAudioButtons();
}

function syncAudioButtons() {
  const musicText = musicEnabled ? "🎵 Music ON" : "🔇 Music OFF";
  const soundText = isSoundOn ? "Sound On" : "Sound Off";
  musicToggle.textContent = musicText;
  musicToggleGame.textContent = musicText;
  soundToggle.textContent = soundText;
  soundToggleGame.textContent = soundText;
}

newUserBtn.addEventListener("click", createNewUser);
enterGameBtn.addEventListener("click", showGame);
homeBtn.addEventListener("click", showHome);
startBtn.addEventListener("click", startGame);
stopBtn.addEventListener("click", stopGame);
restartBtn.addEventListener("click", restartGame);
musicToggle.addEventListener("click", toggleMusic);
musicToggleGame.addEventListener("click", toggleMusic);
soundToggle.addEventListener("click", toggleSound);
soundToggleGame.addEventListener("click", toggleSound);
nicknameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    createNewUser();
  }
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => selectMode(button.dataset.mode));
});

window.addEventListener("load", () => {
  setTimeout(() => loadingOverlay.classList.add("loaded"), 450);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopMusic();
  }
});

bgMusic.addEventListener("ended", () => {
  if (musicEnabled) {
    bgMusic.currentTime = 0;
    playMusic();
  }
});

createCells();
bgMusic.volume = 0.15;
loadCurrentUser();
loadLeaderboard();
applyModeVisuals();
syncAudioButtons();
resetRun();
