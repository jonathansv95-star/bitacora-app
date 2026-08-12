import { useState } from "react";
import { supabase } from "./supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modoRegistro, setModoRegistro] = useState(false);
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
    const { error } = modoRegistro
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);

    if (error) {
      setMensaje(error.message);
    } else if (modoRegistro) {
      setMensaje("Cuenta creada. Revisa tu correo si se requiere confirmación.");
    }
  }

  return (
    <div className="login-fondo">
      <form className="login-tarjeta" onSubmit={entrar}>
        <div className="login-marca">
          <span className="login-sol" title="Energía solar">☀️</span>
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
          {cargando ? "Entrando..." : modoRegistro ? "Crear cuenta" : "Iniciar sesión"}
        </button>
        {mensaje && <p className="aviso">{mensaje}</p>}
        <button
          type="button"
          className="enlace"
          onClick={() => {
            setModoRegistro(!modoRegistro);
            setMensaje("");
          }}
        >
          {modoRegistro ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
        </button>
        <p className="login-pie">Acceso restringido al equipo de operación y mantenimiento.</p>
      </form>
    </div>
  );
}
