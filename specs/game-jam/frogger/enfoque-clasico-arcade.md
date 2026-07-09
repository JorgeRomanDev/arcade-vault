---
spec: game-jam/frogger/enfoque-clasico-arcade
title: Arcade Vault — FROGGER (enfoque clásico arcade)
state: Borrador
date: 2026-07-08
depends_on: [05-juego-asteroides, 06-tabla-juegos-leaderboard]
objective: Crear el juego FROGGER como componente React (id "frogger") fiel a la estructura original de niveles con temporizador por vida y 5 huecos de meta a rellenar, jugable con teclado dentro de GamePlayer, con leaderboard real en Supabase.
---

## Alcance

### Dentro

- No hay carpeta que matchee "frogger" en `references/started-games/` (se revisó `02-asteroids`,
  `03-tetris`, `04-arkanoid`) — el juego se diseña desde cero siguiendo el contrato de props
  estándar de la plataforma.
- Fila nueva en `games` (Supabase): `id: 'frogger'`, `title: 'FROGGER'`, `cat: 'ARCADE'`,
  `color: 'green'`, `cover: 'cover-frogger'`, `short`/`long` propios.
- Clase CSS nueva `.cover-frogger` en `app/globals.css` + `@source inline("cover-frogger");`.
- Componente dedicado `app/components/games/FroggerGame.tsx` (`'use client'`):
  - Canvas 800×600, grid de celdas de 40px → 20 columnas × 15 filas.
  - Tablero de carriles fijo, de abajo hacia arriba: 1 fila de salida (césped), 5 carriles de
    carretera con tráfico horizontal (velocidades y densidades distintas por carril, sentido
    alterno), 1 franja central de césped seguro ("mediana"), 5 carriles de río con troncos y
    tortugas flotantes (sentido alterno, velocidades distintas), 1 fila de meta con 5 huecos
    ("lily pads") a rellenar.
  - La rana avanza 1 celda por pulsación de tecla (movimiento discreto, no continuo).
  - Río: la rana debe pisar un tronco o tortuga en movimiento para no hundirse; se desplaza junto
    con el objeto flotante mientras esté sobre él; las tortugas ocasionalmente se sumergen
    (parpadeo) y no pueden pisarse mientras están sumergidas.
  - Carretera: colisión directa con cualquier vehículo = pérdida de vida inmediata.
  - Meta: 5 huecos en la fila superior; la rana debe llegar exactamente a un hueco libre para
    rellenarlo (llegar a un hueco ya ocupado o fuera de los 5 huecos válidos no cuenta y actúa
    como pared/game over de intento, igual que el Frogger original).
  - Rellenar los 5 huecos completa el nivel: sube `level`, se reinicia el tablero con velocidades
    de tráfico/río incrementadas, se otorga un bonus de puntos por nivel completado.
  - **Temporizador por vida:** cada intento (desde que la rana sale del césped inicial hasta que
    llega a un hueco o muere) tiene un límite de 30 segundos, visible como barra/número en el HUD
    del propio canvas. Si el tiempo llega a 0 antes de llegar a un hueco, se pierde una vida igual
    que una colisión.
  - Puntuación: +10 por cada celda avanzada hacia adelante (no se puntúa retroceder), +50 fijo por
    llegar a un hueco de meta, + (segundos restantes × 10) como bonus de tiempo al llegar a un
    hueco, +1000 al completar un nivel (los 5 huecos rellenos). Vida extra automática la primera
    vez que el marcador supera 500 puntos (una sola vez por partida, precedente del Frogger
    clásico).
  - Vidas: se empieza con 3; se pierde una por colisión con vehículo, por caer al agua (no estar
    sobre tronco/tortuga cuando el carril de río se desplaza bajo la rana), o por agotar el
    temporizador de 30s del intento. Al perder una vida sin llegar a 0, la rana vuelve a la fila
    de salida y el temporizador se reinicia a 30s; los huecos de meta ya rellenados en el nivel
    actual se conservan.
  - `onGameOver(finalScore)` se dispara cuando `lives` llega a `0`.
- Controles: solo teclado, flechas `↑/↓/←/→` (o `WASD` equivalente), cada pulsación mueve 1 celda
  en esa dirección (incluye retroceder hacia el césped inicial, sin puntuar).
- Integración en `app/components/screens/GamePlayer.tsx`: rama `id === "frogger"` monta
  `<FroggerGame>` con el mismo mecanismo de `paused`/`restartSignal`/`onStateChange`/`onGameOver`
  que los juegos ya implementados.
- Guardado de puntuación reutiliza `saveScore` de `app/lib/games.ts` (`game_id: 'frogger'`).

### Fuera de alcance

- Controles táctiles / móvil.
- Power-ups, comodines temporales (mosca extra, invencibilidad), modos alternativos.
- Enemigos adicionales del Frogger original (serpientes, cocodrilos disfrazados de tronco).
- Multijugador local (2 ranas simultáneas).
- Sonido/efectos de audio.
- Cambios a `Library.tsx`, `GameDetail.tsx`, `HallOfFame.tsx`, `AppShell.tsx`,
  `app/lib/games.ts`, `app/lib/supabase/client.ts`, `app/data/index.ts` — son data-driven, no
  necesitan tocarse.

---

## Modelo de datos

### Fila nueva en `games` (seed vía Supabase MCP)

```sql
insert into games (id, title, short, long, cat, cover, color) values (
  'frogger',
  'FROGGER',
  'Cruza la carretera y el río sin convertirte en papilla.',
  'Guía a la rana a través de cinco carriles de tráfico y cinco de río contrarreloj. Rellena los cinco huecos de meta antes de que se acabe el tiempo o las vidas para completar cada nivel.',
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

- `score`: significativo, sube por avance de celda, llegada a hueco, bonus de tiempo restante y
  bonus de nivel completado.
- `lives`: significativo, empieza en 3, baja por colisión/ahogamiento/tiempo agotado del intento;
  sube en +1 (una sola vez) al superar 500 puntos.
- `level`: significativo, sube al rellenar los 5 huecos de meta; correlaciona con velocidad de
  tráfico/río.
- `onGameOver` se dispara cuando `lives` llega a `0`.

---

## Plan de implementación

1. **Catálogo — seed en `games`**: aplicar la fila de arriba vía Supabase MCP
   (`apply_migration`/`execute_sql`); verificar con `list_tables`/consulta.
2. **CSS — cover de catálogo**: añadir `.cover-frogger` a `app/globals.css` (paleta verde césped +
   franjas de asfalto/agua estilizadas), más `@source inline("cover-frogger");`.
3. **Componente del juego — `FroggerGame.tsx`**: creado desde cero.
   - Constantes: layout de carriles (tipo, sentido, velocidad base por carril), tamaño de grid
     (20×15 celdas de 40px), duración del temporizador por intento (30s), tabla de puntuación.
   - Estado interno en `useRef`: posición de la rana, huecos de meta rellenados (array de 5
     booleanos), posiciones de vehículos/troncos/tortugas por carril, tiempo restante del intento
     actual, `score`, `lives`, `level`, flag de vida extra ya otorgada.
   - Loop `requestAnimationFrame`: avanza vehículos/troncos según su velocidad, descuenta el
     temporizador del intento, detecta colisión con vehículo, detecta si la rana está sobre agua
     sin tronco/tortuga, detecta llegada a hueco de meta, detecta expiración del temporizador.
   - Listeners de teclado (`keydown`) para movimiento discreto, limpiados al desmontar.
   - `restartSignal`: reset in-place completo (posición, huecos, nivel, vidas, score, timer).
4. **GamePlayer — integración**: rama `id === "frogger"` monta `FroggerGame`; desactiva el
   intervalo de score falso para ese id; otros juegos sin cambios.
5. **Verificación manual**: `npm run dev`, Vault → tarjeta "FROGGER" → detalle → Jugar; rana
   responde a flechas, tráfico y río se mueven, temporizador por intento visible y funcional,
   perder vida reinicia posición sin perder huecos rellenados, completar 5 huecos sube nivel,
   `onGameOver` a las 3 vidas perdidas, puntuación se guarda en `scores` y aparece en GameDetail y
   HallOfFame.

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] Catálogo muestra tarjeta "FROGGER" con `.cover-frogger`, categoría ARCADE, color green
- [ ] Fila `frogger` existe en `games` con los campos del seed
- [ ] "JUGAR AHORA" renderiza `FroggerGame` en vez del placeholder decorativo
- [ ] Flechas mueven la rana 1 celda por pulsación en las 4 direcciones
- [ ] Rana se hunde si el carril de río avanza bajo ella sin estar sobre tronco/tortuga
- [ ] Colisión con vehículo resta 1 vida y reinicia posición al carril de salida
- [ ] Temporizador de 30s por intento visible; agotarlo resta 1 vida igual que una colisión
- [ ] Llegar a un hueco de meta libre lo marca como relleno y otorga +50 más bonus de tiempo
- [ ] Rellenar los 5 huecos sube `level`, otorga +1000 y reinicia el tablero más rápido
- [ ] Vida extra automática la primera vez que el score supera 500, solo una vez por partida
- [ ] `onGameOver` se dispara exactamente cuando `lives` llega a 0, abre el modal de guardar
      puntuación
- [ ] Puntuación guardada aparece en GameDetail (leaderboard del juego) y en HallOfFame (tab del
      juego + tab "TODOS")
- [ ] PAUSA detiene el loop (tráfico, río y temporizador congelados); REANUDAR continúa donde
      quedó
- [ ] JUGAR DE NUEVO reinicia sin desmontar el canvas (`restartSignal`)
- [ ] Otros juegos del catálogo no cambian de comportamiento

---

## Decisiones tomadas y descartadas

| Decisión                  | Elegida                                                         | Descartada                          | Razón                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estructura de niveles     | 5 huecos de meta a rellenar por nivel, velocidad sube por nivel | Nivel único sin fin                 | Fidelidad al Frogger original; da sensación clara de progresión y objetivo por nivel                                                              |
| Temporizador              | Por vida/intento (30s), se reinicia al perder una vida          | Temporizador global de partida      | Precedente clásico de arcade (cada moneda/vida tiene su propio reloj); más justo para el jugador                                                  |
| Condición de `onGameOver` | `lives === 0`                                                   | Tiempo global agotado               | Consistente con el resto del catálogo (asteroides/arkanoid/snake usan vidas o colisión final, no timer global)                                    |
| Color de catálogo         | `green` (sustituto de "lime", no válido en el catálogo)         | `cyan`/`magenta`/`yellow`           | El humano fijó "lime"; no es un color válido del catálogo (`cyan\|magenta\|yellow\|green`); `green` es el más cercano temáticamente (césped/rana) |
| Categoría                 | `ARCADE`                                                        | "MAZE" (pedido original, no válido) | El humano confirmó ARCADE como sustituto tras aclarar que MAZE no existe en el catálogo                                                           |
| Movimiento                | Grid discreto (1 celda por pulsación)                           | Movimiento continuo por píxel       | Fiel al Frogger clásico; más simple de razonar contra el borde de troncos/carriles                                                                |
| Río                       | La rana se mueve con el tronco/tortuga mientras está sobre él   | Río estático, solo evitar caer      | Es la mecánica central distintiva de Frogger frente a un simple "cruce de carriles"                                                               |

---

## Riesgos

- StrictMode doble-montaje del `useEffect` que arranca el RAF loop y los listeners de teclado
  (React 19 dev) — mitigar limpiando loop y listeners en cleanup.
- Sincronizar la posición de la rana con el desplazamiento del tronco/tortuga sin desfases de
  redondeo en el grid (la rana debe permanecer alineada a celda entera al bajar del tronco).
- Canvas de tamaño fijo 800×600 dentro de layout responsive (`.crt-screen`) — mitigar con CSS,
  sin tocar la lógica interna de coordenadas del grid.
- Frecuencia de `onStateChange` (ligada al RAF a 60/seg) impactando renders de React si no se
  compara el estado antes de propagar cambios.
- Detección de colisión de vehículos/troncos en carriles con sentidos alternos y velocidades
  distintas: mantener el spawn/wrap de cada objeto por carril desacoplado y probado con vidas
  límite (carril más rápido, carril con huecos más estrechos).
