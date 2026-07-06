---
spec: 08
title: Arcade Vault — Juego Arkanoid
state: Apobado
date: 2026-07-05
depends_on: [05-juego-asteroides, 06-tabla-juegos-leaderboard]
objective: Portar el juego Arkanoid (canvas HTML5 puro de references/started-games/04-arkanoid) a un componente React del proyecto, como nueva entrada del catálogo con id "arkanoid", jugable con teclado dentro de GamePlayer.
---

## Alcance

### Dentro

- Fila nueva en `games` (Supabase): `id: 'arkanoid'`, `title: 'ARKANOID'`, `cat: 'ARCADE'`, `color: 'yellow'`, `cover: 'cover-arkanoid'`, `short`/`long` propios
- Clase CSS `.cover-arkanoid` en `app/globals.css` (gradiente púrpura oscuro → amarillo + detalle de franjas tipo bloques) + `@source inline("cover-arkanoid");`
- Componente dedicado `app/components/games/ArkanoidGame.tsx` (`'use client'`) que porta la lógica de `game.js`: paddle, pelota con colisión AABB, 5 niveles (`LEVELS` de `levels.js`, patrones de bloques + multiplicador de velocidad ×1.0 a ×1.46), 3 vidas, 10 pts/bloque, animación de explosión (4 frames por color de bloque, usando el spritesheet original)
- Controles: solo teclado (`←`/`→` mueven paddle) — sin mouse, sin táctil
- Audio: `ball-bounce.mp3` (rebote en pared/paddle) y `break-sound.mp3` (bloque destruido), portados de `references/started-games/04-arkanoid/assets/sounds/`
- `onGameOver(finalScore)` dispara tanto al perder la última vida como al completar los 5 niveles (victoria también cuenta como fin de partida)
- Integración en `app/components/screens/GamePlayer.tsx`: cuando `id === "arkanoid"`, renderiza `<ArkanoidGame>` en vez del placeholder decorativo; se desactiva el `setInterval` de score falso para ese id
- Guardado de puntuación vía Supabase (`scores`, `game_id: 'arkanoid'`), mismo mecanismo que asteroides/tetris

### Fuera de alcance

- Selector de nivel en pausa (botones 1-5, click de mouse) del overlay de pausa original
- Control de paddle por mouse (`mousemove`)
- Controles táctiles/móvil
- Persistir estado de partida en curso (solo el score final al terminar)
- Cambios a `GameDetail.tsx`, `Library.tsx`, `HallOfFame.tsx`, `AppShell.tsx` más allá de que ya funcionan genéricamente con cualquier fila de `games`
- Dificultad ajustable o modos de juego alternativos

---

## Modelo de datos

### Fila nueva en `games` (Supabase)

```sql
insert into games (id, title, short, long, cat, cover, color) values (
  'arkanoid',
  'ARKANOID',
  'Rompe bloques a base de rebotes calculados.',
  'Controla una paleta al límite del vacío y desvía una pelota errante contra muros de bloques cromados. Cada impacto suma puntos y acerca la pantalla al silencio — pierde la pelota tres veces y el juego termina.',
  'ARCADE',
  'cover-arkanoid',
  'yellow'
);
```

### CSS `.cover-arkanoid` (`app/globals.css`)

- Gradiente oscuro púrpura → amarillo, detalle de franjas horizontales finas simulando filas de bloques (mismo patrón visual que `.cover-tetris`/`.cover-asteroides`, paleta propia)
- Añadir `@source inline("cover-arkanoid");` cerca del inicio del archivo, junto a los demás `@source inline` existentes

### Props de `ArkanoidGame`

```ts
interface ArkanoidGameProps {
  paused: boolean;
  restartSignal: number; // se incrementa para disparar reset in-place
  onStateChange: (state: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
}
```

- `lives` inicia en 3, se descuenta al caer la pelota bajo el paddle
- `level` es 1-indexed (1 a 5), sube al destruirse todos los bloques del nivel actual
- `onGameOver` se dispara una sola vez, tanto al llegar `lives` a 0 (game over) como al completar el nivel 5 (victoria) — ambos casos son "fin de partida" para el HUD React
- Estado interno del juego (paddle, ball, blocks, explosions, currentLevel) encapsulado en `useRef`, no en variables globales del módulo (mismo motivo que asteroides/tetris: StrictMode y múltiples montajes)

---

## Plan de implementación

1. **Catálogo — fila Arkanoid en Supabase**
   - Ejecutar el `insert into games` de Modelo de datos contra la tabla `games`

2. **CSS — cover de catálogo**
   - En `app/globals.css`: añadir `.cover-arkanoid` (gradiente + detalle propio) y `@source inline("cover-arkanoid");`

3. **Componente del juego — `ArkanoidGame.tsx`**
   - Crear `app/components/games/ArkanoidGame.tsx` (`'use client'`)
   - Copiar `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` y `assets/spritesheet.js` a `app/components/games/assets/arkanoid/` (primer asset binario del proyecto — únicamente para este juego)
   - Copiar `references/started-games/04-arkanoid/assets/sounds/ball-bounce.mp3` y `break-sound.mp3` a `public/sounds/arkanoid/` (Next no soporta `import` de `.mp3` como asset de módulo; se sirven como estáticos desde `public/` y se referencian por ruta `/sounds/arkanoid/...`)
   - Portar de `game.js` + `levels.js`: constantes (`PADDLE_SPEED`, `BLOCK_COLS/ROWS/W/H`, `BASE_BALL_VX/VY`), `initPaddle`, `initBall`, `loadLevel`, `collideAABB`, `update(dt)` (paddle por teclado, movimiento pelota, rebotes pared/paddle/bloques, explosiones, pelota perdida, reproducción de `bounceSound`/`breakSound` vía `Audio().cloneNode().play()`), `draw()` con HUD propio del canvas (score/nivel/vidas) usando `drawSprite`/`drawFrame` de `spritesheet.js`, overlays de game over y victoria
   - Eliminar del port: listeners `mousemove`/`click` del paddle y del selector de nivel en pausa
   - Carga async del spritesheet (`loadSpritesheet(cb)`) antes de arrancar el loop RAF — mismo patrón que el original
   - Encapsular estado (`paddle`, `ball`, `blocks`, `explosions`, `lives`, `score`, `currentLevel`, `gameState`) en `useRef`
   - Canvas 800×600 vía `useRef<HTMLCanvasElement>`
   - Listeners de teclado (`keydown`/`keyup` para `ArrowLeft`/`ArrowRight`) en `useEffect`, limpiados al desmontar
   - Loop `requestAnimationFrame` en `useEffect`, se detiene/reanuda según prop `paused`
   - En cada `update(dt)`, llamar `onStateChange({ score, lives, level })`
   - Cuando `gameState` interno pasa a `'gameover'` o `'win'`, llamar `onGameOver(score)` una sola vez
   - Prop `restartSignal`: `useEffect` que reacciona a sus cambios y ejecuta el equivalente a `initPaddle()` + `loadLevel(1)` + reset de `lives`/`score`/`gameState`

4. **GamePlayer — integración**
   - En `app/components/screens/GamePlayer.tsx`: si `game.id === 'arkanoid'`, renderizar `<ArkanoidGame paused={paused} restartSignal={restartCount} onStateChange={...} onGameOver={...} />` en vez de `.game-arena` decorativo
   - Desactivar el `setInterval` de score falso para este id
   - `restart()` incrementa `restartCount`; `endGame()` sigue forzando `over = true` igual que con asteroides/tetris

5. **Verificación manual**
   - `npm run dev`, Vault → tarjeta "ARKANOID" → detalle → Jugar
   - Confirmar: paddle responde a `←`/`→`, pelota rebota en paredes/paddle/bloques, bloques explotan y suman 10 pts c/u, al vaciar bloques sube de nivel (5 niveles, velocidad creciente), perder 3 vidas o completar nivel 5 dispara `onGameOver` y modal de guardar puntuación, PAUSA detiene el loop, JUGAR DE NUEVO reinicia sin recargar, score se guarda en Supabase (`scores`, `game_id: 'arkanoid'`)

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] Catálogo (`Library`) muestra tarjeta "ARKANOID" con cover propio (`.cover-arkanoid`), categoría ARCADE, color yellow
- [ ] Click en la tarjeta navega a `GameDetail` con id `arkanoid` (título, descripción, leaderboard real vía Supabase funcionan igual que los demás juegos, sin cambios de código)
- [ ] "JUGAR AHORA" navega a `GamePlayer` con id `arkanoid` y renderiza `ArkanoidGame` (canvas 800×600) en vez de los divs decorativos
- [ ] Paddle se mueve con `←`/`→`; pelota rebota en paredes, paddle y bloques
- [ ] Cada bloque destruido suma 10 pts y muestra animación de explosión (4 frames)
- [ ] Al destruirse todos los bloques de un nivel, sube al siguiente (velocidad de pelota aumenta ×1.1 por nivel); al completar el nivel 5, dispara `onGameOver(finalScore)` igual que perder
- [ ] Pelota que cae bajo el paddle descuenta una vida y reposiciona pelota/paddle; al llegar a 0 vidas dispara `onGameOver(finalScore)`
- [ ] HUD del canvas (score/nivel/vidas dibujados en el propio `<canvas>`) y HUD React (`player-hud` arriba) muestran los mismos valores en todo momento
- [ ] Botón "PAUSA" detiene el juego (paddle/pelota/bloques se congelan); "REANUDAR" lo continúa exactamente donde quedó
- [ ] Botón "FIN" fuerza el game over y abre el modal de guardar puntuación
- [ ] Perder las 3 vidas o completar los 5 niveles dentro del juego también abre el modal de guardar puntuación (sin necesidad de pulsar FIN)
- [ ] Modal permite ingresar iniciales y "GUARDAR PUNTUACIÓN" persiste en Supabase (`scores`, `game_id: 'arkanoid'`), visible en GameDetail/HallOfFame tras refetch
- [ ] "JUGAR DE NUEVO" reinicia el juego (score/vidas/nivel vuelven a estado inicial, nivel 1) sin recargar la página ni perder el `<canvas>`
- [ ] "SALIR" navega de vuelta a `GameDetail` de Arkanoid
- [ ] Otros juegos del catálogo (asteroides, tetris, placeholders) siguen funcionando sin cambios de comportamiento
- [ ] Sin controles de mouse ni táctiles añadidos para este juego
- [ ] Rebote de pelota (pared/paddle) reproduce `ball-bounce.mp3`; destrucción de bloque reproduce `break-sound.mp3`

---

## Decisiones tomadas y descartadas

| Decisión                   | Elegida                                                                     | Descartada                                                  | Razón                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| id/color/cat               | arkanoid / yellow / ARCADE                                                  | breakout, bloques; magenta/cyan (ya usados); PUZZLE/SHOOTER | Nombre directo; yellow no repite asteroides (magenta) ni tetris (cyan); ARCADE refleja mecánica real de rompe-bloques    |
| Assets visuales            | Portar spritesheet original (`spritesheet-breakout.png` + `spritesheet.js`) | Recrear con formas planas (`fillRect`/`arc`)                | Usuario confirmó explícitamente: prioriza fidelidad visual al original sobre evitar el primer asset binario del proyecto |
| Victoria (5 niveles)       | `onGameOver(finalScore)` también al completar nivel 5                       | Overlay de victoria sin disparar onGameOver                 | Usuario confirmó: reutiliza el mismo flujo de fin de partida ya existente, evita lógica extra distinguiendo win/gameover |
| Sonido                     | Portar `bounceSound`/`breakSound` (`Audio().cloneNode().play()`)            | Excluir (precedente specs 05/07)                            | Usuario confirmó explícitamente durante implementación: quiere audio en Arkanoid pese al precedente de asteroides/tetris |
| Selector de nivel en pausa | Excluido; pausa simple como el resto del sitio                              | Botones 1-5 clicables en overlay de pausa                   | Usuario confirmó: simplifica alcance, no es parte del contrato estándar de pausa/reinicio de GamePlayer                  |
| Control de paddle          | Solo teclado (`←`/`→`)                                                      | Mouse (`mousemove`) como en el original                     | Precedente fijo de specs 05/07: solo teclado, sin mouse/táctil                                                           |
| Integración en GamePlayer  | Componente dedicado `ArkanoidGame.tsx` por juego                            | Motor genérico reutilizable para todos los juegos           | Mismo criterio que asteroides/tetris: evita abstracción prematura sin un tercer caso que la justifique                   |
| Estado del juego en React  | Encapsulado en `useRef` dentro de `ArkanoidGame`                            | Variables globales del módulo (como en `game.js` original)  | Globals de módulo romperían con StrictMode / múltiples montajes en React (mismo motivo que specs 05/07)                  |

---

## Riesgos

- **StrictMode doble-montaje (React 19 dev)**: `useEffect` que arranca `requestAnimationFrame` puede ejecutarse dos veces en desarrollo. Mitigar limpiando el loop y listeners en el cleanup del `useEffect`.
- **Carga async del spritesheet**: si `loadSpritesheet` no resuelve antes de que `restartSignal` dispare un reset, el canvas podría dibujar frames vacíos. Mitigar guardando un flag `spritesheetReady` en el `useRef` y no arrancando el loop hasta que esté cargado.
- **Asset binario en repo Next.js**: primer `.png` del proyecto en `app/components/games/`; verificar que Next.js sirva el asset correctamente vía `import`/`next/image` o carga directa `new Image()` con ruta pública (`public/`), según cómo se resuelva en el paso de implementación.
- **Canvas fijo 800×600 en layout responsive**: igual que asteroides/tetris, mitigar con CSS (`max-width: 100%`, `height: auto`) sin tocar coordenadas internas.
- **Sincronización de estado por render vs por frame**: `onStateChange` en cada `update(dt)` (60/seg) puede impactar performance; mitigar comparando valores antes de propagar si se detectan problemas.
