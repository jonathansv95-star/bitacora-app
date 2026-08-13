import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) {
    return json(500, { error: "Faltan variables de entorno" });
  }

  // Cliente con permisos de administrador (service role)
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verificar que quien llama tiene sesión y es admin
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return json(401, { error: "No autorizado" });

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authErr } = await userClient.auth.getUser(token);
  if (authErr || !authData?.user) return json(401, { error: "No autorizado" });

  const { data: perfil } = await admin
    .from("perfiles")
    .select("rol")
    .eq("user_id", authData.user.id)
    .single();

  if (perfil?.rol !== "admin") return json(403, { error: "Solo administradores" });

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const { action, email, password, rol, user_id } = body;

  if (action === "list") {
    const { data: usersData, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) return json(400, { error: listErr.message });

    const { data: perfiles } = await admin.from("perfiles").select("user_id, rol, tecnico");
    const mapa = {};
    for (const p of perfiles || []) mapa[p.user_id] = p.rol;

    const lista = (usersData?.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      rol: mapa[u.id] || "observador",
      ultimo_login: u.last_sign_in_at,
    }));
    return json(200, { users: lista });
  }

  if (action === "create") {
    if (!email || !password) return json(400, { error: "Faltan email o contraseña" });
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return json(400, { error: error.message });

    const r = rol || "observador";
    await admin.from("perfiles").upsert({ user_id: data.user.id, rol: r, tecnico: email });
    return json(200, { user: data.user, rol: r });
  }

  if (action === "updateRol") {
    if (!user_id) return json(400, { error: "Falta user_id" });
    const r = rol || "observador";
    const { error } = await admin.from("perfiles").upsert({ user_id, rol: r });
    if (error) return json(400, { error: error.message });
    return json(200, { ok: true });
  }

  if (action === "delete") {
    if (!user_id) return json(400, { error: "Falta user_id" });
    await admin.from("perfiles").delete().eq("user_id", user_id);
    const { error } = await admin.auth.admin.deleteUser(user_id);
    if (error) return json(400, { error: error.message });
    return json(200, { ok: true });
  }

  if (action === "resetPassword") {
    if (!user_id || !password) return json(400, { error: "Faltan user_id o contraseña" });
    const { error } = await admin.auth.admin.updateUserById(user_id, { password });
    if (error) return json(400, { error: error.message });
    return json(200, { ok: true });
  }

  return json(400, { error: "Acción no válida" });
});
