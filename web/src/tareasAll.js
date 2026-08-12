import { supabase } from "./supabase";

// Consulta paginada: Supabase/PostgREST devuelve máximo ~1000 filas por petición.
// Este helper descarga en bloques y une los resultados, así ningún cronograma
// se corta por muchos días que tenga.
const TAM = 1000;

export async function paginarTareas({ columnas = "*", archivada, orden = "fecha" } = {}) {
  const todas = [];
  for (let i = 0; ; i++) {
    let q = supabase
      .from("tareas")
      .select(columnas)
      .order(orden)
      .range(i * TAM, i * TAM + TAM - 1);
    if (archivada !== undefined) q = q.eq("archivada", archivada);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    todas.push(...data);
    if (data.length < TAM) break;
  }
  return todas;
}
