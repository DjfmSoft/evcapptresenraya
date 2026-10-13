/**
 * MOTOR DE MACHINE LEARNING: REINFORCEMENT LEARNING (Q-LEARNING)
 * Modelo con representación canónica de perspectiva de jugador,
 * simetrías geométricas de 8 vías, Epsilon decay y Self-Play acelerado.
 */

class QLearningAgent {
  constructor(options = {}) {
    this.alpha = options.alpha || 0.25; // Tasa de aprendizaje
    this.gamma = options.gamma || 0.95; // Factor de descuento
    this.epsilon = options.epsilon || 0.12; // Exploración
    this.qTable = new Map(); // Canonical State Hash -> Array de 9 valores Q
    this.isTrained = false;
    this.totalGamesTrained = 0;

    this.loadFromStorage();

    // Si la tabla está vacía, pre-entrenar con 4,000 partidas canónicas
    if (this.qTable.size === 0) {
      this.trainSelfPlay(4000, null, true);
    }
  }

  /**
   * Representación canónica: 'M' (mis fichas), 'O' (fichas del rival), '-' (vacío).
   * Permite que una sola Q-Table aprenda para ambos bandos indistintamente.
   */
  getCanonicalHash(board, mySymbol = 'O') {
    const oppSymbol = mySymbol === 'X' ? 'O' : 'X';
    return board.map(c => (c === mySymbol ? 'M' : c === oppSymbol ? 'O' : '-')).join('');
  }

  // Alias para compatibilidad
  getBoardHash(board, mySymbol = 'O') {
    return this.getCanonicalHash(board, mySymbol);
  }

  getQValues(canonicalHash) {
    if (!this.qTable.has(canonicalHash)) {
      this.qTable.set(canonicalHash, new Array(9).fill(0));
    }
    return this.qTable.get(canonicalHash);
  }

  // 8 simetrías (4 rotaciones x 2 reflejos)
  getSymmetries(hash, qValues) {
    const coords = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const rotate = (idx) => [
      idx[6], idx[3], idx[0],
      idx[7], idx[4], idx[1],
      idx[8], idx[5], idx[2]
    ];
    const reflect = (idx) => [
      idx[2], idx[1], idx[0],
      idx[5], idx[4], idx[3],
      idx[8], idx[7], idx[6]
    ];

    const symmetries = [];
    let currentIdx = [...coords];

    for (let r = 0; r < 4; r++) {
      const h1 = currentIdx.map(i => hash[i]).join('');
      const q1 = currentIdx.map(i => qValues[i]);
      symmetries.push({ hash: h1, qValues: q1 });

      const refIdx = reflect(currentIdx);
      const h2 = refIdx.map(i => hash[i]).join('');
      const q2 = refIdx.map(i => qValues[i]);
      symmetries.push({ hash: h2, qValues: q2 });

      currentIdx = rotate(currentIdx);
    }

    return symmetries;
  }

  getAction(board, availableMoves, isGreedy = true, mySymbol = 'O') {
    if (!availableMoves || availableMoves.length === 0) return null;

    const hash = this.getCanonicalHash(board, mySymbol);
    const qValues = this.getQValues(hash);

    if (!isGreedy && Math.random() < this.epsilon) {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    let bestValue = -Infinity;
    let bestMoves = [];

    for (const move of availableMoves) {
      const val = qValues[move];
      if (val > bestValue) {
        bestValue = val;
        bestMoves = [move];
      } else if (val === bestValue) {
        bestMoves.push(move);
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  getActionProbabilities(board, availableMoves, mySymbol = 'O') {
    const probabilities = new Array(9).fill(null);
    if (!availableMoves || availableMoves.length === 0) return probabilities;

    const hash = this.getCanonicalHash(board, mySymbol);
    const qValues = this.getQValues(hash);

    const legalValues = availableMoves.map(m => qValues[m]);
    const maxVal = Math.max(...legalValues);

    const temperature = 0.45;
    const expValues = legalValues.map(v => Math.exp((v - maxVal) / temperature));
    const sumExp = expValues.reduce((a, b) => a + b, 0);

    availableMoves.forEach((move, idx) => {
      const probPercent = Math.round((expValues[idx] / sumExp) * 100);
      probabilities[move] = {
        percent: probPercent,
        qValue: parseFloat(qValues[move].toFixed(3))
      };
    });

    return probabilities;
  }

  updateEpisode(episode, finalReward) {
    let nextMaxQ = 0;

    for (let i = episode.length - 1; i >= 0; i--) {
      const { canonicalHash, action } = episode[i];
      const qValues = this.getQValues(canonicalHash);
      const currentQ = qValues[action];

      const reward = (i === episode.length - 1) ? finalReward : 0;
      const updatedQ = currentQ + this.alpha * (reward + this.gamma * nextMaxQ - currentQ);
      qValues[action] = updatedQ;

      const symmetries = this.getSymmetries(canonicalHash, qValues);
      for (const sym of symmetries) {
        this.qTable.set(sym.hash, sym.qValues);
      }

      nextMaxQ = Math.max(...qValues);
    }
  }

  trainSelfPlay(numGames = 5000, onProgress = null, silent = false) {
    const winCombos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    const checkWin = (b) => {
      for (const [x, y, z] of winCombos) {
        if (b[x] && b[x] === b[y] && b[x] === b[z]) return b[x];
      }
      if (b.every(c => c !== null)) return 'tie';
      return null;
    };

    let winsO = 0;
    let winsX = 0;
    let ties = 0;

    for (let game = 1; game <= numGames; game++) {
      const board = Array(9).fill(null);
      let turn = (game % 2 === 0) ? 'X' : 'O'; // Alternar primer turno
      const historyO = [];
      const historyX = [];
      let result = null;

      while (!result) {
        const available = [];
        for (let i = 0; i < 9; i++) if (board[i] === null) available.push(i);

        const canonicalHash = this.getCanonicalHash(board, turn);

        // Elegir acción: exploración moderada
        let move;
        // 30% de partidas de entrenamiento contra oponente que bloquea para forzar defensas
        if (turn === 'X' && game % 3 === 0 && Math.random() < 0.6) {
          // Bloquear si el rival va a ganar
          let blockMove = null;
          for (const av of available) {
            const copy = [...board];
            copy[av] = 'O';
            if (checkWin(copy) === 'O') { blockMove = av; break; }
          }
          move = blockMove !== null ? blockMove : this.getAction(board, available, false, turn);
        } else {
          move = this.getAction(board, available, false, turn);
        }

        board[move] = turn;

        if (turn === 'O') {
          historyO.push({ canonicalHash, action: move });
        } else {
          historyX.push({ canonicalHash, action: move });
        }

        result = checkWin(board);
        turn = (turn === 'X') ? 'O' : 'X';
      }

      if (result === 'O') {
        winsO++;
        this.updateEpisode(historyO, 1.0);
        this.updateEpisode(historyX, -1.2); // Penalización más fuerte por perder
      } else if (result === 'X') {
        winsX++;
        this.updateEpisode(historyO, -1.2);
        this.updateEpisode(historyX, 1.0);
      } else {
        ties++;
        this.updateEpisode(historyO, 0.4);
        this.updateEpisode(historyX, 0.4);
      }

      if (onProgress && game % Math.max(1, Math.floor(numGames / 20)) === 0) {
        onProgress({
          completed: game,
          total: numGames,
          percent: Math.round((game / numGames) * 100),
          stats: { winsO, winsX, ties }
        });
      }
    }

    this.totalGamesTrained += numGames;
    this.isTrained = true;
    this.saveToStorage();

    if (!silent) {
      console.log(`[QLearningAgent] Entrenamiento completado: ${numGames} partidas. Estados en Q-Table: ${this.qTable.size}`);
    }

    return { totalStates: this.qTable.size, winsO, winsX, ties };
  }

  saveToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const serialized = Array.from(this.qTable.entries()).slice(0, 2000);
      localStorage.setItem('tres_en_raya_qtable', JSON.stringify(serialized));
      localStorage.setItem('tres_en_raya_q_trained_count', this.totalGamesTrained.toString());
    } catch {
      // Ignorar quota exceeded
    }
  }

  loadFromStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('tres_en_raya_qtable');
      const count = localStorage.getItem('tres_en_raya_q_trained_count');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.qTable = new Map(parsed);
        this.totalGamesTrained = parseInt(count, 10) || 0;
        this.isTrained = true;
      }
    } catch {
      this.qTable = new Map();
    }
  }

  exportJSON() {
    return JSON.stringify({
      version: '2.0',
      totalGamesTrained: this.totalGamesTrained,
      statesCount: this.qTable.size,
      data: Array.from(this.qTable.entries())
    });
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.data && Array.isArray(parsed.data)) {
        this.qTable = new Map(parsed.data);
        this.totalGamesTrained = parsed.totalGamesTrained || this.qTable.size;
        this.isTrained = true;
        this.saveToStorage();
        return true;
      }
    } catch (err) {
      console.error('[QLearningAgent] Error al importar modelo:', err);
    }
    return false;
  }

  resetModel() {
    this.qTable.clear();
    this.totalGamesTrained = 0;
    this.isTrained = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('tres_en_raya_qtable');
      localStorage.removeItem('tres_en_raya_q_trained_count');
    }
  }
}

// Instancia global
const qLearningAgent = new QLearningAgent();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QLearningAgent, qLearningAgent };
}
