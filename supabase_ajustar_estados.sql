-- ============================================================
-- AJUSTAR ESTADOS:
--   - hasta el 31/07/2026  -> COMPLETADA
--   - desde el 01/08/2026  -> PENDIENTE (agosto y futuro)
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- ============================================================

update public.tareas
set estado = 'hecha'
where fecha <= '2026-07-31';

update public.tareas
set estado = 'pendiente'
where fecha >= '2026-08-01';
