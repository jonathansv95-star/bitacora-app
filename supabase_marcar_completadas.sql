-- ============================================================
-- Marcar como COMPLETADAS todas las tareas hasta julio 2026
-- (desde enero hasta julio cumplidas para que el tablero se vea ordenado)
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- ============================================================

update public.tareas
set estado = 'hecha'
where estado <> 'hecha'
  and fecha <= '2026-07-31';
