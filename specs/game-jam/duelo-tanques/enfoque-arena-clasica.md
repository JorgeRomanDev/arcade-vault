---
spec: game-jam/duelo-tanques/enfoque-arena-clasica
title: Arcade Vault — DUELO DE TANQUES (arena clásica 1v1)
state: Borrador
date: 2026-07-11
depends_on: [05-juego-asteroides, 06-tabla-juegos-leaderboard]
objective: Crear el juego DUELO DE TANQUES como componente React (id "duelo-tanques") con un duelo continuo 1 vs IA en una arena fija de obstáculos, disparo con cooldown y rebote único de proyectiles en los muros, jugable con teclado dentro de GamePlayer, con leaderboard real en Supabase.
---

## Alcance

### Dentro

- No hay carpeta que matchee "duelo-tanques"/"tanques" en `references/started-games/` (solo
  existen `02-asteroids`, `03-tetris` y `04-arkanoid`, ya portados) — el juego se diseña desde
  cero siguiendo el contrato de props estándar de la plataforma.
- Fila nueva en `games` (Supabase): `id: 'duelo-tanques'`, `title: 'DUELO DE TANQUES'`,
  `cat: 'VERSUS'`, `color: 'cyan'`, `cover: 'cover-duelo-tanques'`, `short`/`long` propios.
- Clase CSS nueva `.cover-duelo-tanques` en `app/globals.css` (paleta cian oscura, silueta de
  torreta de tanque + trazo de proyectil rebotando) + `@source inline("cover-duelo-tanques");`.
- Componente dedicado `app/components/games/DueloTanquesGame.tsx` (`'use client'`):
  - Canvas 800×600, arena rectangular con 5-7 obstáculos fijos (bloques rectangulares) en
    disposición simétrica, que bloquean el movimiento de ambos tanques y rebotan proyectiles.
  - Tanque del jugador: posición `(x, y)`, ángulo de orientación, velocidad de avance/retroceso
    limitada (~120 px/s) y velocidad de rotación limitada (~180°/s). Empieza en una esquina fija.
  - Tanque de la IA: empieza en la esquina opuesta; persigue al jugador manteniendo línea de tiro
    (calcula ángulo hacia el jugador y rota/avanza hacia esa dirección), con un retraso de
    reacción simulado (~150-300 ms de lag antes de reaccionar a un cambio de posición del
    jugador) para que sea vencible, no perfecta. Respeta el mismo cooldown de disparo que el
    jugador.
  - Controles: `↑`/`W` avanzar, `↓`/`S` retroceder, `←`/`A` rotar izquierda, `→`/`D` rotar
    derecha, `Espacio` disparar (cooldown fijo ~500 ms entre disparos, tanto jugador como IA).
  - Proyectiles: velocidad fija, viajan en línea recta; al tocar un muro rebotan una vez
    (reflejan el ángulo de incidencia); al tocar un segundo muro o superar 3s de vuelo,
    desaparecen sin efecto. Un impacto directo sobre un tanque (jugador o IA) siempre lo cuenta,
    haya rebotado o no.
  - Impacto del jugador sobre la IA: +1 `score`; el tanque de la IA reaparece en una esquina
    predefinida tras ~1s de demora, con una breve invulnerabilidad (~1s) tras reaparecer.
  - Impacto de la IA sobre el jugador: -1 `lives`; el jugador reaparece en su esquina de salida
    tras ~1s, con la misma breve invulnerabilidad tras reaparecer.
  - `level`: empieza en 1, sube +1 cada 5 puntos anotados por el jugador; cada subida de nivel
    incrementa un porcentaje fijo (~10%) la velocidad de avance/rotación de la IA y añade un
    obstáculo adicional a la arena (hasta un máximo razonable, ej. 10 obstáculos).
  - `lives`: empieza en 3, baja con cada impacto de la IA sobre el jugador.
  - `onGameOver(finalScore)` se dispara cuando `lives` llega a `0`; `finalScore` es el `score`
    acumulado (impactos del jugador sobre la IA) hasta ese momento.
- Integración en `app/components/screens/GamePlayer.tsx`: rama `id === "duelo-tanques"` monta
  `<DueloTanquesGame>` con el mismo mecanismo de `paused`/`restartSignal`/`skin`/`onStateChange`/
  `onGameOver` que los juegos ya implementados (ver `FroggerGame`/`SnakeGame` como precedente
  actual de props, incluida `skin: SkinId`).
- Guardado de puntuación reutiliza `saveScore` de `app/lib/games.ts` (`game_id: 'duelo-tanques'`).

### Fuera de alcance

- Controles táctiles / móvil.
- Multijugador local o en red (solo 1 jugador humano vs IA, sin salas).
- Power-ups (blindaje extra, munición especial, velocidad temporal).
- Más de un tipo de proyectil o de arma.
- Dificultad de IA seleccionable por el jugador (un solo perfil de IA, escalado solo por nivel).
- Reaplicación de paletas por skin (`classic`/`neon`/`retro`) más allá de aceptar la prop
  `skin: SkinId` en la interfaz — el detalle visual por skin queda para el agente
  `skin-designer`, invocado explícitamente después de implementar este spec.
- Sonido/efectos de audio.
- Cambios a `Library.tsx`, `GameDetail.tsx`, `HallOfFame.tsx`, `AppShell.tsx`,
  `app/lib/games.ts`, `app/lib/supabase/client.ts`, `app/data/index.ts` — son data-driven, no
  necesitan tocarse.

---

## Modelo de datos

### Fila nueva en `games` (seed vía Supabase MCP)

```sql
insert into games (id, title, short, long, cat, cover, color) values (
  'duelo-tanques',
  'DUELO DE TANQUES',
  'Rota, avanza y dispara: gana el duelo a rebotes en la arena.',
  'Enfréntate a un tanque IA en una arena con obstáculos fijos. Rota tu torreta, dispara con cooldown y usa los rebotes en los muros a tu favor. Cada impacto suma un punto; pierde tus 3 vidas y se acaba el duelo.',
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

- `score`: significativo, sube +1 por cada impacto directo del jugador sobre el tanque de la IA.
- `lives`: significativo, empieza en 3, baja -1 por cada impacto de la IA sobre el jugador.
- `level`: significativo, sube +1 cada 5 puntos anotados; correlaciona con velocidad de la IA y
  densidad de obstáculos de la arena.
- `skin`: aceptada en la interfaz (contrato fijo actual de la plataforma); en este spec se usa
  únicamente para la paleta base ya definida por el skin activo, sin arte adicional por skin
  (ese trabajo es de `skin-designer`, fuera de alcance aquí).
- `onGameOver` se dispara cuando `lives` llega a `0`.

Este spec no introduce estructuras de datos más allá de la fila de `games` y las props del
componente.

---

## Plan de implementación

1. **Catálogo — seed en `games`**: aplicar la fila de arriba vía Supabase MCP
   (`apply_migration`/`execute_sql`); verificar con `list_tables`/consulta.
2. **CSS — cover de catálogo**: añadir `.cover-duelo-tanques` a `app/globals.css` (paleta cian
   oscura + silueta de torreta/trazo de proyectil), más `@source inline("cover-duelo-tanques");`.
3. **Componente del juego — `DueloTanquesGame.tsx`**: creado desde cero.
   - Constantes: layout fijo de obstáculos base, velocidad de avance/rotación del jugador y de
     la IA, cooldown de disparo (500ms), velocidad y vida útil de proyectiles (3s / 1 rebote),
     retraso de reacción de la IA, incremento por nivel (10% velocidad IA, +1 obstáculo cada 5
     puntos).
   - Estado interno en `useRef`: posición/ángulo del jugador y de la IA, lista de proyectiles
     activos (posición, ángulo, dueño, rebotes restantes, tiempo de vuelo), cooldowns de disparo
     de ambos tanques, `score`, `lives`, `level`, lista de obstáculos activos, temporizadores de
     invulnerabilidad tras respawn.
   - Loop `requestAnimationFrame`: mueve tanques según input/IA, actualiza proyectiles (colisión
     con muros → rebote o desaparición, colisión con tanque → impacto), gestiona cooldowns y
     respawns con demora.
   - Listeners de teclado (`keydown`/`keyup`) para movimiento continuo mientras se mantiene
     pulsada la tecla, limpiados al desmontar.
   - `restartSignal`: reset in-place completo (posiciones, proyectiles, score, lives, level,
     obstáculos a la disposición inicial).
4. **GamePlayer — integración**: rama `id === "duelo-tanques"` monta `DueloTanquesGame` con
   `paused`/`restartSignal`/`skin`/`onStateChange`/`onGameOver`; desactiva el intervalo de score
   falso para ese id; otros juegos sin cambios.
5. **Verificación manual**: `npm run dev`, Vault → tarjeta "DUELO DE TANQUES" → detalle → Jugar;
   el tanque del jugador rota y se mueve con las 4 teclas, dispara con cooldown perceptible, los
   proyectiles rebotan una vez en los muros, la IA persigue con un lag vencible, impactar a la IA
   suma puntos y la hace reaparecer, recibir un impacto resta una vida y reaparece al jugador,
   `level` sube cada 5 puntos y la arena/IA se sienten más difíciles, `onGameOver` a las 3 vidas
   perdidas, puntuación se guarda en `scores` y aparece en GameDetail y HallOfFame.

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] Catálogo muestra tarjeta "DUELO DE TANQUES" con `.cover-duelo-tanques`, categoría VERSUS,
      color cyan
- [ ] Fila `duelo-tanques` existe en `games` con los campos del seed
- [ ] "JUGAR AHORA" renderiza `DueloTanquesGame` en vez del placeholder decorativo
- [ ] `↑/W` y `↓/S` mueven el tanque del jugador adelante/atrás; `←/A` y `→/D` rotan la torreta
- [ ] `Espacio` dispara un proyectil respetando el cooldown de ~500 ms (no se puede disparar en
      ráfaga continua)
- [ ] Los proyectiles rebotan exactamente una vez al tocar un muro y desaparecen al segundo
      contacto o tras 3s de vuelo
- [ ] La IA persigue al jugador con un retraso de reacción perceptible pero vencible, y respeta
      el mismo cooldown de disparo
- [ ] Un impacto directo del jugador sobre la IA suma +1 a `score` y la IA reaparece en su
      esquina tras una breve demora
- [ ] Un impacto directo de la IA sobre el jugador resta -1 a `lives` y el jugador reaparece en
      su esquina tras una breve demora
- [ ] `level` sube +1 cada 5 puntos anotados; la velocidad de la IA y la densidad de obstáculos
      aumentan de forma perceptible
- [ ] `onGameOver` se dispara exactamente cuando `lives` llega a 0, abre el modal de guardar
      puntuación con `finalScore` igual al `score` acumulado
- [ ] Puntuación guardada aparece en GameDetail (leaderboard del juego) y en HallOfFame (tab del
      juego + tab "TODOS")
- [ ] PAUSA detiene el loop (tanques y proyectiles congelados); REANUDAR continúa donde quedó
- [ ] JUGAR DE NUEVO reinicia sin desmontar el canvas (`restartSignal`)
- [ ] Otros juegos del catálogo no cambian de comportamiento

---

## Decisiones tomadas y descartadas

| Decisión                  | Elegida                                                          | Descartada                                           | Razón                                                                                                        |
| ------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Estructura del duelo      | 1 vs IA continuo, sin rondas ni oleadas                          | Rondas discretas / oleadas de múltiples enemigos     | Es la lectura más directa de la mecánica recomendada por `game-planner`, sirve de línea base de comparación  |
| Sistema de vidas          | 3 vidas discretas, -1 por impacto de la IA                       | Barra de blindaje continua                           | Consistente con el patrón de vidas discretas ya usado por asteroides/arkanoid                                |
| Rebote de proyectiles     | 1 rebote antes de desaparecer                                    | 0 rebotes (disparo directo) / 2+ rebotes             | Fiel a la mecánica de rebote-en-muros pedida explícitamente por `game-planner`, sin sobrecomplicar la física |
| Condición de `onGameOver` | `lives === 0`                                                    | Límite de tiempo global / puntuación objetivo        | Consistente con el resto del catálogo (asteroides/arkanoid/snake usan vidas o colisión final)                |
| Progresión de nivel       | +1 nivel cada 5 puntos, sube velocidad de IA y densidad de arena | Nivel único fijo sin escalado                        | Da curva de dificultad progresiva, consistente con el patrón de "level" del resto del catálogo               |
| Color de catálogo         | `cyan` (heredado de la recomendación de `game-planner`)          | `magenta`/`yellow` (análogos mecánicos más cercanos) | Ya fijado y justificado por `game-planner`: es el color más alejado temáticamente del disparo directo/rebote |
| Controles                 | 4 teclas de movimiento/rotación + disparo con cooldown           | Control dual-stick por teclado / apuntado con mouse  | Manteniendo solo teclado (precedente del catálogo) y fiel al esquema de tanque clásico                       |

---

## Riesgos

- **Balance de reacción de la IA**: un retraso demasiado corto la hace invencible, uno demasiado
  largo la hace trivial; requiere ajuste manual en pruebas de juego.
- **Colisión de proyectil rebotado con el propio tanque que lo disparó**: mitigar con un breve
  período de gracia (ej. 100ms) tras el disparo antes de que el proyectil pueda impactar a su
  propio dueño.
- StrictMode doble-montaje del `useEffect` que arranca el RAF loop y los listeners de teclado
  (React 19 dev) — mitigar limpiando loop y listeners en cleanup.
- Canvas de tamaño fijo 800×600 dentro de layout responsive (`.crt-screen`) — mitigar con CSS,
  sin tocar la lógica interna de coordenadas.
- Frecuencia de `onStateChange` (ligada al RAF a 60/seg) impactando renders de React si no se
  compara el estado antes de propagar cambios.
