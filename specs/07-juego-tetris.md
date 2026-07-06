---
spec: 07
title: Arcade Vault — Juego Tetris
state: Aprobado
date: 2026-07-05
depends_on: [05-juego-asteroides, 06-tabla-juegos-leaderboard]
objective: Portar Tetris (canvas HTML5 puro de references/started-games/03-tetris) a componente React del proyecto, nueva entrada de catálogo id "tetris", jugable con teclado dentro de GamePlayer.
---

## Alcance

### Dentro

- Fila nueva en `games` (Supabase): id `tetris`, title `TETRIS`, cat `PUZZLE`, color `cyan`, cover `cover-tetris`, short/long propios
- Clase CSS `.cover-tetris` en `app/globals.css` (gradiente cian oscuro + grid sutil) + `@source inline("cover-tetris");`
- Componente `app/components/games/TetrisGame.tsx` (`'use client'`), porta de `game.js`: tablero 10x20, 7 piezas, rotación con wall kicks, soft/hard drop, ghost piece, preview siguiente pieza, clear de líneas, niveles/velocidad progresiva
- Excluido del port: theme toggle (claro/oscuro localStorage) — tema ya lo maneja el sitio
- Controles: solo teclado (←/→, ↑/X rotar, ↓ soft drop, Espacio hard drop) — sin tecla P interna de pausa, sin táctil
- Integración en `GamePlayer.tsx`: `id === "tetris"` monta `<TetrisGame>` en vez de placeholder decorativo
- `onStateChange({score, lives, level})` con lives fijo en 1 (constante, sin concepto de vidas en Tetris)
- `onGameOver(finalScore)` cuando pieza nueva colisiona al spawnear
- Pausa/reinicio vía props `paused`/`restartSignal`, estándar del HUD `GamePlayer`
- Guardado de score reutiliza `saveScore()` de `app/lib/games.ts` (spec 06), sin cambios de esquema

### Fuera de alcance

- Theme toggle interno (claro/oscuro) del juego original
- Tecla `P` de pausa interna del juego
- Controles táctiles/móvil
- Hold piece (no está en el original, no se agrega)
- Modificar `Library.tsx`/`GameDetail.tsx`/`HallOfFame.tsx`/`AppShell.tsx`/`app/lib/games.ts`/`app/lib/supabase/client.ts` más allá de que ya funcionan genéricamente con cualquier fila de `games`
- Dificultad ajustable o modos alternativos

---

## Modelo de datos

### Fila nueva en `games` (Supabase, insert)

```sql
insert into games (id, title, short, long, cat, cover, color) values (
  'tetris',
  'TETRIS',
  'Encaja piezas cayendo antes de que el tablero se desborde.',
  'Siete piezas caen desde lo alto de un tablero de 10x20. Rota, desliza y deja caer para completar líneas horizontales antes de que la pila llegue al tope. La velocidad crece con cada nivel.',
  'PUZZLE',
  'cover-tetris',
  'cyan'
);
```

### CSS `.cover-tetris` (`app/globals.css`)

- Gradiente oscuro azul marino → cian, detalle de grid tenue simulando el tablero (mismo patrón visual que `.cover-asteroides`/`.cover-rocas`, paleta propia)
- Añadir `@source inline("cover-tetris");` cerca del inicio del archivo (junto a los demás `@source inline` existentes), o Tailwind 4 purga la clase dinámica

### Props de `TetrisGame`

```ts
interface TetrisGameProps {
  paused: boolean;
  restartSignal: number;
  onStateChange: (state: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
}
```

- `lives` siempre `1` (constante) — Tetris no tiene concepto de vidas, se fija para cumplir el contrato de estado del HUD
- `level` = `floor(lines/10) + 1`, igual que el original
- Canvas dibuja su propio HUD (score/lines/level) si se desea mantener paridad visual con el original, pero la fuente de verdad para React es `onStateChange`
- `restartSignal`: al incrementar, dispara reset in-place (equivalente a `init()`), sin desmontar canvas
- `paused`: al ser `true`, detiene el loop `requestAnimationFrame`; no hay tecla `P` interna

---

## Plan de implementación

1. **Catálogo — seed Tetris**
   - Insert vía Supabase MCP (`execute_sql` o migración) de la fila `tetris` en `games` (ver Modelo de datos)

2. **CSS — cover de catálogo**
   - En `app/globals.css`: añadir `.cover-tetris` + `@source inline("cover-tetris");`

3. **Componente del juego — `TetrisGame.tsx`**
   - Crear `app/components/games/TetrisGame.tsx` (`'use client'`)
   - Portar de `references/started-games/03-tetris/game.js`: `createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, `draw`, `drawNext`
   - Excluir: theme toggle (`applyTheme`, `localStorage` de tema), tecla `P` (`togglePause` interno)
   - Estado del juego (`board`, `current`, `next`, `score`, `lines`, `level`, etc.) encapsulado en `useRef`, no variables globales de módulo
   - Canvas principal 300×600 (tablero) + canvas secundario 120×120 (preview), vía `useRef<HTMLCanvasElement>`
   - Listeners `keydown` en `useEffect`, limpiados al desmontar; sin `keyup` (el original no lo usa)
   - Loop `requestAnimationFrame` respeta prop `paused` (se cancela/reanuda según cambia)
   - En cada tick relevante (drop, línea limpiada, movimiento con puntaje), llamar `onStateChange({ score, lives: 1, level })`
   - Cuando `spawn()` colisiona, llamar `onGameOver(score)` una sola vez
   - `restartSignal`: `useEffect` que reacciona a cambios y ejecuta equivalente a `init()`

4. **GamePlayer — integración**
   - En `app/components/screens/GamePlayer.tsx`: si `game.id === 'tetris'`, renderizar `<TetrisGame paused={paused} restartSignal={restartCount} onStateChange={...} onGameOver={...} />` en vez de `.game-arena` decorativo
   - Otros juegos sin cambios
   - `restart()`/`endGame()` funcionan igual que para asteroides (ver spec 05)

5. **Verificación manual**
   - `npm run dev`, Vault → tarjeta "TETRIS" → detalle → Jugar
   - Confirmar: piezas caen, rotan con wall kicks, ghost piece visible, preview de siguiente pieza correcta, líneas se limpian y suman puntaje×nivel, nivel sube cada 10 líneas y acelera caída, PAUSA detiene el loop, JUGAR DE NUEVO reinicia sin recargar, game over al no caber pieza nueva, score se guarda en Supabase (`scores`)

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] `games` contiene fila `tetris` con los campos definidos
- [ ] Library muestra tarjeta "TETRIS" con `.cover-tetris`, categoría PUZZLE, color cyan
- [ ] Click en tarjeta navega a GameDetail con id `tetris` (leaderboard real vía `getTopScores`, sin cambios de código en GameDetail)
- [ ] "JUGAR AHORA" renderiza `TetrisGame` (canvas 300×600 + preview 120×120) en vez de divs decorativos
- [ ] Piezas caen, se mueven con ←/→, rotan con ↑/X (wall kicks ±1/±2), bajan rápido con ↓, caen instantáneo con Espacio
- [ ] Ghost piece visible con transparencia, preview de siguiente pieza correcta
- [ ] Líneas completas se limpian, puntaje sube según tabla `[0,100,300,500,800]` × nivel
- [ ] Nivel sube cada 10 líneas, velocidad de caída aumenta
- [ ] Botón "PAUSA" detiene el loop; "REANUDAR" continúa exacto donde quedó (sin tecla P interna)
- [ ] Pieza nueva sin espacio al spawnear dispara `onGameOver`, abre modal de guardar puntuación
- [ ] "JUGAR DE NUEVO" reinicia (score/lines/level vuelven a estado inicial) sin recargar ni perder canvas
- [ ] Puntuación guardada se inserta en `scores` con `game_id: 'tetris'`, visible en GameDetail/HallOfFame tras refetch
- [ ] Sin theme toggle ni tecla P añadidos a la UI del juego
- [ ] Sin controles táctiles añadidos

---

## Decisiones tomadas y descartadas

| Decisión                         | Elegida                                                         | Descartada                                                                               | Razón                                                                                                                               |
| -------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| id/color/cat                     | tetris / cyan / PUZZLE                                          | rocas/bloque-buster ids alternativos, magenta (ya usado por asteroides), ARCADE genérico | Nombre directo y reconocible; cyan asocia a pieza I clásica y no repite color de asteroides; PUZZLE refleja mecánica real de encaje |
| Theme toggle                     | Excluido del port                                               | Portar claro/oscuro con localStorage propio                                              | El sitio ya tiene su propio sistema de tema; duplicarlo generaría dos fuentes de tema desincronizadas                               |
| Pausa                            | Solo prop `paused` externa (botón PAUSA de GamePlayer)          | Mantener tecla `P` interna además                                                        | Evita doble control de pausa desincronizado con el HUD React, sigue precedente de asteroides                                        |
| `lives` en el contrato de estado | Fijo en `1` (constante)                                         | Fijo en `0`, o quitar el campo del contrato                                              | Tetris no tiene vidas; se mantiene el campo por contrato fijo de `<Name>GameProps`, documentado explícito como no aplicable         |
| Game over                        | Pieza nueva colisiona al spawnear (fiel a `endGame()` original) | Condición alternativa (ej. tiempo límite)                                                | Fiel al original, sin inventar mecánica nueva                                                                                       |
| Hold piece                       | No se agrega                                                    | Añadir como mejora sobre el original                                                     | El original no la tiene; agregarla sería feature nueva fuera de alcance del port                                                    |

---

## Riesgos

- **StrictMode doble-montaje (React 19 dev)**: mismo riesgo que asteroides (spec 05) — mitigar cancelando `requestAnimationFrame` y limpiando listeners en cleanup de `useEffect`.
- **Canvas doble (tablero + preview) en layout responsive**: dos `<canvas>` de tamaño fijo pueden desbordar en pantallas pequeñas. Mitigar con CSS (`max-width: 100%`, `height: auto`) sin tocar coordenadas internas.
- **Frecuencia de `onStateChange`**: si se llama en cada frame (60/seg) en vez de solo cuando cambian valores, puede impactar performance del HUD React. Mitigar llamando solo tras eventos que cambian score/lines/level (drop, clear, lock), no en cada frame del loop.
- **`lives` fijo como campo no aplicable**: consumidores del HUD que muestren "vidas" para Tetris mostrarán siempre `1`, lo cual puede leerse como confuso en la UI. Riesgo aceptado por mantener contrato fijo de props entre juegos (spec 05 lo estableció así).
