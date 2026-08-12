import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://cgqwtwawgtyacndxuoee.supabase.co",
  "sb_publishable__qO8zgIjpIWX84AeRmkmeA_aGVqcaKq"
);

const { data: eventos, error } = await supabase
  .from("eventos")
  .select("id, fecha, evento, fotos")
  .limit(5)
  .order("fecha", { ascending: false });

if (error) {
  console.log("ERROR eventos:", error.message);
  process.exit(1);
}

console.log("total consultado:", eventos?.length);
for (const ev of eventos || []) {
  console.log("---");
  console.log("id:", ev.id, "| fecha:", ev.fecha, "| evento:", ev.evento);
  console.log("fotos:", JSON.stringify(ev.fotos));
}

// listar el bucket
const { data: buckets, error: errB } = await supabase.storage.listBuckets();
console.log("buckets:", errB ? "ERROR " + errB.message : buckets?.map((b) => b.name));

const { data: objetos, error: errO } = await supabase.storage
  .from("fotos-eventos")
  .list("", { limit: 20 });
console.log("objetos en fotos-eventos:", errO ? "ERROR " + errO.message : objetos?.length);
if (objetos) for (const o of objetos.slice(0, 10)) console.log("  ", o.name, o.id);

// probar createSignedUrls con la primera ruta
const rutas = [...new Set((eventos || []).flatMap((ev) => ev.fotos || []))];
if (rutas.length) {
  const { data: urls, error: errU } = await supabase.storage
    .from("fotos-eventos")
    .createSignedUrls(rutas.slice(0, 5), 3600);
  console.log("signedUrls:", errU ? "ERROR " + errU.message : JSON.stringify(urls, null, 1));
} else {
  console.log("no hay rutas de fotos en los 5 eventos mas recientes");
}
