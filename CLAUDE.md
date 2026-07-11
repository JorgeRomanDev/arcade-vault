# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: Next.js Version

This project uses **Next.js 16** which has breaking API and file-structure changes from prior versions. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices. Do not assume conventions from training data apply.

No test framework yet — one will be added (likely Vitest or Jest). When added, document the run command here.

## Stack

- **Next.js 16** — App Router (`app/` directory)
- **React 19**
- **TypeScript** — strict mode, path alias `@/*` maps to root
- **Tailwind CSS 4** — no `tailwind.config.*` file; all defaults via PostCSS
- **ESLint 9** — flat config (`eslint.config.mjs`), not legacy `.eslintrc`
- **Prettier 3** — config in `.prettierrc.json`
- **Supabase** — `@supabase/supabase-js` + `@supabase/ssr` (clients in `app/lib/supabase/`); MCP server configured in `.mcp.json`
- **Resend** — transactional email for the contact form (`app/api/contact/route.ts`)

Env vars live in `.env.local` (see `.env.local.example` / `.env.template`).

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — ESLint

## Architecture

Arcade Vault is a retro-arcade game platform. Single Next.js page (`app/page.tsx`) renders `AppShell`, which routes client-side between screens in `app/components/screens/`: `Home`, `Library`, `GameDetail`, `GamePlayer`, `HallOfFame`, `About`, `Auth`.

- **Data layer**: tables `games` and `scores` in Supabase (spec 06). Catalog, detail views and leaderboards are data-driven — they read from Supabase via `app/lib/games.ts`. No mock data remains.
- **Games**: canvas components in `app/components/games/` (`AsteroidsGame`, `TetrisGame`, `ArkanoidGame`, `SnakeGame`). Game assets (sprites) live next to the component under `assets/`.
- **API routes**: `app/api/contact/` (contact form via Resend), `app/api/supabase-check/`.

### Game integration pattern (specs 05 + 06 — normative)

Adding a game touches exactly 4 points, nothing else:

1. **Row in `games`** — seed insert (tables already exist; never create tables).
2. **CSS `.cover-<id>`** in `app/globals.css` + `@source inline("cover-<id>");` near the top (Tailwind 4 purges dynamic classes without this safelist).
3. **Component `app/components/games/<Name>Game.tsx`** (`"use client"`) with the fixed props contract:
   ```ts
   interface <Name>GameProps {
     paused: boolean;
     restartSignal: number;
     skin: SkinId;
     onStateChange: (state: { score: number; lives: number; level: number }) => void;
     onGameOver: (finalScore: number) => void;
   }
   ```
   Game state in `useRef` (not module globals — StrictMode/remounts), callbacks mirrored in refs, `requestAnimationFrame` loop that respects `paused`, in-place reset on `restartSignal` change, `onGameOver` fired once.
4. **Branch in `GamePlayer.tsx`** — `id === "<id>"` mounts the real game and disables the fake score interval.

`Library`, `GameDetail`, `HallOfFame`, `AppShell`, `app/lib/games.ts`, `app/data/index.ts` are data-driven — do not touch them for a new game.

Reference source code for ports lives in `references/started-games/`; raw art in `references/source-assets/`.

## Skills

- **Usa siempre `/frontend-design` para diseñar la interfaz de usuario** (`.claude/skills/frontend-design/`).
- `/spec` (`.agents/skills/spec/`) — guided spec designer. Asks questions in blocks, builds the spec section by section, saves to `specs/NN-slug.md` in `Borrador` state. Never writes code.
- `/spec-impl <NN-slug>` (`.agents/skills/spec-impl/`) — implements a spec **only if its state means "Aprobado"/"Approved"**. Creates branch `spec-NN-slug`, implements step by step with diff-review pauses. The human flips the state to Aprobado, never the agent.
- `/add-game` (`.claude/skills/add-game/`) — specialized `/spec` for new games: pre-wired to the 4-point integration pattern above. Produces the spec only; implementation goes through `/spec-impl`.

## Agents

- `game-planner` (`.claude/agents/game-planner.md`) — decides **which** new game fits the catalog (category/color/mechanic gaps, checks `references/started-games/` for available ports). Keeps memory of past suggestions in `references/game-suggestion-todo.md` so it never re-suggests. Writes no code or specs — output feeds `/add-game <id>`.
- `mobile-porter` (`.claude/agents/mobile-porter.md`) — for one newly-implemented game named by the human, adds its touch-control map (spec 10, `specs/10-controles-tactiles-movil.md`) and verifies responsive/touch behavior in-browser. Writes code directly; never touches game logic. Keeps memory in `references/mobile-ported-games.md`.
- `game-performance-booster` (`.claude/agents/game-performance-booster.md`) — for one game named by the human, profiles it with `?debug=fps` in-browser and applies the perf fixes normative from spec 12 (`specs/12-performance-juegos.md`): in-place array compaction, `AudioPool`, precomputed particle colors, bounded collision loops. Writes code directly; never changes game rules. Keeps memory in `references/perf-optimized-games.md`.

## Hooks

`PostToolUse` on Write/Edit runs `.claude/hooks/format-lint.mjs`: Prettier + `eslint --fix` on every file Claude writes. Don't hand-format; the hook does it.

## Spec Driven Design (enforced)

Workflow, in order:

1. `/spec` (or `/add-game` for games) → `specs/NN-slug.md` with YAML frontmatter (`spec`, `title`, `state`, `date`, `depends_on`, `objective`).
2. Human reviews and flips `state` to `Aprobado`.
3. `/spec-impl NN-slug` → branch `spec-NN-slug`, stepwise implementation, PR to `main`.
4. After merge, spec `state` becomes `Implementado`.

Spec states: `Borrador` → `Aprobado` → `Implementado` (also `En revisión`, `Obsoleto`). Specs are written in Spanish.

Implemented so far (specs 01–09): MVP shell, Home, About + contact, Supabase setup, Asteroids, games/scores tables + leaderboard, Tetris, Arkanoid, Snake.
