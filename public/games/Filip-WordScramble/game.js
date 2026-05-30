// game.js — Word Scramble v1

// ── Config ───────────────────────────────────
const DIFF_CONFIG = {
  easy:   { time: 60, multiplier: 1.0, label: '🟢 Easy'   },
  medium: { time: 45, multiplier: 1.5, label: '🟡 Medium' },
  hard:   { time: 30, multiplier: 2.5, label: '🔴 Hard'   },
};

const TOTAL_ROUNDS  = 10;
const BASE_POINTS   = 100;
const HINT_COST     = 50;

// ── State ────────────────────────────────────
let difficulty    = 'easy';
let selectedCats  = new Set(['all']);
let player        = { name: '' };
let score         = 0;
let streak        = 0;
let correctCount  = 0;
let roundIndex    = 0;
let gameWords     = [];
let timerInterval = null;
let timeRemaining = 60;
let answered      = false;
let hintUsed      = false;
let lbTab         = 'easy';

// Current round state
let currentWord       = '';   // original word (uppercase, no spaces)
let currentScrambled  = '';
let chosenLetters     = [];   // indices into scramble array that were tapped
let remainingIndices  = [];   // indices still available

// ── Difficulty & Category ────────────────────
function setDiff(btn) {
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  difficulty = btn.dataset.diff;
  document.getElementById('stat-time').textContent = DIFF_CONFIG[difficulty].time;
}

function toggleCat(btn) {
  SFX.resume();
  const cat = btn.dataset.cat;
  if (cat === 'all') {
    selectedCats = new Set(['all']);
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    document.querySelector('.cat-btn[data-cat="all"]').classList.remove('active');
    selectedCats.delete('all');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) selectedCats.add(cat);
    else selectedCats.delete(cat);
    if (selectedCats.size === 0) {
      selectedCats.add('all');
      document.querySelector('.cat-btn[data-cat="all"]').classList.add('active');
    }
  }
  const countEl = document.getElementById('sel-count');
  countEl.textContent = selectedCats.has('all') ? '(всички)' : `(${selectedCats.size} избрани)`;
}

// ── Leaderboard tab ──────────────────────────
function switchLbTab(btn, tab) {
  document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  lbTab = tab;
  renderLeaderboard();
}

// ── Screens ──────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showWelcome()     { showScreen('screen-welcome'); }
function showLeaderboard() { renderLeaderboard(); showScreen('screen-leaderboard'); }

// ── Start ────────────────────────────────────
function startGame() {
  SFX.resume();
  const val = document.getElementById('initials-input').value.trim();
  if (!val) {
    const inp = document.getElementById('initials-input');
    inp.focus();
    inp.style.borderColor = 'var(--red)';
    inp.style.boxShadow   = '0 0 0 3px rgba(249,65,68,.2)';
    setTimeout(() => { inp.style.borderColor = ''; inp.style.boxShadow = ''; }, 1200);
    return;
  }
  player.name  = val.slice(0, 12);
  score        = 0;
  streak       = 0;
  correctCount = 0;
  roundIndex   = 0;
  timeRemaining = DIFF_CONFIG[difficulty].time;
  gameWords    = getWordsForDiff(difficulty, selectedCats);

  document.getElementById('player-tag').textContent  = player.name.toUpperCase();
  document.getElementById('score-value').textContent = '0';
  document.getElementById('streak-count').textContent = '0';
  document.getElementById('diff-chip').textContent   = DIFF_CONFIG[difficulty].label;

  showScreen('screen-game');
  startTimer();
  loadRound();
}

function playAgain() {
  document.getElementById('initials-input').value = '';
  showScreen('screen-welcome');
}

// ── Timer ────────────────────────────────────
function startTimer() {
  clearInterval(timerInterval);
  updateTimerUI();
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerUI();
    if (timeRemaining <= 10 && timeRemaining > 0) SFX.tick();
    if (timeRemaining <= 0) { clearInterval(timerInterval); endGame('timeout'); }
  }, 1000);
}

function updateTimerUI() {
  const cfg  = DIFF_CONFIG[difficulty];
  const fill = document.getElementById('timer-fill');
  const num  = document.getElementById('timer-text');
  const pct  = (timeRemaining / cfg.time) * 100;
  fill.style.width = pct + '%';
  num.textContent  = timeRemaining;
  fill.classList.remove('warn','danger');
  num.classList.remove('warn','danger');
  if (timeRemaining <= 5) { fill.classList.add('danger'); num.classList.add('danger'); }
  else if (timeRemaining <= Math.floor(cfg.time * 0.33)) {
    fill.classList.add('warn'); num.classList.add('warn');
  }
}

// ── Load Round ───────────────────────────────
function loadRound() {
  if (roundIndex >= TOTAL_ROUNDS) { endGame('complete'); return; }

  answered  = false;
  hintUsed  = false;
  chosenLetters   = [];

  const entry      = gameWords[roundIndex];
  currentWord      = entry.word.toUpperCase().replace(/\s/g, '');
  currentScrambled = scrambleWord(currentWord);
  remainingIndices = currentScrambled.split('').map((_, i) => i);

  // Progress
  const pct = (roundIndex / TOTAL_ROUNDS) * 100;
  document.getElementById('progress-fill').style.width = Math.max(pct, 4) + '%';
  document.getElementById('progress-txt').textContent  = `${roundIndex + 1} / ${TOTAL_ROUNDS}`;
  document.getElementById('cat-badge').textContent     = entry.category;
  document.getElementById('puzzle-hint').textContent   = entry.hint;

  // Reset hint
  const hintBtn = document.getElementById('hint-btn');
  hintBtn.disabled = false;
  hintBtn.classList.remove('used');

  // Reset feedback
  const fb = document.getElementById('feedback-bar');
  fb.textContent = ''; fb.className = 'feedback-msg';

  renderScramble();
  renderSlots();
  renderLetterButtons();
}

// ── Render Scramble Display ───────────────────
function renderScramble() {
  // Show all scrambled letters in the top display (decorative)
  const disp = document.getElementById('scramble-display');
  disp.innerHTML = currentScrambled.split('').map((l, i) =>
    `<span class="sc-letter ${remainingIndices.includes(i) ? '' : 'sc-used'}">${l}</span>`
  ).join('');
  // Animate
  disp.style.animation = 'none'; void disp.offsetWidth; disp.style.animation = '';
}

// ── Render Answer Slots ──────────────────────
function renderSlots() {
  const slots = document.getElementById('answer-slots');
  slots.innerHTML = currentWord.split('').map((_, i) => {
    const letter = chosenLetters[i] !== undefined ? currentScrambled[chosenLetters[i]] : '';
    return `<div class="slot ${letter ? 'filled' : ''}">${letter}</div>`;
  }).join('');
}

// ── Render Letter Buttons ─────────────────────
function renderLetterButtons() {
  const container = document.getElementById('letter-buttons');
  container.innerHTML = currentScrambled.split('').map((letter, idx) => {
    const used = !remainingIndices.includes(idx);
    return `<button class="letter-btn ${used ? 'used' : ''}"
      onclick="tapLetter(${idx})"
      ${used ? 'disabled' : ''}
      >${letter}</button>`;
  }).join('');
}

// ── Tap a Letter ─────────────────────────────
function tapLetter(idx) {
  if (answered) return;
  if (!remainingIndices.includes(idx)) return;
  SFX.tap();

  chosenLetters.push(idx);
  remainingIndices = remainingIndices.filter(i => i !== idx);

  renderSlots();
  renderLetterButtons();
  renderScramble();

  // Auto-submit when all slots filled
  if (chosenLetters.length === currentWord.length) {
    setTimeout(submitAnswer, 300);
  }
}

// ── Clear Answer ──────────────────────────────
function clearAnswer() {
  if (answered) return;
  SFX.skip();
  chosenLetters   = [];
  remainingIndices = currentScrambled.split('').map((_, i) => i);
  renderSlots();
  renderLetterButtons();
  renderScramble();
  const fb = document.getElementById('feedback-bar');
  fb.textContent = ''; fb.className = 'feedback-msg';
}

// ── Submit Answer ─────────────────────────────
function submitAnswer() {
  if (answered) return;
  if (chosenLetters.length < currentWord.length) {
    setFeedback('⚠️ Попълни всички букви!', 'warn-fb');
    return;
  }

  SFX.submit();
  answered = true;

  const guess   = chosenLetters.map(i => currentScrambled[i]).join('');
  const correct = guess === currentWord;
  const cfg     = DIFF_CONFIG[difficulty];

  if (correct) {
    SFX.correct();
    streak++;
    correctCount++;

    // Points: base + length bonus + speed bonus (time remaining)
    let pts = Math.round(BASE_POINTS * cfg.multiplier);
    pts += currentWord.length * 5;                  // longer word = more points
    pts += Math.round(timeRemaining * 1.5);         // speed bonus

    score += pts;
    const sv = document.getElementById('score-value');
    sv.textContent = score;
    sv.classList.remove('bump'); void sv.offsetWidth; sv.classList.add('bump');

    // Mark slots green
    document.querySelectorAll('.slot').forEach(s => s.classList.add('correct'));

    const msgs = [`+${pts} ✦ Браво!`,`+${pts} ✦ Перфектно!`,`+${pts} ✦ Вярно!`,`+${pts} ✦ Отлично!`];
    setFeedback(msgs[Math.floor(Math.random() * msgs.length)], 'ok');

    if (streak > 0 && streak % 5 === 0) triggerCombo(streak);

  } else {
    SFX.wrong();
    streak = 0;
    document.querySelectorAll('.slot').forEach(s => s.classList.add('wrong'));
    setFeedback(`✗ Грешно! Думата е: ${currentWord}`, 'bad');
  }

  document.getElementById('streak-count').textContent = streak;
  roundIndex++;
  setTimeout(loadRound, 1600);
}

// ── Skip Word ─────────────────────────────────
function skipWord() {
  if (answered) return;
  SFX.skip();
  answered = true;
  streak   = 0;
  document.getElementById('streak-count').textContent = 0;
  setFeedback(`⏭ Пропуснато! Думата беше: ${currentWord}`, 'bad');
  roundIndex++;
  setTimeout(loadRound, 1500);
}

// ── Hint ─────────────────────────────────────
function useHint() {
  if (hintUsed || answered) return;
  SFX.hint();
  hintUsed = true;

  // Reveal the first unfilled letter automatically
  const nextSlot = chosenLetters.length;
  if (nextSlot < currentWord.length) {
    const correctLetter = currentWord[nextSlot];
    // Find that letter in remainingIndices
    const idx = remainingIndices.find(i => currentScrambled[i] === correctLetter);
    if (idx !== undefined) {
      tapLetter(idx);
    }
  }

  score = Math.max(0, score - HINT_COST);
  document.getElementById('score-value').textContent = score;

  const hintBtn = document.getElementById('hint-btn');
  hintBtn.disabled = true;
  hintBtn.classList.add('used');
  setFeedback(`💡 Подсказка: -${HINT_COST} точки`, 'hint-fb');
}

function setFeedback(msg, cls) {
  const fb = document.getElementById('feedback-bar');
  fb.textContent = msg; fb.className = 'feedback-msg ' + cls;
}

// ── Combo ─────────────────────────────────────
function triggerCombo(streak) {
  SFX.combo();
  const overlay = document.getElementById('combo-overlay');
  const msgs    = { 5:'🔥 COMBO x5!', 10:'⚡ MEGA x10!', 15:'💥 ULTRA x15!' };
  overlay.textContent = msgs[streak] || `🔥 x${streak}!`;
  overlay.classList.remove('show'); void overlay.offsetWidth;
  overlay.classList.add('show');

  const layout = document.querySelector('.game-layout');
  layout.classList.remove('shake'); void layout.offsetWidth;
  layout.classList.add('shake');
  setTimeout(() => { layout.classList.remove('shake'); overlay.classList.remove('show'); }, 1200);
}

// ── End Game ─────────────────────────────────
function endGame(reason) {
  clearInterval(timerInterval);
  saveScore();
  document.getElementById('progress-fill').style.width = '100%';
  showScreen('screen-gameover');

  const emoji = correctCount >= 9 ? '🏆' : correctCount >= 6 ? '🎉' : correctCount >= 4 ? '😎' : '💪';
  const title = correctCount >= 9 ? 'Легенда!' : correctCount >= 6 ? 'Браво!' : correctCount >= 4 ? 'Добре!' : 'Продължавай!';
  const msg   = reason === 'complete'
    ? `Позна всичките ${TOTAL_ROUNDS} думи на ${DIFF_CONFIG[difficulty].label}!`
    : `Времето изтече след ${roundIndex} думи`;

  document.getElementById('gameover-emoji').textContent = emoji;
  document.getElementById('gameover-title').textContent = title;
  document.getElementById('gameover-msg').textContent   = msg;
  document.getElementById('final-score').textContent    = score;

  const wrong = roundIndex - correctCount;
  document.getElementById('go-stats').innerHTML = `
    <div class="go-stat"><strong>${correctCount}</strong><span>верни</span></div>
    <div class="go-stat"><strong>${wrong}</strong><span>грешни</span></div>
    <div class="go-stat"><strong>${streak}</strong><span>серия</span></div>
    <div class="go-stat"><strong>${DIFF_CONFIG[difficulty].label.split(' ')[1]}</strong><span>режим</span></div>
  `;
}

// ── Leaderboard ───────────────────────────────
function lbKey(d) { return `ws_lb_${d}`; }
function getLeaderboard(d) {
  try { return JSON.parse(localStorage.getItem(lbKey(d)) || '[]'); }
  catch { return []; }
}
function saveScore() {
  const lb = getLeaderboard(difficulty);
  lb.push({ name: player.name, score, correct: correctCount, date: Date.now() });
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem(lbKey(difficulty), JSON.stringify(lb.slice(0, 10)));
}
function renderLeaderboard() {
  const lb   = getLeaderboard(lbTab);
  const list = document.getElementById('lb-list');
  if (!lb.length) {
    list.innerHTML = `<p class="lb-empty">Няма резултати за ${DIFF_CONFIG[lbTab].label} — бъди първи! 🚀</p>`;
    return;
  }
  const medals = ['🥇','🥈','🥉'];
  const topCls = ['top1','top2','top3'];
  list.innerHTML = lb.map((e, i) => `
    <div class="lb-row ${topCls[i]||''}">
      <span class="lb-rank">${medals[i]||(i+1)}</span>
      <span class="lb-name">${escHtml(e.name)}</span>
      <span class="lb-pts">${e.score}</span>
    </div>
  `).join('');
}
function escHtml(s) {
  return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Clear on load
['easy','medium','hard'].forEach(d => localStorage.removeItem(lbKey(d)));

// Enter key
document.getElementById('initials-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') startGame();
});
