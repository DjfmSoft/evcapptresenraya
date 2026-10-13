/**
 * AGENTE COGNITIVO GENERATIVO: GOOGLE GEMINI AI
 * Integra el modelo gemini-3.8-flash con Structured Outputs (JSON Schema),
 * análisis táctico en vivo, personalidades dinámicas y fallback simulado.
 */

class GeminiGameAgent {
  constructor() {
    this.modelName = 'gemini-3.8-flash';
    this.apiKey = this.loadApiKey();
    this.personality = this.loadPersonality() || 'competitivo';
    this.isLive = Boolean(this.apiKey);
  }

  loadApiKey() {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem('tres_en_raya_gemini_key') || '';
  }

  saveApiKey(key) {
    this.apiKey = (key || '').trim();
    if (typeof localStorage !== 'undefined') {
      if (this.apiKey) {
        localStorage.setItem('tres_en_raya_gemini_key', this.apiKey);
      } else {
        localStorage.removeItem('tres_en_raya_gemini_key');
      }
    }
    this.isLive = Boolean(this.apiKey);
  }

  loadPersonality() {
    if (typeof localStorage === 'undefined') return 'competitivo';
    return localStorage.getItem('tres_en_raya_gemini_personality') || 'competitivo';
  }

  setPersonality(p) {
    this.personality = p;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tres_en_raya_gemini_personality', p);
    }
  }

  getPersonalitySystemPrompt() {
    switch (this.personality) {
      case 'zen':
        return 'Eres el Gran Maestro Zen de Tres en Raya. Tu tono es sabio, reflexivo y pacífico. Ofreces consejos filosóficos sobre la armonía del tablero.';
      case 'cyberpunk':
        return 'Eres CYBER-AI 3.8, un procesador táctico cibernético autónomo. Tu tono es frío, analítico, ultra-preciso, usando términos de cómputo y probabilidades de victoria.';
      case 'competitivo':
      default:
        return 'Eres un rival de videojuegos competitivo, divertido, ocurrente y desafiante. Te encanta ganar, lanzas comentarios ingeniosos cuando el rival se equivoca y celebras tus jugadas.';
    }
  }

  /**
   * Solicita una jugada con análisis táctico y comentario a Gemini 3.8 Flash
   */
  async decideMove(board, availableMoves, history = []) {
    if (!availableMoves || availableMoves.length === 0) return null;

    // Si hay API Key configurada, llamar a la API oficial de Google Gemini
    if (this.apiKey) {
      try {
        const liveDecision = await this.callGeminiAPI(board, availableMoves, history);
        if (liveDecision && availableMoves.includes(liveDecision.move)) {
          return {
            ...liveDecision,
            source: 'gemini-live',
            model: this.modelName
          };
        }
      } catch (err) {
        console.warn('[GeminiGameAgent] Fallo al llamar Gemini API, recurriendo a simulación:', err);
      }
    }

    // Fallback inteligente simulado (sin API Key o fallo de red)
    return this.getSimulatedDecision(board, availableMoves);
  }

  async callGeminiAPI(board, availableMoves, history) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    const boardDiagram = `
      [${board[0] || '0'}][${board[1] || '1'}][${board[2] || '2'}]
      [${board[3] || '3'}][${board[4] || '4'}][${board[5] || '5'}]
      [${board[6] || '6'}][${board[7] || '7'}][${board[8] || '8'}]
    `;

    const promptText = `
      Juegas como 'O' en Tres en Raya (Tic-Tac-Toe) contra un jugador humano que juega como 'X'.
      Tablero actual con índices numéricos para casillas vacías:
      ${boardDiagram}

      Casillas libres disponibles estrictamente válidas: [${availableMoves.join(', ')}].
      Instrucción de rol: ${this.getPersonalitySystemPrompt()}

      Analiza el tablero y responde exactamente en formato JSON con la siguiente estructura:
      {
        "move": (número entero entre las casillas libres disponibles [${availableMoves.join(', ')}]),
        "comment": "(comentario breve y llamativo en español de máximo 15 palabras acorde a tu personalidad)",
        "tactical_analysis": "(explicación táctica concisa de por qué eliges esa casilla)",
        "blunder_detected": (true si el humano dejó una casilla ganadora abierta o regaló la partida, false si no)
      }
    `;

    const bodyPayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        response_mime_type: 'application/json',
        response_schema: {
          type: 'OBJECT',
          properties: {
            move: { type: 'INTEGER' },
            comment: { type: 'STRING' },
            tactical_analysis: { type: 'STRING' },
            blunder_detected: { type: 'BOOLEAN' }
          },
          required: ['move', 'comment', 'tactical_analysis']
        }
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Respuesta vacía de Gemini');
    }

    const parsed = JSON.parse(candidateText);
    return parsed;
  }

  /**
   * Genera decisión táctica simulada con personalidad cuando no hay API Key activa
   */
  getSimulatedDecision(board, availableMoves) {
    const winCombos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    // 1. ¿Puede la IA ganar inmediatamente?
    for (const move of availableMoves) {
      const copy = [...board];
      copy[move] = 'O';
      for (const [a, b, c] of winCombos) {
        if (copy[a] === 'O' && copy[b] === 'O' && copy[c] === 'O') {
          return {
            move,
            comment: this.personality === 'zen'
              ? 'La partida encuentra su conclusión natural en esta casilla.'
              : this.personality === 'cyberpunk'
              ? 'Vector crítico localizado. Secuencia ganadora ejecutada.'
              : '¡Ja! ¡Tres en raya! Excelente intento, pero este punto es mío.',
            tactical_analysis: `Completé la combinación ganadora en la casilla ${move + 1}.`,
            blunder_detected: true,
            source: 'gemini-simulated'
          };
        }
      }
    }

    // 2. ¿El humano puede ganar en su siguiente turno? Bloquear
    for (const move of availableMoves) {
      const copy = [...board];
      copy[move] = 'X';
      for (const [a, b, c] of winCombos) {
        if (copy[a] === 'X' && copy[b] === 'X' && copy[c] === 'X') {
          return {
            move,
            comment: this.personality === 'zen'
              ? 'El equilibrio se restablece bloqueando tu avance.'
              : this.personality === 'cyberpunk'
              ? 'Amenaza hostil detectada. Protocolo de bloqueo activado.'
              : '¡Casi me sorprendes! Pero vi esa jugada venir a kilómetros.',
            tactical_analysis: `Bloqueé tu posible victoria en la casilla ${move + 1}.`,
            blunder_detected: false,
            source: 'gemini-simulated'
          };
        }
      }
    }

    // 3. Tomar el centro si está libre
    if (availableMoves.includes(4)) {
      return {
        move: 4,
        comment: this.personality === 'zen'
          ? 'El centro es el núcleo de todo movimiento armónico.'
          : this.personality === 'cyberpunk'
          ? 'Adquiriendo nodo central. Control espacial maximizado al 88%.'
          : 'El centro del tablero siempre pertenece a quien domina la partida.',
        tactical_analysis: 'Ocupé el centro (casilla 5) para dominar filas y diagonales.',
        blunder_detected: false,
        source: 'gemini-simulated'
      };
    }

    // 4. Tomar esquina o mejor movimiento disponible
    const corners = [0, 2, 6, 8].filter(c => availableMoves.includes(c));
    const chosenMove = corners.length > 0
      ? corners[Math.floor(Math.random() * corners.length)]
      : availableMoves[Math.floor(Math.random() * availableMoves.length)];

    return {
      move: chosenMove,
      comment: this.personality === 'zen'
        ? 'Un paso paciente hoy construye el camino del mañana.'
        : this.personality === 'cyberpunk'
        ? 'Optimizando posición táctica periférica.'
        : 'Interesante apertura. Veamos cómo respondes a esta jugada.',
      tactical_analysis: `Ocupé la casilla ${chosenMove + 1} para expandir mis opciones ofensivas.`,
      blunder_detected: false,
      source: 'gemini-simulated'
    };
  }
}

// Instancia global
const geminiGameAgent = new GeminiGameAgent();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeminiGameAgent, geminiGameAgent };
}
