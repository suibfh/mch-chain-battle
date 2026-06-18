import { CONFIG } from './config.js';

const els = {};

export function bindElements() {
  els.board = document.getElementById('board');
  els.nextPiece = document.getElementById('nextPiece');
  els.timeText = document.getElementById('timeText');
  els.scoreText = document.getElementById('scoreText');
  els.chainText = document.getElementById('chainText');
  els.heroHpText = document.getElementById('heroHpText');
  els.heroHpBar = document.getElementById('heroHpBar');
  els.bossHpText = document.getElementById('bossHpText');
  els.bossHpBar = document.getElementById('bossHpBar');
  els.bossLevelText = document.getElementById('bossLevelText');
  els.bossNameText = document.getElementById('bossNameText');
  els.bossFaceText = document.getElementById('bossFaceText');
  els.statHpText = document.getElementById('statHpText');
  els.statPhyText = document.getElementById('statPhyText');
  els.statIntText = document.getElementById('statIntText');
  els.statAgiText = document.getElementById('statAgiText');
  els.logText = document.getElementById('logText');
  els.resultModal = document.getElementById('resultModal');
  els.resultReason = document.getElementById('resultReason');
  els.resultScore = document.getElementById('resultScore');
  els.resultBossLevel = document.getElementById('resultBossLevel');
  els.resultDefeated = document.getElementById('resultDefeated');
  els.resultMaxChain = document.getElementById('resultMaxChain');
  els.resultHp = document.getElementById('resultHp');
  els.resultPhy = document.getElementById('resultPhy');
  els.resultInt = document.getElementById('resultInt');
  els.playerNameInput = document.getElementById('playerNameInput');
  els.rankingStatus = document.getElementById('rankingStatus');
  els.heroSprite = document.getElementById('heroSprite');
  els.bossSprite = document.getElementById('bossSprite');

  els.board.style.gridTemplateColumns = `repeat(${CONFIG.board.width}, 1fr)`;
  els.board.style.gridTemplateRows = `repeat(${CONFIG.board.height}, 1fr)`;

  document.querySelectorAll('.stat-icon').forEach(img => {
    img.onerror = () => img.classList.add('is-missing');
  });
}

export function setupTouchControls(onAction, order = CONFIG.ui.touchButtonOrder) {
  const container = document.getElementById('touchControls');
  container.innerHTML = '';
  for (const action of order) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.textContent = CONFIG.ui.touchButtons[action] || action;
    button.className = `touch-button touch-${action}`;
    button.addEventListener('click', () => onAction(action));
    container.appendChild(button);
  }
}

export function render(state) {
  renderBoard(state);
  renderNext(state.nextPiece);
  renderStatus(state);
  renderResult(state);
}

function makeAssetImg(src, alt) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.loading = 'eager';
  img.draggable = false;
  img.onerror = () => {
    img.remove();
  };
  return img;
}

function makeCell(cell, isActive = false, isClearing = false) {
  const div = document.createElement('div');
  div.className = 'cell';
  if (cell) {
    const typeConfig = CONFIG.types[cell.type];
    div.classList.add('filled');
    div.style.setProperty('--cell-color', typeConfig.color);

    const label = document.createElement('span');
    label.className = 'cell-label';
    label.textContent = typeConfig.text;

    if (typeConfig.asset) {
      div.classList.add('has-image');
      const img = makeAssetImg(typeConfig.asset, typeConfig.label);
      img.className = 'cell-image';
      img.onerror = () => {
        img.remove();
        div.classList.remove('has-image');
      };
      div.appendChild(img);
    }

    div.appendChild(label);
  }
  if (isActive) div.classList.add('active');
  if (isClearing) div.classList.add('clearing');
  return div;
}

function renderBoard(state) {
  const activeMap = new Map();
  if (state.currentPiece) {
    for (const cell of [state.currentPiece.pivot, state.currentPiece.child]) {
      activeMap.set(`${cell.x},${cell.y}`, cell);
    }
  }

  els.board.innerHTML = '';
  for (let y = 0; y < CONFIG.board.height; y++) {
    for (let x = 0; x < CONFIG.board.width; x++) {
      const activeCell = activeMap.get(`${x},${y}`);
      const isClearing = state.clearingCells?.has(`${x},${y}`);
      els.board.appendChild(makeCell(activeCell || state.board[y][x], Boolean(activeCell), Boolean(isClearing)));
    }
  }
}

function renderNext(piece) {
  els.nextPiece.innerHTML = '';
  if (!piece) return;
  for (const cell of [piece.pivot, piece.child]) {
    els.nextPiece.appendChild(makeCell(cell, true));
  }
}

function bossImagePath(imageIndex) {
  return `${CONFIG.images.bossDir}/${CONFIG.images.bossPrefix}${String(imageIndex).padStart(2, '0')}.${CONFIG.images.bossExt}`;
}

function setSpriteImage(spriteEl, faceEl, src, fallbackText, alt) {
  let img = spriteEl.querySelector('.sprite-image');
  if (!img) {
    img = makeAssetImg(src, alt);
    img.className = 'sprite-image';
    spriteEl.insertBefore(img, faceEl);
  }
  if (img.src !== new URL(src, window.location.href).href) {
    img.src = src;
  }
  img.onerror = () => {
    img.remove();
    faceEl.style.display = 'grid';
  };
  img.onload = () => {
    faceEl.style.display = 'none';
  };
  faceEl.textContent = fallbackText;
}

function renderStatus(state) {
  const remaining = Math.max(0, Math.ceil(state.timeLeft));
  els.timeText.textContent = String(remaining);
  els.scoreText.textContent = Math.floor(state.score).toLocaleString();
  els.chainText.textContent = String(state.maxChain ?? 0);

  els.heroHpText.textContent = `${Math.ceil(state.hero.hp)} / ${state.hero.maxHp}`;
  els.heroHpBar.style.width = `${Math.max(0, state.hero.hp / state.hero.maxHp * 100)}%`;

  els.bossHpText.textContent = `${Math.max(0, Math.ceil(state.boss.hp))} / ${Math.ceil(state.boss.maxHp)}`;
  els.bossHpBar.style.width = `${Math.max(0, state.boss.hp / state.boss.maxHp * 100)}%`;

  els.bossLevelText.textContent = String(state.boss.level);
  const bossNo = String(state.boss.imageIndex).padStart(2, '0');
  els.bossNameText.textContent = `BOSS ${bossNo}`;
  els.bossFaceText.textContent = state.boss.powerTier > 0 ? `B${state.boss.imageIndex}+${state.boss.powerTier}` : `B${state.boss.imageIndex}`;

  setSpriteImage(els.heroSprite, els.heroSprite.querySelector('.sprite-face'), CONFIG.images.hero, 'H', 'Hero');
  setSpriteImage(els.bossSprite, els.bossFaceText, bossImagePath(state.boss.imageIndex), els.bossFaceText.textContent, 'Boss');
  els.bossSprite.dataset.powerTier = String(state.boss.powerTier);
  els.bossSprite.dataset.powerLabel = state.boss.powerTier > 0 ? `ENHANCED +${state.boss.powerTier}` : '';
  els.bossSprite.dataset.powerShortLabel = state.boss.powerTier > 0 ? `+${state.boss.powerTier}` : '';

  els.statHpText.textContent = Math.ceil(state.hero.maxHp);
  els.statPhyText.textContent = state.hero.phy.toFixed(1);
  els.statIntText.textContent = state.hero.int.toFixed(1);
  els.statAgiText.textContent = `${state.hero.attackInterval.toFixed(2)}s`;

  if (state.log) els.logText.textContent = state.log;
}


function renderResult(state) {
  if (!els.resultModal) return;
  const isOpen = Boolean(state.gameOver && state.result);
  els.resultModal.classList.toggle('is-open', isOpen);
  els.resultModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (!isOpen) return;

  els.resultReason.textContent = state.result.label;
  els.resultScore.textContent = Math.floor(state.score).toLocaleString();
  els.resultBossLevel.textContent = String(state.boss.level);
  els.resultDefeated.textContent = String(state.defeatedCount ?? 0);
  els.resultMaxChain.textContent = String(state.maxChain ?? 0);
  els.resultHp.textContent = `${Math.ceil(state.hero.hp)} / ${Math.ceil(state.hero.maxHp)}`;
  els.resultPhy.textContent = state.hero.phy.toFixed(1);
  els.resultInt.textContent = state.hero.int.toFixed(1);
}

export function hideResult() {
  if (!els.resultModal) return;
  els.resultModal.classList.remove('is-open');
  els.resultModal.setAttribute('aria-hidden', 'true');
}

export function showResult() {
  if (!els.resultModal) return;
  els.resultModal.classList.add('is-open');
  els.resultModal.setAttribute('aria-hidden', 'false');
}

export function getElement(name) {
  return els[name];
}
