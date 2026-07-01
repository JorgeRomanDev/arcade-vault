---
spec: 05
title: Arcade Vault — Juego Asteroides
state: Implementado
date: 2026-07-01
depends_on: [01-arcade-vault-mvp]
objective: Portar el juego Asteroides (canvas HTML5 puro de references/started-games/02-asteroids) a un componente React del proyecto, como nueva entrada del catálogo con id "asteroides", jugable con teclado dentro de GamePlayer.
---

## Alcance

### Dentro

- Nueva entrada `GAMES` en `app/data/index.ts`: `id: "asteroides"`, `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `color: "magenta"`, `cover: "cover-asteroides"`, textos `short`/`long` propios (no copiados de "rocas"), `best`/`plays` inventados en línea con el resto del catálogo
- Clase CSS `.cover-asteroides` en `app/globals.css` (gradiente + detalle, mismo patrón que `.cover-rocas`/`.cover-bricks`)
- Componente dedicado `app/components/games/AsteroidsGame.tsx` (`'use client'`) que porta la lógica de `game.js`: clases `Bullet`, `Asteroid`, `Ship`, `Particle`, loop `update/draw`, wrap toroidal, colisiones, split de asteroides, 3 vidas con invencibilidad parpadeante, niveles progresivos
- Sin power-ups (se excluye `PowerUp`, `tripleShot`, `POWERUP_*`)
- Controles: solo teclado (`ArrowLeft/Right/Up`, `Space`) — sin controles táctiles
- Integración en `app/components/screens/GamePlayer.tsx`: cuando `id === "asteroides"`, renderiza `<AsteroidsGame>` en vez de la simulación aleatoria/divs decorativos actuales; el resto de juegos (placeholder) sigue igual sin tocarse
- `AsteroidsGame` expone `score`, `lives`, `level` y evento `onGameOver` vía props/callbacks para que el HUD React existente (`player-hud`) también se alimente del estado real del juego — el `drawHUD` interno del canvas (original de `game.js`) se mantiene intacto; ambos HUDs coexisten (el del canvas dentro del `<canvas>`, el de React alrededor)
- Botón "PAUSA" del HUD React detiene el loop (`requestAnimationFrame`) de `AsteroidsGame`; botón "FIN" fuerza game over inmediato
- "JUGAR DE NUEVO" reinicia el estado interno del juego (equivalente a `initGame()`) sin desmontar el canvas
- Guardado de puntuación reutiliza `onSaveScore`/`localStorage` (`av_scores`) ya existente, sin cambios de esquema

### Fuera de alcance

- Power-ups (triple disparo, drops, `PowerUp` class)
- Controles táctiles / móvil
- Modificar o eliminar la entrada existente `"rocas"` en `GAMES`
- Persistir estado de partida en curso (solo el score final al terminar)
- Sonido/efectos de audio
- Cambios a `GameDetail.tsx` o `Library.tsx` más allá de que ya funcionan genéricamente con cualquier `id` de `GAMES`
- Dificultad ajustable o modos de juego alternativos

---

## Modelo de datos

### Entrada nueva en `GAMES` (`app/data/index.ts`)

```ts
{
  id: 'asteroides',
  title: 'ASTEROIDES',
  short: 'Pulveriza rocas espaciales en gravedad cero.',
  long: 'Pilota una nave triangular a la deriva en el vacío. Rota, propulsa y dispara para hacer estallar asteroides en fragmentos cada vez más pequeños. El espacio es toroidal: no hay bordes, solo el infinito envolviéndose sobre sí mismo.',
  cat: 'SHOOTER',
  cover: 'cover-asteroides',
  color: 'magenta',
  best: 47850,
  plays: '8.9K',
}
```

### Props de `AsteroidsGame`

```ts
interface AsteroidsGameProps {
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

- El canvas dibuja su propio HUD (score/nivel/vidas) igual que el `game.js` original — no se toca `drawHUD`
- Además, en cada `update()` el componente llama `onStateChange` con el estado actual para que el HUD React (`player-hud`) de `GamePlayer.tsx` también lo muestre — ambos HUDs quedan sincronizados con la misma fuente de verdad
- `GamePlayer.tsx` mantiene `score`/`lives`/`level`/`over` en su propio estado (como ya hace), pero para `id === "asteroides"` los recibe de `onStateChange`/`onGameOver` en vez de generarlos con el `setInterval` aleatorio
- No se introduce persistencia ni tipos nuevos en `app/data/index.ts` más allá de la entrada `GAMES` de arriba

---

## Plan de implementación

1. **Catálogo — entrada Asteroides**
   - En `app/data/index.ts`: añadir objeto `asteroides` a `GAMES` (ver Modelo de datos)

2. **CSS — cover de catálogo**
   - En `app/globals.css`: añadir `.cover-asteroides` (gradiente propio, distinto de `.cover-rocas`) siguiendo el patrón de las demás `.cover-*`

3. **Componente del juego — `AsteroidsGame.tsx`**
   - Crear `app/components/games/AsteroidsGame.tsx` (`'use client'`)
   - Portar de `references/started-games/02-asteroids/game.js`: `wrap`, `dist`, `rand`, `randInt`, clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `spawnAsteroids`, `initGame`, `nextLevel`, `explode`, `killShip`, `update(dt)`, `draw()`, `drawHUD()`, `drawLifeIcon()`, `drawOverlay()`
   - Eliminar del port: `PowerUp`, `tripleShot`, `POWERUP_*`, `TRIPLE_SPREAD`
   - Encapsular estado del juego (antes variables globales `ship`, `bullets`, etc.) dentro de un `useRef` que sobrevive entre renders, para no usar globals del módulo
   - Montar `canvas` vía `useRef<HTMLCanvasElement>`, tamaño fijo 800×600 (igual al original)
   - Listeners de teclado (`keydown`/`keyup`) en `useEffect`, limpiados al desmontar
   - Loop `requestAnimationFrame` en `useEffect`; se detiene/reanuda según prop `paused`
   - En cada `update(dt)`, llamar `onStateChange({ score, lives, level })`
   - Cuando `state` interno pasa a `'gameover'`, llamar `onGameOver(score)` una sola vez
   - Prop `restartSignal`: un `useEffect` que reacciona a sus cambios y ejecuta el equivalente a `initGame()`

4. **GamePlayer — integración**
   - En `app/components/screens/GamePlayer.tsx`: si `game.id === 'asteroides'`, renderizar `<AsteroidsGame paused={paused} restartSignal={restartCount} onStateChange={...} onGameOver={...} />` dentro de `.crt-screen`, en vez de `.game-arena` con divs decorativos
   - Para otros juegos (`id !== 'asteroides'`), mantener el comportamiento actual (simulación aleatoria + divs) sin cambios
   - `restart()` incrementa `restartCount` para disparar el reset in-place cuando el juego es Asteroides
   - `endGame()` sigue funcionando igual (fuerza `over = true`); cuando el juego es Asteroides, además debe reflejar el `onGameOver` real si el jugador pierde sus 3 vidas antes de pulsar FIN

5. **Verificación manual**
   - `npm run dev`, navegar a Vault → tarjeta "ASTEROIDES" → detalle → Jugar
   - Confirmar: nave responde a flechas/espacio, asteroides se dividen, vidas bajan con parpadeo de invencibilidad, HUD del canvas y HUD React muestran los mismos valores, PAUSA detiene el juego, FIN abre modal de guardar puntuación, JUGAR DE NUEVO reinicia sin recargar, puntuación se guarda en `localStorage` (`av_scores`)

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] Catálogo (`Library`) muestra tarjeta "ASTEROIDES" con cover propio (`.cover-asteroides`), categoría SHOOTER, color magenta
- [ ] Click en la tarjeta navega a `GameDetail` con id `asteroides` (título, descripción, leaderboard simulado funcionan igual que los demás juegos, sin cambios de código)
- [ ] "JUGAR AHORA" navega a `GamePlayer` con id `asteroides` y renderiza `AsteroidsGame` (canvas 800×600) en vez de los divs decorativos
- [ ] Nave rota con `←`/`→`, propulsa con `↑` (con llama visible), dispara con `Espacio`
- [ ] Asteroides grandes se dividen en medianos y medianos en pequeños al ser destruidos; los pequeños desaparecen con partículas de explosión
- [ ] Nave pierde una vida al chocar con un asteroide (fuera de la ventana de invencibilidad), parpadea durante la invencibilidad de reaparición
- [ ] Al llegar a 0 asteroides en pantalla, sube de nivel y aparecen más asteroides
- [ ] HUD del canvas (score/nivel/vidas dibujados en el propio `<canvas>`) y HUD React (`player-hud` arriba) muestran los mismos valores en todo momento
- [ ] Botón "PAUSA" detiene el juego (nave/asteroides/balas se congelan); "REANUDAR" lo continúa exactamente donde quedó
- [ ] Botón "FIN" fuerza el game over y abre el modal de guardar puntuación
- [ ] Perder las 3 vidas dentro del juego también abre el modal de guardar puntuación (sin necesidad de pulsar FIN)
- [ ] Modal permite ingresar iniciales y "GUARDAR PUNTUACIÓN" persiste en `localStorage` bajo `av_scores` con `{ game: 'asteroides', score, name }`
- [ ] "JUGAR DE NUEVO" reinicia el juego (score/vidas/nivel vuelven a estado inicial) sin recargar la página ni perder el `<canvas>`
- [ ] "SALIR" navega de vuelta a `GameDetail` de Asteroides
- [ ] Otros juegos del catálogo (p.ej. "rocas", "caida") siguen mostrando la simulación de placeholder actual sin cambios de comportamiento
- [ ] Sin controles táctiles/on-screen añadidos para este juego

---

## Decisiones tomadas y descartadas

| Decisión                  | Elegida                                                                                                         | Descartada                                                 | Razón                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Entrada de catálogo       | Nueva entrada `id: "asteroides"`                                                                                | Reusar `"rocas"` existente                                 | Usuario confirmó explícitamente: es un juego nuevo con su propio id, aunque temáticamente se parezca a "rocas"                  |
| Integración en GamePlayer | Componente dedicado `AsteroidsGame.tsx` por juego                                                               | Motor genérico reutilizable para todos los juegos          | Menor esfuerzo ahora; no hay todavía un segundo juego real que justifique la abstracción (evita diseño prematuro)               |
| HUD                       | Coexisten HUD del canvas (`drawHUD` original) y HUD React (`player-hud`), ambos alimentados por el mismo estado | Eliminar `drawHUD` del canvas para no duplicar             | Usuario corrigió: quiere mantener el HUD original del juego intacto, además de notificar a React — no reemplazar uno por otro   |
| Power-ups                 | Excluidos de este spec                                                                                          | Portar `PowerUp`/triple shot completo                      | Reduce alcance al MVP del juego; puede añadirse en spec futuro                                                                  |
| Controles                 | Solo teclado, fiel al original                                                                                  | Agregar controles táctiles                                 | Sitio es responsive pero el juego no lo requiere en este spec; táctil queda fuera de alcance                                    |
| Reinicio                  | Reset in-place (equivalente a `initGame()`) vía prop `restartSignal`                                            | Remontar componente con `key` distinta                     | Evita recrear el contexto de canvas en cada partida; más fiel al comportamiento original del loop continuo                      |
| Estado del juego en React | Encapsulado en `useRef` dentro de `AsteroidsGame`                                                               | Variables globales del módulo (como en `game.js` original) | Globals de módulo persistirían entre distintas instancias/navegaciones y romperían con StrictMode / múltiples montajes en React |
| Pausa/Fin                 | Pausa detiene el loop; Fin fuerza gameover                                                                      | Deshabilitar esos botones para este juego                  | Usuario confirmó: mantener la UX existente del sitio (botones ya presentes en GamePlayer)                                       |
| Cat/color del catálogo    | SHOOTER / magenta                                                                                               | SHOOTER / yellow (igual que "rocas")                       | Usuario eligió magenta para diferenciar visualmente la tarjeta de "rocas" en el grid                                            |

---

## Riesgos

- **StrictMode doble-montaje (React 19 dev)**: `useEffect` que arranca `requestAnimationFrame` puede ejecutarse dos veces en desarrollo. Mitigar limpiando el loop y listeners en el cleanup del `useEffect`, y guardando el id de `requestAnimationFrame` en el `useRef` para poder cancelarlo.
- **Listeners de teclado globales duplicados**: si el usuario navega entre varias partidas sin desmontar correctamente, `keydown`/`keyup` en `window` podrían acumularse. Mitigar removiendo listeners en cleanup de cada montaje.
- **Canvas fijo 800×600 en layout responsive**: el sitio es fluido pero el canvas original es de tamaño fijo. Puede desbordar en pantallas pequeñas dentro de `.crt-screen`. Mitigar con CSS (`max-width: 100%`, `height: auto`) sin tocar la lógica interna de coordenadas del juego.
- **Sincronización de estado por render vs por frame**: llamar `onStateChange` en cada `update(dt)` (60 veces/seg) dispara `setState` en `GamePlayer` con la misma frecuencia. Puede impactar performance si React re-renderiza el HUD en cada frame. Mitigar comparando valores antes de propagar (solo notificar si score/lives/level cambiaron) si se detectan problemas de rendimiento.
- **Doble fuente de verdad del HUD**: mantener HUD del canvas y HUD React sincronizados depende de que `onStateChange` se dispare exactamente cuando cambian los valores internos del juego; un bug de timing podría desincronizarlos temporalmente. Riesgo aceptado por decisión explícita del usuario de mantener ambos.
