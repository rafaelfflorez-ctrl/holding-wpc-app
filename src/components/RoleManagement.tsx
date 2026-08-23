import React, { useState } from "react";
import { UserProfile, UserRole } from "../types";
import WendySignatureBlock from "./WendySignatureBlock";
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Lock, 
  Unlock, 
  Key, 
  Eye, 
  Edit3, 
  CheckCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

interface RoleManagementProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onCreateUser: (payload: { email: string; password: string; name: string; role: UserRole; title?: string }) => Promise<any>;
  onToggleUserStatus: (userId: string) => void;
  onUpdateUserRole: (userId: string, role: UserRole) => void;
  onChangePassword: (newPassword: string) => Promise<any>;
}

export default function RoleManagement({
  users,
  currentUser,
  onCreateUser,
  onToggleUserStatus,
  onUpdateUserRole,
  onChangePassword,
}: RoleManagementProps) {
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newRole, setNewRole] = useState<UserRole>(UserRole.AUXILIAR_CONTABLE);
  const [newAvatar, setNewAvatar] = useState("");
  const [creatingError, setCreatingError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) return;
    setIsCreating(true);
    setCreatingError(null);
    try {
      await onCreateUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        title: newTitle || undefined,
        role: newRole,
      });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewTitle("");
      setNewAvatar("");
      setIsAddingUser(false);
    } catch (err: any) {
      setCreatingError(err?.message || "No se pudo crear el usuario.");
    } finally {
      setIsCreating(false);
    }
  };

  // Cambio de contraseña del usuario autenticado (self-service).
  const handleChangePassword = async () => {
    const newPass = prompt("Nueva contraseña (mínimo 6 caracteres):");
    if (!newPass) return;
    if (newPass.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    try {
      await onChangePassword(newPass);
      alert("✓ Contraseña actualizada correctamente.");
    } catch (e: any) {
      alert(e?.message || "No se pudo cambiar la contraseña.");
    }
  };

  // Permission Matrix based on Colombian compliance guidelines & user requirements
  const permissionsMatrix = [
    {
      action: "Registrar hecho económico (Venta/Compra)",
      ADMINISTRADOR: true,
      CONTADOR: true,
      AUXILIAR_CONTABLE: true,
      notes: "El Auxiliar genera documentos en estado 'Borrador' únicamente.",
    },
    {
      action: "Contabilizar e integrar pólizas y PUC",
      ADMINISTRADOR: true,
      CONTADOR: true,
      AUXILIAR_CONTABLE: false,
      notes: "Aprobación formal del cierre y balance mensual.",
    },
    {
      action: "Anular documentos oficiales",
      ADMINISTRADOR: true,
      CONTADOR: true,
      AUXILIAR_CONTABLE: false,
      notes: "No se elimina, se reversa el movimiento contable.",
    },
    {
      action: "Configurar alertas y umbrales de KPI",
      ADMINISTRADOR: true,
      CONTADOR: false,
      AUXILIAR_CONTABLE: false,
      notes: "Solo gerencia administrativa establece límites presupuestarios.",
    },
    {
      action: "Eliminar registros físicos de la BD",
      ADMINISTRADOR: true,
      CONTADOR: false,
      AUXILIAR_CONTABLE: false,
      notes: "Borrado físico restringido por auditoría fiscal.",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="role-management-container">
      {/* Left side: Current Active Context Simulation & Users list */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col gap-5">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              Gestión de Usuarios y Roles de Seguridad
            </h2>
            <p className="text-xs text-slate-400">Cambie el contexto para validar los privilegios y accesos en el ERP</p>
          </div>

          {currentUser.role === UserRole.ADMINISTRADOR && (
            <button
              onClick={() => setIsAddingUser(!isAddingUser)}
              className="flex items-center gap-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Agregar Usuario
            </button>
          )}
        </div>

        {/* Add user form */}
        {isAddingUser && (
          <form onSubmit={handleCreateUser} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3 animate-fadeIn">
            <h3 className="text-xs font-bold text-slate-700">Crear Nuevo Perfil Contable</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Camila Díaz"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="laura.diaz@empresa.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Contraseña temporal</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Contraseña inicial del nuevo usuario"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rol Asignado</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  <option value={UserRole.ADMINISTRADOR}>ADMINISTRADOR (Gerente)</option>
                  <option value={UserRole.CONTADOR}>CONTADOR (Revisor Fiscal)</option>
                  <option value={UserRole.AUXILIAR_CONTABLE}>AUXILIAR CONTABLE</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">URL de Avatar (Opcional)</label>
                <input
                  type="text"
                  placeholder="https://url-imagen.jpg"
                  value={newAvatar}
                  onChange={(e) => setNewAvatar(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {creatingError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                {creatingError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="text-xs font-semibold px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="text-xs font-semibold px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
              >
                {isCreating ? "Creando..." : "Registrar Usuario"}
              </button>
            </div>
          </form>
        )}

        {/* Info banner (real auth) */}
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xs font-bold text-emerald-900">Autenticación en la nube activa</p>
              <p className="text-[10px] text-emerald-700">
                Cada usuario inicia sesión con su correo y contraseña (Supabase Auth). Para cambiar de
                usuario, cierre la sesión actual desde la barra superior.
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase">
            Seguro
          </span>
        </div>

        {/* Users List Table */}
        <div className="flex flex-col gap-3">
          {users.map((u) => {
            const isSelf = u.id === currentUser.id;
            
            return (
              <div 
                key={u.id} 
                className={`p-3.5 border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
                  isSelf 
                    ? "bg-sky-50/20 border-sky-200 ring-1 ring-sky-500/10" 
                    : "bg-white border-slate-100 hover:border-slate-200"
                } ${!u.isActive ? 'opacity-60 bg-slate-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={u.avatar} 
                    alt={u.name} 
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-800">{u.name}</h4>
                      {isSelf && (
                        <span className="text-[9px] bg-sky-600 text-white font-extrabold px-1.5 py-0.5 rounded-md">
                          ACTIVO
                        </span>
                      )}
                    </div>
                    {u.title && (
                      <p className="text-[11px] font-extrabold text-indigo-600 mt-0.5">{u.title}</p>
                    )}
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                        u.role === UserRole.ADMINISTRADOR 
                          ? "bg-purple-100 text-purple-700 border border-purple-200" 
                          : u.role === UserRole.CONTADOR 
                          ? "bg-blue-100 text-blue-700 border border-blue-200" 
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {u.role.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-slate-400">Ingreso: {u.lastLogin}</span>
                    </div>
                    {u.id === "u-wendy" && (
                      <div className="mt-2.5">
                        <WendySignatureBlock variant="stamp" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulation Switch Buttons & Lock Status */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0">
                  {/* Status Toggle (Admin Only) */}
                  {currentUser.role === UserRole.ADMINISTRADOR && !isSelf && (
                    <button
                      onClick={() => onToggleUserStatus(u.id)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500"
                      title={u.isActive ? "Desactivar Cuenta" : "Activar Cuenta"}
                    >
                      {u.isActive ? (
                        <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                          <ToggleRight className="w-5 h-5 text-emerald-600" />
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                          <ToggleLeft className="w-5 h-5 text-slate-400" />
                        </span>
                      )}
                    </button>
                  )}

                  {/* Role Upgrade (Admin Only) */}
                  {currentUser.role === UserRole.ADMINISTRADOR && !isSelf && (
                    <select
                      value={u.role}
                      onChange={(e) => onUpdateUserRole(u.id, e.target.value as UserRole)}
                      className="text-[10px] p-1 bg-slate-50 border border-slate-200 rounded text-slate-600 font-bold"
                    >
                      <option value={UserRole.ADMINISTRADOR}>ADMINISTRADOR</option>
                      <option value={UserRole.CONTADOR}>CONTADOR</option>
                      <option value={UserRole.AUXILIAR_CONTABLE}>AUXILIAR</option>
                    </select>
                  )}

                  {/* Switch Action */}
                  {!isSelf && u.isActive && (
                    <span className="text-[10px] text-slate-400 font-semibold border border-slate-100 bg-slate-50 px-2 py-1 rounded-md">
                      Acceso con su propia credencial
                    </span>
                  )}

                  {/* Self password change */}
                  {isSelf && (
                    <button
                      onClick={() => void handleChangePassword()}
                      className="text-[10px] font-extrabold text-slate-600 border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-md transition-colors"
                    >
                      Cambiar contraseña
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side: Security Policy Matrix & Permissions Info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Políticas de Acceso y Permisos NIIF
          </h2>
          <p className="text-[11px] text-slate-400">Privilegios definidos según el perfil tributario de la empresa</p>
        </div>

        <div className="flex flex-col gap-3">
          {permissionsMatrix.map((item, index) => (
            <div key={index} className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-700">{item.action}</span>
              </div>

              {/* Roles Badges status indicator */}
              <div className="grid grid-cols-3 gap-1.5 text-[9px] text-center font-bold">
                <div className={`p-1 rounded flex items-center justify-center gap-1 border ${
                  item.ADMINISTRADOR 
                    ? "bg-purple-50 text-purple-700 border-purple-100" 
                    : "bg-slate-100 text-slate-300 border-transparent"
                }`}>
                  ADMIN {item.ADMINISTRADOR ? "✓" : "✗"}
                </div>
                <div className={`p-1 rounded flex items-center justify-center gap-1 border ${
                  item.CONTADOR 
                    ? "bg-blue-50 text-blue-700 border-blue-100" 
                    : "bg-slate-100 text-slate-300 border-transparent"
                }`}>
                  CONTADOR {item.CONTADOR ? "✓" : "✗"}
                </div>
                <div className={`p-1 rounded flex items-center justify-center gap-1 border ${
                  item.AUXILIAR_CONTABLE 
                    ? "bg-slate-50 text-slate-700 border-slate-200" 
                    : "bg-slate-100 text-slate-300 border-transparent"
                }`}>
                  AUXILIAR {item.AUXILIAR_CONTABLE ? "✓" : "✗"}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic font-medium">*{item.notes}</p>
            </div>
          ))}
        </div>

        {/* Standard Audit info footer */}
        <div className="mt-2 p-3 bg-slate-100/50 rounded-xl border border-slate-100 text-[10px] text-slate-400 flex items-start gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-normal">
            Todos los accesos son auditados fiscalmente bajo el protocolo de logs de la plataforma de CONTROL GENERAL HOLDING WPC. Los cambios de rol se aplican de inmediato en la sesión.
          </p>
        </div>
      </div>
    </div>
  );
}
