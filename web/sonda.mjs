import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://cgqwtwawgtyacndxuoee.supabase.co",
  "sb_publishable__qO8zgIjpIWX84AeRmkmeA_aGVqcaKq"
);

const probe = { fecha: "2099-01-01", descripcion: "SONDA-PRUEBA-ANON", area: "test", responsable: "test", estado: "pendiente", prioridad: "normal" };
const { data: ins, error: errIns } = await supabase.from("tareas").insert(probe).select();
console.log("insert:", errIns ? "ERROR " + errIns.message : "OK id=" + (ins?.[0]?.id || "?"));
const { data: all, error: errSel } = await supabase.from("tareas").select("id, fecha, descripcion").limit(10);
console.log("select:", errSel ? "ERROR " + errSel.message : "filas=" + (all?.length || 0));
for (const t of (all || []).slice(0, 10)) console.log("  ", t.fecha, "|", String(t.descripcion).slice(0, 50));
const { error: errDel } = await supabase.from("tareas").delete().eq("descripcion", "SONDA-PRUEBA-ANON");
console.log("limpieza sonda:", errDel ? "ERROR " + errDel.message : "OK");
