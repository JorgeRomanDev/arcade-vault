---
spec: 06
title: Arcade Vault — Tabla de juegos y leaderboard real
state: Implementado
date: 2026-07-01
depends_on: [01-arcade-vault-mvp, 04-instalacion-supabase, 05-juego-asteroides]
objective: Crear tablas `games` y `scores` en Postgres (Supabase), sembradas con el único juego jugable (asteroides), y reemplazar los leaderboards simulados (`seededScores`) de GameDetail y HallOfFame por datos reales guardados por nombre libre, con vista global agregada y vista por juego.
---

## Alcance

### Dentro

- Migración SQL (aplicada con Supabase MCP `apply_migration`) que crea:
  - Tabla `games` (catálogo real, reemplaza el array `GAMES` de `app/data/index.ts`)
  - Tabla `scores` (reemplaza `localStorage` `av_scores` y los datos simulados `seededScores`)
  - Seed: una sola fila en `games` para `asteroides` (único juego con lógica real jugable)
- Sin RLS en este spec (tablas quedan con acceso por rol `anon`/`service` según defaults del proyecto; se documenta como riesgo)
- `app/data/index.ts`: se elimina el array `GAMES` hardcodeado, `seededScores` y `PLAYERS` (ya no hace falta generar datos falsos); se conservan/ajustan los tipos (`Game`, `ScoreRow`) para reflejar las filas reales de Supabase
- `Library.tsx`, `GameDetail.tsx`, `HallOfFame.tsx`: siguen `'use client'` (no se toca el router client-side de `AppShell`), pasan de leer arrays estáticos/`seededScores` a hacer fetch real con `app/lib/supabase/client.ts`
- `GamePlayer.tsx` / `AppShell.tsx`: `handleSaveScore` deja de escribir en `localStorage` y pasa a hacer `insert` real en la tabla `scores` de Supabase
- `best`/`plays` de cada juego se calculan en vivo desde `scores` (MAX y COUNT), no se guardan como columnas fijas actualizadas a mano
- HallOfFame: vista por juego (tabs existentes, ahora con datos reales) + nueva vista/tab "TODOS" con ranking agregado entre todos los juegos
- GameDetail: leaderboard del juego (top scores de ese `game_id` únicamente)
- Solo el juego `asteroides` aparece en el catálogo (Library/HallOfFame/GameDetail); los 8 placeholders sin lógica real (bloque-buster, caida, serpentina, gloton, invasores, rocas, ranaria, duelo-pixel) se quitan de la vista hasta tener su propio spec de implementación

### Fuera de alcance

- Supabase Auth real (login/signup/signout) — `Auth.tsx` sigue siendo fake, sin cambios
- RLS (Row Level Security) en `games`/`scores` — se deja para un spec futuro de seguridad/auth
- `user_id` / relación con `auth.users` en `scores` — el campo sigue siendo `name` de texto libre, tecleado en el modal de guardar puntuación (igual que hoy)
- Migrar a rutas reales de Next.js / Server Components — se mantiene el router client-side de `AppShell` y el fetch se hace desde el cliente browser de Supabase
- Reintroducir los 8 juegos placeholder al catálogo — queda para specs futuros cuando tengan su componente de juego real
- Middleware de refresco de sesión (`middleware.ts`) — sigue sin aplicar, ya que no hay auth real en este spec
- Migrar `CATS` (categorías) a Postgres — puede seguir como constante en código, ya que solo hay un juego real (`SHOOTER`)

---

## Modelo de datos

### Tabla `games` (Postgres)

```sql
create table games (
  id text primary key,              -- ej. 'asteroides', mismo id usado hoy en el código
  title text not null,
  short text not null,
  long text not null,
  cat text not null,                -- 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS'
  cover text not null,              -- clase CSS, ej. 'cover-asteroides'
  color text not null,              -- 'cyan' | 'magenta' | 'yellow' | 'green'
  created_at timestamptz not null default now()
);
```

Seed inicial (única fila):

```sql
insert into games (id, title, short, long, cat, cover, color) values (
  'asteroides',
  'ASTEROIDES',
  'Pulveriza rocas espaciales en gravedad cero.',
  'Pilota una nave triangular a la deriva en el vacío. Rota, propulsa y dispara para hacer estallar asteroides en fragmentos cada vez más pequeños. El espacio es toroidal: no hay bordes, solo el infinito envolviéndose sobre sí mismo.',
  'SHOOTER',
  'cover-asteroides',
  'magenta'
);
```

### Tabla `scores` (Postgres)

```sql
create table scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  name text not null,               -- iniciales/nombre tecleado en el modal, texto libre
  score integer not null,
  created_at timestamptz not null default now()
);

create index scores_game_id_score_idx on scores (game_id, score desc);
```

- `best` de un juego = `select max(score) from scores where game_id = ?` (si no hay filas, se muestra `'—'` o `0` en la UI, ya que arrancamos sin partidas guardadas)
- `plays` de un juego = `select count(*) from scores where game_id = ?`
- Ranking "TODOS" en HallOfFame = `select * from scores order by score desc limit N` (agregado entre juegos, sin normalizar por juego)

### Tipos TypeScript (`app/data/index.ts`)

```ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // formateado desde created_at para mostrar (dd/mm/aaaa)
}
```

- Se elimina `best`/`plays` de la interfaz `Game` (ya no son datos estáticos del catálogo, se calculan aparte por consulta)
- Se elimina `seededScores`, `PLAYERS` y el array `GAMES` — ya no hace falta generar datos falsos
- `User` (`{ name: string }`) no cambia — sigue siendo el usuario fake de `Auth.tsx`, sin relación con `scores`

---

## Plan de implementación

1. **Migración Supabase — tablas y seed**
   - Crear migración vía Supabase MCP (`apply_migration`) con nombre descriptivo, ej. `create_games_and_scores_tables`
   - SQL: `create table games (...)`, `create table scores (...)`, índice `scores_game_id_score_idx`
   - Insert del seed de `asteroides` (ver Modelo de datos)
   - Verificar con `list_tables` que ambas tablas existen con las columnas esperadas

2. **Tipos y limpieza de `app/data/index.ts`**
   - Actualizar `Game`/`ScoreRow` según el nuevo modelo (quitar `best`/`plays` de `Game`)
   - Eliminar `GAMES`, `seededScores`, `PLAYERS`
   - Mantener `User` sin cambios

3. **Helpers de datos (nuevo módulo, ej. `app/lib/games.ts`)**
   - `getGames(): Promise<Game[]>` — `supabase.from('games').select('*')`
   - `getGame(id: string): Promise<Game | null>`
   - `getTopScores(gameId: string, limit = 10): Promise<ScoreRow[]>` — ordenado por `score desc`
   - `getAllTopScores(limit = 12): Promise<(ScoreRow & { gameId: string })[]>` — agregado para tab "TODOS"
   - `getGameStats(gameId: string): Promise<{ best: number; plays: number }>` — `MAX(score)`/`COUNT(*)`
   - `saveScore(entry: { gameId: string; name: string; score: number }): Promise<void>` — insert en `scores`
   - Todos usan `app/lib/supabase/client.ts` (Client Components, sin tocar el router)

4. **`Library.tsx`**
   - Reemplazar `GAMES` estático por `useEffect` + `getGames()` con estado de carga
   - Para cada `GameCard`, obtener `best`/`plays` con `getGameStats(game.id)` (o resolver todos en batch antes de renderizar la grilla)
   - Mantener búsqueda/filtro por categoría como hoy (client-side sobre los datos ya cargados)

5. **`GameDetail.tsx`**
   - Reemplazar `GAMES.find` + `seededScores` por `getGame(id)` + `getTopScores(id, 10)` + `getGameStats(id)`
   - Mostrar estado de carga mientras llegan los datos; si `game` es `null` tras cargar, comportamiento igual que hoy (return null)

6. **`HallOfFame.tsx`**
   - Reemplazar `GAMES` (para tabs) por `getGames()`
   - Nuevo tab "TODOS" además de los tabs por juego existentes
   - Tab por juego: `getTopScores(gameId, 12)` (reemplaza `seededScores`)
   - Tab "TODOS": `getAllTopScores(12)`, mostrando también a qué juego pertenece cada fila
   - Se elimina el bloque "TU MEJOR MARCA" simulado (`youRank`/`youScore` inventados) ya que no hay relación real usuario↔score sin auth; queda fuera de alcance

7. **`GamePlayer.tsx` / `AppShell.tsx`**
   - `handleSaveScore` en `AppShell.tsx` pasa de escribir `localStorage` a llamar `saveScore({ gameId: entry.game, name: entry.name, score: entry.score })`
   - Se elimina el uso de `av_scores` en `localStorage`
   - Manejar error de inserción (ej. mostrar mensaje simple en el modal si falla, sin fallback a localStorage)

8. **Verificación manual**
   - `npm run dev`, confirmar que `list_tables`/consultas reflejan el seed de `asteroides`
   - Library muestra solo la tarjeta "ASTEROIDES" con `best`/`plays` reales (0 partidas al inicio)
   - Jugar una partida de Asteroides, guardar puntuación con nombre → aparece en `GameDetail` (leaderboard del juego) y en `HallOfFame` (tab "ASTEROIDES" y tab "TODOS")
   - Jugar varias partidas con distintos scores → orden descendente correcto, `best`/`plays` se actualizan

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] Tablas `games` y `scores` existen en Supabase con las columnas definidas en el Modelo de datos
- [ ] `games` contiene exactamente una fila: `asteroides`
- [ ] Library muestra solo la tarjeta "ASTEROIDES" (los 8 placeholders ya no aparecen)
- [ ] Library muestra `best`/`plays` calculados en vivo desde `scores` (0/'—' antes de la primera partida guardada)
- [ ] Búsqueda y filtro por categoría en Library siguen funcionando sobre los datos reales
- [ ] GameDetail de "asteroides" muestra el leaderboard real (top scores de `scores` para ese `game_id`), sin datos de `seededScores`
- [ ] Al guardar una puntuación desde `GamePlayer` (modal de fin de partida), se inserta una fila real en `scores` (verificable con consulta directa a Supabase)
- [ ] La puntuación guardada aparece inmediatamente al volver a entrar a GameDetail/HallOfFame (sin recarga de servidor, solo refetch)
- [ ] HallOfFame tiene tabs por juego (solo "ASTEROIDES" por ahora) + tab "TODOS" con ranking agregado
- [ ] Tab "TODOS" ordena correctamente por score descendente entre juegos (aunque hoy solo haya un juego)
- [ ] `localStorage` (`av_scores`) ya no se usa en ningún punto del código
- [ ] `GAMES`, `seededScores`, `PLAYERS` ya no existen en `app/data/index.ts`
- [ ] `Auth.tsx` sigue funcionando igual que antes (fake, sin cambios de comportamiento)
- [ ] Si falla la conexión a Supabase al guardar un score, la app no crashea (error visible o silencioso controlado, sin fallback a localStorage)

---

## Decisiones tomadas y descartadas

| Decisión                              | Elegida                                                                                | Descartada                                                 | Razón                                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth                                  | Fuera de alcance, `Auth.tsx` sigue fake                                                | Conectar Supabase Auth real con `user_id` en `scores`      | Usuario acotó explícitamente el spec tras ver que auth+tablas+leaderboard era demasiado junto                                                                |
| RLS                                   | Fuera de alcance, tablas sin políticas                                                 | Definir RLS público lectura/escritura                      | Usuario acotó explícitamente; se documenta como riesgo aceptado                                                                                              |
| Identidad del score                   | `name` texto libre (como hoy en el modal)                                              | `user_id` real ligado a `auth.users`                       | Consecuencia directa de dejar auth fuera de alcance                                                                                                          |
| Catálogo de juegos                    | Solo `asteroides` en `games`, resto de placeholders se ocultan                         | Insertar los 9 juegos con datos hardcodeados igual que hoy | Usuario confirmó: refleja lo que realmente es jugable con datos reales; evita mostrar `best`/`plays` reales de juegos sin lógica                             |
| `best`/`plays`                        | Calculados en vivo (`MAX`/`COUNT` sobre `scores`)                                      | Columnas fijas en `games` actualizadas a mano              | Usuario confirmó: consistente con tener datos reales en vez de simulados                                                                                     |
| Routing/fetch                         | Se mantiene el router client-side de `AppShell`; fetch con cliente browser de Supabase | Migrar a rutas reales de Next.js con Server Components     | `AppShell` no usa rutas de archivo por pantalla (una sola `page.tsx`), migrar a Server Components requeriría refactor de navegación fuera del alcance pedido |
| Vista "TODOS" en HallOfFame           | Nuevo tab agregado entre todos los juegos                                              | Mantener solo tabs por juego como hoy                      | Usuario pidió explícitamente vista global + vista por juego                                                                                                  |
| Bloque "TU MEJOR MARCA" en HallOfFame | Eliminado (era simulado con `youRank`/`youScore` inventados)                           | Mantenerlo con datos inventados                            | Sin auth real no hay forma de saber qué score pertenece al usuario logueado; mantenerlo sería seguir simulando datos, contrario al objetivo del spec         |
| Persistencia                          | Solo Supabase, sin fallback a localStorage                                             | Mantener `av_scores` como respaldo si falla el insert      | Usuario confirmó: simplifica, evita datos duplicados/desincronizados entre dos fuentes                                                                       |

---

## Riesgos

- **Sin RLS**: `games`/`scores` quedan abiertas a lectura y escritura por la anon key (comportamiento por defecto de Supabase sin políticas). Cualquiera con la anon key pública puede insertar scores falsos o basura directamente contra la API, sin pasar por la UI. Riesgo aceptado por decisión explícita del usuario; a mitigar en un spec futuro de seguridad/RLS.
- **Sin auth real**: el campo `name` en `scores` es texto libre sin verificación — un jugador puede hacerse pasar por otro. Mismo riesgo que existía hoy con `localStorage`, no es una regresión, pero tampoco se corrige en este spec.
- **Pérdida de datos por fallo de red**: al eliminar el fallback a `localStorage`, si la inserción a Supabase falla (ej. sin conexión), la puntuación de esa partida se pierde sin posibilidad de reintento automático. Mitigar mostrando un mensaje de error claro en el modal para que el jugador sepa que no se guardó.
- **Ocultar los 8 juegos placeholder**: reduce visiblemente el catálogo del sitio (de 9 tarjetas a 1) hasta que se implementen specs de esos juegos. Puede impactar la percepción de "vault lleno" mientras tanto; aceptado porque reflejar solo lo jugable es más honesto que mostrar `best`/`plays` inventados.
- **Fetch client-side en cascada**: `Library`/`GameDetail`/`HallOfFame` disparan varias consultas por render (games + stats por juego + scores), lo que puede mostrar estados de carga notorios comparado con los datos síncronos de hoy (`GAMES`/`seededScores` eran instantáneos). Mitigar con estados de carga simples (spinner/skeleton) sin necesidad de optimizar en este spec.
