const GAME_DURATION = 60;
const DEFAULT_LEADERBOARD_DIFFICULTY = "normal";

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

const elements = {
  screens: {
    start: document.getElementById("start-screen"),
    game: document.getElementById("game-screen"),
    result: document.getElementById("result-screen"),
    leaderboard: document.getElementById("leaderboard-screen")
  },
  startForm: document.getElementById("start-form"),
  playerNameInput: document.getElementById("player-name"),
  difficultyInputs: document.querySelectorAll('input[name="difficulty"]'),
  startError: document.getElementById("start-error"),
  startLeaderboardButton: document.getElementById("start-leaderboard-btn"),
  gamePlayerTag: document.getElementById("game-player-tag"),
  gameDifficultyTag: document.getElementById("game-difficulty-tag"),
  textDisplay: document.getElementById("text-display"),
  typingInput: document.getElementById("typing-input"),
  timer: document.getElementById("timer"),
  wpm: document.getElementById("wpm"),
  accuracy: document.getElementById("accuracy"),
  mistakes: document.getElementById("mistakes"),
  streak: document.getElementById("streak"),
  bestStreak: document.getElementById("best-streak"),
  scorePreview: document.getElementById("score-preview"),
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
  isRunning: false,
  gameEnded: false,
  lastScreen: "start"
};

function getDifficultyConfig(difficulty) {
  return DIFFICULTIES[difficulty] || DIFFICULTIES[DEFAULT_LEADERBOARD_DIFFICULTY];
}

function getSelectedDifficultyFromForm() {
  const checkedInput = Array.from(elements.difficultyInputs).find((input) => input.checked);
  return checkedInput ? checkedInput.value : "";
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
  renderCurrentText();
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

function calculateScore() {
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

  if (state.bestStreak > 30) {
    score *= 2;
  }

  return Math.max(0, score);
}

function updateStats() {
  const wpm = calculateWpm();
  const accuracy = calculateAccuracy();
  const score = calculateScore();

  elements.wpm.textContent = wpm;
  elements.accuracy.textContent = `${accuracy}%`;
  elements.mistakes.textContent = state.mistakes;
  elements.streak.textContent = state.currentStreak;
  elements.bestStreak.textContent = state.bestStreak;
  elements.scorePreview.textContent = score;
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

function registerCharacterAttempt(character, index) {
  state.typedAttempts += 1;

  if (character === state.currentText[index]) {
    state.correctAttempts += 1;
    state.currentStreak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
  } else {
    state.mistakes += 1;
    state.currentStreak = 0;
  }
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
  if (!state.isRunning || state.gameEnded) {
    return;
  }

  // The game expects forward typing, so deletions update feedback without adding new attempts.
  const isDeletion = typeof event?.inputType === "string" && event.inputType.startsWith("delete");
  const typedValue = getTypingValue();

  if (!isDeletion && (typedValue.length > state.previousInputValue.length || typedValue !== state.previousInputValue)) {
    processNewCharacters(state.previousInputValue, typedValue);
  }

  state.previousInputValue = typedValue;
  state.matchedChars = countMatchedCharacters(typedValue);
  updateTextFeedback(typedValue);
  updateStats();
  checkIfCompleted();
}

function checkIfCompleted() {
  if (!state.isRunning || state.gameEnded) {
    return false;
  }

  const typedText = getTypingValue();
  const targetText = state.currentText;

  if (typedText === targetText) {
    endGame();
    return true;
  }

  return false;
}

function canSubmitAttempt() {
  if (!state.isRunning || state.gameEnded) {
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
  state.isRunning = false;
  state.gameEnded = false;

  elements.timer.textContent = `${GAME_DURATION}s`;
  elements.textDisplay.innerHTML = "";
  elements.typingInput.value = "";
  elements.typingInput.disabled = false;
  elements.startError.textContent = "";
  updateStats();
}

function startTimer() {
  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    elements.timer.textContent = `${Math.max(0, state.timeLeft)}s`;

    if (state.timeLeft <= 0) {
      endGame({ timedOut: true });
    }
  }, 1000);
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
  // Results are stored separately per difficulty, then trimmed to the visible Top 10.
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
  elements.resultScore.textContent = finalScore;
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
}

function endGame({ timedOut = false } = {}) {
  if (state.gameEnded) {
    return;
  }

  state.gameEnded = true;
  state.isRunning = false;
  clearInterval(state.timerId);
  state.timerId = null;

  if (timedOut) {
    state.timeLeft = 0;
    elements.timer.textContent = "0s";
  }

  const typedValue = getTypingValue();

  elements.typingInput.disabled = true;
  state.previousInputValue = typedValue;
  state.matchedChars = countMatchedCharacters(typedValue);
  updateTextFeedback(typedValue);
  updateStats();
  populateResults();
  showScreen("result");
}

function startGame(playerName, difficulty) {
  resetGameState();
  state.playerName = playerName;
  state.selectedDifficulty = difficulty;
  state.activeLeaderboardDifficulty = difficulty;
  state.isRunning = true;
  state.gameEnded = false;
  state.gameStartedAt = Date.now();

  updateGameMeta();
  showScreen("game");
  loadNewText();
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
  elements.typingInput.addEventListener("input", handleTyping);
  elements.typingInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (checkIfCompleted()) {
        return;
      }

      if (canSubmitAttempt()) {
        endGame();
      }
    }
  });

  elements.startLeaderboardButton.addEventListener("click", () => showLeaderboard());
  elements.resultLeaderboardButton.addEventListener("click", () => showLeaderboard(state.selectedDifficulty));
  elements.playAgainButton.addEventListener("click", returnToStart);
  elements.leaderboardBackButton.addEventListener("click", () => showScreen(state.lastScreen || "start"));
  elements.clearLeaderboardButton.addEventListener("click", clearLeaderboard);

  elements.playerNameInput.addEventListener("input", () => {
    if (elements.playerNameInput.value.trim()) {
      elements.startError.textContent = "";
    }
  });

  elements.difficultyInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (getSelectedDifficultyFromForm()) {
        elements.startError.textContent = "";
      }
    });
  });

  elements.leaderboardSwitchButtons.forEach((button) => {
    button.addEventListener("click", () => {
      renderLeaderboard(button.dataset.boardDifficulty);
    });
  });
}

function init() {
  bindEvents();
  updateGameMeta();
  updateStats();
  renderLeaderboard(DEFAULT_LEADERBOARD_DIFFICULTY);
}

init();
