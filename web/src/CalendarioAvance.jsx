import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoDeFecha(anio, mes, dia) {
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function diasEnMes(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

// 0 = lunes ... 6 = domingo (semana con lunes primero)
function primerDiaSemana(anio, mes) {
  return (new Date(anio, mes - 1, 1).getDay() + 6) % 7;
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

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const NOMBRES_DIA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const ETIQUETAS_ESTADO = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  hecha: "Hecha",
};

function claseDia(iso, hoy, total, pct) {
  if (total === 0) return "dia-vacio";
  if (iso > hoy) return "dia-futura";
  if (pct === 1) return "dia-lista";
  if (pct >= 0.5) return "dia-media";
  if (pct > 0) return "dia-baja";
  return "dia-pendiente";
}

export default function CalendarioAvance({ tareas, onCerrar }) {
  const hoy = hoyISO();
  const [mesVisible, setMesVisible] = useState(() => {
    const d = new Date();
    return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
  });
  const [diaSel, setDiaSel] = useState(hoy);

  const { anio, mes } = mesVisible;
  const totalDias = diasEnMes(anio, mes);
  const offset = primerDiaSemana(anio, mes);

  const diasMes = useMemo(() => {
    const lista = [];
    for (let d = 1; d <= totalDias; d++) lista.push(isoDeFecha(anio, mes, d));
    return lista;
  }, [anio, mes, totalDias]);

  const porFecha = useMemo(() => {
    const mapa = new Map();
    for (const t of tareas) {
      const lista = mapa.get(t.fecha) || [];
      lista.push(t);
      mapa.set(t.fecha, lista);
    }
    return mapa;
  }, [tareas]);

  const celdas = useMemo(() => {
    const lista = [];
    for (let i = 0; i < offset; i++) lista.push(null);
    for (const iso of diasMes) {
      const grupo = porFecha.get(iso) || [];
      const total = grupo.length;
      const hechas = grupo.filter((t) => t.estado === "hecha").length;
      const enProgreso = grupo.filter((t) => t.estado === "en_progreso").length;
      lista.push({
        iso,
        total,
        hechas,
        enProgreso,
        pct: total ? hechas / total : 0,
      });
    }
    return lista;
  }, [offset, diasMes, porFecha]);

  const resumenMes = useMemo(() => {
    let total = 0;
    let hechas = 0;
    let enProgreso = 0;
    let pendientes = 0;
    for (const iso of diasMes) {
      const grupo = porFecha.get(iso) || [];
      total += grupo.length;
      hechas += grupo.filter((t) => t.estado === "hecha").length;
      enProgreso += grupo.filter((t) => t.estado === "en_progreso").length;
      pendientes += grupo.filter((t) => t.estado === "pendiente").length;
    }
    return { total, hechas, enProgreso, pendientes, pct: total ? hechas / total : 0 };
  }, [porFecha, diasMes]);

  const diaElegido = porFecha.get(diaSel) || [];
  const elegidasHechas = diaElegido.filter((t) => t.estado === "hecha").length;
  const elegidasProgreso = diaElegido.filter((t) => t.estado === "en_progreso").length;

  function moverMes(delta) {
    setMesVisible((m) => {
      let nm = m.mes + delta;
      let na = m.anio;
      if (nm > 12) {
        nm = 1;
        na += 1;
      }
      if (nm < 1) {
        nm = 12;
        na -= 1;
      }
      return { anio: na, mes: nm };
    });
  }

  function irHoy() {
    const d = new Date();
    setMesVisible({ anio: d.getFullYear(), mes: d.getMonth() + 1 });
    setDiaSel(hoyISO());
  }

  return createPortal(
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div>
            <h3>Avance del plan por fecha</h3>
            <p>Cumplimiento del cronograma día a día.</p>
          </div>
          <button className="modal-cerrar" onClick={onCerrar} title="Cerrar">
            ✕
          </button>
        </div>

        <div className="cal-control">
          <button className="btn-secundario" onClick={() => moverMes(-1)}>◀</button>
          <strong className="cal-titulo">
            {NOMBRES_MES[mes - 1]} {anio}
          </strong>
          <button className="btn-secundario" onClick={() => moverMes(1)}>▶</button>
          <button className="btn-primario cal-hoy" onClick={irHoy}>Hoy</button>
        </div>

        <div className="cal-resumen">
          <div><strong>{resumenMes.total}</strong> programadas</div>
          <div><strong>{resumenMes.hechas}</strong> hechas</div>
          <div><strong>{resumenMes.enProgreso}</strong> en progreso</div>
          <div><strong>{resumenMes.pendientes}</strong> pendientes</div>
          <div className="cal-resumen-pct">
            <strong>{Math.round(resumenMes.pct * 100)}%</strong> del mes
          </div>
        </div>

        <div className="cal-grilla">
          {NOMBRES_DIA.map((n) => (
            <span key={n} className="cal-dia-nombre">{n}</span>
          ))}
          {celdas.map((c, i) =>
            c === null ? (
              <span key={`v${i}`} className="cal-dia cal-vacio" />
            ) : (
              <button
                key={c.iso}
                className={`cal-dia ${claseDia(c.iso, hoy, c.total, c.pct)} ${
                  c.iso === hoy ? "dia-hoy" : ""
                } ${c.iso === diaSel ? "dia-sel" : ""}`}
                onClick={() => setDiaSel(c.iso)}
                title={
                  c.total > 0
                    ? `${c.iso}: ${c.hechas}/${c.total} completadas`
                    : `${c.iso}: sin tareas`
                }
              >
                <span className="cal-num">{Number(c.iso.split("-")[2])}</span>
                {c.total > 0 && (
                  <span className="cal-cuenta">
                    {c.iso > hoy ? `⏳ ${c.total}` : `${c.hechas}/${c.total}`}
                  </span>
                )}
              </button>
            )
          )}
        </div>

        <div className="cal-leyenda">
          <span>Sin tareas</span>
          <i className="ley-celda dia-vacio" />
          <span>Pendiente</span>
          <i className="ley-celda dia-pendiente" />
          <span>Avanzando</span>
          <i className="ley-celda dia-baja" />
          <span>Mayoría</span>
          <i className="ley-celda dia-media" />
          <span>Completo</span>
          <i className="ley-celda dia-lista" />
          <span>Futuro</span>
          <i className="ley-celda dia-futura" />
        </div>

        <div className="cal-detalle">
          <div className="cal-detalle-titulo">
            <strong>{fechaBonita(diaSel)}</strong>
            {diaElegido.length > 0 && (
              <span className="mini-etiqueta">
                {elegidasHechas}/{diaElegido.length} hechas
              </span>
            )}
          </div>

          {diaElegido.length === 0 ? (
            <p className="vacio">No hay tareas programadas para esta fecha.</p>
          ) : (
            <ul className="lista-mini">
              {diaElegido.map((t) => (
                <li key={t.id}>
                  <i
                    className={`dot ${
                      t.estado === "hecha"
                        ? "dot-exito"
                        : t.estado === "en_progreso"
                        ? "dot-avance"
                        : "dot-pend"
                    }`}
                  />
                  <span className="mini-texto">
                    <strong>{t.descripcion}</strong>
                    <em>
                      {t.hora_inicio && `🕐 ${t.hora_inicio}`}
                      {t.area && ` · ${t.area}`}
                    </em>
                  </span>
                  <span className={`chip chip-estado-${t.estado}`}>
                    {ETIQUETAS_ESTADO[t.estado] || t.estado}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cal-pie">
          {elegidasProgreso > 0
            ? `🔵 ${elegidasProgreso} en progreso (cuentan como la mitad). `
            : ""}
          El avance del mes compara lo programado con lo completado.
        </div>
      </div>
    </div>,
    document.body
  );
}
