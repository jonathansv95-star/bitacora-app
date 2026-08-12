-- ============================================================
-- Marcar como REALIZADAS todas las tareas desde HOY hacia atrás
-- (incluye hoy). Así queda: completadas hasta el 11/08/2026,
-- pendientes desde el 12/08/2026 en adelante.
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- ============================================================

update public.tareas
set estado = 'hecha'
where estado <> 'hecha'
  and fecha <= current_date;
