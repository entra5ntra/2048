// 初始化变量
let touchStartX = 0, touchStartY = 0;
let board = [];
let score = 0; // 分数
const size = 4;
const container = document.getElementById('grid-container');
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restart-btn');
// 添加合成动画和音效

// 创建音效对象
const mergeSound = new Audio('merge.mp3');
// 重置游戏
restartBtn.addEventListener('click', () => {
  score = 0;
  startGame();
});

// 触摸事件（手机端）
container.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});
container.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
    if (dx > 0) move('right'); else move('left');
  } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30) {
    if (dy > 0) move('down'); else move('up');
  }
});

// 键盘方向键事件（电脑端）
document.addEventListener('keydown', e => {
  if (e.key.startsWith('Arrow')) {
    const dir = e.key.replace('Arrow', '').toLowerCase();
    move(dir);
  }
});

function initBoard() {
  board = [];
  container.innerHTML = '';
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) {
      row.push(0);
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.gridRowStart = i + 1;
      cell.style.gridColumnStart = j + 1;
      container.appendChild(cell);
    }
    board.push(row);
  }
}

function addRandomTile() {
  const empties = [];
  board.forEach((row, i) => {
    row.forEach((val, j) => {
      if (val === 0) empties.push({ i, j });
    });
  });
  if (empties.length === 0) return false;
  const { i, j } = empties[Math.floor(Math.random() * empties.length)];
  board[i][j] = 2;
  return true;
}

function startGame() {
  initBoard();
  addRandomTile();
  addRandomTile();
  score = 0;
  updateScore();
  renderBoard();
}

startGame();

function updateScore() {
  scoreEl.textContent = score;
}

function renderBoard() {
  document.querySelectorAll('.tile').forEach(t => t.remove());

  const gap = 10;
  const tileSize = (container.clientWidth - gap * (size + 1)) / size;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const val = board[i][j];
      if (val !== 0) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.textContent = val;
        tile.style.position = 'absolute';
        tile.style.width = `${tileSize}px`;
        tile.style.height = `${tileSize}px`;
        tile.style.lineHeight = `${tileSize}px`;
        tile.style.left = `${gap + j * (tileSize + gap)}px`;
        tile.style.top = `${gap + i * (tileSize + gap)}px`;
        tile.style.textAlign = 'center';
        tile.style.background = getTileColor(val);
        container.appendChild(tile);
      }
    }
  }
}

function getTileColor(val) {
  const colors = {
    2: '#eee4da', 4: '#ede0c8', 8: '#f2b179',
    16: '#f59563', 32: '#f67c5f', 64: '#f65e3b',
    128: '#edcf72', 256: '#edcc61', 512: '#edc850',
    1024: '#edc53f', 2048: '#edc22e'
  };
  return colors[val] || '#3c3a32';
}

function slideAndMerge(line) {
  let result = line.filter(n => n !== 0);
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i] === result[i + 1]) {
      result[i] *= 2;
      score += result[i];
      result[i + 1] = 0;
    }
  }
  return result.filter(n => n !== 0).concat(Array(size).fill(0)).slice(0, size);
}

function move(direction) {
  let moved = false;
  for (let i = 0; i < size; i++) {
    let line = [];
    for (let j = 0; j < size; j++) {
      const val = (direction === 'left' || direction === 'right') ? board[i][j] : board[j][i];
      line.push(val);
    }

    if (direction === 'right' || direction === 'down') line.reverse();

    let newLine = slideAndMerge(line);

    if (direction === 'right' || direction === 'down') newLine.reverse();

    for (let j = 0; j < size; j++) {
      const target = (direction === 'left' || direction === 'right') ? board[i] : board[j];
      if (target[j] !== newLine[j]) moved = true;
      target[j] = newLine[j];
    }
  }

  if (moved) {
    addRandomTile();
    renderBoard();
    updateScore();
    if (isGameOver()) alert('Game Over!');
  }
}

function isGameOver() {
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (board[i][j] === 0) return false;
      if (j < size - 1 && board[i][j] === board[i][j + 1]) return false;
      if (i < size - 1 && board[i][j] === board[i + 1][j]) return false;
    }
  }
  return true;
}
function slideAndMerge(line) {
  let result = line.filter(n => n !== 0);
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i] === result[i + 1]) {
      result[i] *= 2;
      score += result[i];
      mergeSound.play(); // 合并时播放音效
      result[i + 1] = 0;
    }
  }
  return result.filter(n => n !== 0).concat(Array(size).fill(0)).slice(0, size);
}

function renderBoard() {
  document.querySelectorAll('.tile').forEach(t => t.remove());

  const gap = 10;
  const tileSize = (container.clientWidth - gap * (size + 1)) / size;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const val = board[i][j];
      if (val !== 0) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.textContent = val;
        tile.style.position = 'absolute';
        tile.style.width = `${tileSize}px`;
        tile.style.height = `${tileSize}px`;
        tile.style.lineHeight = `${tileSize}px`;
        tile.style.left = `${gap + j * (tileSize + gap)}px`;
        tile.style.top = `${gap + i * (tileSize + gap)}px`;
        tile.style.textAlign = 'center';
        tile.style.background = getTileColor(val);

        // 合并的时候新生 tile 添加动画 class
        if (tile.textContent !== '' && tile.textContent != 2) {
          tile.classList.add('merge');
          setTimeout(() => tile.classList.remove('merge'), 300);
        }

        container.appendChild(tile);
      }
    }
  }
}
