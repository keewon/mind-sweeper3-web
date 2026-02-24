class GameUI {
  constructor(game) {
    this.game = game;
    this.mode = 'normal';
    this.selectedRow = -1;
    this.selectedCol = -1;
    this.cellElements = [];
    this.timerInterval = null;
    this.seconds = 0;
    this.timerStarted = false;

    this.boardContainer = document.getElementById('board-container');
    this.btnOpen = document.getElementById('btn-open');
    this.btnMark = document.getElementById('btn-mark');
    this.btnQuestion = document.getElementById('btn-question');
    this.mineNum = document.getElementById('mine-num');
    this.timerDisplay = document.getElementById('timer-display');
    this.gameInfo = document.querySelector('.game-info');
    this.headerWin = document.getElementById('header-win');
    this.headerWinText = document.getElementById('header-win-text');
    this.headerWinTime = document.getElementById('header-win-time');
    this.headerLose = document.getElementById('header-lose');

    this._bindActions();
    this._setupGameCallbacks();
  }

  _bindActions() {
    this.btnOpen.addEventListener('click', () => this._handleOpen());
    this.btnMark.addEventListener('click', () => this._handleMark());
    this.btnQuestion.addEventListener('click', () => this._handleQuestion());
  }

  _setupGameCallbacks() {
    this.game.onCellUpdate = (r, c) => this._renderCell(r, c);
    this.game.onGameOver = (r, c) => this._showGameOver(r, c);
    this.game.onWin = () => this._showWin();
  }

  startGame(mode) {
    this.mode = mode;
    this.selectedRow = -1;
    this.selectedCol = -1;
    this.seconds = 0;
    this.timerStarted = false;
    this._stopTimer();

    this.game.init(9, 9, 10);
    this._renderBoard();
    this._selectCell(0, 0);
    this.cellElements[0][0].focus();
    this._updateInfo();
    this._updateMineCount();
    this.timerDisplay.textContent = '00:00';
    this.gameInfo.style.display = '';
    this.headerWin.classList.add('hidden');
    this.headerLose.classList.add('hidden');
  }

  _renderBoard() {
    this.boardContainer.innerHTML = '';
    this.cellElements = [];

    const grid = document.createElement('div');
    grid.className = 'board-grid';
    grid.setAttribute('role', 'grid');

    const containerRect = this.boardContainer.getBoundingClientRect();
    const gridOverhead = 4 + 2 * 8;
    const availableW = containerRect.width - 16 - gridOverhead;
    const availableH = containerRect.height - 16 - gridOverhead;
    const cellSize = Math.floor(Math.min(availableW / 9, availableH / 9, 44));

    grid.style.gridTemplateColumns = `repeat(9, ${cellSize}px)`;
    grid.style.gridTemplateRows = `repeat(9, ${cellSize}px)`;

    const LONG_PRESS_MS = 400;

    for (let r = 0; r < 9; r++) {
      this.cellElements[r] = [];
      for (let c = 0; c < 9; c++) {
        const btn = document.createElement('button');
        btn.className = 'cell';
        btn.setAttribute('role', 'gridcell');
        btn.setAttribute('aria-label', tCellAria(r + 1, c + 1, t('ariaHidden')));
        btn.dataset.row = r;
        btn.dataset.col = c;

        const content = document.createElement('span');
        content.className = 'cell-content';
        btn.appendChild(content);

        // --- Long press / click ---
        let pressTimer = null;
        let didLongPress = false;

        const startPress = () => {
          didLongPress = false;
          pressTimer = setTimeout(() => {
            didLongPress = true;
            this._selectCell(r, c);
            this._handleOpen();
          }, LONG_PRESS_MS);
        };

        const cancelPress = () => {
          clearTimeout(pressTimer);
        };

        btn.addEventListener('mousedown', (e) => {
          if (e.button === 0) startPress();
        });
        btn.addEventListener('mouseup', cancelPress);
        btn.addEventListener('mouseleave', cancelPress);

        btn.addEventListener('touchstart', (e) => {
          startPress();
        }, { passive: true });
        btn.addEventListener('touchend', cancelPress);
        btn.addEventListener('touchcancel', cancelPress);

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (didLongPress) { didLongPress = false; return; }
          this._selectCell(r, c);
        });

        // --- Right-click → mark ---
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this._selectCell(r, c);
          this._handleMark();
        });

        // --- Keyboard ---
        btn.addEventListener('keydown', (e) => this._handleCellKeydown(e, r, c));

        this.cellElements[r][c] = btn;
        grid.appendChild(btn);
      }
    }

    this.boardContainer.appendChild(grid);
    this._applyVisibility();
  }

  _handleCellKeydown(e, row, col) {
    let newRow = row;
    let newCol = col;

    switch (e.key) {
      case 'ArrowUp':    case 'k': newRow = Math.max(0, row - 1); break;
      case 'ArrowDown':  case 'j': newRow = Math.min(8, row + 1); break;
      case 'ArrowLeft':  case 'h': newCol = Math.max(0, col - 1); break;
      case 'ArrowRight': case 'l': newCol = Math.min(8, col + 1); break;
      case 'd':
        e.preventDefault();
        this._selectCell(row, col);
        this._handleOpen();
        return;
      case 'f':
        e.preventDefault();
        this._selectCell(row, col);
        this._handleMark();
        return;
      default: return;
    }

    e.preventDefault();
    this._selectCell(newRow, newCol);
    this.cellElements[newRow][newCol].focus();
  }

  _selectCell(row, col) {
    if (this.game.gameOver) return;

    if (this.selectedRow >= 0 && this.selectedCol >= 0) {
      this.cellElements[this.selectedRow][this.selectedCol].classList.remove('selected');
    }

    this.selectedRow = row;
    this.selectedCol = col;
    this.cellElements[row][col].classList.add('selected');

    this._applyVisibility();
    this._updateInfo();
  }

  _handleOpen() {
    if (this.selectedRow < 0 || this.game.gameOver) return;

    const cell = this.game.getCell(this.selectedRow, this.selectedCol);

    if (!this.timerStarted) {
      this.timerStarted = true;
      this._startTimer();
    }

    let opened = 0;
    if (cell.state === 'hidden' || cell.state === 'questioned') {
      opened = this.game.open(this.selectedRow, this.selectedCol);
    } else if (cell.state === 'revealed') {
      opened = this.game.chord(this.selectedRow, this.selectedCol);
    } else {
      return;
    }

    if (opened > 2) Sound.cascade(opened);

    this._applyVisibility();
    this._updateInfo();
    this._updateMineCount();
  }

  _handleMark() {
    if (this.selectedRow < 0 || this.game.gameOver) return;

    const cell = this.game.getCell(this.selectedRow, this.selectedCol);
    if (cell.state === 'revealed') return;

    if (!this.timerStarted) {
      this.timerStarted = true;
      this._startTimer();
    }

    this.game.toggleMark(this.selectedRow, this.selectedCol);
    this._applyVisibility();
    this._updateInfo();
    this._updateMineCount();
  }

  _handleQuestion() {
    if (this.selectedRow < 0 || this.game.gameOver) return;

    const cell = this.game.getCell(this.selectedRow, this.selectedCol);
    if (cell.state === 'revealed' || cell.state === 'marked') return;

    if (!this.timerStarted) {
      this.timerStarted = true;
      this._startTimer();
    }

    this.game.toggleQuestion(this.selectedRow, this.selectedCol);
    this._applyVisibility();
    this._updateInfo();
  }

  _renderCell(row, col) {
    const cell = this.game.getCell(row, col);
    const el = this.cellElements[row][col];
    const content = el.querySelector('.cell-content');

    el.classList.remove('revealed', 'marked', 'questioned', 'mine-exploded');
    el.removeAttribute('data-number');

    if (cell.state === 'revealed') {
      el.classList.add('revealed');
      if (cell.mine) {
        content.textContent = '💣';
        el.classList.add('mine-exploded');
        el.setAttribute('aria-label', tCellAria(row + 1, col + 1, t('ariaMine')));
      } else if (cell.number > 0) {
        content.textContent = cell.number;
        el.dataset.number = cell.number;
        el.setAttribute('aria-label', tCellAria(row + 1, col + 1, cell.number));
      } else {
        content.textContent = '';
        el.setAttribute('aria-label', tCellAria(row + 1, col + 1, t('ariaEmpty')));
      }
    } else if (cell.state === 'marked') {
      el.classList.add('marked');
      content.textContent = '🚩';
      el.setAttribute('aria-label', tCellAria(row + 1, col + 1, t('ariaFlag')));
    } else if (cell.state === 'questioned') {
      el.classList.add('questioned');
      content.textContent = '?';
      el.setAttribute('aria-label', tCellAria(row + 1, col + 1, t('ariaQuestion')));
    } else {
      content.textContent = '';
      el.setAttribute('aria-label', tCellAria(row + 1, col + 1, t('ariaHidden')));
    }
  }

  _applyVisibility() {
    if (this.mode === 'normal') {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          this.cellElements[r][c].classList.remove('dark');
        }
      }
      return;
    }

    const visibleSet = this._getVisibleCells();

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const key = `${r},${c}`;
        const el = this.cellElements[r][c];

        if (visibleSet.has(key)) {
          el.classList.remove('dark');
        } else {
          el.classList.add('dark');
        }
      }
    }
  }

  _getVisibleCells() {
    const visible = new Set();

    if (this.selectedRow < 0) return visible;

    if (this.mode === 'fog1') {
      visible.add(`${this.selectedRow},${this.selectedCol}`);
    } else if (this.mode === 'fog3x3') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = this.selectedRow + dr;
          const nc = this.selectedCol + dc;
          if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
            visible.add(`${nr},${nc}`);
          }
        }
      }
    }

    return visible;
  }

  _updateInfo() {
    if (this.selectedRow < 0) {
      this.btnOpen.disabled = true;
      this.btnMark.disabled = true;
      this.btnQuestion.disabled = true;
      return;
    }

    const cell = this.game.getCell(this.selectedRow, this.selectedCol);

    const canChord = this.game.canChord(this.selectedRow, this.selectedCol);

    if (cell.state === 'hidden' || cell.state === 'questioned') {
      this.btnOpen.textContent = t('open');
      this.btnOpen.disabled = this.game.gameOver;
    } else if (canChord) {
      this.btnOpen.textContent = t('sweep');
      this.btnOpen.disabled = this.game.gameOver;
    } else {
      this.btnOpen.textContent = t('open');
      this.btnOpen.disabled = true;
    }

    const markDisabled = cell.state === 'revealed' || cell.state === 'questioned' || this.game.gameOver;
    this.btnMark.disabled = markDisabled;
    this.btnMark.textContent = cell.state === 'marked' ? t('unmark') : t('mark');

    const questionDisabled = cell.state === 'revealed' || cell.state === 'marked' || this.game.gameOver;
    this.btnQuestion.disabled = questionDisabled;
  }

  _updateMineCount() {
    this.mineNum.textContent = this.game.getRemainingMines();
  }

  _startTimer() {
    this._stopTimer();
    this.timerInterval = setInterval(() => {
      this.seconds++;
      const mins = String(Math.floor(this.seconds / 60)).padStart(2, '0');
      const secs = String(this.seconds % 60).padStart(2, '0');
      this.timerDisplay.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  _showGameOver(mineRow, mineCol) {
    Sound.lose();
    this._stopTimer();

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = this.game.getCell(r, c);
        if (cell.mine && cell.state !== 'revealed') {
          cell.state = 'revealed';
          this._renderCell(r, c);
        }
      }
    }

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        this.cellElements[r][c].classList.remove('dark');
      }
    }

    this.gameInfo.style.display = 'none';
    this.headerLose.textContent = t('headerLose');
    this.headerLose.classList.remove('hidden');

    this.btnOpen.disabled = true;
    this.btnMark.disabled = true;
    this.btnQuestion.disabled = true;
  }

  _showWin() {
    Sound.win();
    this._stopTimer();

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        this.cellElements[r][c].classList.remove('dark');
      }
    }

    const mins = String(Math.floor(this.seconds / 60)).padStart(2, '0');
    const secs = String(this.seconds % 60).padStart(2, '0');
    this.headerWinText.textContent = t('headerWin');
    this.headerWinTime.textContent = `${mins}:${secs}`;
    this.gameInfo.style.display = 'none';
    this.headerWin.classList.remove('hidden');

    this.btnOpen.disabled = true;
    this.btnMark.disabled = true;
    this.btnQuestion.disabled = true;
  }

  destroy() {
    this._stopTimer();
  }
}
