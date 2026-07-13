# Registro de auditorías de seguridad (security-auditor)

Historial de corridas de auditoría read-only sobre DB (Supabase) y app.

## Historial

| Fecha      | Crítico | Alto | Medio | Bajo | Resumen                                                                                                                                                                                                                                              |
| ---------- | ------- | ---- | ----- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-12 | 0       | 0    | 2     | 2    | Primera corrida. Fixes de spec 14 verificados OK (RLS en games/scores, headers, SECURITY DEFINER revocado). Sin regresiones. Hallazgos nuevos solo en `/api/contact` y `/api/supabase-check` (rate-limit, validación de input, fuga de err.message). |
