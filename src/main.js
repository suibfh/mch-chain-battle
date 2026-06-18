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
const DEVICE_ID_KEY = 'mchChainBattleDeviceId';
const RANKING_LIMIT = 10;
const TOUCH_BUTTON_ORDER_KEY = 'mchChainBattleTouchButtonOrder';
const TOUCH_ACTIONS = ['left', 'drop', 'rotate', 'right'];
let currentTouchButtonOrder = loadTouchButtonOrder();

function bossImagePathForPreload(index) {
  return `${CONFIG.images.bossDir}/${CONFIG.images.bossPrefix}${String(index).padStart(2, '0')}.${CONFIG.images.bossExt}`;
}

function preloadImage(src) {
  return new Promise(resolve => {
    if (!src) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

async function preloadAssets() {
  const extensionImages = Object.values(CONFIG.types).map(type => type.asset);
  const bossImages = Array.from(
    { length: CONFIG.boss.imageCount },
    (_, index) => bossImagePathForPreload(index + 1)
  );
  const urls = [
    CONFIG.images.hero,
    CONFIG.images.background,
    ...extensionImages,
    ...bossImages,
  ].filter(Boolean);

  await Promise.all(urls.map(preloadImage));
}

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

function setStartButtonMode(mode) {
  const startBtn = document.getElementById('startBtn');
  if (!startBtn) return;
  startBtn.classList.toggle('is-ready', mode === 'ready');
  startBtn.classList.toggle('is-running', mode === 'running');
  startBtn.disabled = mode === 'running';
  startBtn.textContent = mode === 'ready' ? 'START' : mode === 'running' ? 'PLAYING' : 'START';
  document.body.classList.toggle('game-ready', mode === 'ready');
}

function setAppScreenReady() {
  showStartScreen(false);
  toggleSoundPanel(false);
  hideResult();
  hideHelp();
  hideRanking();
  cancelAnimationFrame(rafId);
  state = createInitialState();
  state.log = 'STARTボタンを押すと開始します。';
  document.getElementById('pauseBtn').disabled = true;
  document.getElementById('pauseBtn').textContent = 'PAUSE';
  document.getElementById('pauseBtn').classList.remove('is-paused');
  document.body.classList.remove('game-paused');
  audio.stopBgm();
  setStartButtonMode('ready');
  render(state);
  updateViewResultButton();
}

function hideHelp() {
  const modal = document.getElementById('helpModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

function showHelp() {
  toggleSoundPanel(false);
  const modal = document.getElementById('helpModal');
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (deviceId) return deviceId;

  if (window.crypto?.randomUUID) {
    deviceId = window.crypto.randomUUID();
  } else {
    deviceId = `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

function getSupabaseConfig() {
  const supabase = CONFIG.supabase || {};
  const url = String(supabase.url || '').replace(/\/+$/, '');
  const anonKey = String(supabase.anonKey || '').trim();
  const table = String(supabase.table || 'rankings').trim();
  if (!url || !anonKey || !table) return null;
  return { url, anonKey, table };
}

function getSupabaseHeaders(extra = {}) {
  const config = getSupabaseConfig();
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function getSupabaseEndpoint(query = '') {
  const config = getSupabaseConfig();
  return `${config.url}/rest/v1/${config.table}${query}`;
}

function normalizePlayerName(value) {
  return (value || 'Player').trim().replace(/\s+/g, ' ').slice(0, 16) || 'Player';
}

function toRankingViewEntry(entry) {
  return {
    playerName: entry.playerName || entry.name || 'Player',
    score: Number(entry.score || 0),
    bossLevel: Number(entry.bossLevel ?? entry.boss_level ?? 1),
    maxChain: Number(entry.maxChain ?? entry.max_chain ?? 0),
    updatedAt: entry.updatedAt || entry.updated_at || entry.createdAt || entry.created_at || '',
  };
}

function isBetterRankingEntry(nextEntry, currentEntry) {
  const next = toRankingViewEntry(nextEntry);
  const current = toRankingViewEntry(currentEntry);
  if (next.score !== current.score) return next.score > current.score;
  if (next.bossLevel !== current.bossLevel) return next.bossLevel > current.bossLevel;
  if (next.maxChain !== current.maxChain) return next.maxChain > current.maxChain;
  return false;
}

function compareRankingEntries(aEntry, bEntry) {
  const a = toRankingViewEntry(aEntry);
  const b = toRankingViewEntry(bEntry);
  if (b.score !== a.score) return b.score - a.score;
  if (b.bossLevel !== a.bossLevel) return b.bossLevel - a.bossLevel;
  if (b.maxChain !== a.maxChain) return b.maxChain - a.maxChain;
  return String(a.updatedAt || '').localeCompare(String(b.updatedAt || ''));
}

function sortRankingEntries(entries) {
  return [...entries].map(toRankingViewEntry).sort(compareRankingEntries);
}

function sortRankingRawEntries(entries) {
  return [...entries].sort(compareRankingEntries);
}

function getLocalRankings() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_RANKING_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalRanking(entry) {
  const rankings = getLocalRankings();
  const index = rankings.findIndex(item => item.deviceId === entry.deviceId && item.playerName === entry.playerName);
  if (index >= 0) {
    if (!isBetterRankingEntry(entry, rankings[index])) {
      return { saved: false, reason: 'not_best' };
    }
    rankings[index] = entry;
  } else {
    rankings.push(entry);
  }
  const sorted = sortRankingRawEntries(rankings).slice(0, 20);
  localStorage.setItem(LOCAL_RANKING_KEY, JSON.stringify(sorted));
  return { saved: true, reason: index >= 0 ? 'updated' : 'inserted' };
}

async function fetchSupabaseRankings() {
  if (!getSupabaseConfig()) return null;
  const query = '?select=name,score,boss_level,max_chain,updated_at&order=score.desc,boss_level.desc,max_chain.desc,updated_at.asc&limit=10';
  const response = await fetch(getSupabaseEndpoint(query), {
    method: 'GET',
    headers: getSupabaseHeaders(),
  });
  if (!response.ok) throw new Error(`Supabase ranking fetch failed: ${response.status}`);
  const rows = await response.json();
  return rows.map(toRankingViewEntry);
}

async function upsertSupabaseRanking(entry) {
  if (!getSupabaseConfig()) return null;

  const deviceId = encodeURIComponent(entry.deviceId);
  const name = encodeURIComponent(entry.playerName);
  const selectQuery = `?select=id,score,boss_level,max_chain,updated_at&device_id=eq.${deviceId}&name=eq.${name}&limit=1`;
  const existingResponse = await fetch(getSupabaseEndpoint(selectQuery), {
    method: 'GET',
    headers: getSupabaseHeaders(),
  });
  if (!existingResponse.ok) throw new Error(`Supabase ranking lookup failed: ${existingResponse.status}`);
  const existingRows = await existingResponse.json();
  const existing = existingRows[0];
  const now = new Date().toISOString();
  const payload = {
    device_id: entry.deviceId,
    name: entry.playerName,
    score: entry.score,
    boss_level: entry.bossLevel,
    max_chain: entry.maxChain,
    updated_at: now,
  };

  if (existing && !isBetterRankingEntry(entry, existing)) {
    return { saved: false, reason: 'not_best' };
  }

  if (existing) {
    const updateResponse = await fetch(getSupabaseEndpoint(`?id=eq.${encodeURIComponent(existing.id)}`), {
      method: 'PATCH',
      headers: getSupabaseHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify(payload),
    });
    if (!updateResponse.ok) throw new Error(`Supabase ranking update failed: ${updateResponse.status}`);
    return { saved: true, reason: 'updated' };
  }

  const insertResponse = await fetch(getSupabaseEndpoint(''), {
    method: 'POST',
    headers: getSupabaseHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify({ ...payload, created_at: now }),
  });
  if (!insertResponse.ok) throw new Error(`Supabase ranking insert failed: ${insertResponse.status}`);
  return { saved: true, reason: 'inserted' };
}

function renderRankingRows(rankings) {
  return `
    <div class="ranking-header" aria-hidden="true">
      <span></span>
      <span>NAME</span>
      <span>BOSS</span>
      <span>CHAIN</span>
      <span>SCORE</span>
    </div>
  ` + rankings.map((entry, index) => `
    <div class="ranking-row">
      <span class="ranking-rank">#${index + 1}</span>
      <span class="ranking-name">${escapeHtml(entry.playerName || 'Player')}</span>
      <span class="ranking-boss"><span class="ranking-label">BOSS</span> Lv.${entry.bossLevel || 1}</span>
      <span class="ranking-chain"><span class="ranking-label">CHAIN</span> ${entry.maxChain || 0}</span>
      <span class="ranking-score"><span class="ranking-label">SCORE</span> ${Number(entry.score || 0).toLocaleString()}</span>
    </div>
  `).join('');
}

function setRankingNote(message) {
  const note = document.getElementById('rankingNote');
  if (note) note.textContent = message;
}

async function renderRankingList() {
  const list = document.getElementById('rankingList');
  if (!list) return;
  list.innerHTML = '<div class="ranking-empty">ランキングを読み込み中...</div>';

  try {
    const onlineRankings = await fetchSupabaseRankings();
    if (onlineRankings) {
      const rankings = sortRankingEntries(onlineRankings).slice(0, RANKING_LIMIT);
      setRankingNote('オンラインランキングを表示中です。');
      list.innerHTML = rankings.length ? renderRankingRows(rankings) : '<div class="ranking-empty">まだ登録されたスコアはありません。</div>';
      return;
    }
  } catch (error) {
    console.warn(error);
    setRankingNote('オンラインランキングを取得できないため、端末内ランキングを表示しています。');
  }

  const rankings = sortRankingEntries(getLocalRankings()).slice(0, RANKING_LIMIT);
  if (rankings.length === 0) {
    list.innerHTML = '<div class="ranking-empty">まだ登録されたスコアはありません。</div>';
    return;
  }
  if (!getSupabaseConfig()) setRankingNote('Supabase未設定のため、端末内ランキングを表示しています。');
  list.innerHTML = renderRankingRows(rankings);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

function hideRanking() {
  const modal = document.getElementById('rankingModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

function showRanking() {
  toggleSoundPanel(false);
  renderRankingList();
  const modal = document.getElementById('rankingModal');
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

function toggleSoundPanel(forceOpen = null) {
  const shouldOpen = forceOpen === null ? !document.body.classList.contains('sound-open') : forceOpen;
  document.body.classList.toggle('sound-open', shouldOpen);
  const soundBtn = document.getElementById('soundBtn');
  if (soundBtn) soundBtn.classList.toggle('is-open', shouldOpen);
  if (shouldOpen && state?.running && !state.gameOver) {
    setPausedState(true, 'PAUSED: MENU open. Tap the board or RESUME to continue.');
    render(state);
  }
}

function handleBoardTapStartResume() {
  if (!state) return;
  if (!state.running || state.gameOver) {
    startGame();
    return;
  }
  if (state.paused) {
    toggleSoundPanel(false);
    setPausedState(false, 'Battle resumed!');
    lastTimestamp = performance.now();
    loop(lastTimestamp);
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
  hideHelp();
  hideRanking();

  // Ready状態の盤面・現在ぷよ・NEXTぷよをそのまま使って開始する。
  // ゲームオーバー後のリトライ時だけ新しいstateを生成する。
  if (state.gameOver) {
    state = createInitialState();
  }

  cancelAnimationFrame(rafId);
  state.running = true;
  state.paused = false;
  state.gameOver = false;
  state.log = 'Battle Start!';
  document.getElementById('pauseBtn').disabled = false;
  document.getElementById('pauseBtn').textContent = 'PAUSE';
  document.getElementById('pauseBtn').classList.remove('is-paused');
  document.body.classList.remove('game-paused');
  setStartButtonMode('running');
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
  hideHelp();
  hideRanking();
  showStartScreen(true);
  toggleSoundPanel(false);
  cancelAnimationFrame(rafId);
  state = createInitialState();
  document.getElementById('pauseBtn').disabled = true;
  document.getElementById('pauseBtn').textContent = 'PAUSE';
  document.getElementById('pauseBtn').classList.remove('is-paused');
  document.body.classList.remove('game-paused');
  setStartButtonMode('default');
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
  setStartButtonMode('ready');
  audio.playSe(reason === 'FULL_TIME' ? 'win' : 'gameOver');
  audio.stopBgm();
  render(state);
  updateViewResultButton();
}

async function submitLocalRanking() {
  if (!state?.gameOver || !state.result) return;
  const input = document.getElementById('playerNameInput');
  const status = document.getElementById('rankingStatus');
  const button = document.getElementById('submitRankingBtn');
  const name = normalizePlayerName(input.value);
  input.value = name;
  localStorage.setItem(PLAYER_NAME_KEY, name);

  const entry = {
    deviceId: getDeviceId(),
    playerName: name,
    score: Math.floor(state.score),
    bossLevel: state.boss.level,
    defeatedCount: state.defeatedCount,
    maxChain: state.maxChain,
    result: state.result.label,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  if (button) button.disabled = true;
  if (status) status.textContent = 'ランキング送信中...';

  const localResult = saveLocalRanking(entry);

  try {
    const onlineResult = await upsertSupabaseRanking(entry);
    if (onlineResult) {
      if (status) {
        status.textContent = onlineResult.saved
          ? 'ONLINE RANKING SAVED.'
          : '自己ベスト未満のため、オンラインランキングは更新されませんでした。';
      }
    } else if (status) {
      status.textContent = localResult.saved
        ? 'LOCAL RANKING SAVED. Supabaseを設定するとオンライン登録されます。'
        : '自己ベスト未満のため、ローカルランキングは更新されませんでした。';
    }
  } catch (error) {
    console.warn(error);
    if (status) {
      status.textContent = localResult.saved
        ? 'オンライン送信に失敗しました。端末内ランキングには保存しました。'
        : 'オンライン送信に失敗しました。自己ベスト未満のため端末内ランキングも更新されませんでした。';
    }
  } finally {
    if (button) button.disabled = false;
    renderRankingList();
  }
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
  await preloadAssets();
  bindElements();
  state = createInitialState();
  await audio.init();
  render(state);
  updateViewResultButton();

  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('startScreenBtn').addEventListener('click', setAppScreenReady);
  document.getElementById('soundBtn').addEventListener('click', event => {
    event.stopPropagation();
    toggleSoundPanel();
  });
  document.getElementById('board').addEventListener('click', handleBoardTapStartResume);
  document.getElementById('homeRankingBtn').addEventListener('click', showRanking);
  document.getElementById('howToBtn').addEventListener('click', showHelp);
  document.getElementById('viewRankingBtn').addEventListener('click', showRanking);
  document.getElementById('closeHelpBtn').addEventListener('click', hideHelp);
  document.getElementById('closeRankingBtn').addEventListener('click', hideRanking);
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
  document.addEventListener('click', event => {
    if (!document.body.classList.contains('sound-open')) return;
    const panel = document.getElementById('audioControls');
    const button = document.getElementById('soundBtn');
    if (panel?.contains(event.target) || button?.contains(event.target)) return;
    toggleSoundPanel(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('sound-open')) {
      toggleSoundPanel(false);
    }
  });
}

init();
