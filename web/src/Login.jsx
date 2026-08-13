import { useState } from "react";
import { supabase } from "./supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function entrar(e) {
    e.preventDefault();
    if (!email || !password) {
      setMensaje("Escribe tu correo y contraseña.");
      return;
    }
    setCargando(true);
    setMensaje("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);

    if (error) {
      setMensaje(error.message);
    }
  }

  return (
    <div className="login-fondo">
      <form className="login-tarjeta" onSubmit={entrar}>
        <div className="login-marca">
          <span className="login-sol" title="Energía solar">☀️</span>
          <div className="login-paneles">
            {[16, 6, -6, -16].map((ang, i) => (
              <svg
                key={i}
                className="login-panel"
                style={{ transform: `rotate(${ang}deg)` }}
                viewBox="0 0 60 40"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="54" height="34" rx="4" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2" />
                <line x1="21" y1="5" x2="21" y2="35" stroke="#60a5fa" strokeWidth="1.5" />
                <line x1="39" y1="5" x2="39" y2="35" stroke="#60a5fa" strokeWidth="1.5" />
                <line x1="5" y1="15" x2="55" y2="15" stroke="#60a5fa" strokeWidth="1.5" />
                <line x1="5" y1="25" x2="55" y2="25" stroke="#60a5fa" strokeWidth="1.5" />
              </svg>
            ))}
          </div>
          <img src="/logo.png" alt="Ortiz Energía" className="login-logo" />
          <h1>Bitácora de mantenimiento</h1>
          <h2>Planta Fotovoltaica La Independencia</h2>
        </div>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button className="btn-primario" type="submit" disabled={cargando}>
          {cargando ? "Entrando..." : "Iniciar sesión"}
        </button>
        {mensaje && <p className="aviso">{mensaje}</p>}
        <p className="login-pie">Acceso restringido al equipo de operación y mantenimiento.</p>
      </form>
    </div>
  );
}
