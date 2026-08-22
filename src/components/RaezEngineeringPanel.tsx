import React, { useState } from "react";
import { ServiceOrder, InventoryItem, Estimate, PurchaseOrder } from "../types";
import { 
  Wrench, 
  Plus, 
  Play, 
  CheckCircle2, 
  Settings, 
  Clock, 
  User, 
  DollarSign, 
  AlertTriangle,
  Flame,
  FileCheck,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import CommercialProcurementHub from "./CommercialProcurementHub";

interface RaezEngineeringPanelProps {
  serviceOrders: ServiceOrder[];
  setServiceOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  onAddTransaction: (tx: any) => void;
  estimates: Estimate[];
  setEstimates: React.Dispatch<React.SetStateAction<Estimate[]>>;
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
}

export default function RaezEngineeringPanel({
  serviceOrders,
  setServiceOrders,
  inventory,
  setInventory,
  onAddTransaction,
  estimates,
  setEstimates,
  purchaseOrders,
  setPurchaseOrders
}: RaezEngineeringPanelProps) {
  const [activeInternalTab, setActiveInternalTab] = useState<"PROYECTOS" | "COMMERCIAL">("PROYECTOS");
  const [isCreatingSO, setIsCreatingSO] = useState(false);
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);

  // New Service Order Form
  const [soCustomer, setSoCustomer] = useState("");
  const [soDesc, setSoDesc] = useState("");
  const [soAssigned, setSoAssigned] = useState("Ing. Rafael");
  const [soPriority, setSoPriority] = useState<"BAJA" | "MEDIA" | "ALTA">("MEDIA");
  const [soCost, setSoCost] = useState("");
  const [soPrice, setSoPrice] = useState("");
  const [soDate, setSoDate] = useState("");

  // New Technical Asset Form
  const [assetCode, setAssetCode] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetCost, setAssetCost] = useState("");
  const [assetLocation, setAssetLocation] = useState("Taller Principal Raez, Bogotá");

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const raezAssets = inventory.filter(item => item.companyId === "RAEZ");
  const raezOrders = serviceOrders.filter(so => so.companyId === "RAEZ");

  // Create Service Order
  const handleCreateSO = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(soPrice);
    if (!soCustomer || !soDesc || isNaN(price) || price <= 0) {
      alert("Complete cliente, descripción y un precio de venta válido (mayor que 0).");
      return;
    }

    const newSO: ServiceOrder = {
      id: `OS-RAEZ-2026-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split("T")[0],
      customer: soCustomer,
      assignedTo: soAssigned,
      description: soDesc,
      priority: soPriority,
      status: "PROGRAMADO",
      cost: parseFloat(soCost) || 0,
      price,
      scheduledDate: soDate || new Date().toISOString().split("T")[0],
      companyId: "RAEZ"
    };

    setServiceOrders(prev => [newSO, ...prev]);

    // Reset Form
    setSoCustomer("");
    setSoDesc("");
    setSoAssigned("Ing. Rafael");
    setSoPriority("MEDIA");
    setSoCost("");
    setSoPrice("");
    setSoDate("");
    setIsCreatingSO(false);
    alert(`✓ Orden de Servicio ${newSO.id} programada para ${newSO.customer}.`);
  };

  // Create Asset
  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCode || !assetName || !assetCost) return;

    const costValue = parseFloat(assetCost);

    const newAsset: InventoryItem = {
      id: `INV-RAEZ-${Date.now()}`,
      code: assetCode.toUpperCase(),
      name: assetName,
      productLine: "Herramientas y Maquinaria Técnica",
      quantity: 1,
      unit: "Unidad",
      unitCost: costValue,
      unitPrice: costValue, // Assets hold acquisition cost as book valuation
      status: "SUFICIENTE",
      location: assetLocation,
      companyId: "RAEZ",
      lastUpdated: new Date().toISOString()
    };

    setInventory(prev => [...prev, newAsset]);

    // Financial trigger: register as asset purchase (COMPRA/GASTO) in Raez bookkeeping
    onAddTransaction({
      type: "COMPRA",
      amount: costValue,
      customerSupplier: "Suministro Técnico Raez",
      description: `Compra y capitalización de activo de taller: ${newAsset.name}`,
      category: "Adquisición Maquinaria (Activo)",
      status: "CONTABILIZADO",
      account: "152405 - Herramientas y Maquinaria Técnica - Raez",
      companyId: "RAEZ"
    });

    setAssetCode("");
    setAssetName("");
    setAssetCost("");
    setIsCreatingAsset(false);
    alert(`✓ Activo capitalizado en cuenta 152405: ${newAsset.name}.`);
  };

  // Change Service Order status
  const handleUpdateSoStatus = (id: string, newStatus: "PROGRAMADO" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO") => {
    setServiceOrders(prev => prev.map(so => {
      if (so.id !== id) return so;

      const updated = { ...so, status: newStatus };
      if (newStatus === "COMPLETADO") {
        updated.completedDate = new Date().toISOString().split("T")[0];

        // FINANCIAL CONNECTION: automatically register sale (VENTA) in bookkeeping
        onAddTransaction({
          type: "VENTA",
          amount: so.price,
          customerSupplier: so.customer,
          description: `Ingreso ordinario por finalización de orden de servicio técnico ${so.id}`,
          category: "Ingresos por Servicios Raez",
          status: "CONTABILIZADO",
          account: "413005 - Ingresos Contratos de Ingeniería Raez",
          companyId: "RAEZ"
        });

        // If there is associated cost, register cost of service (COSTOS)
        if (so.cost > 0) {
          onAddTransaction({
            type: "GASTO",
            amount: so.cost,
            customerSupplier: "Operarios de Ingeniería",
            description: `Costo asociado a repuestos/mano de obra orden de servicio ${so.id}`,
            category: "Costo de Ingeniería",
            status: "CONTABILIZADO",
            account: "613005 - Costo de Servicios de Ingeniería Raez",
            companyId: "RAEZ"
          });
        }
      }
      return updated;
    }));

    alert(`✓ Orden de Servicio ${id} actualizada a: ${newStatus}.`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col gap-6" id="raez-engineering-container">
      {/* Sub-tabs switch */}
      <div className="flex border-b border-slate-100 pb-2">
        <button
          onClick={() => setActiveInternalTab("PROYECTOS")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeInternalTab === "PROYECTOS"
              ? "border-amber-500 text-amber-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Wrench className="w-4 h-4" /> Actividades e Ingeniería
        </button>
        <button
          onClick={() => setActiveInternalTab("COMMERCIAL")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeInternalTab === "COMMERCIAL"
              ? "border-amber-500 text-amber-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Cotizaciones y Órdenes de Compra RAEZ (IA)
        </button>
      </div>

      {activeInternalTab === "COMMERCIAL" ? (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <CommercialProcurementHub
            companyId="RAEZ"
            companyName="Raez Ingeniería S.A.S."
            estimates={estimates}
            setEstimates={setEstimates}
            purchaseOrders={purchaseOrders}
            setPurchaseOrders={setPurchaseOrders}
            onAddTransaction={onAddTransaction}
          />
        </div>
      ) : (
        <>
          {/* Title */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Wrench className="w-5 h-5 animate-spin-slow" />
            </span>
            <h2 className="text-xl font-bold text-slate-800">
              Módulo de Actividades e Ingeniería (Raez)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Raez Ingeniería S.A.S. | Registro de órdenes de servicio, programación de ingenieros de obra, inventario de herramientas de taller y maquinaria industrial CNC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreatingSO(!isCreatingSO)}
            className="flex items-center gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" /> Registrar Orden de Servicio
          </button>
          <button
            onClick={() => setIsCreatingAsset(!isCreatingAsset)}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg transition-all"
          >
            <Settings className="w-4 h-4" /> Capitalizar Maquinaria
          </button>
        </div>
      </div>

      {/* Grid: Service Orders and Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Service Orders Section (2 Cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" /> Seguimiento y Control de Actividades Técnicas
            </h3>
            <span className="text-xs font-bold text-slate-400">Total: {raezOrders.length} órdenes</span>
          </div>

          {/* Form Service Order */}
          {isCreatingSO && (
            <form onSubmit={handleCreateSO} className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex flex-col gap-3 animate-fadeIn">
              <h4 className="text-xs font-bold text-amber-900 uppercase">Emitir Orden de Servicio Técnico</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">CLIENTE</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Cementos Argos S.A."
                    value={soCustomer}
                    onChange={(e) => setSoCustomer(e.target.value)}
                    className="p-1.5 text-xs border rounded bg-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">INGENIERO/TÉCNICO ASIGNADO</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Ing. Rafael y Técnico Luis"
                    value={soAssigned}
                    onChange={(e) => setSoAssigned(e.target.value)}
                    className="p-1.5 text-xs border rounded bg-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">VALOR PROPUESTO AL CLIENTE (COP)</label>
                  <input 
                    type="number" 
                    placeholder="Ej: 3500000"
                    value={soPrice}
                    onChange={(e) => setSoPrice(e.target.value)}
                    className="p-1.5 text-xs border rounded bg-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">COSTO ESTIMADO INSUMOS/MANO OBRA (COP)</label>
                  <input 
                    type="number" 
                    placeholder="Ej: 450000"
                    value={soCost}
                    onChange={(e) => setSoCost(e.target.value)}
                    className="p-1.5 text-xs border rounded bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">PRIORIDAD</label>
                  <select 
                    value={soPriority}
                    onChange={(e) => setSoPriority(e.target.value as any)}
                    className="p-1.5 text-xs border rounded bg-white text-slate-700"
                  >
                    <option value="BAJA">Baja</option>
                    <option value="MEDIA">Media</option>
                    <option value="ALTA">Alta (Urgencia de planta)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500">FECHA DE PROGRAMACIÓN</label>
                  <input 
                    type="date" 
                    value={soDate}
                    onChange={(e) => setSoDate(e.target.value)}
                    className="p-1.5 text-xs border rounded bg-white text-slate-700"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500">DESCRIPCIÓN DE LA TAREA O DIAGNÓSTICO</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Revisión por vibración inusual y lubricación de poleas en mezcladora"
                    value={soDesc}
                    onChange={(e) => setSoDesc(e.target.value)}
                    className="p-1.5 text-xs border rounded bg-white"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setIsCreatingSO(false)} className="px-3 py-1 text-xs border bg-white rounded">Cancelar</button>
                <button type="submit" className="px-3 py-1 text-xs bg-amber-500 text-white font-bold rounded">Programar Servicio</button>
              </div>
            </form>
          )}

          {/* Service Orders Timeline List */}
          <div className="flex flex-col gap-3">
            {raezOrders.map(so => (
              <div key={so.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-slate-500">{so.id}</span>
                      <h4 className="font-bold text-slate-800 text-sm">{so.customer}</h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{so.description}</p>
                  </div>
                  
                  {/* Status Badge */}
                  <div>
                    {so.status === "COMPLETADO" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">COMPLETADO</span>
                    ) : so.status === "EN_PROCESO" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 animate-pulse">EN OBRA / PROCESO</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">PROGRAMADO</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] pt-2 border-t text-slate-500">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Técnico: <strong className="text-slate-700">{so.assignedTo}</strong></span>
                  </div>
                  <div>
                    <span>Fecha: <strong className="text-slate-700">{so.scheduledDate}</strong></span>
                  </div>
                  <div>
                    <span>Presupuesto: <strong className="text-indigo-600">{formatCOP(so.price)}</strong></span>
                  </div>
                  <div>
                    <span>Prioridad: 
                      <strong className={`ml-1 ${so.priority === 'ALTA' ? 'text-red-600 font-extrabold' : 'text-slate-600'}`}>
                        {so.priority}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Status Transitions */}
                {so.status !== "COMPLETADO" && (
                  <div className="flex justify-end gap-1.5 pt-1">
                    {so.status === "PROGRAMADO" && (
                      <button
                        onClick={() => handleUpdateSoStatus(so.id, "EN_PROCESO")}
                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600"
                      >
                        <Play className="w-3 h-3" /> Iniciar Trabajos
                      </button>
                    )}
                    {so.status === "EN_PROCESO" && (
                      <button
                        onClick={() => handleUpdateSoStatus(so.id, "COMPLETADO")}
                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                        title="Finaliza orden de servicio: genera asiento contable de ingreso 413005"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Finalizar y Facturar
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Assets & Workshop Tools Section (1 Col) */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" /> Patrimonio Técnico y Herramientas
            </h3>
            <span className="text-xs font-bold text-slate-400">Activos: {raezAssets.length}</span>
          </div>

          {/* Form Create Asset */}
          {isCreatingAsset && (
            <form onSubmit={handleCreateAsset} className="p-3 bg-slate-50 border rounded-xl flex flex-col gap-2 animate-fadeIn">
              <h4 className="text-[10px] font-bold text-slate-600 uppercase border-b pb-1">Capitalizar Maquinaria de Taller</h4>
              
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400">CÓDIGO ÚNICO</label>
                <input 
                  type="text" 
                  placeholder="Ej: RZ-FRES-02"
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  className="p-1 text-xs border rounded bg-white uppercase"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400">DESCRIPCIÓN DE MAQUINARIA</label>
                <input 
                  type="text" 
                  placeholder="Ej: Fresadora Universal de torreta"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="p-1 text-xs border rounded bg-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400">VALOR DE ADQUISICIÓN (COP)</label>
                <input 
                  type="number" 
                  value={assetCost}
                  onChange={(e) => setAssetCost(e.target.value)}
                  className="p-1 text-xs border rounded bg-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-1.5 mt-1">
                <button type="button" onClick={() => setIsCreatingAsset(false)} className="px-2 py-0.5 text-[10px] border bg-white rounded">Cancelar</button>
                <button type="submit" className="px-2 py-0.5 text-[10px] bg-slate-800 text-white font-bold rounded">Capitalizar</button>
              </div>
            </form>
          )}

          {/* Asset List */}
          <div className="flex flex-col gap-2.5">
            {raezAssets.map(asset => (
              <div key={asset.id} className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center hover:bg-slate-50/50">
                <div>
                  <p className="font-mono font-bold text-[10px] text-slate-500 uppercase">{asset.code}</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{asset.name}</p>
                  <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                    <span>📍 {asset.location}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-700 font-mono">{formatCOP(asset.unitCost)}</span>
                  <p className="text-[9px] text-emerald-600 font-bold mt-1">Activo Fijo</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-100 flex items-start gap-2 text-[10px] text-amber-800 leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>Integración Contable Raez:</strong> Al dar de alta maquinaria pesada, el sistema genera automáticamente un débito en la cuenta del PUC <strong>152405 (Activo - Herramientas y Maquinaria)</strong> contra un crédito en bancos. Las finalizaciones de Órdenes de Servicio registran de forma automática ingresos reales en la <strong>413005</strong>.
            </p>
          </div>
        </div>
      </div>
    </>
    )}
  </div>
  );
}
