---
spec: 11
title: Arcade Vault — Apariencia neón del gamepad táctil
state: Aprobado
date: 2026-07-09
depends_on: [10-controles-tactiles-movil]
objective: Reemplazar la apariencia y disposición física de los controles táctiles de los 4 juegos (Snake, Tetris, Arkanoid, Asteroids) por el diseño de gamepad neón de referencia (`references/gamepad-assets/gamepad.html`) — D-pad diamante con hub central + hasta 2 botones de acción circulares A/B — remapeando cada juego a ese esquema fijo sin tocar la lógica de juego ni el mecanismo de `KeyboardEvent` sintéticos.
---

## Contexto

La spec 10 (`specs/10-controles-tactiles-movil.md`, `Implementado`) creó los controles
táctiles: `TouchControls.tsx` renderiza una fila plana de botones por juego, que despachan
`KeyboardEvent` sintéticos en `window` vía `app/lib/touch.ts`. Funciona, pero visualmente es
genérico — no comparte el lenguaje visual arcade del resto del proyecto.

`references/gamepad-assets/` trae un componente de gamepad neón ya diseñado
(`gamepad.html` + captura `gamepad-neon.png`): D-pad diamante con hub central pulsante y 2
botones de acción circulares A (magenta) / B (cian), con glow, sombras y estados de
presión. El usuario quiere adoptar ese diseño **y su disposición física** como nueva
apariencia de los controles táctiles de los 4 juegos existentes.

## Alcance

### Dentro

- Rediseño visual + estructural de `TouchControls.tsx`: pasar de fila de botones genéricos
  a layout físico de gamepad — D-pad diamante (4 flechas + hub central decorativo) a la
  izquierda, hasta 2 botones circulares de acción (A magenta / B cian) a la derecha.
- Nuevo mapeo por juego sobre ese esquema fijo (dpad + A + B):
  - **Snake**: dpad completo (4 direcciones, tap). Sin A/B.
  - **Arkanoid**: dpad solo izq/der (hold). Arriba/abajo/A/B ocultos.
  - **Asteroides**: dpad arriba=thrust (hold), izq/der=rotar (hold), abajo oculto.
    A=fire (tap). B oculto.
  - **Tetris**: dpad izq/der/abajo (tap: mover/soft-drop). Arriba oculto.
    A=rotar (tap, ArrowUp/KeyX). B=hard drop (tap, Space).
- Ocultar (no renderizar) toda flecha del dpad o botón A/B que un juego no use.
- Reutilizar la paleta y fuentes ya existentes en el proyecto (`--cyan`, `--magenta`,
  Press Start 2P vía `--font-press-start`, JetBrains Mono vía `--font-jetbrains-mono`)
  en vez de las variables/fuentes hardcodeadas del HTML de referencia.
- Mantener el hub central animado (rombo pulsante) del D-pad, puramente decorativo.
- Adaptar el CSS responsive (`@media max-width: 720px` / `pointer: coarse`) para el nuevo
  layout, incluida la versión compacta del asset (`@media max-width: 620px` como referencia).
- Conservar intacto el mecanismo de despacho (`dispatchKey`, `pointerdown/up/leave/cancel`,
  distinción tap/hold) de `app/lib/touch.ts` y la lógica de `handleButton` en
  `TouchControls.tsx` — solo cambia el **markup/CSS** y el **mapa de datos** por botón.

### Fuera

- Cambios en la lógica interna de los 4 juegos (`app/components/games/*Game.tsx`).
- Cambios en qué tecla dispara qué acción a nivel de juego (la tabla de `key`/`code` por
  acción de la spec 10 no cambia — solo cambia qué control físico del gamepad la dispara).
- Soporte de gamepad físico real (Gamepad API) — sigue siendo solo controles táctiles.
- Nuevos juegos o extensión del patrón a juegos "fake".
- Animaciones adicionales no presentes en el asset de referencia (solo se porta lo que
  trae `gamepad.html`: hover, `.on`/`:active`, pulso del hub).

## Modelo de datos

No hay persistencia nueva (no hay tabla, localStorage ni API). Solo cambia la forma del
dato interno de configuración en `app/components/games/TouchControls.tsx`:

```ts
type ButtonRole = "up" | "down" | "left" | "right" | "a" | "b";
type ButtonType = "tap" | "hold";

interface ButtonDef {
  role: ButtonRole; // posición fija en el gamepad (dpad o A/B)
  key: string;
  code: string;
  type: ButtonType;
}

// Solo se listan los roles que el juego usa; el resto no se renderiza.
const CONTROL_MAPS: Record<string, ButtonDef[]> = {
  snake: [
    { role: "up", key: "ArrowUp", code: "ArrowUp", type: "tap" },
    { role: "down", key: "ArrowDown", code: "ArrowDown", type: "tap" },
    { role: "left", key: "ArrowLeft", code: "ArrowLeft", type: "tap" },
    { role: "right", key: "ArrowRight", code: "ArrowRight", type: "tap" },
  ],
  arkanoid: [
    { role: "left", key: "ArrowLeft", code: "ArrowLeft", type: "hold" },
    { role: "right", key: "ArrowRight", code: "ArrowRight", type: "hold" },
  ],
  asteroides: [
    { role: "up", key: "ArrowUp", code: "ArrowUp", type: "hold" },
    { role: "left", key: "ArrowLeft", code: "ArrowLeft", type: "hold" },
    { role: "right", key: "ArrowRight", code: "ArrowRight", type: "hold" },
    { role: "a", key: " ", code: "Space", type: "tap" }, // fire
  ],
  tetris: [
    { role: "left", key: "ArrowLeft", code: "ArrowLeft", type: "tap" },
    { role: "right", key: "ArrowRight", code: "ArrowRight", type: "tap" },
    { role: "down", key: "ArrowDown", code: "ArrowDown", type: "tap" }, // soft drop
    { role: "a", key: "ArrowUp", code: "ArrowUp", type: "tap" }, // rotar
    { role: "b", key: " ", code: "Space", type: "tap" }, // hard drop
  ],
};
```

El componente renderiza el D-pad diamante (roles `up/down/left/right`, ocultando los que
falten en el mapa del juego) y hasta 2 botones de acción (roles `a`/`b`, ocultos si el juego
no los define). El rol `a` siempre se pinta magenta (`--magenta`), `b` siempre cian (`--cyan`) —
mismo criterio de color que el asset de referencia (A=magenta, B=cian).

## Plan de implementación

1. **`app/components/games/TouchControls.tsx`** — reescribir `CONTROL_MAPS` con la nueva
   forma `ButtonDef { role, key, code, type }` (los 4 juegos, valores de la sección
   "Modelo de datos"). Reescribir el render: estructura `.gp` → `.gp-body` con dos columnas
   (`gp-col-left` = D-pad, `gp-col-right` = A/B), calculando qué roles están presentes en el
   mapa del juego actual y no renderizando los ausentes (incluido el hub, que se muestra
   siempre que exista al menos un rol de dpad). Mantener intacto `handleButton()` (dispatch
   tap/hold vía `dispatchKey`, listeners `pointerdown/up/leave/cancel`) — solo cambia qué
   JSX se pinta por botón. El sistema sigue compilando y jugable con teclado/táctil (visual
   antiguo aún vigente hasta el paso 2).

2. **CSS neón en `app/globals.css`** — portar las reglas de `gamepad.html` (`.gp`, `.gp-body`,
   `.gp-col*`, `.gp-dpad`, `.dp*`, `.dp-hub*`, `@keyframes pulse-led`, `.gp-actions`, `.ab*`,
   `.ab-letter`, `.ab-ring`) adaptando nombres para no chocar con clases existentes y
   reemplazando los colores hardcodeados del asset (`--cyan`/`--magenta` propios del HTML)
   por las variables ya definidas en el proyecto. Eliminar las clases viejas
   `.touch-controls`/`.touch-pad`/`.touch-btn*` que queden sin uso tras el paso 1. Incluir el
   breakpoint compacto (`@media max-width: 620px` del asset) fusionado con los breakpoints
   móviles ya existentes (`max-width: 720px`, `pointer: coarse`).

3. **Verificación responsive por juego** — con emulación táctil en navegador, abrir cada uno
   de los 4 juegos y confirmar: el gamepad se ve como el asset de referencia (dpad diamante +
   hub pulsante + botones A/B con glow), solo aparecen los controles que cada juego usa según
   la tabla de la sección "Alcance", y el layout no rompe scroll horizontal ni el HUD.

4. **Ajuste fino de interacción** — confirmar que el estado visual `.on`/`:active` de cada
   botón se activa/desactiva en sincronía real con el tap/hold despachado (no solo con CSS
   `:active` del navegador, que no cubre el caso de `pointerleave` mid-hold) — reutilizar el
   patrón de clase `.on` controlada por estado de React (o clase añadida/quitada en el propio
   handler) igual que hace el script del asset, en vez de depender solo de pseudo-clases.

## Criterios de aceptación

- [ ] En dispositivo táctil (o DevTools con emulación), bajo el canvas de cada uno de los 4
      juegos aparece el gamepad con estética neón (D-pad diamante + hub central pulsante,
      botones A/B circulares con glow) en vez del layout plano anterior.
- [ ] Snake: se ven las 4 flechas del D-pad, sin A/B; cada flecha cambia el rumbo por toque.
- [ ] Arkanoid: se ven solo izq/der del D-pad (arriba/abajo ocultos), sin A/B; mantener
      pulsado mueve la paleta de forma continua y se detiene al soltar.
- [ ] Asteroides: se ven arriba/izq/der del D-pad (abajo oculto) + botón A (fire), sin B;
      mantener rotación/thrust es continuo, A dispara por toque.
- [ ] Tetris: se ven izq/der/abajo del D-pad (arriba oculto) + botones A (rotar) y B (hard
      drop); mover, soft drop, rotar y hard drop funcionan por toque.
- [ ] El color de A es magenta y el de B es cian, con glow visible al presionar, en los
      juegos que los usan.
- [ ] El hub central del D-pad se ve y pulsa en los 4 juegos (siempre que el D-pad esté
      presente).
- [ ] Ningún botón/flecha no usado por el juego actual se renderiza (no aparece deshabilitado
      ni oculto por CSS `display:none` residual en el árbol — no se monta).
- [ ] El estado visual `.on` de cada botón refleja fielmente el tap/hold real (se apaga al
      soltar, al salir del botón, o al cancelarse el puntero).
- [ ] El teclado sigue funcionando igual en desktop, sin cambios de comportamiento.
- [ ] No se modificó la lógica interna de ningún componente de juego ni el mapeo tecla→acción
      de la spec 10 (solo cambió qué control físico del gamepad dispara cada tecla).
- [ ] No hay scroll horizontal ni zoom accidental al usar los botones.
- [ ] `npm run build` y `npm run lint` pasan.

## Decisiones tomadas y descartadas

- **Adoptar el layout físico del gamepad** (elegido, decisión explícita del usuario) vs.
  solo restyle visual manteniendo la disposición actual por juego. Elegido para lograr
  fidelidad completa al asset de referencia, aceptando remapear acciones de Tetris/Asteroids
  a los 6 slots fijos (dpad + A + B).
- **Ocultar controles no usados** (elegido) vs. mostrarlos deshabilitados. Elegido para que
  el gamepad de cada juego solo muestre lo que realmente hace algo — menos confusión, sin
  necesidad de estilos "disabled".
- **Reusar paleta/fuentes ya existentes del proyecto** (`--cyan`, `--magenta`,
  `--font-press-start`, `--font-jetbrains-mono`) en vez de las variables/fuentes propias del
  HTML de referencia. Elegido porque el proyecto ya tiene exactamente esas fuentes cargadas
  vía `next/font` y esas variables de color en `globals.css` — cargar Google Fonts aparte
  sería duplicado.
- **A = magenta, B = cian** (elegido, fijo) — mismo criterio de color que el asset de
  referencia; no se deja configurable por juego.
- **Mantener el hub central decorativo** (elegido, decisión explícita del usuario) vs.
  omitirlo por no aportar función. Elegido por fidelidad visual completa al asset.
- **Tetris: A=rotar, B=hard drop, dpad arriba oculto** (elegido) vs. reutilizar arriba del
  dpad para rotar y dejar un botón de acción libre. Elegido porque separa claramente
  dirección de acción y dpad arriba con feedback de "rotar" no es intuitivo en una diagonal
  con dpad.
- **Sin soporte de Gamepad API real** (fuera de alcance) — el spec 10 y este spec cubren
  solo el mecanismo de `KeyboardEvent` sintéticos vía botones en pantalla, no gamepads
  físicos por USB/Bluetooth.

## Riesgos identificados

- **Confusión de usuario por controles ocultos**: un jugador que conocía el layout anterior
  (ej. Arkanoid con solo 2 flechas visibles) puede no notar que arriba/abajo del dpad no
  existen para ese juego — mitigado porque ya era así antes (arkanoid nunca tuvo esas
  flechas), el cambio real es el D-pad diamante compartiendo espacio con roles ausentes.
- **Colisión de nombres CSS**: el asset usa clases genéricas (`.gp`, `.dp`, `.ab`) que pueden
  chocar con clases ya existentes en `globals.css` (2800+ líneas). Mitigación: revisar con
  grep antes de portar y prefijar si hace falta (ej. `.touch-gp`, `.touch-dp`, `.touch-ab`).
- **Fidelidad del estado `.on` sin JS del asset**: el script de `gamepad.html` es standalone
  y maneja su propio `keydown/keyup` global — en el proyecto ya existe `handleButton()` con
  su propia lógica de dispatch; hay que verificar que el estado visual `.on` se sincronice
  con esa lógica existente y no con una reimplementación paralela del script del asset.
- **Tamaño de botones en pantallas pequeñas**: el D-pad diamante + hub + 2 círculos A/B ocupa
  más ancho que la fila plana anterior; verificar en viewport angosto (ej. 360px) que no
  fuerce scroll horizontal, ajustando el breakpoint de 620px del asset si hace falta.
