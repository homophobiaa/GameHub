// 🎯 Aim Trainer — GameHub module
// A reaction/aim mini-game played in fixed 30-second rounds. Targets pop up at
// random positions; the player clicks them as fast and accurately as possible.
// Points reward speed, accuracy and hit streaks (combo).

// ---- Tuning ----
const ROUND_MS = 30000;            // a round lasts 30 seconds
const ACTIVE_TARGETS = 3;          // how many targets are on screen at once
const TARGET_MAX_PX = 64;          // size at the start of the round
const TARGET_MIN_PX = 34;          // size at the end of the round (harder)
const LIFESPAN_MAX_MS = 2250;      // how long a target lingers early on
const LIFESPAN_MIN_MS = 1275;      // shorter near the end (harder)
const BASE_POINTS = 10;            // points for any hit
const SPEED_BONUS_CAP = 15;        // extra points for a fast hit
const COMBO_STEP = 0.1;            // each combo level adds 10% ...
const COMBO_CAP = 10;              // ... up to +100% (×2) at combo 10

// Storage keys — namespaced so we don't clash with other games
const STORAGE_PREFIX = 'gamehub:aim-trainer';
const LB_KEY     = `${STORAGE_PREFIX}:leaderboard`;
const PLAYER_KEY = 'gamehub:player'; // shared player profile from the hub

// ---- DOM ----
const els = {
  player:   document.getElementById('playerName'),
  time:     document.getElementById('time'),
  score:    document.getElementById('score'),
  best:     document.getElementById('best'),
  combo:    document.getElementById('combo'),
  accuracy: document.getElementById('accuracy'),
  hits:     document.getElementById('hits'),
  status:   document.getElementById('status'),
  playArea: document.getElementById('playArea'),
  overlay:  document.getElementById('overlay'),
  startBtn: document.getElementById('startBtn'),
  resetBtn: document.getElementById('resetBtn'),
  lbList:   document.getElementById('leaderboardList'),
};

// ---- State ----
const state = {
  playing: false,
  score: 0,
  hits: 0,
  misses: 0,        // missed clicks + expired targets
  combo: 0,
  bestCombo: 0,
  roundEndsAt: 0,
  tickTimer: null,
  spawnTimers: new Set(), // pending expiry timeouts for live targets
};

// ---- Player profile ----
function getPlayer() {
  // Prefer the shared GameHub profile; fall back to our own stored value.
  try {
    const shared = localStorage.getItem(PLAYER_KEY);
    if (shared) {
      const p = JSON.parse(shared);
      return p.initials || p.name || 'Гост';
    }
  } catch (_) { /* ignore malformed shared profile */ }
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

function submitScore(name, score, accuracy) {
  const list = loadLeaderboard();
  list.push({ name, score, accuracy, at: Date.now() });
  list.sort((a, b) => b.score - a.score || b.accuracy - a.accuracy);
  const top = list.slice(0, 10);
  saveLeaderboard(top);
  return top;
}

function getBestScore() {
  const list = loadLeaderboard();
  return list.length ? list[0].score : 0;
}

function renderLeaderboard(highlightName = null) {
  const list = loadLeaderboard();
  if (list.length === 0) {
    els.lbList.innerHTML = '<li class="leaderboard__empty">Все още няма резултати — бъди първи!</li>';
    return;
  }
  els.lbList.innerHTML = list.map((entry, i) => {
    const isMe = highlightName && entry.name === highlightName && i === 0;
    const acc = Number.isFinite(entry.accuracy) ? `${Math.round(entry.accuracy * 100)}%` : '—';
    return `<li class="${isMe ? 'is-me' : ''}">
      <span>${escapeHtml(entry.name)}</span>
      <span>${entry.score} т. · ${acc}</span>
    </li>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// ---- UI helpers ----
function setStatus(text) { els.status.textContent = text; }

function accuracyValue() {
  const shots = state.hits + state.misses;
  return shots === 0 ? null : state.hits / shots;
}

function setHud() {
  els.player.textContent = getPlayer();
  els.score.textContent = state.score;
  els.best.textContent  = getBestScore();
  els.hits.textContent  = state.hits;
  els.combo.textContent = `×${comboMultiplier().toFixed(1)}`;
  els.combo.classList.toggle('combo-hot', state.combo >= 3);

  const acc = accuracyValue();
  els.accuracy.textContent = acc === null ? '—' : `${Math.round(acc * 100)}%`;
}

function setTimeDisplay(msLeft) {
  const secs = Math.max(0, msLeft / 1000);
  els.time.textContent = secs.toFixed(1);
  els.time.classList.toggle('low-time', secs <= 5);
}

function comboMultiplier() {
  return 1 + Math.min(state.combo, COMBO_CAP) * COMBO_STEP;
}

// Progress through the round: 0 at the start, 1 at the end. Drives difficulty.
function roundProgress() {
  const elapsed = ROUND_MS - (state.roundEndsAt - performance.now());
  return Math.min(1, Math.max(0, elapsed / ROUND_MS));
}

function lerp(a, b, t) { return a + (b - a) * t; }

// ---- Targets ----
function spawnTarget() {
  if (!state.playing) return;

  const progress = roundProgress();
  const size = Math.round(lerp(TARGET_MAX_PX, TARGET_MIN_PX, progress));
  const lifespan = Math.round(lerp(LIFESPAN_MAX_MS, LIFESPAN_MIN_MS, progress));

  const rect = els.playArea.getBoundingClientRect();
  const margin = size / 2 + 4;
  const x = lerp(margin, rect.width - margin, Math.random());
  const y = lerp(margin, rect.height - margin, Math.random());

  const target = document.createElement('button');
  target.className = 'target';
  target.type = 'button';
  target.setAttribute('aria-label', 'Мишена');
  target.style.width = `${size}px`;
  target.style.height = `${size}px`;
  target.style.left = `${x}px`;
  target.style.top = `${y}px`;

  const bornAt = performance.now();

  const expiry = setTimeout(() => {
    if (!target.isConnected) return;
    state.spawnTimers.delete(expiry);
    target.remove();
    registerMiss();          // a target the player let slip away
    spawnTarget();           // keep the field populated
  }, lifespan);
  state.spawnTimers.add(expiry);

  target.addEventListener('pointerdown', (e) => {
    e.stopPropagation();     // don't let the play-area "miss" handler fire
    if (!state.playing) return;
    clearTimeout(expiry);
    state.spawnTimers.delete(expiry);
    registerHit(target, bornAt, lifespan, x, y);
    spawnTarget();           // replace the popped target
  });

  els.playArea.appendChild(target);
  // next frame → trigger the grow-in transition
  requestAnimationFrame(() => target.classList.add('is-in'));
}

function registerHit(target, bornAt, lifespan, x, y) {
  const reaction = performance.now() - bornAt;
  const speedBonus = Math.max(0, Math.round(SPEED_BONUS_CAP * (1 - reaction / lifespan)));
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const gained = Math.round((BASE_POINTS + speedBonus) * comboMultiplier());
  state.score += gained;
  state.hits += 1;

  target.classList.remove('is-in');
  target.classList.add('is-hit');
  setTimeout(() => target.remove(), 200);
  showPopup(`+${gained}`, x, y);
  setHud();
}

function registerMiss() {
  state.misses += 1;
  state.combo = 0;
  setHud();
}

function showPopup(text, x, y) {
  const popup = document.createElement('span');
  popup.className = 'popup';
  popup.textContent = text;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  els.playArea.appendChild(popup);
  setTimeout(() => popup.remove(), 700);
}

function clearTargets() {
  state.spawnTimers.forEach(clearTimeout);
  state.spawnTimers.clear();
  els.playArea.querySelectorAll('.target, .popup').forEach(el => el.remove());
}

// Clicking empty space inside the field counts as a miss.
els.playArea.addEventListener('pointerdown', () => {
  if (state.playing) registerMiss();
});

// ---- Round flow ----
function showOverlay(html) {
  els.overlay.innerHTML = html;
  els.overlay.classList.remove('is-hidden');
}
function hideOverlay() { els.overlay.classList.add('is-hidden'); }

function tick() {
  const msLeft = state.roundEndsAt - performance.now();
  setTimeDisplay(msLeft);
  if (msLeft <= 0) {
    endRound();
    return;
  }
  state.tickTimer = requestAnimationFrame(tick);
}

function startGame() {
  // Ask for initials once per browser if the hub didn't provide a profile.
  if (getPlayer() === 'Гост') {
    const input = prompt('Въведи инициали или прякор:', '');
    if (input && input.trim()) setLocalPlayer(input.trim().slice(0, 16));
  }

  clearTargets();
  hideOverlay();
  state.playing = true;
  state.score = 0;
  state.hits = 0;
  state.misses = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.roundEndsAt = performance.now() + ROUND_MS;

  els.playArea.classList.add('is-playing');
  els.startBtn.disabled = true;
  els.resetBtn.disabled = false;
  setStatus('Стреляй! Уцели колкото може повече мишени.');
  setHud();
  setTimeDisplay(ROUND_MS);

  for (let i = 0; i < ACTIVE_TARGETS; i++) spawnTarget();
  state.tickTimer = requestAnimationFrame(tick);
}

function endRound() {
  state.playing = false;
  cancelAnimationFrame(state.tickTimer);
  clearTargets();
  els.playArea.classList.remove('is-playing');
  setTimeDisplay(0);

  // Accuracy bonus: rewards precision (up to +100 for a flawless round).
  const acc = accuracyValue() ?? 0;
  const accuracyBonus = Math.round(acc * 100);
  state.score += accuracyBonus;
  setHud();

  const name = getPlayer();
  submitScore(name, state.score, acc);
  renderLeaderboard(name);
  setHud();

  showOverlay(
    `<span class="overlay__icon">🏁</span>
     <span class="overlay__text">
       Край на рунда!<br>
       <strong>${state.score} точки</strong><br>
       Уцелени: ${state.hits} · Точност: ${Math.round(acc * 100)}%<br>
       Най-добро комбо: ×${(1 + Math.min(state.bestCombo, COMBO_CAP) * COMBO_STEP).toFixed(1)}
       · Бонус точност: +${accuracyBonus}
     </span>`
  );
  setStatus('Рундът приключи — резултатът е записан в класацията.');
  els.startBtn.disabled = false;
  els.startBtn.textContent = '▶ Нов рунд';
  els.resetBtn.disabled = false;
}

function resetGame() {
  state.playing = false;
  cancelAnimationFrame(state.tickTimer);
  clearTargets();
  state.score = 0;
  state.hits = 0;
  state.misses = 0;
  state.combo = 0;
  state.bestCombo = 0;
  els.playArea.classList.remove('is-playing');
  setHud();
  setTimeDisplay(ROUND_MS);
  showOverlay(
    `<span class="overlay__icon">🎯</span>
     <span class="overlay__text">Готов ли си?</span>`
  );
  setStatus('Натисни „Старт“, за да започнеш 30-секунден рунд');
  els.startBtn.disabled = false;
  els.startBtn.textContent = '▶ Старт';
  els.resetBtn.disabled = true;
}

// ---- Wire up events ----
els.startBtn.addEventListener('click', startGame);
els.resetBtn.addEventListener('click', resetGame);

window.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && !state.playing) {
    e.preventDefault();
    startGame();
  }
});

// ---- Init ----
setHud();
setTimeDisplay(ROUND_MS);
renderLeaderboard();

// Expose a tiny module API for the GameHub launcher, if it wants to embed us.
export const AimTrainerGame = {
  start: startGame,
  reset: resetGame,
  getLeaderboard: loadLeaderboard,
};
