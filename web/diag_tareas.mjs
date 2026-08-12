import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://cgqwtwawgtyacndxuoee.supabase.co",
  "sb_publishable__qO8zgIjpIWX84AeRmkmeA_aGVqcaKq"
);

const hoy = new Date().toISOString().slice(0, 10);
console.log("hoy (UTC):", hoy);

const { data, count, error } = await supabase
  .from("tareas")
  .select("fecha, estado, tecnico", { count: "exact" });
if (error) { console.log("ERROR tareas:", error.message); }
else {
  console.log("total tareas:", count);
  const porEstado = {}, porTecnico = {};
  const fechas = [];
  for (const t of data) {
    porEstado[t.estado] = (porEstado[t.estado] || 0) + 1;
    const tec = t.tecnico ?? "(null)";
    porTecnico[tec] = (porTecnico[tec] || 0) + 1;
    fechas.push(t.fecha);
  }
  console.log("por estado:", JSON.stringify(porEstado));
  console.log("por tecnico:", JSON.stringify(porTecnico));
  fechas.sort();
  console.log("fecha min:", fechas[0], "| max:", fechas[fechas.length - 1]);
  const deHoy = data.filter((t) => String(t.fecha) === hoy);
  console.log("de hoy:", deHoy.length);
  for (const t of deHoy.slice(0, 10)) console.log("  ", t.fecha, t.estado, "|", t.tecnico);
}

const { data: perfiles, count: pCount, error: pErr } = await supabase
  .from("perfiles")
  .select("user_id, tecnico", { count: "exact" });
if (pErr) { console.log("ERROR perfiles:", pErr.message); }
else {
  console.log("perfiles:", pCount);
  for (const p of perfiles) console.log("  ", p.user_id, "->", p.tecnico);
}

const { data: procs, count: cCount, error: cErr } = await supabase
  .from("procedimientos")
  .select("numero", { count: "exact" });
if (cErr) { console.log("ERROR procedimientos:", cErr.message); }
else console.log("procedimientos:", cCount);

const { error: eErr } = await supabase.from("tarea_ejecuciones").select("id", { count: "exact", head: true });
if (eErr) { console.log("ERROR tarea_ejecuciones:", eErr.message); }
else console.log("tarea_ejecuciones: OK (accesible)");
