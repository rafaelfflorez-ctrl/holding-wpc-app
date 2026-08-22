import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  hasGeminiKey: boolean;
  hasServiceRole: boolean;
  modelName: string;
}

let cachedConfig: AppConfig | null = null;
let cachedClient: SupabaseClient | null = null;

/**
 * Obtiene la configuración pública desde el servidor (/api/config).
 * El servidor inyecta SUPABASE_URL / SUPABASE_ANON_KEY desde sus secrets.
 */
export async function fetchConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;
  const res = await fetch("/api/config", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo contactar el servidor para la configuración.");
  cachedConfig = await res.json();
  return cachedConfig!;
}

export function isSupabaseConfigured(cfg: AppConfig): boolean {
  return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
}

/**
 * Crea (o reutiliza) el cliente Supabase con la anon key pública.
 * La anon key es pública por diseño; la seguridad real viene del RLS + Auth.
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (cachedClient) return cachedClient;
  const cfg = await fetchConfig();
  if (!isSupabaseConfigured(cfg)) {
    throw new Error("SUPABASE_NO_CONFIGURADA");
  }
  cachedClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return cachedClient;
}
