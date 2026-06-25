---
spec: 01
title: Arcade Vault MVP — Pantallas visuales
state: Aprobado
date: 2026-06-24
depends_on: []
objective: Implementar las cinco pantallas visuales de Arcade Vault (Biblioteca, Detalle, Reproductor, Auth, Salón de la Fama) y el Nav como rutas Next.js 16 App Router, portando el CSS del template sin modificar, sin juegos reales.
---

## Alcance

### Dentro
- Nav sticky con logo, links, contador de créditos, botón auth, menú mobile (drawer)
- Pantalla Biblioteca: hero, buscador, chips de categoría, grid de GameCards con tilt 3D
- Pantalla Detalle: cover art CSS, tags, stats strip, acciones, leaderboard lateral
- Pantalla Reproductor: HUD, CRT decorativo con animación CSS (enemigos, nave, grid), modal Game Over, pantalla de pausa
- Pantalla Auth: tabs Login/Registro, formulario, botones sociales (solo visual)
- Pantalla Salón de la Fama: podio top-3, tabla completa, chips por juego, fila "tu mejor marca"
- Datos mock en `app/data/index.ts`: GAMES, CATS, PLAYERS, seededScores — tipados con TypeScript
- CSS del template portado íntegro a `app/globals.css` (variables, animaciones, cover art CSS)
- Estado de sesión en localStorage (mock, sin backend)

### Fuera de alcance
- Implementación real de ningún juego
- Backend, base de datos, autenticación real
- Tests (aún no hay framework definido)
- Internacionalización
- SEO / metadatos avanzados (solo los defaults de Next.js)

---

## Modelo de datos

Archivo: `app/data/index.ts`

```ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS';
  cover: string;        // clase CSS: 'cover-bricks', 'cover-tetro', etc.
  color: 'cyan' | 'magenta' | 'yellow' | 'green';
  best: number;
  plays: string;        // e.g. "12.4K" — display-only
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;         // "DD/MM/YYYY"
}

export interface User {
  name: string;         // max 10 chars, uppercase
}

export const GAMES: Game[] = [ /* 8 juegos del template */ ];
export const CATS: string[] = ['TODOS', 'ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS'];
export const PLAYERS: string[] = [ /* 18 nombres del template */ ];
export function seededScores(seed: number, count?: number): ScoreRow[] { /* misma lógica */ }
```

No se introduce ninguna estructura de persistencia nueva: el usuario se guarda en
`localStorage` bajo la clave `av_user` (JSON de `User`); las puntuaciones bajo `av_scores`
(array de `{ game: string; score: number; name: string; at: number }`).

---

## Plan de implementación

Cada paso deja el sistema en estado funcional (compilable y navegable).

1. **CSS + fuentes**
   - Copiar el CSS del template íntegro a `app/globals.css` (reemplaza el contenido actual)
   - Añadir los `<link>` de Google Fonts (Press Start 2P, JetBrains Mono, Courier Prime)
     en `app/layout.tsx`
   - Añadir `<div className="av-bg"></div>` y `<div className="av-noise"></div>`
     en el body de `layout.tsx`

2. **Datos mock**
   - Crear `app/data/index.ts` con interfaces `Game`, `ScoreRow`, `User`,
     constantes `GAMES`, `CATS`, `PLAYERS` y función `seededScores`

3. **Componente Nav**
   - Crear `app/components/Nav.tsx` — cliente (`'use client'`)
   - Props: `route`, `navigate`, `user`, `onSignOut` (misma API que el template)
   - Incluye drawer mobile

4. **Provider de estado global (sesión + routing)**
   - Crear `app/components/AppShell.tsx` — cliente
   - Gestiona `route` (objeto `{ name, id? }`) y `user` (localStorage `av_user`)
   - Renderiza `<Nav>` + la pantalla activa según `route.name`
   - `app/page.tsx` solo renderiza `<AppShell />`

5. **Pantalla Biblioteca**
   - Crear `app/components/screens/Library.tsx`
   - Sub-componente `GameCard` con tilt 3D (mouse events)
   - Filtro por categoría y búsqueda por título (estado local)

6. **Pantalla Detalle**
   - Crear `app/components/screens/GameDetail.tsx`
   - Recibe `id: string`; busca el juego en GAMES
   - Leaderboard lateral con `seededScores`

7. **Pantalla Reproductor**
   - Crear `app/components/screens/GamePlayer.tsx`
   - HUD (score, vidas, nivel, pausa, fin, salir)
   - CRT decorativo con animación CSS copiada del template
   - Modal Game Over con input de nombre y guardado en `av_scores`

8. **Pantalla Auth**
   - Crear `app/components/screens/Auth.tsx`
   - Tabs Login / Registro, formulario controlado
   - Submit: guarda `User` en localStorage y navega a Biblioteca

9. **Pantalla Salón de la Fama**
   - Crear `app/components/screens/HallOfFame.tsx`
   - Chips por juego, podio top-3, tabla completa, fila "tu marca" si hay usuario

10. **Integración final**
    - Conectar todas las pantallas en `AppShell`
    - Verificar navegación completa: Biblioteca → Detalle → Reproductor → Game Over → Biblioteca
    - Verificar Auth → usuario en Nav → Sign out
    - Verificar Salón de la Fama con y sin usuario

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores de TypeScript ni ESLint
- [ ] Fondo retro (grid perspectiva, scanlines, noise) visible en todas las pantallas
- [ ] Nav sticky muestra logo, links, contador de créditos y botón "Iniciar Sesión"
- [ ] Nav mobile: hamburger abre drawer, links navegan y cierran el drawer
- [ ] Biblioteca muestra 8 tarjetas con cover art CSS; tilt 3D funciona en hover
- [ ] Buscador filtra tarjetas por nombre en tiempo real
- [ ] Chips de categoría filtran el grid; "NO HAY RESULTADOS" aparece si no hay match
- [ ] Click en tarjeta o "JUGAR" navega a Detalle del juego correcto
- [ ] Detalle muestra cover art, tags, stats strip, leaderboard con 10 filas seed-deterministas
- [ ] "▶ JUGAR AHORA" navega al Reproductor; "VOLVER AL VAULT" vuelve a Biblioteca
- [ ] Reproductor muestra HUD con score incrementándose, vidas, nivel y nombre de jugador
- [ ] "PAUSA" detiene el score y muestra overlay; "REANUDAR" continúa
- [ ] "FIN" abre modal Game Over con score final e input de iniciales
- [ ] "GUARDAR PUNTUACIÓN" guarda en localStorage y muestra toast `▸ PUNTUACIÓN GUARDADA_`
- [ ] "JUGAR DE NUEVO" reinicia HUD; "VOLVER AL VAULT" navega a Biblioteca
- [ ] Auth muestra tabs; tab "CREAR CUENTA" añade campo email con animación slide-in
- [ ] Submit (cualquier tab) guarda usuario en localStorage y navega a Biblioteca
- [ ] Nav muestra nombre de usuario tras login; click hace sign out y limpia localStorage
- [ ] Salón de la Fama muestra podio top-3 y tabla; chips cambian el juego activo
- [ ] Con usuario logueado: fila "TU MEJOR MARCA" aparece al final de la tabla
- [ ] Diseño responsive: Biblioteca, Detalle, Salón y Nav mobile correctos en ≤ 768 px

---

## Decisiones tomadas y descartadas

| Decisión | Elegida | Descartada | Razón |
|---|---|---|---|
| Routing | `AppShell` con estado `route` en un solo `page.tsx` | App Router con carpetas por ruta | El template es SPA; rutas reales añaden complejidad sin beneficio en este MVP |
| CSS | Portar template a `globals.css` tal cual | Reescribir en Tailwind CSS 4 | Cover art CSS y animaciones son difíciles de traducir a utilidades sin perder fidelidad visual |
| Datos | `app/data/index.ts` con tipos TS | Fetch a API / DB | Los datos son ficticios; la capa de datos real es trabajo futuro |
| Auth | Mock con localStorage | Sin persistencia / Auth real | Permite probar el flujo completo (login → Nav → signout) sin backend |
| CRT Reproductor | Animación CSS del template copiada íntegra | Pantalla vacía / estática | Es visual puro; sirve de placeholder fiel hasta insertar los juegos reales |
| Implementación de juegos | Excluida del MVP | — | Decisión explícita del usuario: solo pantallas visuales |

---

## Riesgos

- **`'use client'` scope**: `AppShell` accede a `localStorage` en mount; sin `useEffect`
  causaría hydration mismatch. Mitigar: leer localStorage solo dentro de `useEffect`.
- **CSS globals vs Tailwind**: Tailwind 4 purga clases no usadas. Las clases CSS del template
  (`.cover-bricks`, `.av-hall`, etc.) se aplican como strings dinámicos — Tailwind no las
  tocará porque viven en `globals.css`, no en `className`. Sin riesgo real, pero conviene
  documentarlo para futuros devs.
- **Press Start 2P (Google Fonts)**: fuente grande (~200 KB). Sin `font-display: swap`
  puede causar FOIT. Mitigar: añadir `&display=swap` en el URL (ya está en el template).
