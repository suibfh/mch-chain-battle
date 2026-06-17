import { CONFIG } from './config.js';
import {
  createEmptyBoard,
  createPiece,
  canPlace,
  movePiece,
  rotatePiece,
  lockPiece,
  findGroups,
  clearGroups,
  applyGravity,
} from './board.js';
import {
  createInitialHero,
  createBoss,
  getHeroAttack,
  applyGrowth,
  getFallIntervalByBossLevel,
} from './battle.js';
import { bindElements, render, getElement, setupTouchControls, hideResult, showResult } from './renderer.js';
import { flashClass } from './effects.js';
import { audio } from './audio.js';

let state;
let lastTimestamp = 0;
let rafId = null;
let audioPauseWasRunning = false;
const PLAYER_NAME_KEY = 'mchChainBattlePlayerName';
const LOCAL_RANKING_KEY = 'mchChainBattleLocalRanking';
const TOUCH_BUTTON_ORDER_KEY = 'mchChainBattleTouchButtonOrder';
const TOUCH_ACTIONS = ['left', 'drop', 'rotate', 'right'];
let currentTouchButtonOrder = loadTouchButtonOrder();

function showStartScreen(show) {
  const screen = document.getElementById('startScreen');
  if (!screen) return;
  screen.classList.toggle('is-hidden', !show);
}

function normalizeTouchButtonOrder(order) {
  if (!Array.isArray(order)) return [...CONFIG.ui.touchButtonOrder];
  const normalized = [];
  for (const action of order) {
    if (TOUCH_ACTIONS.includes(action) && !normalized.includes(action)) {
      normalized.push(action);
    }
  }
  for (const action of TOUCH_ACTIONS) {
    if (!normalized.includes(action)) normalized.push(action);
  }
  return normalized.slice(0, TOUCH_ACTIONS.length);
}

function loadTouchButtonOrder() {
  try {
    return normalizeTouchButtonOrder(JSON.parse(localStorage.getItem(TOUCH_BUTTON_ORDER_KEY) || 'null'));
  } catch {
    return [...CONFIG.ui.touchButtonOrder];
  }
}

function saveTouchButtonOrder(order) {
  currentTouchButtonOrder = normalizeTouchButtonOrder(order);
  localStorage.setItem(TOUCH_BUTTON_ORDER_KEY, JSON.stringify(currentTouchButtonOrder));
}

function renderButtonOrderControls() {
  const container = document.getElementById('buttonOrderControls');
  if (!container) return;
  container.innerHTML = '';

  currentTouchButtonOrder.forEach((action, index) => {
    const select = document.createElement('select');
    select.className = 'button-order-select';
    select.setAttribute('aria-label', `button ${index + 1}`);

    for (const optionAction of TOUCH_ACTIONS) {
      const option = document.createElement('option');
      option.value = optionAction;
      option.textContent = CONFIG.ui.touchButtons[optionAction] || optionAction;
      option.selected = optionAction === action;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      const nextOrder = [...currentTouchButtonOrder];
      const selectedAction = select.value;
      const duplicateIndex = nextOrder.findIndex((value, i) => value === selectedAction && i !== index);
      nextOrder[index] = selectedAction;
      if (duplicateIndex >= 0) nextOrder[duplicateIndex] = action;
      saveTouchButtonOrder(nextOrder);
      setupTouchControls(handleTouchAction, currentTouchButtonOrder);
      renderButtonOrderControls();
    });

    container.appendChild(select);
  });
}

function updateViewResultButton() {
  const button = document.getElementById('viewResultBtn');
  if (!button) return;
  button.disabled = !(state?.gameOver && state?.result);
}

function toggleSoundPanel(forceOpen = null) {
  const shouldOpen = forceOpen === null ? !document.body.classList.contains('sound-open') : forceOpen;
  document.body.classList.toggle('sound-open', shouldOpen);
  const soundBtn = document.getElementById('soundBtn');
  if (soundBtn) soundBtn.classList.toggle('is-open', shouldOpen);
  if (shouldOpen && state?.running && !state.gameOver) {
    setPausedState(true, 'PAUSED: 音量調整中。再開は緑のRESUMEボタン。');
    render(state);
  }
}

function setPausedState(paused, message = '') {
  state.paused = paused;
  const pauseBtn = document.getElementById('pauseBtn');
  pauseBtn.textContent = paused ? 'RESUME' : 'PAUSE';
  pauseBtn.classList.toggle('is-paused', paused);
  document.body.classList.toggle('game-paused', paused);
  if (message) state.log = message;
}

function createInitialState() {
  const currentPiece = createPiece();
  const nextPiece = createPiece();
  return {
    running: false,
    paused: false,
    gameOver: false,
    board: createEmptyBoard(),
    currentPiece,
    nextPiece,
    fallTimer: 0,
    hero: createInitialHero(),
    boss: createBoss(1),
    score: 0,
    timeLeft: CONFIG.game.timeLimitSec,
    lastChain: 0,
    maxChain: 0,
    defeatedCount: 0,
    result: null,
    resolving: false,
    clearingCells: new Set(),
    log: 'STARTを押してください。',
  };
}

function startGame() {
  if (state.running && !state.gameOver) return;
  showStartScreen(false);
  toggleSoundPanel(false);
  hideResult();
  state = createInitialState();
  state.running = true;
  state.log = 'Battle Start!';
  document.getElementById('pauseBtn').disabled = false;
  document.getElementById('pauseBtn').textContent = 'PAUSE';
  document.getElementById('pauseBtn').classList.remove('is-paused');
  document.body.classList.remove('game-paused');
  audio.playBgm();
  updateViewResultButton();
  lastTimestamp = performance.now();
  loop(lastTimestamp);
}

function pauseGame() {
  if (!state.running || state.gameOver) return;
  const nextPaused = !state.paused;
  setPausedState(nextPaused, nextPaused ? 'PAUSED: 再開は緑のRESUMEボタン。' : 'Battle resumed!');
  if (!state.paused) {
    lastTimestamp = performance.now();
    loop(lastTimestamp);
  }
  render(state);
}

function resetGame() {
  hideResult();
  showStartScreen(true);
  toggleSoundPanel(false);
  cancelAnimationFrame(rafId);
  state = createInitialState();
  document.getElementById('pauseBtn').disabled = true;
  document.getElementById('pauseBtn').textContent = 'PAUSE';
  document.getElementById('pauseBtn').classList.remove('is-paused');
  document.body.classList.remove('game-paused');
  audio.stopBgm();
  render(state);
  updateViewResultButton();
}

function loop(timestamp) {
  if (!state.running || state.paused || state.gameOver) return;
  const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;

  update(dt);
  render(state);
  rafId = requestAnimationFrame(loop);
}

function update(dt) {
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    endGame('FULL_TIME');
    return;
  }

  updateBattle(dt);
  if (state.gameOver) return;

  state.fallTimer += dt;
  const fallInterval = getFallIntervalByBossLevel(state.boss.level);
  if (state.resolving || !state.currentPiece) return;

  if (state.fallTimer >= fallInterval) {
    state.fallTimer = 0;
    softDrop();
  }
}

function updateBattle(dt) {
  state.hero.attackTimer += dt;
  if (state.hero.attackTimer >= state.hero.attackInterval) {
    state.hero.attackTimer = 0;
    const damage = getHeroAttack(state.hero);
    state.boss.hp -= damage;
    state.score += damage * 10;
    state.log = `Hero attack ${damage.toFixed(1)} damage`;
    flashClass(getElement('heroSprite'), 'attack-motion');
    flashClass(getElement('bossHpBar'), 'hp-bar-hit');
    audio.playSe('damage');
    if (state.boss.hp <= 0) defeatBoss();
  }

  state.boss.attackTimer += dt;
  if (state.boss.attackTimer >= state.boss.attackInterval) {
    state.boss.attackTimer = 0;
    state.hero.hp -= state.boss.attack;
    state.log = `Boss attack ${state.boss.attack.toFixed(1)} damage`;
    flashClass(getElement('bossSprite'), 'attack-motion-reverse');
    flashClass(getElement('heroHpBar'), 'hp-bar-hit');
    audio.playSe('damage');
    if (state.hero.hp <= 0) {
      state.hero.hp = 0;
      endGame('HERO_DOWN');
    }
  }
}

function defeatBoss() {
  const defeatedLevel = state.boss.level;
  state.score += defeatedLevel * CONFIG.score.bossDefeatBase;
  state.defeatedCount += 1;
  state.boss = createBoss(defeatedLevel + 1);
  state.log = `Boss Lv.${defeatedLevel} defeated! Next Lv.${state.boss.level}`;
  flashClass(getElement('bossSprite'), 'defeat-flash');
  audio.playSe('bossDefeat');
}

function softDrop() {
  const next = movePiece(state.currentPiece, 0, 1);
  if (canPlace(state.board, next)) {
    state.currentPiece = next;
    return;
  }
  lockCurrentPiece();
}

function hardDrop() {
  let next = movePiece(state.currentPiece, 0, 1);
  while (canPlace(state.board, next)) {
    state.currentPiece = next;
    next = movePiece(state.currentPiece, 0, 1);
  }
  lockCurrentPiece();
}

async function sleep(ms) {
  let elapsed = 0;
  let last = performance.now();
  while (elapsed < ms) {
    await new Promise(resolve => setTimeout(resolve, 16));
    const now = performance.now();
    if (!state?.paused) {
      elapsed += now - last;
    }
    last = now;
  }
}

function lockCurrentPiece() {
  state.board = applyGravity(lockPiece(state.board, state.currentPiece));
  state.currentPiece = null;
  state.fallTimer = 0;
  resolveChainsAsync();
}

async function resolveChainsAsync() {
  state.resolving = true;
  let chainCount = 0;
  let totalCleared = 0;

  while (!state.gameOver) {
    const groups = findGroups(state.board);
    if (groups.length === 0) break;

    chainCount++;
    const clearingKeys = groups.flatMap(group =>
      group.cells.map(cell => `${cell.x},${cell.y}`)
    );
    state.clearingCells = new Set(clearingKeys);
    state.log = `${chainCount} Chain!`;
    audio.playSe('clear');
    render(state);
    await sleep(CONFIG.effects.clearDelayMs);

    if (state.gameOver) break;

    const { board, clearedByType } = clearGroups(state.board, groups);
    state.board = applyGravity(board);
    state.clearingCells = new Set();

    const messages = [];
    for (const [type, count] of Object.entries(clearedByType)) {
      totalCleared += count;
      messages.push(...applyGrowth(state.hero, type, count, chainCount));
      state.score += count * CONFIG.score.clearBase + chainCount * CONFIG.score.chainBonus;
    }
    state.log = `${chainCount} Chain: ${messages.join(' / ')}`;
    render(state);
    await sleep(CONFIG.effects.afterClearDelayMs);
  }

  state.lastChain = chainCount;
  if (totalCleared > 0) {
    state.score += Math.max(0, chainCount - 1) * 500;
    state.maxChain = Math.max(state.maxChain, chainCount);
  }

  state.clearingCells = new Set();
  state.resolving = false;

  if (state.gameOver) return;

  state.currentPiece = state.nextPiece;
  state.nextPiece = createPiece();
  state.fallTimer = 0;
  if (!canPlace(state.board, state.currentPiece)) {
    endGame('BOARD_FULL');
  } else {
    render(state);
  }
}

function getResultLabel(reason) {
  if (reason === 'FULL_TIME') return CONFIG.game.fullTimeResultLabel;
  if (reason === 'HERO_DOWN') return 'HERO DOWN';
  if (reason === 'BOARD_FULL') return 'BOARD FULL';
  return 'RESULT';
}

function endGame(reason) {
  state.running = false;
  state.gameOver = true;
  state.result = {
    reason,
    label: getResultLabel(reason),
  };
  state.log = `${state.result.label} / Final Score ${Math.floor(state.score).toLocaleString()} / Boss Lv.${state.boss.level}`;
  document.getElementById('pauseBtn').disabled = true;
  audio.playSe(reason === 'FULL_TIME' ? 'win' : 'gameOver');
  audio.stopBgm();
  render(state);
  updateViewResultButton();
}

function submitLocalRanking() {
  if (!state?.gameOver || !state.result) return;
  const input = document.getElementById('playerNameInput');
  const status = document.getElementById('rankingStatus');
  const name = (input.value || 'Player').trim().slice(0, 16) || 'Player';
  localStorage.setItem(PLAYER_NAME_KEY, name);

  const entry = {
    playerName: name,
    score: Math.floor(state.score),
    bossLevel: state.boss.level,
    defeatedCount: state.defeatedCount,
    maxChain: state.maxChain,
    result: state.result.label,
    createdAt: new Date().toISOString(),
  };

  const rankings = JSON.parse(localStorage.getItem(LOCAL_RANKING_KEY) || '[]');
  rankings.push(entry);
  rankings.sort((a, b) => b.score - a.score);
  localStorage.setItem(LOCAL_RANKING_KEY, JSON.stringify(rankings.slice(0, 20)));
  status.textContent = 'LOCAL RANKING SAVED. Supabase接続後にオンライン登録へ切り替えます。';
}

function loadPlayerName() {
  const input = document.getElementById('playerNameInput');
  if (!input) return;
  input.value = localStorage.getItem(PLAYER_NAME_KEY) || '';
}


function tryMove(dx) {
  if (!state.running || state.paused || state.gameOver || state.resolving || !state.currentPiece) return;
  const next = movePiece(state.currentPiece, dx, 0);
  if (canPlace(state.board, next)) state.currentPiece = next;
  render(state);
}

function tryRotate() {
  if (!state.running || state.paused || state.gameOver || state.resolving || !state.currentPiece) return;
  const next = rotatePiece(state.currentPiece);
  if (canPlace(state.board, next)) {
    state.currentPiece = next;
  } else {
    const kickLeft = movePiece(next, -1, 0);
    const kickRight = movePiece(next, 1, 0);
    if (canPlace(state.board, kickLeft)) state.currentPiece = kickLeft;
    else if (canPlace(state.board, kickRight)) state.currentPiece = kickRight;
  }
  render(state);
}

function handleKeydown(event) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    tryMove(-1);
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    tryMove(1);
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    tryRotate();
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (state.running && !state.paused && !state.gameOver && !state.resolving && state.currentPiece) softDrop();
    render(state);
  }
  if (event.code === 'Space') {
    event.preventDefault();
    if (state.running && !state.paused && !state.gameOver && !state.resolving && state.currentPiece) hardDrop();
    render(state);
  }
}

function handleTouchAction(action) {
  if (action === 'left') tryMove(-1);
  if (action === 'right') tryMove(1);
  if (action === 'rotate') tryRotate();
  if (action === 'drop') {
    if (state.running && !state.paused && !state.gameOver && !state.resolving && state.currentPiece) hardDrop();
    render(state);
  }
}


function beginAudioAdjust() {
  if (!state || !state.running || state.gameOver) return;
  audioPauseWasRunning = true;
  setPausedState(true, 'PAUSED: 音量調整中。再開は緑のRESUMEボタン。');
  render(state);
}

function endAudioAdjust() {
  audioPauseWasRunning = false;
  if (!state || !state.running || state.gameOver) return;
  setPausedState(true, 'PAUSED: 再開は緑のRESUMEボタン。');
  render(state);
}

function bindAudioControls() {
  const muteToggle = document.getElementById('muteToggle');
  const bgmVolume = document.getElementById('bgmVolume');
  const seVolume = document.getElementById('seVolume');

  muteToggle.checked = Boolean(audio.muted);
  bgmVolume.value = String(Math.round(audio.bgmVolume * 100));
  seVolume.value = String(Math.round(audio.seVolume * 100));

  muteToggle.addEventListener('change', () => audio.setMuted(muteToggle.checked));
  bgmVolume.addEventListener('input', () => audio.setBgmVolume(Number(bgmVolume.value) / 100));
  seVolume.addEventListener('input', () => audio.setSeVolume(Number(seVolume.value) / 100));

  for (const control of [muteToggle, bgmVolume, seVolume]) {
    control.addEventListener('pointerdown', beginAudioAdjust);
    control.addEventListener('focus', beginAudioAdjust);
    control.addEventListener('pointerup', () => setTimeout(endAudioAdjust, 120));
    control.addEventListener('blur', endAudioAdjust);
    control.addEventListener('keyup', event => {
      if (event.key === 'Enter' || event.key === 'Escape') endAudioAdjust();
    });
  }
}

async function init() {
  bindElements();
  state = createInitialState();
  await audio.init();
  render(state);
  updateViewResultButton();

  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('startScreenBtn').addEventListener('click', startGame);
  document.getElementById('soundBtn').addEventListener('click', () => toggleSoundPanel());
  document.getElementById('pauseBtn').addEventListener('click', pauseGame);
  document.getElementById('resetBtn').addEventListener('click', resetGame);
  document.getElementById('retryBtn').addEventListener('click', startGame);
  document.getElementById('closeResultBtn').addEventListener('click', hideResult);
  document.getElementById('submitRankingBtn').addEventListener('click', submitLocalRanking);
  document.getElementById('viewResultBtn').addEventListener('click', () => {
    toggleSoundPanel(false);
    showResult();
  });
  loadPlayerName();
  bindAudioControls();
  setupTouchControls(handleTouchAction, currentTouchButtonOrder);
  renderButtonOrderControls();
  window.addEventListener('keydown', handleKeydown);
}

init();
