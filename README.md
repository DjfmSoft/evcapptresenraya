# 🎮 Tres en Raya (Tic-Tac-Toe) Moderno

Una versión moderna, elegante y reactiva del clásico juego de **Tres en Raya** construida con tecnologías web nativas (**HTML5**, **CSS3 con estética Glassmorphism & Neón**, y **JavaScript ES6+**).

---

## ✨ Características Principales

- **🤖 Modo 1 Jugador (vs Inteligencia Artificial):**
  - **Fácil:** Movimientos aleatorios ideales para partidas relajadas.
  - **Medio:** Bloquea victorias del jugador y busca ganar, con margen de error humano.
  - **Imposible (Minimax):** Implementación del algoritmo **Minimax**, matemáticamente invencible (solo permite victorias de la IA o empates).
- **👥 Modo 2 Jugadores:** Juega en modo local por turnos en el mismo dispositivo.
- **🔊 Audio Sintetizado en Tiempo Real:** Sonidos de movimiento, victoria, empate y clics generados dinámicamente con la **Web Audio API** nativa (sin archivos pesados ni dependencias externas), con botón de silenciar/activar.
- **✨ Animaciones y Efectos Visuales:**
  - Trazo animado de la **línea de victoria** que conecta las casillas ganadoras.
  - Explosión de **confeti interactivo** en `<canvas>` al ganar la partida.
  - Animación pop-in en las fichas y tarjetas con resplandor neón activo para indicar el turno.
- **📊 Marcador Continuo:** Registro de victorias de X, O y empates, persistido en el navegador con `localStorage`.
- **📱 100% Responsivo y Accesible:** Diseñado para funcionar a la perfección en smartphones, tablets y pantallas de escritorio, con soporte de teclado y lectores de pantalla.

---

## 🚀 Cómo Ejecutar el Juego

No se requiere instalación de librerías ni compiladores (`npm`, etc.). Puedes ejecutarlo de dos maneras:

### Opción 1: Abrir directamente en el navegador
Haz doble clic sobre el archivo `index.html` o en Windows PowerShell ejecuta:

```powershell
Start-Process index.html
```

### Opción 2: Usar un servidor local ligero
Con Node.js:
```powershell
npx serve .
```

O con Python:
```powershell
python -m http.server 8000
```
Luego abre tu navegador en `http://localhost:8000`.

---

## 🧪 Pruebas Automatizadas

El proyecto incluye un script de pruebas unitarias y simulaciones que validan el comportamiento del motor de IA y el detector de victorias:

```powershell
node test_minimax.js
```

### Casos de Prueba Verificados:
1. Detección de victorias en las 8 combinaciones posibles (3 filas, 3 columnas, 2 diagonales).
2. Detección precisa de empates en tableros completos.
3. Victoria inmediata tomada por la IA cuando tiene oportunidad.
4. Bloqueo inmediato de jugadas ganadoras del oponente.
5. Partida Minimax vs Minimax (resultado garantizado de empate).
6. Simulación de 100 partidas consecutivas de Jugador Aleatorio vs Minimax (0 derrotas para la IA).

---

## 📁 Estructura del Proyecto

```
proyecto01/
├── index.html        # Estructura semántica, accesibilidad y modales
├── style.css         # Diseño glassmorphism neón, responsive y animaciones
├── script.js         # Lógica de juego, IA Minimax, Audio y Confeti
├── test_minimax.js   # Batería de pruebas automatizadas
└── README.md         # Documentación y guía de uso
```
