-- ============================================================
-- SEGURIDAD: acceso restringido a UN SOLO USUARIO
-- Ejecuta esto en Supabase: SQL Editor > New query > Run
--
-- Restringe el RLS para que SOLO el usuario indicado pueda
-- leer y escribir las tablas de la web/app.
-- Es idempotente: se puede ejecutar varias veces.
--
-- ANTES de ejecutarlo, verifica el UUID (Authentication > Users)
-- y reemplázalo si es distinto.
-- ============================================================

-- UUID de jonathan.guzman@grupoortiz.com
do $$
begin
  -- Nada que hacer aquí; solo recordatorio de editar el UUID de abajo.
end $$;

-- ---------- TAREAS ----------
drop policy if exists "tareas_ver" on public.tareas;
create policy "tareas_ver" on public.tareas
  for select to authenticated
  using (auth.uid() = 'f4250ca5-00e4-420e-825f-b546e8ff3919');

drop policy if exists "tareas_actualizar" on public.tareas;
create policy "tareas_actualizar" on public.tareas
  for update to authenticated
  using (auth.uid() = 'f4250ca5-00e4-420e-825f-b546e8ff3919');

drop policy if exists "tareas_crear" on public.tareas;
create policy "tareas_crear" on public.tareas
  for insert to authenticated
  with check (auth.uid() = 'f4250ca5-00e4-420e-825f-b546e8ff3919');

drop policy if exists "tareas_borrar" on public.tareas;
create policy "tareas_borrar" on public.tareas
  for delete to authenticated
  using (auth.uid() = 'f4250ca5-00e4-420e-825f-b546e8ff3919');

-- ---------- PROCEDIMIENTOS ----------
drop policy if exists "procedimientos_ver" on public.procedimientos;
create policy "procedimientos_ver" on public.procedimientos
  for select to authenticated
  using (auth.uid() = 'f4250ca5-00e4-420e-825f-b546e8ff3919');

drop policy if exists "procedimientos_actualizar" on public.procedimientos;
create policy "procedimientos_actualizar" on public.procedimientos
  for update to authenticated
  using (auth.uid() = 'f4250ca5-00e4-420e-825f-b546e8ff3919');

-- ---------- EJECUCIONES DE TAREAS ----------
drop policy if exists "ejecuciones_ver" on public.tarea_ejecuciones;
create policy "ejecuciones_ver" on public.tarea_ejecuciones
  for select to authenticated
  using (auth.uid() = 'f4250ca5-00e4-420e-825f-b546e8ff3919');

-- (el insert ya exige auth.uid() = user_id)

-- ---------- EVENTOS (bitácora) ----------
-- Borramos todas las políticas existentes y las recreamos restringidas.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'eventos' loop
    execute format('drop policy if exists %I on public.eventos', p.policyname);
  end loop;
end $$;

alter table public.eventos enable row level security;

create policy "eventos_ver" on public.eventos
  for select to authenticated
  using (auth.uid() = 'f4250ca5-00e4-420e-825f-b546e8ff3919');

create policy "eventos_crear" on public.eventos
  for insert to authenticated
  with check (auth.uid() = 'f4250ca5-00e4-420e-825f-b546e8ff3919');

create policy "eventos_actualizar" on public.eventos
  for update to authenticated
  using (auth.uid() = 'f4250ca5-00e4-420e-825f-b546e8ff3919');

create policy "eventos_borrar" on public.eventos
  for delete to authenticated
  using (auth.uid() = 'f4250ca5-00e4-420e-825f-b546e8ff3919');
