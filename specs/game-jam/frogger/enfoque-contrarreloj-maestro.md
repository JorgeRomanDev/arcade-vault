---
spec: game-jam/frogger/enfoque-contrarreloj-maestro
title: Arcade Vault — FROGGER (enfoque contrarreloj maestro)
state: Borrador
date: 2026-07-08
depends_on: [05-juego-asteroides, 06-tabla-juegos-leaderboard]
objective: Crear el juego FROGGER como componente React (id "frogger") con un único reloj maestro de partida que se recarga al completar niveles, doble condición exacta de fin de partida (vidas o tiempo) y esquema de controles con doble-tap para esquiva rápida, jugable con teclado dentro de GamePlayer, con leaderboard real en Supabase.
---

## Alcance

### Dentro

- No hay carpeta que matchee "frogger" en `references/started-games/` — el juego se diseña desde
  cero siguiendo el contrato de props estándar de la plataforma.
- Fila nueva en `games` (Supabase): `id: 'frogger'`, `title: 'FROGGER'`, `cat: 'ARCADE'`,
  `color: 'green'`, `cover: 'cover-frogger'`, `short`/`long` propios (mismo `short` base,
  `long` describe el enfoque contrarreloj).
- Clase CSS nueva `.cover-frogger` en `app/globals.css` + `@source inline("cover-frogger");`
  (mismo diseño visual base que las otras variantes de esta corrida).
- Componente dedicado `app/components/games/FroggerGame.tsx` (`'use client'`):
  - Canvas 800×600, grid de 20 columnas × 15 filas, mismo layout base de carriles (salida → 5
    carriles de carretera → mediana → 5 carriles de río → meta con 5 huecos).
  - **Reloj maestro único:** en vez de un temporizador por vida, la partida completa arranca con
    60 segundos en un reloj visible en el HUD del canvas. El reloj corre de forma continua
    (también mientras la rana está en la fila de salida) y **no se reinicia al perder una vida**.
    Completar un nivel (rellenar los 5 huecos de meta) otorga +15 segundos al reloj maestro como
    recompensa, además de los puntos de nivel. No hay temporizador individual por intento.
  - **Doble condición exacta de fin de partida:** `onGameOver(finalScore)` se dispara quando
    ocurre la **primera** de estas dos condiciones (lo que pase antes):
    1. `lives` llega a `0` (colisión con vehículo o ahogamiento sin vidas restantes), o
    2. el reloj maestro llega a `0` segundos (independientemente de cuántas vidas queden).
  - Vidas: 3 al inicio; se pierde una por colisión con vehículo o por caer al agua sin estar sobre
    tronco/tortuga; al perder una vida (si el reloj maestro sigue > 0), la rana respawnea en la
    fila de salida y el nivel/huecos ya rellenados se conservan, pero el reloj **no** se detiene
    ni se recarga por perder una vida (solo por completar nivel).
  - Puntuación: +10 por celda avanzada hacia adelante, +50 por hueco de meta relleno, +1000 por
    nivel completado (5 huecos), + bonus final de `segundos_restantes × 20` sumado al `finalScore`
    en el instante exacto en que se dispara `onGameOver` por agotamiento de vidas (si el juego
    termina por reloj a 0, ese bonus es 0 por definición).
  - **Esquema de controles con esquiva por doble-tap:** flechas `↑/↓/←/→` mueven 1 celda por
    pulsación, igual que las otras variantes. Pulsar la misma flecha dos veces en menos de 250ms
    ejecuta una "esquiva rápida": la rana avanza 1 celda igual, pero queda con 1 frame de
    invulnerabilidad ante colisión con vehículo (no ante ahogamiento) al aterrizar, útil para
    cruzar por un hueco justo entre dos autos. La esquiva rápida no consume ningún recurso pero
    tiene un cooldown de 1.5s antes de poder reactivarse (evita spam de invulnerabilidad).
  - `level` sube al rellenar los 5 huecos de meta de un nivel, igual estructura de niveles fijos
    que el enfoque clásico (no endless), pero sin temporizador por intento — solo el reloj maestro
    global condiciona la partida.
- Integración en `app/components/screens/GamePlayer.tsx`: rama `id === "frogger"` monta
  `<FroggerGame>` con el mismo mecanismo de `paused`/`restartSignal`/`onStateChange`/`onGameOver`.
- Guardado de puntuación reutiliza `saveScore` de `app/lib/games.ts` (`game_id: 'frogger'`).

### Fuera de alcance

- Controles táctiles / móvil.
- Power-ups adicionales más allá de la esquiva por doble-tap.
- Multijugador local.
- Sonido/efectos de audio.
- Recarga del reloj maestro por cualquier vía distinta de completar un nivel (no hay pickups de
  tiempo en el tablero).
- Cambios a `Library.tsx`, `GameDetail.tsx`, `HallOfFame.tsx`, `AppShell.tsx`,
  `app/lib/games.ts`, `app/lib/supabase/client.ts`, `app/data/index.ts`.

---

## Modelo de datos

### Fila nueva en `games` (seed vía Supabase MCP)

```sql
insert into games (id, title, short, long, cat, cover, color) values (
  'frogger',
  'FROGGER',
  'Cruza la carretera y el río sin convertirte en papilla.',
  'Un único reloj de 60 segundos corre para toda la partida: cada nivel completado te regala tiempo extra. Domina el doble-tap para esquivar el tráfico por un instante y llegar más lejos antes de que el reloj o tus vidas se agoten.',
  'ARCADE',
  'cover-frogger',
  'green'
);
```

### Props de `FroggerGame`

```ts
interface FroggerGameProps {
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

- `score`: significativo, suma por avance de celda, hueco relleno, nivel completado y bonus final
  de tiempo restante (solo si el fin de partida es por vidas agotadas, no por reloj a 0).
- `lives`: significativo, empieza en 3, baja por colisión/ahogamiento; no se resetea por el reloj.
- `level`: significativo, sube al rellenar los 5 huecos de meta de cada nivel; sin relación
  directa con el reloj salvo el bonus de +15s al completarlo.
- `onGameOver` se dispara en la **primera** de: `lives === 0` o reloj maestro `=== 0`; el reloj
  maestro en sí no se expone en `onStateChange` (es estado interno visible en el HUD del canvas),
  solo determina cuándo se llama a `onGameOver`.

---

## Plan de implementación

1. **Catálogo — seed en `games`**: aplicar la fila de arriba vía Supabase MCP; verificar con
   `list_tables`/consulta.
2. **CSS — cover de catálogo**: añadir `.cover-frogger` a `app/globals.css` (mismo diseño base
   que las otras variantes de esta corrida) + `@source inline("cover-frogger");`.
3. **Componente del juego — `FroggerGame.tsx`**: creado desde cero.
   - Constantes: layout de carriles base, duración inicial del reloj maestro (60s), bonus de
     tiempo por nivel completado (+15s), ventana de doble-tap (250ms), cooldown de esquiva (1.5s).
   - Estado interno en `useRef`: posición de la rana, huecos de meta rellenados, posiciones de
     vehículos/troncos/tortugas, `score`, `lives`, `level`, `relojMaestro` (segundos restantes),
     timestamp del último tap por dirección (para detectar doble-tap), flag de invulnerabilidad
     activa y su cooldown.
   - Loop `requestAnimationFrame`: avanza vehículos/troncos, descuenta `relojMaestro` de forma
     continua (salvo `paused`), detecta colisión (respetando invulnerabilidad activa),
     ahogamiento, llegada a hueco de meta (aplica +15s si completa nivel), y evalúa la doble
     condición de fin de partida en cada frame (lo que ocurra primero dispara `onGameOver` una
     sola vez).
   - Listeners de teclado (`keydown`) con registro de timestamp por dirección para detectar
     doble-tap y activar esquiva; limpiados al desmontar.
   - `restartSignal`: reset in-place completo (posición, huecos, nivel, vidas, score, reloj
     maestro, estado de esquiva).
4. **GamePlayer — integración**: rama `id === "frogger"` monta `FroggerGame`; desactiva el
   intervalo de score falso para ese id.
5. **Verificación manual**: `npm run dev`, Vault → tarjeta "FROGGER" → detalle → Jugar; reloj
   maestro corre de forma continua y visible, completar nivel añade +15s, perder vida no afecta
   el reloj, doble-tap en la misma flecha activa esquiva con 1 frame de invulnerabilidad ante
   vehículos y respeta su cooldown, `onGameOver` se dispara exactamente por la primera condición
   cumplida (vidas o reloj), bonus final de tiempo solo aplica si termina por vidas, puntuación se
   guarda y aparece en GameDetail/HallOfFame.

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] Catálogo muestra tarjeta "FROGGER" con `.cover-frogger`, categoría ARCADE, color green
- [ ] Fila `frogger` existe en `games` con los campos del seed
- [ ] "JUGAR AHORA" renderiza `FroggerGame` en vez del placeholder decorativo
- [ ] El reloj maestro empieza en 60s, es único para toda la partida y corre de forma continua
      (incluida la fila de salida), visible en el HUD del canvas
- [ ] Completar un nivel (5 huecos rellenos) suma +15s al reloj maestro y +1000 al score
- [ ] Perder una vida respawnea la rana en salida sin afectar el reloj maestro ni el nivel/huecos
      ya rellenados
- [ ] Pulsar la misma flecha dos veces en menos de 250ms activa esquiva rápida con 1 frame de
      invulnerabilidad ante vehículos (no ante ahogamiento), con cooldown de 1.5s antes de poder
      reactivarse
- [ ] `onGameOver` se dispara exactamente en la primera de: `lives === 0` o reloj maestro `=== 0`
- [ ] Bonus final de `segundos_restantes × 20` se suma al `finalScore` solo si el fin de partida
      es por vidas agotadas (reloj > 0 en ese instante); si el fin es por reloj a 0, el bonus es 0
- [ ] Puntuación guardada aparece en GameDetail y HallOfFame (tab del juego + tab "TODOS")
- [ ] PAUSA detiene el loop, incluido el descuento del reloj maestro; REANUDAR continúa donde
      quedó
- [ ] JUGAR DE NUEVO reinicia sin desmontar el canvas (`restartSignal`), reloj maestro vuelve a
      60s
- [ ] Otros juegos del catálogo no cambian de comportamiento

---

## Decisiones tomadas y descartadas

| Decisión                    | Elegida                                                                                  | Descartada                                                                          | Razón                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Estructura del temporizador | Reloj maestro único de partida, recargado por nivel completado                           | Timer por vida/intento (enfoque clásico) / sin timer (enfoque supervivencia)        | Introduce presión constante pero recompensable, distinto de ambos enfoques anteriores; eje de diseño propio         |
| Condición de `onGameOver`   | Doble condición exacta: `lives === 0` **o** reloj maestro `=== 0`, lo primero que ocurra | Solo vidas (enfoque clásico) / solo vidas sin timer (enfoque supervivencia)         | Es el eje diferenciador central de esta variante — obliga a decidir el spec con precisión sobre qué gana la carrera |
| Esquema de controles        | Flechas + esquiva por doble-tap con invulnerabilidad de 1 frame                          | Flechas simples (enfoque clásico) / salto largo con aliento (enfoque supervivencia) | Tercer esquema de controles distinto, enfocado en timing de reacción en vez de alcance o resistencia                |
| Bonus de tiempo restante    | Solo se suma al `finalScore` si termina por vidas agotadas                               | Sumarlo siempre, también si termina por reloj a 0                                   | Es lógicamente inconsistente sumar "tiempo restante" cuando el reloj llegó a 0 exactamente por eso                  |
| Color de catálogo           | `green` (sustituto de "lime")                                                            | `cyan`/`magenta`/`yellow`                                                           | Mismo criterio que las demás variantes de esta corrida                                                              |

---

## Riesgos

- La doble condición de `onGameOver` evaluada en cada frame del RAF loop debe garantizar que
  `onGameOver` se dispare una única vez aunque ambas condiciones se cumplan en frames cercanos —
  mitigar con un flag `gameOverDisparado` en el `useRef`.
- Detectar doble-tap de forma fiable sin depender del auto-repeat del navegador en `keydown` —
  mitigar comparando timestamps entre pulsaciones reales (ignorando eventos repetidos con
  `event.repeat === true`).
- Balancear la duración inicial (60s) y el bonus por nivel (+15s) para que el reloj maestro sea
  un desafío real sin volver la partida injugablemente corta — requiere ajuste manual en pruebas.
- StrictMode doble-montaje del `useEffect` que arranca el RAF loop y los listeners de teclado —
  mitigar limpiando loop y listeners en cleanup.
- Canvas de tamaño fijo 800×600 dentro de layout responsive — mitigar con CSS.
