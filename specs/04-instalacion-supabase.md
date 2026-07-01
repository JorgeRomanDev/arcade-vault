---
spec: 04
title: Arcade Vault — Instalación de Supabase
state: Aprobado
date: 2026-06-30
depends_on: [01-arcade-vault-mvp]
objective: Instalar y configurar el cliente de Supabase (browser + server) en el proyecto Next.js 16, dejando la conexión lista y verificada para que specs futuros implementen auth y datos reales.
---

## Alcance

### Dentro

- Instalar paquetes `@supabase/supabase-js` y `@supabase/ssr`
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local` (vacías — dueño las completa) y `.env.local.example` como referencia
- Cliente browser: `app/lib/supabase/client.ts` (`createBrowserClient`, para Client Components)
- Cliente server: `app/lib/supabase/server.ts` (`createServerClient` con cookies de `next/headers`, para Server Components / Route Handlers)
- Ruta de verificación temporal `app/api/supabase-check/route.ts` — llama `supabase.auth.getSession()` y devuelve `{ ok: true }` o `{ error }`, para confirmar que la conexión funciona

### Fuera de alcance

- Middleware de refresco de sesión (`middleware.ts`) — se añade en el spec de Auth
- Reemplazar `Auth.tsx` / login con Supabase Auth real
- Migrar `GAMES`, `CATS`, `PLAYERS` o scores a tablas Postgres
- Crear tablas, RLS policies o cualquier esquema de base de datos
- Crear el proyecto Supabase (ya existe, dueño provee las claves)

---

## Plan de implementación

1. **Dependencias**
   - Instalar `@supabase/supabase-js` y `@supabase/ssr`: `npm install @supabase/supabase-js @supabase/ssr`

2. **Variables de entorno**
   - Añadir a `.env.local`: `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (vacías, dueño completa)
   - Crear `.env.local.example` con las mismas claves como referencia

3. **Cliente browser**
   - Crear `app/lib/supabase/client.ts`
   - Exportar `createClient()` usando `createBrowserClient` de `@supabase/ssr` con las env vars `NEXT_PUBLIC_*`

4. **Cliente server**
   - Crear `app/lib/supabase/server.ts`
   - Exportar `createClient()` (async) usando `createServerClient` de `@supabase/ssr`, leyendo/escribiendo cookies vía `cookies()` de `next/headers`

5. **Ruta de verificación**
   - Crear `app/api/supabase-check/route.ts`
   - Instanciar el cliente server, llamar `supabase.auth.getSession()`
   - Devolver `{ ok: true, hasSession: boolean }` en éxito, `{ error: string }` en excepción (500)

6. **Verificación manual**
   - Con las claves reales puestas por el dueño en `.env.local`, arrancar `npm run dev` y hacer `GET /api/supabase-check` → confirmar `{ ok: true }` sin error de conexión

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] `@supabase/supabase-js` y `@supabase/ssr` instalados y en `package.json`
- [ ] `.env.local` existe con `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (vacías)
- [ ] `.env.local.example` existe con las mismas claves
- [ ] `app/lib/supabase/client.ts` exporta `createClient()` funcional para Client Components
- [ ] `app/lib/supabase/server.ts` exporta `createClient()` funcional para Server Components/Route Handlers
- [ ] Con claves reales puestas por el dueño, `GET /api/supabase-check` devuelve `{ ok: true }` sin error
- [ ] Sin claves (env vars vacías), `GET /api/supabase-check` devuelve `{ error }` capturado, sin crash de la app

---

## Decisiones tomadas y descartadas

| Decisión             | Elegida                                         | Descartada                            | Razón                                                                                                                                  |
| -------------------- | ----------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Alcance              | Solo instalación/conexión Supabase              | Auth + Scores + Games en un solo spec | Usuario pidió acotar: este spec solo deja Supabase instalado; auth y datos van en specs futuros                                        |
| Paquetes             | `@supabase/supabase-js` + `@supabase/ssr`       | Solo `@supabase/supabase-js`          | `@supabase/ssr` es el patrón oficial recomendado por Supabase para Next.js App Router (maneja cookies en server/browser correctamente) |
| Middleware de sesión | Excluido de este spec                           | Incluir `middleware.ts` ahora         | No hay auth real todavía; el refresco de sesión no tiene efecto sin login — se añade junto con el spec de Auth                         |
| Proyecto Supabase    | Ya existe, dueño provee claves manualmente      | Crear proyecto nuevo vía MCP          | Usuario confirmó que ya tiene proyecto y prefiere colocar las claves él mismo                                                          |
| Verificación         | Route handler `app/api/supabase-check/route.ts` | Página UI temporal                    | Ruta de API es más simple de verificar y de remover/reusar en specs futuros; no requiere tocar `AppShell`                              |

---

## Riesgos

- **Claves vacías en runtime**: si `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` están vacías, `createClient()` puede lanzar o el fetch fallar. El route handler `/api/supabase-check` captura la excepción y devuelve `{ error }` — sin crash de la app.
- **Patrón `@supabase/ssr` desactualizado**: Next.js 16 puede tener cambios en manejo de cookies async (`cookies()` ya es async en versiones recientes). Verificar contra `node_modules/next/dist/docs/` antes de implementar `server.ts`, por regla del proyecto (CLAUDE.md).
- **Claves públicas expuestas**: `NEXT_PUBLIC_*` son visibles en el bundle del cliente — es el comportamiento esperado para la anon key (protegida por RLS en Supabase), no un riesgo real siempre que no se use la `service_role` key en el cliente.
