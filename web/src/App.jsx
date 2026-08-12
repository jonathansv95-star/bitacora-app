import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Login from "./Login.jsx";
import DashboardTab from "./DashboardTab.jsx";
import TareasTab from "./TareasTab.jsx";
import EventosTab from "./EventosTab.jsx";
import ExcelTab from "./ExcelTab.jsx";

const PESTANAS = [
  { id: "inicio", nombre: "Tablero", icono: "☀️" },
  { id: "tareas", nombre: "Tareas del día", icono: "🔧" },
  { id: "eventos", nombre: "Eventos", icono: "⚡" },
  { id: "excel", nombre: "Excel mensual", icono: "📄" },
];

export default function App() {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState("inicio");
  const [tema, setTema] = useState(() => localStorage.getItem("bitacora_tema") || "claro");

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem("bitacora_tema", tema);
  }, [tema]);

  useEffect(() => {
    let vigente = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!vigente) return;
        setSesion(session);
        setCargando(false);
      })
      .catch(() => {
        if (vigente) setCargando(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!vigente) return;
      setSesion(session);
      setCargando(false);
    });

    return () => {
      vigente = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sesion) return;
    (async () => {
      try {
        const hoy = new Date();
        if (hoy.getMonth() < 1) return; // solo a partir de febrero
        const anio = hoy.getFullYear();
        const { count, error } = await supabase
          .from("tareas")
          .select("id", { count: "exact", head: true })
          .gte("fecha", `${anio}-01-01`);
        if (error || !count) return; // el año actual aún no se generó
        await supabase.from("tareas").delete().lt("fecha", `${anio}-01-01`);
      } catch (e) {}
    })();
  }, [sesion]);

  if (cargando) {
    return <div className="centro-pantalla">Cargando...</div>;
  }

  if (!sesion) {
    return <Login />;
  }

  return (
    <div className="app">
      <header className="barra">
        <div className="marca">
          <div className="logo-caja">
            <img src="/logo.png" alt="Ortiz Energía" className="logo" />
          </div>
          <div className="titulo-barra">
            <h1>Plan Preventivo Independencia</h1>
            <p>Tablero de avance · mantenimiento y eventos</p>
          </div>
        </div>
        <div className="usuario">
          <button
            className="btn-tema"
            onClick={() => setTema(tema === "claro" ? "oscuro" : "claro")}
            title={tema === "claro" ? "Activar modo oscuro" : "Activar modo claro"}
          >
            {tema === "claro" ? "🌙" : "☀️"}
          </button>
          <span className="correo">{sesion.user.email}</span>
          <button className="btn-secundario" onClick={() => supabase.auth.signOut()}>
            Salir
          </button>
        </div>
      </header>

      <nav className="pestanas">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            className={pestana === p.id ? "activa" : ""}
            onClick={() => setPestana(p.id)}
          >
            <span className="pestana-icono">{p.icono}</span>
            {p.nombre}
          </button>
        ))}
      </nav>

      <main className="contenido">
        <div className="contenido-entrada" key={pestana}>
          {pestana === "inicio" && <DashboardTab onIr={setPestana} />}
          {pestana === "tareas" && <TareasTab />}
          {pestana === "eventos" && <EventosTab />}
          {pestana === "excel" && <ExcelTab />}
        </div>
      </main>

      <footer className="pie">
        <span>Idea y desarrollo: Jonathan Guzmán</span>
      </footer>
    </div>
  );
}
