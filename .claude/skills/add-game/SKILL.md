---
name: add-game
description: Genera el spec de un juego nuevo con su leaderboard e integración en la plataforma Arcade Vault, siguiendo el patrón de las specs 05/06. No implementa código; deja el spec en specs/ listo para /spec-impl.
disable-model-invocation: true
argument-hint: "<id-del-juego o descripción corta> (opcional)"
---

# /add-game — Generador de spec de juego + leaderboard

Primo especializado de `/spec`: mismo flujo por fases y misma estructura de spec (ver
`.agents/skills/spec/template.md`), pero con preguntas y secciones pre-cableadas al patrón de
integración de juegos de este repo, establecido por las specs 05 (juego Asteroides) y 06
(tablas `games`/`scores` + leaderboard real).

**No escribe código.** Solo produce `specs/NN-slug.md`. La implementación queda para
`/spec-impl` una vez el usuario apruebe el spec.

## El patrón que codifica (specs 05 + 06, ya Implementado)

Meter un juego nuevo en la plataforma toca exactamente 4 puntos, y no toca nada más:

1. **Seed en `games`** — una fila `insert into games (id, title, short, long, cat, cover, color)`.
   Las tablas `games`/`scores` ya existen (spec 06); esta skill nunca crea tablas, solo describe
   el seed de la fila nueva.
2. **CSS `.cover-<id>`** — en `app/globals.css`, gradiente + detalle siguiendo el patrón de
   `.cover-asteroides`/`.cover-rocas`, más `@source inline("cover-<id>");` cerca del inicio del
   archivo (Tailwind 4 purga la clase dinámica si falta el safelist).
3. **Componente `app/components/games/<Name>Game.tsx`** (`"use client"`) con el contrato de
   props fijo:
   ```ts
   interface <Name>GameProps {
     paused: boolean;
     restartSignal: number;
     onStateChange: (state: { score: number; lives: number; level: number }) => void;
     onGameOver: (finalScore: number) => void;
   }
   ```
   Callbacks reflejados en refs, reset de estado interno en cada cambio de `restartSignal`,
   loop `requestAnimationFrame` que respeta `paused`, `onGameOver` disparado una sola vez.
4. **Rama en `app/components/screens/GamePlayer.tsx`** — `const is<Name> = id === "<id>"`,
   monta `<Name>Game` en vez del placeholder decorativo, y desactiva el intervalo de score falso
   para ese id.

**No se tocan** (son data-driven, ya leen de Supabase): `Library.tsx`, `GameDetail.tsx`,
`HallOfFame.tsx`, `AppShell.tsx`, `app/lib/games.ts`, `app/lib/supabase/client.ts`,
`app/data/index.ts` (salvo que el juego requiera un valor nuevo de `cat`/`color`). El juego y su
leaderboard aparecen solos en cuanto existe su fila en `games` y su componente está montado.

## Fase 1 — Contexto

1. Leer `CLAUDE.md`.
2. Listar `specs/` para ver la numeración y convenciones existentes.
3. Leer `specs/05-juego-asteroides.md` y `specs/06-tabla-juegos-leaderboard.md` completas —
   son la referencia normativa del patrón de integración. No las repitas al usuario, pero cada
   decisión de este spec nuevo debe ser consistente con ellas (mismo contrato de props, mismos
   touchpoints, mismas exclusiones de alcance salvo que el usuario pida explícitamente lo
   contrario).
4. **Detectar referencia:** si `$ARGUMENTS` nombra o sugiere un juego que matchea una carpeta en
   `references/started-games/` (ej. `03-tetris`, `04-arkanoid`), leer su `game.js` y `README.md`
   (y `CLAUDE.md`/`levels.js` si existen) para extraer: mecánicas, clases/estructuras internas,
   controles, qué tendría sentido excluir del port (siguiendo el precedente de asteroides:
   power-ups y táctil se dejaron fuera de alcance). Si no hay carpeta que matchee, el juego se
   diseña desde cero con el mismo contrato de props — dilo explícitamente al usuario, no lo
   trates como error.
5. Confirmar que las tablas `games`/`scores` existen (asume que sí, son de spec 06 y ya
   Implementado); si el usuario dice que no existen todavía, detente y señala que este spec
   depende de la 06.

## Fase 2 — Preguntas (bloques de 3–5)

Igual que `/spec`: preguntas concretas, no abiertas; si ofreces opciones, marca tu
recomendación y por qué; una por línea, numeradas.

**Bloque identidad:**

1. `id` del juego (kebab-case, único, será el mismo valor en la fila `games`, en la clase
   `.cover-<id>` y en el `id === "<id>"` de `GamePlayer`).
2. `title`, `short`, `long` (textos propios, no copiados de otro juego del catálogo).
3. `cat`: `ARCADE | PUZZLE | SHOOTER | VERSUS`.
4. `color`: `cyan | magenta | yellow | green` — recomienda uno que no repita el de un juego
   temáticamente cercano ya en el catálogo (ej. asteroides usa magenta para diferenciarse de
   "rocas").

**Bloque cover:**

5. Estilo visual de `.cover-<id>` (paleta/gradiente + detalle decorativo), distinto de los
   `.cover-*` ya existentes en `app/globals.css`.

**Bloque mecánicas/controles:**

6. Si hay referencia detectada: confirmar qué se porta tal cual y qué se excluye (power-ups,
   sonido, táctil, multijugador local, etc. — sigue el precedente de exclusiones de spec 05
   salvo que el usuario pida lo contrario).
7. Si no hay referencia: pedir descripción de las mecánicas centrales, controles de teclado, y
   condición de derrota/fin de partida.
8. Controles: solo teclado por defecto (precedente de spec 05); confirmar si el usuario quiere
   desviarse.

**Bloque contrato de estado:**

9. Qué campos de `onStateChange` son significativos para este juego — `score` siempre; `lives`
   tiene sentido si el juego tiene vidas (si no, fijar en un valor constante y decirlo
   explícitamente); `level` tiene sentido si el juego progresa por niveles (si no, igual).
10. Condición exacta que dispara `onGameOver(finalScore)` (perder la última vida, tablero lleno,
    tiempo agotado, etc.).

**Bloque pausa/reinicio (si no es obvio):** confirmar que "PAUSA" detiene el loop RAF y "JUGAR DE
NUEVO" dispara reset in-place vía `restartSignal` sin desmontar el canvas — es el comportamiento
estándar del HUD de `GamePlayer.tsx`; solo pregunta si el juego tiene alguna razón para desviarse.

**Cuándo parar de preguntar:** cuando puedas responder sin asumir: (1) qué archivos aparecerán o
cambiarán, (2) cuál es el primer paso ejecutable y cuál el último, (3) cómo se verifica que el
spec quedó completo — los mismos tres criterios de `/spec`.

## Fase 3 — Redactar el spec sección por sección

Usa la estructura de `.agents/skills/spec/template.md` (Cabecera, Alcance, Modelo de datos,
Plan de implementación, Criterios de aceptación, Decisiones, Riesgos) y el addendum
`game-template.md` de este mismo directorio para rellenar el contenido específico de juego en
cada sección. Muestra cada sección y espera confirmación antes de pasar a la siguiente — no
generes el spec completo de una vez.

Puntos que el spec **debe** fijar explícitamente (no son opcionales, son el contrato mínimo del
patrón):

- La fila exacta a insertar en `games` (con todos los campos).
- El bloque `.cover-<id>` + la línea `@source inline("cover-<id>");`.
- La interfaz `<Name>GameProps` completa.
- La condición exacta de `onGameOver`.
- La rama en `GamePlayer.tsx` (`id === "<id>"`) y qué reemplaza (placeholder decorativo +
  intervalo de score falso).
- La lista explícita de archivos que **no** se tocan (Library/GameDetail/HallOfFame/AppShell/
  lib/data), para dejar claro que el resto de la plataforma es automático.

Depende de `05-juego-asteroides` y `06-tabla-juegos-leaderboard` en la cabecera (`Depends on`).

## Fase 4 — Guardar

1. Número secuencial mirando `specs/` (siguiente tras el más alto existente).
2. Slug corto desde el título del juego.
3. Confirmar el nombre de archivo propuesto con el usuario antes de escribir.
4. Crear `specs/NN-slug.md` en estado `Borrador` (o `Draft`, según el idioma que use el repo —
   este repo usa español, usa `Borrador`).
5. Confirmar al usuario: ruta del archivo creado; recordatorio de que sigue en `Borrador` y debe
   pasar a `Aprobado` a mano tras releerlo; siguiente paso es `/spec-impl NN-slug`.
6. **Parar ahí.** No proponer implementar, no escribir código, no tocar `app/`, `references/` ni
   Supabase.

## Reglas duras

- Nunca escribir código durante esta skill. Solo el `.md` del spec al final.
- Nunca proponer implementar el spec tras guardarlo.
- Nunca asumir decisiones que el usuario no confirmó (id, contrato de props, exclusiones).
- Nunca generar el spec completo en una sola respuesta — sección por sección, con confirmación.
- Responder en el mismo idioma del prompt inicial del usuario.
- Si el juego pedido no encaja en un solo `id`/componente (ej. pide multijugador con salas,
  torneos, etc.), señalar que eso excede el patrón actual de un componente + una tabla de scores,
  y sugerir dividirlo en specs.
