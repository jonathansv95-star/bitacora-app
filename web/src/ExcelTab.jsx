import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabase";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const ENCABEZADOS = [
  "HORA", "DE", "RESPONSABLE", "MEDIO DE DETECCIÓN", "CT", "INVERSOR",
  "TRACKER", "STRING", "DISPOSITIVO", "CANTIDAD", "EVENTO", "SOLUCION",
  "RESPONSABLE", "DESCRIPCIÓN", "N° CORRECTIVO",
];

const ANCHOS = [8, 14, 14, 14, 8, 9, 9, 8, 16, 10, 45, 45, 14, 45, 14];

const VIGENCIA_ENLACES = 60 * 60 * 24 * 365;

const COLOR_PRIMARIO = "2563EB";
const COLOR_PRIMARIO_CLARO = "DBEAFE";
const COLOR_BORDE = "D1D5DB";
const COLOR_FONDO_FILA = "F8FAFC";

function pad(n) {
  return String(n).padStart(2, "0");
}

function ordenarStrings(a, b) {
  if (a.fecha !== b.fecha || a.hora?.slice(0, 5) !== b.hora?.slice(0, 5)) return 0;
  const dispositivoA = String(a.dispositivo || "").toLowerCase();
  const dispositivoB = String(b.dispositivo || "").toLowerCase();
  const esStringA = dispositivoA.includes("cable solar rojo") || dispositivoA.includes("cable solar negro");
  const esStringB = dispositivoB.includes("cable solar rojo") || dispositivoB.includes("cable solar negro");
  if (!esStringA || !esStringB) return 0;

  const colorA = dispositivoA.includes("rojo") ? 0 : 1;
  const colorB = dispositivoB.includes("rojo") ? 0 : 1;
  return colorA - colorB || Number(a.string_num || 0) - Number(b.string_num || 0);
}

function bordeFino() {
  return {
    top: { style: "thin", color: { rgb: COLOR_BORDE } },
    bottom: { style: "thin", color: { rgb: COLOR_BORDE } },
    left: { style: "thin", color: { rgb: COLOR_BORDE } },
    right: { style: "thin", color: { rgb: COLOR_BORDE } },
  };
}

function aplicarEstilo(ws, ref, estilo) {
  const celda = ws[ref] || { t: "s", v: "" };
  ws[ref] = { ...celda, s: { ...celda.s, ...estilo } };
}

async function mapaDeFotos(eventos) {
  const rutas = [];
  eventos.forEach((ev) => {
    (ev.fotos || []).forEach((r) => rutas.push(r));
  });

  const mapa = {};
  for (let i = 0; i < rutas.length; i += 100) {
    const lote = rutas.slice(i, i + 100);
    const urls = await urlsDeFotos(lote, VIGENCIA_ENLACES);
    urls.forEach(({ ruta, url }) => {
      mapa[ruta] = url;
    });
  }
  return mapa;
}

async function urlsDeFotos(rutas, segundos) {
  if (!rutas || rutas.length === 0) return [];
  const { data, error } = await supabase.storage
    .from("fotos-eventos")
    .createSignedUrls(rutas, segundos);
  if (error || !data) return [];
  return rutas
    .map((ruta) => {
      const encontrada = data.find((d) => d.path === ruta);
      return encontrada?.signedUrl ? { ruta, url: encontrada.signedUrl } : null;
    })
    .filter(Boolean);
}

export default function ExcelTab() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function exportar() {
    setGenerando(true);
    setMensaje("Leyendo eventos...");
    try {
      const primerDia = `${anio}-${pad(mes + 1)}-01`;
      const ultimoDiaNum = new Date(anio, mes + 1, 0).getDate();
      const ultimoDia = `${anio}-${pad(mes + 1)}-${pad(ultimoDiaNum)}`;

      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .gte("fecha", primerDia)
        .lte("fecha", ultimoDia)
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setMensaje("No hay eventos registrados en ese mes.");
        setGenerando(false);
        return;
      }

      data.sort(ordenarStrings);

      setMensaje("Preparando enlaces de fotos...");
      const fotosPorRuta = await mapaDeFotos(data);

      setMensaje("Armando el archivo...");
      const porFecha = {};
      data.forEach((ev) => {
        if (!porFecha[ev.fecha]) porFecha[ev.fecha] = [];
        porFecha[ev.fecha].push(ev);
      });

      const wb = XLSX.utils.book_new();

      Object.keys(porFecha)
        .sort()
        .forEach((fecha) => {
          const [y, m, d] = fecha.split("-");
          const nombreHoja = `${d}-${m}-${y}`;
          const eventosDelDia = porFecha[fecha];

          const maxFotos = eventosDelDia.reduce(
            (max, ev) => Math.max(max, (ev.fotos || []).length),
            0
          );

          const anchos = [...ANCHOS];
          for (let i = 1; i <= maxFotos; i++) anchos.push(12);
          const totalCols = anchos.length;

          const titulo = `BITÁCORA PLANTA INDEPENDENCIA — ${d}-${m}-${y}`;
          const filaTitulo = new Array(totalCols).fill("");
          filaTitulo[0] = titulo;

          const filaSub = new Array(totalCols).fill("");
          filaSub[12] = "Descripción";
          filaSub[13] = "Descripción";

          const encabezados = [...ENCABEZADOS];
          for (let i = 1; i <= maxFotos; i++) encabezados.push(`FOTO ${i}`);

          const filas = [filaTitulo, filaSub, encabezados];

          const enlaces = [];
          eventosDelDia.forEach((ev) => {
            const fila = [
              ev.hora ? ev.hora.slice(0, 5) : "",
              ev.de || "La Independencia",
              ev.responsable || "",
              ev.medio_deteccion || "",
              ev.ct || "",
              ev.inversor || "",
              ev.tracker || "",
              ev.string_num || "",
              ev.dispositivo || "",
              ev.cantidad || "",
              ev.evento || "",
              ev.solucion || "",
              ev.responsable_desc || "Ortiz",
              ev.descripcion || "",
              ev.n_correctivo || "",
            ];

            const rutasEvento = ev.fotos || [];
            for (let i = 0; i < maxFotos; i++) {
              const ruta = rutasEvento[i];
              const url = ruta ? fotosPorRuta[ruta] : null;
              fila.push(url ? `Ver foto ${i + 1}` : "");
              if (url) {
                enlaces.push({
                  r: filas.length,
                  c: ENCABEZADOS.length + i,
                  url,
                  texto: `Ver foto ${i + 1}`,
                });
              }
            }

            filas.push(fila);
          });

          const ws = XLSX.utils.aoa_to_sheet(filas);
          const ultimaCol = XLSX.utils.encode_col(totalCols - 1);
          const ultimaFila = filas.length - 1;

          ws["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
            { s: { r: 1, c: 12 }, e: { r: 1, c: 13 } },
          ];

          aplicarEstilo(ws, "A1", {
            font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: COLOR_PRIMARIO } },
            alignment: { horizontal: "center", vertical: "center" },
          });

          aplicarEstilo(ws, "M2", {
            font: { bold: true, color: { rgb: "1D4ED8" } },
            fill: { fgColor: { rgb: COLOR_PRIMARIO_CLARO } },
            alignment: { horizontal: "center", vertical: "center" },
          });

          encabezados.forEach((_, c) => {
            const ref = XLSX.utils.encode_cell({ r: 2, c });
            aplicarEstilo(ws, ref, {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: COLOR_PRIMARIO } },
              alignment: { horizontal: "center", vertical: "center", wrapText: true },
              ...bordeFino(),
            });
          });

          for (let r = 3; r <= ultimaFila; r++) {
            for (let c = 0; c < totalCols; c++) {
              const ref = XLSX.utils.encode_cell({ r, c });
              const esImpar = (r - 3) % 2 === 1;
              aplicarEstilo(ws, ref, {
                alignment: { vertical: "top", wrapText: true },
                ...bordeFino(),
                ...(esImpar ? { fill: { fgColor: { rgb: COLOR_FONDO_FILA } } } : {}),
              });
            }
          }

          enlaces.forEach(({ r, c, url, texto }) => {
            const ref = XLSX.utils.encode_cell({ r, c });
            ws[ref] = {
              t: "s",
              v: texto,
              l: { Target: url, Tooltip: "Abrir la foto en el navegador" },
              s: {
                font: { color: { rgb: "1D4ED8" }, underline: true },
                alignment: { vertical: "top" },
                ...bordeFino(),
              },
            };
          });

          ws["!cols"] = anchos.map((wch) => ({ wch }));
          ws["!rows"] = [{ hpt: 24 }, {}, {}];

          try {
            ws["!autofilter"] = { ref: `A3:${ultimaCol}${ultimaFila}` };
          } catch (_) {}
          try {
            ws["!freeze"] = { xSplit: 0, ySplit: 3, topLeftCell: "A4" };
          } catch (_) {}

          XLSX.utils.book_append_sheet(wb, ws, nombreHoja.slice(0, 31));
        });

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bitacoras_${MESES[mes]}_${anio}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMensaje(`Excel descargado con ${data.length} evento(s).`);
    } catch (e) {
      setMensaje("Error al generar el Excel: " + e.message);
    }
    setGenerando(false);
  }

  return (
    <div className="tarjeta excel-tarjeta">
      <h2>📊 Bitácoras mensuales</h2>
      <p className="ayuda">
        Genera un reporte con una pestaña por día, como la plantilla de la planta.
        Los eventos con fotos llevan enlaces para verlas.
      </p>

      <div className="fila-selector">
        <button className="btn-secundario" onClick={() => setMes((m) => (m === 0 ? 11 : m - 1))}>
          ◀
        </button>
        <strong className="mes-texto">
          {MESES[mes]} {anio}
        </strong>
        <button className="btn-secundario" onClick={() => setMes((m) => (m === 11 ? 0 : m + 1))}>
          ▶
        </button>
      </div>

      <button className="btn-primario btn-grande" onClick={exportar} disabled={generando}>
        {generando ? "Generando..." : "⬇ Descargar Excel"}
      </button>

      {mensaje && <p className="aviso">{mensaje}</p>}
    </div>
  );
}
