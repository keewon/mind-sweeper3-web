class Game {
  constructor() {
    this.rows = 0;
    this.cols = 0;
    this.totalMines = 0;
    this.board = [];
    this.minesPlaced = false;
    this.gameOver = false;
    this.won = false;
    this.markedCount = 0;
    this.revealedCount = 0;
    this.onCellUpdate = null;
    this.onGameOver = null;
    this.onWin = null;
  }

  init(rows, cols, mines) {
    this.rows = rows;
    this.cols = cols;
    this.totalMines = mines;
    this.minesPlaced = false;
    this.gameOver = false;
    this.won = false;
    this.markedCount = 0;
    this.revealedCount = 0;
    this.board = [];

    for (let r = 0; r < rows; r++) {
      this.board[r] = [];
      for (let c = 0; c < cols; c++) {
        this.board[r][c] = {
          mine: false,
          number: 0,
          state: 'hidden', // 'hidden' | 'revealed' | 'marked' | 'questioned'
        };
      }
    }
  }

  placeMines(firstRow, firstCol) {
    if (this.minesPlaced) return;
    this.minesPlaced = true;

    const safeCells = new Set();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = firstRow + dr;
        const c = firstCol + dc;
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          safeCells.add(r * this.cols + c);
        }
      }
    }

    let placed = 0;
    while (placed < this.totalMines) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      const idx = r * this.cols + c;
      if (!safeCells.has(idx) && !this.board[r][c].mine) {
        this.board[r][c].mine = true;
        placed++;
      }
    }

    this.calculateNumbers();
  }

  calculateNumbers() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c].mine) continue;
        let count = 0;
        this.forEachNeighbor(r, c, (nr, nc) => {
          if (this.board[nr][nc].mine) count++;
        });
        this.board[r][c].number = count;
      }
    }
  }

  forEachNeighbor(row, col, callback) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          callback(nr, nc);
        }
      }
    }
  }

  open(row, col) {
    if (this.gameOver) return 0;

    if (!this.minesPlaced) {
      this.placeMines(row, col);
    }

    const cell = this.board[row][col];
    if (cell.state !== 'hidden' && cell.state !== 'questioned') return 0;

    if (cell.mine) {
      cell.state = 'revealed';
      this.gameOver = true;
      this.won = false;
      if (this.onCellUpdate) this.onCellUpdate(row, col);
      if (this.onGameOver) this.onGameOver(row, col);
      return -1;
    }

    const before = this.revealedCount;
    this._floodReveal(row, col);
    this.checkWin();
    return this.revealedCount - before;
  }

  _floodReveal(row, col) {
    const cell = this.board[row][col];
    if ((cell.state !== 'hidden' && cell.state !== 'questioned') || cell.mine) return;

    cell.state = 'revealed';
    this.revealedCount++;
    if (this.onCellUpdate) this.onCellUpdate(row, col);

    if (cell.number === 0) {
      this.forEachNeighbor(row, col, (nr, nc) => {
        this._floodReveal(nr, nc);
      });
    }
  }

  toggleMark(row, col) {
    if (this.gameOver) return false;

    const cell = this.board[row][col];
    if (cell.state === 'revealed' || cell.state === 'questioned') return false;

    if (cell.state === 'hidden') {
      cell.state = 'marked';
      this.markedCount++;
    } else {
      cell.state = 'hidden';
      this.markedCount--;
    }

    if (this.onCellUpdate) this.onCellUpdate(row, col);
    return true;
  }

  toggleQuestion(row, col) {
    if (this.gameOver) return false;

    const cell = this.board[row][col];
    if (cell.state === 'revealed' || cell.state === 'marked') return false;

    if (cell.state === 'hidden') {
      cell.state = 'questioned';
    } else {
      cell.state = 'hidden';
    }

    if (this.onCellUpdate) this.onCellUpdate(row, col);
    return true;
  }

  chord(row, col) {
    if (this.gameOver) return 0;

    const cell = this.board[row][col];
    if (cell.state !== 'revealed' || cell.number === 0) return 0;

    let markedCount = 0;
    this.forEachNeighbor(row, col, (nr, nc) => {
      if (this.board[nr][nc].state === 'marked') markedCount++;
    });

    if (markedCount !== cell.number) return 0;

    // Open all hidden neighbors
    const before = this.revealedCount;
    const toOpen = [];
    this.forEachNeighbor(row, col, (nr, nc) => {
      if (this.board[nr][nc].state === 'hidden') {
        toOpen.push([nr, nc]);
      }
    });

    for (const [nr, nc] of toOpen) {
      if (this.board[nr][nc].mine) {
        this.board[nr][nc].state = 'revealed';
        this.gameOver = true;
        this.won = false;
        if (this.onCellUpdate) this.onCellUpdate(nr, nc);
        if (this.onGameOver) this.onGameOver(nr, nc);
        return -1;
      }
      this._floodReveal(nr, nc);
    }

    this.checkWin();
    return this.revealedCount - before;
  }

  canChord(row, col) {
    const cell = this.board[row][col];
    if (cell.state !== 'revealed' || cell.number === 0) return false;

    let markedCount = 0;
    let hiddenCount = 0;
    this.forEachNeighbor(row, col, (nr, nc) => {
      const n = this.board[nr][nc];
      if (n.state === 'marked') markedCount++;
      if (n.state === 'hidden') hiddenCount++;
    });

    return markedCount === cell.number && hiddenCount > 0;
  }

  checkWin() {
    const totalCells = this.rows * this.cols;
    const nonMineCells = totalCells - this.totalMines;

    if (this.revealedCount === nonMineCells) {
      this.gameOver = true;
      this.won = true;
      if (this.onWin) this.onWin();
    }
  }

  getCell(row, col) {
    return this.board[row][col];
  }

  getRemainingMines() {
    return this.totalMines - this.markedCount;
  }

  getCellDescription(row, col) {
    const cell = this.board[row][col];
    if (cell.state === 'marked') return t('cellFlag');
    if (cell.state === 'questioned') return t('cellQuestion');
    if (cell.state === 'hidden') return t('cellHidden');
    if (cell.mine) return t('cellMine');
    if (cell.number === 0) return t('cellEmpty');
    return `${cell.number}`;
  }
}
