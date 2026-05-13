const STORAGE_KEY = "memoryPatternCurrentPlayer";
const BEST_KEY = "memoryPatternBestScore";
const LANG_KEY = "memoryPatternLanguage";
const DIFFICULTY_KEY = "memoryPatternDifficulty";
const THEME_KEY = "memoryPatternTheme";
const SOUND_KEY = "memoryPatternSound";
const LEADERBOARD_KEY = "memoryPatternLeaderboard";
const ACHIEVEMENTS_KEY = "memoryPatternAchievements";
const GAME_SECONDS = 90;
const COLORS = ["coral", "mint", "sky", "gold"];
const KEY_TO_COLOR = { q: "coral", w: "mint", a: "sky", s: "gold" };

const DIFFICULTIES = {
  easy: { score: 0.9, flashStart: 780, flashStep: 38, flashMin: 220, gapStart: 220, gapStep: 8, gapMin: 90, nextDelay: 780 },
  normal: { score: 1, flashStart: 680, flashStep: 58, flashMin: 135, gapStart: 185, gapStep: 13, gapMin: 58, nextDelay: 620 },
  brutal: { score: 1.35, flashStart: 560, flashStep: 74, flashMin: 90, gapStart: 150, gapStep: 16, gapMin: 42, nextDelay: 460 }
};

const COLOR_GLOWS = {
  coral: "rgba(255, 49, 90, 0.86)",
  mint: "rgba(40, 246, 161, 0.86)",
  sky: "rgba(48, 216, 255, 0.86)",
  gold: "rgba(255, 215, 95, 0.86)"
};

const SOUND_FREQS = {
  coral: 261.63,
  mint: 329.63,
  sky: 392,
  gold: 523.25,
  ok: 659.25,
  bad: 110,
  tick: 220
};

const TEXT = {
  bg: {
    documentTitle: "Memory Pattern Challenge",
    heroEyebrow: "Neural Memory Arena",
    intro: "Запомни светлинния код, повтори го без грешка и дръж серията жива. Всеки успешен рунд добавя нов сигнал.",
    ruleTime: "90 секунди",
    ruleSignals: "4 сигнала",
    ruleScore: "Комбо точки",
    profileAria: "Профил на играч",
    sessionLabel: "Сесия",
    noProfile: "Няма профил",
    newUser: "Нов потребител",
    switchToEnglish: "Смени на английски",
    gameAreaAria: "Игрална зона",
    formLabel: "Инициали / прякор",
    placeholder: "Напр. АД",
    create: "Създай",
    hint: "Без email и парола. Пази се само в този браузър.",
    settingsAria: "Настройки",
    difficultyLabel: "Трудност",
    themeLabel: "Тема",
    soundOn: "Звук: Вкл.",
    soundOff: "Звук: Изкл.",
    statsAria: "Статистика",
    scoreLabel: "Точки",
    roundLabel: "Рунд",
    comboLabel: "Комбо",
    bestLabel: "Най-добър",
    timeLabel: "Време",
    start: "Старт",
    reset: "Нова игра",
    seriesAria: "Дължина на поредицата",
    seriesLabel: "Серия",
    boardAria: "Цветна последователност",
    padCoral: "Червен триъгълник, клавиш Q",
    padMint: "Зелен ромб, клавиш W",
    padSky: "Син кръг, клавиш A",
    padGold: "Жълт кръст, клавиш S",
    leaderboardTitle: "Топ 5",
    clearLeaderboard: "Изчисти",
    leaderboardEmpty: "Още няма резултати.",
    achievementsTitle: "Постижения",
    achievementUnlocked: "Отключено",
    achievementLocked: "Заключено",
    achievementToastTitle: "Ново постижение",
    achievementFirstSyncName: "First Sync",
    achievementFirstSyncDesc: "Завърши първия си успешен рунд.",
    achievementRound10Name: "10 Rounds",
    achievementRound10Desc: "Стигни до рунд 10.",
    achievementCombo5Name: "x5 Combo",
    achievementCombo5Desc: "Направи максимално комбо x5.",
    achievementBrutalName: "Brutal Survivor",
    achievementBrutalDesc: "Оцелей до рунд 8 на Brutal.",
    resultEyebrow: "Край на играта",
    resultDefaultTitle: "Добра серия!",
    resultStatsAria: "Финална статистика",
    playAgain: "Играй пак",
    playerFallback: "Играч",
    countdownGo: "GO",
    statusCreateProfile: "Създай нов потребител, за да започнеш.",
    statusPlayerReady: "Готово, {name}. Избери режим и натисни Старт.",
    statusCountdown: "Приготви се. Светлинният код стартира.",
    statusWatchStart: "Гледай внимателно. Последователността започва.",
    statusRoundWatch: "Рунд {round}: запомни светлините. Скоростта расте.",
    statusYourTurn: "Твой ред. Натисни цветовете или Q/W/A/S.",
    statusCorrect: "Точно! +{points} точки. Комбо {combo}. Следва по-бърза серия.",
    statusMistakeReveal: "Грешка. Правилният сигнал беше показан.",
    statusEnd: "{title}. Краен резултат: {score} точки.",
    statusEmptyName: "Въведи инициали или кратък прякор, за да създадеш профил.",
    statusNewPlayer: "Въведи инициали за нов играч. Всеки нов старт е отделен профил.",
    statusResetWithPlayer: "Натисни Старт за нова игра.",
    statusResetNoPlayer: "Създай нов потребител, за да започнеш.",
    statusPlayAgain: "Готов си за нов опит. Натисни Старт.",
    statusProfileLoaded: "Профилът е зареден. Натисни Старт.",
    statusLeaderboardCleared: "Leaderboard-ът е изчистен.",
    timeTitle: "Времето свърши",
    timeDetail: "Стигна до края на таймера. Чиста битка.",
    wrongTitle: "Грешна последователност",
    wrongDetail: "Един сигнал избяга от паметта. Пробвай пак.",
    resultMessage: "{playerName}, резултатът ти е {score} точки в {round} рунда на {difficulty}. Ранг: {rank}. {detail}",
    rankRookie: "Rookie",
    rankSharp: "Sharp",
    rankBeast: "Neural Beast",
    rankGod: "Memory God",
    difficultyEasy: "Easy",
    difficultyNormal: "Normal",
    difficultyBrutal: "Brutal",
    themeNeon: "Neon",
    themeRed: "Cyber Red",
    themeToxic: "Toxic Green",
    themeIce: "Ice Blue"
  },
  en: {
    documentTitle: "Memory Pattern Challenge",
    heroEyebrow: "Neural Memory Arena",
    intro: "Memorize the light code, repeat it cleanly, and keep the streak alive. Every successful round adds a new signal.",
    ruleTime: "90 seconds",
    ruleSignals: "4 signals",
    ruleScore: "Combo scoring",
    profileAria: "Player profile",
    sessionLabel: "Session",
    noProfile: "No profile",
    newUser: "New user",
    switchToBulgarian: "Switch to Bulgarian",
    gameAreaAria: "Game area",
    formLabel: "Initials / nickname",
    placeholder: "Ex. AD",
    create: "Create",
    hint: "No email or password. Saved only in this browser.",
    settingsAria: "Settings",
    difficultyLabel: "Difficulty",
    themeLabel: "Theme",
    soundOn: "Sound: On",
    soundOff: "Sound: Off",
    statsAria: "Stats",
    scoreLabel: "Score",
    roundLabel: "Round",
    comboLabel: "Combo",
    bestLabel: "Best",
    timeLabel: "Time",
    start: "Start",
    reset: "New game",
    seriesAria: "Sequence length",
    seriesLabel: "Series",
    boardAria: "Color sequence",
    padCoral: "Red triangle, key Q",
    padMint: "Green diamond, key W",
    padSky: "Blue circle, key A",
    padGold: "Yellow cross, key S",
    leaderboardTitle: "Top 5",
    clearLeaderboard: "Clear",
    leaderboardEmpty: "No scores yet.",
    achievementsTitle: "Achievements",
    achievementUnlocked: "Unlocked",
    achievementLocked: "Locked",
    achievementToastTitle: "New achievement",
    achievementFirstSyncName: "First Sync",
    achievementFirstSyncDesc: "Complete your first successful round.",
    achievementRound10Name: "10 Rounds",
    achievementRound10Desc: "Reach round 10.",
    achievementCombo5Name: "x5 Combo",
    achievementCombo5Desc: "Hit the maximum x5 combo.",
    achievementBrutalName: "Brutal Survivor",
    achievementBrutalDesc: "Survive to round 8 on Brutal.",
    resultEyebrow: "Game over",
    resultDefaultTitle: "Good streak!",
    resultStatsAria: "Final stats",
    playAgain: "Play again",
    playerFallback: "Player",
    countdownGo: "GO",
    statusCreateProfile: "Create a new user to begin.",
    statusPlayerReady: "Ready, {name}. Choose a mode and press Start.",
    statusCountdown: "Get ready. The light code is launching.",
    statusWatchStart: "Watch closely. The sequence is starting.",
    statusRoundWatch: "Round {round}: memorize the lights. Speed is rising.",
    statusYourTurn: "Your turn. Press the colors or Q/W/A/S.",
    statusCorrect: "Correct! +{points} points. Combo {combo}. Next sequence is faster.",
    statusMistakeReveal: "Mistake. The correct signal was revealed.",
    statusEnd: "{title}. Final score: {score} points.",
    statusEmptyName: "Enter initials or a short nickname to create a profile.",
    statusNewPlayer: "Enter initials for a new player. Every new start is a separate profile.",
    statusResetWithPlayer: "Press Start for a new game.",
    statusResetNoPlayer: "Create a new user to begin.",
    statusPlayAgain: "Ready for another run. Press Start.",
    statusProfileLoaded: "Profile loaded. Press Start.",
    statusLeaderboardCleared: "Leaderboard cleared.",
    timeTitle: "Time is up",
    timeDetail: "You reached the end of the timer. Clean fight.",
    wrongTitle: "Wrong sequence",
    wrongDetail: "One signal slipped out of memory. Try again.",
    resultMessage: "{playerName}, your score is {score} points in {round} rounds on {difficulty}. Rank: {rank}. {detail}",
    rankRookie: "Rookie",
    rankSharp: "Sharp",
    rankBeast: "Neural Beast",
    rankGod: "Memory God",
    difficultyEasy: "Easy",
    difficultyNormal: "Normal",
    difficultyBrutal: "Brutal",
    themeNeon: "Neon",
    themeRed: "Cyber Red",
    themeToxic: "Toxic Green",
    themeIce: "Ice Blue"
  }
};

const PAD_LABEL_KEYS = {
  coral: "padCoral",
  mint: "padMint",
  sky: "padSky",
  gold: "padGold"
};

const RANKS = [
  { key: "rankGod", minScore: 2800, minRound: 13 },
  { key: "rankBeast", minScore: 1600, minRound: 9 },
  { key: "rankSharp", minScore: 650, minRound: 5 },
  { key: "rankRookie", minScore: 0, minRound: 0 }
];

const ACHIEVEMENTS = [
  {
    id: "firstSync",
    nameKey: "achievementFirstSyncName",
    descriptionKey: "achievementFirstSyncDesc",
    isUnlocked: () => state.round >= 1 && state.score > 0
  },
  {
    id: "round10",
    nameKey: "achievementRound10Name",
    descriptionKey: "achievementRound10Desc",
    isUnlocked: () => state.round >= 10
  },
  {
    id: "combo5",
    nameKey: "achievementCombo5Name",
    descriptionKey: "achievementCombo5Desc",
    isUnlocked: () => state.maxCombo >= 5
  },
  {
    id: "brutalSurvivor",
    nameKey: "achievementBrutalName",
    descriptionKey: "achievementBrutalDesc",
    isUnlocked: () => state.difficulty === "brutal" && state.round >= 8
  }
];

const state = {
  lang: "bg",
  player: null,
  difficulty: "normal",
  theme: "neon",
  soundEnabled: true,
  sequence: [],
  playerIndex: 0,
  score: 0,
  round: 0,
  combo: 1,
  maxCombo: 1,
  timeLeft: GAME_SECONDS,
  isShowing: false,
  isPlaying: false,
  isCountingDown: false,
  timerId: null,
  status: null,
  result: null,
  audioContext: null
};

const elements = {
  heroEyebrow: document.querySelector(".title-lockup .eyebrow"),
  intro: document.querySelector(".intro"),
  ruleChips: [...document.querySelectorAll(".rule-row span")],
  profilePanel: document.querySelector(".profile-panel"),
  sessionLabel: document.querySelector(".player-card .label"),
  playerName: document.querySelector("#player-name"),
  newUserButton: document.querySelector("#new-user-button"),
  languageToggle: document.querySelector("#language-toggle"),
  gameLayout: document.querySelector(".game-layout"),
  userForm: document.querySelector("#user-form"),
  formLabel: document.querySelector(".user-form label"),
  initialsInput: document.querySelector("#initials-input"),
  createButton: document.querySelector(".input-row button"),
  formHint: document.querySelector("#form-hint"),
  setupPanel: document.querySelector(".setup-panel"),
  difficultyLabel: document.querySelector("#difficulty-label"),
  difficultyButtons: [...document.querySelectorAll("[data-difficulty]")],
  themeLabel: document.querySelector("#theme-label"),
  themeButtons: [...document.querySelectorAll("[data-theme]")],
  soundToggle: document.querySelector("#sound-toggle"),
  statsGrid: document.querySelector(".stats-grid"),
  statScoreLabel: document.querySelector(".stat-score span"),
  statRoundLabel: document.querySelector(".stat-round span"),
  statComboLabel: document.querySelector(".stat-combo span"),
  statBestLabel: document.querySelector(".stat-best span"),
  statTimerLabel: document.querySelector(".stat-timer span"),
  startButton: document.querySelector("#start-button"),
  resetButton: document.querySelector("#reset-button"),
  sequenceMeterWrap: document.querySelector(".sequence-meter-wrap"),
  sequenceMeterLabel: document.querySelector(".sequence-meter-wrap > span"),
  score: document.querySelector("#score"),
  round: document.querySelector("#round"),
  combo: document.querySelector("#combo"),
  bestScore: document.querySelector("#best-score"),
  timer: document.querySelector("#timer"),
  statusText: document.querySelector("#status-text"),
  sequenceMeter: document.querySelector("#sequence-meter"),
  boardWrap: document.querySelector(".board-wrap"),
  boardStage: document.querySelector("#board-stage"),
  coreState: document.querySelector("#core-state"),
  coreRound: document.querySelector("#core-round"),
  countdown: document.querySelector("#countdown"),
  pads: [...document.querySelectorAll(".pad")],
  leaderboardTitle: document.querySelector("#leaderboard-title"),
  clearLeaderboardButton: document.querySelector("#clear-leaderboard-button"),
  leaderboardList: document.querySelector("#leaderboard-list"),
  achievementsTitle: document.querySelector("#achievements-title"),
  achievementsList: document.querySelector("#achievements-list"),
  resultModal: document.querySelector("#result-modal"),
  resultEyebrow: document.querySelector(".result-dialog .eyebrow"),
  resultTitle: document.querySelector("#result-title"),
  rankBadge: document.querySelector("#rank-badge"),
  resultMessage: document.querySelector("#result-message"),
  resultSummary: document.querySelector(".result-summary"),
  resultSummaryLabels: [...document.querySelectorAll(".result-summary span")],
  finalScore: document.querySelector("#final-score"),
  finalRound: document.querySelector("#final-round"),
  finalCombo: document.querySelector("#final-combo"),
  finalBest: document.querySelector("#final-best"),
  playAgainButton: document.querySelector("#play-again-button"),
  resultNewUserButton: document.querySelector("#result-new-user-button")
};

const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function t(key, values = {}) {
  const dictionary = TEXT[state.lang] || TEXT.bg;
  const template = dictionary[key] || TEXT.bg[key] || key;

  return template.replace(/\{(\w+)\}/g, (_, name) => {
    if (name === "title" && values.titleKey) return t(values.titleKey);
    if (name === "detail" && values.detailKey) return t(values.detailKey);
    if (name === "difficulty" && values.difficultyKey) return t(values.difficultyKey);
    if (name === "rank" && values.rankKey) return t(values.rankKey);
    return values[name] ?? "";
  });
}

function loadSettings() {
  state.lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "bg";
  state.difficulty = DIFFICULTIES[localStorage.getItem(DIFFICULTY_KEY)] ? localStorage.getItem(DIFFICULTY_KEY) : "normal";
  state.theme = ["neon", "red", "toxic", "ice"].includes(localStorage.getItem(THEME_KEY)) ? localStorage.getItem(THEME_KEY) : "neon";
  state.soundEnabled = localStorage.getItem(SOUND_KEY) !== "off";
}

function applyTranslations() {
  document.documentElement.lang = state.lang;
  document.title = t("documentTitle");
  elements.heroEyebrow.textContent = t("heroEyebrow");
  elements.intro.textContent = t("intro");
  elements.ruleChips[0].textContent = t("ruleTime");
  elements.ruleChips[1].textContent = t("ruleSignals");
  elements.ruleChips[2].textContent = t("ruleScore");
  elements.profilePanel.setAttribute("aria-label", t("profileAria"));
  elements.sessionLabel.textContent = t("sessionLabel");
  elements.newUserButton.textContent = t("newUser");
  elements.languageToggle.textContent = state.lang === "bg" ? "EN" : "BG";
  elements.languageToggle.setAttribute("aria-label", state.lang === "bg" ? t("switchToEnglish") : t("switchToBulgarian"));
  elements.gameLayout.setAttribute("aria-label", t("gameAreaAria"));
  elements.formLabel.textContent = t("formLabel");
  elements.initialsInput.placeholder = t("placeholder");
  elements.createButton.textContent = t("create");
  elements.formHint.textContent = t("hint");
  elements.setupPanel.setAttribute("aria-label", t("settingsAria"));
  elements.difficultyLabel.textContent = t("difficultyLabel");
  elements.themeLabel.textContent = t("themeLabel");
  elements.soundToggle.textContent = state.soundEnabled ? t("soundOn") : t("soundOff");
  elements.statsGrid.setAttribute("aria-label", t("statsAria"));
  elements.statScoreLabel.textContent = t("scoreLabel");
  elements.statRoundLabel.textContent = t("roundLabel");
  elements.statComboLabel.textContent = t("comboLabel");
  elements.statBestLabel.textContent = t("bestLabel");
  elements.statTimerLabel.textContent = t("timeLabel");
  elements.startButton.textContent = t("start");
  elements.resetButton.textContent = t("reset");
  elements.sequenceMeterWrap.setAttribute("aria-label", t("seriesAria"));
  elements.sequenceMeterLabel.textContent = t("seriesLabel");
  elements.boardWrap.setAttribute("aria-label", t("boardAria"));
  elements.leaderboardTitle.textContent = t("leaderboardTitle");
  elements.clearLeaderboardButton.textContent = t("clearLeaderboard");
  elements.achievementsTitle.textContent = t("achievementsTitle");
  elements.resultEyebrow.textContent = t("resultEyebrow");
  elements.resultTitle.textContent = state.result ? t(state.result.titleKey) : t("resultDefaultTitle");
  elements.resultSummary.setAttribute("aria-label", t("resultStatsAria"));
  elements.resultSummaryLabels[0].textContent = t("scoreLabel");
  elements.resultSummaryLabels[1].textContent = t("roundLabel");
  elements.resultSummaryLabels[2].textContent = t("comboLabel");
  elements.resultSummaryLabels[3].textContent = t("bestLabel");
  elements.playAgainButton.textContent = t("playAgain");
  elements.resultNewUserButton.textContent = t("newUser");

  elements.pads.forEach((pad) => {
    pad.setAttribute("aria-label", t(PAD_LABEL_KEYS[pad.dataset.color]));
  });

  updatePlayerUi();
  renderSettings();
  renderStatus();
  renderResult();
  renderLeaderboard();
  renderAchievements();
}

function toggleLanguage() {
  state.lang = state.lang === "bg" ? "en" : "bg";
  localStorage.setItem(LANG_KEY, state.lang);
  applyTranslations();
}

function loadPlayer() {
  try {
    const savedPlayer = localStorage.getItem(STORAGE_KEY);
    state.player = savedPlayer ? JSON.parse(savedPlayer) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    state.player = null;
  }

  updatePlayerUi();
}

function updatePlayerUi() {
  elements.playerName.textContent = state.player ? state.player.name : t("noProfile");
  elements.startButton.disabled = !state.player || state.isPlaying || state.isCountingDown;
}

function sanitizeName(name) {
  return name.trim().replace(/\s+/g, " ").slice(0, 12);
}

function createPlayer(name) {
  state.player = { name, createdAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.player));
  updatePlayerUi();
  resetGameState();
  setStatus("statusPlayerReady", "good", { name });
}

function setDifficulty(difficulty) {
  if (!DIFFICULTIES[difficulty] || state.isPlaying || state.isCountingDown) return;
  state.difficulty = difficulty;
  localStorage.setItem(DIFFICULTY_KEY, difficulty);
  renderSettings();
}

function setTheme(theme) {
  if (!["neon", "red", "toxic", "ice"].includes(theme)) return;
  state.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  document.body.className = `theme-${theme}`;
  renderSettings();
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem(SOUND_KEY, state.soundEnabled ? "on" : "off");
  elements.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
  elements.soundToggle.textContent = state.soundEnabled ? t("soundOn") : t("soundOff");
  if (state.soundEnabled) playTone("ok", 0.08);
}

function renderSettings() {
  elements.difficultyButtons.forEach((button) => {
    const isActive = button.dataset.difficulty === state.difficulty;
    button.classList.toggle("active", isActive);
    button.disabled = state.isPlaying || state.isCountingDown;
  });

  elements.themeButtons.forEach((button) => {
    const isActive = button.dataset.theme === state.theme;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-label", t(`theme${capitalize(button.dataset.theme)}`));
  });

  document.body.className = `theme-${state.theme}`;
  elements.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
  elements.soundToggle.textContent = state.soundEnabled ? t("soundOn") : t("soundOff");
}

function resetGameState() {
  stopTimer();
  state.sequence = [];
  state.playerIndex = 0;
  state.score = 0;
  state.round = 0;
  state.combo = 1;
  state.maxCombo = 1;
  state.timeLeft = GAME_SECONDS;
  state.isShowing = false;
  state.isPlaying = false;
  state.isCountingDown = false;
  hideResult();
  hideCountdown();
  updateStats();
  renderSettings();
  renderSequenceMeter();
  setCoreState("READY");
  setCurrentSignal("sky");
  setPadsLocked(true);
  updatePlayerUi();
}

async function startGame() {
  if (!state.player || state.isPlaying || state.isCountingDown) return;

  resetGameState();
  state.isCountingDown = true;
  updatePlayerUi();
  renderSettings();
  setStatus("statusCountdown", "");
  setCoreState("SYNC");
  await runCountdown();

  if (!state.isCountingDown) return;

  state.isCountingDown = false;
  state.isPlaying = true;
  updatePlayerUi();
  renderSettings();
  setStatus("statusWatchStart", "");
  startTimer();
  nextRound();
}

async function runCountdown() {
  for (const value of ["3", "2", "1", t("countdownGo")]) {
    if (!state.isCountingDown) {
      hideCountdown();
      return;
    }

    elements.countdown.textContent = value;
    elements.countdown.hidden = false;
    playTone("tick", 0.08);
    await sleep(value === t("countdownGo") ? 360 : 520);
  }
  hideCountdown();
}

function hideCountdown() {
  elements.countdown.hidden = true;
}

function startTimer() {
  stopTimer();
  elements.timer.textContent = state.timeLeft;

  state.timerId = window.setInterval(() => {
    state.timeLeft -= 1;
    updateStats();

    if (state.timeLeft <= 0) {
      endGame("timeTitle", "timeDetail");
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function nextRound() {
  if (!state.isPlaying) return;

  state.round += 1;
  state.playerIndex = 0;
  state.sequence.push(randomColor());
  updateStats();
  renderSequenceMeter();
  showSequence();
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

async function showSequence() {
  state.isShowing = true;
  setPadsLocked(true);
  setCoreState("WATCH");
  setStatus("statusRoundWatch", "", { round: state.round });

  await sleep(360);
  if (!state.isPlaying) return;

  for (const color of state.sequence) {
    activatePad(color, true);
    await sleep(getFlashDuration());
    if (!state.isPlaying) {
      deactivatePads();
      return;
    }
    deactivatePads();
    await sleep(getFlashGap());
    if (!state.isPlaying) return;
  }

  state.isShowing = false;
  setPadsLocked(false);
  setCoreState("PLAY");
  renderSequenceMeter();
  setStatus("statusYourTurn", "");
}

function currentDifficulty() {
  return DIFFICULTIES[state.difficulty] || DIFFICULTIES.normal;
}

function getFlashDuration() {
  const config = currentDifficulty();
  return Math.max(config.flashMin, config.flashStart - (state.round - 1) * config.flashStep);
}

function getFlashGap() {
  const config = currentDifficulty();
  return Math.max(config.gapMin, config.gapStart - (state.round - 1) * config.gapStep);
}

function getTapFlashDuration() {
  return Math.max(70, 145 - state.round * 5);
}

function activatePad(color, fromSystem = false) {
  const pad = elements.pads.find((currentPad) => currentPad.dataset.color === color);
  if (!pad) return;

  setCurrentSignal(color);
  pad.classList.add("active");
  playTone(color, fromSystem ? 0.18 : 0.1);
}

function deactivatePads() {
  elements.pads.forEach((pad) => pad.classList.remove("active", "expected", "wrong"));
}

function setPadsLocked(isLocked) {
  elements.pads.forEach((pad) => pad.classList.toggle("locked", isLocked));
}

function handlePadClick(event) {
  handlePlayerInput(event.currentTarget.dataset.color);
}

function handlePlayerInput(color) {
  if (!state.isPlaying || state.isShowing || !color) return;

  activatePad(color);
  window.setTimeout(deactivatePads, getTapFlashDuration());

  const expectedColor = state.sequence[state.playerIndex];
  if (color !== expectedColor) {
    revealMistake(expectedColor, color);
    return;
  }

  state.playerIndex += 1;
  renderSequenceMeter();

  if (state.playerIndex === state.sequence.length) {
    const earnedCombo = state.combo;
    const roundPoints = calculateRoundPoints();
    state.score += roundPoints;
    state.combo = Math.min(5, state.combo + 1);
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    updateStats();
    showScorePopup(roundPoints, earnedCombo);
    checkAchievements();
    pulseBoard("good");
    playTone("ok", 0.12);
    setCoreState("OK");
    setStatus("statusCorrect", "good", { points: roundPoints, combo: `x${state.combo}` });
    setPadsLocked(true);
    window.setTimeout(nextRound, currentDifficulty().nextDelay);
  }
}

function calculateRoundPoints() {
  const speedBonus = Math.max(0, state.timeLeft);
  const base = 100 + state.round * 25 + Math.floor(speedBonus / 5);
  return Math.round(base * state.combo * currentDifficulty().score);
}

async function revealMistake(expectedColor, actualColor) {
  if (!state.isPlaying) return;

  state.isShowing = true;
  setPadsLocked(true);
  setCoreState("ERR");
  setStatus("statusMistakeReveal", "bad");

  await sleep(120);
  deactivatePads();

  const wrongPad = elements.pads.find((pad) => pad.dataset.color === actualColor);
  const expectedPad = elements.pads.find((pad) => pad.dataset.color === expectedColor);

  if (wrongPad) wrongPad.classList.add("wrong");
  playTone("bad", 0.16);

  await sleep(220);

  if (expectedPad) {
    expectedPad.classList.add("expected");
    setCurrentSignal(expectedColor);
    playTone(expectedColor, 0.28);
  }

  await sleep(820);
  endGame("wrongTitle", "wrongDetail");
}

function endGame(titleKey, detailKey) {
  stopTimer();
  state.isPlaying = false;
  state.isShowing = false;
  state.isCountingDown = false;
  setCoreState("FAIL");
  pulseBoard("bad");
  playTone("bad", 0.22);
  setPadsLocked(true);
  deactivatePads();
  const rank = getRank();
  saveBestScore();
  saveLeaderboard(rank);
  updateStats();
  renderLeaderboard();
  renderSettings();
  updatePlayerUi();
  setStatus("statusEnd", "bad", { titleKey, score: state.score });
  showResult(titleKey, detailKey, rank);
}

function saveBestScore() {
  if (state.score > getBestScore()) {
    localStorage.setItem(BEST_KEY, String(state.score));
  }
}

function getBestScore() {
  return Number(localStorage.getItem(BEST_KEY) || 0);
}

function getLeaderboard() {
  try {
    const scores = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    return Array.isArray(scores) ? scores : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(rank) {
  if (!state.player || state.score <= 0) return;

  const entry = {
    name: state.player.name,
    score: state.score,
    round: state.round,
    combo: state.maxCombo,
    difficulty: state.difficulty,
    rankKey: rank.key,
    createdAt: new Date().toISOString()
  };

  const scores = [...getLeaderboard(), entry]
    .sort((a, b) => b.score - a.score || b.round - a.round)
    .slice(0, 5);

  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(scores));
}

function clearLeaderboard() {
  localStorage.removeItem(LEADERBOARD_KEY);
  renderLeaderboard();
  setStatus("statusLeaderboardCleared", "good");
}

function renderLeaderboard() {
  elements.leaderboardList.replaceChildren();
  const scores = getLeaderboard();

  if (!scores.length) {
    const empty = document.createElement("li");
    empty.className = "leaderboard-empty";
    empty.textContent = t("leaderboardEmpty");
    elements.leaderboardList.append(empty);
    return;
  }

  scores.forEach((entry) => {
    const item = document.createElement("li");
    const details = document.createElement("span");
    const value = document.createElement("strong");
    details.textContent = `${entry.name} · ${t(`difficulty${capitalize(entry.difficulty)}`)} · ${t(entry.rankKey)}`;
    value.textContent = `${entry.score}`;
    item.append(details, value);
    elements.leaderboardList.append(item);
  });
}

function getAchievements() {
  try {
    const achievements = JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || "{}");
    return achievements && typeof achievements === "object" && !Array.isArray(achievements) ? achievements : {};
  } catch {
    return {};
  }
}

function saveAchievements(achievements) {
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
}

function renderAchievements() {
  elements.achievementsList.replaceChildren();
  const unlocked = getAchievements();

  ACHIEVEMENTS.forEach((achievement) => {
    const isUnlocked = Boolean(unlocked[achievement.id]);
    const card = document.createElement("div");
    const name = document.createElement("strong");
    const description = document.createElement("span");

    card.className = `achievement-card${isUnlocked ? " unlocked" : ""}`;
    name.textContent = t(achievement.nameKey);
    description.textContent = `${isUnlocked ? t("achievementUnlocked") : t("achievementLocked")} · ${t(achievement.descriptionKey)}`;

    card.append(name, description);
    elements.achievementsList.append(card);
  });
}

function checkAchievements() {
  const unlocked = getAchievements();
  let changed = false;

  ACHIEVEMENTS.forEach((achievement) => {
    if (!unlocked[achievement.id] && achievement.isUnlocked()) {
      unlocked[achievement.id] = new Date().toISOString();
      changed = true;
      showAchievementToast(achievement);
    }
  });

  if (changed) {
    saveAchievements(unlocked);
    renderAchievements();
  }
}

function showAchievementToast(achievement) {
  const toast = document.createElement("div");
  const label = document.createElement("span");
  const name = document.createElement("strong");

  toast.className = "achievement-toast";
  label.textContent = t("achievementToastTitle");
  name.textContent = t(achievement.nameKey);

  toast.append(label, name);
  document.body.append(toast);
  playTone("ok", 0.14);

  window.setTimeout(() => toast.remove(), 3200);
}

function showScorePopup(points, combo) {
  const popup = document.createElement("div");
  popup.className = "score-pop";
  popup.textContent = `+${points} x${combo}`;
  elements.boardStage.append(popup);

  popup.addEventListener("animationend", () => popup.remove(), { once: true });
}

function getRank() {
  return RANKS.find((rank) => state.score >= rank.minScore || state.round >= rank.minRound) || RANKS[RANKS.length - 1];
}

function updateStats() {
  elements.score.textContent = state.score;
  elements.round.textContent = state.round;
  elements.combo.textContent = `x${state.combo}`;
  elements.bestScore.textContent = Math.max(getBestScore(), state.score);
  elements.timer.textContent = state.timeLeft;
  elements.coreRound.textContent = String(state.round).padStart(2, "0");
  document.documentElement.style.setProperty("--time-progress", `${Math.max(0, state.timeLeft / GAME_SECONDS * 100)}%`);
}

function renderSequenceMeter() {
  elements.sequenceMeter.replaceChildren();
  const visibleDots = state.sequence.length || 4;
  const cappedDots = Math.min(visibleDots, 20);

  for (let index = 0; index < cappedDots; index += 1) {
    const dot = document.createElement("span");
    dot.className = "meter-dot";

    if (!state.sequence.length) {
      dot.classList.add("idle");
    } else if (index < state.playerIndex) {
      dot.classList.add("done");
    } else if (!state.isShowing && state.isPlaying && index === state.playerIndex) {
      dot.classList.add("current");
    }

    elements.sequenceMeter.append(dot);
  }
}

function setCoreState(label) {
  elements.coreState.textContent = label;
}

function setCurrentSignal(color) {
  document.documentElement.style.setProperty("--current-signal", COLOR_GLOWS[color] || COLOR_GLOWS.sky);
}

function pulseBoard(type) {
  const className = type === "bad" ? "pulse-bad" : "pulse-good";
  elements.boardStage.classList.remove("pulse-good", "pulse-bad");
  void elements.boardStage.offsetWidth;
  elements.boardStage.classList.add(className);

  window.setTimeout(() => {
    elements.boardStage.classList.remove(className);
  }, 560);
}

function setStatus(key, type, values = {}) {
  state.status = { key, type, values };
  renderStatus();
}

function renderStatus() {
  if (!state.status) return;

  elements.statusText.textContent = t(state.status.key, state.status.values);
  elements.statusText.classList.remove("good", "bad");

  if (state.status.type) {
    elements.statusText.classList.add(state.status.type);
  }
}

function showResult(titleKey, detailKey, rank = getRank()) {
  state.result = { titleKey, detailKey, rankKey: rank.key };
  renderResult();
  elements.resultModal.hidden = false;
}

function renderResult() {
  if (!state.result) return;

  const playerName = state.player ? state.player.name : t("playerFallback");
  elements.resultTitle.textContent = t(state.result.titleKey);
  elements.rankBadge.textContent = t(state.result.rankKey);
  elements.resultMessage.textContent = t("resultMessage", {
    playerName,
    score: state.score,
    round: state.round,
    difficultyKey: `difficulty${capitalize(state.difficulty)}`,
    rankKey: state.result.rankKey,
    detailKey: state.result.detailKey
  });
  elements.finalScore.textContent = state.score;
  elements.finalRound.textContent = state.round;
  elements.finalCombo.textContent = `x${state.maxCombo}`;
  elements.finalBest.textContent = Math.max(getBestScore(), state.score);
}

function hideResult() {
  state.result = null;
  elements.resultModal.hidden = true;
}

function handleUserSubmit(event) {
  event.preventDefault();
  const name = sanitizeName(elements.initialsInput.value);

  if (!name) {
    setStatus("statusEmptyName", "bad");
    elements.initialsInput.focus();
    return;
  }

  createPlayer(name);
  elements.initialsInput.value = "";
}

function startNewUserFlow() {
  localStorage.removeItem(STORAGE_KEY);
  resetGameState();
  state.player = null;
  updatePlayerUi();
  setStatus("statusNewPlayer", "");
  elements.initialsInput.focus();
}

function ensureAudioContext() {
  if (!state.soundEnabled) return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }

  if (state.audioContext.state === "suspended") {
    state.audioContext.resume();
  }

  return state.audioContext;
}

function playTone(soundKey, duration = 0.12) {
  if (!state.soundEnabled) return;
  const audio = ensureAudioContext();
  if (!audio) return;

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;

  oscillator.type = soundKey === "bad" ? "sawtooth" : "triangle";
  oscillator.frequency.setValueAtTime(SOUND_FREQS[soundKey] || SOUND_FREQS.sky, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(soundKey === "bad" ? 0.14 : 0.09, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function handleKeydown(event) {
  const target = event.target;
  const isTyping = target && ["INPUT", "TEXTAREA"].includes(target.tagName);
  if (isTyping) return;

  const color = KEY_TO_COLOR[event.key.toLowerCase()];
  if (!color) return;

  event.preventDefault();
  handlePlayerInput(color);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

elements.userForm.addEventListener("submit", handleUserSubmit);
elements.newUserButton.addEventListener("click", startNewUserFlow);
elements.resultNewUserButton.addEventListener("click", startNewUserFlow);
elements.languageToggle.addEventListener("click", toggleLanguage);
elements.soundToggle.addEventListener("click", toggleSound);
elements.clearLeaderboardButton.addEventListener("click", clearLeaderboard);
elements.startButton.addEventListener("click", startGame);
elements.resetButton.addEventListener("click", () => {
  resetGameState();
  setStatus(state.player ? "statusResetWithPlayer" : "statusResetNoPlayer", "");
});
elements.playAgainButton.addEventListener("click", () => {
  hideResult();
  resetGameState();
  setStatus("statusPlayAgain", "");
});
elements.difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => setDifficulty(button.dataset.difficulty));
});
elements.themeButtons.forEach((button) => {
  button.addEventListener("click", () => setTheme(button.dataset.theme));
});
elements.pads.forEach((pad) => pad.addEventListener("click", handlePadClick));
document.addEventListener("keydown", handleKeydown);

loadSettings();
applyTranslations();
loadPlayer();
resetGameState();
renderLeaderboard();
setStatus(state.player ? "statusProfileLoaded" : "statusCreateProfile", "");
