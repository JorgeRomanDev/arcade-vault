# Juegos portados a móvil (mobile-porter)

Registro de qué juegos ya tienen controles táctiles (spec 10) verificados.

## Estado por juego

| Fecha      | Juego (id) | Controles añadidos                                                                                                             | Estado   |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 2026-07-10 | frogger    | D-pad de 4 direcciones (◄ ▲ ▼ ►), todos `tap` → `Arrow{Up,Down,Left,Right}` (key + code). Salto discreto de 1 celda por toque. | Completo |

## Notas

- **frogger**: el juego lee `e.key` como evento discreto (`g.pendingDir`), sin estado
  sostenido y sin disparo/rotación → los 4 botones son `tap`, variante `dpad`. Mapa idéntico
  en forma al de `snake`. No requirió cambios de CSS: el layout `.touch-gp` con dpad-only ya
  estaba soportado. `npm run lint` y `npm run build` pasan limpios (los errores de lint
  restantes viven en `references/templates/`, ajenos a este trabajo). Verificación táctil en
  navegador no pudo ejecutarse: la extensión Claude-in-Chrome no conectó en esta sesión;
  queda pendiente de comprobación manual en dispositivo/emulación táctil.
