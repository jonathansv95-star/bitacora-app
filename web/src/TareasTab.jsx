import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabase";
import { paginarTareas } from "./tareasAll.js";

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function moverFecha(iso, dias) {
  const [a, m, d] = iso.split("-").map(Number);
  const fecha = new Date(a, m - 1, d + dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function primerLunes(anio, mes) {
  const dow = new Date(anio, mes - 1, 1).getDay();
  const diasHastaLunes = (1 - dow + 7) % 7;
  return 1 + diasHastaLunes;
}

function diasEnMes(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

function nuevaFecha(iso, nuevoAnio) {
  const [a, m, d] = iso.split("-").map(Number);
  const offset = (d - primerLunes(a, m)) / 7;
  if (Number.isInteger(offset) && offset >= 0 && offset <= 4) {
    const nd = Math.min(primerLunes(nuevoAnio, m) + offset * 7, diasEnMes(nuevoAnio, m));
    return `${nuevoAnio}-${String(m).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
  }
  const nd = Math.min(d, diasEnMes(nuevoAnio, m));
  return `${nuevoAnio}-${String(m).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

function fechaBonita(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function normalizar(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Corrige texto guardado con doble codificación (mojibake, ej: "TÃ©c" -> "Téc").
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

function parseFecha(valor) {
  if (valor === null || valor === undefined || valor === "") return null;

  if (typeof valor === "number") {
    const c = XLSX.SSF.parse_date_code(valor);
    if (c) return `${c.y}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;
    return null;
  }

  const s = String(valor).trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${String(+m[2]).padStart(2, "0")}-${String(+m[3]).padStart(2, "0")}`;

  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    const anio = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${anio}-${String(+m[2]).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
}

function estadoDesdeExcel(valor) {
  const n = normalizar(valor);
  if (n.includes("hech") || n.includes("complet") || n.includes("realiz")) return "hecha";
  if (n.includes("progreso")) return "en_progreso";
  return "pendiente";
}

const ETIQUETAS_ESTADO = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  hecha: "Hecha",
};

export default function TareasTab() {
  const [fecha, setFecha] = useState(hoyISO());
  const [tareas, setTareas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [descripcion, setDescripcion] = useState("");
  const [area, setArea] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [importando, setImportando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const archivoRef = useRef(null);
  const [editando, setEditando] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [procedimientos, setProcedimientos] = useState({});
  const [manualAbierto, setManualAbierto] = useState({});

  useEffect(() => {
    supabase
      .from("procedimientos")
      .select("*")
      .then(({ data, error }) => {
        if (!error && data) {
          const mapa = {};
          for (const p of data) mapa[p.numero] = p;
          setProcedimientos(mapa);
        }
      });
  }, []);

  function toggleManual(id) {
    setManualAbierto((actual) => ({ ...actual, [id]: !actual[id] }));
  }

  async function cargar() {
    setCargando(true);
    const { data, error } = await supabase
      .from("tareas")
      .select("*")
      .eq("fecha", fecha)
      .eq("archivada", false)
      .order("hora_inicio", { ascending: true })
      .order("creado_en", { ascending: true });

    if (error) {
      setMensaje("No se pudieron cargar las tareas: " + error.message);
    } else if (data) {
      setTareas(data);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, [fecha]);

  const ordenadas = useMemo(() => {
    const estado = { pendiente: 0, en_progreso: 1, hecha: 2 };
    return [...tareas].sort((a, b) => estado[a.estado] - estado[b.estado]);
  }, [tareas]);

  const resumen = useMemo(() => {
    const hechas = tareas.filter((t) => t.estado === "hecha").length;
    const enProgreso = tareas.filter((t) => t.estado === "en_progreso").length;
    return { total: tareas.length, hechas, enProgreso };
  }, [tareas]);

  async function agregar(e) {
    e.preventDefault();
    if (!descripcion.trim()) {
      setMensaje("Escribe la tarea.");
      return;
    }
    setGuardando(true);
    setMensaje("");
    const { error } = await supabase.from("tareas").insert({
      fecha,
      descripcion: descripcion.trim(),
      area: area.trim(),
      estado: "pendiente",
      prioridad: "normal",
    });
    setGuardando(false);
    if (error) {
      setMensaje("Error al guardar: " + error.message);
      return;
    }
    setDescripcion("");
    setArea("");
    cargar();
  }

  async function cambiarEstado(tarea, estado) {
    const { error } = await supabase.from("tareas").update({ estado }).eq("id", tarea.id);
    if (error) {
      setMensaje("Error: " + error.message);
      return;
    }
    setTareas((actuales) => actuales.map((t) => (t.id === tarea.id ? { ...t, estado } : t)));
  }

  async function borrar(tarea) {
    if (!confirm(`¿Borrar la tarea "${tarea.descripcion}"?`)) return;
    const { error } = await supabase.from("tareas").delete().eq("id", tarea.id);
    if (error) {
      setMensaje("Error: " + error.message);
      return;
    }
    cargar();
  }

  function iniciarEdicion(tarea) {
    setEditando(tarea);
    setEditForm({
      fecha: tarea.fecha,
      descripcion: tarea.descripcion,
      hora_inicio: tarea.hora_inicio || "",
      hora_fin: tarea.hora_fin || "",
      duracion: tarea.duracion || "",
      area: tarea.area || "",
      codigo: tarea.codigo || "",
      frecuencia: tarea.frecuencia || "",
    });
  }

  function cancelarEdicion() {
    setEditando(null);
    setEditForm(null);
  }

  function setCampoEdicion(campo, valor) {
    setEditForm((f) => ({ ...f, [campo]: valor }));
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    if (!editForm || !editForm.descripcion.trim()) {
      setMensaje("La tarea no puede quedar sin descripción.");
      return;
    }
    if (!editForm.fecha) {
      setMensaje("Selecciona la fecha.");
      return;
    }
    setGuardando(true);
    setMensaje("");
    const { error } = await supabase
      .from("tareas")
      .update({
        fecha: editForm.fecha,
        descripcion: editForm.descripcion.trim(),
        hora_inicio: editForm.hora_inicio,
        hora_fin: editForm.hora_fin,
        duracion: Number(editForm.duracion) || 0,
        area: editForm.area.trim(),
        codigo: editForm.codigo.trim(),
        frecuencia: editForm.frecuencia.trim(),
      })
      .eq("id", editando.id);
    setGuardando(false);
    if (error) {
      setMensaje("Error al guardar: " + error.message);
      return;
    }
    setEditando(null);
    setEditForm(null);
    cargar();
  }

  async function importarExcel(file) {
    setImportando(true);
    setMensaje("");
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);

      // Busca la hoja con el cronograma (la que tenga "Fecha" y "Actividad")
      let hoja = null;
      for (const nombre of wb.SheetNames) {
        const filasPrueba = XLSX.utils.sheet_to_json(wb.Sheets[nombre], {
          header: 1,
          defval: "",
        });
        const enc = (filasPrueba[0] || []).map(normalizar);
        if (enc.some((h) => h.includes("actividad")) && enc.some((h) => h.includes("fecha"))) {
          hoja = { nombre, filas: filasPrueba };
          break;
        }
      }
      if (!hoja) {
        // fallback: usa la primera hoja
        const nombre = wb.SheetNames[0];
        hoja = {
          nombre,
          filas: XLSX.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, defval: "" }),
        };
      }

      const filas = hoja.filas;
      if (filas.length < 2) {
        setMensaje(`El archivo (hoja "${hoja.nombre}") no tiene datos.`);
        setImportando(false);
        return;
      }

      const encabezados = filas[0].map((h) => normalizar(h));
      const columna = (nombres) =>
        encabezados.findIndex((h) => nombres.some((n) => h.includes(normalizar(n))));

      const esCronograma =
        columna(["actividad"]) >= 0 && columna(["fecha"]) >= 0;

      let nuevas = [];
      let mensajeFormato = "";

      if (esCronograma) {
        // ----- Formato: Cronograma anual de mantenimiento -----
        const iFecha = columna(["fecha"]);
        const iAct = columna(["actividad"]);
        const iCod = columna(["codigo"]);
        const iFrec = columna(["frecuencia"]);
        const iHIni = encabezados.findIndex((h) => h.includes("hora inicio"));
        const iHFin = encabezados.findIndex((h) => h.includes("hora fin"));
        const iDur = encabezados.findIndex((h) => h.includes("duracion"));
        const iEst = columna(["estado"]);

        for (let r = 1; r < filas.length; r++) {
          const desc = String(filas[r][iAct] ?? "").trim();
          if (!desc) continue;
          const fechaTarea = parseFecha(filas[r][iFecha]);
          if (!fechaTarea) continue;
          nuevas.push({
            fecha: fechaTarea,
            descripcion: desc,
            area: "",
            codigo: iCod >= 0 ? String(filas[r][iCod] ?? "").trim() : "",
            frecuencia: iFrec >= 0 ? String(filas[r][iFrec] ?? "").trim() : "",
            hora_inicio: iHIni >= 0 ? String(filas[r][iHIni] ?? "").trim() : "",
            hora_fin: iHFin >= 0 ? String(filas[r][iHFin] ?? "").trim() : "",
            duracion: iDur >= 0 ? Number(filas[r][iDur]) || 0 : 0,
            estado: iEst >= 0 ? estadoDesdeExcel(filas[r][iEst]) : "pendiente",
            prioridad: "normal",
          });
        }
        mensajeFormato = `Cronograma detectado (hoja "${hoja.nombre}")`;
      } else {
        // ----- Formato: lista simple (Tarea / Descripción) -----
        const iDesc = columna(["tarea", "descripcion", "actividad"]);
        const iFecha = columna(["fecha", "dia"]);
        const iArea = columna(["area", "zona", "equipo"]);

        if (iDesc === -1) {
          setMensaje(
            "No encontré la columna de la tarea. Busca una llamada: Tarea, Descripción o Actividad."
          );
          setImportando(false);
          return;
        }

        for (let r = 1; r < filas.length; r++) {
          const desc = String(filas[r][iDesc] ?? "").trim();
          if (!desc) continue;
          nuevas.push({
            fecha: parseFecha(iFecha >= 0 ? filas[r][iFecha] : null) || fecha,
            descripcion: desc,
            area: iArea >= 0 ? String(filas[r][iArea] ?? "").trim() : "",
            estado: "pendiente",
            prioridad: "normal",
          });
        }
        mensajeFormato = `Lista simple detectada (hoja "${hoja.nombre}")`;
      }

      if (nuevas.length === 0) {
        setMensaje("No encontré tareas para importar en el archivo.");
        setImportando(false);
        return;
      }

      // Evita duplicados: no vuelve a importar tareas que ya existen
      const existentes = await paginarTareas({
        columnas: "fecha, descripcion",
        archivada: undefined,
        orden: "id",
      });
      const claves = new Set(
        (existentes || []).map((t) => `${t.fecha}|${normalizar(t.descripcion)}`)
      );

      const porInsertar = nuevas.filter(
        (n) => !claves.has(`${n.fecha}|${normalizar(n.descripcion)}`)
      );

      if (porInsertar.length === 0) {
        setMensaje("Todas las tareas del archivo ya estaban importadas. No se agregó nada.");
        setImportando(false);
        return;
      }

      const { error } = await supabase.from("tareas").insert(porInsertar);
      if (error) {
        setMensaje("Error al importar: " + error.message);
        setImportando(false);
        return;
      }

      const omitidas = nuevas.length - porInsertar.length;
      setMensaje(
        `${mensajeFormato}. Se importaron ${porInsertar.length} tareas.` +
          (omitidas > 0 ? ` (${omitidas} ya existían y se omitieron)` : "")
      );
      cargar();
    } catch (e) {
      setMensaje("No se pudo leer el archivo: " + e.message);
    }
    setImportando(false);
    if (archivoRef.current) archivoRef.current.value = "";
  }

  async function iniciarNuevoAnio() {
    let activas;
    try {
      activas = await paginarTareas({ archivada: false, orden: "fecha" });
    } catch (e) {
      setMensaje("Error: " + e.message);
      return;
    }
    if (!activas || activas.length === 0) {
      setMensaje("No hay tareas activas para generar el nuevo año.");
      return;
    }

    const anioActual = Math.max(...activas.map((t) => Number(t.fecha.slice(0, 4))));
    const nuevoAnio = anioActual + 1;

    if (
      !confirm(
        `🔁 Iniciar el año ${nuevoAnio}\n\n` +
          `Esto es lo que va a pasar:\n\n` +
          `1. Se generará el cronograma completo de ${nuevoAnio} (copia de ${anioActual} con fechas actualizadas, todo en "pendiente").\n` +
          `2. Se archivarán las tareas de enero–noviembre de ${anioActual} (quedan ocultas).\n` +
          `3. Diciembre de ${anioActual} quedará visible para descargarlo en enero.\n` +
          `4. En febrero se borrarán automáticamente todas las tareas de ${anioActual}.\n\n` +
          `¿Continuar?`
      )
    ) {
      return;
    }

    setIniciando(true);
    setMensaje("");
    try {
      const nuevas = activas.map((t) => ({
        fecha: nuevaFecha(t.fecha, nuevoAnio),
        descripcion: t.descripcion,
        area: t.area || "",
        codigo: t.codigo || "",
        frecuencia: t.frecuencia || "",
        hora_inicio: t.hora_inicio || "",
        hora_fin: t.hora_fin || "",
        duracion: Number(t.duracion) || 0,
        estado: "pendiente",
        prioridad: t.prioridad || "normal",
        archivada: false,
      }));

      const { error: eIns } = await supabase.from("tareas").insert(nuevas);
      if (eIns) throw new Error("No se pudieron generar las tareas: " + eIns.message);

      const idsArchivar = activas
        .filter((t) => String(t.fecha).slice(5, 7) !== "12")
        .map((t) => t.id);
      const { error: eArch } = await supabase
        .from("tareas")
        .update({ archivada: true })
        .in("id", idsArchivar);
      if (eArch)
        throw new Error(
          "Las tareas se generaron, pero no se pudo archivar el historial: " + eArch.message
        );

      const primerDia = nuevas.sort((a, b) => a.fecha.localeCompare(b.fecha))[0]?.fecha;
      if (primerDia) setFecha(primerDia);

      setMensaje(
        `✅ Año ${nuevoAnio} iniciado: ${nuevas.length} tareas generadas. Se archivó ${anioActual} (enero–noviembre) y diciembre quedó visible para descargarlo en enero.`
      );
      cargar();
    } catch (e) {
      setMensaje(e.message);
    }
    setIniciando(false);
  }

  return (
    <div>
      <div className="navegador-dia">
        <button className="btn-secundario" onClick={() => setFecha(moverFecha(fecha, -1))}>
          ◀ Día anterior
        </button>
        <div className="fecha-central">
          <strong>{fechaBonita(fecha)}</strong>
          <input
            className="campo"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={{ maxWidth: 180, margin: "0 auto", marginTop: 6 }}
          />
        </div>
        <button className="btn-secundario" onClick={() => setFecha(moverFecha(fecha, 1))}>
          Día siguiente ▶
        </button>
      </div>

      <div className="tarjeta">
        <form className="fila-formulario" onSubmit={agregar}>
          <input
            className="campo"
            placeholder="Tarea a realizar (ej: Revisar CT 4)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
          <input
            className="campo"
            placeholder="Área / equipo"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            style={{ maxWidth: 180 }}
          />
          <button className="btn-primario" type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "+ Agregar"}
          </button>
        </form>

        <div className="fila-importar">
          <input
            ref={archivoRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importarExcel(f);
            }}
          />
          <button className="btn-importar" onClick={() => archivoRef.current?.click()} disabled={importando}>
            {importando ? "Leyendo Excel..." : "📄 Importar tareas desde Excel"}
          </button>
          <button className="btn-primario" onClick={iniciarNuevoAnio} disabled={iniciando}>
            {iniciando ? "Generando..." : "🔁 Iniciar nuevo año"}
          </button>
          <span className="ayuda">
            Reconoce el "Cronograma Detallado" anual (Fecha, Actividad, Código, Frecuencia,
            Hora, Estado) o una lista simple (Tarea/Descripción). No duplica tareas al re-importar.
          </span>
        </div>

        {mensaje && <p className="aviso">{mensaje}</p>}

        {editando && editForm && (
          <form className="panel-edicion" onSubmit={guardarEdicion}>
            <h3>Editar tarea</h3>
            <div className="fila-formulario">
              <input
                className="campo"
                placeholder="Descripción"
                value={editForm.descripcion}
                onChange={(e) => setCampoEdicion("descripcion", e.target.value)}
              />
            </div>
            <div className="fila-formulario">
              <input
                className="campo"
                type="date"
                value={editForm.fecha}
                onChange={(e) => setCampoEdicion("fecha", e.target.value)}
                style={{ maxWidth: 180 }}
              />
              <input
                className="campo"
                type="time"
                value={editForm.hora_inicio}
                onChange={(e) => setCampoEdicion("hora_inicio", e.target.value)}
                style={{ maxWidth: 150 }}
              />
              <input
                className="campo"
                type="time"
                value={editForm.hora_fin}
                onChange={(e) => setCampoEdicion("hora_fin", e.target.value)}
                style={{ maxWidth: 150 }}
              />
              <input
                className="campo"
                type="number"
                min="0"
                step="0.5"
                placeholder="Duración (h)"
                value={editForm.duracion}
                onChange={(e) => setCampoEdicion("duracion", e.target.value)}
                style={{ maxWidth: 130 }}
              />
            </div>
            <div className="fila-formulario">
              <input
                className="campo"
                placeholder="Área / equipo"
                value={editForm.area}
                onChange={(e) => setCampoEdicion("area", e.target.value)}
                style={{ maxWidth: 180 }}
              />
              <input
                className="campo"
                placeholder="Código"
                value={editForm.codigo}
                onChange={(e) => setCampoEdicion("codigo", e.target.value)}
                style={{ maxWidth: 120 }}
              />
              <input
                className="campo"
                placeholder="Frecuencia"
                value={editForm.frecuencia}
                onChange={(e) => setCampoEdicion("frecuencia", e.target.value)}
                style={{ maxWidth: 150 }}
              />
            </div>
            <div className="fila-formulario">
              <button className="btn-primario" type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
              <button className="btn-secundario" type="button" onClick={cancelarEdicion}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {cargando ? (
        <p className="aviso">Cargando tareas...</p>
      ) : ordenadas.length === 0 ? (
        <p className="aviso">No hay tareas para este día. Agrégalas o impórtalas desde Excel.</p>
      ) : (
        <>
          <p className="resumen">
            {resumen.total} tarea(s) · {resumen.enProgreso} en progreso · {resumen.hechas} hecha(s)
          </p>
          <ul className="lista-tareas">
            {ordenadas.map((t) => {
              const procsDeTarea = (t.procedimientos || [])
                .map((n) => procedimientos[n])
                .filter(Boolean);
              const abierto = !!manualAbierto[t.id];
              return (
                <li key={t.id} className={`tarea estado-${t.estado}`}>
                  <div className="tarea-fila">
                    <div className="tarea-texto">
                      <div className="tarea-titulo">
                        {t.hora_inicio && (
                          <span className="chip chip-hora">
                            🕐 {t.hora_inicio}
                            {t.hora_fin ? ` – ${t.hora_fin}` : ""}
                          </span>
                        )}
                        <strong>{t.descripcion}</strong>
                      </div>
                      <div className="tarea-chips">
                        {t.codigo && <span className="chip">Código: {t.codigo}</span>}
                        {t.frecuencia && <span className="chip">Frecuencia: {t.frecuencia}</span>}
                        {t.duracion > 0 && <span className="chip">Duración: {t.duracion} h</span>}
                        {t.area && <span className="chip">Área: {t.area}</span>}
                        {procsDeTarea.length > 0 && (
                          <span className="chip">Manual: P-{procsDeTarea.map((p) => p.numero).join(", ")}</span>
                        )}
                      </div>
                    </div>
                    <div className="tarea-acciones">
                      {procsDeTarea.length > 0 && (
                        <button className="btn-editar" onClick={() => toggleManual(t.id)}>
                          {abierto ? "Ocultar manual" : "📖 Ver manual"}
                        </button>
                      )}
                      <select
                        className="campo select-estado"
                        value={t.estado}
                        onChange={(e) => cambiarEstado(t, e.target.value)}
                      >
                        {Object.entries(ETIQUETAS_ESTADO).map(([val, nombre]) => (
                          <option key={val} value={val}>
                            {nombre}
                          </option>
                        ))}
                      </select>
                      <button className="btn-editar" onClick={() => iniciarEdicion(t)}>
                        Editar
                      </button>
                      <button className="btn-borrar" onClick={() => borrar(t)}>
                        Borrar
                      </button>
                    </div>
                  </div>

                  {abierto && procsDeTarea.length > 0 && (
                    <div className="tarea-manual">
                      {procsDeTarea.map((p) => (
                        <div key={p.numero} className="proc">
                          <p className="proc-titulo">
                            P-{p.numero} · {arreglarTexto(p.titulo)}
                          </p>
                          {p.objeto && (
                            <p className="proc-objeto">{arreglarTexto(p.objeto)}</p>
                          )}
                          {p.alcance && (
                            <div className="proc-bloque">
                              <p className="proc-bloque-titulo">Alcance</p>
                              <p className="proc-paso">{arreglarTexto(p.alcance)}</p>
                            </div>
                          )}
                          {p.condicionantes && (
                            <div className="proc-bloque">
                              <p className="proc-bloque-titulo">Antes de empezar</p>
                              <p className="proc-paso">{arreglarTexto(p.condicionantes)}</p>
                            </div>
                          )}
                          {p.pasos && p.pasos.length > 0 && (
                            <div className="proc-bloque">
                              <p className="proc-bloque-titulo">Pasos a seguir</p>
                              {p.pasos.map((paso, i) => (
                                <p key={i} className="proc-paso">
                                  {i + 1}. {arreglarTexto(paso)}
                                </p>
                              ))}
                            </div>
                          )}
                          {p.equipo && typeof p.equipo === "object" && (
                            <div className="proc-bloque">
                              <p className="proc-bloque-titulo">Equipo necesario</p>
                              {Object.entries(p.equipo).map(([cat, items]) => (
                                <div key={cat}>
                                  <p className="proc-equipo-cat">{arreglarTexto(cat)}</p>
                                  {(items || []).map((item, i) => (
                                    <p key={i} className="proc-equipo-item">
                                      • {arreglarTexto(item)}
                                    </p>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
