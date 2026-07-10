---
spec: 03
title: Arcade Vault — About Page + Contacto con Resend
state: Implementado
date: 2026-06-26
depends_on: [01-arcade-vault-mvp, 02-home-page]
objective: Implementar la pantalla About (misión + formulario de contacto) portando about.jsx del template, enviando el mensaje vía Resend al correo del dueño del proyecto.
---

## Alcance

### Dentro
- Pantalla `About` como ruta `"about"` en `AppShell`
- 2 secciones del template portadas:
  1. **About Hero** — kicker, título, misión, 3 highlight cards (HEART/BROWSER/PLANT) con íconos SVG pixel-art
  2. **Contacto** — divider animado, grid intro + formulario (nombre, email, mensaje), terminal-success al enviar, mensaje de error inline si falla
- API Route `app/api/contact/route.ts` — recibe POST `{ name, email, msg }`, llama Resend, devuelve `{ ok }` o `{ error }`
- Envío real con Resend SDK (`resend` package) a `jorge_luis_roman@hotmail.com`
- Variable de entorno `RESEND_API_KEY` en `.env.local` (preparada, sin valor — el dueño la completa)
- CSS de `.about-*`, `.contact-*`, `.highlight-*`, `.terminal-success`, `.term-*`, `.tip-*`, `@keyframes shake` añadido a `app/globals.css`
- `useReveal` (IntersectionObserver) reimplementado localmente en `About.tsx` (igual que en `Home.tsx`)
- Nav desktop y mobile: añadir enlace "Sobre Nosotros" → `{ name: "about" }`

### Fuera de alcance
- Guardar mensajes en base de datos o localStorage
- Rate limiting en el endpoint de contacto
- Confirmación de recepción por correo al remitente
- Plantilla HTML estilizada en el correo (solo texto plano)
- CAPTCHA o protección anti-spam

---

## Modelo de datos

Sin estructuras nuevas en `app/data/index.ts`.

### Contrato API

**POST `/api/contact`**

Request body:
```ts
{ name: string; email: string; msg: string }
```

Response (éxito `200`):
```ts
{ ok: true }
```

Response (error `500`):
```ts
{ error: string }
```

### Variable de entorno

```env
# .env.local
RESEND_API_KEY=         # completar con la clave de resend.com
```

Hardcodeado en `app/api/contact/route.ts` (sin dominio verificado):
- `from`: `"onboarding@resend.dev"` — único remitente permitido en modo sandbox
- `to`: `"jorge_luis_roman@hotmail.com"` — único destinatario permitido hasta verificar dominio

> Cuando tengas dominio verificado: mover `from` y `to` a variables de entorno y actualizar el route handler.

---

## Plan de implementación

1. **Dependencia Resend**
   - Instalar `resend` package: `npm install resend`

2. **Variable de entorno**
   - Crear `.env.local` en la raíz con `RESEND_API_KEY=` (valor vacío, dueño completa)
   - Crear `.env.local.example` con el mismo contenido como referencia

3. **API Route — contacto**
   - Crear `app/api/contact/route.ts`
   - Validar que `name`, `email`, `msg` no estén vacíos; devolver `400` si fallan
   - Instanciar `new Resend(process.env.RESEND_API_KEY)`
   - Llamar `resend.emails.send({ from, to, subject, text })`
   - `subject`: `"[Arcade Vault] Mensaje de contacto de {name}"`
   - `text`: nombre, email del remitente y mensaje en texto plano
   - Devolver `{ ok: true }` en éxito, `{ error: "..." }` en excepción

4. **CSS — estilos About**
   - Añadir al final de `app/globals.css` todos los bloques del template `styles.css`
     referentes a: `.about-*`, `.contact-*`, `.highlight-*`, `.terminal-success`,
     `.term-*`, `.tip-*`, `.div-bar`, `.div-pixels`, `@keyframes shake`

5. **Componente About**
   - Crear `app/components/screens/About.tsx` (`'use client'`)
   - Portar `HighlightIcon` como sub-componente interno
   - Reimplementar `useReveal` localmente (igual que en `Home.tsx`)
   - Estado local: `form { name, email, msg }`, `status: 'idle' | 'sending' | 'sent' | 'error'`, `shake`
   - `onSubmit`: validar campos → `fetch('/api/contact', { method: 'POST', body: JSON.stringify(form) })`
     → si `ok` → `status = 'sent'`; si error → `status = 'error'`, mostrar mensaje inline
   - Mostrar spinner o botón deshabilitado mientras `status === 'sending'`
   - Props: `navigate: (route: { name: string; id?: string }) => void`

6. **AppShell — routing**
   - En `app/components/AppShell.tsx`: añadir `case "about"` → `<About navigate={navigate} />`

7. **Nav — enlace "Sobre Nosotros"**
   - En `app/components/Nav.tsx`:
     - Desktop `.links`: añadir `<a>` con `isActive('about')` → `go({ name: 'about' })` con texto `"Sobre Nosotros"`
     - Mobile panel: ídem

---

## Criterios de aceptación

- [ ] `npm run dev` arranca sin errores TypeScript ni ESLint
- [ ] `npm install resend` instalado y en `package.json`
- [ ] `.env.local` existe con `RESEND_API_KEY=` (vacío)
- [ ] Nav desktop muestra enlace "Sobre Nosotros" entre "Salón de la Fama" y los botones de auth
- [ ] Nav mobile muestra enlace "Sobre Nosotros" en el drawer
- [ ] Click en "Sobre Nosotros" navega a pantalla About (`route.name === "about"`)
- [ ] About Hero muestra kicker "▸ ACERCA DE", título y párrafo de misión
- [ ] 3 highlight cards visibles con íconos SVG pixel-art y colores magenta/cyan/green
- [ ] Divider animado visible entre About Hero y sección Contacto
- [ ] Sección Contacto muestra intro con 3 tips (LEDs verde/amarillo/magenta) y formulario
- [ ] Formulario tiene campos Nombre, Correo Electrónico y Mensaje
- [ ] Submit con campos vacíos activa animación `shake` y no envía
- [ ] Submit válido deshabilita botón / muestra estado "enviando"
- [ ] Envío exitoso muestra terminal-success con nombre del remitente en mayúsculas
- [ ] "ENVIAR OTRO MENSAJE" resetea formulario y vuelve a estado idle
- [ ] Si Resend falla, aparece mensaje de error inline (sin terminal-success)
- [ ] Secciones `.reveal` aparecen con fade-in al hacer scroll
- [ ] Responsive: highlight-row en columna única en ≤ 820px; contact-grid en columna única en ≤ 900px
- [ ] Correo llega a `jorge_luis_roman@hotmail.com` con subject `[Arcade Vault] Mensaje de contacto de {name}`

---

## Decisiones tomadas y descartadas

| Decisión | Elegida | Descartada | Razón |
|---|---|---|---|
| Integración Resend | Route Handler `app/api/contact/route.ts` | Server Action en About.tsx | Route Handler separa transporte de UI; testeable independientemente |
| Destinatario | `jorge_luis_roman@hotmail.com` (cuenta Resend) | `wyrom.er@gmail.com` | Sin dominio verificado, Resend sandbox solo permite enviar a la cuenta registrada |
| Remitente | `onboarding@resend.dev` | Dominio propio | Sin dominio verificado; actualizar cuando se verifique |
| Formato correo | Texto plano | HTML estilizado | Reduce complejidad; el contenido es suficiente sin plantilla |
| `useReveal` | Reimplementado localmente en `About.tsx` | Extraer a `app/hooks/useReveal.ts` | Solo 2 componentes lo usan; extracción es abstracción prematura hasta un 3er uso |
| Persistencia mensajes | Sin persistencia | Guardar en localStorage o DB | Fuera de alcance; el correo es el registro suficiente en este MVP |
| Protección anti-spam | Ninguna | CAPTCHA / rate limiting | Complejidad desproporcionada para MVP; volumen de tráfico es mínimo |
| Enlace Nav | "Sobre Nosotros" | "Acerca de" (texto del template) | Usuario eligió este texto explícitamente |

---

## Riesgos

- **Resend sandbox restrictivo**: sin dominio verificado, cualquier `to` distinto de `jorge_luis_roman@hotmail.com` retorna error 422. El criterio de aceptación de correo solo puede verificarse con esa cuenta. Mitigar: documentado en spec; cambiar `to` cuando se verifique dominio.
- **`RESEND_API_KEY` ausente en runtime**: si la variable está vacía, el SDK lanza excepción. El route handler la captura y devuelve `{ error }` — el formulario muestra error inline sin crash. Sin riesgo de caída de la app.
- **`useReveal` duplicado**: existe en `Home.tsx` y existirá en `About.tsx`. Si se añade un 3er componente, extraer a `app/hooks/useReveal.ts`. Registrado en decisiones.
- **CSS globals acumulativo**: verificar antes de pegar que los selectores `.about-*`, `.contact-*` no existan ya en `globals.css` para evitar colisiones.
