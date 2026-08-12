-- ============================================================
-- MARCAR ENERO A JULIO 2026 COMO REALIZADAS
-- Ejecutar en Supabase > SQL Editor > New query > Run
-- Marca como "hecha" todas las tareas del cronograma
-- desde el 01/01/2026 hasta el 31/07/2026.
-- Las tareas de agosto en adelante quedan sin cambios.
-- ============================================================

update public.tareas
set estado = 'hecha'
where fecha >= '2026-01-01'
  and fecha <= '2026-07-31'
  and estado <> 'hecha';

-- Verificación: cuántas tareas quedaron hechas por mes
select to_char(fecha, 'YYYY-MM') as mes, estado, count(*) as total
from public.tareas
where fecha between '2026-01-01' and '2026-07-31'
group by mes, estado
order by mes;
