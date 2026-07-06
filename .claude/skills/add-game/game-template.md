# Addendum de forma para specs de juego (`/add-game`)

Este archivo complementa `.agents/skills/spec/template.md`. No repite su estructura general
(cabecera, alcance, etc.) — solo muestra **cómo rellenar** cada sección cuando el spec es
"añadir un juego con leaderboard", según el patrón fijado por `05-juego-asteroides.md` y
`06-tabla-juegos-leaderboard.md`. Es la forma a respetar, no texto para copiar literal.

---

## Cabecera

```markdown
# SPEC NN — Juego <Título>

> **Estado:** Borrador · **Depende de:** SPEC 05, SPEC 06 · **Fecha:** YYYY-MM-DD
> **Objetivo:** Portar/crear el juego <Título> como nueva entrada del catálogo con id
> "<id>", jugable con teclado dentro de GamePlayer, con leaderboard real en Supabase.
```

---

## Alcance

```markdown
## Alcance

**Dentro:**

- Fila `<id>` en la tabla `games` existente.
- Clase `.cover-<id>` en `app/globals.css` (+ `@source inline("cover-<id>");`).
- Componente `app/components/games/<Nombre>Game.tsx` con el contrato de props estándar.
- Rama `id === "<id>"` en `GamePlayer.tsx`.
- Guardado de puntuación vía `saveScore` (tabla `scores`), sin cambios de esquema.

**Fuera de alcance (para specs futuras):**

- <lo que se excluyó del port: power-ups, sonido, táctil, multijugador, etc.>
- Cambios a `Library.tsx`, `GameDetail.tsx`, `HallOfFame.tsx`, `AppShell.tsx`,
  `app/lib/games.ts`, `app/lib/supabase/client.ts` — son data-driven, no necesitan tocarse.
```

---

## Modelo de datos

Dos bloques obligatorios: la fila de `games` y las props del componente.

```markdown
## Modelo de datos

### Fila nueva en `games` (seed vía Supabase MCP)

\`\`\`sql
insert into games (id, title, short, long, cat, cover, color) values (
'<id>',
'<TÍTULO>',
'<short — una frase>',
'<long — 2-3 frases>',
'<ARCADE|PUZZLE|SHOOTER|VERSUS>',
'cover-<id>',
'<cyan|magenta|yellow|green>'
);
\`\`\`

### Props de `<Nombre>Game`

\`\`\`ts
interface <Nombre>GameProps {
paused: boolean;
restartSignal: number;
onStateChange: (state: { score: number; lives: number; level: number }) => void;
onGameOver: (finalScore: number) => void;
}
\`\`\`

- `onGameOver` se dispara cuando: <condición exacta — perder última vida / tablero lleno / ...>
- Campos de `onStateChange` sin sentido en este juego (si los hay) quedan fijos en <valor>,
  explícito, no omitidos.
```

Si el juego no introduce datos nuevos más allá de la fila de `games` y las props estándar,
dilo explícitamente y no inventes estructuras adicionales.

---

## Plan de implementación

Orden estable que siguió el patrón 05/06 — cada paso deja el sistema funcional:

```markdown
## Plan de implementación

1. **Catálogo — seed en `games`**: aplicar migración/insert con la fila de arriba
   (Supabase MCP `apply_migration` o `execute_sql`); verificar con `list_tables`/consulta.
2. **CSS — cover de catálogo**: añadir `.cover-<id>` a `app/globals.css` siguiendo el patrón de
   los `.cover-*` existentes, más `@source inline("cover-<id>");`.
3. **Componente del juego — `<Nombre>Game.tsx`**: <de dónde se porta o si se crea desde cero>;
   qué clases/funciones internas trae; qué se excluye del port.
4. **GamePlayer — integración**: rama `id === "<id>"` que monta `<Nombre>Game`; desactivar el
   intervalo de score falso para ese id; conservar comportamiento de los demás juegos sin tocar.
5. **Verificación manual**: `npm run dev`, Vault → tarjeta "<TÍTULO>" → detalle → Jugar; nave/
   pieza/lo que corresponda responde a controles; HUD del canvas y HUD React coinciden; PAUSA/
   FIN/JUGAR DE NUEVO funcionan; puntuación se guarda en `scores` y aparece en GameDetail y
   HallOfFame (tab del juego + tab TODOS).
```

---

## Criterios de aceptación

Checklist booleano, siguiendo el mismo nivel de detalle que spec 05:

```markdown
## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] Catálogo muestra tarjeta "<TÍTULO>" con `.cover-<id>`, categoría <cat>, color <color>
- [ ] Fila `<id>` existe en `games` con los campos del seed
- [ ] "JUGAR AHORA" renderiza `<Nombre>Game` en vez del placeholder decorativo
- [ ] Controles responden como se especificó (listar cada uno)
- [ ] Condición de game over dispara `onGameOver` y abre el modal de guardar puntuación
- [ ] Puntuación guardada aparece en GameDetail (leaderboard del juego) y en HallOfFame
      (tab del juego + tab "TODOS")
- [ ] PAUSA detiene el loop; REANUDAR continúa donde quedó
- [ ] JUGAR DE NUEVO reinicia sin desmontar el canvas (`restartSignal`)
- [ ] Otros juegos del catálogo no cambian de comportamiento
```

---

## Decisiones tomadas y descartadas

Tabla igual que spec 05/06 — columnas Decisión / Elegida / Descartada / Razón. Incluir siempre,
como mínimo, las decisiones de: entrada de catálogo (id nuevo vs reusar uno existente), alcance
de mecánicas portadas, controles (teclado vs táctil), y cómo se dispara `onGameOver`.

---

## Riesgos

Solo si aplican. Riesgos recurrentes del patrón, mencionar si son relevantes a este juego:

- StrictMode doble-montaje del `useEffect` que arranca el RAF loop (React 19 dev).
- Listeners de teclado duplicados si no se limpian en cleanup.
- Canvas de tamaño fijo dentro de layout responsive (`.crt-screen`).
- Frecuencia de `onStateChange` (60/seg) impactando renders de React si no se compara antes de
  propagar.
