-- ============================================================
-- TIEMPO REAL (Realtime) para la web y la app
-- Ejecuta esto en Supabase: SQL Editor > New query > Run
-- Habilita que los cambios se reflejen al instante entre la web
-- y la app, sin recargar.
-- Es idempotente: se puede ejecutar varias veces.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'tareas') then
    alter publication supabase_realtime add table public.tareas;
  end if;

  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'eventos') then
    alter publication supabase_realtime add table public.eventos;
  end if;

  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'tarea_ejecuciones') then
    alter publication supabase_realtime add table public.tarea_ejecuciones;
  end if;
end $$;
