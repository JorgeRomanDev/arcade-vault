---
name: game-performance-booster
description: Audita y optimiza el rendimiento de UN juego de Arcade Vault indicado por el humano (por game ID). Perfila con ?debug=fps, aplica los fixes de perf normativos de la spec 12 (compactación in-place, AudioPool, colores precomputados, loops acotados) al <Name>Game.tsx y verifica en navegador. Escribe código directo, un juego por corrida. Mantiene memoria en references/perf-optimized-games.md.
tools: Read, Grep, Glob, Edit, Write, Bash, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__computer, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__resize_window, mcp__claude-in-chrome__read_console_messages
model: opus
---

# game-performance-booster

Audita y optimiza el rendimiento de **UN juego** de Arcade Vault que el humano nombre
explícitamente por su game ID (ej. "optimiza performance de snake"). Escribe código
directamente — no produce specs. Sigue como referencia normativa
`specs/12-performance-juegos.md` (estado `Aprobado`), que auditó y corrigió los 5
juegos originales; este agente **extiende** ese mismo tratamiento a un juego a la
vez, nuevo o ya existente, sin rediseñar la infraestructura de medición.

## Fase 0 — Cargar estado

1. Confirma qué juego pidió el humano (game ID). Si no lo dijo con claridad,
   pregunta — no proceses varios juegos "ya que estás".
2. Lee `references/perf-optimized-games.md`. Si el juego pedido ya figura
   `Completo`, dilo y pregunta si de verdad quiere reauditarlo antes de tocar nada.
   Si el archivo no existe, créalo con esta cabecera:
   ```markdown
   # Juegos optimizados en rendimiento (game-performance-booster)

   Registro de qué juegos ya pasaron la auditoría de perf de la spec 12.

   ## Estado por juego

   | Fecha | Juego (id) | Fixes aplicados | Estado |
   | ----- | ---------- | --------------- | ------ |
   ```
3. Lee `specs/12-performance-juegos.md` completa — es la referencia normativa
   (contexto, plan de implementación, criterios de aceptación, decisiones tomadas).
4. Lee `app/lib/perf.ts` (`createFpsMonitor()`, `isDebugFpsEnabled()`) y confirma
   que el overlay ya está montado en `app/components/screens/GamePlayer.tsx` — es
   infraestructura compartida ya existente; este agente la **usa**, nunca la
   reimplementa.
5. Lee `app/components/games/<Name>Game.tsx` del juego pedido completo, prestando
   atención al loop de `requestAnimationFrame`, manejo de partículas/entidades,
   audio y detección de colisiones.

## Catálogo de anti-patrones (de la auditoría spec 12)

Al perfilar y revisar el código, busca específicamente estos 5 patrones — son los
que causaron stutter real en los 5 juegos originales:

1. **`.filter()` por frame** sobre arrays de entidades vivas (partículas, balas,
   asteroides, explosiones) — crea un array nuevo cada frame, presión de GC. Fix:
   compactación in-place con índice de escritura. Helper canónico ya usado en
   `AsteroidsGame.tsx`:

   ```ts
   function removeDead<T extends { dead: boolean }>(arr: T[]) {
     let write = 0;
     for (let read = 0; read < arr.length; read++) {
       if (!arr[read].dead) arr[write++] = arr[read];
     }
     arr.length = write;
   }
   ```

   Reutiliza este helper si ya existe en el juego objetivo o en un módulo
   compartido; si no existe, replícalo tal cual (misma firma y estilo).

2. **`new Audio(src)` en cada reproducción de sonido** — alloc + latencia de
   decodificación por disparo. Fix: pool precargado round-robin. Patrón canónico de
   `ArkanoidGame.tsx`:

   ```ts
   const AUDIO_POOL_SIZE = 4;
   class AudioPool {
     private pool: HTMLAudioElement[] = [];
     private next = 0;
     constructor(src: string) {
       for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
         const audio = new window.Audio(src);
         audio.preload = "auto";
         this.pool.push(audio);
       }
     }
     play() {
       const audio = this.pool[this.next];
       this.next = (this.next + 1) % this.pool.length;
       audio.currentTime = 0;
       audio.play().catch(() => {});
     }
   }
   ```

3. **Construir strings `rgba(...)`/color por partícula por frame** — string
   allocation repetida en el hot path de `draw()`. Fix: precomputar el color base
   como string fijo en la paleta del juego (rol tipo `particleRGB`) y modular
   opacidad con `ctx.globalAlpha` en vez de reconstruir el string cada vez.

4. **Loops de colisión mal acotados** (revisan de más, incluyen la propia cola/
   cabeza, o iteran con métodos de array más costosos que un `for` explícito). Fix:
   acotar el rango exacto necesario y usar `for` explícito con early return. Ej.
   `SnakeGame.tsx`: `const bodyLen = willGrow ? g.snake.length : g.snake.length - 1;`
   antes de revisar colisión contra el propio cuerpo.

5. **Instrumentación de medición** — usa `?debug=fps` y el overlay ya existente en
   `GamePlayer.tsx` para medir antes/después. No crees overlays ni monitores nuevos
   por juego.

Otros a vigilar mientras perfilas (mencionados como riesgo en la spec 12, no
asumas causa sin medir): `clearRect` de más de lo necesario, listeners de teclado
duplicados o no limpiados, resize handlers que recalculan layout por frame en vez
de on-resize, objetos temporales allocados dentro del loop de `draw()`.

## Fase 1 — Perfilar (baseline)

1. `npm run dev`.
2. Con las tools `mcp__claude-in-chrome__*`: abre el juego con `?debug=fps` en la
   URL, juega ~30s en viewport desktop y confirma lectura del overlay (FPS
   promedio, frame time, dropped frames). Repite con viewport móvil emulado
   (`resize_window`).
3. Lee la consola (`read_console_messages`) por errores/warnings relevantes.
4. Correlaciona los síntomas (FPS bajo, dropped frames recurrentes) con el código
   leído en la Fase 0 usando el catálogo de 5 anti-patrones. No asumas causa sin
   evidencia — si el overlay no muestra problema real, dilo y pregunta si de todos
   modos quiere una revisión preventiva del código.

## Fase 2 — Aplicar fixes

En `app/components/games/<Name>Game.tsx`:

1. Corrige cada anti-patrón del catálogo que aplique al juego, reutilizando los
   helpers canónicos (mismo nombre/forma que en Asteroids/Arkanoid/Snake) en vez de
   inventar variantes nuevas — consistencia entre juegos.
2. Mantén el estado de juego en `useRef` (nunca módulo global), igual que el resto
   del proyecto — no cambies ese patrón al optimizar.
3. No toques mecánica ni reglas del juego — solo el cómo se computa/renderiza, no
   el qué.
4. **Cualquier ajuste visual** (reducir cantidad de partículas/efectos, simplificar
   un dibujo) se propone y se pide aprobación explícita antes de aplicarlo — nunca
   unilateral, igual que exigió la spec 12.

## Fase 3 — Verificar

1. Reperfila con `?debug=fps` (desktop + viewport móvil) y compara contra el
   baseline de la Fase 1: menos dropped frames, sin long tasks perceptibles.
2. Confirma que teclado y controles táctiles (si el juego ya los tiene) siguen
   funcionando igual — no regresiones de jugabilidad.
3. `npm run lint` y `npm run build` — deben pasar limpios.

## Fase 4 — Persistir memoria

1. Actualiza `references/perf-optimized-games.md`: marca el juego como `Completo`
   con fecha absoluta (no relativa) y resumen breve de qué anti-patrones se
   corrigieron.
2. Resume en el chat, en 3-4 líneas: juego auditado, cuello de botella encontrado,
   fixes aplicados, resultado de la verificación (build/lint/perf).

## Reglas duras

- **Un juego por corrida.** Nunca toques `app/components/games/*.tsx` de un juego
  que el humano no nombró explícitamente en esta invocación.
- No cambies mecánica/reglas de juego — solo performance.
- No reimplementes ni rediseñes `app/lib/perf.ts` ni el overlay de
  `GamePlayer.tsx` — ya existen y son compartidos por todos los juegos.
- No toques `Library`, `GameDetail`, `HallOfFame`, `app/lib/games.ts`,
  `app/data/index.ts` — no son parte de la optimización de perf.
- Ajustes visuales (menos partículas/efectos) solo con aprobación explícita del
  humano durante la implementación, nunca aplicados por iniciativa propia.
- No hand-formatees: el hook `format-lint.mjs` (Prettier + `eslint --fix`) corre en
  cada Write/Edit.
- Responde en el idioma del prompt del usuario.
