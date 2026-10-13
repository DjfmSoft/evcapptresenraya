/**
 * Test unitario para los modelos de Inteligencia Artificial (Q-Learning y Gemini Agent)
 */
const assert = require('assert');

// Mock localStorage para Node.js
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; }
};

const { QLearningAgent } = require('./qLearningModel.js');
const { GeminiGameAgent } = require('./geminiAgent.js');

console.log('🧪 Iniciando batería de pruebas para Modelos de IA...');

// ==========================================
// 1. PRUEBAS DEL MODELO Q-LEARNING (MACHINE LEARNING)
// ==========================================
console.log('\n1. Verificando modelo de Reinforcement Learning (Q-Learning Canónico)...');
const agent = new QLearningAgent({ alpha: 0.25, gamma: 0.95, epsilon: 0.1 });

// 1.1 Verificación de hashes canónicos y simetrías
const testBoard = [
  'X', null, null,
  null, 'O', null,
  null, null, null
];
const canonicalHashO = agent.getCanonicalHash(testBoard, 'O');
assert.strictEqual(canonicalHashO, 'O---M----', 'Hash canónico desde la perspectiva de O incorrecto');

const canonicalHashX = agent.getCanonicalHash(testBoard, 'X');
assert.strictEqual(canonicalHashX, 'M---O----', 'Hash canónico desde la perspectiva de X incorrecto');

const qValues = [0.5, 0.1, 0, 0, 0.9, 0, 0, 0, 0];
const symmetries = agent.getSymmetries(canonicalHashO, qValues);
assert.strictEqual(symmetries.length, 8, 'Deben generarse exactamente 8 simetrías (4 rotaciones x 2 reflejos)');
console.log('✅ Hashes canónicos y 8 simetrías geométricas generadas correctamente.');

// 1.2 Verificación de Heatmap de Probabilidades
console.log('\n2. Verificando Heatmap de Probabilidades tácticas...');
const available = [1, 2, 3, 5, 6, 7, 8];
const probs = agent.getActionProbabilities(testBoard, available, 'O');

assert.strictEqual(probs[0], null, 'Casilla 0 ocupada por X debe ser null');
assert.strictEqual(probs[4], null, 'Casilla 4 ocupada por O debe ser null');
assert.notStrictEqual(probs[1], null, 'Casilla 1 libre debe tener probabilidad');

const sumPercents = available.reduce((acc, idx) => acc + probs[idx].percent, 0);
assert(sumPercents >= 97 && sumPercents <= 103, `La suma de probabilidades debe redondear al 100%, fue ${sumPercents}`);
console.log(`✅ Heatmap verificado: suma de probabilidades = ${sumPercents}%.`);

// 1.3 Verificación de Entrenamiento Self-Play Canónico
console.log('\n3. Entrenando modelo canónico con Self-Play (3,000 partidas)...');
const trainResult = agent.trainSelfPlay(3000, null, true);
assert(trainResult.totalStates > 50, 'La Q-table debe contener múltiples estados aprendidos');
console.log(`✅ Entrenamiento completado. Estados registrados en Q-Table: ${trainResult.totalStates}.`);

// Probar al agente entrenado contra un jugador aleatorio en 100 partidas
console.log('\n4. Evaluando Agente Q-Learning vs Jugador Aleatorio (100 partidas)...');
let agentWins = 0;
let ties = 0;
let losses = 0;

for (let g = 0; g < 100; g++) {
  const b = Array(9).fill(null);
  let finished = false;
  let p = 'X'; // Empieza aleatorio

  while (!finished) {
    const av = [];
    for (let i = 0; i < 9; i++) if (b[i] === null) av.push(i);

    let move;
    if (p === 'X') {
      move = av[Math.floor(Math.random() * av.length)];
    } else {
      move = agent.getAction(b, av, true, 'O'); // Greedy
    }

    b[move] = p;

    // Chequeo de fin de juego
    const winCombos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    let win = null;
    for (const [x, y, z] of winCombos) {
      if (b[x] && b[x] === b[y] && b[x] === b[z]) { win = b[x]; break; }
    }
    if (!win && b.every(c => c !== null)) win = 'tie';

    if (win) {
      finished = true;
      if (win === 'O') agentWins++;
      else if (win === 'tie') ties++;
      else losses++;
    }
    p = p === 'X' ? 'O' : 'X';
  }
}

console.log(`Resultados de Q-Learning (O): Victorias = ${agentWins}, Empates = ${ties}, Derrotas = ${losses}`);
const winTieRate = agentWins + ties;
assert(winTieRate >= 75, `El modelo de Q-Learning debe ganar o empatar al menos el 75% de partidas. Logrado: ${winTieRate}%`);
console.log(`✅ Agente Q-Learning validado con ${winTieRate}% de efectividad (victorias + empates).`);

// 1.4 Verificación de Exportación e Importación de Pesos
console.log('\n5. Verificando exportación e importación JSON del modelo...');
const exported = agent.exportJSON();
assert(typeof exported === 'string' && exported.includes('version'), 'Exportación JSON inválida');
const newAgent = new QLearningAgent();
const importedOk = newAgent.importJSON(exported);
assert.strictEqual(importedOk, true, 'Importación fallida');
assert.strictEqual(newAgent.qTable.size, agent.qTable.size, 'Los estados importados deben coincidir exactamente');
console.log('✅ Exportación e importación de la Q-Table verificada al 100%.');

// ==========================================
// 2. PRUEBAS DEL AGENTE GEMINI AI
// ==========================================
console.log('\n6. Verificando Agente Gemini AI y modo de simulación...');
const gemini = new GeminiGameAgent();

gemini.setPersonality('zen');
assert(gemini.getPersonalitySystemPrompt().includes('Zen'), 'Prompt Zen no coincide');
gemini.setPersonality('cyberpunk');
assert(gemini.getPersonalitySystemPrompt().includes('CYBER-AI'), 'Prompt Cyberpunk no coincide');
gemini.setPersonality('competitivo');
assert(gemini.getPersonalitySystemPrompt().includes('competitivo'), 'Prompt Competitivo no coincide');
console.log('✅ Sistema de personalidades verificado.');

const winBoardO = [
  'O', 'O', null,
  'X', 'X', null,
  null, null, null
];
const winDecision = gemini.getSimulatedDecision(winBoardO, [2, 5, 6, 7, 8]);
assert.strictEqual(winDecision.move, 2, 'Gemini debe tomar la casilla 2 para ganar');
assert(winDecision.comment && winDecision.comment.length > 5, 'Debe incluir comentario');
assert(winDecision.tactical_analysis && winDecision.tactical_analysis.length > 5, 'Debe incluir análisis táctico');
console.log('✅ Decisión de victoria inmediata y análisis táctico validados.');

const blockBoardX = [
  'X', 'X', null,
  'O', null, null,
  null, null, null
];
const blockDecision = gemini.getSimulatedDecision(blockBoardX, [2, 4, 5, 6, 7, 8]);
assert.strictEqual(blockDecision.move, 2, 'Gemini debe bloquear la casilla 2');
console.log('✅ Decisión de bloqueo y detección táctica validadas.');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE MODELOS DE IA PASARON EXITOSAMENTE!');
