---
spec: game-jam/duelo-tanques/enfoque-oleadas-supervivencia
title: Arcade Vault — DUELO DE TANQUES (oleadas de supervivencia)
state: Borrador
date: 2026-07-11
depends_on: [05-juego-asteroides, 06-tabla-juegos-leaderboard]
objective: Crear el juego DUELO DE TANQUES como componente React (id "duelo-tanques") con oleadas endless de varios tanques IA simultáneos, un sistema de blindaje continuo en vez de vidas discretas y dos tipos de disparo, jugable con teclado dentro de GamePlayer, con leaderboard real en Supabase.
---

## Alcance

### Dentro

- No hay carpeta que matchee "duelo-tanques"/"tanques" en `references/started-games/` — el
  juego se diseña desde cero siguiendo el contrato de props estándar de la plataforma.
- Fila nueva en `games` (Supabase): `id: 'duelo-tanques'`, `title: 'DUELO DE TANQUES'`,
  `cat: 'VERSUS'`, `color: 'cyan'`, `cover: 'cover-duelo-tanques'` (mismo diseño visual que las
  demás variantes de esta corrida; no es un eje de diferenciación), `short` compartido con las
  otras variantes, `long` propio de este enfoque.
- Clase CSS `.cover-duelo-tanques` en `app/globals.css` + `@source inline("cover-duelo-tanques");`.
- Componente dedicado `app/components/games/DueloTanquesGame.tsx` (`'use client'`):
  - Canvas 800×600, arena rectangular con obstáculos fijos (misma disposición base que la
    variante clásica; los obstáculos no cambian entre oleadas — el desafío escala por cantidad y
    velocidad de enemigos, no por el arena).
  - Tanque del jugador: mismo esquema de movimiento (avance/retroceso + rotación) que el resto
    del catálogo de tanques.
  - Controles: `↑`/`W` avanzar, `↓`/`S` retroceder, `←`/`A` rotar izquierda, `→`/`D` rotar
    derecha. **Dos armas** en vez de una: `Espacio` dispara un tiro ligero (cooldown ~300 ms,
    daño bajo, 1 rebote); `Shift` + `Espacio` (o tecla `F`) dispara un tiro pesado (cooldown
    ~1200 ms, daño alto, 1 rebote, empuja ligeramente al tanque impactado). Ambos comparten la
    física de rebote único en muros.
  - **Oleadas de tanques IA:** la partida empieza con 1 tanque IA simultáneo; cada oleada
    limpiada (todos los tanques IA de la oleada destruidos) incrementa en +1 el número de
    tanques IA simultáneos de la siguiente oleada, hasta un máximo de 4 en pantalla a la vez
    (excedente en cola, entra según se liberan huecos). Todos los tanques IA son del mismo tipo
    (mismo comportamiento de persecución que la variante clásica), pero cada oleada aumenta su
    velocidad de avance/rotación y reduce ligeramente su cooldown de disparo.
  - **Blindaje en vez de vidas discretas:** el jugador empieza con 100 puntos de blindaje. Cada
    impacto de un tanque IA sobre el jugador resta 15 puntos de blindaje fijos (no escala por
    oleada — la dificultad sube por cantidad/velocidad de enemigos, no por daño recibido). Al
    iniciar cada nueva oleada, el blindaje se regenera +10 puntos (tope 100). El campo `lives`
    del contrato reporta directamente el blindaje actual (un entero 0-100), documentado
    explícitamente como desviación del patrón de vidas discretas de otros juegos del catálogo.
  - `level`: representa la oleada actual, empieza en 1, sube +1 al limpiar cada oleada; no tiene
    techo (endless).
  - **Puntuación:** +10 puntos por cada tanque IA destruido, multiplicado por la oleada actual
    (`10 × oleadaActual`); bonus de +100 puntos ("oleada perfecta") si la oleada se limpia sin
    que el jugador pierda blindaje durante ella.
  - `onGameOver(finalScore)` se dispara cuando el blindaje del jugador (`lives`) llega a `0`.
- Integración en `app/components/screens/GamePlayer.tsx`: rama `id === "duelo-tanques"` monta
  `<DueloTanquesGame>` con `paused`/`restartSignal`/`skin`/`onStateChange`/`onGameOver`.
- Guardado de puntuación reutiliza `saveScore` de `app/lib/games.ts` (`game_id: 'duelo-tanques'`).

### Fuera de alcance

- Controles táctiles / móvil.
- Multijugador local o en red.
- Power-ups adicionales más allá de las dos armas ya descritas (sin recogibles en el suelo).
- Tipos de enemigo distintos (todos los tanques IA comparten el mismo comportamiento base,
  solo escalado en velocidad/cooldown por oleada — sin "élite" ni jefes).
- Tope de oleada o pantalla de victoria — el modo es endless por diseño.
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
  'Sobrevive a oleadas cada vez más numerosas de tanques IA. Combina tiros ligeros rápidos con tiros pesados de alto daño, gestiona tu blindaje y encadena oleadas perfectas para maximizar tu puntuación.',
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

- `score`: significativo, suma `10 × oleadaActual` por cada tanque IA destruido, +100 por oleada
  limpiada sin daño recibido.
- `lives`: significativo, pero representa **blindaje continuo (0-100)**, no un contador discreto
  de vidas — empieza en 100, baja -15 por impacto recibido, regenera +10 (tope 100) al iniciar
  cada oleada nueva. Esta reinterpretación del campo se documenta explícitamente como decisión de
  diseño de esta variante.
- `level`: significativo, representa la oleada actual; sube +1 al limpiar cada oleada, sin techo.
- `onGameOver` se dispara cuando `lives` (blindaje) llega a `0`.

Este spec no introduce estructuras de datos más allá de la fila de `games` y las props del
componente; el estado de oleada/blindaje vive en `useRef` interno del componente, sin persistirse
más allá del contrato `onStateChange`.

---

## Plan de implementación

1. **Catálogo — seed en `games`**: aplicar la fila de arriba vía Supabase MCP; verificar con
   `list_tables`/consulta.
2. **CSS — cover de catálogo**: añadir `.cover-duelo-tanques` a `app/globals.css` (mismo diseño
   base que las otras variantes de esta corrida) + `@source inline("cover-duelo-tanques");`.
3. **Componente del juego — `DueloTanquesGame.tsx`**: creado desde cero.
   - Constantes: layout fijo de obstáculos, velocidad base de jugador/IA, cooldown y daño de
     ambas armas (ligera/pesada), blindaje inicial (100), daño por impacto (15), regeneración
     por oleada (+10), incremento de velocidad/cooldown de IA por oleada, máximo de tanques IA
     simultáneos (4).
   - Estado interno en `useRef`: posición/ángulo del jugador, array de tanques IA activos (cada
     uno con posición, ángulo, cooldown propio), array de proyectiles (tipo ligero/pesado, dueño,
     rebotes restantes), `score`, `blindajeActual`, `oleadaActual`, contador de tanques IA
     destruidos en la oleada, flag de "sin daño en esta oleada" (para el bonus).
   - Loop `requestAnimationFrame`: mueve jugador e IA, actualiza proyectiles de ambos tipos
     (colisión con muros → rebote, colisión con tanque → daño), gestiona cooldowns de las dos
     armas del jugador y de cada IA, detecta oleada limpiada (spawnea la siguiente con +1 tanque
     IA hasta el máximo), regenera blindaje al iniciar oleada.
   - Listeners de teclado (`keydown`/`keyup`) distinguiendo `Espacio` (ligero) de `Shift`+
     `Espacio` (pesado), limpiados al desmontar.
   - `restartSignal`: reset in-place completo (posiciones, tanques IA, proyectiles, score,
     blindaje, oleada).
4. **GamePlayer — integración**: rama `id === "duelo-tanques"` monta `DueloTanquesGame` con
   `paused`/`restartSignal`/`skin`/`onStateChange`/`onGameOver`; desactiva el intervalo de score
   falso para ese id.
5. **Verificación manual**: `npm run dev`, Vault → tarjeta "DUELO DE TANQUES" → detalle → Jugar;
   comprobar que la oleada 1 spawnea 1 tanque IA, limpiarla sube a 2 tanques simultáneos, el tiro
   ligero y el pesado tienen cooldowns/daños distintos, el blindaje baja con cada impacto
   recibido y regenera al iniciar oleada, la puntuación escala con la oleada, `onGameOver` se
   dispara al llegar el blindaje a 0, puntuación se guarda y aparece en GameDetail/HallOfFame.

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] Catálogo muestra tarjeta "DUELO DE TANQUES" con `.cover-duelo-tanques`, categoría VERSUS,
      color cyan
- [ ] Fila `duelo-tanques` existe en `games` con los campos del seed
- [ ] "JUGAR AHORA" renderiza `DueloTanquesGame` en vez del placeholder decorativo
- [ ] La oleada 1 empieza con exactamente 1 tanque IA simultáneo en pantalla
- [ ] Limpiar una oleada (destruir todos sus tanques IA) incrementa en +1 el número de tanques IA
      simultáneos de la siguiente oleada, hasta un máximo de 4
- [ ] `Espacio` dispara el tiro ligero (cooldown corto, daño bajo); `Shift`+`Espacio` dispara el
      tiro pesado (cooldown largo, daño alto); ambos rebotan una vez en los muros
- [ ] Cada impacto de un tanque IA sobre el jugador resta exactamente 15 puntos de blindaje
- [ ] El blindaje regenera +10 (tope 100) al iniciar cada oleada nueva
- [ ] La puntuación por tanque destruido escala como `10 × oleadaActual`
- [ ] Limpiar una oleada sin recibir daño otorga el bonus de +100 puntos
- [ ] `level` refleja la oleada actual, sin techo de oleada ni pantalla de victoria
- [ ] `onGameOver` se dispara exactamente cuando el blindaje (`lives`) llega a 0
- [ ] Puntuación guardada aparece en GameDetail y HallOfFame (tab del juego + tab "TODOS")
- [ ] PAUSA detiene el loop (tanques, proyectiles y cooldowns congelados); REANUDAR continúa
      donde quedó
- [ ] JUGAR DE NUEVO reinicia sin desmontar el canvas (`restartSignal`)
- [ ] Otros juegos del catálogo no cambian de comportamiento

---

## Decisiones tomadas y descartadas

| Decisión                  | Elegida                                                          | Descartada                                   | Razón                                                                                                              |
| ------------------------- | ---------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Estructura del duelo      | Oleadas endless de tanques IA simultáneos (1 → hasta 4)          | 1 vs IA continuo (enfoque clásico)           | Diferencia deliberada de eje "mecánica central"; premia supervivencia bajo presión creciente en vez de duelo único |
| Sistema de daño           | Blindaje continuo 0-100, regenerable por oleada                  | Vidas discretas (3 impactos = game over)     | Distingue el eje "condición de game over" frente a la variante clásica; permite absorber varios impactos menores   |
| Sistema de puntuación     | Puntos por kill escalados por oleada + bonus de oleada perfecta  | Punto fijo por impacto (enfoque clásico)     | Recompensa supervivencia prolongada y juego limpio, distingue el eje de scoring                                    |
| Esquema de controles      | Dos armas (ligera/pesada) con cooldowns y daños distintos        | Un solo tipo de disparo (enfoque clásico)    | Introduce decisión táctica de arma según número de enemigos, distingue el eje de controles                         |
| Escalado de dificultad    | Más tanques IA simultáneos + velocidad/cooldown de IA por oleada | Más obstáculos en la arena (enfoque clásico) | La arena se mantiene igual para enfocar la dificultad en la cantidad/velocidad de amenazas, no en el escenario     |
| Condición de `onGameOver` | Blindaje (`lives`) llega a 0                                     | Vidas discretas llegan a 0                   | Consistente con el sistema de daño continuo elegido para esta variante                                             |
| Color de catálogo         | `cyan` (compartido con las demás variantes de esta corrida)      | Otro color                                   | Mismo criterio que las demás variantes — `id`/`cat`/`color` se comparten dentro de una misma corrida de game-jam   |

---

## Riesgos

- **Balance del escalado de oleadas**: 4 tanques IA simultáneos disparando puede saturar
  rápidamente al jugador; requiere ajuste manual de velocidad de IA y regeneración de blindaje en
  pruebas de juego.
- **Gestión de cola de tanques IA** cuando el máximo simultáneo (4) es menor que el número de
  tanques de la oleada actual: mitigar con una cola simple que spawnea el siguiente tanque tan
  pronto se libera un hueco (por destrucción de otro).
- **Distinción de tiro ligero/pesado en el mismo frame de teclado**: mitigar con listeners
  separados de `keydown` para `Espacio` y para la combinación con `Shift`, evitando disparos
  dobles accidentales.
- StrictMode doble-montaje del `useEffect` que arranca el RAF loop y los listeners de teclado
  (React 19 dev) — mitigar limpiando loop y listeners en cleanup.
- Canvas de tamaño fijo 800×600 dentro de layout responsive — mitigar con CSS.
- Reinterpretar `lives` como blindaje continuo puede confundir al HUD React genérico si asume
  vidas discretas pequeñas (ej. iconos de corazón); documentar en la implementación que el HUD
  debe mostrar el valor como barra/número, no como iconos fijos.
