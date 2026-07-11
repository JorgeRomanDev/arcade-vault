---
spec: 12
title: Arcade Vault — Auditoría y fix de performance en los 5 juegos
state: Aprobado
date: 2026-07-11
depends_on:
  [
    05-juego-asteroides,
    07-juego-tetris,
    08-juego-arkanoid,
    09-juego-snake,
    game-jam/frogger/01-frogger-core,
  ]
objective: Diagnosticar y corregir problemas de FPS bajo/stutter en los 5 juegos (Asteroids, Frogger, Tetris, Arkanoid, Snake) instrumentando un contador de FPS dev-only y perfilando con Chrome DevTools, aplicando las optimizaciones necesarias en cada componente hasta eliminar el stutter perceptible en desktop y móvil.
---

## Contexto

Los 5 juegos implementados (Asteroids, Frogger, Tetris, Arkanoid, Snake) presentan
FPS bajo y stutter periódico, detectado a ojo jugando, tanto en desktop como en
móvil. No hay instrumentación ni datos de performance previos — el spec parte de
cero, sin asumir causa técnica.

## Alcance

### Dentro

- Utilidad dev-only `app/lib/perf.ts`: helper de medición FPS (frame time, promedio,
  drops) reusable por los 5 juegos.
- Overlay de FPS toggle vía `?debug=fps` en la URL, montado condicionalmente en
  `GamePlayer.tsx` (no en cada juego individualmente) — no visible en producción
  normal.
- Profiling con Chrome DevTools Performance tab de cada juego, en el orden:
  Asteroids → Frogger → Tetris → Arkanoid → Snake.
- Identificación de causas concretas por juego (allocations por frame, listeners
  duplicados, `clearRect` innecesario, resize handlers, dibujo de sprites, etc.) —
  sin asumir causa antes de perfilar.
- Fixes de código en cada `app/components/games/<Name>Game.tsx` que perfile
  stutter/FPS bajo.
- Ajustes visuales menores (reducir cantidad de partículas/efectos) si mejoran perf
  y el usuario los aprueba durante implementación.
- Verificación final por juego con DevTools Performance: sin long tasks
  perceptibles, sin frames largos recurrentes.

### Fuera

- Cambios de mecánica/reglas de juego no relacionados a perf.
- Nuevos juegos o specs de integración (patrón de 4 puntos).
- Migración de canvas 2D a WebGL/otro renderer.
- Persistencia o telemetría de performance en producción (el overlay es solo dev).
- Cambios en controles táctiles (spec 10/11) salvo que sean la causa directa de un
  stutter.
- Testing automatizado de performance (no hay framework de test aún, fuera de
  alcance de este spec).

## Modelo de datos

No hay persistencia nueva (no hay tabla ni localStorage). Solo estructura interna
efímera del helper de medición:

```ts
// app/lib/perf.ts
interface FrameStats {
  fps: number; // promedio móvil (ej. últimos 30 frames)
  frameTimeMs: number; // duración último frame
  droppedFrames: number; // frames >33ms (por debajo de ~30fps) en la ventana actual
}

function createFpsMonitor(): {
  tick: () => FrameStats; // llamar 1 vez por frame de rAF
};

function isDebugFpsEnabled(): boolean; // lee ?debug=fps de la URL actual
```

`createFpsMonitor()` vive en un `useRef` dentro de `GamePlayer.tsx` (no en cada
juego), igual patrón que el resto del proyecto (estado en `useRef`, no módulo
global). El overlay se renderiza solo si `isDebugFpsEnabled()` es true.

## Plan de implementación

1. **`app/lib/perf.ts`** — crear `createFpsMonitor()` y `isDebugFpsEnabled()`
   (helpers puros, sin dependencias de React). Sistema sigue compilando, nadie lo
   usa aún.

2. **Overlay en `GamePlayer.tsx`** — montar `useRef` con `createFpsMonitor()`,
   llamar `.tick()` dentro del `requestAnimationFrame` existente del reproductor (o
   uno nuevo si el RAF vive en cada juego — verificar en paso 3), renderizar overlay
   pequeño (fps/frameTime/dropped) solo si `isDebugFpsEnabled()`. No afecta juegos
   aún.

3. **Profiling — Asteroids** — abrir `?debug=fps`, grabar Performance tab de Chrome
   jugando ~30s (desktop y con emulación táctil), identificar long tasks/frames
   largos en `AsteroidsGame.tsx`. Aplicar fix concreto (ej. evitar allocations por
   frame, memoizar cálculos, reducir partículas si aplica). Reperfilar y confirmar
   mejora antes de pasar al siguiente juego.

4. **Profiling — Frogger** — mismo proceso sobre `FroggerGame.tsx`.

5. **Profiling — Tetris** — mismo proceso sobre `TetrisGame.tsx`.

6. **Profiling — Arkanoid** — mismo proceso sobre `ArkanoidGame.tsx`.

7. **Profiling — Snake** — mismo proceso sobre `SnakeGame.tsx`.

8. **Verificación cruzada** — repasar los 5 juegos con Performance tab una vez más
   (desktop + emulación táctil), confirmar ausencia de stutter perceptible,
   controles táctiles y teclado sin regresión, `npm run build` y `npm run lint`
   pasan.

## Criterios de aceptación

- [ ] `?debug=fps` muestra overlay con FPS/frame time/dropped frames en
      `GamePlayer`; sin el parámetro, no aparece.
- [ ] Asteroids: grabación de Performance tab (30s de juego normal) sin long tasks
      recurrentes ni frames >33ms perceptibles.
- [ ] Frogger: ídem.
- [ ] Tetris: ídem.
- [ ] Arkanoid: ídem.
- [ ] Snake: ídem.
- [ ] Ningún juego regresiona en jugabilidad (teclado y controles táctiles siguen
      funcionando igual que antes).
- [ ] Cualquier ajuste visual (ej. menos partículas) fue aprobado explícitamente
      durante la implementación, no aplicado unilateralmente.
- [ ] `npm run build` y `npm run lint` pasan.

## Decisiones tomadas y descartadas

- **Auditar + fixear en un solo spec** (elegido) vs. spec separado de solo
  diagnóstico. Elegido para evitar otro ciclo `/spec` después de medir — decisión
  explícita del usuario.
- **Meta "sin stutter perceptible"** (elegido) vs. "60 FPS estable" numérico
  estricto. Elegido porque no hay instrumentación previa ni baseline — más
  realista medir jank/long tasks que perseguir un número exacto sin datos
  históricos.
- **Chrome DevTools Performance tab** (elegido) vs. overlay de FPS como única
  fuente de verdad. Elegido porque da detalle de dónde se gasta el tiempo
  (script/render/GC), no solo el síntoma.
- **Overlay FPS dev-only vía `?debug=fps`** (elegido) vs. siempre visible en
  producción. Elegido para no meter clutter visual a usuarios finales — decisión
  explícita del usuario.
- **Overlay centralizado en `GamePlayer.tsx`** (elegido) vs. un hook de FPS
  embebido en cada uno de los 5 juegos. Elegido para no duplicar lógica de
  medición 5 veces y no tocar innecesariamente los componentes de juego solo para
  instrumentar.
- **Orden de revisión por sospecha de severidad** (Asteroids → Frogger → Tetris →
  Arkanoid → Snake, elegido) vs. orden arbitrario. Elegido porque Asteroids tiene
  más entidades en pantalla y Frogger es el port más reciente sin tuning de perf.
- **Ajustes visuales menores permitidos si mejoran perf** (elegido, con aprobación
  caso por caso) vs. visual pixel-igual obligatorio. Elegido para no atarse las
  manos si la causa raíz es cantidad de elementos renderizados — decisión
  explícita del usuario.
- **Sin profiling automatizado / test de regresión de perf** (fuera de alcance) —
  no hay framework de test en el proyecto todavía (ver CLAUDE.md).

## Riesgos identificados

- **Causa distinta por juego**: cada juego puede tener cuello de botella distinto
  (Asteroids: partículas; Frogger: colisiones recientes sin optimizar; Tetris:
  render de grid completo por frame) — mitigado por perfilar cada uno
  individualmente antes de asumir fix común.
- **RAF vs canvas resize**: stutter puede venir de resize/scale del canvas en vez
  de lógica de juego — el profiling debe distinguir "script time" de "rendering
  time" en DevTools.
- **Regresión de controles táctiles**: tocar el loop de juego para optimizar puede
  romper timing de `pointerdown/up` en `TouchControls` — verificar tras cada fix.
- **Overlay FPS con overhead propio**: medir mal puede introducir su propio costo —
  mantenerlo liviano (sin allocations por tick) para no sesgar la medición.
