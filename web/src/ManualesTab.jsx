import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { paginarTareas } from "./tareasAll.js";

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

export default function ManualesTab() {
  const [tareas, setTareas] = useState([]);
  const [procedimientos, setProcedimientos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [abiertos, setAbiertos] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [ts, pr] = await Promise.all([
          paginarTareas({ archivada: false, orden: "descripcion" }),
          supabase.from("procedimientos").select("*"),
        ]);
        const mapa = {};
        for (const p of pr.data || []) mapa[p.numero] = p;
        setProcedimientos(mapa);

        const porDesc = new Map();
        for (const t of ts) {
          if (!porDesc.has(t.descripcion)) porDesc.set(t.descripcion, t);
        }
        setTareas(
          [...porDesc.values()].sort((a, b) =>
            a.descripcion.localeCompare(b.descripcion, "es")
          )
        );
      } catch (e) {}
      setCargando(false);
    })();
  }, []);

  function toggle(clave) {
    setAbiertos((actual) => ({ ...actual, [clave]: !actual[clave] }));
  }

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return tareas;
    return tareas.filter((t) => t.descripcion.toLowerCase().includes(q));
  }, [tareas, busqueda]);

  return (
    <div>
      <div className="tarjeta-filtros">
        <input
          className="campo"
          placeholder="Buscar tarea..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 340 }}
        />
        <span className="ayuda">
          {tareas.length} tareas distintas · pulsa "Ver manual" para revisar el contenido completo
        </span>
      </div>

      {cargando ? (
        <p className="aviso">Cargando manuales...</p>
      ) : (
        <ul className="lista-tareas">
          {filtradas.map((t) => {
            const procs = (t.procedimientos || [])
              .map((n) => procedimientos[n])
              .filter(Boolean);
            const abierto = !!abiertos[t.descripcion];
            return (
              <li key={t.descripcion} className="tarea">
                <div className="tarea-fila">
                  <div className="tarea-texto">
                    <strong>{t.descripcion}</strong>
                    <div className="tarea-chips">
                      {t.codigo && <span className="chip">Código: {t.codigo}</span>}
                      {t.frecuencia && <span className="chip">Frecuencia: {t.frecuencia}</span>}
                    </div>
                  </div>
                  <div className="tarea-acciones">
                    {procs.length > 0 && (
                      <button className="btn-editar" onClick={() => toggle(t.descripcion)}>
                        {abierto ? "Ocultar manual" : "📖 Ver manual"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="manual-lista">
                  {procs.length === 0 ? (
                    <span className="chip">Sin manual asignado</span>
                  ) : (
                    procs.map((p) => (
                      <div key={p.numero} className="proc-mini">
                        <span className="chip chip-manual">P-{p.numero}</span>
                        <span className="proc-mini-titulo">{arreglarTexto(p.titulo)}</span>
                      </div>
                    ))
                  )}
                </div>

                {abierto && procs.length > 0 && (
                  <div className="tarea-manual">
                    {procs.map((p) => (
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
      )}
    </div>
  );
}
