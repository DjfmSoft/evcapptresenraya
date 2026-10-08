/**
 * CONFIGURACIÓN DE SUPABASE PARA TRES EN RAYA
 *
 * Puedes configurar tus credenciales aquí directamente o mediante el botón
 * "⚙️ Conexión DB" en la interfaz del juego (se guardarán en tu navegador).
 */

const getStored = (key) => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key) || '';
  }
  return '';
};

const setStored = (key, val) => {
  if (typeof localStorage !== 'undefined') {
    if (val) localStorage.setItem(key, val);
    else localStorage.removeItem(key);
  }
};

const SUPABASE_CONFIG = {
  // Pega aquí la URL de tu proyecto Supabase (ej: 'https://xxxxxxxxxxxx.supabase.co')
  url: getStored('tres_en_raya_supabase_url'),

  // Pega aquí la clave pública Anon de tu proyecto
  anonKey: getStored('tres_en_raya_supabase_anon_key'),

  // Métodos auxiliares para actualizar y limpiar credenciales
  saveCredentials(url, anonKey) {
    this.url = (url || '').trim();
    this.anonKey = (anonKey || '').trim();
    setStored('tres_en_raya_supabase_url', this.url);
    setStored('tres_en_raya_supabase_anon_key', this.anonKey);
  },

  clearCredentials() {
    this.url = '';
    this.anonKey = '';
    setStored('tres_en_raya_supabase_url', '');
    setStored('tres_en_raya_supabase_anon_key', '');
  },

  isConfigured() {
    return Boolean(this.url && this.anonKey && this.url.startsWith('http'));
  }
};

// Exportar para entornos Node.js (tests) o navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUPABASE_CONFIG };
}
