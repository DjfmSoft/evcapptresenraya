/**
 * TRES EN RAYA - TIC TAC TOE
 * Arquitectura modular: SoundFx, ConfettiFx, AIEngine, GameState & UIController
 */

// ==========================================
// 1. SISTEMA DE AUDIO (Web Audio API)
// ==========================================
class SoundController {
  constructor() {
    this.audioCtx = null;
    this.isMuted = localStorage.getItem('tres_en_raya_muted') === 'true';
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('tres_en_raya_muted', this.isMuted);
    return this.isMuted;
  }

  playTone(freq, type = 'sine', duration = 0.1, startTime = 0, gainLevel = 0.15) {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime + startTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainLevel, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio fallback silencioso
    }
  }

  playMove(player) {
    if (player === 'X') {
      this.playTone(523.25, 'triangle', 0.12, 0, 0.2); // C5
    } else {
      this.playTone(392.00, 'triangle', 0.12, 0, 0.2); // G4
    }
  }

  playWin() {
    if (this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'sine', 0.22, idx * 0.1, 0.18);
    });
  }

  playTie() {
    if (this.isMuted) return;
    const notes = [440, 392, 349.23]; // A4, G4, F4
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'sine', 0.18, idx * 0.12, 0.15);
    });
  }

  playClick() {
    this.playTone(800, 'triangle', 0.04, 0, 0.08);
  }
}

// ==========================================
// 2. SISTEMA DE CONFETI (HTML5 Canvas)
// ==========================================
class ConfettiController {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.animationId = null;
    this.colors = ['#00f2fe', '#ff2a85', '#fbbf24', '#ffffff', '#4facfe', '#a855f7'];

    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(count = 75) {
    if (!this.canvas || !this.ctx) return;
    this.stop();
    this.resize();

    const originX = this.canvas.width / 2;
    const originY = this.canvas.height * 0.45;

    this.particles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 12;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: 5 + Math.random() * 7,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
        life: 0.98 + Math.random() * 0.015
      });
    }

    this.animate();
  }

  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // Gravedad
      p.vx *= 0.98; // Resistencia al aire
      p.rotation += p.rotationSpeed;
      p.opacity *= p.life;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();

      if (p.opacity < 0.02 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.stop();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.particles = [];
  }
}

// ==========================================
// 3. MOTOR DE INTELIGENCIA ARTIFICIAL (Minimax)
// ==========================================
const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
  [0, 4, 8], [2, 4, 6]             // Diagonales
];

class AIEngine {
  static checkWinner(board) {
    for (const combo of WIN_COMBOS) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], combo };
      }
    }
    if (board.every(cell => cell !== null)) {
      return { winner: 'tie', combo: null };
    }
    return null;
  }

  static getAvailableMoves(board) {
    const moves = [];
    for (let i = 0; i < board.length; i++) {
      if (board[i] === null) moves.push(i);
    }
    return moves;
  }

  // Nivel Fácil: puramente aleatorio
  static getEasyMove(board) {
    const available = this.getAvailableMoves(board);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  // Nivel Medio: busca ganar o bloquear, de lo contrario movimiento aleatorio/estratégico
  static getMediumMove(board, aiPlayer = 'O', humanPlayer = 'X') {
    const available = this.getAvailableMoves(board);
    if (available.length === 0) return null;

    // 1. ¿Puede la IA ganar en este turno?
    for (const move of available) {
      const copy = [...board];
      copy[move] = aiPlayer;
      const result = this.checkWinner(copy);
      if (result && result.winner === aiPlayer) {
        return move;
      }
    }

    // 2. ¿El humano puede ganar en el siguiente turno? Bloquear
    for (const move of available) {
      const copy = [...board];
      copy[move] = humanPlayer;
      const result = this.checkWinner(copy);
      if (result && result.winner === humanPlayer) {
        return move;
      }
    }

    // 3. Tomar el centro con 60% de probabilidad si está libre
    if (board[4] === null && Math.random() < 0.6) {
      return 4;
    }

    // 4. Si no, movimiento aleatorio
    return this.getEasyMove(board);
  }

  // Nivel Imposible: Algoritmo Minimax Invencible
  static getBestMove(board, aiPlayer = 'O', humanPlayer = 'X') {
    const available = this.getAvailableMoves(board);
    if (available.length === 0) return null;

    // Si el tablero está completamente vacío, elegir el centro o esquina para rapidez
    if (available.length === 9) {
      const openings = [0, 2, 4, 6, 8];
      return openings[Math.floor(Math.random() * openings.length)];
    }

    let bestScore = -Infinity;
    let bestMove = available[0];

    for (const move of available) {
      board[move] = aiPlayer;
      const score = this.minimax(board, 0, false, aiPlayer, humanPlayer);
      board[move] = null;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  static minimax(board, depth, isMaximizing, aiPlayer, humanPlayer) {
    const result = this.checkWinner(board);
    if (result) {
      if (result.winner === aiPlayer) return 10 - depth;
      if (result.winner === humanPlayer) return depth - 10;
      if (result.winner === 'tie') return 0;
    }

    const available = this.getAvailableMoves(board);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of available) {
        board[move] = aiPlayer;
        const evaluation = this.minimax(board, depth + 1, false, aiPlayer, humanPlayer);
        board[move] = null;
        maxEval = Math.max(maxEval, evaluation);
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of available) {
        board[move] = humanPlayer;
        const evaluation = this.minimax(board, depth + 1, true, aiPlayer, humanPlayer);
        board[move] = null;
        minEval = Math.min(minEval, evaluation);
      }
      return minEval;
    }
  }
}

// Exportar AIEngine y WIN_COMBOS para tests si corre en entorno Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIEngine, WIN_COMBOS };
}

// ==========================================
// 4. CONTROLADOR DEL JUEGO Y DE LA INTERFAZ
// ==========================================
class TicTacToeGame {
  constructor() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.gameMode = 'pve'; // 'pve' o 'pvp'
    this.difficulty = 'hard'; // 'easy', 'medium', 'hard'
    this.isGameOver = false;
    this.isAiThinking = false;
    this.scores = this.loadScores();

    this.sound = new SoundController();
    this.confetti = new ConfettiController('confetti-canvas');

    this.initDOM();
    this.bindEvents();
    this.updateUI();
  }

  loadScores() {
    const saved = localStorage.getItem('tres_en_raya_scores');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback a nuevo objeto
      }
    }
    return { x: 0, o: 0, ties: 0 };
  }

  saveScores() {
    localStorage.setItem('tres_en_raya_scores', JSON.stringify(this.scores));
  }

  initDOM() {
    this.cells = document.querySelectorAll('.cell');
    this.statusBanner = document.getElementById('status-banner');
    this.statusText = document.getElementById('status-text');

    this.cardX = document.getElementById('card-player-x');
    this.cardO = document.getElementById('card-player-o');
    this.scoreX = document.getElementById('score-x');
    this.scoreO = document.getElementById('score-o');
    this.scoreTies = document.getElementById('score-ties');
    this.playerOName = document.getElementById('player-o-name');

    this.modePveBtn = document.getElementById('mode-pve-btn');
    this.modePvpBtn = document.getElementById('mode-pvp-btn');
    this.difficultyWrapper = document.getElementById('difficulty-wrapper');
    this.difficultySelect = document.getElementById('difficulty-select');

    this.soundBtn = document.getElementById('sound-toggle-btn');
    this.soundIconOn = this.soundBtn.querySelector('.icon-sound-on');
    this.soundIconOff = this.soundBtn.querySelector('.icon-sound-off');

    this.restartRoundBtn = document.getElementById('restart-round-btn');
    this.resetAllBtn = document.getElementById('reset-all-btn');

    this.strikeSvg = document.getElementById('strike-svg');
    this.strikeLine = document.getElementById('strike-line');

    this.updateSoundIcon();
  }

  bindEvents() {
    // Eventos de Casillas
    this.cells.forEach(cell => {
      cell.addEventListener('click', () => {
        const index = parseInt(cell.getAttribute('data-index'), 10);
        this.handleCellClick(index);
      });
    });

    // Selector de modo
    this.modePveBtn.addEventListener('click', () => this.setMode('pve'));
    this.modePvpBtn.addEventListener('click', () => this.setMode('pvp'));

    // Selector de dificultad
    this.difficultySelect.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      this.sound.playClick();
      this.restartRound();
    });

    // Controles de audio
    this.soundBtn.addEventListener('click', () => {
      const isMuted = this.sound.toggleMute();
      this.updateSoundIcon();
      if (!isMuted) this.sound.playClick();
    });

    // Botones de acción
    this.restartRoundBtn.addEventListener('click', () => {
      this.sound.playClick();
      this.restartRound();
    });

    this.resetAllBtn.addEventListener('click', () => {
      this.sound.playClick();
      this.resetAll();
    });
  }

  updateSoundIcon() {
    if (this.sound.isMuted) {
      this.soundIconOn.classList.add('hidden');
      this.soundIconOff.classList.remove('hidden');
      this.soundBtn.setAttribute('title', 'Sonido: Desactivado');
    } else {
      this.soundIconOn.classList.remove('hidden');
      this.soundIconOff.classList.add('hidden');
      this.soundBtn.setAttribute('title', 'Sonido: Activado');
    }
  }

  setMode(mode) {
    if (this.gameMode === mode) return;
    this.gameMode = mode;
    this.sound.playClick();

    if (mode === 'pve') {
      this.modePveBtn.classList.add('active');
      this.modePvpBtn.classList.remove('active');
      this.difficultyWrapper.style.display = 'flex';
      this.playerOName.textContent = 'IA (O)';
    } else {
      this.modePvpBtn.classList.add('active');
      this.modePveBtn.classList.remove('active');
      this.difficultyWrapper.style.display = 'none';
      this.playerOName.textContent = 'Jugador O';
    }

    this.restartRound();
  }

  handleCellClick(index) {
    if (this.isGameOver || this.isAiThinking || this.board[index] !== null) {
      return;
    }

    this.makeMove(index, this.currentPlayer);

    if (this.isGameOver) return;

    if (this.gameMode === 'pve' && this.currentPlayer === 'O') {
      this.makeAiMove();
    }
  }

  makeMove(index, player) {
    this.board[index] = player;

    const cell = this.cells[index];
    cell.textContent = player === 'X' ? '✕' : '◯';
    cell.classList.add(player.toLowerCase(), 'pop-in');
    cell.setAttribute('aria-label', `Casilla ${index + 1}, marcada por ${player}`);
    cell.disabled = true;

    this.sound.playMove(player);

    const winData = AIEngine.checkWinner(this.board);

    if (winData) {
      this.handleGameEnd(winData);
      return;
    }

    // Cambiar de turno
    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    this.updateTurnDisplay();
  }

  makeAiMove() {
    this.isAiThinking = true;
    this.statusText.textContent = '🤖 La IA está pensando...';

    // Retardo natural de 320ms para una experiencia agradable
    setTimeout(() => {
      if (this.isGameOver) {
        this.isAiThinking = false;
        return;
      }

      let move;
      if (this.difficulty === 'easy') {
        move = AIEngine.getEasyMove(this.board);
      } else if (this.difficulty === 'medium') {
        move = AIEngine.getMediumMove(this.board, 'O', 'X');
      } else {
        move = AIEngine.getBestMove(this.board, 'O', 'X');
      }

      this.isAiThinking = false;

      if (move !== null && move !== undefined) {
        this.makeMove(move, 'O');
      }
    }, 320);
  }

  handleGameEnd(winData) {
    this.isGameOver = true;

    if (winData.winner === 'tie') {
      this.scores.ties++;
      this.statusText.textContent = '🤝 ¡Empate! Gran partida.';
      this.statusBanner.className = 'status-banner tie';
      this.sound.playTie();
    } else {
      const winner = winData.winner;
      if (winner === 'X') {
        this.scores.x++;
        this.statusText.textContent = this.gameMode === 'pve'
          ? '🎉 ¡Felicidades! Has ganado a la IA.'
          : '🎉 ¡El Jugador X es el ganador!';
        this.statusBanner.className = 'status-banner win-x';
      } else {
        this.scores.o++;
        this.statusText.textContent = this.gameMode === 'pve'
          ? '🤖 ¡La IA ha ganado esta ronda!'
          : '🎉 ¡El Jugador O es el ganador!';
        this.statusBanner.className = 'status-banner win-o';
      }

      // Celebración y animación de línea
      this.highlightWinningCells(winData.combo);
      this.drawWinningStrike(winData.combo);
      this.sound.playWin();

      // Confeti sólo si gana el humano en PvE o cualquiera en PvP
      if (this.gameMode === 'pvp' || winner === 'X') {
        this.confetti.burst(80);
      }
    }

    this.saveScores();
    this.updateScoresDisplay();
  }

  highlightWinningCells(combo) {
    if (!combo) return;
    combo.forEach(index => {
      this.cells[index].classList.add('winning-cell');
    });
  }

  drawWinningStrike(combo) {
    if (!combo) return;

    // Coordenadas del centro de cada celda en el espacio 300x300 del SVG
    // Columna 0: 50, Columna 1: 150, Columna 2: 250
    // Fila 0: 50, Fila 1: 150, Fila 2: 250
    const coords = [
      { x: 50, y: 50 },   { x: 150, y: 50 },  { x: 250, y: 50 },
      { x: 50, y: 150 },  { x: 150, y: 150 }, { x: 250, y: 150 },
      { x: 50, y: 250 },  { x: 150, y: 250 }, { x: 250, y: 250 }
    ];

    const startCell = combo[0];
    const endCell = combo[2];

    const p1 = coords[startCell];
    const p2 = coords[endCell];

    // Extender la línea ligeramente más allá de los centros para un acabado elegante
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.hypot(dx, dy);
    const extend = 28;

    const ux = dx / length;
    const uy = dy / length;

    const x1 = p1.x - ux * extend;
    const y1 = p1.y - uy * extend;
    const x2 = p2.x + ux * extend;
    const y2 = p2.y + uy * extend;

    this.strikeLine.setAttribute('x1', x1);
    this.strikeLine.setAttribute('y1', y1);
    this.strikeLine.setAttribute('x2', x2);
    this.strikeLine.setAttribute('y2', y2);

    this.strikeSvg.classList.add('active');
  }

  restartRound() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.isGameOver = false;
    this.isAiThinking = false;

    this.confetti.stop();
    this.strikeSvg.classList.remove('active');

    this.cells.forEach((cell, idx) => {
      cell.textContent = '';
      cell.className = 'cell';
      cell.disabled = false;
      cell.setAttribute('aria-label', `Casilla ${idx + 1}, fila ${Math.floor(idx/3)+1} columna ${(idx%3)+1}`);
    });

    this.statusBanner.className = 'status-banner';
    this.updateTurnDisplay();
  }

  resetAll() {
    this.scores = { x: 0, o: 0, ties: 0 };
    this.saveScores();
    this.updateScoresDisplay();
    this.restartRound();
  }

  updateTurnDisplay() {
    if (this.currentPlayer === 'X') {
      this.cardX.classList.add('active-turn');
      this.cardO.classList.remove('active-turn');
      this.statusText.textContent = 'Turno de las ✕ (Jugador X)';
    } else {
      this.cardO.classList.add('active-turn');
      this.cardX.classList.remove('active-turn');
      this.statusText.textContent = this.gameMode === 'pve'
        ? 'Turno de la IA (◯)'
        : 'Turno de las ◯ (Jugador O)';
    }
  }

  updateScoresDisplay() {
    this.scoreX.textContent = this.scores.x;
    this.scoreO.textContent = this.scores.o;
    this.scoreTies.textContent = this.scores.ties;
  }

  updateUI() {
    this.updateScoresDisplay();
    this.updateTurnDisplay();
  }
}

// Iniciar aplicación al cargar el DOM
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new TicTacToeGame();
  });
}
