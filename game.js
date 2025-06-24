// 游戏主类，封装2048游戏的主要逻辑
class Game2048 {
    constructor() {
        this.gridSize = 4;  // 网格大小（4x4）
        // 获取DOM元素引用
        this.tileContainer    = document.querySelector('.tile-container');
        this.scoreDisplay     = document.getElementById('score');
        this.bestScoreDisplay = document.getElementById('best-score');
        this.messageContainer = document.querySelector('.game-message');
        this.messageText      = this.messageContainer.querySelector('p');

        // 绑定按钮事件
        document.getElementById('new-game-button').addEventListener('click', () => this.restart());
        document.getElementById('retry-button').addEventListener('click', () => this.restart());
        document.getElementById('keep-playing-button').addEventListener('click', () => this.keepPlaying());
        document.getElementById('undo-button').addEventListener('click', () => this.undo());
        document.getElementById('sound-toggle').addEventListener('click', () => {
            // 切换音效开关，并根据返回状态更新按钮图标样式
            const enabled = soundManager.toggleSound();
            document.getElementById('sound-toggle').classList.toggle('muted', !enabled);
        });

        // 绑定键盘事件（上下左右箭头 / WASD 控制方块移动）
        this.bindKeyboardEvents();
        // 绑定触摸滑动事件（移动端手势控制）
        this.bindTouchEvents();

        // 初始化游戏
        this.init();
    }

    // 初始化游戏状态
    init() {
        // 创建空白网格数据结构（4x4的二维数组）
        this.grid = this.createGrid(this.gridSize);
        this.score = 0;
        // 从本地存储获取最高分，没有则为0
        this.bestScore = this.getBestScore();
        this.over = false;              // 游戏是否结束（无可移动）
        this.won = false;              // 是否达成2048胜利
        this.keepPlayingAfterWin = false;  // 达成2048后是否点击了继续游戏

        // 更新分数显示和最高分显示
        this.updateScore();
        // 清空方块DOM容器
        this.tileContainer.innerHTML = '';
        // 隐藏游戏结束/胜利提示
        this.messageContainer.classList.remove('game-won', 'game-over');

        // 添加初始的两个数字方块
        this.addRandomTile();
        this.addRandomTile();

        // 撤销功能：初始化时清除历史记录（新游戏无法撤销先前局面）
        this.previousState = null;
    }

    // 创建size x size的空网格，初始化为全null
    createGrid(size) {
        const grid = [];
        for (let i = 0; i < size; i++) {
            grid[i] = [];
            for (let j = 0; j < size; j++) {
                grid[i][j] = null;
            }
        }
        return grid;
    }

    // 获取所有空闲单元格的坐标列表
    getEmptyCells() {
        const emptyCells = [];
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                if (this.grid[x][y] === null) {
                    // 空位记录为对象包含x,y坐标
                    emptyCells.push({ x: x, y: y });
                }
            }
        }
        return emptyCells;
    }

    // 在随机的空位置生成一个新方块（值为2或4）
    addRandomTile() {
        const emptyCells = this.getEmptyCells();
        if (emptyCells.length === 0) return;  // 没有空位，不添加

        // 从空位中随机选择一个
        const index = Math.floor(Math.random() * emptyCells.length);
        const cell = emptyCells[index];
        const value = Math.random() < 0.9 ? 2 : 4;  // 90%的概率生成2，10%生成4

        // 创建方块对象，并放入网格数据结构
        const newTile = { x: cell.x, y: cell.y, value: value };
        this.grid[cell.x][cell.y] = newTile;
        // 在页面上添加对应的方块DOM元素（带出现动画）
        this.addTile(newTile, /* isNew */ true);
    }

    // 将一个方块对象渲染到页面DOM中
    // 参数 isNew 表示是否以"新生成"动画呈现
    addTile(tile, isNew = false) {
        const tileElement = document.createElement('div');
        // 设置方块的基础样式类和表示数值的类
        tileElement.classList.add('tile', `tile-${tile.value}`);
        if (isNew) {
            // 新生成的方块使用动画
            tileElement.classList.add('tile-new');
        }
        tileElement.textContent = tile.value;
        // 计算方块对应像素位置并设置
        const position = this.getPositionFromCoords(tile.x, tile.y);
        tileElement.style.left = `${position.left}px`;
        tileElement.style.top = `${position.top}px`;
        // 将方块元素添加到页面
        this.tileContainer.appendChild(tileElement);
        // 关联方块对象与DOM元素，方便后续更新
        tile.element = tileElement;
    }

    // 通过网格坐标计算方块的像素位置
    getPositionFromCoords(x, y) {
        const padding = 15;         // 容器内边距px
        const gap = 15;             // 网格间隙px（单元格之间以及单元格与容器边缘）
        // 计算单元格的像素大小
        const cellSize = (this.tileContainer.clientWidth - 2 * padding - (this.gridSize - 1) * gap) / this.gridSize;
        // 直接返回格子左上角像素位置
        return {
            left: padding + y * (cellSize + gap),
            top:  padding + x * (cellSize + gap)
        };
    }

    // 执行一次移动操作（direction取值：'up'/'right'/'down'/'left'）
    move(direction) {
        // 如果游戏已经结束，或已经赢且未选择继续游戏，则不处理输入
        if (this.over || (this.won && !this.keepPlayingAfterWin)) {
            return;
        }

        // 每次移动前，移除所有方块的动画类，以便重新应用动画效果
        const animatedTiles = this.tileContainer.querySelectorAll('.tile');
        animatedTiles.forEach(tile => tile.classList.remove('tile-new', 'tile-merged', 'tile-super-merged'));

        // 保存移动前的状态，以支持撤销操作
        const prevGridState = this.grid.map(row => row.map(cell => {
            if (cell) {
                // 仅保存必要的数据（坐标和值），不保存DOM引用
                return { x: cell.x, y: cell.y, value: cell.value };
            }
            return null;
        }));
        const prevScore = this.score;
        const prevOver = this.over;
        const prevWon = this.won;
        const prevKeepPlaying = this.keepPlayingAfterWin;

        let moved = false;  // 标记是否发生移动或合并
        const vector = this.getVector(direction);            // 移动方向对应的坐标变化向量
        const traversals = this.buildTraversals(vector);     // 按照移动方向生成遍历顺序

        // 辅助记录：标记本次移动中哪些位置已经发生过合并，避免二次合并
        const mergedPositions = this.createGrid(this.gridSize);  // 布尔矩阵，初始全为null表示未合并

        // 按照计算好的遍历顺序逐格处理
        traversals.x.forEach(x => {
            traversals.y.forEach(y => {
                const tile = this.grid[x][y];
                if (!tile) return;  // 空位跳过

                // 找到当前方块在移动方向上能走到的最远位置
                const positions = this.findFarthestPosition({ x: x, y: y }, vector);
                const next = positions.next;  // 下一位置（可能存在需要合并的方块）
                const farthest = positions.farthest;

                const nextTile = next ? this.grid[next.x][next.y] : null;
                if (nextTile && !mergedPositions[next.x][next.y] && nextTile.value === tile.value) {
                    // **执行合并**：与下一个相同值的方块合并
                    // 合并产生的新值
                    const newValue = tile.value * 2;
                    // 更新目标方块数据
                    nextTile.value = newValue;
                    this.grid[x][y] = null;               // 清空原位置
                    mergedPositions[next.x][next.y] = true;  // 标记该位置已合并过

                    // 更新得分
                    this.score += newValue;
                    if (newValue === 2048) {
                        this.won = true;  // 达成2048，标记胜利（稍后显示提示）
                    }

                    // 更新目标方块的DOM显示（新值和动画效果）
                    nextTile.element.textContent = newValue;
                    nextTile.element.classList.remove(`tile-${tile.value}`);
                    nextTile.element.classList.add(`tile-${newValue}`, 'tile-merged');

                    // 移除被合并的方块DOM
                    tile.element.remove();
                    this.grid[farthest.x][farthest.y] = null;  // 确保源位置为空（tile已移走）
                    moved = true;
                    // 播放合并音效
                    soundManager.play('merge');
                } else {
                    // **执行移动**：将方块移动到最远可达的位置
                    if (farthest.x !== x || farthest.y !== y) {
                        // 更新数据结构：从旧位置移除，放到新位置
                        this.grid[x][y] = null;
                        tile.x = farthest.x;
                        tile.y = farthest.y;
                        this.grid[farthest.x][farthest.y] = tile;
                        // 更新DOM元素的位置样式，将方块元素移动到新坐标
                        const newPosition = this.getPositionFromCoords(tile.x, tile.y);
                        tile.element.style.left = `${newPosition.left}px`;
                        tile.element.style.top = `${newPosition.top}px`;
                        moved = true;
                    }
                    // 注意：如果方块未移动，则其DOM保持原位，无需更新
                }
            });
        });

        // 移动完成后，如有改变则新增一个随机方块，并更新游戏状态
        if (moved) {
            // 将本次移动前的状态保存，供撤销功能使用
            this.previousState = {
                grid: prevGridState,
                score: prevScore,
                over: prevOver,
                won: prevWon,
                keepPlaying: prevKeepPlaying
            };
            // 方块移动动画持续150ms，稍后再添加新方块，使动画更流畅
            setTimeout(() => {
                this.addRandomTile();
                this.updateScore();
                // 检查是否还有可移动步骤，没有则游戏结束
                if (!this.movesAvailable()) {
                    this.over = true;
                }
                // 更新游戏胜利/结束状态显示
                this.updateGameState();
                // 新方块出现时播放音效
                soundManager.play('newTile');
            }, 150);
            // 移动音效（滑动）在按键操作后立即播放
            soundManager.play('move');
        }
    }

    // 根据方向获取遍历的起始顺序（保证移动或合并按正确顺序进行）
    getVector(direction) {
        // 方向到位移向量的映射
        const map = {
            'up':    { x: -1, y: 0 },
            'right': { x: 0,  y: 1 },
            'down':  { x: 1,  y: 0 },
            'left':  { x: 0,  y: -1 }
        };
        return map[direction];
    }

    // 计算遍历顺序：根据移动方向，决定坐标遍历的先后顺序
    buildTraversals(vector) {
        const traversals = { x: [], y: [] };
        // 默认按0,1,2,3顺序
        for (let i = 0; i < this.gridSize; i++) {
            traversals.x.push(i);
            traversals.y.push(i);
        }
        // 如果向下移动，则先遍历底部行（x反转）
        if (vector.x === 1) traversals.x.reverse();
        // 如果向右移动，则先遍历最右列（y反转）
        if (vector.y === 1) traversals.y.reverse();
        return traversals;
    }

    // 从当前位置沿给定方向，找到方块能到达的最远位置和下一个碰撞位置
    findFarthestPosition(position, vector) {
        let previous;
        let cell = { x: position.x, y: position.y };
        // 不断朝向量方向移动，直到碰到边界或非空单元格
        do {
            previous = cell;
            cell = { x: previous.x + vector.x, y: previous.y + vector.y };
        } while (this.withinBounds(cell) && this.grid[cell.x][cell.y] === null);
        // 返回最远的空位，以及该方向上遇到的第一个非空位置（可能用于合并）
        return {
            farthest: previous,
            next: this.withinBounds(cell) ? cell : null
        };
    }

    // 判断给定位置是否在网格范围内
    withinBounds(position) {
        return position.x >= 0 && position.x < this.gridSize &&
               position.y >= 0 && position.y < this.gridSize;
    }

    // 判断当前是否存在可移动或可合并的方块（用于检查游戏是否结束）
    movesAvailable() {
        // 如果还有空位，则有可移动空间
        if (this.getEmptyCells().length > 0) {
            return true;
        }
        // 检查所有相邻方块是否存在相同的值可合并
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const tile = this.grid[x][y];
                if (!tile) continue;
                // 检查四个方向
                for (const direction of ['up', 'right', 'down', 'left']) {
                    const vector = this.getVector(direction);
                    const neighborPos = { x: x + vector.x, y: y + vector.y };
                    if (this.withinBounds(neighborPos)) {
                        const neighborTile = this.grid[neighborPos.x][neighborPos.y];
                        if (neighborTile && neighborTile.value === tile.value) {
                            // 存在相同邻居，可合并
                            return true;
                        }
                    }
                }
            }
        }
        // 没有空位且无可合并邻居
        return false;
    }

    // 更新游戏状态（胜利或失败时显示提示信息）
    updateGameState() {
        if (this.over) {
            // 游戏结束
            this.messageText.textContent = '游戏结束！';
            this.messageContainer.classList.add('game-over');
            // 播放游戏结束音效
            soundManager.play('gameOver');
        } else if (this.won && !this.keepPlayingAfterWin) {
            // 达成2048并且尚未继续游戏
            this.messageText.textContent = '恭喜，你赢了！';
            this.messageContainer.classList.add('game-won');
            // 播放胜利音效
            soundManager.play('win');
        }
        // 如果赢了且玩家选择继续，则不显示提示（游戏继续进行）
    }

    // 点击"继续游戏"按钮后调用，允许游戏在胜利后继续
    keepPlaying() {
        this.keepPlayingAfterWin = true;
        this.messageContainer.classList.remove('game-won');
    }

    // 重新开始游戏：重置状态并初始化
    restart() {
        this.init();
    }

    // 撤销上一步操作：恢复到上一次移动之前的状态
    undo() {
        // 如果没有可撤销的状态，直接返回
        if (!this.previousState) {
            return;
        }
        // 从记录的前一状态恢复网格和分数等
        this.grid = this.previousState.grid.map(row => row.map(cell => {
            if (cell) {
                // 恢复时重新创建方块对象（不包含DOM元素引用）
                return { x: cell.x, y: cell.y, value: cell.value };
            }
            return null;
        }));
        this.score = this.previousState.score;
        this.over = this.previousState.over;
        this.won = this.previousState.won;
        this.keepPlayingAfterWin = this.previousState.keepPlaying;

        // 清空当前方块DOM并根据恢复的网格状态重新绘制方块
        this.tileContainer.innerHTML = '';
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const tile = this.grid[x][y];
                if (tile) {
                    // 重新为每个存在的方块添加DOM元素（撤销不播放新出现动画）
                    this.addTile(tile, /* isNew */ false);
                }
            }
        }

        // 更新分数显示（最高分不回退，只显示历史最高）
        this.updateScore();
        // 隐藏游戏结束/胜利消息（如果有的话）
        this.messageContainer.classList.remove('game-won', 'game-over');
        // 撤销完成后，清除 previousState，避免连续多次撤销跳变
        this.previousState = null;
    }

    // 更新分数和最高分显示
    updateScore() {
        this.scoreDisplay.textContent = this.score;
        // 如当前分数超过最高分，则更新最高分
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreDisplay.textContent = this.bestScore;
            this.saveBestScore();
        }
    }

    // 将最高分保存到浏览器本地存储
    saveBestScore() {
        localStorage.setItem('bestScore2048', this.bestScore);
    }

    // 从本地存储获取最高分记录
    getBestScore() {
        const best = localStorage.getItem('bestScore2048');
        return best ? parseInt(best) : 0;
    }

    // 绑定键盘事件：监听方向键和WASD按键
    bindKeyboardEvents() {
        document.addEventListener('keydown', event => {
            const keyMap = {
                'ArrowUp':    'up',
                'ArrowRight': 'right',
                'ArrowDown':  'down',
                'ArrowLeft':  'left',
                'w': 'up', 'W': 'up',
                'd': 'right', 'D': 'right',
                's': 'down', 'S': 'down',
                'a': 'left', 'A': 'left'
            };
            const direction = keyMap[event.key];
            if (direction) {
                event.preventDefault();  // 阻止页面滚动等默认行为
                this.move(direction);
            }
        });
    }

    // 绑定触摸事件（移动端）：根据滑动方向移动方块
    bindTouchEvents() {
        let touchStartX, touchStartY;
        // 将触摸事件监听器绑定到document而不是游戏容器
        document.addEventListener('touchstart', event => {
            if (!event.touches.length) return;
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', event => {
            if (touchStartX === undefined || touchStartY === undefined) return;
            const touchEndX = event.changedTouches[0].clientX;
            const touchEndY = event.changedTouches[0].clientY;
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;
            
            // 设置最小滑动距离阈值，避免误触
            const minSwipeDistance = 10;
            
            // 根据滑动水平或垂直距离判断移动方向
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipeDistance) {
                // 水平滑动
                this.move(dx > 0 ? 'right' : 'left');
            } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipeDistance) {
                // 垂直滑动
                this.move(dy > 0 ? 'down' : 'up');
            }
            
            // 重置起始坐标
            touchStartX = undefined;
            touchStartY = undefined;
        }, { passive: true });

        // 阻止文档的默认触摸行为，防止滚动干扰游戏
        document.addEventListener('touchmove', event => {
            if (event.touches.length) {
                event.preventDefault();
            }
        }, { passive: false });
    }
}

// 当页面加载完成后，创建游戏实例开始游戏
document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
