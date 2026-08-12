import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://cgqwtwawgtyacndxuoee.supabase.co",
  "sb_publishable__qO8zgIjpIWX84AeRmkmeA_aGVqcaKq"
);

const { count } = await supabase
  .from("tareas")
  .select("*", { count: "exact" });
console.log("total en tabla:", count);

const { data, error } = await supabase
  .from("tareas")
  .update({ estado: "hecha" })
  .gte("fecha", "2026-01-01")
  .lte("fecha", "2026-07-31");

if (error) {
  console.log("ERROR:", error.message);
} else {
  console.log("marcadas como hechas (ene-jul):", data ? data.length : "n/a");
}

const { data: resumen } = await supabase
  .from("tareas")
  .select("estado");
const porEstado = {};
for (const t of resumen || []) porEstado[t.estado] = (porEstado[t.estado] || 0) + 1;
console.log("estado general:", JSON.stringify(porEstado));

const { data: pend } = await supabase
  .from("tareas")
  .select("fecha, descripcion")
  .gte("fecha", "2026-01-01")
  .lte("fecha", "2026-07-31")
  .neq("estado", "hecha");
console.log("quedan sin marcar en ene-jul:", (pend || []).length);
