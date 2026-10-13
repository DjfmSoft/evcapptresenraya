/**
 * TRES EN RAYA - TIC TAC TOE CON MODELOS DE INTELIGENCIA ARTIFICIAL
 * Motores: Machine Learning (Q-Learning), Agente Gemini AI (LLM) y Minimax Clásico.
 */

// ==========================================
// 1. SISTEMA DE AUDIO (Web Audio API)
// ==========================================
class SoundController {
  constructor() {
    this.audioCtx = null;
    this.isMuted = typeof localStorage !== 'undefined' && localStorage.getItem('tres_en_raya_muted') === 'true';
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
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tres_en_raya_muted', this.isMuted);
    }
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
    this.canvas = typeof document !== 'undefined' ? document.getElementById(canvasId) : null;
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
      p.vy += 0.35;
      p.vx *= 0.98;
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
// 3. MOTOR DE INTELIGENCIA ARTIFICIAL (Minimax Clásico)
// ==========================================
const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
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

  static getEasyMove(board) {
    const available = this.getAvailableMoves(board);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  static getMediumMove(board, aiPlayer = 'O', humanPlayer = 'X') {
    const available = this.getAvailableMoves(board);
    if (available.length === 0) return null;

    for (const move of available) {
      const copy = [...board];
      copy[move] = aiPlayer;
      const result = this.checkWinner(copy);
      if (result && result.winner === aiPlayer) return move;
    }

    for (const move of available) {
      const copy = [...board];
      copy[move] = humanPlayer;
      const result = this.checkWinner(copy);
      if (result && result.winner === humanPlayer) return move;
    }

    if (board[4] === null && Math.random() < 0.6) return 4;
    return this.getEasyMove(board);
  }

  static getBestMove(board, aiPlayer = 'O', humanPlayer = 'X') {
    const available = this.getAvailableMoves(board);
    if (available.length === 0) return null;

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

// Exportar para tests en Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIEngine, WIN_COMBOS };
}

// ==========================================
// 4. CONTROLADOR DEL JUEGO Y MODELOS DE IA
// ==========================================
class TicTacToeGame {
  constructor() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.gameMode = 'pve'; // 'pve' o 'pvp'
    this.difficulty = 'hard'; // para Minimax
    this.aiBrain = this.loadAiBrain(); // 'qlearning', 'gemini', 'minimax'
    this.isHeatmapActive = false;

    this.isGameOver = false;
    this.isAiThinking = false;
    this.scores = this.loadScores();

    // Metadatos de partida para persistencia
    this.matchStartTime = null;
    this.movesHistory = [];
    this.totalMoves = 0;
    this.playerName = this.loadPlayerName();

    // Motores de IA
    this.qAgent = typeof qLearningAgent !== 'undefined' ? qLearningAgent : null;
    this.geminiAgent = typeof geminiGameAgent !== 'undefined' ? geminiGameAgent : null;

    this.sound = new SoundController();
    this.confetti = new ConfettiController('confetti-canvas');

    this.initDOM();
    this.bindEvents();
    this.updateUI();
    this.initSupabaseState();
    this.updateAiBrainUI();
  }

  loadAiBrain() {
    if (typeof localStorage === 'undefined') return 'qlearning';
    return localStorage.getItem('tres_en_raya_ai_brain') || 'qlearning';
  }

  saveAiBrain(brain) {
    this.aiBrain = brain;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tres_en_raya_ai_brain', brain);
    }
  }

  loadScores() {
    if (typeof localStorage === 'undefined') return { x: 0, o: 0, ties: 0 };
    const saved = localStorage.getItem('tres_en_raya_scores');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return { x: 0, o: 0, ties: 0 };
  }

  saveScores() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tres_en_raya_scores', JSON.stringify(this.scores));
    }
  }

  loadPlayerName() {
    if (typeof localStorage === 'undefined') return 'Jugador 1';
    return (localStorage.getItem('tres_en_raya_nickname') || 'Jugador 1').trim();
  }

  savePlayerName(name) {
    this.playerName = (name || 'Jugador 1').trim();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tres_en_raya_nickname', this.playerName);
    }
    if (this.playerXName) {
      this.playerXName.textContent = this.playerName;
    }
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
    this.playerXName = document.getElementById('player-x-name');
    this.playerOName = document.getElementById('player-o-name');
    this.playerNameInput = document.getElementById('player-name-input');

    this.modePveBtn = document.getElementById('mode-pve-btn');
    this.modePvpBtn = document.getElementById('mode-pvp-btn');
    this.aiEngineContainer = document.getElementById('ai-engine-container');
    this.aiBrainSelect = document.getElementById('ai-brain-select');
    this.qlearningControls = document.getElementById('qlearning-controls');
    this.geminiControls = document.getElementById('gemini-controls');
    this.minimaxControls = document.getElementById('minimax-controls');
    this.difficultySelect = document.getElementById('difficulty-select');

    // Botones de IA
    this.btnOpenTrainModal = document.getElementById('btn-open-train-modal');
    this.btnToggleHeatmap = document.getElementById('btn-toggle-heatmap');
    this.heatmapStatus = document.getElementById('heatmap-status');
    this.geminiPersonalitySelect = document.getElementById('gemini-personality-select');
    this.btnOpenGeminiCfg = document.getElementById('btn-open-gemini-cfg');

    // Diálogo del rival IA
    this.aiDialogueCard = document.getElementById('ai-dialogue-card');
    this.aiDialogueAvatar = document.getElementById('ai-dialogue-avatar');
    this.aiDialogueName = document.getElementById('ai-dialogue-name');
    this.aiDialogueTag = document.getElementById('ai-dialogue-tag');
    this.aiDialogueComment = document.getElementById('ai-dialogue-comment');
    this.aiDialogueAnalysis = document.getElementById('ai-dialogue-analysis');

    this.soundBtn = document.getElementById('sound-toggle-btn');
    this.soundIconOn = this.soundBtn.querySelector('.icon-sound-on');
    this.soundIconOff = this.soundBtn.querySelector('.icon-sound-off');

    this.restartRoundBtn = document.getElementById('restart-round-btn');
    this.resetAllBtn = document.getElementById('reset-all-btn');

    this.strikeSvg = document.getElementById('strike-svg');
    this.strikeLine = document.getElementById('strike-line');

    // Botones e Indicadores de Supabase
    this.dbStatusBtn = document.getElementById('db-status-btn');
    this.dbStatusLabel = document.getElementById('db-status-label');
    this.btnLeaderboard = document.getElementById('btn-leaderboard');
    this.btnHistory = document.getElementById('btn-history');

    // Modales
    this.modalLeaderboard = document.getElementById('modal-leaderboard');
    this.modalHistory = document.getElementById('modal-history');
    this.modalConfig = document.getElementById('modal-supabase-config');
    this.modalTrain = document.getElementById('modal-qlearning-train');
    this.modalGemini = document.getElementById('modal-gemini-config');

    this.leaderboardContent = document.getElementById('leaderboard-content');
    this.historyContent = document.getElementById('history-content');

    // Configuración Supabase
    this.cfgUrlInput = document.getElementById('cfg-supabase-url');
    this.cfgKeyInput = document.getElementById('cfg-supabase-key');
    this.btnTestDb = document.getElementById('btn-test-db');
    this.btnSaveDb = document.getElementById('btn-save-db');
    this.btnDisconnectDb = document.getElementById('btn-disconnect-db');
    this.dbFeedbackMsg = document.getElementById('db-feedback-msg');

    // Configuración Gemini
    this.geminiKeyInput = document.getElementById('gemini-api-key-input');
    this.btnSaveGemini = document.getElementById('btn-save-gemini');
    this.btnSimulatedGemini = document.getElementById('btn-simulated-gemini');
    this.geminiFeedbackMsg = document.getElementById('gemini-feedback-msg');

    // Elementos de Entrenamiento Q-Learning
    this.trainMetricStates = document.getElementById('train-metric-states');
    this.trainMetricGames = document.getElementById('train-metric-games');
    this.trainProgressWrapper = document.getElementById('training-progress-wrapper');
    this.trainProgressBar = document.getElementById('training-progress-bar');
    this.trainProgressText = document.getElementById('training-progress-text');
    this.btnExportModel = document.getElementById('btn-export-model');
    this.btnResetModel = document.getElementById('btn-reset-model');

    if (this.playerNameInput) this.playerNameInput.value = this.playerName;
    if (this.playerXName) this.playerXName.textContent = this.playerName;
    if (this.aiBrainSelect) this.aiBrainSelect.value = this.aiBrain;

    this.updateSoundIcon();
  }

  updateSoundIcon() {
    if (!this.soundBtn || !this.soundIconOn || !this.soundIconOff) return;
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

  bindEvents() {
    this.cells.forEach(cell => {
      cell.addEventListener('click', () => {
        const index = parseInt(cell.getAttribute('data-index'), 10);
        this.handleCellClick(index);
      });
    });

    if (this.playerNameInput) {
      this.playerNameInput.addEventListener('input', (e) => {
        this.savePlayerName(e.target.value);
      });
    }

    // Modo 1P vs 2P
    this.modePveBtn.addEventListener('click', () => this.setMode('pve'));
    this.modePvpBtn.addEventListener('click', () => this.setMode('pvp'));

    // Selector de Cerebro de IA
    this.aiBrainSelect.addEventListener('change', (e) => {
      this.sound.playClick();
      this.saveAiBrain(e.target.value);
      this.updateAiBrainUI();
      this.restartRound();
    });

    // Dificultad Minimax
    this.difficultySelect.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      this.sound.playClick();
      this.restartRound();
    });

    // Personalidad Gemini
    this.geminiPersonalitySelect.addEventListener('change', (e) => {
      if (this.geminiAgent) {
        this.geminiAgent.setPersonality(e.target.value);
        this.updateAiDialogue(
          `Cambié de actitud a "${e.target.options[e.target.selectedIndex].text}". ¿Listo para jugar?`,
          'Personalidad actualizada'
        );
      }
    });

    // Heatmap Toggle
    this.btnToggleHeatmap.addEventListener('click', () => {
      this.isHeatmapActive = !this.isHeatmapActive;
      this.heatmapStatus.textContent = this.isHeatmapActive ? 'ON' : 'OFF';
      this.btnToggleHeatmap.classList.toggle('primary-pill', this.isHeatmapActive);
      this.sound.playClick();
      this.updateHeatmap();
    });

    // Modales de IA
    this.btnOpenTrainModal.addEventListener('click', () => {
      this.sound.playClick();
      this.openTrainModal();
    });

    this.btnOpenGeminiCfg.addEventListener('click', () => {
      this.sound.playClick();
      this.openGeminiModal();
    });

    // Acciones de entrenamiento en el modal
    document.querySelectorAll('[data-games]').forEach(btn => {
      btn.addEventListener('click', () => {
        const games = parseInt(btn.getAttribute('data-games'), 10);
        this.executeSelfPlayTraining(games);
      });
    });

    if (this.btnExportModel) {
      this.btnExportModel.addEventListener('click', () => this.exportQLearningModel());
    }
    if (this.btnResetModel) {
      this.btnResetModel.addEventListener('click', () => this.resetQLearningModel());
    }

    // Acciones modal Gemini
    if (this.btnSaveGemini) {
      this.btnSaveGemini.addEventListener('click', () => this.handleSaveGeminiKey());
    }
    if (this.btnSimulatedGemini) {
      this.btnSimulatedGemini.addEventListener('click', () => this.handleSimulateGemini());
    }

    // Sonido
    this.soundBtn.addEventListener('click', () => {
      const isMuted = this.sound.toggleMute();
      this.updateSoundIcon();
      if (!isMuted) this.sound.playClick();
    });

    // Acciones de ronda
    this.restartRoundBtn.addEventListener('click', () => {
      this.sound.playClick();
      this.restartRound();
    });

    this.resetAllBtn.addEventListener('click', () => {
      this.sound.playClick();
      this.resetAll();
    });

    // Modales Supabase
    this.dbStatusBtn.addEventListener('click', () => this.openModal(this.modalConfig));
    this.btnLeaderboard.addEventListener('click', () => {
      this.sound.playClick();
      this.openLeaderboardModal();
    });
    this.btnHistory.addEventListener('click', () => {
      this.sound.playClick();
      this.openHistoryModal();
    });

    // Cierre de Modales
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        const modal = document.getElementById(modalId);
        if (modal) this.closeModal(modal);
      });
    });

    [this.modalLeaderboard, this.modalHistory, this.modalConfig, this.modalTrain, this.modalGemini].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal(modal);
        });
      }
    });

    if (this.btnTestDb) this.btnTestDb.addEventListener('click', () => this.handleTestConnection());
    if (this.btnSaveDb) this.btnSaveDb.addEventListener('click', () => this.handleSaveSupabaseConfig());
    if (this.btnDisconnectDb) this.btnDisconnectDb.addEventListener('click', () => this.handleDisconnectSupabase());
  }

  // --- GESTIÓN DE MODELOS DE IA Y UI ---

  updateAiBrainUI() {
    if (this.gameMode !== 'pve') {
      this.aiEngineContainer.style.display = 'none';
      this.aiDialogueCard.style.display = 'none';
      this.playerOName.textContent = 'Jugador O';
      return;
    }

    this.aiEngineContainer.style.display = 'flex';
    this.aiDialogueCard.style.display = 'flex';

    this.qlearningControls.classList.toggle('hidden', this.aiBrain !== 'qlearning');
    this.geminiControls.classList.toggle('hidden', this.aiBrain !== 'gemini');
    this.minimaxControls.classList.toggle('hidden', this.aiBrain !== 'minimax');

    if (this.aiBrain === 'qlearning') {
      this.playerOName.textContent = 'IA (Q-Learning)';
      this.aiDialogueAvatar.textContent = '🧠';
      this.aiDialogueName.textContent = 'Agente Q-Learning (ML)';
      this.aiDialogueTag.textContent = `${this.qAgent ? this.qAgent.qTable.size : 0} Estados`;
      this.updateAiDialogue(
        '¡Listo! Aprendo jugando y evaluando probabilidades en tiempo real. Activa el Heatmap para ver mi mente.',
        'Modelo entrenable por refuerzo'
      );
    } else if (this.aiBrain === 'gemini') {
      const isLiveKey = this.geminiAgent && this.geminiAgent.apiKey;
      this.playerOName.textContent = 'Gemini AI (LLM)';
      this.aiDialogueAvatar.textContent = '✨';
      this.aiDialogueName.textContent = 'Google Gemini 3.8 Flash';
      this.aiDialogueTag.textContent = isLiveKey ? 'API En Vivo' : 'Modo Simulado';
      this.updateAiDialogue(
        isLiveKey
          ? 'Conectado a Google Gemini API. Analizaré cada movimiento tuyo con razonamiento táctico.'
          : 'Modo simulado activo. Agrega tu Gemini API Key en el botón 🔑 para análisis en vivo con gemini-3.8-flash.',
        'Modelo Fundacional de Lenguaje'
      );
    } else {
      this.playerOName.textContent = 'IA (Minimax)';
      this.aiDialogueAvatar.textContent = '⚙️';
      this.aiDialogueName.textContent = 'Algoritmo Minimax';
      this.aiDialogueTag.textContent = 'Línea Base';
      this.updateAiDialogue(
        'Búsqueda determinista de árbol de juego clásico. Sin pesos ni aprendizaje.',
        'Algoritmo clásico de teoría de juegos'
      );
    }

    this.updateHeatmap();
  }

  updateAiDialogue(comment, analysis = '', tag = null) {
    if (this.aiDialogueComment) this.aiDialogueComment.textContent = comment;
    if (tag && this.aiDialogueTag) this.aiDialogueTag.textContent = tag;

    if (this.aiDialogueAnalysis) {
      if (analysis) {
        this.aiDialogueAnalysis.textContent = `💡 Análisis: ${analysis}`;
        this.aiDialogueAnalysis.classList.remove('hidden');
      } else {
        this.aiDialogueAnalysis.classList.add('hidden');
      }
    }
  }

  updateHeatmap() {
    const availableMoves = AIEngine.getAvailableMoves(this.board);

    if (!this.isHeatmapActive || this.gameMode !== 'pve' || this.isGameOver || !this.qAgent) {
      document.querySelectorAll('.cell-prob').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.cell').forEach(c => c.classList.remove('heatmap-hot'));
      return;
    }

    const probs = this.qAgent.getActionProbabilities(this.board, availableMoves);

    this.cells.forEach((cell, idx) => {
      const badge = cell.querySelector('.cell-prob');
      if (!badge) return;

      const pData = probs[idx];
      if (pData !== null && pData !== undefined) {
        badge.textContent = `${pData.percent}%`;
        badge.className = 'cell-prob';
        badge.classList.remove('hidden');

        if (pData.percent >= 35) {
          badge.classList.add('high-prob');
          cell.classList.add('heatmap-hot');
        } else if (pData.percent >= 20) {
          badge.classList.add('med-prob');
          cell.classList.remove('heatmap-hot');
        } else {
          cell.classList.remove('heatmap-hot');
        }
      } else {
        badge.classList.add('hidden');
        cell.classList.remove('heatmap-hot');
      }
    });
  }

  // --- ENTRENAMIENTO Q-LEARNING EN MODAL ---

  openTrainModal() {
    this.openModal(this.modalTrain);
    this.updateTrainModalMetrics();
    this.trainProgressWrapper.classList.add('hidden');
  }

  updateTrainModalMetrics() {
    if (!this.qAgent) return;
    this.trainMetricStates.textContent = this.qAgent.qTable.size.toLocaleString();
    this.trainMetricGames.textContent = this.qAgent.totalGamesTrained.toLocaleString();
  }

  executeSelfPlayTraining(totalGames) {
    if (!this.qAgent) return;

    this.trainProgressWrapper.classList.remove('hidden');
    this.trainProgressBar.style.width = '0%';
    this.trainProgressText.textContent = `Iniciando simulación de ${totalGames.toLocaleString()} partidas...`;

    // Procesamiento en micro-lotes para mantener la UI fluida
    const batchSize = 1000;
    let completed = 0;

    const runBatch = () => {
      const step = Math.min(batchSize, totalGames - completed);
      this.qAgent.trainSelfPlay(step, null, true);
      completed += step;

      const percent = Math.round((completed / totalGames) * 100);
      this.trainProgressBar.style.width = `${percent}%`;
      this.trainProgressText.textContent = `Simuladas: ${completed.toLocaleString()} / ${totalGames.toLocaleString()} (${percent}%)`;
      this.updateTrainModalMetrics();

      if (completed < totalGames) {
        requestAnimationFrame(runBatch);
      } else {
        this.trainProgressText.textContent = `¡Completado con éxito! ${totalGames.toLocaleString()} partidas aprendidas.`;
        this.updateAiBrainUI();
        this.sound.playWin();
      }
    };

    requestAnimationFrame(runBatch);
  }

  exportQLearningModel() {
    if (!this.qAgent) return;
    const jsonStr = this.qAgent.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qlearning_tictactoe_weights_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  resetQLearningModel() {
    if (!this.qAgent) return;
    if (confirm('¿Deseas reiniciar los pesos aprendidos de la IA a cero?')) {
      this.qAgent.resetModel();
      this.updateTrainModalMetrics();
      this.updateAiBrainUI();
    }
  }

  // --- CONFIGURACIÓN GEMINI AI ---

  openGeminiModal() {
    this.openModal(this.modalGemini);
    if (this.geminiAgent && this.geminiKeyInput) {
      this.geminiKeyInput.value = this.geminiAgent.apiKey || '';
    }
  }

  handleSaveGeminiKey() {
    const key = this.geminiKeyInput.value.trim();
    if (!key) {
      this.showGeminiFeedback('Ingresa una API Key válida de Google AI Studio.', 'error');
      return;
    }
    if (this.geminiAgent) {
      this.geminiAgent.saveApiKey(key);
      this.showGeminiFeedback('✅ ¡API Key guardada! Agente Gemini conectado.', 'success');
      this.updateAiBrainUI();
      setTimeout(() => this.closeModal(this.modalGemini), 1200);
    }
  }

  handleSimulateGemini() {
    if (this.geminiAgent) {
      this.geminiAgent.saveApiKey('');
      this.ifGeminiInput = '';
      this.showGeminiFeedback('Activado Modo Simulado con gemini-3.8-flash.', 'success');
      this.updateAiBrainUI();
      setTimeout(() => this.closeModal(this.modalGemini), 1000);
    }
  }

  showGeminiFeedback(msg, type) {
    if (!this.geminiFeedbackMsg) return;
    this.geminiFeedbackMsg.textContent = msg;
    this.geminiFeedbackMsg.className = `feedback-box ${type}`;
  }

  // --- LÓGICA DE JUEGO Y MOVIMIENTO IA ---

  setMode(mode) {
    if (this.gameMode === mode) return;
    this.gameMode = mode;
    this.sound.playClick();

    if (mode === 'pve') {
      this.modePveBtn.classList.add('active');
      this.modePvpBtn.classList.remove('active');
    } else {
      this.modePvpBtn.classList.add('active');
      this.modePveBtn.classList.remove('active');
    }

    this.updateAiBrainUI();
    this.restartRound();
  }

  handleCellClick(index) {
    if (this.isGameOver || this.isAiThinking || this.board[index] !== null) {
      return;
    }

    if (!this.matchStartTime) {
      this.matchStartTime = Date.now();
    }

    this.makeMove(index, this.currentPlayer);

    if (this.isGameOver) return;

    if (this.gameMode === 'pve' && this.currentPlayer === 'O') {
      this.makeAiMove();
    }
  }

  makeMove(index, player) {
    this.board[index] = player;
    this.totalMoves++;

    this.movesHistory.push({
      step: this.totalMoves,
      player,
      cell: index,
      time_ms: this.matchStartTime ? Date.now() - this.matchStartTime : 0
    });

    const cell = this.cells[index];
    const markSpan = cell.querySelector('.cell-mark') || cell;
    markSpan.textContent = player === 'X' ? '✕' : '◯';
    cell.classList.add(player.toLowerCase(), 'pop-in');
    cell.setAttribute('aria-label', `Casilla ${index + 1}, marcada por ${player}`);
    cell.disabled = true;

    this.sound.playMove(player);

    const winData = AIEngine.checkWinner(this.board);

    if (winData) {
      this.handleGameEnd(winData);
      return;
    }

    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    this.updateTurnDisplay();
    this.updateHeatmap();
  }

  async makeAiMove() {
    this.isAiThinking = true;
    this.statusText.textContent = '🤖 La IA está analizando el tablero...';

    const availableMoves = AIEngine.getAvailableMoves(this.board);
    let chosenMove = null;
    let comment = '';
    let analysis = '';

    const thinkDelay = new Promise(res => setTimeout(res, 350));

    if (this.aiBrain === 'qlearning' && this.qAgent) {
      chosenMove = this.qAgent.getAction(this.board, availableMoves, true, 'O');
      const hash = this.qAgent.getCanonicalHash(this.board, 'O');
      const qVals = this.qAgent.getQValues(hash);
      const qVal = (chosenMove !== null && qVals && qVals[chosenMove] !== undefined) ? qVals[chosenMove] : 0;
      comment = `Elegí la casilla ${chosenMove + 1} maximizando el valor Q esperado (${qVal.toFixed(2)}).`;
      analysis = 'Decisión guiada por la política aprendida en la Q-Table.';
      await thinkDelay;
    } else if (this.aiBrain === 'gemini' && this.geminiAgent) {
      const decision = await this.geminiAgent.decideMove(this.board, availableMoves, this.movesHistory);
      chosenMove = decision ? decision.move : availableMoves[0];
      comment = decision ? decision.comment : 'Jugada completada.';
      analysis = decision ? decision.tactical_analysis : '';
    } else {
      // Minimax
      if (this.difficulty === 'easy') {
        chosenMove = AIEngine.getEasyMove(this.board);
        comment = 'Movimiento casual exploratorio.';
      } else if (this.difficulty === 'medium') {
        chosenMove = AIEngine.getMediumMove(this.board, 'O', 'X');
        comment = 'Jugada heurística balanceada.';
      } else {
        chosenMove = AIEngine.getBestMove(this.board, 'O', 'X');
        comment = 'Evaluación minimax de profundidad óptima.';
      }
      analysis = `Casilla óptima seleccionada: ${chosenMove + 1}.`;
      await thinkDelay;
    }

    this.isAiThinking = false;

    if (chosenMove !== null && chosenMove !== undefined && !this.isGameOver) {
      this.updateAiDialogue(comment, analysis);
      this.makeMove(chosenMove, 'O');
    }
  }

  handleGameEnd(winData) {
    this.isGameOver = true;
    const durationSeconds = this.matchStartTime ? Math.max(1, Math.round((Date.now() - this.matchStartTime) / 1000)) : 0;

    if (winData.winner === 'tie') {
      this.scores.ties++;
      this.statusText.textContent = '🤝 ¡Empate! Gran batalla de inteligencias.';
      this.statusBanner.className = 'status-banner tie';
      this.sound.playTie();
      this.updateAiDialogue('¡Gran defensa de ambos! Empate honorable en el tablero.', 'Final de partida en tablas');
    } else {
      const winner = winData.winner;
      if (winner === 'X') {
        this.scores.x++;
        this.statusText.textContent = this.gameMode === 'pve'
          ? `🎉 ¡Felicidades ${this.playerName}! Has derrotado a la IA.`
          : `🎉 ¡${this.playerName} (X) es el ganador!`;
        this.statusBanner.className = 'status-banner win-x';
        this.updateAiDialogue('¡Bien jugado! Has encontrado una debilidad en mi estrategia y la aprovechaste.', 'Victoria del humano');
      } else {
        this.scores.o++;
        this.statusText.textContent = this.gameMode === 'pve'
          ? '🤖 ¡La IA se lleva la victoria esta ronda!'
          : '🎉 ¡El Jugador O es el ganador!';
        this.statusBanner.className = 'status-banner win-o';
        this.updateAiDialogue('¡Victoria de la IA! La combinación en la línea fue decisiva.', 'Victoria de la IA');
      }

      this.highlightWinningCells(winData.combo);
      this.drawWinningStrike(winData.combo);
      this.sound.playWin();

      if (this.gameMode === 'pvp' || winner === 'X') {
        this.confetti.burst(80);
      }
    }

    this.saveScores();
    this.updateScoresDisplay();
    this.updateHeatmap();

    // Guardar partida en Supabase / Local History
    const matchRecord = {
      game_mode: this.gameMode,
      difficulty: this.gameMode === 'pve' ? (this.aiBrain === 'minimax' ? this.difficulty : this.aiBrain) : null,
      player_x_name: this.playerName,
      player_o_name: this.gameMode === 'pve' ? `IA (${this.aiBrain})` : 'Jugador O',
      winner: winData.winner,
      winning_combo: winData.combo,
      total_moves: this.totalMoves,
      duration_seconds: durationSeconds,
      final_board: [...this.board],
      moves_history: this.movesHistory
    };

    if (typeof supabaseGameClient !== 'undefined') {
      supabaseGameClient.saveMatch(matchRecord);
    }
  }

  highlightWinningCells(combo) {
    if (!combo) return;
    combo.forEach(index => {
      this.cells[index].classList.add('winning-cell');
    });
  }

  drawWinningStrike(combo) {
    if (!combo) return;

    const coords = [
      { x: 50, y: 50 },   { x: 150, y: 50 },  { x: 250, y: 50 },
      { x: 50, y: 150 },  { x: 150, y: 150 }, { x: 250, y: 150 },
      { x: 50, y: 250 },  { x: 150, y: 250 }, { x: 250, y: 250 }
    ];

    const startCell = combo[0];
    const endCell = combo[2];

    const p1 = coords[startCell];
    const p2 = coords[endCell];

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
    this.matchStartTime = null;
    this.movesHistory = [];
    this.totalMoves = 0;

    this.confetti.stop();
    this.strikeSvg.classList.remove('active');

    this.cells.forEach((cell, idx) => {
      const markSpan = cell.querySelector('.cell-mark') || cell;
      markSpan.textContent = '';
      cell.className = 'cell';
      cell.disabled = false;
      cell.setAttribute('aria-label', `Casilla ${idx + 1}, fila ${Math.floor(idx/3)+1} columna ${(idx%3)+1}`);
    });

    this.statusBanner.className = 'status-banner';
    this.updateTurnDisplay();
    this.updateHeatmap();
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
      this.statusText.textContent = `Turno de las ✕ (${this.playerName})`;
    } else {
      this.cardO.classList.add('active-turn');
      this.cardX.classList.remove('active-turn');
      this.statusText.textContent = this.gameMode === 'pve'
        ? `Turno de ${this.playerOName.textContent} (◯)`
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

  // --- SUPABASE Y MODALES AUXILIARES ---

  initSupabaseState() {
    if (typeof SUPABASE_CONFIG !== 'undefined') {
      if (this.cfgUrlInput) this.cfgUrlInput.value = SUPABASE_CONFIG.url || '';
      if (this.cfgKeyInput) this.cfgKeyInput.value = SUPABASE_CONFIG.anonKey || '';
    }

    this.updateDbStatusBadge();

    if (typeof supabaseGameClient !== 'undefined' && SUPABASE_CONFIG.isConfigured()) {
      supabaseGameClient.testConnection().then(() => this.updateDbStatusBadge());
    }
  }

  updateDbStatusBadge() {
    if (!this.dbStatusBtn) return;
    const isOnline = typeof supabaseGameClient !== 'undefined' && supabaseGameClient.isReady();

    if (isOnline) {
      this.dbStatusBtn.className = 'status-pill online';
      this.dbStatusLabel.textContent = 'Supabase Activo';
    } else {
      this.dbStatusBtn.className = 'status-pill offline';
      this.dbStatusLabel.textContent = 'Modo Local';
    }
  }

  openModal(modal) {
    if (modal) modal.classList.remove('hidden');
  }

  closeModal(modal) {
    if (modal) modal.classList.add('hidden');
    if (this.dbFeedbackMsg) this.dbFeedbackMsg.className = 'feedback-box hidden';
    if (this.geminiFeedbackMsg) this.geminiFeedbackMsg.className = 'feedback-box hidden';
  }

  async openLeaderboardModal() {
    this.openModal(this.modalLeaderboard);
    this.leaderboardContent.innerHTML = '<div class="loading-spinner">Cargando clasificación...</div>';

    if (typeof supabaseGameClient === 'undefined') {
      this.leaderboardContent.innerHTML = '<div class="empty-state">Módulo de datos no inicializado.</div>';
      return;
    }

    const { data, source } = await supabaseGameClient.getLeaderboard(15);
    const sourceLabel = source === 'supabase' ? '🟢 Supabase Cloud' : '🟡 Modo Local';
    document.getElementById('leaderboard-subtitle').textContent = `Fuente: ${sourceLabel}`;

    if (!data || data.length === 0) {
      this.leaderboardContent.innerHTML = '<div class="empty-state"><p>No hay partidas registradas todavía.</p></div>';
      return;
    }

    let rowsHtml = data.map((player, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
      const isCurrent = player.player_name.toLowerCase() === this.playerName.toLowerCase();
      return `
        <tr class="${isCurrent ? 'player-highlight' : ''}">
          <td><span class="rank-badge">${medal}</span></td>
          <td><strong>${this.escapeHtml(player.player_name)}</strong></td>
          <td>${player.games_played}</td>
          <td><span style="color: var(--color-x); font-weight: 700;">${player.wins}</span></td>
          <td><span class="win-rate-pill">${player.win_rate}%</span></td>
          <td>${player.hard_ai_wins || 0}</td>
        </tr>
      `;
    }).join('');

    this.leaderboardContent.innerHTML = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Jugador</th>
            <th>PJ</th>
            <th>Victorias</th>
            <th>% Efectividad</th>
            <th>vs IA 🔥</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
  }

  async openHistoryModal() {
    this.openModal(this.modalHistory);
    this.historyContent.innerHTML = '<div class="loading-spinner">Cargando historial...</div>';

    if (typeof supabaseGameClient === 'undefined') {
      this.historyContent.innerHTML = '<div class="empty-state">Módulo de datos no inicializado.</div>';
      return;
    }

    const { data, source } = await supabaseGameClient.getRecentMatches(15);
    const sourceLabel = source === 'supabase' ? '🟢 Supabase Cloud' : '🟡 Modo Local';
    document.getElementById('history-subtitle').textContent = `Fuente: ${sourceLabel}`;

    if (!data || data.length === 0) {
      this.historyContent.innerHTML = '<div class="empty-state"><p>Aún no hay historial de partidas.</p></div>';
      return;
    }

    let cardsHtml = data.map(match => {
      const dateStr = match.created_at ? new Date(match.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      let winnerLabel = '';
      let winnerClass = '';

      if (match.winner === 'tie') {
        winnerLabel = 'Empate 🤝';
        winnerClass = 'tie';
      } else if (match.winner === 'X') {
        winnerLabel = `Ganador: ${this.escapeHtml(match.player_x_name)} (X)`;
        winnerClass = 'win-x';
      } else {
        winnerLabel = `Ganador: ${this.escapeHtml(match.player_o_name)} (O)`;
        winnerClass = 'win-o';
      }

      const modeLabel = match.game_mode === 'pve'
        ? `1P vs ${match.difficulty || 'IA'}`
        : '2P Local';

      return `
        <div class="history-card">
          <div class="history-card-left">
            <span class="match-players">${this.escapeHtml(match.player_x_name)} vs ${this.escapeHtml(match.player_o_name)}</span>
            <span class="match-meta">${modeLabel} • ${match.total_moves} movs • ${match.duration_seconds || 0}s • ${dateStr}</span>
          </div>
          <span class="winner-tag ${winnerClass}">${winnerLabel}</span>
        </div>
      `;
    }).join('');

    this.historyContent.innerHTML = cardsHtml;
  }

  async handleTestConnection() {
    const url = this.cfgUrlInput.value.trim();
    const key = this.cfgKeyInput.value.trim();

    if (!url || !key) {
      this.showDbFeedback('Ingresa Project URL y Anon Key.', 'error');
      return;
    }

    SUPABASE_CONFIG.saveCredentials(url, key);
    const res = await supabaseGameClient.testConnection();

    if (res.success) {
      this.showDbFeedback(`✅ ${res.message}`, 'success');
      this.updateDbStatusBadge();
    } else {
      this.showDbFeedback(`❌ ${res.message}`, 'error');
      this.updateDbStatusBadge();
    }
  }

  async handleSaveSupabaseConfig() {
    const url = this.cfgUrlInput.value.trim();
    const key = this.cfgKeyInput.value.trim();

    if (!url || !key) {
      this.showDbFeedback('Debes ingresar URL y Anon Key válidas.', 'error');
      return;
    }

    SUPABASE_CONFIG.saveCredentials(url, key);
    const res = await supabaseGameClient.testConnection();

    if (res.success) {
      this.showDbFeedback('✅ ¡Credenciales guardadas y conexión activa!', 'success');
      this.updateDbStatusBadge();
      setTimeout(() => this.closeModal(this.modalConfig), 1200);
    } else {
      this.showDbFeedback(`⚠️ Guardado: ${res.message}`, 'error');
      this.updateDbStatusBadge();
    }
  }

  handleDisconnectSupabase() {
    SUPABASE_CONFIG.clearCredentials();
    if (this.cfgUrlInput) this.cfgUrlInput.value = '';
    if (this.cfgKeyInput) this.cfgKeyInput.value = '';
    supabaseGameClient.init();
    this.updateDbStatusBadge();
    this.showDbFeedback('Desconectado. Ahora estás en Modo Local resiliente.', 'success');
    setTimeout(() => this.closeModal(this.modalConfig), 1000);
  }

  showDbFeedback(msg, type) {
    if (!this.dbFeedbackMsg) return;
    this.dbFeedbackMsg.textContent = msg;
    this.dbFeedbackMsg.className = `feedback-box ${type}`;
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Iniciar aplicación al cargar el DOM
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new TicTacToeGame();
  });
}
