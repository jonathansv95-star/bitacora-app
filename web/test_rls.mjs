import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://cgqwtwawgtyacndxuoee.supabase.co",
  "sb_publishable__qO8zgIjpIWX84AeRmkmeA_aGVqcaKq"
);
// update que NO afecta ninguna fila (fecha antigua) para probar RLS sin cambiar nada
const { data, error } = await supabase
  .from("tareas")
  .update({ estado: "hecha" })
  .lt("fecha", "2026-01-01");
console.log("update test:", error ? "ERROR " + error.message : "OK (0 filas, sin error)");
