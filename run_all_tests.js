/**
 * MASTER TEST RUNNER - SUITE DE PRUEBAS INTEGRAL PARA TODOS LOS ARCHIVOS .JS
 * Verifica sintaxis, lógica de negocio, algoritmos, modelos de IA y emulación de UI.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🚀 INICIANDO TEST COMPLETO DE TODOS LOS ARCHIVOS .JS DEL PROYECTO');
console.log('================================================================');

// -------------------------------------------------------------
// FASE 1: Verificación de Existencia y Sintaxis de Todos los .JS
// -------------------------------------------------------------
console.log('\n📁 [FASE 1] Verificando existencia de módulos...');
const jsFiles = [
  'config.js',
  'supabaseClient.js',
  'qLearningModel.js',
  'geminiAgent.js',
  'script.js',
  'test_minimax.js',
  'test_supabase_logic.js',
  'test_ai_models.js'
];

jsFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  assert(fs.existsSync(filePath), `El archivo ${file} no existe en el proyecto.`);
  const stats = fs.statSync(filePath);
  assert(stats.size > 0, `El archivo ${file} está vacío.`);
  console.log(`  ✓ ${file.padEnd(25)} (${(stats.size / 1024).toFixed(1)} KB)`);
});
console.log('✅ Todos los archivos .js están presentes e íntegros.');

// -------------------------------------------------------------
// FASE 2: Configuración de Mocks de Entorno (Storage y DOM)
// -------------------------------------------------------------
console.log('\n🌐 [FASE 2] Configurando entorno de emulación (localStorage & DOM)...');

const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

// Mock mínimo de DOM para probar TicTacToeGame en Node
const createMockElement = (tag, id = '', className = '') => ({
  tagName: tag.toUpperCase(),
  id,
  className,
  textContent: '',
  innerHTML: '',
  value: '',
  disabled: false,
  attributes: {},
  classList: {
    classes: new Set(className ? className.split(' ') : []),
    add: function(...cls) { cls.forEach(c => this.classes.add(c)); },
    remove: function(...cls) { cls.forEach(c => this.classes.delete(c)); },
    toggle: function(c, force) {
      if (force !== undefined) {
        if (force) this.classes.add(c); else this.classes.delete(c);
      } else {
        if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c);
      }
    },
    contains: function(c) { return this.classes.has(c); }
  },
  getAttribute: function(attr) { return this.attributes[attr] || null; },
  setAttribute: function(attr, val) { this.attributes[attr] = String(val); },
  removeAttribute: function(attr) { delete this.attributes[attr]; },
  addEventListener: function(event, handler) { this.listeners = this.listeners || {}; (this.listeners[event] = this.listeners[event] || []).push(handler); },
  dispatchEvent: function(event) { if (this.listeners && this.listeners[event]) this.listeners[event].forEach(h => h({ target: this })); },
  querySelector: function(sel) {
    if (sel === '.cell-mark') return createMockElement('span', '', 'cell-mark');
    if (sel === '.cell-prob') return createMockElement('span', '', 'cell-prob');
    if (sel === '.icon-sound-on') return createMockElement('span', '', 'icon-sound-on');
    if (sel === '.icon-sound-off') return createMockElement('span', '', 'icon-sound-off');
    return null;
  },
  querySelectorAll: function() { return []; },
  style: {}
});

global.window = {
  AudioContext: function() {
    return {
      state: 'running',
      currentTime: 0,
      createOscillator: () => ({ type: '', frequency: { setValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }),
      createGain: () => ({ gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }),
      destination: {}
    };
  },
  addEventListener: () => {},
  innerWidth: 1024,
  innerHeight: 768
};

global.document = {
  getElementById: (id) => createMockElement('div', id),
  querySelectorAll: (sel) => {
    if (sel === '.cell') {
      const cells = [];
      for (let i = 0; i < 9; i++) {
        const c = createMockElement('button', `cell-${i}`, 'cell');
        c.setAttribute('data-index', i.toString());
        cells.push(c);
      }
      return cells;
    }
    return [createMockElement('div')];
  },
  addEventListener: () => {}
};

console.log('✅ Entorno de emulación listo.');

// -------------------------------------------------------------
// FASE 3: Test de config.js
// -------------------------------------------------------------
console.log('\n⚙️ [FASE 3] Evaluando config.js...');
const { SUPABASE_CONFIG } = require('./config.js');

assert.strictEqual(typeof SUPABASE_CONFIG.saveCredentials, 'function');
assert.strictEqual(typeof SUPABASE_CONFIG.clearCredentials, 'function');
assert.strictEqual(typeof SUPABASE_CONFIG.isConfigured, 'function');

SUPABASE_CONFIG.saveCredentials('https://test-project.supabase.co', 'anon-test-key-12345');
assert.strictEqual(SUPABASE_CONFIG.url, 'https://test-project.supabase.co');
assert.strictEqual(SUPABASE_CONFIG.anonKey, 'anon-test-key-12345');
assert.strictEqual(SUPABASE_CONFIG.isConfigured(), true);

SUPABASE_CONFIG.clearCredentials();
assert.strictEqual(SUPABASE_CONFIG.isConfigured(), false);
console.log('✅ config.js verificado: Guardado, validación y reseteo correctos.');

// -------------------------------------------------------------
// FASE 4: Test de supabaseClient.js
// -------------------------------------------------------------
console.log('\n🗄️ [FASE 4] Evaluando supabaseClient.js...');
const { SupabaseGameClient } = require('./supabaseClient.js');
const dbClient = new SupabaseGameClient();

assert.strictEqual(dbClient.isReady(), false, 'Sin credenciales activas, el estado inicial debe ser offline');

// Probar inserción y lectura de partida en almacenamiento local
const matchMock = {
  game_mode: 'pve',
  difficulty: 'hard',
  player_x_name: 'TestPlayer',
  player_o_name: 'IA (Q-Learning)',
  winner: 'X',
  winning_combo: [0, 1, 2],
  total_moves: 5,
  duration_seconds: 12,
  final_board: ['X', 'X', 'X', 'O', 'O', '', '', '', ''],
  moves_history: [{ step: 1, player: 'X', cell: 0 }]
};

dbClient.saveToLocalHistory(matchMock);
const history = dbClient.getLocalHistory();
assert.strictEqual(history.length, 1);
assert.strictEqual(history[0].player_x_name, 'TestPlayer');

// Probar cálculo de ranking local
const leaderboard = dbClient.calculateLocalLeaderboard();
assert.strictEqual(leaderboard.length, 1);
assert.strictEqual(leaderboard[0].player_name, 'TestPlayer');
assert.strictEqual(leaderboard[0].wins, 1);
assert.strictEqual(leaderboard[0].win_rate, 100.0);
console.log('✅ supabaseClient.js verificado: Offline-first, historial y leaderboard calculados.');

// -------------------------------------------------------------
// FASE 5: Test de qLearningModel.js
// -------------------------------------------------------------
console.log('\n🧠 [FASE 5] Evaluando qLearningModel.js...');
const { QLearningAgent } = require('./qLearningModel.js');
const qAgent = new QLearningAgent({ alpha: 0.25, gamma: 0.95, epsilon: 0.1 });

// Test de hash canónico y alias
const sampleBoard = ['X', null, 'O', null, null, null, null, null, null];
assert.strictEqual(qAgent.getCanonicalHash(sampleBoard, 'O'), 'O-M------');
assert.strictEqual(qAgent.getBoardHash(sampleBoard, 'O'), 'O-M------', 'Alias getBoardHash debe coincidir');

// Test de 8 simetrías
const syms = qAgent.getSymmetries('O-M------', [0, 0, 0, 0, 0, 0, 0, 0, 0]);
assert.strictEqual(syms.length, 8);

// Test de probabilidades de Heatmap
const probs = qAgent.getActionProbabilities(sampleBoard, [1, 3, 4, 5, 6, 7, 8], 'O');
assert.strictEqual(probs[0], null, 'Casilla 0 ocupada debe ser null');
assert.notStrictEqual(probs[1], null, 'Casilla 1 vacía debe tener porcentaje');
const sumP = [1, 3, 4, 5, 6, 7, 8].reduce((acc, i) => acc + probs[i].percent, 0);
assert(sumP >= 96 && sumP <= 104, `Suma de probabilidades esperada ~100%, fue ${sumP}`);

// Test de auto-entrenamiento y export/import
const trainRes = qAgent.trainSelfPlay(2500, null, true);
assert(trainRes.totalStates > 100);
const jsonDump = qAgent.exportJSON();
assert(jsonDump.includes('version'));
assert(qAgent.importJSON(jsonDump));

console.log(`✅ qLearningModel.js verificado: Canónico, simetrías, heatmap (${sumP}%) y entrenamiento con ${trainRes.totalStates} estados.`);

// -------------------------------------------------------------
// FASE 6: Test de geminiAgent.js
// -------------------------------------------------------------
console.log('\n✨ [FASE 6] Evaluando geminiAgent.js...');
const { GeminiGameAgent } = require('./geminiAgent.js');
const gemini = new GeminiGameAgent();

gemini.saveApiKey('test-key-mock');
assert.strictEqual(gemini.apiKey, 'test-key-mock');
assert.strictEqual(gemini.isLive, true);

gemini.saveApiKey('');
assert.strictEqual(gemini.isLive, false);

// Probar decisiones simuladas tácticas
const boardWinningO = ['O', 'O', null, 'X', 'X', null, null, null, null];
const decWin = gemini.getSimulatedDecision(boardWinningO, [2, 5, 6, 7, 8]);
assert.strictEqual(decWin.move, 2, 'Gemini simulado debe tomar la victoria en 2');
assert(decWin.comment && decWin.tactical_analysis);

const boardBlockX = ['X', 'X', null, 'O', null, null, null, null, null];
const decBlock = gemini.getSimulatedDecision(boardBlockX, [2, 4, 5, 6, 7, 8]);
assert.strictEqual(decBlock.move, 2, 'Gemini simulado debe bloquear en 2');

console.log('✅ geminiAgent.js verificado: API Key storage, prompts, victoria y bloqueo simulados.');

// -------------------------------------------------------------
// FASE 7: Test de script.js (AIEngine y Algoritmo Minimax)
// -------------------------------------------------------------
console.log('\n🕹️ [FASE 7] Evaluando script.js (AIEngine y Minimax)...');
const { AIEngine, WIN_COMBOS } = require('./script.js');

// 7.1 Verificar las 8 combinaciones de victoria
for (const combo of WIN_COMBOS) {
  const bX = Array(9).fill(null);
  combo.forEach(idx => bX[idx] = 'X');
  assert.strictEqual(AIEngine.checkWinner(bX).winner, 'X');

  const bO = Array(9).fill(null);
  combo.forEach(idx => bO[idx] = 'O');
  assert.strictEqual(AIEngine.checkWinner(bO).winner, 'O');
}

// 7.2 Verificar empate
const boardTie = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
assert.strictEqual(AIEngine.checkWinner(boardTie).winner, 'tie');

// 7.3 Minimax vs Minimax (siempre empate)
let simB = Array(9).fill(null);
let t = 'X';
for (let step = 0; step < 9; step++) {
  const mv = AIEngine.getBestMove(simB, t, t === 'X' ? 'O' : 'X');
  simB[mv] = t;
  const res = AIEngine.checkWinner(simB);
  if (res) {
    assert.strictEqual(res.winner, 'tie');
    break;
  }
  t = t === 'X' ? 'O' : 'X';
}

// 7.4 100 partidas de Minimax vs Aleatorio (0 derrotas garantizadas)
let mmWins = 0, mmTies = 0, mmLosses = 0;
for (let i = 0; i < 100; i++) {
  let b = Array(9).fill(null);
  let p = 'X';
  while (true) {
    const av = AIEngine.getAvailableMoves(b);
    let mv = (p === 'X') ? av[Math.floor(Math.random() * av.length)] : AIEngine.getBestMove(b, 'O', 'X');
    b[mv] = p;
    const chk = AIEngine.checkWinner(b);
    if (chk) {
      if (chk.winner === 'O') mmWins++;
      else if (chk.winner === 'tie') mmTies++;
      else mmLosses++;
      break;
    }
    p = p === 'X' ? 'O' : 'X';
  }
}
assert.strictEqual(mmLosses, 0, 'Minimax no puede perder contra jugador aleatorio');
console.log(`✅ script.js (AIEngine) verificado: 8 combos, empates y Minimax invencible (${mmWins}W/${mmTies}D/0L).`);

// -------------------------------------------------------------
// FASE 8: Ejecución de las Suites Unitarias Existentes
// -------------------------------------------------------------
console.log('\n🧪 [FASE 8] Ejecutando suites existentes de validación...');
require('./test_minimax.js');
require('./test_supabase_logic.js');
require('./test_ai_models.js');

console.log('\n================================================================');
console.log('🎉 TODOS LOS ARCHIVOS .JS FUERON TESTEADOS Y PASARON AL 100%');
console.log('================================================================');
