import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const ROLES = [
  { valor: "observador", nombre: "Observador (solo ve)" },
  { valor: "editor", nombre: "Editor (puede modificar)" },
  { valor: "admin", nombre: "Admin (total)" },
];

export default function UsuariosTab() {
  const [cargando, setCargando] = useState(true);
  const [esAdmin, setEsAdmin] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rolNuevo, setRolNuevo] = useState("observador");
  const [passEditando, setPassEditando] = useState(null);
  const [nuevaPass, setNuevaPass] = useState("");

  async function cargarUsuarios() {
    const { data, error } = await supabase.functions.invoke("admin-usuarios", {
      body: { action: "list" },
    });
    if (error) {
      let detalle = error.message || String(error);
      try {
        if (error.context && error.context.status) {
          const ctx = await error.context.json();
          detalle = `Status ${error.context.status}: ${ctx.error || ctx.message || error.message}`;
        }
      } catch (e) {}
      setMensaje("No se pudieron cargar los usuarios: " + detalle);
      return;
    }
    setUsuarios(data?.users || []);
  }

  useEffect(() => {
    (async () => {
      try {
        const { data: rol } = await supabase.rpc("mi_rol");
        if (rol === "admin") {
          setEsAdmin(true);
          await cargarUsuarios();
        }
      } catch (e) {}
      setCargando(false);
    })();
  }, []);

  async function crearUsuario(e) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setMensaje("Escribe el correo y la contraseña.");
      return;
    }
    setGuardando(true);
    setMensaje("");
    const { data, error } = await supabase.functions.invoke("admin-usuarios", {
      body: { action: "create", email: email.trim(), password, rol: rolNuevo },
    });
    setGuardando(false);
    if (error) {
      setMensaje("Error al crear: " + (error.message || JSON.stringify(error)));
      return;
    }
    setEmail("");
    setPassword("");
    setMensaje(`Usuario ${email.trim()} creado como ${rolNuevo}.`);
    cargarUsuarios();
  }

  async function cambiarRol(usuario, rol) {
    const { error } = await supabase.functions.invoke("admin-usuarios", {
      body: { action: "updateRol", user_id: usuario.id, rol },
    });
    if (error) {
      setMensaje("Error al cambiar rol: " + error.message);
      return;
    }
    setMensaje(`Rol de ${usuario.email} actualizado a ${rol}.`);
    cargarUsuarios();
  }

  async function borrarUsuario(usuario) {
    if (!confirm(`¿Borrar el usuario ${usuario.email}?`)) return;
    const { error } = await supabase.functions.invoke("admin-usuarios", {
      body: { action: "delete", user_id: usuario.id },
    });
    if (error) {
      setMensaje("Error al borrar: " + error.message);
      return;
    }
    setMensaje(`Usuario ${usuario.email} eliminado.`);
    cargarUsuarios();
  }

  async function cambiarPassword(usuario) {
    if (!nuevaPass) {
      setMensaje("Escribe la nueva contraseña.");
      return;
    }
    const { error } = await supabase.functions.invoke("admin-usuarios", {
      body: { action: "resetPassword", user_id: usuario.id, password: nuevaPass },
    });
    if (error) {
      setMensaje("Error al cambiar contraseña: " + error.message);
      return;
    }
    setMensaje(`Contraseña de ${usuario.email} actualizada.`);
    setPassEditando(null);
    setNuevaPass("");
  }

  if (cargando) return <p className="aviso">Cargando...</p>;

  if (!esAdmin) {
    return <p className="aviso">No tienes permiso para gestionar usuarios.</p>;
  }

  return (
    <div>
      <div className="tarjeta">
        <h2 style={{ marginTop: 0 }}>Crear usuario</h2>
        <form className="fila-formulario" onSubmit={crearUsuario}>
          <input
            className="campo"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <input
            className="campo"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ maxWidth: 200 }}
          />
          <select
            className="campo"
            value={rolNuevo}
            onChange={(e) => setRolNuevo(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.nombre}
              </option>
            ))}
          </select>
          <button className="btn-primario" type="submit" disabled={guardando}>
            {guardando ? "Creando..." : "+ Crear usuario"}
          </button>
        </form>
        {mensaje && <p className="aviso" style={{ marginTop: 12 }}>{mensaje}</p>}
      </div>

      <div className="tarjeta">
        <h2 style={{ marginTop: 0 }}>Usuarios</h2>
        {usuarios.length === 0 ? (
          <p className="aviso">No hay usuarios.</p>
        ) : (
          <ul className="lista-tareas">
            {usuarios.map((u) => (
              <li key={u.id} className="tarea">
                <div className="tarea-fila">
                  <div className="tarea-texto">
                    <strong>{u.email}</strong>
                    {u.ultimo_login && (
                      <span className="tarea-meta">
                        Último acceso: {new Date(u.ultimo_login).toLocaleString("es-ES")}
                      </span>
                    )}
                  </div>
                  <div className="tarea-acciones">
                    <select
                      className="campo"
                      value={u.rol}
                      onChange={(e) => cambiarRol(u, e.target.value)}
                      style={{ width: 190 }}
                    >
                      {ROLES.map((r) => (
                        <option key={r.valor} value={r.valor}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-editar"
                      onClick={() => {
                        setPassEditando(passEditando === u.id ? null : u.id);
                        setNuevaPass("");
                      }}
                    >
                      🔑 Contraseña
                    </button>
                    <button className="btn-borrar" onClick={() => borrarUsuario(u)}>
                      Borrar
                    </button>
                  </div>
                </div>
                {passEditando === u.id && (
                  <div className="manual-lista">
                    <div className="fila-formulario">
                      <input
                        className="campo"
                        type="password"
                        placeholder="Nueva contraseña"
                        value={nuevaPass}
                        onChange={(e) => setNuevaPass(e.target.value)}
                        style={{ maxWidth: 220 }}
                      />
                      <button className="btn-primario" onClick={() => cambiarPassword(u)}>
                        Guardar
                      </button>
                      <button
                        className="btn-secundario"
                        onClick={() => {
                          setPassEditando(null);
                          setNuevaPass("");
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
