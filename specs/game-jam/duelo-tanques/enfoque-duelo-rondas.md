---
spec: game-jam/duelo-tanques/enfoque-duelo-rondas
title: Arcade Vault — DUELO DE TANQUES (duelo por rondas a muerte súbita)
state: Borrador
date: 2026-07-11
depends_on: [05-juego-asteroides, 06-tabla-juegos-leaderboard]
objective: Crear el juego DUELO DE TANQUES como componente React (id "duelo-tanques") con una estructura de rondas a muerte súbita contra IA, munición limitada por ronda y proyectiles que rebotan dos veces en los muros, jugable con teclado dentro de GamePlayer, con leaderboard real en Supabase.
---

## Alcance

### Dentro

- No hay carpeta que matchee "duelo-tanques"/"tanques" en `references/started-games/` — el
  juego se diseña desde cero siguiendo el contrato de props estándar de la plataforma.
- Fila nueva en `games` (Supabase): `id: 'duelo-tanques'`, `title: 'DUELO DE TANQUES'`,
  `cat: 'VERSUS'`, `color: 'cyan'`, `cover: 'cover-duelo-tanques'` (mismo diseño visual que las
  demás variantes de esta corrida), `short` compartido, `long` propio de este enfoque.
- Clase CSS `.cover-duelo-tanques` en `app/globals.css` + `@source inline("cover-duelo-tanques");`.
- Componente dedicado `app/components/games/DueloTanquesGame.tsx` (`'use client'`):
  - Canvas 800×600, arena rectangular con obstáculos fijos; cada 3 rondas la disposición de
    obstáculos se regenera con más piezas (más cobertura, más ángulos de rebote posibles).
  - Tanque del jugador y tanque de la IA, mismo esquema base de movimiento (avance/retroceso +
    rotación) que el resto del catálogo de tanques.
  - Controles: `↑`/`W` avanzar, `↓`/`S` retroceder, `←`/`A` rotar izquierda, `→`/`D` rotar
    derecha, `Espacio` disparar. **Nuevo:** `Shift` ejecuta un **dash** (ráfaga de velocidad 2×
    durante ~300 ms) con cooldown propio (~3s), usado para cerrar distancia o esquivar un tiro
    entrante.
  - **Munición limitada por ronda:** cada tanque (jugador e IA) dispone de 3 disparos por ronda,
    visibles como contador en el HUD del canvas. Se recarga a 3 automáticamente al empezar cada
    ronda nueva. Si un tanque agota su munición, no puede disparar hasta la ronda siguiente
    (puede seguir moviéndose/esquivando).
  - **Rebote doble:** los proyectiles rebotan **dos veces** en los muros (en vez de una) antes de
    desaparecer, permitiendo tiros de banda más elaborados — diferenciador explícito frente a
    las otras dos variantes de esta corrida.
  - **Estructura por rondas (muerte súbita):** cada ronda, ambos tanques reinician posición
    (jugador en esquina fija, IA en la esquina opuesta) con munición llena. El primer tanque que
    aterriza un impacto directo gana la ronda al instante (muerte súbita, un solo impacto basta).
    Si ambos tanques agotan su munición sin que nadie impacte, la ronda se declara empate y se
    repite (misma disposición de obstáculos, munición reiniciada, sin cambios de puntuación).
  - **Puntuación:** `score` = número de rondas ganadas por el jugador (se incrementa +1 cada vez
    que el jugador gana una ronda); no hay puntos por daño ni por tiempo, solo rondas ganadas.
  - `level`: representa el número de ronda actual; cada 3 rondas jugadas, sube +1, la arena se
    regenera con más obstáculos y el retraso de reacción de la IA se reduce (mejor puntería).
  - **Condición de partida:** formato al mejor de 9 — el jugador dispone de 5 "rondas de margen"
    (representadas en `lives`, empezando en 5): cada ronda que gana la IA (aterriza el impacto
    antes que el jugador) resta -1 a `lives`. `onGameOver(finalScore)` se dispara cuando `lives`
    llega a `0` (el jugador perdió 5 rondas); `finalScore` es el número de rondas que el jugador
    llegó a ganar (`score`) hasta ese momento. Ganar 5 rondas antes de perder las 5 propias no
    termina la partida por sí solo en este contrato (no hay pantalla de "victoria" separada; el
    jugador sigue jugando rondas hasta agotar sus 5 márgenes o decide terminar con el botón "FIN"
    del HUD estándar) — se documenta explícitamente como decisión de diseño.
- Integración en `app/components/screens/GamePlayer.tsx`: rama `id === "duelo-tanques"` monta
  `<DueloTanquesGame>` con `paused`/`restartSignal`/`skin`/`onStateChange`/`onGameOver`.
- Guardado de puntuación reutiliza `saveScore` de `app/lib/games.ts` (`game_id: 'duelo-tanques'`).

### Fuera de alcance

- Controles táctiles / móvil.
- Multijugador local o en red.
- Power-ups o munición recogible en el suelo (la munición es un contador fijo por ronda, no un
  recurso recolectable).
- Pantalla de "victoria" separada al ganar 5 rondas — el fin de partida se define únicamente por
  `lives` (margen de rondas perdidas) llegando a 0, consistente con el contrato `onGameOver`
  fijo de la plataforma.
- Reaplicación de paletas por skin más allá de aceptar la prop `skin: SkinId` (trabajo de
  `skin-designer`, invocado aparte).
- Sonido/efectos de audio.
- Cambios a `Library.tsx`, `GameDetail.tsx`, `HallOfFame.tsx`, `AppShell.tsx`,
  `app/lib/games.ts`, `app/lib/supabase/client.ts`, `app/data/index.ts`.

---

## Modelo de datos

### Fila nueva en `games` (seed vía Supabase MCP)

```sql
insert into games (id, title, short, long, cat, cover, color) values (
  'duelo-tanques',
  'DUELO DE TANQUES',
  'Rota, avanza y dispara: gana el duelo a rebotes en la arena.',
  'Duelo por rondas a muerte súbita: un solo impacto gana la ronda. Administra tu munición limitada, usa el dash para esquivar o cerrar distancia, y aguanta tus 5 rondas de margen antes que la IA.',
  'VERSUS',
  'cover-duelo-tanques',
  'cyan'
);
```

### Props de `DueloTanquesGame`

```ts
interface DueloTanquesGameProps {
  paused: boolean;
  restartSignal: number;
  skin: SkinId;
  onStateChange: (state: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
}
```

- `score`: significativo, representa **rondas ganadas por el jugador** (no impactos acumulados
  ni puntos por daño); sube +1 cada vez que el jugador gana una ronda.
- `lives`: significativo, pero representa el **margen de rondas perdidas restante** (empieza en
  5, baja -1 cada vez que la IA gana una ronda) — reinterpretación explícita del campo frente al
  patrón de "vidas del tanque", documentada como decisión de esta variante.
- `level`: significativo, representa el número de ronda actual; sube +1 cada 3 rondas jugadas
  (ganadas, perdidas o empatadas cuentan para el contador de rondas jugadas).
- `onGameOver` se dispara cuando `lives` (margen de rondas perdidas) llega a `0`.

Este spec no introduce estructuras de datos más allá de la fila de `games` y las props del
componente; el estado de ronda/munición/dash vive en `useRef` interno, sin persistirse más allá
del contrato `onStateChange`.

---

## Plan de implementación

1. **Catálogo — seed en `games`**: aplicar la fila de arriba vía Supabase MCP; verificar con
   `list_tables`/consulta.
2. **CSS — cover de catálogo**: añadir `.cover-duelo-tanques` a `app/globals.css` (mismo diseño
   base que las otras variantes de esta corrida) + `@source inline("cover-duelo-tanques");`.
3. **Componente del juego — `DueloTanquesGame.tsx`**: creado desde cero.
   - Constantes: layout base de obstáculos y layouts alternativos más densos (para cada +3
     rondas), velocidad/rotación de tanques, munición por ronda (3), duración y cooldown del
     dash (300 ms / 3s), rebotes por proyectil (2), márgenes de partida (5 rondas de margen).
   - Estado interno en `useRef`: posición/ángulo de jugador e IA, munición restante de cada uno
     en la ronda actual, proyectiles activos (rebotes restantes = 2 al disparar), cooldown de
     dash de cada tanque, `score` (rondas ganadas), `lives` (margen de rondas perdidas),
     `rondaActual`, resultado pendiente de la ronda (en curso / ganada jugador / ganada IA /
     empate), temporizador de transición entre rondas.
   - Loop `requestAnimationFrame`: mueve tanques (incluye ejecución de dash mientras su cooldown
     lo permita), actualiza proyectiles (colisión con muros → rebote hasta agotar 2, colisión con
     tanque → gana la ronda al instante para el tirador), detecta agotamiento de munición de
     ambos tanques sin impacto → declara empate y reinicia la ronda, detecta fin de ronda → suma
     a `score`/resta a `lives` según corresponda, sube `rondaActual`, regenera arena/reduce lag
     de IA cada 3 rondas, reinicia posiciones y munición para la siguiente ronda tras una breve
     transición (~1.5s).
   - Listeners de teclado (`keydown`/`keyup`) para movimiento continuo y detección de pulsación
     de `Shift` (dash) y `Espacio` (disparo, solo si queda munición), limpiados al desmontar.
   - `restartSignal`: reset in-place completo (posiciones, munición, proyectiles, score, lives,
     ronda, arena a la disposición inicial).
4. **GamePlayer — integración**: rama `id === "duelo-tanques"` monta `DueloTanquesGame` con
   `paused`/`restartSignal`/`skin`/`onStateChange`/`onGameOver`; desactiva el intervalo de score
   falso para ese id.
5. **Verificación manual**: `npm run dev`, Vault → tarjeta "DUELO DE TANQUES" → detalle → Jugar;
   comprobar que cada ronda arranca con posiciones fijas y 3 municiones por bando, un solo
   impacto gana la ronda al instante, agotar munición sin impacto declara empate y repite la
   ronda, el dash con `Shift` tiene cooldown perceptible, los proyectiles rebotan dos veces antes
   de desaparecer, `score` sube solo con rondas ganadas por el jugador, `lives` baja solo con
   rondas ganadas por la IA, cada 3 rondas la arena se regenera con más obstáculos, `onGameOver`
   se dispara al llegar `lives` a 0, puntuación se guarda y aparece en GameDetail/HallOfFame.

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] Catálogo muestra tarjeta "DUELO DE TANQUES" con `.cover-duelo-tanques`, categoría VERSUS,
      color cyan
- [ ] Fila `duelo-tanques` existe en `games` con los campos del seed
- [ ] "JUGAR AHORA" renderiza `DueloTanquesGame` en vez del placeholder decorativo
- [ ] Cada ronda arranca con el jugador y la IA en posiciones fijas opuestas y 3 municiones cada
      uno, visibles en el HUD del canvas
- [ ] Un solo impacto directo (propio o rebotado) gana la ronda al instante para quien lo disparó
- [ ] Si ambos tanques agotan su munición sin que nadie impacte, la ronda se declara empate y se
      repite sin cambiar `score` ni `lives`
- [ ] `Shift` ejecuta un dash de velocidad 2× durante ~300ms, sujeto a un cooldown de ~3s
- [ ] Los proyectiles rebotan exactamente dos veces en los muros antes de desaparecer
- [ ] `score` sube +1 únicamente cuando el jugador gana una ronda (no por impactos ni por tiempo)
- [ ] `lives` baja -1 únicamente cuando la IA gana una ronda
- [ ] `level` refleja el número de ronda actual, sube +1 cada 3 rondas jugadas
- [ ] Cada 3 rondas, la arena se regenera con más obstáculos y la IA reacciona con menor lag
- [ ] `onGameOver` se dispara exactamente cuando `lives` (margen de rondas perdidas) llega a 0,
      con `finalScore` igual a las rondas ganadas por el jugador
- [ ] Puntuación guardada aparece en GameDetail y HallOfFame (tab del juego + tab "TODOS")
- [ ] PAUSA detiene el loop (tanques, proyectiles y transición de ronda congelados); REANUDAR
      continúa donde quedó
- [ ] JUGAR DE NUEVO reinicia sin desmontar el canvas (`restartSignal`)
- [ ] Otros juegos del catálogo no cambian de comportamiento

---

## Decisiones tomadas y descartadas

| Decisión                  | Elegida                                                               | Descartada                                              | Razón                                                                                                                |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Estructura del duelo      | Rondas discretas a muerte súbita (1 impacto gana la ronda)            | Duelo continuo (clásico) / oleadas simultáneas          | Diferencia deliberada de eje "estructura de niveles/progresión"; introduce tensión de ronda corta y decisiva         |
| Munición                  | Limitada a 3 disparos por ronda, recarga completa al iniciar ronda    | Munición infinita con solo cooldown (otras variantes)   | Fuerza precisión y gestión de recursos, distingue el eje mecánico frente a las otras dos variantes                   |
| Rebote de proyectiles     | 2 rebotes antes de desaparecer                                        | 1 rebote (clásico) / 0 rebotes                          | Habilita tiros de banda más elaborados, coherente con arenas más densas cada 3 rondas; diferenciador explícito       |
| Sistema de puntuación     | `score` = rondas ganadas (no impactos ni tiempo)                      | Puntos por impacto/daño (otras variantes)               | Refleja el formato de "duelo por rondas" en vez de duelo continuo; distingue el eje de scoring                       |
| Condición de `onGameOver` | `lives` = margen de rondas perdidas, llega a 0                        | `lives` = vidas discretas por impacto directo (clásico) | Consistente con la estructura de rondas; el jugador puede "perder" varias veces sin terminar la partida de inmediato |
| Esquema de controles      | Movimiento + rotación + disparo + **dash** (`Shift`, cooldown propio) | Sin dash (clásico) / dos armas (oleadas)                | Introduce una herramienta de posicionamiento/evasión única de esta variante, distingue el eje de controles           |
| Empates de ronda          | Ronda se repite sin cambios de puntuación si ambos agotan munición    | Empate cuenta como ronda perdida para ambos             | Evita penalizar a ambos jugadores por un intercambio sin resolución; más justo dado el límite estricto de munición   |
| Color de catálogo         | `cyan` (compartido con las demás variantes de esta corrida)           | Otro color                                              | Mismo criterio que las demás variantes — `id`/`cat`/`color` se comparten dentro de una misma corrida de game-jam     |

---

## Riesgos

- **Balance de la muerte súbita**: un solo impacto decide la ronda, lo que puede hacer que un
  rebote afortunado (o desafortunado) tenga demasiado peso; mitigar ajustando la velocidad de
  proyectil y el tamaño de los tanques en pruebas de juego.
- **Doble rebote en arenas densas** (cada 3 rondas) puede generar trayectorias difíciles de leer
  para el jugador; mitigar con una traza visual breve del proyectil en el canvas.
- **Cooldown de dash y disparo compitiendo por la misma tecla modificadora** (`Shift`): mitigar
  con listeners de `keydown`/`keyup` independientes para dash y disparo, sin combinarlos en una
  sola combinación de teclas.
- **Gestión de munición agotada**: si ambos tanques se quedan sin munición y sin posibilidad de
  impacto, evitar que la ronda quede "colgada" — mitigar con un temporizador máximo de ronda
  (ej. 20s) que fuerza el empate si nadie dispara o impacta antes.
- StrictMode doble-montaje del `useEffect` que arranca el RAF loop y los listeners de teclado
  (React 19 dev) — mitigar limpiando loop y listeners en cleanup.
- Canvas de tamaño fijo 800×600 dentro de layout responsive — mitigar con CSS.
- Reinterpretar `score`/`lives` como "rondas ganadas"/"margen de rondas perdidas" puede confundir
  al HUD React genérico si asume semántica de impactos/vidas; documentar en la implementación que
  el HUD debe reflejar esta semántica de rondas, no impactos directos.
