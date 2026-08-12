-- ============================================================
-- MIGRACION V2: columnas para el cronograma de mantenimiento
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- Es aditiva: agrega columnas a la tabla tareas.
-- ============================================================

alter table public.tareas
  add column if not exists codigo text default '',
  add column if not exists frecuencia text default '',
  add column if not exists hora_inicio text default '',
  add column if not exists hora_fin text default '',
  add column if not exists duracion numeric not null default 0;
