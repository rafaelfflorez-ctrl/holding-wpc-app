import { getSupabaseClient } from "./supabase";

/**
 * fetch() con la sesión de Supabase adjunta (Bearer token).
 * Todas las rutas /api/* del servidor exigen autenticación (seguridad B1).
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  try {
    const supabase = await getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      headers.set("Authorization", `Bearer ${data.session.access_token}`);
    }
  } catch (e) {
    // Sin sesión: el servidor responderá 401.
  }
  return fetch(path, { ...options, headers });
}
