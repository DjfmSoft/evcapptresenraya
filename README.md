# 🎮 Tres en Raya (Tic-Tac-Toe) con Supabase Cloud

Una versión moderna, elegante y reactiva del clásico juego de **Tres en Raya** construida con tecnologías web nativas (**HTML5**, **CSS3 con estética Glassmorphism & Neón**, **JavaScript ES6+**) y persistencia en la nube mediante **Supabase (PostgreSQL)**.

---

## ⚡ ¿Qué información se guarda en la Base de Datos?

El juego almacena los datos en **Supabase** a través de un esquema relacional con seguridad por filas (**Row Level Security - RLS**):

### 1. Tabla `matches` (Historial de Partidas)
Guarda la instantánea de cada partida completada:
- **`id`** (`UUID`): Identificador único global.
- **`created_at`** (`TIMESTAMPTZ`): Fecha y hora del encuentro.
- **`game_mode`** (`TEXT`): `'pve'` (vs IA) o `'pvp'` (2 jugadores local).
- **`difficulty`** (`TEXT`): `'easy'`, `'medium'`, `'hard'`.
- **`player_x_name`** (`TEXT`): Apodo del Jugador X (ej. `"Danny"`).
- **`player_o_name`** (`TEXT`): Apodo del Jugador O o `"IA"`.
- **`winner`** (`TEXT`): Ganador (`'X'`, `'O'`, o `'tie'` para empate).
- **`winning_combo`** (`INT2[]`): Casillas de la línea ganadora (ej. `[0, 4, 8]`).
- **`total_moves`** (`INT2`): Cantidad de movimientos (5 a 9).
- **`duration_seconds`** (`INT4`): Duración de la partida en segundos.
- **`final_board`** (`TEXT[]`): Estado final del tablero de 9 casillas.
- **`moves_history`** (`JSONB`): Secuencia cronológica movimiento a movimiento con marcas de tiempo (permite reproducir la partida).

### 2. Tabla `player_stats` (Clasificación Global / Leaderboard)
Calculado y actualizado automáticamente con un trigger en PostgreSQL:
- **`player_name`**: Apodo del jugador.
- **`games_played`**: Total de partidas.
- **`wins`**, **`losses`**, **`ties`**: Victorias, derrotas y empates.
- **`hard_ai_wins`**: Victorias conseguidas contra la IA en nivel Imposible (Minimax).
- **`win_rate`**: Porcentaje de efectividad calculado (`wins / games_played * 100`).
- **`win_streak`** y **`best_win_streak`**: Racha actual y récord histórico de victorias consecutivas.

---

## 🚀 Conexión con Supabase en 3 Pasos

### Paso 1: Crear proyecto en Supabase
1. Ingresa a [https://supabase.com](https://supabase.com) y crea una cuenta o inicia sesión (gratis).
2. Haz clic en **"New Project"** y asígnale un nombre (ej. `tres-en-raya`).

### Paso 2: Crear las tablas y políticas de seguridad
1. En el menú lateral de Supabase, entra a **SQL Editor**.
2. Abre el archivo local [`supabase_schema.sql`](file:///c:/Personal/Estudio/Dmc/Esp-Vibe-Coding-App/Antigravity/proyecto01/supabase_schema.sql).
3. Copia todo su contenido, pégalo en el SQL Editor y presiona **Run**.
4. ¡Listo! Se habrán creado las tablas `matches`, `player_stats`, los índices, las políticas RLS y el trigger automático.

### Paso 3: Conectar la aplicación
1. En Supabase ve a **Project Settings** > **API**.
2. Copia la **Project URL** y la clave pública **anon (public)**.
3. Abre el juego en tu navegador, haz clic en el botón superior **🟡 Modo Local** (o abre el modal de configuración) y pega ambas credenciales.
4. Presiona **Guardar y Conectar**. El badge cambiará a **🟢 Supabase Activo**.

> 💡 **Nota sobre modo Offline-First:** Si no configuras Supabase o estás sin conexión a internet, el juego funciona exactamente igual en modo local (`localStorage`), guardando tu historial y calculando el ranking sin producir ningún error.

---

## 🕹️ Características del Juego

- **🤖 IA con Algoritmo Minimax Invencible:** 3 niveles de dificultad (Fácil, Media, Imposible).
- **👥 Modo 2 Jugadores:** Juega con otra persona por turnos en el mismo dispositivo.
- **🏆 Ranking Global (Leaderboard):** Consulta el Top de mejores jugadores con medallas (🥇, 🥈, 🥉) y efectividad.
- **📜 Historial en la Nube:** Revisa tus últimas partidas disputadas con estadísticas de duración y movimientos.
- **🔊 Web Audio API:** Efectos sonoros sintetizados nativos con botón de silencio.
- **✨ Efectos Visuales Neón:** Línea de victoria animada y explosión de confeti en `<canvas>`.
- **✏️ Personalización de Apodo:** Cambia tu nombre en tiempo real para que tus victorias se registren a tu nombre.

---

## 🧪 Pruebas Automatizadas

Puedes verificar el correcto funcionamiento del motor de IA y de los módulos de Supabase ejecutando en la terminal:

```powershell
node test_minimax.js
node test_supabase_logic.js
```
Ambas suites validan:
- Las 8 combinaciones de victoria y condiciones de empate.
- Que la IA Minimax nunca pierda una partida (0 derrotas en simulaciones probabilísticas).
- Validación de payloads, guardado de partidas y cálculo de rankings locales y en la nube.

---

## 📁 Estructura del Proyecto

```
proyecto01/
├── index.html              # Interfaz accesible, modales y estructura
├── style.css               # Tema Dark Glassmorphism, animaciones y modales
├── script.js               # Lógica del juego, IA Minimax, Audio y Modales
├── supabase_schema.sql      # Script SQL completo para Supabase (Tablas, RLS, Triggers)
├── config.js               # Configuración desacoplada de credenciales
├── supabaseClient.js       # Cliente de integración con Supabase y fallback local
├── test_minimax.js         # Pruebas automatizadas de la IA
├── test_supabase_logic.js  # Pruebas automatizadas de la lógica de Supabase
└── README.md               # Esta documentación
```
