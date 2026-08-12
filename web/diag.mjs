import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://cgqwtwawgtyacndxuoee.supabase.co",
  "sb_publishable__qO8zgIjpIWX84AeRmkmeA_aGVqcaKq"
);

const hoy = new Date().toISOString().slice(0, 10);
console.log("hoy:", hoy);

const { data, error } = await supabase.from("tareas").select("fecha, estado, descripcion, responsable").order("fecha");
if (error) { console.log("ERROR:", error.message); process.exit(1); }
console.log("total:", data.length);

const min = data[0], max = data[data.length - 1];
console.log("min fecha:", min.fecha, "| max fecha:", max.fecha);

const atrasadas = data.filter((t) => t.fecha < hoy && t.estado !== "hecha");
console.log("atrasadas:", atrasadas.length);
const porAnio = {};
for (const t of data) {
  const a = String(t.fecha).slice(0, 4);
  porAnio[a] = (porAnio[a] || 0) + 1;
}
console.log("por año:", JSON.stringify(porAnio));

// mostrar las que estan a 2-4 meses (nov/dic 2026 aprox) o cualquier fecha futura rara
const futuras = data.filter((t) => t.fecha >= "2026-09-01");
console.log("futuras desde sep-2026:", futuras.length);
for (const t of futuras.slice(0, 30)) console.log("  ", t.fecha, t.estado, "|", String(t.descripcion).slice(0, 40), "|", t.responsable);

// revisar tipo de dato: si fecha trae 'T' o es Date
console.log("tipo fecha:", typeof data[0].fecha, JSON.stringify(data[0].fecha));
