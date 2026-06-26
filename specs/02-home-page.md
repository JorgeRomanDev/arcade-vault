---
spec: 02
title: Arcade Vault — Home Page
state: Aprobado
date: 2026-06-25
depends_on: [01-arcade-vault-mvp]
objective: Implementar la pantalla Home como landing page inicial de Arcade Vault, portando el template references/templates/home-about/home.jsx a un componente Next.js 16 con datos reales del spec 01.
---

## Alcance

### Dentro
- Pantalla `Home` como ruta inicial (`route.name === "home"`) en `AppShell`
- La ruta actual de inicio (`"biblioteca"`) pasa a `"games"` — `AppShell` arranca en `"home"`
- 7 secciones del template portadas:
  1. **Hero** — eyebrow, título 3 líneas, 2 CTAs, scroll hint, `FloatingSilhouettes` (8 SVGs pixel-art)
  2. **¿Por qué Arcade Vault?** — 4 feature cards con íconos pixel SVG
  3. **Juegos disponibles ahora** — rail de 6 `MiniCard` usando `GAMES.slice(0, 6)` de `app/data/index.ts`
  4. **Stats** — 3 bloques ("12+", "MILES", "GLOBAL") hardcodeados
  5. **Actividad en vivo** — ticker últimas puntuaciones + top jugadores, hardcodeados igual que el template
  6. **Precios** — plan único $0, FAQ (3 preguntas), sección hardcodeada
  7. **Final CTA** — botón "INSERTAR MONEDA →"
- CSS de `home-*`, `mini-*`, `feature-*`, `stats-*`, `activity-*`, `pricing-*`, `home-final` añadido a `app/globals.css`
- Hook `useReveal` (IntersectionObserver) para animaciones scroll-in
- Animaciones CSS de las siluetas flotantes portadas desde `styles.css` del template

### Fuera de alcance
- Ticker conectado a `av_scores` de localStorage (datos hardcodeados como en el template)
- Componente `About` (archivo `about.jsx` del template — spec separado)
- Navegación con `nav.jsx` del template (ya implementada en spec 01)
- Juegos reales, backend, autenticación real
- Animación de contador en stats (los números son estáticos)

---

## Plan de implementación

1. **CSS — estilos Home**
   - Añadir al final de `app/globals.css` todos los bloques del template `styles.css`
     referentes a: `.home-*`, `.hero-*`, `.float-*`, `.silo`, `.mini-*`, `.feature-*`,
     `.stats-*`, `.activity-*`, `.pricing-*`, `.home-final`, `.reveal`, `.fade-in`,
     `.kicker`, `.section-head`, `.section-rule`, `.btn.xl`, `.btn.lg`, `.btn.pulse`
   - Añadir animaciones CSS de siluetas flotantes (`.silo.s1`–`.s8`, `@keyframes float-*`)

2. **Componente Home**
   - Crear `app/components/screens/Home.tsx` (`'use client'`)
   - Portar `FloatingSilhouettes`, `FeatureIcon`, `MiniCard` como sub-componentes internos
   - Portar hook `useReveal` como función interna del módulo
   - Props: `navigate: (route: { name: string; id?: string }) => void`
   - Datos: importar `GAMES` desde `app/data/index.ts`

3. **AppShell — routing**
   - En `app/components/AppShell.tsx`:
     - Estado inicial `route` cambia de `"biblioteca"` a `"home"`
     - Añadir case `"home"` → `<Home navigate={navigate} />`
     - Renombrar case `"biblioteca"` a `"games"` (y actualizar todos los `navigate({ name: "biblioteca" })` dentro de `Library.tsx`, `GameDetail.tsx`, `GamePlayer.tsx`, `HallOfFame.tsx`, `Nav.tsx`)

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] Al cargar la app, la pantalla inicial es Home (no Biblioteca)
- [ ] Hero muestra eyebrow, título 3 líneas, 2 CTAs y scroll hint
- [ ] 8 siluetas pixel-art flotan con animación CSS en el hero
- [ ] "EXPLORAR JUEGOS" navega a la pantalla de juegos (`"games"`)
- [ ] "CREAR CUENTA" navega a Auth
- [ ] Sección "¿Por qué Arcade Vault?" muestra 4 feature cards con íconos SVG y colores correctos
- [ ] Rail "JUEGOS DISPONIBLES AHORA" muestra 6 MiniCards con datos de `GAMES`
- [ ] Click en MiniCard navega a Detalle del juego correcto
- [ ] "VER TODOS LOS JUEGOS →" navega a `"games"`
- [ ] Sección Stats muestra 3 bloques visibles y estilizados
- [ ] Ticker "ÚLTIMAS PUNTUACIONES" muestra 7 filas hardcodeadas con animación
- [ ] "TOP JUGADORES · HOY" muestra 5 filas con barra de progreso
- [ ] "VER SALÓN →" navega a `"salon"`
- [ ] Sección Precios muestra plan $0, lista de 6 beneficios y FAQ 3 preguntas
- [ ] "EMPEZAR GRATIS →" y "INSERTAR MONEDA →" navegan a Auth / `"games"` respectivamente
- [ ] Secciones con clase `.reveal` aparecen con fade-in al hacer scroll
- [ ] Nav links existentes (Biblioteca→Games, Salón) siguen funcionando tras el rename
- [ ] Responsive: hero, mini-rail y feature-grid correctos en ≤ 768px

---

## Decisiones tomadas y descartadas

| Decisión | Elegida | Descartada | Razón |
|---|---|---|---|
| Ruta inicial | `"home"` (nueva pantalla Home) | Mantener `"biblioteca"` como inicio | Home es el landing page; Biblioteca pasa a ser destino de navegación |
| Nombre ruta Biblioteca | `"games"` | Mantener `"biblioteca"` | Consistencia con la intención semántica y con el slug que usa el template de Home |
| Ticker actividad | Hardcodeado igual que el template | Conectar a `av_scores` localStorage | Scope acotado; datos reales de actividad requieren backend — fuera de este MVP |
| Sub-componentes Home | Internos en `Home.tsx` | Archivos separados | `FloatingSilhouettes`, `MiniCard`, `FeatureIcon` solo se usan en Home; extraerlos sería abstracción prematura |
| Stats | Números estáticos | Animación de conteo al scroll | Animación de contador añade complejidad JS sin valor funcional en este MVP |
| About page | Excluida | Incluir en este spec | El template tiene `about.jsx` separado; spec propio cuando se decida implementarlo |

---

## Riesgos

- **Rename `"biblioteca"` → `"games"`**: afecta Nav, Library, GameDetail, GamePlayer, HallOfFame y AppShell.
  Mitigar: grep exhaustivo antes de implementar para no dejar strings huérfanos.
- **CSS globals acumulativo**: `globals.css` ya es grande tras spec 01. Añadir estilos Home
  sin colisión requiere que los selectores `.home-*` no existan aún. Verificar antes de pegar.
- **`useReveal` + SSR**: IntersectionObserver no existe en Node. El componente debe ser
  `'use client'` y el hook solo corre en `useEffect`. Ya cubierto por la arquitectura del spec 01.
