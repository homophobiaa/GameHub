// 🧭 Direction Memory Game — GameHub module
// Inspired by "Simon Says" but with directional arrows.
// Player must repeat an ever-growing sequence of directions.

const DIRECTIONS = ['up', 'down', 'left', 'right'];
const SYMBOL = { up: '↑', down: '↓', left: '←', right: '→' };

// Tuning
const SHOW_MS = 600;       // how long each arrow is shown
const GAP_MS  = 220;       // gap between arrows in the sequence
const INPUT_TIMEOUT_MS = 6000; // per-arrow input window
const BASE_POINTS_PER_ROUND = 10;
const SPEED_BONUS_CAP = 5;     // up to +5 pts per arrow for being fast

// Storage keys — namespaced so we don't clash with other games
const STORAGE_PREFIX = 'gamehub:direction-memory';
const LB_KEY     = `${STORAGE_PREFIX}:leaderboard`;
const PLAYER_KEY = 'gamehub:player'; // shared player profile from the hub

// ---- DOM ----
const els = {
  player: document.getElementById('playerName'),
  round:  document.getElementById('round'),
  score:  document.getElementById('score'),
  best:   document.getElementById('best'),
  status: document.getElementById('status'),
  seq:    document.getElementById('sequenceDisplay'),
  startBtn: document.getElementById('startBtn'),
  resetBtn: document.getElementById('resetBtn'),
  pad:    document.querySelector('.pad'),
  arrows: Array.from(document.querySelectorAll('.arrow')),
  lbList: document.getElementById('leaderboardList'),
};

// ---- State ----
const state = {
  sequence: [],
  inputIndex: 0,
  round: 0,
  score: 0,
  playing: false,
  acceptInput: false,
  lastShownAt: 0,
  inputTimer: null,
};

// ---- Player profile ----
function getPlayer() {
  // Try shared GameHub profile first; fall back to local prompt-once value.
  try {
    const shared = localStorage.getItem(PLAYER_KEY);
    if (shared) return JSON.parse(shared).initials || JSON.parse(shared).name || 'Гост';
  } catch (_) { /* ignore */ }
  return localStorage.getItem(`${STORAGE_PREFIX}:player`) || 'Гост';
}

function setLocalPlayer(name) {
  localStorage.setItem(`${STORAGE_PREFIX}:player`, name);
}

// ---- Leaderboard ----
function loadLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(LB_KEY)) || [];
  } catch (_) {
    return [];
  }
}

function saveLeaderboard(list) {
  localStorage.setItem(LB_KEY, JSON.stringify(list));
}

function submitScore(name, score, round) {
  const list = loadLeaderboard();
  list.push({ name, score, round, at: Date.now() });
  list.sort((a, b) => b.score - a.score || b.round - a.round);
  const top = list.slice(0, 10);
  saveLeaderboard(top);
  return top;
}

function renderLeaderboard(highlightName = null) {
  const list = loadLeaderboard();
  if (list.length === 0) {
    els.lbList.innerHTML = '<li class="leaderboard__empty">Все още няма резултати — бъди първи!</li>';
    return;
  }
  els.lbList.innerHTML = list.map((entry, i) => {
    const isMe = highlightName && entry.name === highlightName && i === 0;
    return `<li class="${isMe ? 'is-me' : ''}">
      <span>${escapeHtml(entry.name)}</span>
      <span>${entry.score} т. · Р${entry.round}</span>
    </li>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function getBestScore() {
  const list = loadLeaderboard();
  return list.length ? list[0].score : 0;
}

// ---- UI helpers ----
function setStatus(text) { els.status.textContent = text; }
function setHud() {
  els.round.textContent = state.round;
  els.score.textContent = state.score;
  els.best.textContent  = getBestScore();
  els.player.textContent = getPlayer();
}

function flashArrow(dir, cls = 'active', ms = SHOW_MS) {
  const btn = els.arrows.find(b => b.dataset.dir === dir);
  if (!btn) return;
  btn.classList.add(cls);
  setTimeout(() => btn.classList.remove(cls), ms);
}

function showSequenceSymbol(dir) {
  els.seq.textContent = SYMBOL[dir];
  els.seq.classList.add('flash');
  setTimeout(() => els.seq.classList.remove('flash'), 120);
}

function clearSequenceSymbol() {
  els.seq.textContent = '·';
  els.seq.classList.add('dim');
  setTimeout(() => els.seq.classList.remove('dim'), 200);
}

function setPadEnabled(enabled) {
  els.arrows.forEach(b => { b.disabled = !enabled; });
}

// ---- Game flow ----
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function playSequence() {
  setPadEnabled(false);
  state.acceptInput = false;
  setStatus('Гледай внимателно…');
  await sleep(400);

  // Speed up slightly as the sequence grows
  const speedFactor = Math.max(0.45, 1 - state.round * 0.03);
  const showMs = Math.round(SHOW_MS * speedFactor);
  const gapMs  = Math.round(GAP_MS  * speedFactor);

  for (const dir of state.sequence) {
    showSequenceSymbol(dir);
    flashArrow(dir, 'active', showMs);
    await sleep(showMs);
    clearSequenceSymbol();
    await sleep(gapMs);
  }

  setStatus('Твой ред — повтори поредицата!');
  state.inputIndex = 0;
  state.acceptInput = true;
  state.lastShownAt = performance.now();
  setPadEnabled(true);
  armInputTimeout();
}

function armInputTimeout() {
  clearTimeout(state.inputTimer);
  state.inputTimer = setTimeout(() => {
    if (state.acceptInput) gameOver('⏱ Времето изтече!');
  }, INPUT_TIMEOUT_MS);
}

function handleInput(dir) {
  if (!state.playing || !state.acceptInput) return;

  const expected = state.sequence[state.inputIndex];
  if (dir !== expected) {
    flashArrow(dir, 'wrong', 400);
    return gameOver(`❌ Грешка! Очакваше се ${SYMBOL[expected]}`);
  }

  // Correct input
  flashArrow(dir, 'correct', 250);
  // Speed bonus: faster reaction → more points (up to SPEED_BONUS_CAP per arrow)
  const dt = performance.now() - state.lastShownAt;
  const speedBonus = Math.max(0, Math.round(SPEED_BONUS_CAP * (1 - dt / 1500)));
  state.score += 1 + speedBonus;
  state.lastShownAt = performance.now();
  state.inputIndex += 1;
  setHud();

  if (state.inputIndex === state.sequence.length) {
    // Round cleared
    state.acceptInput = false;
    clearTimeout(state.inputTimer);
    state.score += BASE_POINTS_PER_ROUND;
    setHud();
    nextRound();
  } else {
    armInputTimeout();
  }
}

async function nextRound() {
  state.round += 1;
  setHud();
  setStatus(`Рунд ${state.round} — следваща стрелка…`);
  state.sequence.push(DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]);
  await sleep(600);
  playSequence();
}

function gameOver(message) {
  state.playing = false;
  state.acceptInput = false;
  clearTimeout(state.inputTimer);
  setPadEnabled(false);
  setStatus(`${message} Краен резултат: ${state.score} точки на рунд ${state.round}.`);
  els.startBtn.disabled = false;
  els.startBtn.textContent = '▶ Опитай отново';
  els.resetBtn.disabled = false;

  const name = getPlayer();
  if (state.round > 0) {
    submitScore(name, state.score, state.round);
    renderLeaderboard(name);
    setHud();
  }
}

function startGame() {
  // Ask for player name if not set (one-time per browser)
  if (getPlayer() === 'Гост') {
    const input = prompt('Въведи инициали или прякор:', '');
    if (input && input.trim()) setLocalPlayer(input.trim().slice(0, 16));
  }

  state.sequence = [];
  state.inputIndex = 0;
  state.round = 0;
  state.score = 0;
  state.playing = true;
  state.acceptInput = false;
  setHud();
  els.startBtn.disabled = true;
  els.startBtn.textContent = '▶ Старт';
  els.resetBtn.disabled = false;
  setStatus('Подготовка…');
  nextRound();
}

function resetGame() {
  clearTimeout(state.inputTimer);
  state.playing = false;
  state.acceptInput = false;
  state.sequence = [];
  state.inputIndex = 0;
  state.round = 0;
  state.score = 0;
  setHud();
  setPadEnabled(false);
  els.seq.textContent = '·';
  setStatus('Натисни „Старт“, за да започнеш');
  els.startBtn.disabled = false;
  els.startBtn.textContent = '▶ Старт';
  els.resetBtn.disabled = true;
}

// ---- Wire up events ----
els.startBtn.addEventListener('click', startGame);
els.resetBtn.addEventListener('click', resetGame);

els.pad.addEventListener('click', (e) => {
  const btn = e.target.closest('.arrow');
  if (!btn) return;
  handleInput(btn.dataset.dir);
});

window.addEventListener('keydown', (e) => {
  const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  const dir = map[e.key];
  if (dir) {
    e.preventDefault();
    handleInput(dir);
  } else if (e.key === 'Enter' && !state.playing) {
    startGame();
  }
});

// ---- Init ----
setPadEnabled(false);
setHud();
renderLeaderboard();

// Expose a tiny module API for the GameHub launcher, if it wants to embed us.
export const DirectionMemoryGame = {
  start: startGame,
  reset: resetGame,
  getLeaderboard: loadLeaderboard,
};
