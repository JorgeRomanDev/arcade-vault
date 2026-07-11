---
name: spec-impl-game
description: Implementa un spec de juego aprobado reusando el flujo de /spec-impl y, al terminar, detona en secuencia skin-designer y luego mobile-porter (nunca en paralelo) sobre el juego recién implementado.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementador de specs de juego + skins + móvil

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

---

## Instrucciones

Este comando es una **variante especializada de `/spec-impl`** para specs de juego (las
que produce `/add-game`, siguiendo el patrón de integración de 4 puntos descrito en
`CLAUDE.md`). Añade una fase final que no existe en `/spec-impl`: al terminar de
implementar, detona `skin-designer` y luego `mobile-porter` sobre el juego recién
integrado.

### Fase 0 — Ejecutar el procedimiento base de `/spec-impl` sin desviación

Lee y sigue **íntegro** el fichero `.agents/skills/spec-impl/SKILL.md` — sus Fases 1 a 4,
tal cual están escritas, sin reinterpretarlas ni saltarte ninguna:

1. **Identificar el spec** a partir de `$ARGUMENTS` (número, slug o nombre completo).
2. **Validar el estado** — solo continuar si significa "Aprobado" (en cualquier idioma).
   Si no, detente con el mensaje de error estándar de `/spec-impl` y no continúes.
3. **Crear/cambiar a la rama** `spec-NN-slug`, mostrar resumen (objetivo, alcance, plan,
   criterios de aceptación).
4. **Implementar paso a paso**, con pausa de revisión de diff después de cada paso,
   esperando confirmación explícita antes de seguir. Ambigüedades → detente, presenta
   opciones, espera decisión del usuario. Nada de esto cambia para specs de juego: no
   dupliques esta lógica aquí, remítete al fichero base como fuente de verdad.

No avances a la Fase 1 de este comando hasta que el plan completo del spec esté
implementado y confirmado por el usuario (equivalente al cierre de la Fase 4 de
`/spec-impl`).

### Fase 1 — Determinar el `id` del juego

Una vez implementado el plan completo, extrae el `id` único del juego (el mismo que
recorre `games` row, `.cover-<id>`, el componente y `GamePlayer.tsx` según el patrón de
4 puntos de `CLAUDE.md`). Búscalo, en este orden:

1. La rama nueva `id === "<id>"` añadida en `app/components/screens/GamePlayer.tsx`.
2. La clase `.cover-<id>` (+ `@source inline("cover-<id>")`) añadida en `app/globals.css`.
3. El `id` usado en el seed insert de la tabla `games`.

Si las fuentes no coinciden o no puedes determinar el `id` sin ambigüedad, **pregunta al
usuario** el id exacto — no lo adivines ni continúes con una suposición.

### Fase 2 — Orquestación de agentes (automática, estrictamente secuencial)

Al completar el último paso del plan (sin pausa adicional, sin esperar más confirmación
que la ya dada al cerrar la implementación), anuncia:

```
Implementación completa. Detono skin-designer y luego mobile-porter sobre `<id>`.
```

Luego:

1. **Lanza el agente `skin-designer`** (tool Agent, `subagent_type: "skin-designer"`,
   `run_in_background: false` para que sea síncrono) con un prompt autocontenido que
   incluya: el `id` del juego, que acaba de implementarse en la rama `spec-NN-slug`, y
   que debe aplicarle el sistema de 3 skins (classic/neon/retro) según su propio
   procedimiento. Espera a que termine y relaya su resumen al usuario en el chat (los
   subagentes no se muestran solos).
2. **Solo después de que `skin-designer` haya terminado por completo**, lanza el agente
   `mobile-porter` (tool Agent, `subagent_type: "mobile-porter"`, `run_in_background:
false`) con un prompt autocontenido que incluya: el `id` del juego, que ya está
   integrado en `GamePlayer.tsx` (rama `id === "<id>"` + `isCustomGame`) y ya tiene skins
   aplicados, y que debe portarle los controles táctiles según su propio procedimiento.
   Espera a que termine y relaya su resumen.

**Regla dura:** NUNCA invoques ambos agentes en el mismo bloque de mensaje ni en
paralelo. `skin-designer` debe completarse por entero (código escrito, memoria
actualizada, resumen recibido) antes de que `mobile-porter` arranque. Motivo: el primero
modifica el contrato de props y el cuerpo del componente del juego (añade `skin: SkinId`
y sustituye colores hardcodeados); el segundo debe leer el estado ya tematizado del
componente, no una versión intermedia a medio escribir.

Si `skin-designer` o `mobile-porter` se detienen por una precondición no cumplida (p.
ej. mobile-porter exige que el juego ya esté en `GamePlayer.tsx` — condición que esta
skill ya garantiza en su Fase 0/1), reporta el bloqueo al usuario tal cual lo devuelva el
agente; no lo fuerces ni lo saltees.

### Fase 3 — Cierre

Recuerda al usuario (igual que `/spec-impl`):

```
✅ Todos los pasos del plan, skins y controles táctiles están implementados.

Próximo paso: verificar los criterios de aceptación del spec uno por uno.
Si todos pasan, actualiza el estado del spec a "Implementado" y haz el commit
final antes de mergear esta rama.
```

---

## Resumen del comportamiento esperado

```
/spec-impl-game 07-pong

  Fase 0  →  Sigue /spec-impl íntegro:
             Encuentra specs/07-pong.md → estado "Aprobado" → ✅ continúa
             git checkout -b spec-07-pong
             Implementa paso a paso con pausas de diff
  Fase 1  →  Detecta id "pong" desde GamePlayer.tsx / globals.css / seed de games
  Fase 2  →  Lanza skin-designer(pong) [síncrono, espera fin]
             Lanza mobile-porter(pong) [síncrono, después de skin-designer]
  Fase 3  →  Recuerda verificar criterios de aceptación y flipear estado a Implementado

/spec-impl-game 08-otro  (estado: Borrador)

  Fase 0  →  /spec-impl bloquea en su Fase 2 → ❌ detiene todo
             No crea rama, no implementa, no lanza agentes.
```
