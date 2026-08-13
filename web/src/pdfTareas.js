import { jsPDF } from "jspdf";
import { supabase } from "./supabase";

const BUCKET = "fotos-tareas";
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const AZUL = [20, 60, 130];
const GRIS_OSCURO = [30, 30, 30];
const GRIS_MEDIO = [70, 70, 70];
const GRIS_CLARO = [150, 150, 150];

const CP1252_REV = {
  0x20ac: 0x80, 0x201a: 0x82, 0x192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x2c6: 0x88, 0x2030: 0x89, 0x160: 0x8a,
  0x2039: 0x8b, 0x152: 0x8c, 0x17d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x2dc: 0x98, 0x2122: 0x99, 0x161: 0x9a, 0x203a: 0x9b, 0x153: 0x9c,
  0x17e: 0x9e, 0x178: 0x9f,
};

function arreglarTexto(s) {
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
  let out = "";
  try {
    out = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
  } catch (e) {
    return s;
  }
  if (out.includes("\ufffd")) return s;
  return out;
}

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ultimoDia(mes, anio) {
  return new Date(anio, mes, 0).getDate();
}

function fechaCompleta(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;
}

async function urlABase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function dimsDeImagen(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

export async function descargarPdfMesAnterior() {
  const hoy = new Date();
  let anio = hoy.getFullYear();
  let mes = hoy.getMonth();
  if (mes === 0) {
    mes = 11;
    anio -= 1;
  } else {
    mes -= 1;
  }
  const inicio = `${anio}-${String(mes + 1).padStart(2, "0")}-01`;
  const fin = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(ultimoDia(mes + 1, anio)).padStart(2, "0")}`;
  await generarPdf({ inicio, fin, titulo: `${MESES[mes]} ${anio}` });
}

export async function descargarPdfMesActual() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const inicio = `${anio}-${String(mes + 1).padStart(2, "0")}-01`;
  const fin = hoyISO();
  await generarPdf({ inicio, fin, titulo: `${MESES[mes]} ${anio}` });
}

// ----- helpers de maquetación -----
function asegurar(doc, y, alto) {
  if (y + alto > 282) {
    doc.addPage();
    return 20;
  }
  return y;
}

function escribirParrafo(doc, texto, x, maxW, y, tam, color, estilo) {
  doc.setFontSize(tam).setFont("helvetica", estilo || "normal").setTextColor(...color);
  const lineas = doc.splitTextToSize(arreglarTexto(texto), maxW);
  for (const l of lineas) {
    y = asegurar(doc, y, tam * 0.5);
    doc.text(l, x, y);
    y += tam * 0.5;
  }
  return y;
}

function seccion(doc, titulo, texto, x, maxW, y) {
  y = asegurar(doc, y, 8);
  doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(...GRIS_OSCURO);
  doc.text(`${titulo}:`, x, y);
  y += 4.5;
  return escribirParrafo(doc, texto, x + 3, maxW - 3, y, 8.5, GRIS_MEDIO);
}

function seccionPasos(doc, pasos, x, maxW, y) {
  y = asegurar(doc, y, 8);
  doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(...GRIS_OSCURO);
  doc.text("Pasos a seguir:", x, y);
  y += 4.5;
  doc.setFontSize(8.5).setFont("helvetica", "normal").setTextColor(...GRIS_MEDIO);
  pasos.forEach((paso, i) => {
    const lineas = doc.splitTextToSize(`${i + 1}. ${arreglarTexto(paso)}`, maxW - 6);
    for (const l of lineas) {
      y = asegurar(doc, y, 4.2);
      doc.text(l, x + 5, y);
      y += 4.2;
    }
  });
  return y;
}

function seccionEquipo(doc, equipo, x, maxW, y) {
  y = asegurar(doc, y, 8);
  doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(...GRIS_OSCURO);
  doc.text("Equipo necesario:", x, y);
  y += 4.5;
  for (const [cat, items] of Object.entries(equipo || {})) {
    y = asegurar(doc, y, 4.2);
    doc.setFontSize(8.5).setFont("helvetica", "bold").setTextColor(...GRIS_MEDIO);
    doc.text(`- ${arreglarTexto(cat)}:`, x + 3, y);
    y += 4.2;
    doc.setFont("helvetica", "normal").setTextColor(...GRIS_MEDIO);
    for (const item of items || []) {
      const lineas = doc.splitTextToSize(`• ${arreglarTexto(item)}`, maxW - 8);
      for (const l of lineas) {
        y = asegurar(doc, y, 4.2);
        doc.text(l, x + 7, y);
        y += 4.2;
      }
    }
  }
  return y;
}

async function generarPdf({ inicio, fin, titulo }) {
  const { data: tareas, error } = await supabase
    .from("tareas")
    .select("*")
    .eq("estado", "hecha")
    .eq("archivada", false)
    .gte("fecha", inicio)
    .lte("fecha", fin)
    .order("fecha")
    .order("hora_inicio");

  if (error) throw error;
  const lista = tareas || [];
  if (lista.length === 0) throw new Error("No hay tareas realizadas en ese periodo.");

  const { data: procs } = await supabase.from("procedimientos").select("*");
  const procMap = {};
  for (const p of procs || []) procMap[p.numero] = p;

  const ids = lista.map((t) => t.id);
  const ejecuciones = [];
  for (let i = 0; i < ids.length; i += 200) {
    const lote = ids.slice(i, i + 200);
    const { data: ej } = await supabase
      .from("tarea_ejecuciones")
      .select("tarea_id, foto_url, observaciones")
      .in("tarea_id", lote);
    ejecuciones.push(...(ej || []));
  }
  const ejPorTarea = {};
  for (const e of ejecuciones) {
    if (!ejPorTarea[e.tarea_id]) ejPorTarea[e.tarea_id] = [];
    ejPorTarea[e.tarea_id].push(e);
  }

  const rutas = [...new Set(ejecuciones.map((e) => e.foto_url).filter(Boolean))];
  const urlPorRuta = {};
  for (let i = 0; i < rutas.length; i += 100) {
    const lote = rutas.slice(i, i + 100);
    const { data: urls } = await supabase.storage.from(BUCKET).createSignedUrls(lote, 3600);
    for (const u of urls || []) if (u?.path && u?.signedUrl) urlPorRuta[u.path] = u.signedUrl;
  }

  let logoBase64 = null;
  try {
    logoBase64 = await urlABase64("/logo.png");
  } catch (e) {}

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const margen = 18;
  const anchoUtil = W - margen * 2;
  let y = 20;

  // ---- Encabezado ----
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margen, 14, 20, 20);
    } catch (e) {}
  }
  doc.setFontSize(15).setFont("helvetica", "bold").setTextColor(...AZUL);
  doc.text("GRUPO ORTIZ", W / 2, 22, { align: "center" });
  doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(...GRIS_MEDIO);
  doc.text("Plan Preventivo Independencia", W / 2, 29, { align: "center" });
  doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(...GRIS_OSCURO);
  doc.text("REPORTE DE TAREAS REALIZADAS", W / 2, 37, { align: "center" });
  doc.setFontSize(11).setFont("helvetica", "bold").setTextColor(...AZUL);
  doc.text(titulo.toUpperCase(), W / 2, 44, { align: "center" });
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.6);
  doc.line(margen, 49, W - margen, 49);
  y = 56;

  for (const t of lista) {
    const procsDeTarea = (t.procedimientos || []).map((n) => procMap[n]).filter(Boolean);
    const ejs = ejPorTarea[t.id] || [];

    // Título de la tarea
    y = asegurar(doc, y, 12);
    doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(...GRIS_OSCURO);
    const nombre = arreglarTexto(t.descripcion).toUpperCase();
    const lNombre = doc.splitTextToSize(nombre, anchoUtil);
    doc.text(lNombre, margen, y);
    y += lNombre.length * 5 + 2;

    // Metadatos
    let meta = `Fecha: ${fechaCompleta(t.fecha)}`;
    if (t.hora_inicio) meta += `   ·   Horario: ${String(t.hora_inicio).slice(0, 5)} – ${t.hora_fin ? String(t.hora_fin).slice(0, 5) : ""}`;
    if (t.duracion) meta += `   ·   Duración: ${t.duracion} h`;
    if (t.frecuencia) meta += `   ·   Frecuencia: ${t.frecuencia}`;
    if (t.codigo) meta += `   ·   Código: ${t.codigo}`;
    y = escribirParrafo(doc, meta, margen, anchoUtil, y, 8.5, GRIS_CLARO);
    y += 2;

    // Procedimientos (manual)
    for (const p of procsDeTarea) {
      y = asegurar(doc, y, 8);
      doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(...AZUL);
      const enc = `Procedimiento P-${p.numero} · ${arreglarTexto(p.titulo)}`;
      const lEnc = doc.splitTextToSize(enc, anchoUtil);
      doc.text(lEnc, margen, y);
      y += lEnc.length * 4.8 + 2;

      if (p.objeto) y = seccion(doc, "Objeto", p.objeto, margen, anchoUtil, y);
      if (p.alcance) y = seccion(doc, "Alcance", p.alcance, margen, anchoUtil, y);
      if (p.condicionantes) y = seccion(doc, "Condicionantes", p.condicionantes, margen, anchoUtil, y);
      if (p.pasos && p.pasos.length) y = seccionPasos(doc, p.pasos, margen, anchoUtil, y);
      if (p.equipo && typeof p.equipo === "object") y = seccionEquipo(doc, p.equipo, margen, anchoUtil, y);
      y += 3;
    }

    // Observaciones
    for (const e of ejs) {
      if (!e.observaciones) continue;
      y = asegurar(doc, y, 6);
      doc.setFontSize(9).setFont("helvetica", "bolditalic").setTextColor(...GRIS_OSCURO);
      doc.text("Observaciones:", margen, y);
      y += 4.5;
      y = escribirParrafo(doc, e.observaciones, margen, anchoUtil, y, 8.5, GRIS_MEDIO, "italic");
    }

    // Evidencia (fotos)
    for (const e of ejs) {
      if (!e.foto_url) continue;
      const url = urlPorRuta[e.foto_url];
      if (!url) continue;
      try {
        const dataUrl = await urlABase64(url);
        const dims = await dimsDeImagen(dataUrl);
        const w = 72;
        let h = dims.h > 0 ? (w * dims.h) / dims.w : 60;
        if (h > 90) h = 90;
        y = asegurar(doc, y, h + 10);
        doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(...GRIS_CLARO);
        doc.text("Evidencia fotográfica", margen, y);
        y += 3.5;
        y = asegurar(doc, y, h + 4);
        const formato = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, formato, margen, y, w, h);
        y += h + 5;
      } catch (e2) {}
    }

    // Separador
    y = asegurar(doc, y, 8);
    doc.setDrawColor(...GRIS_CLARO);
    doc.setLineWidth(0.25);
    doc.line(margen, y, W - margen, y);
    y += 10;
  }

  // Pie de página
  const np = doc.getNumberOfPages();
  const fechaGen = new Date().toLocaleDateString("es-ES");
  for (let i = 1; i <= np; i++) {
    doc.setPage(i);
    doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(...GRIS_CLARO);
    doc.text(`Página ${i} de ${np}`, W / 2, H - 8, { align: "center" });
    doc.text(`Generado: ${fechaGen}`, W - margen, H - 8, { align: "right" });
  }

  doc.save(`Tareas-realizadas-${titulo.replace(/\s+/g, "-")}.pdf`);
}
