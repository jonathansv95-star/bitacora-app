-- ============================================================
-- MIGRACION: tareas de mantenimiento (para la web)
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- Es aditiva: NO borra ni modifica los eventos ni las fotos.
-- Se puede ejecutar varias veces sin problema.
-- ============================================================

create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  descripcion text not null,
  area text default '',
  responsable text default '',
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'en_progreso', 'hecha')),
  prioridad text not null default 'normal'
    check (prioridad in ('baja', 'normal', 'alta')),
  creado_por uuid references auth.users default auth.uid(),
  creado_en timestamptz not null default now()
);

-- Seguridad: como en los eventos, cualquier usuario autenticado
-- del equipo puede ver, crear, editar y borrar tareas.
alter table public.tareas enable row level security;

-- Archivo de años anteriores (botón "Iniciar nuevo año").
-- Las tareas archivadas se conservan para historial/auditoría,
-- pero no aparecen en el tablero ni en el día a día.
alter table public.tareas add column if not exists archivada boolean not null default false;

drop policy if exists "tareas_ver" on public.tareas;
create policy "tareas_ver"
  on public.tareas for select
  to authenticated
  using (true);

drop policy if exists "tareas_insertar" on public.tareas;
create policy "tareas_insertar"
  on public.tareas for insert
  to authenticated
  with check (true);

drop policy if exists "tareas_actualizar" on public.tareas;
create policy "tareas_actualizar"
  on public.tareas for update
  to authenticated
  using (true);

drop policy if exists "tareas_borrar" on public.tareas;
create policy "tareas_borrar"
  on public.tareas for delete
  to authenticated
  using (true);
