---
spec: 13
title: Arcade Vault — Autenticación real con Supabase Auth (registro, login, OAuth)
state: Implementado
date: 2026-07-12
depends_on: [04-instalacion-supabase]
objective: Reemplazar el login/registro simulado (Auth.tsx local, User en localStorage) por Supabase Auth real con email/password y OAuth Google/GitHub, incluyendo confirmación de email, sesión persistida server-side vía middleware, y logout real, manteniendo el modo invitado sin cuenta.
---

## Alcance

### Dentro

- Signup real email+password vía `supabase.auth.signUp()` — `user_metadata.username` guarda nombre elegido.
- Login real email+password vía `supabase.auth.signInWithPassword()`.
- OAuth Google + GitHub vía `supabase.auth.signInWithOAuth()`, redirect a `app/auth/callback/route.ts` (exchange code por sesión).
- Logout real vía `supabase.auth.signOut()`.
- Estado de sesión: `AppShell` deja de usar `localStorage av_user`, usa `supabase.auth.getSession()` al montar + `onAuthStateChange` para mantener sincronizado `user` en memoria.
- `middleware.ts` — refresco automático de sesión server-side, patrón oficial `@supabase/ssr`.
- Confirmación de email: tras signup, card muestra estado "revisa tu correo" en vez de loguear directo.
- Errores de login/signup (credenciales inválidas, email duplicado, password débil, etc.) mostrados inline bajo el form.
- Modo invitado ("JUGAR COMO INVITADO") se mantiene igual que hoy — sin cuenta real, sin sesión Supabase.
- `User` (`app/data/index.ts`) se extiende para reflejar datos derivados de Supabase (name + email); guest sigue usando solo `name`.

### Fuera de alcance

- Recuperación de contraseña ("olvidé mi contraseña") — spec futuro.
- Vincular `scores.name` a `user_id` / perfil autenticado — sigue como spec 06 lo dejó, texto libre.
- Crear página/tabla de perfiles de usuario — solo se usa `user_metadata` de Supabase Auth, sin tabla `profiles`.
- RLS en `games`/`scores` — sigue fuera, como spec 06/04 documentaron.
- Configurar providers OAuth (Client ID/Secret) en dashboard de Supabase — prerequisito manual del dueño, documentado en Riesgos, no en código.
- Verificación de fuerza de password más allá de la validación default de Supabase Auth.

---

## Modelo de datos

Sin tablas nuevas — Supabase Auth ya maneja `auth.users`. Solo cambia tipo TS:

```ts
// app/data/index.ts
export interface User {
  name: string;
  email?: string; // ausente en modo invitado
  isGuest?: boolean;
}
```

- `name` en usuario real = `user_metadata.username` (fallback a parte local del email si falta).
- `isGuest: true` para el flujo "JUGAR COMO INVITADO" (sin email, sin sesión Supabase) — distingue en `Nav`/`HallOfFame` si hiciera falta a futuro.

---

## Plan de implementación

1. **Middleware de sesión**
   - Crear `middleware.ts` (raíz) con `updateSession` usando `@supabase/ssr` — refresca cookies de sesión en cada request. Verificar patrón contra `node_modules/next/dist/docs/` (cookies async en Next 16, por regla CLAUDE.md).
   - `matcher` config excluye assets estáticos.

2. **Ruta de callback OAuth**
   - Crear `app/auth/callback/route.ts` — recibe `code`, llama `supabase.auth.exchangeCodeForSession(code)`, redirige a `/` (home).

3. **Tipo `User` extendido**
   - `app/data/index.ts`: añadir `email?`, `isGuest?` a `User`.

4. **Reescribir `Auth.tsx`**
   - Cambiar campo "Usuario" → **Email** en ambos tabs (login/signup); mantener campo "Usuario" solo en signup como `username` (va a `user_metadata`).
   - `submit()` en tab login → `supabase.auth.signInWithPassword({ email, password })`; en éxito, deriva `User` y llama `onLogin`; en error, `setError(mensaje)` mostrado inline.
   - `submit()` en tab signup → `supabase.auth.signUp({ email, password, options: { data: { username } } })`; en éxito sin sesión activa (email sin confirmar) → mostrar estado "Revisa tu correo para confirmar tu cuenta" en vez de navegar; si Supabase devuelve sesión directa (confirmación desactivada), loguea y navega igual que login.
   - Botones Google/GitHub → `supabase.auth.signInWithOAuth({ provider: 'google' | 'github', options: { redirectTo: `${origin}/auth/callback` } })`.
   - Botón "JUGAR COMO INVITADO" sin cambios de comportamiento, pasa `{ name: 'INVITADO', isGuest: true }`.

5. **`AppShell.tsx` — sesión real**
   - Quitar lectura/escritura `localStorage av_user`.
   - `useEffect` inicial: `supabase.auth.getSession()` → deriva `User` (o `null`) desde `session.user`.
   - Suscripción `supabase.auth.onAuthStateChange((_event, session) => ...)` actualiza `user` en vivo; cleanup en `unsubscribe()`.
   - `handleLogin(u)` pasa a solo `setUser(u)` (ya no persiste manualmente; sesión real la persiste Supabase/cookies). Para invitado (`isGuest`), sigue guardando en memoria únicamente (no hay sesión Supabase que perseguir) — usar `localStorage` solo para el caso invitado si se requiere persistencia entre refrescos, mismo mecanismo que hoy pero acotado a ese caso.
   - `handleSignOut()` → `await supabase.auth.signOut()` (si no es invitado) + `setUser(null)`.

6. **Verificación manual**
   - Signup con email nuevo → ver estado "revisa tu correo" en UI.
   - Confirmar email (link real o Supabase dashboard) → login con esas credenciales → navega a `games`, `Nav` muestra username.
   - Logout → vuelve a estado sin sesión, `Nav` muestra "Iniciar Sesión".
   - Refrescar página tras login → sesión persiste (middleware + `getSession`).
   - Login con credenciales inválidas → mensaje de error inline, sin crash.
   - Signup con email ya registrado → mensaje de error inline.
   - Invitado → sigue entrando sin cuenta, jugando y guardando score con nombre libre como hoy.
   - OAuth (si dueño ya configuró providers) → botón Google/GitHub redirige, vuelve autenticado.

---

## Criterios de aceptación

- [ ] `middleware.ts` existe, refresca sesión en cada request sin romper rutas existentes.
- [ ] `app/auth/callback/route.ts` existe, intercambia `code` por sesión y redirige a home.
- [ ] `Auth.tsx`: tabs login/signup piden email+password (signup añade username).
- [ ] Signup con email nuevo → muestra estado "revisa tu correo", no navega a `games` directo (salvo confirmación desactivada).
- [ ] Login con credenciales válidas y email confirmado → navega a `games`, `Nav` muestra `username`.
- [ ] Login con credenciales inválidas → error inline visible, sin crash, sin navegar.
- [ ] Signup con email ya registrado → error inline visible.
- [ ] Botones Google/GitHub llaman `signInWithOAuth`, redirigen a `/auth/callback`.
- [ ] Logout real invoca `supabase.auth.signOut()`, `Nav` vuelve a "Iniciar Sesión".
- [ ] Refrescar página (F5) tras login mantiene sesión activa (sin volver a loguear).
- [ ] "JUGAR COMO INVITADO" sigue funcionando sin cuenta, sin tocar Supabase Auth.
- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint.
- [ ] Sin providers OAuth configurados en dashboard, botones Google/GitHub no rompen la app (error inline capturado, no crash).

---

## Decisiones tomadas y descartadas

| Decisión               | Elegida                                                              | Descartada                              | Razón                                                                                                             |
| ---------------------- | -------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Autenticación          | Email+password vía Supabase Auth nativo                              | Username propio mapeado a email interno | Supabase no soporta login por username nativo; mapeo custom añade complejidad y tabla extra sin beneficio real    |
| OAuth                  | Incluido (Google + GitHub) en este spec                              | Diferido a spec futuro                  | Usuario pidió incluirlo ahora, pese a mayor alcance                                                               |
| Config providers OAuth | Prerequisito manual del dueño en dashboard Supabase                  | Automatizar vía MCP/código              | Client ID/Secret son credenciales externas que el dueño debe generar y pegar, igual que spec 04 con env vars      |
| Confirmación de email  | Se respeta el default de Supabase (confirmación activa)              | Asumir desactivada                      | Más seguro; UX de "revisa tu correo" ya cubre el caso, evita depender de config manual adicional del dueño        |
| Recuperar contraseña   | Fuera de alcance                                                     | Incluir reset flow                      | Mantiene el spec acotado; se documenta como spec futuro                                                           |
| Vínculo scores↔usuario | Fuera de alcance, `scores.name` sigue texto libre                    | Añadir `user_id` a `scores`             | Ya decidido en spec 06; evita migración y tocar `GamePlayer`/`saveScore` en este spec                             |
| Sesión                 | `supabase.auth.getSession()` + `onAuthStateChange` + `middleware.ts` | Mantener `localStorage` manual          | Patrón oficial `@supabase/ssr`, evita desincronización entre pestañas/refrescos                                   |
| Modo invitado          | Se mantiene igual (sin cuenta, sin sesión Supabase)                  | Forzar login para jugar                 | Usuario confirmó mantenerlo; no bloquea onboarding rápido                                                         |
| Errores UI             | Mensaje inline bajo el form                                          | Sistema de toasts                       | No existe sistema de toasts reutilizable en el proyecto; inline es más simple y consistente con el resto de la UI |

---

## Riesgos

- **Providers OAuth sin configurar**: si dueño no configuró Google/GitHub en dashboard Supabase, botones fallan en runtime. Mitigado con error inline capturado (criterio de aceptación), no crashea la app.
- **Confirmación de email bloquea testing**: si dueño no puede acceder al correo de prueba, no podrá verificar login manualmente. Alternativa: confirmar manualmente el usuario desde el dashboard de Supabase (Authentication → Users).
- **Middleware + Next.js 16**: manejo de cookies (`cookies()` async) puede diferir de ejemplos oficiales de Supabase para versiones previas de Next. Verificar contra `node_modules/next/dist/docs/` antes de implementar, por regla del proyecto.
- **Guest sin sesión real conviviendo con middleware**: middleware refresca sesión Supabase en cada request; usuario invitado no tiene sesión, middleware debe no-op sin romper la ruta cuando no hay cookie de sesión.
- **App 100% client-side (`AppShell` es `'use client'`, router en memoria)**: middleware solo protege a nivel de request/cookies, no hay rutas server protegidas que redirijan — el gating de pantallas sigue siendo client-side como hoy (fuera de alcance endurecerlo).
