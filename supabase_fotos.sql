alter table public.eventos
  add column if not exists fotos text[] not null default '{}';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-eventos',
  'fotos-eventos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "fotos_eventos_ver" on storage.objects;
create policy "fotos_eventos_ver"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'fotos-eventos');

drop policy if exists "fotos_eventos_subir" on storage.objects;
create policy "fotos_eventos_subir"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'fotos-eventos');

drop policy if exists "fotos_eventos_actualizar" on storage.objects;
create policy "fotos_eventos_actualizar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'fotos-eventos');

drop policy if exists "fotos_eventos_borrar" on storage.objects;
create policy "fotos_eventos_borrar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotos-eventos');