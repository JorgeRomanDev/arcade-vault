---
spec: 14
title: Arcade Vault — Seguridad básica (RLS, headers, hardening Supabase Auth)
state: Implementado
date: 2026-07-12
depends_on:
  [04-instalacion-supabase, 06-tabla-juegos-leaderboard, 13-auth-supabase]
objective: Cerrar los hallazgos del checklist de seguridad (references/security/security-checklist.md) habilitando RLS en `games` y `scores`, añadiendo headers de seguridad en Next.js, validando en el cliente la nueva política de password de Supabase Auth (mínimo 8 caracteres, mayúscula, minúscula, dígito y símbolo) antes de enviar el signup, y documentando como prerequisito manual del dueño el resto del hardening de Supabase Auth (leaked password protection, límite de signup por IP).
---

## Alcance

### Dentro

- Migración SQL (vía Supabase MCP `apply_migration`) que habilita RLS en `games` y `scores` y crea las políticas:
  - `games`: SELECT abierto a `anon`+`authenticated`. Sin políticas de INSERT/UPDATE/DELETE (el catálogo se sigue sembrando por migración, no desde el cliente).
  - `scores`: SELECT abierto a `anon`+`authenticated` (leaderboard público). INSERT abierto a `anon`+`authenticated`, sin restricción de `user_id` (mantiene modo invitado y usuarios logueados guardando score con nombre libre, igual que hoy). Sin políticas de UPDATE/DELETE (scores inmutables desde el cliente).
- Headers de seguridad en `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` (los 3 del checklist), aplicados a todas las rutas.
- Validación client-side en `Auth.tsx` (tab "CREAR CUENTA") de la nueva política de password ya configurada en el dashboard de Supabase (mínimo 8 caracteres, al menos una mayúscula, una minúscula, un dígito y un símbolo): al hacer submit del signup, si el password no cumple el regex, se muestra el error inline existente y **no** se llama a `supabase.auth.signUp()`. El tab "INICIAR SESIÓN" no valida (login son credenciales ya existentes, posiblemente anteriores a esta política).
- Documentación (en este spec, sección Riesgos) de los 2 ajustes de Supabase Auth restantes que el dueño debe aplicar manualmente en el dashboard: leaked password protection (HaveIBeenPwned), límite de signups por IP. Se documentan como prerequisito, igual patrón que OAuth providers en spec 13.
- Proteccion de rutas con Proxy Next.js: informacion sobre el proxy aqui:
  https://nextjs.org/docs/app/getting-started/proxy
  Ejemplo: proxy.ts

````ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}

// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }

export const config = {
  matcher: '/about/:path*',
}

### Fuera de alcance

- Automatizar los ajustes de Supabase Auth vía API/MCP — no hay soporte confirmado en `mcp__supabase` para esos settings; quedan como pasos manuales documentados.
- Checklist de requisitos en tiempo real mientras el usuario escribe la contraseña — validación ocurre solo al hacer submit (ver Decisiones).
- Validación de password en el tab de login.
- Content-Security-Policy y otros headers no listados en el checklist (Strict-Transport-Security, Permissions-Policy) — decisión explícita de acotar a los 3 del checklist.
- Añadir `user_id` a `scores` o vincular scores al usuario autenticado — ya fue decisión explícita de specs 06/13, no se reabre aquí.
- Corregir los otros hallazgos del linter de Supabase no listados en el checklist (`anon_security_definer_function_executable`, `authenticated_security_definer_function_executable` sobre `rls_auto_enable()`) — no estaban en el checklist proporcionado por el usuario, quedan fuera salvo que se pida explícitamente.
- Rate limiting o protección anti-bot a nivel de aplicación (fuera de lo que ofrece el dashboard de Supabase Auth).

---

## Modelo de datos

Sin tablas nuevas. Solo políticas RLS sobre `games`/`scores` existentes (spec 06).

```sql
-- games: lectura pública, sin escritura desde cliente
alter table games enable row level security;

create policy "games_select_public"
  on games for select
  to anon, authenticated
  using (true);

-- scores: lectura pública, insert abierto (guest + logueados), sin update/delete
alter table scores enable row level security;

create policy "scores_select_public"
  on scores for select
  to anon, authenticated
  using (true);

create policy "scores_insert_public"
  on scores for insert
  to anon, authenticated
  with check (true);
````

No se crean políticas de UPDATE/DELETE en ninguna tabla — sin política definida, RLS deniega esas operaciones por defecto.

### Validación de password (`Auth.tsx`)

Sin estructura de datos nueva, solo una constante de validación:

```ts
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const PASSWORD_ERROR =
  "La contraseña debe tener mínimo 8 caracteres e incluir mayúscula, minúscula, número y símbolo.";
```

---

## Plan de implementación

1. **Migración RLS**
   - Vía Supabase MCP `apply_migration`, nombre descriptivo (ej. `enable_rls_games_scores`).
   - SQL: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` para `games` (select) y `scores` (select, insert) según Modelo de datos.
   - Verificar con `mcp__supabase__get_advisors` que `rls_disabled_in_public` ya no aparece para `games`/`scores`.

2. **Headers de seguridad en `next.config.ts`**
   - Verificar sintaxis de `headers()` en Next.js 16 contra `node_modules/next/dist/docs/` (regla del proyecto) antes de escribir.
   - Añadir array `securityHeaders` con los 3 headers del checklist y bloque `headers: async () => [...]` aplicado a `/(.*)`.

3. **Validación de password en `Auth.tsx`**
   - Añadir `PASSWORD_REGEX`/`PASSWORD_ERROR` (ver Modelo de datos) en `Auth.tsx`.
   - En `submit()`, rama `tab === "up"`: antes de llamar `supabase.auth.signUp()`, si `!PASSWORD_REGEX.test(pass)` → `setError(PASSWORD_ERROR)`, `setBusy(false)`, `return` (sin llamar a Supabase).
   - No se toca la rama `tab === "in"` (login sin validación).

4. **Proteccion de rutas con Proxy Next.js**
   - `proxy.ts` ya existe (spec 13) y refresca la sesión de Supabase en cada request (`supabase.auth.getUser()`), matcher `/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`.
   - Arcade Vault es una SPA client-side (`app/page.tsx` → `AppShell` enruta pantallas en el cliente bajo `/`); no hay páginas server-rendered que requieran auth-gate adicional. Las únicas rutas server son `/api/contact`, `/api/supabase-check` y `/auth/callback`, ninguna requiere protección de acceso (no exponen datos sensibles, guest mode es alcance aceptado de spec 13).
   - Decisión: no se añade lógica de redirect/bloqueo al proxy existente — ya cumple su función de sesión, y no hay ruta server adicional que proteger en esta arquitectura.

5. **Verificación manual**
   - `npm run dev`, confirmar que Library/GameDetail/HallOfFame siguen leyendo `games`/`scores` sin error (RLS no rompe lecturas).
   - Guardar un score real desde `GamePlayer` (logueado y como invitado) → confirmar insert exitoso pese a RLS.
   - Confirmar en consola/dashboard que no se puede hacer `update`/`delete` sobre `scores` vía anon key (ej. probar con `execute_sql` simulando rol `anon`, o revisar que no hay policy de esas operaciones).
   - Inspeccionar headers de respuesta (`curl -I` o devtools Network) en `/` → confirmar presencia de los 3 headers.
   - `mcp__supabase__get_advisors` → confirmar que los 2 avisos `rls_disabled_in_public` (games, scores) desaparecen.
   - Signup con password que no cumple el regex (ej. `abc12345` sin mayúscula/símbolo) → error inline visible, sin llamada de red a Supabase (verificable en Network tab).
   - Signup con password que sí cumple (ej. `Abc123!@`) → sigue el flujo normal (estado "revisa tu correo" o login directo según config de confirmación).
   - `npm run build` y `npm run lint` sin errores.

6. **Documentar hardening manual restante de Supabase Auth**
   - No es un paso de código — se deja registrado en la sección Riesgos de este spec (ver abajo) con los 2 ajustes que el dueño debe aplicar en el dashboard (Authentication → Policies/Settings): leaked password protection, límite de signup por IP.

---

## Criterios de aceptación

- [x] RLS habilitado en `games` y `scores` (`get_advisors` ya no reporta `rls_disabled_in_public` para ninguna de las dos).
- [x] Policy `games_select_public`: lectura de `games` funciona sin sesión (Library/HallOfFame/GameDetail cargan el catálogo igual que hoy).
- [x] No existe ninguna policy de INSERT/UPDATE/DELETE en `games` — intentar insertar/editar una fila vía anon key falla.
- [x] Policy `scores_select_public`: leaderboards (GameDetail, HallOfFame tabs por juego y "TODOS") siguen mostrando datos reales sin sesión.
- [x] Policy `scores_insert_public`: guardar score funciona tanto logueado como en modo invitado (sin regresión de spec 06/13).
- [x] No existe ninguna policy de UPDATE/DELETE en `scores` — intentar editar/borrar un score vía anon key falla.
- [x] `next.config.ts` responde con `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` en todas las rutas (verificable con `curl -I` o Network tab).
- [x] `npm run dev`, `npm run build` y `npm run lint` sin errores tras los cambios.
- [x] Sección Riesgos de este spec documenta los 2 pasos manuales pendientes en el dashboard de Supabase Auth (leaked password protection, signup rate limit por IP), con su ubicación exacta en el dashboard.
- [x] Signup con password que no cumple (mínimo 8, mayúscula, minúscula, dígito, símbolo) → error inline visible, `supabase.auth.signUp()` no se llega a invocar.
- [x] Signup con password válido → flujo normal sin regresión (estado "revisa tu correo" o login directo).
- [x] Tab de login no aplica esta validación (credenciales existentes no se ven bloqueadas).

---

## Decisiones tomadas y descartadas

| Decisión                                                                | Elegida                                                                                   | Descartada                                                       | Razón                                                                                                                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| RLS `games`                                                             | Solo SELECT público, sin INSERT/UPDATE/DELETE vía cliente                                 | Permitir escritura a `authenticated`                             | Catálogo se siembra por migración/MCP, no desde el cliente; escritura abierta no tiene caso de uso actual                                             |
| RLS `scores` INSERT                                                     | Abierto a `anon`+`authenticated`, sin `user_id`                                           | Restringir INSERT solo a `authenticated`                         | Rompería el modo invitado, mantenido explícitamente en spec 13                                                                                        |
| RLS `scores` UPDATE/DELETE                                              | Sin políticas (denegado por defecto)                                                      | Permitir a `authenticated` editar/borrar sus propios scores      | `scores` no tiene `user_id` (fuera de alcance de spec 06); añadirla es mayor alcance que este spec de seguridad                                       |
| Headers de seguridad                                                    | Solo los 3 del checklist (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) | Añadir CSP, `Strict-Transport-Security`, `Permissions-Policy`    | Checklist es explícito; CSP requiere mapear orígenes externos (Supabase, fuentes) con riesgo de romper la app sin pruebas exhaustivas — mayor alcance |
| Hardening Supabase Auth (leaked password protection, signup rate limit) | Documentado como prerequisito manual del dueño en el dashboard                            | Automatizar vía API/MCP                                          | No hay soporte confirmado en `mcp__supabase` para esos settings; mismo patrón que OAuth providers en spec 13                                          |
| Validación de password (mín. 8, mayúscula, minúscula, dígito, símbolo)  | Client-side en `Auth.tsx`, al hacer submit del signup, antes de llamar `signUp()`         | Solo dejar que Supabase rechace en el servidor                   | Evita una llamada de red garantizada a fallar; da feedback inmediato sin esperar el roundtrip                                                         |
| Momento de validación de password                                       | Al hacer submit (una sola comprobación)                                                   | Validación en vivo mientras se escribe (checklist de requisitos) | Usuario pidió evitar mandar a autenticar una contraseña que se sabe no pasará el regex; validación en vivo es mayor alcance de UI no pedido           |
| Mensaje de error de password                                            | Un único mensaje listando todos los requisitos                                            | Mensaje específico por regla que falta (ej. "falta símbolo")     | Más simple de implementar y mantener; suficiente para que el usuario corrija                                                                          |
| Alcance de la validación de password                                    | Solo tab de signup                                                                        | También en tab de login                                          | Login son credenciales ya existentes (posiblemente previas a esta política); validar ahí bloquearía logins válidos                                    |
| Hallazgos `SECURITY DEFINER` (`rls_auto_enable`)                        | Fuera de alcance                                                                          | Incluirlos en este spec                                          | No estaban en el checklist con checkbox proporcionado por el usuario; se descartó explícitamente en Fase 2                                            |

---

## Riesgos

- **RLS mal configurado bloquea lecturas legítimas**: si las policies de SELECT no cubren `anon` correctamente, Library/GameDetail/HallOfFame dejarían de mostrar datos sin sesión. Mitigado verificando en Paso 3 del plan antes de dar el spec por terminado.
- **Suplantación de nombre en scores persiste**: INSERT sigue abierto sin `user_id`, cualquiera puede seguir guardando scores con nombre ajeno (mismo riesgo aceptado en spec 06, no es regresión ni se corrige aquí).
- **Minimum password length ya aplicado por el dueño**: la política (8+ caracteres, mayúscula, minúscula, dígito, símbolo) ya está configurada en el dashboard de Supabase Auth; este spec añade la validación equivalente en el cliente (`Auth.tsx`) para no depender solo del rechazo del servidor.
- **2 ajustes de Supabase Auth requieren acción manual del dueño** (fuera de alcance de código):
  1. **Leaked password protection** — Dashboard → Authentication → Policies → activar verificación contra HaveIBeenPwned.
  2. **Max signup rate por IP** — Dashboard → Authentication → Rate Limits → configurar límite de signups por IP.
     Hasta que el dueño los aplique, esos 2 hallazgos del checklist siguen abiertos aunque el resto del spec esté implementado.
- **Regex de password desincronizado con la política real del dashboard**: si el dueño cambia la política en Supabase (ej. sube el mínimo a 10, quita el requisito de símbolo) sin actualizar `PASSWORD_REGEX` en `Auth.tsx`, el cliente validará contra reglas desactualizadas — falsos positivos o negativos hasta que se actualice el código a mano.
- **Hallazgos `SECURITY DEFINER` resueltos (fuera del checklist original, pedido explícito post-implementación)**: `anon_security_definer_function_executable` / `authenticated_security_definer_function_executable` sobre `rls_auto_enable()` se corrigieron revocando `EXECUTE` a `public`/`anon`/`authenticated` (migración `revoke_execute_rls_auto_enable`). El event trigger `ensure_rls` que invoca la función sigue activo — la revocación no afecta su disparo, solo bloquea la llamada directa vía `/rest/v1/rpc/rls_auto_enable`. Verificado con `get_advisors` (ambos hallazgos ya no aparecen).
