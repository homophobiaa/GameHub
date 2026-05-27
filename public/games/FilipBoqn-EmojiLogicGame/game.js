// game.js — Emoji Logic Game (Arcade Edition, Bulgarian)

const DIFF_CONFIG = {
  easy:   { time: 60, options: 4, multiplier: 1.0, label: 'ЛЕСНО'  },
  medium: { time: 45, options: 4, multiplier: 1.5, label: 'СРЕДНО' },
  hard:   { time: 30, options: 2, multiplier: 2.5, label: 'ТРУДНО' },
};

const TOTAL_ROUNDS    = 10;
const BASE_POINTS     = 100;
const SPEED_BONUS_MAX = 60;
const STREAK_BONUS    = 25;
const HINT_COST       = 50;

let difficulty     = 'easy';
let selectedCats   = new Set(['all']);
let player         = { name: '' };
let score          = 0;
let streak         = 0;
let correctCount   = 0;
let roundIndex     = 0;
let gamePuzzles    = [];
let timerInterval  = null;
let timeRemaining  = 60;
let questionStart  = 0;
let answered       = false;
let hintUsed       = false;
let currentPuzzle  = null;
let lbTab          = 'easy';
let roundResults   = []; // track per-round result for block display

// ── Difficulty ──────────────────────────────
function setDiff(btn) {
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  difficulty = btn.dataset.diff;
  document.getElementById('stat-time').textContent = DIFF_CONFIG[difficulty].time;
}

// ── Category filter ─────────────────────────
function toggleCat(btn) {
  SFX.resume();
  const cat = btn.dataset.cat;
  if (cat === 'all') {
    selectedCats = new Set(['all']);
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    const allBtn = document.querySelector('.cat-btn[data-cat="all"]');
    allBtn.classList.remove('active');
    selectedCats.delete('all');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) selectedCats.add(cat);
    else selectedCats.delete(cat);
    if (selectedCats.size === 0) {
      selectedCats.add('all');
      allBtn.classList.add('active');
    }
  }
  const countEl = document.getElementById('sel-count');
  countEl.textContent = selectedCats.has('all') ? '[ВСИЧКИ]' : `[${selectedCats.size} ИЗБРАНИ]`;
}

// ── Leaderboard tab ─────────────────────────
function switchLbTab(btn, tab) {
  document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  lbTab = tab;
  renderLeaderboard();
}

// ── Screen switching ────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showWelcome()     { showScreen('screen-welcome'); }
function showLeaderboard() { renderLeaderboard(); showScreen('screen-leaderboard'); }

// ── Start ───────────────────────────────────
function startGame() {
  SFX.resume();
  const val = document.getElementById('initials-input').value.trim();
  if (!val) {
    const row = document.querySelector('.input-row');
    row.style.borderColor = 'var(--red)';
    row.style.boxShadow   = '0 0 0 1px var(--red), 0 0 14px rgba(255,45,85,.3)';
    setTimeout(() => { row.style.borderColor = ''; row.style.boxShadow = ''; }, 1200);
    return;
  }

  player.name   = val.slice(0, 12);
  score         = 0;
  streak        = 0;
  correctCount  = 0;
  roundIndex    = 0;
  hintUsed      = false;
  roundResults  = [];

  const cfg = DIFF_CONFIG[difficulty];
  timeRemaining = cfg.time;

  let pool = selectedCats.has('all')
    ? PUZZLES
    : PUZZLES.filter(p => selectedCats.has(p.category));
  if (pool.length < TOTAL_ROUNDS) pool = PUZZLES;

  gamePuzzles = shuffleArray(pool).slice(0, TOTAL_ROUNDS);

  document.getElementById('player-tag').textContent = player.name.toUpperCase();
  document.getElementById('score-value').textContent = padScore(0);
  document.getElementById('streak-count').textContent = '0';
  document.getElementById('diff-chip').textContent = cfg.label;

  // Build round blocks
  buildRoundBlocks();
  buildTimerBlocks(cfg.time);

  showScreen('screen-game');
  startTimer();
  loadRound();
}

function padScore(n) {
  return String(n).padStart(6, '0');
}

function playAgain() {
  document.getElementById('initials-input').value = '';
  showScreen('screen-welcome');
}

// ── Round blocks (visual progress) ──────────
function buildRoundBlocks() {
  const container = document.getElementById('round-blocks');
  container.innerHTML = '';
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const b = document.createElement('div');
    b.className = 'r-block';
    b.id = `rb-${i}`;
    container.appendChild(b);
  }
  updateRoundBlock(0, 'cur');
}

function updateRoundBlock(idx, state) {
  const b = document.getElementById(`rb-${idx}`);
  if (b) { b.className = 'r-block ' + state; }
}

// ── Timer blocks ────────────────────────────
function buildTimerBlocks(total) {
  const container = document.getElementById('timer-blocks');
  container.innerHTML = '';
  const count = Math.min(total, 30); // max 30 blocks
  for (let i = 0; i < count; i++) {
    const b = document.createElement('div');
    b.className = 't-block';
    container.appendChild(b);
  }
}

function updateTimerBlocks() {
  const cfg   = DIFF_CONFIG[difficulty];
  const blocks = document.querySelectorAll('.t-block');
  const total  = blocks.length;
  const pct    = timeRemaining / cfg.time;
  const active = Math.ceil(pct * total);

  blocks.forEach((b, i) => {
    b.className = 't-block';
    if (i >= active) {
      b.style.background = 'var(--border)';
      b.style.boxShadow  = 'none';
    } else {
      b.style.background = '';
      b.style.boxShadow  = '';
      if (timeRemaining <= 5)  b.classList.add('danger');
      else if (timeRemaining <= Math.floor(cfg.time * 0.33)) b.classList.add('warn');
    }
  });

  const num = document.getElementById('timer-text');
  num.textContent = timeRemaining;
  num.className   = 'timer-num';
  if (timeRemaining <= 5)  num.classList.add('danger');
  else if (timeRemaining <= Math.floor(cfg.time * 0.33)) num.classList.add('warn');
}

// ── Timer ───────────────────────────────────
function startTimer() {
  clearInterval(timerInterval);
  updateTimerBlocks();
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerBlocks();
    if (timeRemaining <= 10 && timeRemaining > 0) SFX.tick();
    if (timeRemaining <= 0) { clearInterval(timerInterval); endGame('timeout'); }
  }, 1000);
}

// ── Hint ────────────────────────────────────
function useHint() {
  if (hintUsed || answered) return;
  SFX.hint();
  hintUsed = true;

  const cfg     = DIFF_CONFIG[difficulty];
  const buttons = [...document.querySelectorAll('.ans-btn:not(:disabled)')];
  const wrongBtns = buttons.filter(b => b.textContent !== currentPuzzle.answer);
  const toElim    = cfg.options === 2 ? 0 : 2;

  shuffleArray(wrongBtns).slice(0, toElim).forEach(b => {
    b.disabled = true;
    b.classList.add('hint-elim');
  });

  score = Math.max(0, score - HINT_COST);
  document.getElementById('score-value').textContent = padScore(score);

  const hintBtn = document.getElementById('hint-btn');
  hintBtn.disabled = true;
  hintBtn.classList.add('used');
  setFeedback(`>> ПОДСКАЗКА: -${HINT_COST} ТЧК`, 'hint-fb');
}

// ── Rounds ──────────────────────────────────
function loadRound() {
  if (roundIndex >= TOTAL_ROUNDS) { endGame('complete'); return; }

  answered      = false;
  hintUsed      = false;
  questionStart = Date.now();
  currentPuzzle = gamePuzzles[roundIndex];

  const hintBtn = document.getElementById('hint-btn');
  hintBtn.disabled = false;
  hintBtn.classList.remove('used');

  // Update round blocks: mark previous, set current
  if (roundIndex > 0) {
    const prev = roundResults[roundIndex - 1];
    updateRoundBlock(roundIndex - 1, prev ? 'done' : 'wrong');
  }
  updateRoundBlock(roundIndex, 'cur');

  document.getElementById('progress-txt').textContent =
    String(roundIndex + 1).padStart(2,'0') + '/' + String(TOTAL_ROUNDS).padStart(2,'0');

  document.getElementById('cat-badge').textContent   = currentPuzzle.category;
  document.getElementById('puzzle-hint').textContent = currentPuzzle.hint || '';

  const cfg  = DIFF_CONFIG[difficulty];
  let opts   = [...currentPuzzle.options];
  if (cfg.options === 2) {
    const wrong = shuffleArray(opts.filter(o => o !== currentPuzzle.answer));
    opts = shuffleArray([currentPuzzle.answer, wrong[0]]);
  } else {
    opts = shuffleArray(opts);
  }

  const grid = document.getElementById('answers-grid');
  grid.innerHTML = '';
  grid.className = cfg.options === 2 ? 'answer-zone two-col' : 'answer-zone';

  opts.forEach(opt => {
    const btn     = document.createElement('button');
    btn.className = 'ans-btn';
    btn.textContent = opt;
    btn.onclick   = () => handleAnswer(btn, opt, currentPuzzle);
    grid.appendChild(btn);
  });

  const fb = document.getElementById('feedback-bar');
  fb.textContent = ''; fb.className = 'feedback-line';

  // Reset animation before filling content
  const disp = document.getElementById('puzzle-display');
  disp.style.animation = 'none'; void disp.offsetWidth; disp.style.animation = '';

  renderPuzzle(currentPuzzle.eq);
}

function renderPuzzle(eq) {
  const container = document.getElementById('puzzle-display');
  container.textContent = '';  // clear safely

  const parts = eq.split('?');
  parts.forEach((part, i) => {
    if (part !== '') {
      container.appendChild(document.createTextNode(part));
    }
    if (i < parts.length - 1) {
      const span = document.createElement('span');
      span.className = 'mystery-box';
      span.textContent = '?';
      container.appendChild(span);
    }
  });
}

function handleAnswer(btn, chosen, puzzle) {
  if (answered) return;
  answered = true;

  const elapsed = (Date.now() - questionStart) / 1000;
  const correct = chosen === puzzle.answer;
  const cfg     = DIFF_CONFIG[difficulty];

  document.querySelectorAll('.ans-btn').forEach(b => b.disabled = true);

  if (correct) {
    btn.classList.add('correct');
    SFX.correct();
    streak++;
    correctCount++;
    roundResults.push(true);

    let pts = Math.round(BASE_POINTS * cfg.multiplier);
    if (elapsed < 3)      pts += Math.round(SPEED_BONUS_MAX * cfg.multiplier);
    else if (elapsed < 6) pts += Math.round(SPEED_BONUS_MAX * cfg.multiplier * 0.5);
    if (streak >= 3)      pts += STREAK_BONUS * Math.floor(streak / 3);

    score += pts;
    const sv = document.getElementById('score-value');
    sv.textContent = padScore(score);
    sv.classList.remove('bump'); void sv.offsetWidth; sv.classList.add('bump');

    const msgs = [
      `>> +${pts} ВЯРНО!`,
      `>> +${pts} БРАВО!`,
      `>> +${pts} ПЕРФЕКТНО!`,
      `>> +${pts} ОТЛИЧНО!`,
      `>> +${pts} СУПЕР!`,
    ];
    setFeedback(msgs[Math.floor(Math.random() * msgs.length)], 'ok');

    if (streak > 0 && streak % 5 === 0) triggerCombo(streak);
  } else {
    btn.classList.add('wrong');
    SFX.wrong();
    streak = 0;
    roundResults.push(false);
    document.querySelectorAll('.ans-btn').forEach(b => {
      if (b.textContent === puzzle.answer) b.classList.add('correct');
    });
    setFeedback(`>> ГРЕШНО! ВЕРЕН: ${puzzle.answer}`, 'bad');
  }

  document.getElementById('streak-count').textContent = streak;
  roundIndex++;
  setTimeout(loadRound, 1500);
}

function setFeedback(msg, cls) {
  const fb = document.getElementById('feedback-bar');
  fb.textContent = msg; fb.className = 'feedback-line ' + cls;
}

// ── Combo ───────────────────────────────────
function triggerCombo(streak) {
  SFX.combo();
  const overlay = document.getElementById('combo-overlay');
  const msgs = { 5:'🔥 КОМБО\nX5!', 10:'⚡ МЕГА\nX10!', 15:'💥 УЛТРА\nX15!', 20:'🌟 ЛЕГЕНДА!' };
  const msg  = msgs[streak] || `🔥 КОМБО\nX${streak}!`;
  overlay.textContent = msg;
  overlay.classList.remove('show'); void overlay.offsetWidth;
  overlay.classList.add('show');

  const shell = document.querySelector('.game-shell');
  shell.classList.remove('shake'); void shell.offsetWidth;
  shell.classList.add('shake');
  setTimeout(() => shell.classList.remove('shake'), 500);
  setTimeout(() => overlay.classList.remove('show'), 1400);
}

// ── End Game ────────────────────────────────
function endGame(reason) {
  clearInterval(timerInterval);
  saveScore();

  // Fill remaining round blocks
  for (let i = roundIndex; i < TOTAL_ROUNDS; i++) {
    updateRoundBlock(i, '');
  }
  if (roundIndex > 0 && roundResults[roundIndex-1] !== undefined) {
    updateRoundBlock(roundIndex-1, roundResults[roundIndex-1] ? 'done' : 'wrong');
  }

  showScreen('screen-gameover');

  const emoji = correctCount >= 9 ? '🏆' : correctCount >= 6 ? '🎉' : correctCount >= 4 ? '😎' : '💪';
  const title = correctCount >= 9 ? 'ЛЕГЕНДА!' : correctCount >= 6 ? 'БРАВО!' : correctCount >= 4 ? 'ДОБРЕ!' : 'ПРОДЪЛЖАВАЙ!';
  const msg   = reason === 'complete'
    ? `ЗАВЪРШИ ВСИЧКИ ${TOTAL_ROUNDS} ЗАДАЧИ // ${DIFF_CONFIG[difficulty].label}`
    : `ВРЕМЕТО ИЗТЕЧЕ // ${roundIndex} ЗАДАЧИ`;

  document.getElementById('gameover-emoji').textContent = emoji;
  document.getElementById('gameover-title').textContent = title;
  document.getElementById('gameover-msg').textContent   = msg;
  document.getElementById('final-score').textContent    = padScore(score);

  const wrong = roundIndex - correctCount;
  document.getElementById('go-stats').innerHTML = `
    <div class="go-stat"><strong>${correctCount}</strong><span>ВЕРНИ</span></div>
    <div class="go-stat"><strong>${wrong}</strong><span>ГРЕШНИ</span></div>
    <div class="go-stat"><strong>${streak}</strong><span>СЕРИЯ</span></div>
    <div class="go-stat"><strong>${DIFF_CONFIG[difficulty].label}</strong><span>РЕЖИМ</span></div>
  `;
}

// ── Leaderboard ──────────────────────────────
function lbKey(diff) { return `emoji_arcade_${diff}`; }

function getLeaderboard(diff) {
  try { return JSON.parse(localStorage.getItem(lbKey(diff)) || '[]'); }
  catch { return []; }
}

function saveScore() {
  const lb = getLeaderboard(difficulty);
  lb.push({ name: player.name, score, correct: correctCount, diff: difficulty, date: Date.now() });
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem(lbKey(difficulty), JSON.stringify(lb.slice(0, 10)));
}

function renderLeaderboard() {
  const lb   = getLeaderboard(lbTab);
  const list = document.getElementById('lb-list');
  if (!lb.length) {
    list.innerHTML = `<p class="lb-empty">>> НЯМА РЕЗУЛТАТИ<br>ЗА ${DIFF_CONFIG[lbTab].label}<br>БЪДИ ПЪРВИ! 🚀</p>`;
    return;
  }
  const medals = ['🥇','🥈','🥉'];
  const topCls = ['top1','top2','top3'];
  list.innerHTML = lb.map((e, i) => `
    <div class="lb-row ${topCls[i] || ''}">
      <span class="lb-rank">${medals[i] || (i + 1)}</span>
      <span class="lb-name">${escHtml(e.name)}</span>
      <span class="lb-pts">${padScore(e.score)}</span>
    </div>
  `).join('');
}

// ── Utils ────────────────────────────────────
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

['easy','medium','hard'].forEach(d => localStorage.removeItem(lbKey(d)));

document.getElementById('initials-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') startGame();
});
