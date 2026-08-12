import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://cgqwtwawgtyacndxuoee.supabase.co",
  "sb_publishable__qO8zgIjpIWX84AeRmkmeA_aGVqcaKq"
);

const tablas = ["eventos", "bitacoras", "tareas", "procedimientos", "perfiles", "tarea_ejecuciones"];
for (const t of tablas) {
  const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
  if (error) console.log(`${t}: ERROR -> ${error.message}`);
  else console.log(`${t}: ${count} filas`);
}
