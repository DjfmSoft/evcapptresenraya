/**
 * Test unitario para la lógica de datos y validación de Supabase
 */
const assert = require('assert');

// Simular entorno de almacenamiento local para Node.js
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; }
};

const { SUPABASE_CONFIG } = require('./config.js');
const { SupabaseGameClient } = require('./supabaseClient.js');

console.log('🧪 Iniciando pruebas de lógica de Supabase...');

// 1. Verificar configuración
console.log('\n1. Verificando estado inicial de SUPABASE_CONFIG...');
assert.strictEqual(typeof SUPABASE_CONFIG.isConfigured, 'function');
assert.strictEqual(SUPABASE_CONFIG.isConfigured(), false, 'Por defecto sin URL válida debe ser false');
console.log('✅ Verificación de configuración inicial superada.');

// 2. Probar guardado y reseteo de credenciales
console.log('\n2. Verificando guardado y limpieza de credenciales...');
SUPABASE_CONFIG.saveCredentials('https://testproject.supabase.co', 'dummy-anon-key');
assert.strictEqual(SUPABASE_CONFIG.url, 'https://testproject.supabase.co');
assert.strictEqual(SUPABASE_CONFIG.isConfigured(), true);

SUPABASE_CONFIG.clearCredentials();
assert.strictEqual(SUPABASE_CONFIG.isConfigured(), false);
console.log('✅ Guardado y reseteo de credenciales verificado.');

// 3. Probar cliente en modo local (Offline Fallback)
console.log('\n3. Verificando guardado de partida en fallback local...');
const client = new SupabaseGameClient();
assert.strictEqual(client.isReady(), false, 'Sin credenciales activas no debe estar listo para red directa');

const testMatch = {
  game_mode: 'pve',
  difficulty: 'hard',
  player_x_name: 'Danny',
  player_o_name: 'IA',
  winner: 'X',
  winning_combo: [0, 4, 8],
  total_moves: 7,
  duration_seconds: 14,
  final_board: ['X', 'O', 'X', 'O', 'X', '', '', '', 'X'],
  moves_history: [
    { step: 1, player: 'X', cell: 0, time_ms: 1000 },
    { step: 2, player: 'O', cell: 1, time_ms: 2000 }
  ]
};

client.saveToLocalHistory(testMatch);
const history = client.getLocalHistory();
assert.strictEqual(history.length, 1);
assert.strictEqual(history[0].player_x_name, 'Danny');
assert.strictEqual(history[0].winner, 'X');
console.log('✅ Partida guardada y recuperada en historial local correctamente.');

// 4. Probar cálculo de tabla de clasificación local
console.log('\n4. Verificando cálculo de Leaderboard local...');
// Guardar segunda partida (derrota de Danny)
client.saveToLocalHistory({
  ...testMatch,
  winner: 'O'
});

const leaderboard = client.calculateLocalLeaderboard();
assert.strictEqual(leaderboard.length, 1);
assert.strictEqual(leaderboard[0].player_name, 'Danny');
assert.strictEqual(leaderboard[0].games_played, 2);
assert.strictEqual(leaderboard[0].wins, 1);
assert.strictEqual(leaderboard[0].losses, 1);
assert.strictEqual(leaderboard[0].win_rate, 50.0);
console.log('✅ Leaderboard calculado con éxito (50% efectividad verificado).');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LÓGICA DE SUPABASE PASARON EXITOSAMENTE!');
