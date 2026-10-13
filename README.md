# 🎮 Tres en Raya (Tic-Tac-Toe) con Inteligencia Artificial Avanzada y Supabase

Una versión moderna, interactiva y reactiva del clásico **Tres en Raya** construida con tecnologías web nativas (**HTML5**, **CSS3 con estética Glassmorphism & Neón**, **JavaScript ES6+**), persistencia en la nube mediante **Supabase (PostgreSQL)** y un ecosistema de **Modelos de Inteligencia Artificial (Machine Learning & Agente LLM)**.

---

## 🧠 Motores de Inteligencia Artificial Disponibles

El juego cuenta con un **Selector de Cerebro de IA** que permite enfrentar tres paradigmas distintos de computación:

### 1. 🧠 Machine Learning (Reinforcement Learning / Q-Learning)
- **¿Qué es?**: Un modelo de aprendizaje por refuerzo real con **Q-Table** que aprende mediante recompensas y castigos a partir de la ecuación de Bellman:
  $$Q(s, a) \leftarrow Q(s, a) + \alpha \left[ r + \gamma \max_{a'} Q(s', a') - Q(s, a) \right]$$
- **Representación Canónica y 8 Simetrías:** El modelo mapea rotaciones y reflejos para generalizar instantáneamente cualquier posición del tablero.
- **⚡ Auto-Entrenamiento (Self-Play):** Botón para entrenar al modelo en el navegador contra sí mismo simulando **1,000, 5,000 o 10,000 partidas** en micro-lotes sin congelar la interfaz.
- **🎯 Heatmap Táctico:** Muestra en tiempo real sobre cada casilla libre el porcentaje de probabilidad y confianza del modelo (con resplandor esmeralda en jugadas maestras).
- **💾 Exportar e Importar:** Permite descargar los pesos aprendidos en formato JSON o importarlos en cualquier momento.

### 2. ✨ Agente Cognitivo Gemini AI (Google LLM: `gemini-3.8-flash`)
- **¿Qué es?**: Un rival inteligente con razonamiento estratégico y análisis en lenguaje natural impulsado por la API de Google Gemini.
- **Structured Outputs (JSON Schema):** El modelo devuelve la jugada, la justificación táctica y un comentario reactivo.
- **Personalidades Dinámicas:**
  - 🔥 **Rival Competitivo:** Burlón, ingenioso y celebratorio.
  - 🧘 **Maestro Zen:** Filosófico, reflexivo y pacífico.
  - 🤖 **Cyber-AI:** Analítico, frío y calculador.
- **Modo Simulado Automático:** Si no tienes API Key configurada, el agente funciona de manera simulada con análisis táctico local.

### 3. ⚙️ Algoritmo Clásico (Minimax)
- Algoritmo de teoría de juegos con búsqueda exhaustiva en árbol.
- Niveles: Fácil, Medio e Imposible (matemáticamente invencible).
- Mantenido como línea base de comparación (Baseline).

---

## 🗄️ Persistencia en la Nube con Supabase

El juego incluye integración completa con **Supabase (PostgreSQL)**:
- **`matches`:** Historial de partidas con ganador, duración, tablero final y secuencia de movimientos (`JSONB`).
- **`player_stats`:** Clasificación global (Leaderboard) con victorias, derrotas, empates, victorias vs IA y tasa de victorias (`win_rate`), calculada automáticamente mediante triggers en la base de datos.
- **Offline-First:** Si no configuras Supabase, funciona 100% de manera local con `localStorage` sin errores.

---

## 🚀 Cómo Jugar

No requiere compilación ni instalación de paquetes (`npm`, etc.).

### Abrir directamente:
Haz doble clic en `index.html` o ejecuta en PowerShell:
```powershell
Start-Process index.html
```

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con 3 suites de pruebas automatizadas:
```powershell
node test_ai_models.js      # Pruebas de Q-Learning, simetrías, 100 partidas y Gemini Agent
node test_minimax.js        # Pruebas de Minimax clásico (0 derrotas en 100 partidas)
node test_supabase_logic.js # Pruebas de payloads, RLS y fallback local de Supabase
```

---

## 📁 Estructura del Código

```
proyecto01/
├── index.html              # Interfaz accesible, modales, diálogo de IA y heatmap
├── style.css               # Tema Dark Glassmorphism, animaciones y estilos de IA
├── script.js               # Orquestador del juego, turnos y mediador de modelos
├── qLearningModel.js       # Motor de Reinforcement Learning (Q-Learning y Self-Play)
├── geminiAgent.js          # Agente cognitivo con Google Gemini 3.8 Flash y personalidades
├── supabaseClient.js       # Cliente de datos para Supabase y fallback local
├── supabase_schema.sql     # Esquema SQL para Supabase (tablas, RLS y triggers)
├── config.js               # Configuración de credenciales de Supabase
├── test_ai_models.js       # Pruebas del modelo Q-Learning y Agente Gemini
├── test_minimax.js         # Pruebas del algoritmo Minimax
├── test_supabase_logic.js  # Pruebas de la lógica de Supabase
└── README.md               # Esta documentación
```
