-- ============================================================
-- CORRECCIÓN DE CODIFICACIÓN (mojibake) EN procedimientos
-- Ejecuta esto en Supabase: SQL Editor > New query > Run
--
-- La tabla "procedimientos" se guardó con doble codificación
-- (los acentos se ven como "COMPROBACIÃ“N" en vez de "COMPROBACIÓN").
-- Este script:
--   1) Permite ACTUALIZAR procedimientos desde la app (falta la política).
--   2) Corrige los acentos de todos los campos de texto.
--
-- Es opcional: la app ya corrige el texto al mostrarlo, pero con esto
-- la base de datos queda limpia de forma permanente.
-- Se puede ejecutar varias veces sin riesgo.
-- ============================================================

-- 1) Política de actualización (la tabla solo tenía permiso de lectura)
drop policy if exists "procedimientos_actualizar" on public.procedimientos;
create policy "procedimientos_actualizar" on public.procedimientos
  for update to authenticated using (true);

-- 2) Corrige los campos de texto simple
update public.procedimientos set
  titulo        = convert_from(convert_to(titulo, 'WIN1252'), 'UTF8'),
  objeto        = convert_from(convert_to(objeto, 'WIN1252'), 'UTF8'),
  alcance       = convert_from(convert_to(alcance, 'WIN1252'), 'UTF8'),
  responsable   = convert_from(convert_to(responsable, 'WIN1252'), 'UTF8'),
  condicionantes = convert_from(convert_to(condicionantes, 'WIN1252'), 'UTF8');

-- 3) Corrige el arreglo de pasos (text[])
update public.procedimientos set
  pasos = (
    select array_agg(convert_from(convert_to(x, 'WIN1252'), 'UTF8') order by ord)
    from unnest(pasos) with ordinality as t(x, ord)
  );

-- 4) Corrige el equipo (jsonb): tanto las categorías como los elementos
update public.procedimientos set
  equipo = (
    select jsonb_object_agg(
      convert_from(convert_to(k, 'WIN1252'), 'UTF8'),
      to_jsonb(array(
        select convert_from(convert_to(x, 'WIN1252'), 'UTF8')
        from jsonb_array_elements_text(v) as x
      ))
    )
    from jsonb_each(equipo) as e(k, v)
  );
