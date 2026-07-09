---
spec: game-jam/frogger/enfoque-supervivencia-oleadas
title: Arcade Vault — FROGGER (enfoque supervivencia por oleadas)
state: Borrador
date: 2026-07-08
depends_on: [05-juego-asteroides, 06-tabla-juegos-leaderboard]
objective: Crear el juego FROGGER como componente React (id "frogger") con progresión endless por oleadas de dificultad creciente, combo de cruces consecutivos y salto largo con cooldown, jugable con teclado dentro de GamePlayer, con leaderboard real en Supabase.
---

## Alcance

### Dentro

- No hay carpeta que matchee "frogger" en `references/started-games/` — el juego se diseña desde
  cero siguiendo el contrato de props estándar de la plataforma.
- Fila nueva en `games` (Supabase): `id: 'frogger'`, `title: 'FROGGER'`, `cat: 'ARCADE'`,
  `color: 'green'`, `cover: 'cover-frogger'`, `short`/`long` propios (mismo `short` base que las
  demás variantes, `long` describe el enfoque de supervivencia).
- Clase CSS nueva `.cover-frogger` en `app/globals.css` + `@source inline("cover-frogger");`
  (mismo diseño visual que las otras variantes; no es un eje de diferenciación).
- Componente dedicado `app/components/games/FroggerGame.tsx` (`'use client'`):
  - Canvas 800×600, grid de 20 columnas × 15 filas, mismo layout base de carriles
    (salida → 5 carriles de carretera → mediana → 5 carriles de río → meta con 5 huecos) que el
    resto de variantes.
  - **Sin temporizador por vida.** El desafío viene de una dificultad que sube de forma continua:
    cada vez que la rana rellena un hueco de meta, respawnea inmediatamente en la fila de salida
    (no hay "reinicio de nivel" al llenar los 5 huecos) y los 5 huecos se vacían de nuevo tras un
    breve respiro, permitiendo cruces indefinidos.
  - **Oleadas:** cada 3 huecos de meta rellenados con éxito (sumando toda la partida, no por
    tablero), sube `level` en +1; cada subida de `level` incrementa un 8% la velocidad de todos
    los carriles de tráfico y río, y añade un vehículo/tronco adicional al carril más despejado.
    No hay techo de nivel — la partida es endless hasta perder las 3 vidas.
  - **Combo de cruces:** cada vez que la rana llega a un hueco de meta sin haber muerto desde el
    cruce anterior, el multiplicador de combo sube en +1 (empieza en ×1, tope ×5); morir
    (colisión, ahogamiento) resetea el combo a ×1 pero no termina la partida por sí solo. La
    puntuación de cada hueco relleno es `50 × combo_actual`; el avance por celda sigue sumando
    +10 fijo (no afectado por el combo).
  - **Salto largo (dash):** al mantener pulsada la tecla de dirección (o pulsar `Shift` + flecha)
    se ejecuta un salto de 2 celdas en vez de 1, consumiendo una barra de "aliento" que se recarga
    con el tiempo (cooldown visual en el HUD del canvas); si la barra está vacía, el salto largo
    no se ejecuta y la pulsación se trata como salto normal de 1 celda. El salto largo es útil
    para cruzar huecos peligrosos entre vehículos/troncos pero no es obligatorio para jugar.
  - Vidas: 3 al inicio; se pierde una por colisión con vehículo o por caer al agua sin estar sobre
    tronco/tortuga; al perder una vida, la rana respawnea en la fila de salida con el combo
    reseteado a ×1, pero el nivel y los huecos ya rellenados en la sesión de oleada actual se
    conservan.
  - `onGameOver(finalScore)` se dispara cuando `lives` llega a `0`.
- Controles: flechas `↑/↓/←/→` para movimiento de 1 celda; mantener pulsada la flecha o combinar
  con `Shift` para salto largo de 2 celdas (sujeto a barra de aliento).
- Integración en `app/components/screens/GamePlayer.tsx`: rama `id === "frogger"` monta
  `<FroggerGame>` con el mismo mecanismo de `paused`/`restartSignal`/`onStateChange`/`onGameOver`.
- Guardado de puntuación reutiliza `saveScore` de `app/lib/games.ts` (`game_id: 'frogger'`).

### Fuera de alcance

- Controles táctiles / móvil.
- Power-ups distintos del salto largo (comodines, invencibilidad temporal).
- Tope de nivel o "pantalla de victoria" — el modo es endless por diseño.
- Multijugador local.
- Sonido/efectos de audio.
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
  'Encadena cruces exitosos para subir tu combo de puntuación mientras el tráfico y el río se aceleran sin descanso. Usa el salto largo con cuidado: la resistencia se agota.',
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

- `score`: significativo, suma +10 por celda avanzada y `50 × combo_actual` por hueco de meta
  relleno; el combo mismo no se expone en el contrato (es estado interno, visible solo en el HUD
  del canvas, no en `onStateChange`).
- `lives`: significativo, empieza en 3, baja por colisión/ahogamiento; no hay temporizador que la
  reduzca.
- `level`: significativo, sube +1 cada 3 huecos rellenados en total durante la partida; sin techo.
- `onGameOver` se dispara cuando `lives` llega a `0`.

---

## Plan de implementación

1. **Catálogo — seed en `games`**: aplicar la fila de arriba vía Supabase MCP; verificar con
   `list_tables`/consulta.
2. **CSS — cover de catálogo**: añadir `.cover-frogger` a `app/globals.css` (mismo diseño base
   que las otras variantes de esta corrida) + `@source inline("cover-frogger");`.
3. **Componente del juego — `FroggerGame.tsx`**: creado desde cero.
   - Constantes: layout de carriles base, incremento de velocidad por nivel (8%), umbral de
     huecos por nivel (3), tope de combo (×5), duración de recarga de la barra de aliento.
   - Estado interno en `useRef`: posición de la rana, huecos de meta rellenados, posiciones de
     vehículos/troncos/tortugas, `score`, `lives`, `level`, `comboActual`, `huecosTotales`,
     `alientoActual` (barra de salto largo).
   - Loop `requestAnimationFrame`: avanza vehículos/troncos con velocidad escalada por `level`,
     recarga la barra de aliento con el tiempo, detecta colisión/ahogamiento, detecta llegada a
     hueco de meta (aplica combo, respawnea huecos tras respiro, recalcula `level` si corresponde),
     detecta salto largo válido (barra suficiente) vs. salto normal.
   - Listeners de teclado: `keydown`/`keyup` para distinguish pulsación simple de mantenida y
     `Shift`, limpiados al desmontar.
   - `restartSignal`: reset in-place completo (posición, huecos, nivel, vidas, score, combo,
     aliento).
4. **GamePlayer — integración**: rama `id === "frogger"` monta `FroggerGame`; desactiva el
   intervalo de score falso para ese id.
5. **Verificación manual**: `npm run dev`, Vault → tarjeta "FROGGER" → detalle → Jugar; sin
   temporizador de vida visible, oleadas suben de dificultad cada 3 huecos, combo visible en HUD
   del canvas sube con cruces consecutivos y se resetea al morir, salto largo funciona y se agota
   con uso repetido, `onGameOver` a las 3 vidas perdidas, puntuación se guarda y aparece en
   GameDetail/HallOfFame.

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] Catálogo muestra tarjeta "FROGGER" con `.cover-frogger`, categoría ARCADE, color green
- [ ] Fila `frogger` existe en `games` con los campos del seed
- [ ] "JUGAR AHORA" renderiza `FroggerGame` en vez del placeholder decorativo
- [ ] No existe temporizador de cuenta atrás por vida/intento en esta variante
- [ ] Rellenar un hueco de meta respawnea la rana y vacía los huecos tras un breve respiro
- [ ] `level` sube +1 cada 3 huecos rellenados en total y la velocidad de tráfico/río aumenta
      perceptiblemente (~8%) por nivel, sin techo
- [ ] Combo sube en +1 (hasta ×5) por cada hueco relleno sin morir desde el cruce anterior;
      morir resetea el combo a ×1 sin terminar la partida
- [ ] Puntuación por hueco relleno es `50 × combo` en el momento del cruce
- [ ] Mantener pulsada una flecha (o `Shift` + flecha) ejecuta salto largo de 2 celdas si la barra
      de aliento tiene carga suficiente; si no, se ejecuta salto normal de 1 celda
- [ ] La barra de aliento se recarga con el tiempo cuando no se usa
- [ ] Colisión con vehículo o ahogamiento resta 1 vida, respawnea en salida y resetea el combo
- [ ] `onGameOver` se dispara exactamente cuando `lives` llega a 0
- [ ] Puntuación guardada aparece en GameDetail y HallOfFame (tab del juego + tab "TODOS")
- [ ] PAUSA detiene el loop (incluida la recarga de aliento); REANUDAR continúa donde quedó
- [ ] JUGAR DE NUEVO reinicia sin desmontar el canvas (`restartSignal`)
- [ ] Otros juegos del catálogo no cambian de comportamiento

---

## Decisiones tomadas y descartadas

| Decisión                  | Elegida                                                          | Descartada                                          | Razón                                                                                                           |
| ------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Estructura de niveles     | Endless, oleadas de dificultad continua cada 3 huecos rellenados | Niveles con 5 huecos fijos y "pantalla de victoria" | Diferencia deliberada frente al enfoque clásico; premia supervivencia larga en vez de completar un set fijo     |
| Temporizador              | Ninguno por vida — la presión viene de la aceleración progresiva | Timer de 30s por intento (enfoque clásico)          | Elimina la ansiedad del reloj para enfatizar reflejos ante tráfico cada vez más rápido                          |
| Sistema de puntuación     | Combo multiplicador (×1–×5) por cruces consecutivos sin morir    | Puntuación fija por hueco (enfoque clásico)         | Recompensa la habilidad de encadenar cruces, distingue esta variante en el eje de scoring                       |
| Esquema de controles      | Flechas + salto largo (mantener/`Shift`) con barra de aliento    | Solo flechas de 1 celda (enfoque clásico)           | Introduce un recurso táctico (aliento) que obliga a decidir cuándo arriesgar el salto largo                     |
| Condición de `onGameOver` | `lives === 0`, sin límite de nivel                               | Fin al alcanzar un nivel máximo                     | Consistente con el espíritu "endless"; el juego termina solo quando el jugador falla, no por un tope arbitrario |
| Color de catálogo         | `green` (sustituto de "lime")                                    | `cyan`/`magenta`/`yellow`                           | Mismo criterio que las demás variantes de esta corrida — el humano fijó `id`/`cat`/`color` compartidos          |

---

## Riesgos

- Balancear el incremento de velocidad por nivel (8%) para que el juego siga siendo jugable tras
  muchas oleadas sin volverse imposible demasiado rápido — requiere ajuste manual en pruebas.
- Distinguir pulsación simple de "mantener pulsada" para el salto largo sin depender de
  `keydown` repetido del navegador (usar temporización propia con `keydown`/`keyup`).
- StrictMode doble-montaje del `useEffect` que arranca el RAF loop y los listeners de teclado —
  mitigar limpiando loop y listeners en cleanup.
- Canvas de tamaño fijo 800×600 dentro de layout responsive — mitigar con CSS.
- Exponer el combo solo en el HUD del canvas (no en `onStateChange`) puede resultar poco visible
  si el jugador no mira el canvas; mitigar con una posición fija y contraste alto del indicador.
