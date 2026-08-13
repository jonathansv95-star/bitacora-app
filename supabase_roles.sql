-- ============================================================
-- ROLES DE USUARIO (admin / editor / observador)
-- Ejecuta esto en Supabase: SQL Editor > New query > Run
--
-- - observador: solo puede VER (SELECT).
-- - editor: puede ver y modificar (SELECT/INSERT/UPDATE/DELETE).
-- - admin: todo lo anterior + gestionar usuarios.
-- ============================================================

-- 1) Columna de rol en perfiles
alter table public.perfiles
  add column if not exists rol text not null default 'observador';

alter table public.perfiles
  alter column tecnico drop not null;

-- 2) El administrador (jonathan.guzman@grupoortiz.com)
insert into public.perfiles (user_id, tecnico, rol)
values ('f4250ca5-00e4-420e-825f-b546e8ff3919', 'Jonathan Guzmán', 'admin')
on conflict (user_id) do update set rol = 'admin';

-- 3) Función que devuelve el rol del usuario actual
create or replace function public.mi_rol()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select rol from public.perfiles where user_id = auth.uid()),
    'observador'
  );
$$;

grant execute on function public.mi_rol() to authenticated;

-- 4) RLS por roles -------------------------------------------

-- TAREAS
drop policy if exists "tareas_ver" on public.tareas;
create policy "tareas_ver" on public.tareas
  for select to authenticated using (true);

drop policy if exists "tareas_actualizar" on public.tareas;
create policy "tareas_actualizar" on public.tareas
  for update to authenticated using (public.mi_rol() in ('admin', 'editor'));

drop policy if exists "tareas_crear" on public.tareas;
create policy "tareas_crear" on public.tareas
  for insert to authenticated with check (public.mi_rol() in ('admin', 'editor'));

drop policy if exists "tareas_borrar" on public.tareas;
create policy "tareas_borrar" on public.tareas
  for delete to authenticated using (public.mi_rol() in ('admin', 'editor'));

-- PROCEDIMIENTOS
drop policy if exists "procedimientos_ver" on public.procedimientos;
create policy "procedimientos_ver" on public.procedimientos
  for select to authenticated using (true);

drop policy if exists "procedimientos_actualizar" on public.procedimientos;
create policy "procedimientos_actualizar" on public.procedimientos
  for update to authenticated using (public.mi_rol() in ('admin', 'editor'));

-- EJECUCIONES DE TAREAS
drop policy if exists "ejecuciones_ver" on public.tarea_ejecuciones;
create policy "ejecuciones_ver" on public.tarea_ejecuciones
  for select to authenticated using (true);

drop policy if exists "ejecuciones_crear" on public.tarea_ejecuciones;
create policy "ejecuciones_crear" on public.tarea_ejecuciones
  for insert to authenticated
  with check (auth.uid() = user_id and public.mi_rol() in ('admin', 'editor'));

-- EVENTOS (bitácora)
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
  for select to authenticated using (true);

create policy "eventos_crear" on public.eventos
  for insert to authenticated with check (public.mi_rol() in ('admin', 'editor'));

create policy "eventos_actualizar" on public.eventos
  for update to authenticated using (public.mi_rol() in ('admin', 'editor'));

create policy "eventos_borrar" on public.eventos
  for delete to authenticated using (public.mi_rol() in ('admin', 'editor'));

-- PERFILES (solo el admin gestiona usuarios)
drop policy if exists "perfiles_ver_propios" on public.perfiles;
create policy "perfiles_ver_propios" on public.perfiles
  for select to authenticated using (public.mi_rol() = 'admin');

drop policy if exists "perfiles_crear_propios" on public.perfiles;
create policy "perfiles_crear_propios" on public.perfiles
  for insert to authenticated with check (public.mi_rol() = 'admin');

drop policy if exists "perfiles_actualizar_propios" on public.perfiles;
create policy "perfiles_actualizar_propios" on public.perfiles
  for update to authenticated using (public.mi_rol() = 'admin');

drop policy if exists "perfiles_borrar" on public.perfiles;
create policy "perfiles_borrar" on public.perfiles
  for delete to authenticated using (public.mi_rol() = 'admin');
