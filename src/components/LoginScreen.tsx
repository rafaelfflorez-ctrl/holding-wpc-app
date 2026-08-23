import React, { useState } from "react";
import { Lock, Mail, LogIn, AlertTriangle, CloudOff, Loader2, ShieldCheck } from "lucide-react";
import MakerHoldingLogo from "./MakerHoldingLogo";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  configMissing: boolean;
  error?: string | null;
}

export default function LoginScreen({ onLogin, configMissing, error }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError("Ingrese su correo y contraseña.");
      return;
    }
    setLoading(true);
    setLocalError(null);
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setLocalError(err?.message || "No se pudo iniciar sesión. Verifique sus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md min-[1920px]:max-w-lg min-[2560px]:max-w-xl">
        <div className="flex justify-center mb-6">
          <MakerHoldingLogo variant="horizontal" size="md" lightText={true} />
        </div>

        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-7 flex flex-col gap-5">
          <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" /> Acceso Seguro al Holding
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              CONTROL GENERAL HOLDING WPC · Matriz multi-compañía
            </p>
          </div>

          {configMissing ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold">
                <CloudOff className="w-4 h-4 text-amber-600" /> Supabase no configurado
              </div>
              <p>
                Para usar la plataforma en la nube (cualquier dispositivo), configura en los{" "}
                <strong>Secrets del proyecto</strong>:
              </p>
              <pre className="bg-amber-100/60 rounded-lg p-2 text-[10px] font-mono overflow-x-auto">
                SUPABASE_URL=...
                {"\n"}SUPABASE_ANON_KEY=...
                {"\n"}GEMINI_API_KEY=...
              </pre>
              <p>
                Luego ejecuta <code className="bg-amber-100 px-1 rounded">supabase/schema.sql</code> en
                el SQL Editor de tu proyecto Supabase y crea el primer usuario en{" "}
                <strong>Authentication → Users → Add user</strong>.
              </p>
              {(error && error !== "SUPABASE_NO_CONFIGURADA") && (
                <p className="text-rose-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {error}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Correo electrónico</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="usuario@holdingmaker.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Contraseña</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-300"
                  />
                </div>
              </div>

              {(localError || error) && (
                <p className="text-xs text-rose-700 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{localError || error}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                Iniciar Sesión
              </button>
            </form>
          )}

          <div className="flex items-center gap-2 text-[10px] text-slate-400 border-t border-slate-100 pt-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>
              Autenticación y datos sincronizados en la nube (Supabase). Los roles se aplican según el
              perfil del usuario autenticado.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
