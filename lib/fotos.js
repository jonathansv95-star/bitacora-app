import { supabase } from "./supabase";

export const BUCKET = "fotos-eventos";

// --- base64 -> ArrayBuffer (sin dependencias extra) ---
const TABLA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = new Uint8Array(256);
for (let i = 0; i < TABLA.length; i++) LOOKUP[TABLA.charCodeAt(i)] = i;

function base64ABytes(base64) {
  const limpio = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const largo = limpio.length;
  const total = Math.floor((largo * 3) / 4);
  const bytes = new Uint8Array(total);
  let p = 0;

  for (let i = 0; i < largo; i += 4) {
    const c0 = LOOKUP[limpio.charCodeAt(i)];
    const c1 = LOOKUP[limpio.charCodeAt(i + 1)] || 0;
    const c2 = LOOKUP[limpio.charCodeAt(i + 2)] || 0;
    const c3 = LOOKUP[limpio.charCodeAt(i + 3)] || 0;

    if (p < total) bytes[p++] = (c0 << 2) | (c1 >> 4);
    if (p < total) bytes[p++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (p < total) bytes[p++] = ((c2 & 3) << 6) | c3;
  }

  return bytes.buffer;
}

function extensionDe(uri = "") {
  const limpio = uri.split("?")[0].toLowerCase();
  if (limpio.endsWith(".png")) return { ext: "png", mime: "image/png" };
  if (limpio.endsWith(".webp")) return { ext: "webp", mime: "image/webp" };
  return { ext: "jpg", mime: "image/jpeg" };
}

/**
 * Sube al bucket las fotos seleccionadas.
 * fotos: [{ uri, base64 }]  ->  devuelve las rutas guardadas: ["userId/eventoId/archivo.jpg", ...]
 */
export async function subirFotos(fotos, eventoId) {
  if (!fotos || fotos.length === 0) return [];

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || "anon";
  const rutas = [];

  for (let i = 0; i < fotos.length; i++) {
    const foto = fotos[i];
    if (!foto?.base64) continue;

    const { ext, mime } = extensionDe(foto.uri);
    const nombre = `${Date.now()}_${i}.${ext}`;
    const ruta = `${userId}/${eventoId}/${nombre}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(ruta, base64ABytes(foto.base64), {
        contentType: mime,
        upsert: false,
      });

    if (error) throw new Error(`No se pudo subir la foto ${i + 1}: ${error.message}`);
    rutas.push(ruta);
  }

  return rutas;
}

/**
 * Convierte rutas del bucket en URLs temporales para poder mostrarlas.
 * Devuelve [{ ruta, url }] en el mismo orden.
 */
export async function urlsDeFotos(rutas, segundos = 3600) {
  if (!rutas || rutas.length === 0) return [];

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rutas, segundos);

  if (error || !data) return [];

  return rutas
    .map((ruta) => {
      const encontrada = data.find((d) => d.path === ruta);
      return encontrada?.signedUrl ? { ruta, url: encontrada.signedUrl } : null;
    })
    .filter(Boolean);
}

/** Borra fotos del bucket (por ejemplo al eliminar un evento). */
export async function borrarFotos(rutas) {
  if (!rutas || rutas.length === 0) return;
  await supabase.storage.from(BUCKET).remove(rutas);
}
