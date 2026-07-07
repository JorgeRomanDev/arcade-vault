---
spec: 09
title: Arcade Vault — Juego Snake
state: Aprobado
date: 2026-07-06
depends_on: [05-juego-asteroides, 06-tabla-juegos-leaderboard]
objective: Crear desde cero (sin código de referencia) el juego Snake como componente React del proyecto, nueva entrada de catálogo id "snake", usando el atlas de sprites de fruta provisto en references/source-assets/snake-assets/ como arte del juego, jugable con teclado dentro de GamePlayer.
---

## Alcance

### Dentro

- No hay código de referencia en `references/started-games/` para Snake — el juego se diseña desde cero siguiendo el contrato de props estándar de la plataforma (mismo patrón que asteroides/tetris/arkanoid)
- Fila nueva en `games` (Supabase): `id: 'snake'`, `title: 'SNAKE'`, `cat: 'ARCADE'`, `color: 'green'`, `cover: 'cover-snake'`, `short`/`long` propios
- Reescritura de la clase CSS `.cover-snake` ya existente en `app/globals.css` (actualmente un placeholder decorativo sin lógica real, líneas 713-729) con un diseño propio para este juego; se mantiene el nombre de clase, se reemplaza su contenido
- Copiar `references/source-assets/snake-assets/fruits.png` a `public/snake/fruits.png` para que el navegador pueda cargarlo en tiempo de ejecución (todo lo bajo `references/` no se sirve públicamente)
- Portar la lógica de `references/source-assets/snake-assets/sprites.js` (`window.SPRITE_ATLAS`) como constante TS interna del componente (coordenadas de recorte de las 21 frutas), apuntando a `/snake/fruits.png`
- Componente dedicado `app/components/games/SnakeGame.tsx` (`'use client'`):
  - Movimiento en grid discreto: la serpiente avanza 1 celda por tick (no movimiento continuo por píxel)
  - Canvas 800×600, celdas de ~20px (40×30 celdas)
  - Controles: flechas `←/→/↑/↓`, cambia dirección de la serpiente; se ignora un input que revierta 180° directamente sobre el propio cuerpo (ej. ir derecha y pulsar izquierda en el mismo tick)
  - Fruta: en cada spawn se elige aleatoriamente una de las 21 variedades del atlas (`fruits.apple`, `fruits.banana`, etc.), dibujada con `drawImage` recortando `fruits.png` según sus coordenadas `{x, y, w, h}`
  - Comer fruta: la serpiente crece 1 segmento, suma puntos, se genera nueva fruta en celda libre aleatoria
  - `level` sube cada 5 frutas comidas; cada subida de nivel acelera el tick de movimiento (intervalo entre pasos se reduce)
  - `lives` se fija en 1 de forma constante (Snake clásico no tiene vidas múltiples) — se documenta explícitamente que no varía durante la partida
  - Fin de partida: la serpiente choca contra el borde del tablero O contra su propio cuerpo → `onGameOver(finalScore)` inmediato
- Controles: solo teclado (precedente de asteroides/tetris/arkanoid) — sin controles táctiles
- Integración en `app/components/screens/GamePlayer.tsx`: cuando `id === "snake"`, renderiza `<SnakeGame>` en vez del placeholder decorativo, con el mismo mecanismo de `paused`/`restartSignal`/`onStateChange`/`onGameOver` que los juegos ya implementados
- Guardado de puntuación reutiliza `saveScore` de `app/lib/games.ts` contra Supabase (`scores`, `game_id: 'snake'`), mismo mecanismo que asteroides/tetris/arkanoid

### Fuera de alcance

- Controles táctiles / móvil
- Power-ups, obstáculos, múltiples frutas simultáneas, modos de juego alternativos
- Wrap toroidal en los bordes (se descarta explícitamente: chocar contra el borde es game over, no reaparición al otro lado)
- Vidas múltiples (se fija `lives: 1` constante, no hay sistema de vidas real)
- Sonido/efectos de audio
- Cambios a `GameDetail.tsx`, `Library.tsx`, `HallOfFame.tsx`, `AppShell.tsx` más allá de que ya funcionan genéricamente con cualquier `id`/fila de `games`
- Cambios a `app/lib/games.ts`, `app/lib/supabase/client.ts` (ya soportan cualquier `game_id` sin modificación)
- Dificultad ajustable por el jugador (velocidad inicial, tamaño de grid, etc.)

---

## Modelo de datos

### Fila nueva en `games` (Supabase)

```sql
insert into games (id, title, short, long, cat, cover, color) values (
  'snake',
  'SNAKE',
  'Devora fruta, crece, no te muerdas la cola.',
  'Guía a la serpiente por una cuadrícula sin fin. Cada fruta la alarga y suma puntos; chocar contra tu propio cuerpo o el borde termina la partida.',
  'ARCADE',
  'cover-snake',
  'green'
);
```

### Props de `SnakeGame`

```ts
interface SnakeGameProps {
  paused: boolean;
  restartSignal: number; // se incrementa para disparar reset in-place
  onStateChange: (state: {
    score: number;
    lives: number; // siempre 1, constante — Snake clásico no tiene vidas múltiples
    level: number; // sube cada 5 frutas comidas
  }) => void;
  onGameOver: (finalScore: number) => void;
}
```

- `lives` se reporta fijo en `1` en cada `onStateChange`; no decrementa nunca — se documenta así para que el HUD React no muestre una barra de vidas engañosa
- `level` inicia en 1, sube en +1 cada 5 frutas comidas; cada incremento reduce el intervalo del tick de movimiento (acelera la serpiente)

### Atlas de sprites (`app/components/games/SnakeGame.tsx`, constante interna)

Portado literal de `references/source-assets/snake-assets/sprites.js`, adaptado a TS y apuntando al asset copiado:

```ts
const FRUIT_SHEET_SRC = "/snake/fruits.png";

const FRUIT_ATLAS: Record<
  string,
  { x: number; y: number; w: number; h: number }
> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};
```

- En cada spawn de fruta, se elige una clave aleatoria de `FRUIT_ATLAS` y se dibuja con `ctx.drawImage(img, x, y, w, h, dx, dy, cellSize, cellSize)`
- La imagen (`HTMLImageElement`) se carga una vez vía `useRef` + `useEffect` al montar el componente

### Tablero y grid

- Canvas fijo 800×600 (igual que asteroides/tetris/arkanoid)
- Grid de celdas de 20px → 40 columnas × 30 filas
- Estado del juego (serpiente como array de celdas, dirección, fruta actual, score, nivel) encapsulado en `useRef`, igual que el resto de juegos del catálogo

---

## Plan de implementación

1. **Assets — copiar sprites a `public/`**
   - Copiar `references/source-assets/snake-assets/fruits.png` → `public/snake/fruits.png`
   - No se copia `sprites.js` tal cual (queda como referencia en `references/`); sus coordenadas se transcriben a la constante TS `FRUIT_ATLAS` dentro de `SnakeGame.tsx`

2. **Catálogo — fila Snake en Supabase**
   - Vía Supabase MCP (`apply_migration` o `execute_sql`), insertar la fila `snake` en `games` (ver Modelo de datos)
   - Verificar con `list_tables`/consulta que la fila existe con los campos correctos

3. **CSS — reescribir `.cover-snake`**
   - En `app/globals.css`, reemplazar el contenido actual de `.cover-snake`/`.cover-snake::after` (líneas 713-729, placeholder decorativo sin uso real) por un diseño propio: fondo oscuro verdoso + patrón de cuadrícula/serpiente segmentada, coherente con el resto de `.cover-*`
   - Confirmar que ya existe `@source inline("cover-snake");` cerca del inicio del archivo (si no, añadirla — Tailwind 4 purga la clase si falta el safelist)

4. **Componente del juego — `SnakeGame.tsx`**
   - Crear `app/components/games/SnakeGame.tsx` (`'use client'`)
   - Constantes: `FRUIT_ATLAS`, `FRUIT_SHEET_SRC`, tamaño de grid (40×30 celdas de 20px), tick inicial de movimiento, decremento de tick por nivel
   - Estado interno en `useRef`: array de segmentos de la serpiente, dirección actual y dirección en cola (para no permitir giro de 180° dentro del mismo tick), posición y variedad de la fruta actual, `score`, `level`, `frutasComidas`, acumulador de tiempo para el tick de movimiento
   - Montar `canvas` vía `useRef<HTMLCanvasElement>`, tamaño fijo 800×600
   - Cargar `fruits.png` en un `useRef<HTMLImageElement>` dentro de un `useEffect` al montar
   - Listeners de teclado (`keydown`) en `useEffect`, limpiados al desmontar; actualizan la dirección en cola (validando que no sea 180° opuesta a la actual)
   - Loop `requestAnimationFrame` en `useEffect`; solo avanza la serpiente 1 celda cuando el acumulador de tiempo supera el intervalo de tick vigente (ligado a `level`); se detiene/reanuda según prop `paused`
   - Lógica de paso: mover cabeza en la dirección en cola, detectar colisión con borde o con el propio cuerpo (→ game over), detectar si la nueva celda coincide con la fruta (→ crecer, sumar score, incrementar `frutasComidas`, generar nueva fruta en celda libre aleatoria, si `frutasComidas % 5 === 0` subir `level` y reducir el intervalo de tick)
   - `draw()`: fondo de grid, cuerpo de la serpiente (segmentos rectangulares), fruta actual vía `drawImage` recortando `FRUIT_ATLAS`
   - En cada paso de movimiento, llamar `onStateChange({ score, lives: 1, level })`
   - Cuando ocurre colisión de borde/cuerpo, llamar `onGameOver(score)` una sola vez y detener el loop
   - Prop `restartSignal`: un `useEffect` que reacciona a sus cambios y reinicia serpiente/score/level/tick al estado inicial

5. **GamePlayer — integración**
   - En `app/components/screens/GamePlayer.tsx`: si `game.id === 'snake'`, renderizar `<SnakeGame paused={paused} restartSignal={restartCount} onStateChange={...} onGameOver={...} />` dentro de `.crt-screen`, en vez de `.game-arena` con divs decorativos
   - Para otros juegos (`id !== 'snake'`), mantener el comportamiento actual sin cambios
   - Igual mecanismo de `restart()`/`endGame()` que asteroides/tetris/arkanoid

6. **Guardado de puntuación**
   - Reutilizar `saveScore({ gameId: 'snake', name, score })` de `app/lib/games.ts` sin cambios en ese módulo

7. **Verificación manual**
   - `npm run dev`, navegar a Vault → tarjeta "SNAKE" (cover propio, categoría ARCADE, color verde) → detalle → Jugar
   - Confirmar: serpiente se mueve en grid con flechas, no puede revertir 180° sobre sí misma, come frutas variadas (distintas variedades del atlas visibles), crece 1 segmento por fruta, `level` sube cada 5 frutas y la velocidad aumenta, chocar contra borde o cuerpo dispara game over y modal de guardar puntuación, HUD React muestra score/level actualizados y "vidas" fijo en 1, PAUSA detiene el loop, JUGAR DE NUEVO reinicia sin recargar, puntuación se guarda en Supabase (`scores`, `game_id: 'snake'`) y aparece en GameDetail/HallOfFame

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] `games` contiene fila `snake` con los campos definidos
- [ ] `public/snake/fruits.png` existe y se sirve correctamente (verificable en devtools/Network)
- [ ] Library muestra tarjeta "SNAKE" con `.cover-snake` (diseño nuevo, no el placeholder anterior), categoría ARCADE, color verde
- [ ] Click en la tarjeta navega a GameDetail con id `snake` (leaderboard real vía `getTopScores`, sin cambios de código en GameDetail)
- [ ] "JUGAR AHORA" navega a GamePlayer con id `snake` y renderiza `SnakeGame` (canvas 800×600) en vez de los divs decorativos
- [ ] Serpiente se mueve en grid discreto con `←/→/↑/↓`; un input que revierta 180° directamente se ignora
- [ ] Frutas se dibujan con sprites reales del atlas (`fruits.png`), variando entre las 21 variedades
- [ ] Comer fruta crece la serpiente 1 segmento, suma score, genera nueva fruta en celda libre
- [ ] Cada 5 frutas comidas, `level` sube en +1 y la velocidad de movimiento aumenta perceptiblemente
- [ ] Chocar contra el borde del tablero dispara `onGameOver` y modal de guardar puntuación
- [ ] Chocar contra el propio cuerpo dispara `onGameOver` y modal de guardar puntuación
- [ ] HUD React (`player-hud`) muestra `score`/`level` actualizados en tiempo real; el indicador de vidas se muestra fijo/constante (1), sin decrementar nunca
- [ ] Botón "PAUSA" detiene el juego (serpiente/fruta congeladas); "REANUDAR" continúa exactamente donde quedó
- [ ] Botón "FIN" fuerza el game over y abre el modal de guardar puntuación
- [ ] Modal permite ingresar iniciales y "GUARDAR PUNTUACIÓN" inserta fila real en `scores` con `game_id: 'snake'`, visible en GameDetail/HallOfFame tras refetch
- [ ] "JUGAR DE NUEVO" reinicia el juego (serpiente/score/level vuelven a estado inicial) sin recargar la página ni perder el `<canvas>`
- [ ] "SALIR" navega de vuelta a GameDetail de Snake
- [ ] Otros juegos del catálogo siguen funcionando sin cambios de comportamiento
- [ ] Sin controles táctiles/on-screen añadidos para este juego

---

## Decisiones tomadas y descartadas

| Decisión                              | Elegida                                                     | Descartada                                                           | Razón                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| id del juego                          | `snake`                                                     | `serpiente`                                                          | Usuario eligió `snake`, consistente con el nombre de los assets (`snake-assets/`, `fruits.png`)                                          |
| Colisión con `.cover-snake` existente | Reescribir la clase existente con diseño nuevo              | Crear clase con otro nombre para no tocar la existente               | Usuario confirmó explícitamente: el `.cover-snake` actual es un placeholder decorativo sin juego real detrás, se reemplaza sin conflicto |
| Color de catálogo                     | `green`                                                     | `cyan`/`magenta`/`yellow` (ya usados por tetris/asteroides/arkanoid) | Único color libre; además temáticamente coherente con serpiente/naturaleza                                                               |
| Categoría                             | `ARCADE`                                                    | `PUZZLE`                                                             | Snake es un clásico de arcade de recolección/evasión, no un puzzle de piezas                                                             |
| Movimiento                            | Grid discreto (1 celda por tick)                            | Movimiento continuo por píxel                                        | Fiel al Snake clásico; más simple de razonar para colisiones contra el propio cuerpo                                                     |
| Bordes del tablero                    | Game over al chocar (sin wrap toroidal)                     | Wrap toroidal como asteroides                                        | Usuario confirmó explícitamente: quiere el comportamiento clásico de límite duro, no reaparición al otro lado                            |
| Vidas                                 | `lives` fijo en 1, sin sistema de vidas múltiples           | 3 vidas como asteroides/arkanoid                                     | Usuario confirmó: fiel al Snake clásico, una colisión termina la partida; se documenta como constante explícita en `onStateChange`       |
| Progresión de nivel                   | `level` sube cada 5 frutas, acelera el tick de movimiento   | `level` fijo en 1                                                    | Usuario confirmó: da curva de dificultad progresiva, consistente con el patrón de "level" en asteroides/arkanoid                         |
| Sprites de fruta                      | Las 21 variedades del atlas, elegidas al azar en cada spawn | 1-2 variedades fijas                                                 | Usuario confirmó: aprovechar todo el atlas ya preparado en `sprites.js`                                                                  |
| Ubicación del asset copiado           | `public/snake/fruits.png` (subcarpeta propia)               | `public/fruits.png` (raíz)                                           | Usuario eligió subcarpeta por juego, paralelo a `public/sounds/` ya usado por arkanoid                                                   |
| Tamaño de canvas                      | 800×600, grid de 20px (40×30 celdas)                        | Tamaño/grid distinto                                                 | Consistente con el tamaño fijo de canvas de asteroides/tetris/arkanoid                                                                   |

---

## Riesgos

- **`references/` no se sirve al navegador**: si se olvida copiar `fruits.png` a `public/snake/`, el juego cargará una imagen rota. Mitigar verificando la carga en devtools/Network durante la verificación manual (paso 7 del plan).
- **Reescribir `.cover-snake` sin revisar dependientes**: si algún otro punto del código (aparte del placeholder original ya descartado por spec 06) referenciaba esa clase, el cambio visual sería inesperado. Mitigar con un grep de `cover-snake` en `app/` antes de tocar el CSS.
- **StrictMode doble-montaje (React 19 dev)**: mismo riesgo que asteroides/tetris/arkanoid — el `useEffect` que arranca `requestAnimationFrame` y los listeners de teclado puede ejecutarse dos veces en desarrollo. Mitigar limpiando el loop e id de `requestAnimationFrame` en el cleanup.
- **Canvas fijo 800×600 en layout responsive**: igual riesgo aceptado que en los juegos anteriores; mitigar con CSS (`max-width: 100%`, `height: auto`) sin tocar la lógica interna de coordenadas del grid.
- **Colisión de la serpiente consigo misma en el primer tick tras crecer**: al añadir un segmento nuevo en el mismo tick que se detecta la celda de la cola liberándose, hay riesgo de falso positivo de colisión contra la cola que se está moviendo. Mitigar comprobando colisión contra el cuerpo _antes_ de mover la cola (orden de operaciones: mover cabeza → detectar colisión → si no hay colisión, mover cola solo si no hubo crecimiento).
