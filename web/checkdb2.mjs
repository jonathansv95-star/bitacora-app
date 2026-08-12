import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://cgqwtwawgtyacndxuoee.supabase.co",
  "sb_publishable__qO8zgIjpIWX84AeRmkmeA_aGVqcaKq"
);
const { data, count } = await supabase.from("tareas").select("fecha, estado", { count: "exact" });
console.log("total:", count);
if (data) {
  const porEstado = {};
  const fechas = [];
  for (const t of data) {
    porEstado[t.estado] = (porEstado[t.estado] || 0) + 1;
    fechas.push(t.fecha);
  }
  console.log("por estado:", JSON.stringify(porEstado));
  if (fechas.length) {
    fechas.sort();
    console.log("fecha min:", fechas[0], "| fecha max:", fechas[fechas.length - 1]);
  }
}
