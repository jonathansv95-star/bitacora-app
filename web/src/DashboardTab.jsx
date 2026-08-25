import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import CalendarioAvance from "./CalendarioAvance.jsx";
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

function domingoDe(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return moverFecha(iso, -new Date(a, m - 1, d).getDay());
}

function fechaCorta(iso) {
  const [, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function fechaCompleta(iso) {
  return iso.split("-").reverse().join("/");
}

const NOMBRES_MES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function colorPct(p) {
  if (p >= 0.75) return "var(--exito)";
  if (p >= 0.4) return "var(--advertencia)";
  return "var(--peligro)";
}

function Contador({ valor }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    let inicio = null;
    const tick = (ahora) => {
      if (inicio === null) inicio = ahora;
      const p = Math.min((ahora - inicio) / 900, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setV(Math.round(valor * ease));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return v;
}

export default function DashboardTab({ onIr }) {
  const [cargando, setCargando] = useState(true);
  const [tareas, setTareas] = useState([]);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const [calendario, setCalendario] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setListo(true), 120);
    return () => clearTimeout(t);
  }, []);

  async function cargar() {
    try {
      const data = await paginarTareas({ archivada: false, orden: "fecha" });
      setTareas(data || []);
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
  }

  async function recargar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    const canal = supabase
      .channel("tareas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tareas" }, () => cargar())
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  const hoy = hoyISO();

  async function marcarHecha(tarea) {
    if (!confirm(`¿Marcar como realizada la tarea "${tarea.descripcion}"?`)) return;
    const { error } = await supabase.from("tareas").update({ estado: "hecha" }).eq("id", tarea.id);
    if (error) {
      setError(error.message);
      return;
    }
    setCargando(true);
    cargar();
  }

  const datos = useMemo(() => {
    const enPlan = tareas.filter((t) => t.fecha <= hoy);
    const hechas = enPlan.filter((t) => t.estado === "hecha");
    const enProgreso = enPlan.filter((t) => t.estado === "en_progreso");
    const pendientes = enPlan.filter((t) => t.estado === "pendiente");
    const atrasadas = pendientes.filter((t) => t.fecha < hoy);

    const totalPlan = enPlan.length || 1;
    const global = hechas.length / totalPlan;
    const ponderado = (hechas.length + enProgreso.length * 0.5) / totalPlan;

    const hoyTareas = tareas.filter((t) => t.fecha === hoy);
    const hoyHechas = hoyTareas.filter((t) => t.estado === "hecha").length;

    // Por área
    const porArea = [];
    for (const area of [...new Set(enPlan.map((t) => t.area).filter(Boolean))]) {
      const grupo = enPlan.filter((t) => t.area === area);
      const com = grupo.filter((t) => t.estado === "hecha").length;
      porArea.push({ nombre: area, total: grupo.length, hechas: com, pct: com / grupo.length });
    }
    porArea.sort((a, b) => b.total - a.total);

    // Por frecuencia
    const porFrecuencia = [];
    for (const f of [...new Set(enPlan.map((t) => t.frecuencia).filter(Boolean))]) {
      const grupo = enPlan.filter((t) => t.frecuencia === f);
      const com = grupo.filter((t) => t.estado === "hecha").length;
      porFrecuencia.push({ nombre: f, total: grupo.length, hechas: com, pct: com / grupo.length });
    }
    porFrecuencia.sort((a, b) => b.total - a.total);

    // Por mes
    const porMes = [];
    for (let m = 1; m <= 12; m++) {
      const grupo = tareas.filter((t) => Number(t.fecha.split("-")[1]) === m);
      const progMes = grupo.filter((t) => t.fecha <= hoy);
      const com = progMes.filter((t) => t.estado === "hecha").length;
      porMes.push({
        mes: m,
        total: grupo.length,
        programadas: progMes.length,
        hechas: com,
        pct: progMes.length ? com / progMes.length : 0,
      });
    }

    let acumProg = 0;
    let acumHechas = 0;
    const acumulado = porMes.map((pm) => {
      acumProg += pm.programadas;
      acumHechas += pm.hechas;
      return { ...pm, acumPct: acumProg ? acumHechas / acumProg : 0 };
    });

    const proximas = tareas
      .filter((t) => t.fecha > hoy && t.estado !== "hecha")
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 6);

    const dias = [];
    const inicio = moverFecha(domingoDe(hoy), -91);
    for (let i = 0; i < 98; i++) {
      const d = moverFecha(inicio, i);
      const grupo = tareas.filter((t) => t.fecha === d);
      const com = grupo.filter((t) => t.estado === "hecha").length;
      dias.push({
        fecha: d,
        total: grupo.length,
        hechas: com,
        pct: grupo.length ? com / grupo.length : 0,
      });
    }

    return {
      enPlan,
      hechas,
      enProgreso,
      pendientes,
      atrasadas,
      global,
      ponderado,
      hoyTareas,
      hoyHechas,
      porArea,
      porFrecuencia,
      porMes,
      acumulado,
      proximas,
      dias,
    };
  }, [tareas, hoy]);

  // Gauge
  const radio = 80;
  const circunferencia = 2 * Math.PI * radio;
  const pctAnillo = Math.round(datos.ponderado * 100);
  const offset = circunferencia * (1 - (listo ? datos.ponderado : 0));

  // Línea acumulada (SVG)
  const W = 620;
  const H = 200;
  const puntos = datos.acumulado.map((a, i) => [
    (i / 11) * W,
    H - 22 - a.acumPct * (H - 44),
  ]);
  const polilinea = puntos.map((p) => p.join(",")).join(" ");
  const areaLinea = `0,${H} ${polilinea} ${W},${H}`;

  function claseCelda(d) {
    if (d.total === 0) return "celda-vacia";
    if (d.fecha > hoy) return "celda-futura";
    if (d.pct === 1) return "celda-lista";
    if (d.pct >= 0.5) return "celda-media";
    if (d.pct > 0) return "celda-baja";
    return "celda-pendiente";
  }

  if (cargando) return <p className="aviso">Cargando tablero...</p>;

  return (
    <div className="tablero tarjeta-escalon">
      {/* Encabezado */}
      <div className="dash-cabecera">
        <div>
          <h2>Tablero de avance de mantenimiento</h2>
          <p className="dash-fecha">
            {new Date().toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="dash-cabecera-derecha">
          <div className="dash-leyenda">
            <span className="leyenda-item"><i className="dot dot-exito" /> Completada</span>
            <span className="leyenda-item"><i className="dot dot-avance" /> En progreso</span>
            <span className="leyenda-item"><i className="dot dot-pend" /> Pendiente</span>
            <span className="leyenda-item"><i className="dot dot-vencida" /> Atrasada</span>
          </div>
          <button className="btn-refrescar" onClick={recargar} disabled={refrescando} title="Recargar datos">
            <span className={`icono-refresco ${refrescando ? "girando" : ""}`}>↻</span>
            {refrescando ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {/* Fila de KPIs */}
      <div className="kpi-grid">
        <button className="kpi kpi-clic" style={{ borderTop: `4px solid ${colorPct(datos.ponderado)}` }} onClick={() => setCalendario(true)} title="Ver avance por fecha en el calendario">
          <div className="kpi-top">
            <span className="kpi-titulo">Avance del plan</span>
            <span className="kpi-icono" style={{ background: "var(--sol-suave)", borderColor: "var(--sol-claro)" }}>☀️</span>
          </div>
          <span className="kpi-valor" style={{ color: colorPct(datos.ponderado) }}>
            <Contador valor={pctAnillo} />%
          </span>
          <span className="kpi-sub"><Contador valor={datos.hechas.length} /> de {datos.enPlan.length} completadas</span>
          <div className="kpi-barra">
            <div className="kpi-barra-llena" style={{ width: listo ? `${Math.round(datos.ponderado * 100)}%` : "0%", background: colorPct(datos.ponderado) }} />
          </div>
        </button>
        <button className="kpi kpi-clic" style={{ borderTop: "4px solid var(--exito)" }} onClick={() => setCalendario(true)} title="Ver avance por fecha en el calendario">
          <div className="kpi-top">
            <span className="kpi-titulo">Completadas</span>
            <span className="kpi-icono" style={{ background: "var(--exito-fondo)" }}>✅</span>
          </div>
          <span className="kpi-valor"><Contador valor={datos.hechas.length} /></span>
          <span className="kpi-sub">hasta la fecha de hoy</span>
          <div className="kpi-barra">
            <div className="kpi-barra-llena" style={{ width: listo ? `${Math.round(datos.global * 100)}%` : "0%", background: "var(--exito)" }} />
          </div>
        </button>
        <button className="kpi kpi-clic" style={{ borderTop: "4px solid var(--advertencia)" }} onClick={() => setCalendario(true)} title="Ver avance por fecha en el calendario">
          <div className="kpi-top">
            <span className="kpi-titulo">En progreso</span>
            <span className="kpi-icono" style={{ background: "var(--advertencia-fondo)" }}>🚧</span>
          </div>
          <span className="kpi-valor"><Contador valor={datos.enProgreso.length} /></span>
          <span className="kpi-sub">a medio camino</span>
          <div className="kpi-barra">
            <div className="kpi-barra-llena" style={{ width: listo ? `${Math.round((datos.enProgreso.length / (datos.enPlan.length || 1)) * 100)}%` : "0%", background: "var(--advertencia)" }} />
          </div>
        </button>
        <button className="kpi kpi-clic" style={{ borderTop: "4px solid var(--peligro)" }} onClick={() => setCalendario(true)} title="Ver avance por fecha en el calendario">
          <div className="kpi-top">
            <span className="kpi-titulo">Pendientes</span>
            <span className="kpi-icono" style={{ background: "var(--peligro-fondo)" }}>⏳</span>
          </div>
          <span className="kpi-valor"><Contador valor={datos.pendientes.length} /></span>
          <span className={`kpi-sub ${datos.atrasadas.length ? "alerta" : ""}`}>
            {datos.atrasadas.length} atrasada(s)
          </span>
          <div className="kpi-barra">
            <div className="kpi-barra-llena" style={{ width: listo ? `${Math.round((datos.pendientes.length / (datos.enPlan.length || 1)) * 100)}%` : "0%", background: "var(--peligro)" }} />
          </div>
        </button>
        <button className="kpi kpi-clic" style={{ borderTop: "4px solid var(--primario)" }} onClick={() => onIr("tareas")} title="Ir a Tareas del día">
          <div className="kpi-top">
            <span className="kpi-titulo">Hoy</span>
            <span className="kpi-icono" style={{ background: "var(--primario-suave)" }}>📌</span>
          </div>
          <span className="kpi-valor"><Contador valor={datos.hoyHechas} />/{datos.hoyTareas.length}</span>
          <span className="kpi-sub">
            {datos.hoyTareas.length === 0 ? "sin tareas hoy" : "marca tu avance en Tareas del día"}
          </span>
          <div className="kpi-barra">
            <div className="kpi-barra-llena" style={{ width: listo ? `${Math.round((datos.hoyTareas.length ? datos.hoyHechas / datos.hoyTareas.length : 0) * 100)}%` : "0%", background: "var(--primario)" }} />
          </div>
        </button>
      </div>

      {/* Hero: anillo + estado del día */}
      <div className="dash-hero">
        <div className="tarjeta-grafica anillo-tarjeta">
          <h3>🎯 Progreso del plan anual</h3>
          <div className="anillo">
            <svg viewBox="0 0 200 200" className="anillo-svg">
              <circle cx="100" cy="100" r={radio} fill="none" stroke="var(--borde)" strokeWidth="16" />
              <circle
                cx="100"
                cy="100"
                r={radio}
                fill="none"
                stroke={colorPct(datos.ponderado)}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={circunferencia}
                strokeDashoffset={offset}
                transform="rotate(-90 100 100)"
                style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)" }}
              />
              <text x="100" y="98" textAnchor="middle" className="anillo-pct">
                {pctAnillo}%
              </text>
              <text x="100" y="122" textAnchor="middle" className="anillo-leyenda">
                cumplido
              </text>
            </svg>
          </div>
          <div className="anillo-numeros">
            <div><strong>{datos.hechas.length}</strong> completadas</div>
            <div><strong>{datos.enProgreso.length}</strong> en progreso</div>
            <div><strong>{datos.pendientes.length}</strong> pendientes</div>
            <div><strong>{datos.atrasadas.length}</strong> atrasadas</div>
          </div>
        </div>

        <div className="tarjeta-grafica">
          <div className="grafica-titulo">
            <h3>📌 Tareas de hoy</h3>
            <button className="enlace" onClick={() => onIr("tareas")}>Ver y marcar →</button>
          </div>
          {datos.hoyTareas.length === 0 ? (
            <p className="vacio">No hay tareas programadas para hoy.</p>
          ) : (
            <ul className="lista-mini">
              {datos.hoyTareas.slice(0, 7).map((t) => (
                <li key={t.id}>
                  <i className={`dot ${t.estado === "hecha" ? "dot-exito" : t.estado === "en_progreso" ? "dot-avance" : "dot-pend"}`} />
                  <span className="mini-texto">
                    <strong>{t.descripcion}</strong>
                    {t.hora_inicio && <em>🕐 {t.hora_inicio}</em>}
                  </span>
                  <span className="mini-etiqueta">{t.estado === "hecha" ? "Hecha" : t.estado === "en_progreso" ? "Progreso" : "Pendiente"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Gráficas: área y frecuencia */}
      <div className="dash-grid-2">
        <div className="tarjeta-grafica">
          <h3>🗂️ Avance por área</h3>
          {datos.porArea.length === 0 ? (
            <p className="vacio">Sin áreas registradas.</p>
          ) : (
            <div className="barras-v">
              {datos.porArea.map((a) => (
                <div key={a.nombre} className="barra-fila">
                  <div className="barra-rotulo">
                    <span>{a.nombre}</span>
                    <strong>{a.hechas}/{a.total}</strong>
                  </div>
                  <div className="barra-pista">
                    <div
                      className="barra-llena"
                      style={{
                        width: listo ? `${Math.round(a.pct * 100)}%` : "0%",
                        background: colorPct(a.pct),
                      }}
                    >
                      <span>{Math.round(a.pct * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="tarjeta-grafica">
          <h3>🔁 Avance por frecuencia</h3>
          {datos.porFrecuencia.length === 0 ? (
            <p className="vacio">Sin frecuencias registradas.</p>
          ) : (
            <div className="barras-v">
              {datos.porFrecuencia.map((a) => (
                <div key={a.nombre} className="barra-fila">
                  <div className="barra-rotulo">
                    <span>{a.nombre}</span>
                    <strong>{a.hechas}/{a.total}</strong>
                  </div>
                  <div className="barra-pista">
                    <div
                      className="barra-llena"
                      style={{
                        width: listo ? `${Math.round(a.pct * 100)}%` : "0%",
                        background: colorPct(a.pct),
                      }}
                    >
                      <span>{Math.round(a.pct * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Avance por mes con línea acumulada */}
      <div className="tarjeta-grafica">
        <h3>📈 Avance por mes y línea acumulada del año</h3>
        <div className="barras-meses">
          {datos.porMes.map((m) => {
            const futuro = m.programadas === 0 && m.total > 0;
            return (
              <div
                key={m.mes}
                className="columna-mes"
                title={
                  m.total > 0
                    ? futuro
                      ? `${m.total} tareas programadas (mes futuro)`
                      : `${m.programadas} programadas, ${m.hechas} hechas`
                    : "Sin tareas"
                }
              >
                <span className={`mes-pct ${m.pct > 0 ? "con-dato" : ""}`}>
                  {m.programadas > 0
                    ? `${Math.round(m.pct * 100)}%`
                    : futuro
                    ? `⏳ ${m.total}`
                    : ""}
                </span>
                <div className="mes-pista">
                  <div
                    className={`mes-llena ${futuro ? "mes-futura" : ""}`}
                    style={{
                      height: listo
                        ? m.programadas > 0
                          ? `${Math.round(m.pct * 100)}%`
                          : futuro
                          ? "10%"
                          : "0%"
                        : "0%",
                      background:
                        m.programadas > 0 ? colorPct(m.pct) : futuro ? "var(--primario-claro)" : "var(--borde)",
                    }}
                  />
                </div>
                <span className="mes-etiqueta">{NOMBRES_MES[m.mes - 1]}</span>
                <span className="mes-total">
                  {m.programadas > 0 ? `${m.hechas}/${m.programadas}` : futuro ? "programadas" : "—"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mes-nota">
          ⏳ Meses futuros: muestran las tareas programadas (aún sin avance). Los que ya pasaron
          muestran el % de cumplimiento.
        </p>
        <div className="linea-tarjeta">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="linea-svg">
            <defs>
              <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primario)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--primario)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <line
                key={f}
                x1="0"
                x2={W}
                y1={H - 22 - f * (H - 44)}
                y2={H - 22 - f * (H - 44)}
                stroke="var(--borde)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            ))}
            <polygon points={areaLinea} fill="url(#gradArea)" />
            <polyline
              points={polilinea}
              fill="none"
              stroke="var(--primario)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {puntos.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke="var(--primario)" strokeWidth="2.5">
                <title>{`${NOMBRES_MES[i]}: ${Math.round(datos.acumulado[i].acumPct * 100)}% acumulado`}</title>
              </circle>
            ))}
          </svg>
          <div className="linea-ejes">
            <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
            <span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span>
          </div>
        </div>
      </div>

      {/* Calendario de calor */}
      <div className="tarjeta-grafica">
        <h3>🗓️ Calendario de cumplimiento (14 semanas)</h3>
        <div className="heatmap">
          <div className="heat-dias">
            <span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span>
          </div>
          <div className="heat-celdas">
            {datos.dias.map((d) => (
              <div
                key={d.fecha}
                className={`celda ${claseCelda(d)}`}
                title={`${d.fecha}: ${d.total > 0 ? `${d.hechas}/${d.total} tareas` : "sin tareas"}`}
              />
            ))}
          </div>
        </div>
        <div className="heat-leyenda">
          <span>Menos</span>
          <i className="celda celda-vacia" />
          <i className="celda celda-pendiente" />
          <i className="celda celda-baja" />
          <i className="celda celda-media" />
          <i className="celda celda-lista" />
          <span>Completado</span>
        </div>
      </div>

      {/* Próximas y atrasadas */}
      <div className="dash-grid-2">
        <div className="tarjeta-grafica">
          <h3>⏭️ Próximas tareas</h3>
          {datos.proximas.length === 0 ? (
            <p className="vacio">No quedan tareas pendientes por venir.</p>
          ) : (
            <ul className="lista-mini">
              {datos.proximas.map((t) => (
                <li key={t.id}>
                  <i className="dot dot-futura" />
                  <span className="mini-texto">
                    <strong>{t.descripcion}</strong>
                    <em>📅 {fechaCompleta(t.fecha)}{t.hora_inicio ? ` · 🕐 ${t.hora_inicio}` : ""}</em>
                  </span>
                  <span className="mini-etiqueta">{t.area || t.frecuencia || "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="tarjeta-grafica">
          <h3>⚠️ Atrasadas <span className="etiqueta-roja">{datos.atrasadas.length}</span></h3>
          {datos.atrasadas.length === 0 ? (
            <p className="vacio">¡Sin tareas vencidas! El plan va al día.</p>
          ) : (
            <ul className="lista-mini">
              {datos.atrasadas.map((t) => (
                <li key={t.id} className="item-vencido">
                  <i className="dot dot-vencida" />
                  <span className="mini-texto">
                    <strong>{t.descripcion}</strong>
                    <em>⏰ vence el {fechaCompleta(t.fecha)}</em>
                  </span>
                  <button className="btn-realizada" onClick={() => marcarHecha(t)}>
                    ✓ Realizada
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="tarjeta-grafica nota-didactica">
        <strong>📖 ¿Cómo se mide?</strong> El avance compara las tareas <em>programadas hasta hoy</em> con las
        <em> completadas</em>. Una tarea en progreso cuenta como la mitad de una completada. Así el porcentaje
        refleja el esfuerzo real, no solo lo terminado.
      </div>

      {error && <p className="aviso">Error al cargar: {error}</p>}

      {calendario && (
        <CalendarioAvance tareas={tareas} onCerrar={() => setCalendario(false)} />
      )}
    </div>
  );
}
