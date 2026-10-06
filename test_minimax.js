/**
 * Script de Pruebas Automatizadas para el Motor de IA y Lógica de Tres en Raya
 */

const assert = require('assert');
const { AIEngine, WIN_COMBOS } = require('./script.js');

console.log('🧪 Iniciando batería de pruebas para Tres en Raya...');

// 1. Verificación de Combinaciones Ganadoras
console.log('\n1. Verificando detección de victoria en todas las combinaciones...');
for (const combo of WIN_COMBOS) {
  const boardX = Array(9).fill(null);
  combo.forEach(idx => boardX[idx] = 'X');
  const resX = AIEngine.checkWinner(boardX);
  assert.strictEqual(resX.winner, 'X', `Fallo al detectar victoria de X en combo ${combo}`);

  const boardO = Array(9).fill(null);
  combo.forEach(idx => boardO[idx] = 'O');
  const resO = AIEngine.checkWinner(boardO);
  assert.strictEqual(resO.winner, 'O', `Fallo al detectar victoria de O en combo ${combo}`);
}
console.log('✅ Las 8 combinaciones ganadoras detectadas correctamente.');

// 2. Verificación de Empate
console.log('\n2. Verificando detección de empate...');
// Tablero de empate conocido:
// X O X
// X O O
// O X X
const tieBoard = [
  'X', 'O', 'X',
  'X', 'O', 'O',
  'O', 'X', 'X'
];
const tieResult = AIEngine.checkWinner(tieBoard);
assert.strictEqual(tieResult.winner, 'tie', 'Fallo al detectar empate en tablero completo sin 3 en raya');
console.log('✅ Empate detectado correctamente.');

// 3. IA Minimax: Detección de Victoria Inmediata
console.log('\n3. Verificando victoria inmediata de la IA (O)...');
// O tiene [0, 1] y [2] está libre:
// O O .
// X X .
// . . .
const winBoard = [
  'O', 'O', null,
  'X', 'X', null,
  null, null, null
];
const aiWinMove = AIEngine.getBestMove(winBoard, 'O', 'X');
assert.strictEqual(aiWinMove, 2, `La IA debió tomar la casilla 2 para ganar inmediatamente, pero eligió ${aiWinMove}`);
console.log('✅ La IA toma la victoria inmediata en casilla 2.');

// 4. IA Minimax: Bloqueo de Victoria Inminente del Oponente
console.log('\n4. Verificando bloqueo inminente del oponente...');
// X tiene [0, 4] (diagonal) y [8] está libre para que X gane:
// X . .
// . X .
// . . .
const blockBoard = [
  'X', null, null,
  null, 'X', null,
  null, null, null
];
const aiBlockMove = AIEngine.getBestMove(blockBoard, 'O', 'X');
assert.strictEqual(aiBlockMove, 8, `La IA debió bloquear la casilla 8 para evitar la victoria de X, pero eligió ${aiBlockMove}`);
console.log('✅ La IA bloquea con éxito en la casilla 8.');

// 5. Simulación de Minimax vs Minimax (Debe resultar SIEMPRE en empate)
console.log('\n5. Verificando partida Minimax vs Minimax...');
let simBoard = Array(9).fill(null);
let currentTurn = 'X';
let gameFinished = false;
let step = 0;

while (!gameFinished && step < 9) {
  const move = (currentTurn === 'X')
    ? AIEngine.getBestMove(simBoard, 'X', 'O')
    : AIEngine.getBestMove(simBoard, 'O', 'X');

  assert.notStrictEqual(move, null, `Movimiento nulo en el turno ${step}`);
  simBoard[move] = currentTurn;

  const check = AIEngine.checkWinner(simBoard);
  if (check) {
    gameFinished = true;
    assert.strictEqual(check.winner, 'tie', `Minimax vs Minimax debió terminar en empate, pero terminó con ganador: ${check.winner}`);
  }

  currentTurn = currentTurn === 'X' ? 'O' : 'X';
  step++;
}
console.log('✅ Minimax vs Minimax concluyó en empate perfecto.');

// 6. Simulación Masiva: Minimax (O) vs Jugador Aleatorio (X) en 100 partidas
console.log('\n6. Simulando 100 partidas de Jugador Aleatorio (X) vs Minimax (O)...');
let aiWins = 0;
let ties = 0;
let humanWins = 0;

for (let game = 0; game < 100; game++) {
  let b = Array(9).fill(null);
  let player = 'X'; // Empieza el aleatorio
  let finished = false;

  while (!finished) {
    let move;
    if (player === 'X') {
      // Movimiento aleatorio
      const available = AIEngine.getAvailableMoves(b);
      move = available[Math.floor(Math.random() * available.length)];
    } else {
      // Minimax
      move = AIEngine.getBestMove(b, 'O', 'X');
    }

    b[move] = player;
    const res = AIEngine.checkWinner(b);
    if (res) {
      finished = true;
      if (res.winner === 'O') aiWins++;
      else if (res.winner === 'tie') ties++;
      else if (res.winner === 'X') humanWins++;
    }
    player = player === 'X' ? 'O' : 'X';
  }
}

console.log(`Resultados de 100 partidas: IA Ganó = ${aiWins}, Empates = ${ties}, Humano Ganó = ${humanWins}`);
assert.strictEqual(humanWins, 0, `¡La IA Minimax NUNCA debe perder! Partidas perdidas: ${humanWins}`);
console.log('✅ ¡Minimax es matemáticamente invencible (0 derrotas en 100 partidas aleatorias)!');

console.log('\n🎉 ¡TODAS LAS PRUEBAS AUTOMATIZADAS PASARON EXITOSAMENTE!');
