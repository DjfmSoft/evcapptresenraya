/**
 * CLIENTE DE INTEGRACIÓN CON SUPABASE PARA TRES EN RAYA
 * Soporta modo conectado (Supabase PostgreSQL + RLS) y modo local/offline resiliente.
 */

class SupabaseGameClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.lastConnectionError = null;
    this.init();
  }

  init() {
    const isConfigValid = typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.isConfigured();
    const hasSupabaseLib = typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function';

    if (isConfigValid && hasSupabaseLib) {
      try {
        this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        this.isConnected = true;
        this.lastConnectionError = null;
      } catch (err) {
        console.warn('[SupabaseGameClient] Error al inicializar cliente:', err);
        this.client = null;
        this.isConnected = false;
        this.lastConnectionError = err.message;
      }
    } else {
      this.client = null;
      this.isConnected = false;
    }
  }

  isReady() {
    return Boolean(this.client && this.isConnected);
  }

  async testConnection() {
    if (!SUPABASE_CONFIG.isConfigured()) {
      return {
        success: false,
        message: 'Credenciales incompletas. Por favor ingresa la URL y la Anon Key de tu proyecto.'
      };
    }

    try {
      this.init();
      if (!this.client) {
        return {
          success: false,
          message: 'No se pudo inicializar la librería de Supabase en el navegador.'
        };
      }

      // Consulta de prueba a la tabla matches (HEAD count para no descargar datos)
      const { error, count } = await this.client
        .from('matches')
        .select('*', { count: 'exact', head: true });

      if (error) {
        this.isConnected = false;
        this.lastConnectionError = error.message;
        return {
          success: false,
          message: `Error de Supabase: ${error.message} (Verifica que ejecutaste el script supabase_schema.sql en el SQL Editor).`
        };
      }

      this.isConnected = true;
      this.lastConnectionError = null;
      return {
        success: true,
        message: '¡Conexión exitosa con Supabase! Tabla de partidas detectada.',
        count: count || 0
      };
    } catch (err) {
      this.isConnected = false;
      this.lastConnectionError = err.message;
      return {
        success: false,
        message: `Fallo de red o URL inválida: ${err.message}`
      };
    }
  }

  /**
   * Guarda una partida finalizada en Supabase (con respaldo local)
   */
  async saveMatch(matchData) {
    // Normalización y validación del payload
    const payload = {
      game_mode: matchData.game_mode || 'pve',
      difficulty: matchData.difficulty || null,
      player_x_name: (matchData.player_x_name || 'Jugador X').substring(0, 30).trim(),
      player_o_name: (matchData.player_o_name || (matchData.game_mode === 'pve' ? 'IA' : 'Jugador O')).substring(0, 30).trim(),
      winner: matchData.winner, // 'X', 'O', 'tie'
      winning_combo: Array.isArray(matchData.winning_combo) ? matchData.winning_combo : null,
      total_moves: Math.max(5, Math.min(9, parseInt(matchData.total_moves, 10) || 5)),
      duration_seconds: Math.max(0, parseInt(matchData.duration_seconds, 10) || 0),
      final_board: Array.isArray(matchData.final_board) ? matchData.final_board.map(c => c || '') : Array(9).fill(''),
      moves_history: Array.isArray(matchData.moves_history) ? matchData.moves_history : []
    };

    // 1. Guardar siempre en historial local (offline-first)
    this.saveToLocalHistory(payload);

    // 2. Si Supabase está disponible, insertar en la nube
    if (this.isReady()) {
      try {
        const { data, error } = await this.client
          .from('matches')
          .insert([payload])
          .select();

        if (error) {
          console.warn('[SupabaseGameClient] Error al insertar partida en Supabase:', error);
          return { success: false, isLocal: true, error: error.message };
        }

        return { success: true, isLocal: false, data: data ? data[0] : null };
      } catch (err) {
        console.warn('[SupabaseGameClient] Excepción de red al guardar en Supabase:', err);
        return { success: false, isLocal: true, error: err.message };
      }
    }

    return { success: true, isLocal: true, message: 'Guardado en almacenamiento local.' };
  }

  /**
   * Obtiene las partidas más recientes
   */
  async getRecentMatches(limit = 10) {
    if (this.isReady()) {
      try {
        const { data, error } = await this.client
          .from('matches')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && Array.isArray(data)) {
          return { data, source: 'supabase' };
        }
      } catch (err) {
        console.warn('[SupabaseGameClient] Error al leer partidas de Supabase, usando respaldo local:', err);
      }
    }

    // Fallback: historial local
    return { data: this.getLocalHistory().slice(0, limit), source: 'local' };
  }

  /**
   * Obtiene la tabla de clasificación (ranking)
   */
  async getLeaderboard(limit = 10) {
    if (this.isReady()) {
      try {
        const { data, error } = await this.client
          .from('player_stats')
          .select('*')
          .order('wins', { ascending: false })
          .order('win_rate', { ascending: false })
          .limit(limit);

        if (!error && Array.isArray(data) && data.length > 0) {
          return { data, source: 'supabase' };
        }
      } catch (err) {
        console.warn('[SupabaseGameClient] Error al leer ranking de Supabase, usando cálculo local:', err);
      }
    }

    // Fallback: calcular ranking a partir del historial local
    return { data: this.calculateLocalLeaderboard().slice(0, limit), source: 'local' };
  }

  // --- MÉTODOS LOCALES Y FALLBACK (OFFLINE-FIRST) ---

  getLocalHistory() {
    try {
      const raw = localStorage.getItem('tres_en_raya_local_matches');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveToLocalHistory(payload) {
    try {
      const history = this.getLocalHistory();
      const matchWithMeta = {
        ...payload,
        id: 'local-' + Date.now(),
        created_at: new Date().toISOString()
      };
      history.unshift(matchWithMeta);
      // Mantener últimas 30 partidas en memoria local
      if (history.length > 30) history.pop();
      localStorage.setItem('tres_en_raya_local_matches', JSON.stringify(history));
    } catch (err) {
      console.warn('[SupabaseGameClient] Error al guardar en localStorage:', err);
    }
  }

  calculateLocalLeaderboard() {
    const history = this.getLocalHistory();
    const statsMap = {};

    history.forEach(m => {
      const x = m.player_x_name || 'Jugador X';
      if (!statsMap[x]) {
        statsMap[x] = { player_name: x, games_played: 0, wins: 0, losses: 0, ties: 0, hard_ai_wins: 0 };
      }
      statsMap[x].games_played++;
      if (m.winner === 'X') {
        statsMap[x].wins++;
        if (m.game_mode === 'pve' && m.difficulty === 'hard') statsMap[x].hard_ai_wins++;
      } else if (m.winner === 'O') {
        statsMap[x].losses++;
      } else {
        statsMap[x].ties++;
      }

      if (m.game_mode === 'pvp') {
        const o = m.player_o_name || 'Jugador O';
        if (!statsMap[o]) {
          statsMap[o] = { player_name: o, games_played: 0, wins: 0, losses: 0, ties: 0, hard_ai_wins: 0 };
        }
        statsMap[o].games_played++;
        if (m.winner === 'O') statsMap[o].wins++;
        else if (m.winner === 'X') statsMap[o].losses++;
        else statsMap[o].ties++;
      }
    });

    const list = Object.values(statsMap).map(p => ({
      ...p,
      win_rate: p.games_played > 0 ? parseFloat(((p.wins / p.games_played) * 100).toFixed(2)) : 0
    }));

    list.sort((a, b) => b.wins - a.wins || b.win_rate - a.win_rate);
    return list;
  }
}

// Instancia global
const supabaseGameClient = new SupabaseGameClient();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SupabaseGameClient, supabaseGameClient };
}
