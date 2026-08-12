import { supabase } from "./supabase";

export const BUCKET_TAREAS = "fotos-tareas";

// Corrige texto guardado con doble codificación (mojibake, ej: "TÃ©c" -> "Téc").
const CP1252_REV = {
  0x20ac: 0x80, 0x201a: 0x82, 0x192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x2c6: 0x88, 0x2030: 0x89, 0x160: 0x8a,
  0x2039: 0x8b, 0x152: 0x8c, 0x17d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x2dc: 0x98, 0x2122: 0x99, 0x161: 0x9a, 0x203a: 0x9b, 0x153: 0x9c,
  0x17e: 0x9e, 0x178: 0x9f,
};

function utf8Decodificar(bytes) {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i += 1;
    } else if (b < 0xe0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if (b < 0xf0) {
      out += String.fromCharCode(
        ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f)
      );
      i += 3;
    } else {
      const cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      out += String.fromCodePoint(cp);
      i += 4;
    }
  }
  return out;
}

export function arreglarTexto(s) {
  if (s == null || typeof s !== "string") return s;
  if (!/[\u00c2\u00c3\u00e2]/.test(s)) return s;
  const bytes = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp > 0xff) {
      if (CP1252_REV[cp] !== undefined) bytes.push(CP1252_REV[cp]);
      else return s;
    } else {
      bytes.push(cp);
    }
  }
  const out = utf8Decodificar(bytes);
  if (out.includes("\ufffd")) return s;
  return out;
}

// ---------- Consultas ----------
export async function cargarTareas() {
  const { data, error } = await supabase
    .from("tareas")
    .select("*")
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function cargarProcedimientos() {
  const { data, error } = await supabase
    .from("procedimientos")
    .select("*")
    .order("numero");
  if (error) throw error;
  return (data || []).map((p) => ({
    ...p,
    titulo: arreglarTexto(p.titulo),
    objeto: arreglarTexto(p.objeto),
    alcance: arreglarTexto(p.alcance),
    responsable: arreglarTexto(p.responsable),
    condicionantes: arreglarTexto(p.condicionantes),
    pasos: Array.isArray(p.pasos) ? p.pasos.map(arreglarTexto) : p.pasos,
    equipo: Object.fromEntries(
      Object.entries(p.equipo || {}).map(([cat, items]) => [
        arreglarTexto(cat),
        Array.isArray(items) ? items.map(arreglarTexto) : items,
      ])
    ),
  }));
}

// ---------- Estado de una tarea ----------
export const ETIQUETAS_ESTADO = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  hecha: "Hecha",
};

export function estaHecha(tarea) {
  return tarea?.estado === "hecha";
}

export function estadoClasificacion(tarea, hoy) {
  if (estaHecha(tarea)) return "completada";
  const fecha = tarea?.fecha;
  if (!fecha) return "pendiente";
  const clave = hoy || hoyLocal();
  if (fecha < clave) return "atrasada";
  if (fecha === clave) return "hoy";
  return "pendiente";
}

/** Nombre visible de la tarea: actividad y, si falta, la descripción. */
export function nombreDeTarea(tarea) {
  const nombre = (tarea?.actividad || "").trim();
  if (nombre) return nombre;
  return (tarea?.descripcion || "").trim() || "Tarea sin nombre";
}

export function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

export function formatoFecha(fecha) {
  if (!fecha) return "";
  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;
  const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  return d.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------- Fotos ----------
const TABLA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = new Uint8Array(256);
for (let i = 0; i < TABLA.length; i++) LOOKUP[TABLA.charCodeAt(i)] = i;

function base64ABytes(base64) {
  const limpio = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const total = Math.floor((limpio.length * 3) / 4);
  const bytes = new Uint8Array(total);
  let p = 0;
  for (let i = 0; i < limpio.length; i += 4) {
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

/** Sube una foto de evidencia. Devuelve la ruta guardada. */
export async function subirFotoTarea(foto, tareaId) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || "anon";
  const { ext, mime } = extensionDe(foto?.uri);
  const ruta = `${userId}/${tareaId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET_TAREAS)
    .upload(ruta, base64ABytes(foto.base64), { contentType: mime, upsert: false });
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
  return ruta;
}

export async function urlDeFoto(ruta) {
  if (!ruta) return null;
  const { data } = await supabase.storage
    .from(BUCKET_TAREAS)
    .createSignedUrls([ruta], 3600);
  return data?.[0]?.signedUrl || null;
}

// ---------- Marcar hecha ----------
export async function marcarHecha(tarea, foto, observaciones) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Sin sesión");

  let fotoUrl = null;
  if (foto?.base64) {
    fotoUrl = await subirFotoTarea(foto, tarea.id);
  }

  const { error: errorEjecucion } = await supabase.from("tarea_ejecuciones").insert({
    tarea_id: tarea.id,
    user_id: userId,
    foto_url: fotoUrl,
    observaciones: observaciones || null,
    ejecutado_en: new Date().toISOString(),
  });
  if (errorEjecucion) throw errorEjecucion;

  const { error: errorTarea } = await supabase
    .from("tareas")
    .update({ estado: "hecha" })
    .eq("id", tarea.id);
  if (errorTarea) throw errorTarea;
}

export async function ejecucionDeTarea(tareaId) {
  const { data, error } = await supabase
    .from("tarea_ejecuciones")
    .select("*")
    .eq("tarea_id", tareaId)
    .order("ejecutado_en", { ascending: false });
  if (error) throw error;
  return data || [];
}
