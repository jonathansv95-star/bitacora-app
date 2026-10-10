import { useState } from "react";
import { supabase } from "./supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
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
      <div className="login-escena" aria-hidden="true">
        <div className="login-escena-contenido">
          <span className="login-etiqueta">OPERACION Y MANTENIMIENTO</span>
          <span className="login-sol">☀️</span>
          <h1>La Independencia</h1>
          <p>Control operativo de tu planta fotovoltaica.</p>
          <div className="login-estadistica">
            <strong>Bitacora digital</strong>
            <span>Todo el seguimiento en un solo lugar</span>
          </div>
        </div>
        <div className="login-lineas" />
      </div>

      <form className="login-tarjeta" onSubmit={entrar}>
        <div className="login-marca">
          <img src="/logo.png" alt="Ortiz Energía" className="login-logo" />
          <div>
            <h2>Bitácora de mantenimiento</h2>
            <p>Planta Fotovoltaica La Independencia</p>
          </div>
        </div>
        <div className="login-bienvenida">
          <h1>Bienvenido de nuevo</h1>
          <p>Ingresa tus datos para continuar</p>
        </div>
        <label className="login-campo">
          <span>Correo electrónico</span>
          <div className="login-input-wrap">
            <span className="login-input-icono" aria-hidden="true">@</span>
            <input
              type="email"
              placeholder="tu-correo@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </label>
        <label className="login-campo">
          <span>Contraseña</span>
          <div className="login-input-wrap">
            <span className="login-input-icono" aria-hidden="true">*</span>
            <input
              type={mostrarPassword ? "text" : "password"}
              placeholder="Escribe tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              className="login-ver-password"
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {mostrarPassword ? "Ocultar" : "Ver"}
            </button>
          </div>
        </label>
        <button className="btn-primario login-submit" type="submit" disabled={cargando}>
          <span>{cargando ? "Validando acceso..." : "Iniciar sesión"}</span>
          {!cargando && <span aria-hidden="true">→</span>}
        </button>
        {mensaje && <p className="aviso">{mensaje}</p>}
        <p className="login-pie">Acceso restringido al equipo de operación y mantenimiento.</p>
      </form>
    </div>
  );
}
