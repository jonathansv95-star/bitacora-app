-- Ejecuta esto en Supabase: Project > SQL Editor > New query > Run

create table bitacoras (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  descripcion text,
  fecha timestamp with time zone default now(),
  user_id uuid references auth.users default auth.uid()
);

-- Seguridad: cada usuario solo ve y edita sus propias bitácoras
alter table bitacoras enable row level security;

create policy "Los usuarios ven sus propias bitacoras"
  on bitacoras for select
  using (auth.uid() = user_id);

create policy "Los usuarios crean sus propias bitacoras"
  on bitacoras for insert
  with check (auth.uid() = user_id);

create policy "Los usuarios editan sus propias bitacoras"
  on bitacoras for update
  using (auth.uid() = user_id);

create policy "Los usuarios borran sus propias bitacoras"
  on bitacoras for delete
  using (auth.uid() = user_id);
