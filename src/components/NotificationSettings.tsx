import React, { useState } from "react";
import { ThresholdSetting, FinancialMetric, UserRole } from "../types";
import { 
  BellRing, 
  Settings2, 
  Plus, 
  Trash2, 
  AlertOctagon, 
  HelpCircle, 
  Save, 
  AlertTriangle,
  UserCheck,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

interface NotificationSettingsProps {
  thresholds: ThresholdSetting[];
  currentUserRole: UserRole;
  onUpdateThreshold: (id: string, updated: Partial<ThresholdSetting>) => void;
  onAddThreshold: (newThresh: Omit<ThresholdSetting, "id">) => void;
  onDeleteThreshold: (id: string) => void;
  metrics: FinancialMetric;
}

export default function NotificationSettings({
  thresholds,
  currentUserRole,
  onUpdateThreshold,
  onAddThreshold,
  onDeleteThreshold,
  metrics,
}: NotificationSettingsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [metricName, setMetricName] = useState<keyof FinancialMetric>("flujoCaja");
  const [displayName, setDisplayName] = useState("");
  const [operator, setOperator] = useState<"GREATER_THAN" | "LESS_THAN">("LESS_THAN");
  const [value, setValue] = useState("");

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getMetricNameDisplay = (mName: string) => {
    switch (mName) {
      case "ventas": return "Ventas Totales (Mes)";
      case "compras": return "Compras & Costos";
      case "gastos": return "Gastos Operacionales";
      case "flujoCaja": return "Flujo de Caja Neto";
      case "cuentasPorCobrar": return "Cartera (Cuentas por Cobrar)";
      case "cuentasPorPagar": return "Proveedores (Cuentas por Pagar)";
      case "inventario": return "Inventario de Mercancía";
      case "margenUtilidad": return "Margen de Utilidad (%)";
      default: return mName;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !value) return;

    onAddThreshold({
      metricName,
      displayName,
      operator,
      value: parseFloat(value),
      enabled: true,
    });

    setDisplayName("");
    setValue("");
    setIsAdding(false);
  };

  const isEditable = currentUserRole === UserRole.ADMINISTRADOR;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="notification-settings-container">
      {/* Left Columns: Configured Thresholds list */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col gap-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BellRing className="w-5 h-5 text-sky-600" />
              Límites y Reglas de Alerta Crítica (KPIs)
            </h2>
            <p className="text-xs text-slate-400">Establezca los umbrales para notificaciones y alertas de monitoreo en tiempo real</p>
          </div>

          {isEditable && (
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Agregar Alerta
            </button>
          )}
        </div>

        {/* Security / Role restriction warning */}
        {!isEditable && (
          <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-600" />
            <span>Su rol actual (<strong>{currentUserRole}</strong>) solo tiene permisos de lectura. Comuníquese con Gerencia (Administrador) para ajustar alertas financieras.</span>
          </div>
        )}

        {/* Add Threshold Form */}
        {isAdding && isEditable && (
          <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3 animate-fadeIn">
            <h3 className="text-xs font-bold text-slate-700">Crear Regla de Alerta</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Metric Select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Métrica de Control</label>
                <select
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value as keyof FinancialMetric)}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="ventas">Ventas Totales</option>
                  <option value="compras">Compras & Costos</option>
                  <option value="gastos">Gastos Operacionales</option>
                  <option value="flujoCaja">Flujo de Caja Neto</option>
                  <option value="cuentasPorCobrar">Cuentas por Cobrar (Cartera)</option>
                  <option value="cuentasPorPagar">Cuentas por Pagar (Proveedores)</option>
                  <option value="inventario">Inventario de Mercancía</option>
                  <option value="margenUtilidad">Margen de Utilidad (%)</option>
                </select>
              </div>

              {/* Operator */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Condición de Disparo</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as "GREATER_THAN" | "LESS_THAN")}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="LESS_THAN">Es Menor Que (&lt;)</option>
                  <option value="GREATER_THAN">Es Mayor Que (&gt;)</option>
                </select>
              </div>

              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre Descriptivo de la Regla</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Alerta Deficit de Caja"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              {/* Threshold Value */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Valor de Alarma (COP o %)</label>
                <input
                  type="number"
                  required
                  placeholder="Ej: 15000000"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs font-semibold px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="text-xs font-semibold px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
              >
                Guardar Regla
              </button>
            </div>
          </form>
        )}

        {/* Threshold List cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {thresholds.map((thresh) => {
            const currentValue = metrics[thresh.metricName as keyof FinancialMetric] ?? 0;
            const isMargen = thresh.metricName === "margenUtilidad";
            const formatValue = (v: number) => isMargen ? `${v}%` : formatCOP(v);
            
            // Check status
            let isTriggered = false;
            if (thresh.enabled) {
              if (thresh.operator === "LESS_THAN") {
                isTriggered = currentValue < thresh.value;
              } else {
                isTriggered = currentValue > thresh.value;
              }
            }

            return (
              <div 
                key={thresh.id} 
                className={`p-4 border rounded-xl flex flex-col justify-between gap-3 transition-all ${
                  isTriggered 
                    ? "bg-red-50/40 border-red-200 ring-1 ring-red-500/10" 
                    : "bg-white border-slate-100"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-slate-700">{thresh.displayName}</h4>
                    {isTriggered && (
                      <span className="text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                        S.O.S DISPARADO
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Regla: {getMetricNameDisplay(thresh.metricName as string)}</p>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs flex justify-between font-medium">
                  <span className="text-slate-500">Métrica: <strong className="text-slate-800">{formatValue(currentValue)}</strong></span>
                  <span className="text-slate-500">
                    Límite: <strong className="text-slate-800">{thresh.operator === "LESS_THAN" ? "<" : ">"} {formatValue(thresh.value)}</strong>
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                  {/* Toggle status slider */}
                  <button
                    disabled={!isEditable}
                    onClick={() => onUpdateThreshold(thresh.id, { enabled: !thresh.enabled })}
                    className={`flex items-center gap-1 text-[10px] font-bold ${
                      thresh.enabled 
                        ? "text-emerald-600" 
                        : "text-slate-400"
                    }`}
                  >
                    {thresh.enabled ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-emerald-500" /> Alerta Habilitada
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-slate-300" /> Alerta Desactivada
                      </>
                    )}
                  </button>

                  {/* Delete (Admin Only) */}
                  {isEditable && (
                    <button
                      onClick={() => onDeleteThreshold(thresh.id)}
                      className="p-1 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                      title="Eliminar regla"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Alerts and threshold help instructions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-sky-600" />
            Políticas de Alerta Temprana
          </h2>
          <p className="text-[11px] text-slate-400">Guía práctica para configurar la salud financiera corporativa</p>
        </div>

        <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-500">
          <div className="p-3 bg-indigo-50/40 border border-indigo-50 rounded-xl flex gap-2">
            <AlertTriangle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p>
              <strong>Flujo de Caja:</strong> La Caja Mínima requerida para el Holding está establecida en $1.000.000 COP para salvaguardar la operación.
            </p>
          </div>

          <div className="p-3 bg-amber-50/40 border border-amber-50 rounded-xl flex gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Cartera (Cuentas por Cobrar):</strong> Superar el umbral estipulado indica retrasos de cobros y posible estrangulamiento de caja.
            </p>
          </div>

          <div className="p-3 bg-rose-50/40 border border-rose-50 rounded-xl flex gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p>
              <strong>Margen de Utilidad:</strong> Un margen inferior al objetivo exige renegociar costos de venta con proveedores mayoristas o reajustar precios al público.
            </p>
          </div>
        </div>

        <div className="mt-auto p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-400">
          *Las alertas automáticas gatillan avisos visuales prioritarios e insertan registros en la bitácora contable.
        </div>
      </div>
    </div>
  );
}
