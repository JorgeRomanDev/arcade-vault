# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: Next.js Version

This project uses **Next.js 16** which has breaking API and file-structure changes from prior versions. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices. Do not assume conventions from training data apply.

## Commands

```bash
npm run dev    # Start dev server
npm run build  # Production build
npm run lint   # ESLint (flat config, eslint.config.mjs)
npm start      # Start production server
```

No test framework yet — one will be added (likely Vitest or Jest). When added, document the run command here.

## Stack

- **Next.js 16** — App Router (`app/` directory)
- **React 19**
- **TypeScript** — strict mode, path alias `@/*` maps to root
- **Tailwind CSS 4** — no `tailwind.config.*` file; all defaults via PostCSS
- **ESLint 9** — flat config (`eslint.config.mjs`), not legacy `.eslintrc`

## Spec Driven Design

This project plans to adopt a spec-first workflow:
1. Write a spec under `/spec/<feature>.md` before implementing
2. Implement under `/spec-impl/<feature>/`

Not yet enforced, but follow this pattern when asked to build new features.
