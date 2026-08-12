import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://cgqwtwawgtyacndxuoee.supabase.co",
  "sb_publishable__qO8zgIjpIWX84AeRmkmeA_aGVqcaKq"
);

const email = "diagfotosweb2026@gmail.com";
const pass = "Diag-Fotos-2026!";

let { data, error } = await supabase.auth.signUp({ email, password: pass });
if (error) {
  console.log("signUp:", "ERROR " + error.message);
  // intentar iniciar sesion por si ya existia
  const r = await supabase.auth.signInWithPassword({ email, password: pass });
  if (r.error) {
    console.log("signIn:", "ERROR " + r.error.message);
    process.exit(1);
  }
  data = r.data;
} else {
  console.log("signUp OK (puede requerir confirmacion):", JSON.stringify(data));
  if (!data.session) {
    console.log("sin sesion -> probando iniciar sesion igual");
    const r = await supabase.auth.signInWithPassword({ email, password: pass });
    if (r.error) {
      console.log("signIn:", "ERROR " + r.error.message);
      process.exit(1);
    }
    data = r.data;
  }
}
console.log("sesion:", data.session ? "OK " + data.session.user.id : "NO");

// 1) leer eventos con fotos
const { data: eventos, error: eEv } = await supabase
  .from("eventos")
  .select("id, fecha, evento, fotos")
  .order("fecha", { ascending: false })
  .limit(10);

console.log("eventos:", eEv ? "ERROR " + eEv.message : eventos?.length);
const conFotos = (eventos || []).filter((ev) => (ev.fotos || []).length > 0);
console.log("eventos con fotos:", conFotos.length);
for (const ev of conFotos.slice(0, 5)) {
  console.log("  ", ev.fecha, "|", ev.evento, "| fotos:", JSON.stringify(ev.fotos));
}

// 2) listar el bucket con sesion
const { data: objetos, error: eList } = await supabase.storage
  .from("fotos-eventos")
  .list("", { limit: 50 });
console.log("list fotos-eventos:", eList ? "ERROR " + eList.message : "OK " + (objetos || []).length);
if (objetos) for (const o of objetos.slice(0, 10)) console.log("   ", o.name, o.id);

// 3) probar signed URLs con las primeras rutas reales
const rutas = [...new Set(conFotos.flatMap((ev) => ev.fotos))];
if (rutas.length) {
  const { data: urls, error: eUrl } = await supabase.storage
    .from("fotos-eventos")
    .createSignedUrls(rutas.slice(0, 5), 3600);
  console.log("createSignedUrls:", eUrl ? "ERROR " + eUrl.message : "OK");
  for (const u of urls || []) {
    console.log("   path:", u.path, "|", u.signedUrl ? "URL OK" : "SIN URL", u.error || "");
  }
} else {
  console.log("no hay rutas de fotos en los ultimos eventos");
}
