import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const MEDIOS = ["Todos", "Scada", "Campo"];
const BUCKET_FOTOS = "fotos-eventos";

export default function EventosTab() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [medio, setMedio] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [limite, setLimite] = useState(300);
  const [fotosUrl, setFotosUrl] = useState({});
  const [galeria, setGaleria] = useState(null);

  async function cargar() {
    setCargando(true);
    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false })
      .limit(2000);

    if (error) {
      alert("No se pudieron cargar los eventos: " + error.message);
    } else if (data) {
      setEventos(data);
      const rutas = [...new Set((data || []).flatMap((ev) => ev.fotos || []))];
      const mapa = {};
      if (rutas.length > 0) {
        for (let i = 0; i < rutas.length; i += 100) {
          const lote = rutas.slice(i, i + 100);
          const { data: urls } = await supabase.storage
            .from(BUCKET_FOTOS)
            .createSignedUrls(lote, 3600);
          (urls || []).forEach((u) => {
            if (u?.path && u?.signedUrl) mapa[u.path] = u.signedUrl;
          });
        }
      }
      setFotosUrl(mapa);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    const canal = supabase
      .channel("eventos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, () => cargar())
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return eventos.filter((ev) => {
      if (medio !== "Todos" && ev.medio_deteccion !== medio) return false;
      if (fechaDesde && ev.fecha < fechaDesde) return false;
      if (fechaHasta && ev.fecha > fechaHasta) return false;
      if (!texto) return true;

      const campos = [
        ev.evento,
        ev.solucion,
        ev.dispositivo,
        ev.ct,
        ev.inversor,
        ev.tracker,
        ev.string_num,
        ev.descripcion,
        ev.n_correctivo,
        ev.responsable_desc,
      ];
      return campos.some((c) => c && String(c).toLowerCase().includes(texto));
    });
  }, [eventos, busqueda, medio, fechaDesde, fechaHasta]);

  const visibles = filtrados.slice(0, limite);

  function fechaCorta(iso) {
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
  }

  function abrirFoto(ev) {
    const urls = (ev.fotos || []).map((r) => fotosUrl[r]).filter(Boolean);
    if (urls.length === 0) {
      alert("No se pudo cargar la foto. Intenta recargar la lista.");
      return;
    }
    setGaleria({ urls, idx: 0, titulo: ev.evento || "Evento" });
  }

  function cambiarFoto(dir) {
    setGaleria((g) => ({ ...g, idx: (g.idx + dir + g.urls.length) % g.urls.length }));
  }

  return (
    <div>
      <div className="tarjeta-filtros">
        <input
          className="campo"
          placeholder="Buscar por evento, equipo, CT, inversor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className="campo" value={medio} onChange={(e) => setMedio(e.target.value)}>
          {MEDIOS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          className="campo"
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
        />
        <input
          className="campo"
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
        />
        <button className="btn-secundario" onClick={cargar}>
          Recargar
        </button>
      </div>

      <p className="resumen">
        {visibles.length} evento(s) de {filtrados.length} encontrados
      </p>

      {cargando ? (
        <p className="aviso">Cargando eventos...</p>
      ) : visibles.length === 0 ? (
        <p className="aviso">No hay eventos que coincidan con la búsqueda.</p>
      ) : (
        <div className="tabla-envoltorio">
          <table className="tabla">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Medio</th>
                <th>CT</th>
                <th>Inv</th>
                <th>Tk</th>
                <th>Str</th>
                <th>Dispositivo</th>
                <th>Cant.</th>
                <th>Evento</th>
                <th>Solución</th>
                <th>N° Correctivo</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((ev) => (
                <tr key={ev.id}>
                  <td className="celda-foto">
                    {(ev.fotos || []).length > 0 ? (
                      <button className="btn-foto" onClick={() => abrirFoto(ev)}>
                        📷 {ev.fotos.length}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{fechaCorta(ev.fecha)}</td>
                  <td>{ev.hora?.slice(0, 5)}</td>
                  <td>
                    <span className="etiqueta-medio">{ev.medio_deteccion}</span>
                  </td>
                  <td>{ev.ct}</td>
                  <td>{ev.inversor}</td>
                  <td>{ev.tracker}</td>
                  <td>{ev.string_num}</td>
                  <td>{ev.dispositivo}</td>
                  <td>{ev.cantidad}</td>
                  <td className="celda-ancha">{ev.evento}</td>
                  <td className="celda-ancha">{ev.solucion}</td>
                  <td>{ev.n_correctivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtrados.length > limite && (
        <div className="pie-tabla">
          <button className="btn-secundario" onClick={() => setLimite(limite + 300)}>
            Mostrar más ({filtrados.length - limite} restantes)
          </button>
        </div>
      )}

      {galeria && (
        <div className="lightbox" onClick={() => setGaleria(null)}>
          <div className="lightbox-caja" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-cerrar" onClick={() => setGaleria(null)}>
              ✕
            </button>
            {galeria.urls.length > 1 && (
              <>
                <button
                  className="lightbox-nav izquierda"
                  onClick={() => cambiarFoto(-1)}
                >
                  ◀
                </button>
                <button
                  className="lightbox-nav derecha"
                  onClick={() => cambiarFoto(1)}
                >
                  ▶
                </button>
              </>
            )}
            <img
              className="lightbox-img"
              src={galeria.urls[galeria.idx]}
              alt={`Foto del evento ${galeria.titulo}`}
            />
            <p className="lightbox-pie">
              {galeria.titulo} · {galeria.idx + 1} / {galeria.urls.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
