import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { supabase } from "../lib/supabase";
import { urlsDeFotos } from "../lib/fotos";
import { colores, espacio, radio, tipografia } from "../lib/tema";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const ENCABEZADOS = [
  "HORA", "DE", "RESPONSABLE", "MEDIO DE DETECCIÓN", "CT", "INVERSOR",
  "TRACKER", "STRING", "DISPOSITIVO", "CANTIDAD", "EVENTO", "SOLUCION",
  "RESPONSABLE", "DESCRIPCIÓN", "N° CORRECTIVO",
];

// Ancho de cada columna base (en caracteres)
const ANCHOS = [8, 14, 14, 14, 8, 9, 9, 8, 16, 10, 45, 45, 14, 45, 14];

// Los enlaces de las fotos duran un año desde que se genera el Excel.
const VIGENCIA_ENLACES = 60 * 60 * 24 * 365;

const COLOR_PRIMARIO = "2563EB";
const COLOR_PRIMARIO_CLARO = "DBEAFE";
const COLOR_BORDE = "D1D5DB";
const COLOR_FONDO_FILA = "F8FAFC";

function pad(n) {
  return String(n).padStart(2, "0");
}

function ordenarStrings(a, b) {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
  const horaA = (a.hora || "").slice(0, 5);
  const horaB = (b.hora || "").slice(0, 5);
  if (horaA !== horaB) return horaA < horaB ? -1 : 1;

  const dispositivoA = String(a.dispositivo || "").toLowerCase();
  const dispositivoB = String(b.dispositivo || "").toLowerCase();
  const grupoA = dispositivoA.includes("rojo") ? 0 : dispositivoA.includes("negro") ? 1 : 2;
  const grupoB = dispositivoB.includes("rojo") ? 0 : dispositivoB.includes("negro") ? 1 : 2;
  return grupoA - grupoB || Number(a.string_num || 0) - Number(b.string_num || 0);
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

/** Genera un enlace temporal por cada foto del mes. Devuelve { ruta: url }. */
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

export default function ExportarScreen() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [generando, setGenerando] = useState(false);
  const [progreso, setProgreso] = useState("");

  async function exportar() {
    setGenerando(true);
    setProgreso("Leyendo eventos...");
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
        Alert.alert("Sin datos", "No hay eventos registrados en ese mes.");
        setGenerando(false);
        setProgreso("");
        return;
      }

      data.sort(ordenarStrings);

      setProgreso("Preparando enlaces de fotos...");
      const fotosPorRuta = await mapaDeFotos(data);

      setProgreso("Armando el archivo...");
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

          // ---- Fila 0: título del día ----
          const titulo = `BITÁCORA PLANTA INDEPENDENCIA — ${d}-${m}-${y}`;
          const filaTitulo = new Array(totalCols).fill("");
          filaTitulo[0] = titulo;

          // ---- Fila 1: subtítulo "Descripción" sobre RESPONSABLE/DESCRIPCIÓN ----
          const filaSub = new Array(totalCols).fill("");
          filaSub[12] = "Descripción";
          filaSub[13] = "Descripción";

          // ---- Fila 2: encabezados ----
          const encabezados = [...ENCABEZADOS];
          for (let i = 1; i <= maxFotos; i++) encabezados.push(`FOTO ${i}`);

          const filas = [filaTitulo, filaSub, encabezados];

          // ---- Filas de datos ----
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

          // ---- Estilos ----
          // Título (fila 0) fusionado en todo el ancho
          ws["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
            { s: { r: 1, c: 12 }, e: { r: 1, c: 13 } },
          ];
          aplicarEstilo(ws, "A1", {
            font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: COLOR_PRIMARIO } },
            alignment: { horizontal: "center", vertical: "center" },
          });

          // Subtítulo "Descripción"
          aplicarEstilo(ws, "M2", {
            font: { bold: true, color: { rgb: "1D4ED8" } },
            fill: { fgColor: { rgb: COLOR_PRIMARIO_CLARO } },
            alignment: { horizontal: "center", vertical: "center" },
          });

          // Encabezados (fila 2)
          encabezados.forEach((_, c) => {
            const ref = XLSX.utils.encode_cell({ r: 2, c });
            aplicarEstilo(ws, ref, {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: COLOR_PRIMARIO } },
              alignment: { horizontal: "center", vertical: "center", wrapText: true },
              ...bordeFino(),
            });
          });

          // Filas de datos
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

          // Convierte las celdas de foto en enlaces clicables
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

          // Anchos de columna y altura del título
          ws["!cols"] = anchos.map((wch) => ({ wch }));
          ws["!rows"] = [{ hpt: 24 }, {}, {}];

          // Filtros automáticos sobre los encabezados
          try {
            ws["!autofilter"] = {
              ref: `A3:${ultimaCol}${ultimaFila}`,
            };
          } catch (_) {}

          // Panel congelado: deja visibles título + encabezados
          try {
            ws["!freeze"] = { xSplit: 0, ySplit: 3, topLeftCell: "A4" };
          } catch (_) {}

          XLSX.utils.book_append_sheet(wb, ws, nombreHoja.slice(0, 31));
        });

      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const nombreArchivo = `Bitacoras_${MESES[mes]}_${anio}.xlsx`;
      const uri = FileSystem.cacheDirectory + nombreArchivo;

      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: nombreArchivo,
        });
      } else {
        Alert.alert("Listo", `Archivo generado en: ${uri}`);
      }
    } catch (e) {
      Alert.alert("Error al exportar", e.message);
    }
    setGenerando(false);
    setProgreso("");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.etiqueta}>Selecciona el mes a exportar</Text>

      <View style={styles.filaSelector}>
        <TouchableOpacity onPress={() => setMes((m) => (m === 0 ? 11 : m - 1))} style={styles.flecha}>
          <Text style={styles.flechaTexto}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.mesTexto}>
          {MESES[mes]} {anio}
        </Text>
        <TouchableOpacity
          onPress={() => setMes((m) => (m === 11 ? 0 : m + 1))}
          style={styles.flecha}
        >
          <Text style={styles.flechaTexto}>▶</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.boton} onPress={exportar} disabled={generando}>
        {generando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>📥 Generar y compartir Excel</Text>
        )}
      </TouchableOpacity>

      {generando && progreso ? <Text style={styles.progreso}>{progreso}</Text> : null}

      <View style={styles.notaCaja}>
        <Text style={styles.nota}>
          El Excel tendrá una pestaña por cada día con eventos registrados, con
          título, encabezados resaltados, filtros y columnas ajustadas.
        </Text>
      </View>

      <View style={styles.notaCaja}>
        <Text style={styles.nota}>
          Los eventos con fotos llevan columnas extra al final ("FOTO 1", "FOTO 2"...).
          Cada celda es un enlace: al hacer clic, la imagen se abre en el navegador.
          Los enlaces funcionan durante un año y necesitan internet.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo, padding: espacio.xxl, paddingTop: 40 },
  etiqueta: { fontSize: tipografia.cuerpo, fontWeight: tipografia.pesoMedia, color: colores.texto, marginBottom: espacio.lg },
  filaSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espacio.xxxl,
  },
  flecha: { padding: espacio.md },
  flechaTexto: { fontSize: 20, color: colores.primario },
  mesTexto: { fontSize: 20, fontWeight: tipografia.pesoNegrita, marginHorizontal: 20, textTransform: "capitalize", color: colores.texto },
  boton: {
    backgroundColor: colores.primario,
    borderRadius: radio.md,
    padding: 16,
    alignItems: "center",
  },
  botonTexto: { color: "#fff", fontSize: tipografia.cuerpo, fontWeight: tipografia.pesoMedia },
  progreso: { textAlign: "center", color: colores.primario, marginTop: espacio.md, fontSize: 13 },
  notaCaja: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    padding: espacio.lg,
    marginTop: espacio.lg,
  },
  nota: { color: colores.textoSuave, fontSize: tipografia.chica, textAlign: "center" },
});
