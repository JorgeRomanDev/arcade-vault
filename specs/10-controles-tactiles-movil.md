---
spec: 10
title: Arcade Vault — Controles táctiles móviles
state: Implementado
date: 2026-07-09
depends_on:
  [05-juego-asteroides, 07-juego-tetris, 08-juego-arkanoid, 09-juego-snake]
objective: Añadir controles táctiles en pantalla, específicos por juego, que hacen jugables los 4 juegos (Asteroids, Tetris, Arkanoid, Snake) en dispositivos táctiles reutilizando los listeners de teclado existentes vía eventos sintéticos, sin modificar la lógica interna de ningún juego.
---

## Contexto

Los 4 juegos (`Asteroids`, `Tetris`, `Arkanoid`, `Snake`) solo escuchan teclado
(`window` keydown/keyup). En un dispositivo táctil no hay forma de jugar. Objetivo:
que sean jugables en móvil/tablet con botones en pantalla, sin teclado, y sin romper
el patrón de integración de 4 puntos del `CLAUDE.md`.

Decisiones tomadas con el usuario:

- **Esquema**: botones en pantalla por juego (layout distinto según el juego).
- **Posición**: controles **abajo** del canvas; HUD **arriba** siempre visible.
- **Activación**: automática en dispositivo táctil (`pointer: coarse` / `ontouchstart`).
- **Mecanismo**: el overlay despacha `KeyboardEvent` sintéticos en `window` — **cero
  cambios en la lógica de los 4 juegos**.
- **Orientación**: nada de bloqueos; solo escalar el canvas.

## Alcance

### Dentro

- Componente `TouchControls` que se monta bajo el canvas en `GamePlayer`.
- Layout de botones específico por juego (snake / tetris / arkanoid / asteroides).
- Detección de dispositivo táctil para mostrarlos solo ahí.
- Despacho de `KeyboardEvent` sintéticos (keydown/keyup) con `key` **y** `code`.
- Botones tipo _hold_ (mantener) y tipo _tap_ según cada control.
- Layout responsive del reproductor: HUD arriba usable, canvas escalado, controles abajo.
- CSS de los controles integrado en el estilo arcade existente.

### Fuera

- Gestos (swipe / drag). Solo botones.
- Bloqueo o forzado de orientación landscape.
- Refactor del sistema de input de los juegos (se mantienen los listeners de `window`).
- Cambios en la lógica de juego, puntuación, skins o guardado de scores.
- Controles táctiles para juegos "fake" (los que aún no tienen componente real).

## Modelo de datos

No introduce datos nuevos ni persistencia. Solo UI + eventos efímeros.

## Mapa de controles por juego

Cada botón despacha `KeyboardEvent` en `window` con `{ key, code }` (los juegos leen
uno u otro; se rellenan ambos). _hold_ = keydown en `pointerdown`, keyup en
`pointerup`/`pointercancel`/`pointerleave`. _tap_ = keydown seguido de keyup.

| Juego          | Botón   | key / code                | Tipo | Acción del juego |
| -------------- | ------- | ------------------------- | ---- | ---------------- |
| **snake**      | ◄ ▲ ▼ ► | Arrow{Left,Up,Down,Right} | tap  | girar dirección  |
| **tetris**     | ◄ ►     | ArrowLeft / ArrowRight    | tap  | mover pieza      |
|                | ▼       | ArrowDown                 | tap  | soft drop        |
|                | ⟳       | ArrowUp _(o KeyX)_        | tap  | rotar            |
|                | ⤓       | Space                     | tap  | hard drop        |
| **arkanoid**   | ◄ ►     | ArrowLeft / ArrowRight    | hold | mover paleta     |
| **asteroides** | ◄ ►     | ArrowLeft / ArrowRight    | hold | rotar nave       |
|                | THRUST  | ArrowUp                   | hold | empuje           |
|                | FIRE    | Space                     | tap  | disparar         |

Notas de precisión:

- Asteroids y Arkanoid leen estado sostenido (`input.keys[code]` / `keysRef`), por eso
  esos botones deben ser _hold_ reales (keyup fiable al soltar/salir del botón).
- Snake y Tetris actúan por evento discreto → _tap_ basta.
- `code` es obligatorio para Tetris/Asteroids (usan `e.code`); `key` para Snake/Arkanoid
  (usan `e.key`). El sintético lleva ambos siempre.

## Plan de implementación

1. **`app/lib/touch.ts`** — helper `isTouchDevice()`
   (`matchMedia("(pointer: coarse)")` con fallback `"ontouchstart" in window`) y
   `dispatchKey(type, key, code)` que hace
   `window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true }))`.
   Deja el sistema compilando; nadie lo usa aún.

2. **`app/components/games/TouchControls.tsx`** (`"use client"`) — recibe
   `{ gameId: string }`. Define el mapa de botones por juego (tabla de arriba). Renderiza
   un botón por control. `hold` → `onPointerDown` keydown / `onPointerUp`+`onPointerLeave`+
   `onPointerCancel` keyup. `tap` → keydown+keyup en `onPointerDown`. Usa
   `e.preventDefault()` y `touch-action: none` para evitar scroll/zoom. Devuelve `null` si
   el `gameId` no tiene mapa. Componente puro de UI; aún no montado.

3. **Montaje en `GamePlayer.tsx`** — tras el bloque `.crt` (canvas), y solo cuando
   `isCustomGame`, montar `<TouchControls gameId={id} />`. Envolver con estado
   `showTouch` inicializado por `isTouchDevice()` en `useEffect` (evita mismatch SSR).
   No tocar el flujo de skins/score/gameover.

4. **CSS en `app/globals.css`** — clases `.touch-controls`, `.touch-pad`, `.touch-btn`
   (variantes dpad / acción). Layout flex, botones grandes (≥56px), `user-select: none`,
   `touch-action: none`. Añadir reglas dentro de `@media (max-width: 720px)` /
   `(pointer: coarse)` para: HUD compacto arriba, `.hud-actions` sin romper, canvas
   escalado (ya usa `max-width:100%`), y separación canvas↔controles.

5. **Verificación responsive** — ajustar `.av-player` / `.player-hud` en móvil para que
   el HUD (jugador/score/vidas/nivel) siga legible arriba y los controles quepan abajo
   sin scroll horizontal.

## Criterios de aceptación

- [ ] En un dispositivo táctil (o DevTools con emulación táctil), bajo el canvas de cada
      uno de los 4 juegos aparece un bloque de controles; en desktop sin táctil no aparece.
- [ ] Snake: los 4 botones de dirección cambian el rumbo de la serpiente.
- [ ] Tetris: mover ◄►, soft drop ▼, rotar ⟳ y hard drop ⤓ funcionan por toque.
- [ ] Arkanoid: mantener ◄ o ► mueve la paleta de forma continua y se detiene al soltar.
- [ ] Asteroides: mantener rotación y THRUST son continuos; FIRE dispara por toque.
- [ ] El HUD (jugador, puntuación, vidas, nivel) es visible arriba en móvil.
- [ ] No hay scroll horizontal ni zoom accidental al usar los botones.
- [ ] El teclado sigue funcionando en desktop sin cambios.
- [ ] No se modificó la lógica interna de ningún componente de juego (solo se añadieron
      montaje + estilos + componente/lib nuevos).
- [ ] `npm run build` y `npm run lint` pasan.

## Decisiones tomadas y descartadas

- **KeyboardEvents sintéticos** (elegido) vs refactor de input por juego. Elegido por no
  tocar los 4 juegos ni romper el patrón de 4 puntos; los listeners de `window` ya existen.
- **Botones por juego** (elegido) vs gestos/híbrido. Elegido por claridad arcade y
  precisión, sobre todo en Asteroids/Tetris.
- **Auto por dispositivo táctil** (elegido) vs por ancho de viewport / toggle manual.
  Elegido para no molestar en desktop y no exigir acción del usuario.
- **Sin manejo de orientación** (elegido) vs sugerir/forzar landscape. Elegido por
  simplicidad; el canvas escala y sigue jugable en vertical.
- **Controles debajo del canvas, HUD arriba** — indicado explícitamente por el usuario.

## Riesgos identificados

- **Fiabilidad del keyup en _hold_**: si el dedo sale del botón sin `pointerup`, la nave/
  paleta podría "quedarse pegada". Mitigación: escuchar `pointerleave`/`pointercancel` y,
  como red de seguridad, un keyup global al `pointerup` en `document`.
- **`KeyboardEvent` sintético e `isTrusted`**: algunos handlers ignoran eventos no
  confiables, pero los juegos aquí no comprueban `isTrusted` — verificar en pruebas.
- **SSR/StrictMode**: `isTouchDevice()` debe correr en `useEffect` (cliente) para evitar
  hydration mismatch.
