import { CONFIG, TYPE_KEYS } from './config.js';

export function createEmptyBoard() {
  return Array.from({ length: CONFIG.board.height }, () => Array(CONFIG.board.width).fill(null));
}

export function randomType() {
  return TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)];
}

export function createPiece() {
  return {
    pivot: { x: Math.floor(CONFIG.board.width / 2), y: 0, type: randomType() },
    child: { x: Math.floor(CONFIG.board.width / 2), y: 1, type: randomType() },
    rotation: 2,
  };
}

export function clonePiece(piece) {
  return {
    pivot: { ...piece.pivot },
    child: { ...piece.child },
    rotation: piece.rotation,
  };
}

export function isInside(x, y) {
  return x >= 0 && x < CONFIG.board.width && y >= 0 && y < CONFIG.board.height;
}

export function canPlace(board, piece) {
  for (const cell of [piece.pivot, piece.child]) {
    if (!isInside(cell.x, cell.y)) return false;
    if (board[cell.y][cell.x]) return false;
  }
  return true;
}

export function movePiece(piece, dx, dy) {
  const next = clonePiece(piece);
  next.pivot.x += dx;
  next.pivot.y += dy;
  next.child.x += dx;
  next.child.y += dy;
  return next;
}

export function rotatePiece(piece) {
  const next = clonePiece(piece);
  next.rotation = (next.rotation + 1) % 4;
  const offsets = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];
  const offset = offsets[next.rotation];
  next.child.x = next.pivot.x + offset.x;
  next.child.y = next.pivot.y + offset.y;
  return next;
}

export function lockPiece(board, piece) {
  const newBoard = board.map(row => [...row]);
  for (const cell of [piece.pivot, piece.child]) {
    if (isInside(cell.x, cell.y)) {
      newBoard[cell.y][cell.x] = { type: cell.type };
    }
  }
  return newBoard;
}

export function findGroups(board) {
  const visited = Array.from({ length: CONFIG.board.height }, () => Array(CONFIG.board.width).fill(false));
  const groups = [];

  for (let y = 0; y < CONFIG.board.height; y++) {
    for (let x = 0; x < CONFIG.board.width; x++) {
      const cell = board[y][x];
      if (!cell || visited[y][x]) continue;

      const stack = [{ x, y }];
      const group = [];
      visited[y][x] = true;

      while (stack.length) {
        const current = stack.pop();
        group.push(current);
        const neighbors = [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 },
        ];

        for (const next of neighbors) {
          if (!isInside(next.x, next.y)) continue;
          if (visited[next.y][next.x]) continue;
          const nextCell = board[next.y][next.x];
          if (!nextCell || nextCell.type !== cell.type) continue;
          visited[next.y][next.x] = true;
          stack.push(next);
        }
      }

      if (group.length >= CONFIG.board.eraseCount) {
        groups.push({ type: cell.type, cells: group });
      }
    }
  }

  return groups;
}

export function clearGroups(board, groups) {
  const newBoard = board.map(row => [...row]);
  const clearedByType = {};
  for (const group of groups) {
    clearedByType[group.type] = (clearedByType[group.type] || 0) + group.cells.length;
    for (const cell of group.cells) {
      newBoard[cell.y][cell.x] = null;
    }
  }
  return { board: newBoard, clearedByType };
}

export function applyGravity(board) {
  const newBoard = createEmptyBoard();
  for (let x = 0; x < CONFIG.board.width; x++) {
    let writeY = CONFIG.board.height - 1;
    for (let y = CONFIG.board.height - 1; y >= 0; y--) {
      if (board[y][x]) {
        newBoard[writeY][x] = board[y][x];
        writeY--;
      }
    }
  }
  return newBoard;
}
