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
      <form className="login-tarjeta" onSubmit={entrar}>
        <div className="login-marca">
          <img src="/logo-ortiz.png" alt="Grupo Ortiz" className="login-logo" />
          <img src="/logo-potenza.png" alt="Potenza" className="login-potenza" />
        </div>
        <div className="login-banderas" aria-label="España y El Salvador">
          <img
            className="banderas-imagen"
            src="/banderas-espana-el-salvador.webp"
            alt="Banderas de España y El Salvador"
          />
        </div>
        <div className="login-bienvenida">
          <h1>GMAO Independencia</h1>
          <p>El Salvador · Acceso operativo</p>
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
        <p className="login-pie">Aviso de privacidad</p>
        <p className="login-privacidad">Uso exclusivo de personal autorizado. La información registrada es privada.</p>
      </form>
    </div>
  );
}
