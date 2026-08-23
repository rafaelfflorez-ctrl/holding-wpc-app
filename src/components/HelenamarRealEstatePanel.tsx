import React, { useState } from "react";
import { Property, InventoryItem, Estimate, PurchaseOrder } from "../types";
import { apiFetch } from "../lib/api";
import { 
  Building2, 
  Plus, 
  MapPin, 
  Home, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  Bed, 
  DollarSign, 
  Settings,
  ShoppingBag,
  Wrench,
  Flame,
  Droplet,
  Lightbulb,
  Paintbrush,
  Hammer,
  Upload,
  FileText,
  Check,
  Clipboard
} from "lucide-react";
import CommercialProcurementHub from "./CommercialProcurementHub";

interface HelenamarRealEstatePanelProps {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  onAddTransaction: (tx: any) => void;
  estimates: Estimate[];
  setEstimates: React.Dispatch<React.SetStateAction<Estimate[]>>;
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
}

export default function HelenamarRealEstatePanel({
  properties,
  setProperties,
  inventory,
  setInventory,
  onAddTransaction,
  estimates,
  setEstimates,
  purchaseOrders,
  setPurchaseOrders
}: HelenamarRealEstatePanelProps) {
  const [activeInternalTab, setActiveInternalTab] = useState<"PROPIEDADES" | "MANTENIMIENTO" | "COMMERCIAL">("PROPIEDADES");
  const [isCreatingProperty, setIsCreatingProperty] = useState(false);
  const [isAddingCleaning, setIsAddingCleaning] = useState(false);
  const [expandedMaintPropMap, setExpandedMaintPropMap] = useState<Record<string, boolean>>({});

  // New Property state
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propValuation, setPropValuation] = useState("");
  const [propStatus, setPropStatus] = useState<"DISPONIBLE" | "ALQUILADO_CORTO" | "ALQUILADO_LARGO" | "MANTENIMIENTO">("DISPONIBLE");

  // New Cleaning/Maintenance entry state
  const [targetPropId, setTargetPropId] = useState("");
  const [cleanResponsible, setCleanResponsible] = useState("Sra. Mercedes Soler");
  const [cleanCost, setCleanCost] = useState("");
  const [cleanNotes, setCleanNotes] = useState("");

  // Helenamar Maintenance module state
  const [isAddingNovelty, setIsAddingNovelty] = useState(false);
  const [targetPropIdForMaint, setTargetPropIdForMaint] = useState("");
  const [maintDescription, setMaintDescription] = useState("");
  const [maintType, setMaintType] = useState("Aire Acondicionado");
  const [uploadingJobId, setUploadingJobId] = useState<string | null>(null);
  const [analyzingJobId, setAnalyzingJobId] = useState<string | null>(null);
  const [extractedMaintData, setExtractedMaintData] = useState<{ cost: number; responsible: string; description: string } | null>(null);

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleAddMaintNovelty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPropIdForMaint || !maintDescription) return;

    const newMaintJob = {
      id: `JOB-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      description: `[Novedad: ${maintType}] - ${maintDescription}`,
      cost: 0,
      responsible: "Por asignar",
      type: maintType,
      status: "PENDIENTE" as any,
      attachedQuoteName: ""
    };

    setProperties(prev => prev.map(p => {
      if (p.id !== targetPropIdForMaint) return p;
      return {
        ...p,
        maintenanceStatus: "MANTENIMIENTO_PENDIENTE" as const,
        maintenanceHistory: [newMaintJob, ...(p.maintenanceHistory || [])]
      };
    }));

    setMaintDescription("");
    setTargetPropIdForMaint("");
    setIsAddingNovelty(false);
    alert(`✓ Novedad de '${maintType}' registrada como PENDIENTE para la propiedad.`);
  };

  const handleUploadMaintQuote = async (jobId: string, file: File) => {
    setAnalyzingJobId(jobId);
    setExtractedMaintData(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(",")[1];
        const response = await apiFetch("/api/analyze-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileData: base64Data,
            companyId: "HELENAMAR",
            userInstruction: `Cotización de mantenimiento y reparación para propiedad de Helenamar (${file.name})`
          })
        });
        const data = await response.json();

        if (data.success && data.estimate && !data.isDemo) {
          const cost = data.estimate.total || 450000;
          const responsible = data.estimate.customer || "Especialista HVAC / Plomería / Acabados";
          const desc = data.estimate.items?.[0]?.description || `Materiales y mano de obra para ${file.name}`;
          setExtractedMaintData({ cost, responsible, description: desc });
        } else {
          // Sin API de Gemini: no se fabrican costos aleatorios ni proveedores inventados.
          setExtractedMaintData(null);
          alert(
            data.isDemo
              ? "⚠️ MODO DEMO: la API de Gemini no está configurada. No se puede estimar la cotización de mantenimiento con datos reales."
              : "No se pudo analizar la cotización de mantenimiento. Verifique la conexión y vuelva a intentarlo."
          );
        }
      } catch (err) {
        console.error(err);
        setExtractedMaintData(null);
        alert("No se pudo analizar la cotización de mantenimiento. Verifique la conexión y vuelva a intentarlo.");
      } finally {
        setAnalyzingJobId(null);
        setUploadingJobId(jobId);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleApproveMaintQuote = (propertyId: string, jobId: string) => {
    if (!extractedMaintData) return;

    setProperties(prev => prev.map(p => {
      if (p.id !== propertyId) return p;

      const updatedHistory = p.maintenanceHistory.map(job => {
        if (job.id !== jobId) return job;
        return {
          ...job,
          cost: extractedMaintData.cost,
          responsible: extractedMaintData.responsible,
          status: "COMPLETADO" as any,
          attachedQuoteName: "Cotizacion_Mantenimiento_Aprobada.pdf"
        };
      });

      return {
        ...p,
        maintenanceStatus: "EXCELENTE" as const,
        maintenanceHistory: updatedHistory
      };
    }));

    onAddTransaction({
      type: "GASTO",
      amount: extractedMaintData.cost,
      customerSupplier: extractedMaintData.responsible,
      description: `Gasto de reparación por novedad aprobada: ${extractedMaintData.description}`,
      category: "Mantenimiento Propiedades",
      status: "CONTABILIZADO",
      account: "512010 - Gastos de Mantenimiento y Aseo Inmuebles",
      companyId: "HELENAMAR"
    });

    setUploadingJobId(null);
    setExtractedMaintData(null);
    alert(`✓ Cotización aprobada por ${formatCOP(extractedMaintData.cost)}. Gasto imputado en el PUC en la cuenta 512010.`);
  };

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propName || !propAddress || !propValuation) return;

    const val = parseFloat(propValuation);

    const newProperty: Property = {
      id: `PROP-${Date.now()}`,
      name: propName,
      address: propAddress,
      value: val,
      occupancyStatus: propStatus,
      lastCleaningDate: new Date().toISOString().split("T")[0],
      maintenanceStatus: "EXCELENTE",
      cleaningHistory: [],
      maintenanceHistory: []
    };

    setProperties(prev => [...prev, newProperty]);

    // CAPITALIZE PROPERTY: Add property as inventory/asset entry under Helenamar Inmobiliaria
    const newInventoryItem: InventoryItem = {
      id: `INV-HMR-${Date.now()}`,
      code: `HM-PROP-${Date.now().toString().slice(-3)}`,
      name: propName,
      productLine: "Patrimonio Inmueble",
      quantity: 1,
      unit: "Propiedad",
      unitCost: val,
      unitPrice: val,
      status: "SUFICIENTE",
      location: propAddress,
      companyId: "HELENAMAR",
      lastUpdated: new Date().toISOString()
    };

    setInventory(prev => [...prev, newInventoryItem]);

    // Financial side effect: Book a capital investment debit in 151605 (Edificaciones e Inmuebles)
    onAddTransaction({
      type: "COMPRA",
      amount: val,
      customerSupplier: "Inversiones Holding Matriz",
      description: `Capitalización de patrimonio inmobiliario de Helenamar: ${newProperty.name}`,
      category: "Adquisición Inmuebles (Activo)",
      status: "CONTABILIZADO",
      account: "151605 - Edificaciones e Inmuebles - Helenamar Inmobiliaria",
      companyId: "HELENAMAR"
    });

    // Reset Form
    setPropName("");
    setPropAddress("");
    setPropValuation("");
    setPropStatus("DISPONIBLE");
    setIsCreatingProperty(false);
    alert(`✓ Propiedad creada, integrada con el balance patrimonial (cuenta 151605) y agregada a Helenamar.`);
  };

  const handleUpdateOccupancy = (id: string, newStatus: "DISPONIBLE" | "ALQUILADO_CORTO" | "ALQUILADO_LARGO" | "MANTENIMIENTO", tenantName = "", income = 0) => {
    setProperties(prev => prev.map(p => {
      if (p.id !== id) return p;

      const updated: Property = {
        ...p,
        occupancyStatus: newStatus,
        tenantName: tenantName || undefined,
        rentIncomeAmount: income || undefined
      };

      // FINANCIAL INTEGRATION: If changing to rented (short/long), immediately book a VENTA revenue entry in Helenamar account 415005!
      if ((newStatus === "ALQUILADO_CORTO" || newStatus === "ALQUILADO_LARGO") && income > 0) {
        onAddTransaction({
          type: "VENTA",
          amount: income,
          customerSupplier: tenantName || "Huésped / Arrendatario",
          description: `Ingreso por alquiler de propiedad: ${p.name} (${newStatus.replace("ALQUILADO_", "Alquiler ")})`,
          category: "Ingresos Arrendamientos Inmobiliaria",
          status: "CONTABILIZADO",
          account: "415005 - Ingresos Arrendamientos Helenamar",
          companyId: "HELENAMAR"
        });
      }

      return updated;
    }));

    alert(`✓ Estado de ocupación actualizado. Asiento de rentas registrado en la base financiera.`);
  };

  const handleAddCleaningLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPropId || !cleanCost) return;

    const costValue = parseFloat(cleanCost);

    setProperties(prev => prev.map(p => {
      if (p.id !== targetPropId) return p;

      return {
        ...p,
        lastCleaningDate: new Date().toISOString().split("T")[0],
        maintenanceStatus: "EXCELENTE" as const,
        cleaningHistory: [
          {
            date: new Date().toISOString().split("T")[0],
            responsible: cleanResponsible,
            cost: costValue,
            notes: cleanNotes
          },
          ...p.cleaningHistory
        ]
      };
    }));

    // FINANCIAL INTEGRATION: Book a GASTO (debit 512010) in Helenamar ledger
    const propNameSelected = properties.find(p => p.id === targetPropId)?.name || "Inmueble";
    onAddTransaction({
      type: "GASTO",
      amount: costValue,
      customerSupplier: cleanResponsible,
      description: `Pago servicio de aseo y mantenimiento preventivo para propiedad Helenamar: ${propNameSelected}`,
      category: "Mantenimiento Propiedades",
      status: "CONTABILIZADO",
      account: "512010 - Gastos de Mantenimiento y Aseo Inmuebles",
      companyId: "HELENAMAR"
    });

    setCleanCost("");
    setCleanNotes("");
    setIsAddingCleaning(false);
    alert(`✓ Servicio de limpieza registrado y contabilizado en el PUC.`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col gap-6" id="helenamar-realestate-container">
      {/* Sub-tabs switch */}
      <div className="flex border-b border-slate-100 pb-2">
        <button
          onClick={() => setActiveInternalTab("PROPIEDADES")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeInternalTab === "PROPIEDADES"
              ? "border-emerald-600 text-emerald-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Home className="w-4 h-4" /> Propiedades y Turismo
        </button>
        <button
          onClick={() => setActiveInternalTab("MANTENIMIENTO")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeInternalTab === "MANTENIMIENTO"
              ? "border-emerald-600 text-emerald-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Wrench className="w-4 h-4" /> Control de Mantenimiento e Incidencias
        </button>
        <button
          onClick={() => setActiveInternalTab("COMMERCIAL")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeInternalTab === "COMMERCIAL"
              ? "border-emerald-600 text-emerald-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Cotizaciones y Compras Helenamar (IA)
        </button>
      </div>

      {activeInternalTab === "COMMERCIAL" ? (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <CommercialProcurementHub
            companyId="HELENAMAR"
            companyName="Helenamar Turismo e Inmobiliaria"
            estimates={estimates}
            setEstimates={setEstimates}
            purchaseOrders={purchaseOrders}
            setPurchaseOrders={setPurchaseOrders}
            onAddTransaction={onAddTransaction}
          />
        </div>
      ) : activeInternalTab === "MANTENIMIENTO" ? (
        <div className="flex flex-col gap-6 animate-fadeIn">
          {/* Maintenance Module Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Wrench className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-bold text-slate-800">
                  Módulo de Mantenimiento de Inmuebles
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Reporte de novedades operativas (AC, plomería, pintura, gas, electricidad) de Helenamar. Sube cotizaciones de reparación, analízalas con IA y apruébalas para contabilidad automática.
              </p>
            </div>

            <button
              onClick={() => setIsAddingNovelty(!isAddingNovelty)}
              className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg transition-all"
            >
              <Plus className="w-4 h-4" /> Reportar Novedad
            </button>
          </div>

          {/* Form Create Novelty */}
          {isAddingNovelty && (
            <form onSubmit={handleAddMaintNovelty} className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 animate-fadeIn">
              <h4 className="col-span-1 md:col-span-3 text-xs font-bold text-emerald-950 uppercase border-b pb-1">Reportar Nueva Incidencia en Inmueble</h4>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">SELECCIONAR PROPIEDAD</label>
                <select 
                  value={targetPropIdForMaint}
                  onChange={(e) => setTargetPropIdForMaint(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">TIPO DE SERVICIO</label>
                <select 
                  value={maintType}
                  onChange={(e) => setMaintType(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                >
                  <option value="Aire Acondicionado">Aire Acondicionado</option>
                  <option value="Plomería">Plomería</option>
                  <option value="Electricidad">Electricidad</option>
                  <option value="Gas">Gas</option>
                  <option value="Pintura">Pintura</option>
                  <option value="General">Mantenimiento General</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">DESCRIPCIÓN DE LA NOVEDAD</label>
                <input 
                  type="text" 
                  placeholder="Ej: El motor del compresor del AC suena fuerte y no enfría"
                  value={maintDescription}
                  onChange={(e) => setMaintDescription(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white"
                  required
                />
              </div>

              <div className="col-span-1 md:col-span-3 flex justify-end gap-2 mt-1">
                <button type="button" onClick={() => setIsAddingNovelty(false)} className="px-3 py-1 text-xs border bg-white rounded">Cancelar</button>
                <button type="submit" className="px-3 py-1 text-xs bg-emerald-600 text-white font-bold rounded">Guardar Novedad</button>
              </div>
            </form>
          )}

          {/* Consolidated Novelty/Maint Jobs list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.flatMap(p => (p.maintenanceHistory || []).map(mh => ({ ...mh, propertyId: p.id, propertyName: p.name }))).length === 0 ? (
              <div className="col-span-1 md:col-span-2 text-center p-8 border border-dashed rounded-2xl text-slate-400">
                <Clipboard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold">No hay novedades registradas en las propiedades</p>
                <p className="text-[10px] text-slate-400 mt-1">Haga clic en "+ Reportar Novedad" para añadir un evento de plomería, pintura, AC, etc.</p>
              </div>
            ) : (
              properties.flatMap(p => (p.maintenanceHistory || []).map(mh => ({ ...mh, propertyId: p.id, propertyName: p.name }))).map((job) => {
                const getMaintIcon = (type = "") => {
                  const t = type.toLowerCase();
                  if (t.includes("aire") || t.includes("ac")) return <Wrench className="w-4 h-4 text-sky-500" />;
                  if (t.includes("plom")) return <Droplet className="w-4 h-4 text-blue-500" />;
                  if (t.includes("electr")) return <Lightbulb className="w-4 h-4 text-yellow-500" />;
                  if (t.includes("gas")) return <Flame className="w-4 h-4 text-orange-500" />;
                  if (t.includes("pint")) return <Paintbrush className="w-4 h-4 text-purple-500" />;
                  return <Hammer className="w-4 h-4 text-slate-500" />;
                };

                return (
                  <div key={job.id || `${job.date}-${job.description}`} className="p-5 rounded-2xl border bg-slate-50/50 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        {getMaintIcon(job.type)}
                        <span className="font-extrabold text-xs text-slate-800">{job.propertyName}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${job.status === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'}`}>
                        {job.status || "COMPLETADO"}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-slate-700 leading-normal font-semibold">
                        {job.description}
                      </p>
                      <span className="text-[9px] text-slate-400 font-mono block mt-2">Reportado: {job.date}</span>
                    </div>

                    <div className="border-t pt-3 flex flex-col gap-2">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Técnico Responsable:</span>
                        <strong className="text-slate-800">{job.responsible}</strong>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Costo de Reparación:</span>
                        <strong className="text-slate-800 font-mono">{job.cost > 0 ? formatCOP(job.cost) : "Cotización Pendiente"}</strong>
                      </div>
                    </div>

                    {/* Interaction - File uploading and Quote Analysis */}
                    {job.status !== "COMPLETADO" && (
                      <div className="mt-2 flex flex-col gap-3">
                        {analyzingJobId === job.id ? (
                          <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 flex items-center justify-center gap-2 text-xs text-sky-700 font-bold">
                            <Sparkles className="w-4 h-4 text-sky-500 animate-spin" /> Analizando cotización técnica con IA...
                          </div>
                        ) : uploadingJobId === job.id && extractedMaintData ? (
                          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col gap-2.5 animate-fadeIn">
                            <h5 className="text-[10px] font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" /> Cotización Analizada por Gemini
                            </h5>
                            <div className="text-xs text-slate-700 flex flex-col gap-1">
                              <p>🏷️ <strong>Proveedor:</strong> {extractedMaintData.responsible}</p>
                              <p>💰 <strong>Valor Cotizado:</strong> <span className="font-mono font-bold text-emerald-700">{formatCOP(extractedMaintData.cost)}</span></p>
                              <p>📝 <strong>Concepto:</strong> {extractedMaintData.description}</p>
                            </div>
                            <div className="flex gap-2 justify-end mt-1">
                              <button
                                type="button"
                                onClick={() => { setUploadingJobId(null); setExtractedMaintData(null); }}
                                className="px-2.5 py-1 text-[10px] border bg-white text-slate-600 rounded"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveMaintQuote(job.propertyId, job.id)}
                                className="px-3 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" /> Aprobar y Contabilizar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-dashed border-slate-200 rounded-xl p-3 text-center bg-white hover:bg-slate-50 transition-all">
                            <input 
                              type="file" 
                              id={`upload-quote-${job.id}`} 
                              className="hidden" 
                              accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.xlsx,.xls,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadMaintQuote(job.id, file);
                              }}
                            />
                            <label htmlFor={`upload-quote-${job.id}`} className="cursor-pointer flex flex-col items-center gap-1">
                              <Upload className="w-4 h-4 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-600">Adjuntar Foto / Cotización de Reparación</span>
                              <span className="text-[8px] text-slate-400">Fotografía de celular, imagen, PDF o Excel analizado inmediatamente</span>
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-800">
              Módulo de Propiedades y Turismo (Helenamar)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Helenamar Turismo e Inmobiliaria | Control de ocupación y tarifas de propiedades turísticas, bitácoras de aseo/limpieza profunda y patrimonio inmueble.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreatingProperty(!isCreatingProperty)}
            className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" /> Registrar Nueva Propiedad
          </button>
          <button
            onClick={() => setIsAddingCleaning(!isAddingCleaning)}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border px-3 py-2 rounded-lg transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" /> Registrar Aseo / Limpieza
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Properties list (2 Cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-emerald-500" /> Control de Ocupación e Inmuebles del Holding
            </h3>
            {/* Global Maintenance Costs Card */}
            <div className="bg-emerald-50/70 border border-emerald-100 px-3 py-1 rounded-lg flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
              <div className="text-[10px] text-emerald-950 font-bold">
                Costos Globales Mantenimiento: <span className="font-mono text-emerald-700">{formatCOP(
                  properties.reduce((sum, p) => {
                    const maintSum = (p.maintenanceHistory || []).reduce((s, j) => s + (j.cost || 0), 0);
                    const cleanSum = (p.cleaningHistory || []).reduce((s, c) => s + (c.cost || 0), 0);
                    return sum + maintSum + cleanSum;
                  }, 0)
                )}</span>
              </div>
            </div>
          </div>

          {/* Form Property */}
          {isCreatingProperty && (
            <form onSubmit={handleCreateProperty} className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
              <h4 className="col-span-1 md:col-span-2 text-xs font-bold text-emerald-900 uppercase">Añadir Propiedad Inmobiliaria al Patrimonio</h4>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">NOMBRE DE LA PROPIEDAD</label>
                <input 
                  type="text" 
                  placeholder="Ej: Penthouse 1202 - Santa Marta Rodadero"
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">DIRECCIÓN Y CIUDAD</label>
                <input 
                  type="text" 
                  placeholder="Ej: Calle 8 # 3-21, Santa Marta"
                  value={propAddress}
                  onChange={(e) => setPropAddress(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">VALUACIÓN COMERCIAL PATRIMONIAL (COP)</label>
                <input 
                  type="number" 
                  placeholder="Ej: 420000000"
                  value={propValuation}
                  onChange={(e) => setPropValuation(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">ESTADO INICIAL</label>
                <select 
                  value={propStatus}
                  onChange={(e) => setPropStatus(e.target.value as any)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-700"
                >
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="ALQUILADO_CORTO">Alquiler Corto (Turismo)</option>
                  <option value="ALQUILADO_LARGO">Alquiler Largo (Contrato)</option>
                  <option value="MANTENIMIENTO">En Mantenimiento</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setIsCreatingProperty(false)} className="px-3 py-1 text-xs border bg-white rounded text-slate-600">Cancelar</button>
                <button type="submit" className="px-3 py-1 text-xs bg-emerald-600 text-white font-bold rounded">Capitalizar e Ingresar</button>
              </div>
            </form>
          )}

          {/* Properties cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.map(prop => {
              const localMaintTotal = (prop.maintenanceHistory || []).reduce((s, j) => s + (j.cost || 0), 0);
              const localCleanTotal = (prop.cleaningHistory || []).reduce((s, c) => s + (c.cost || 0), 0);
              const localAccumulatedCost = localMaintTotal + localCleanTotal;
              const isExpanded = !!expandedMaintPropMap[prop.id];

              return (
                <div key={prop.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-xs transition-shadow">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-emerald-600" /> {prop.name}
                      </h4>
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                        {formatCOP(prop.value)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {prop.address}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500">
                      <span className="px-2 py-0.5 rounded-full border bg-white font-medium">
                        Aseo: {prop.lastCleaningDate || "Sin registro"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border bg-white font-semibold ${
                        prop.maintenanceStatus === "EXCELENTE" ? "text-emerald-700" : "text-amber-700"
                      }`}>
                        Mantenimiento: {prop.maintenanceStatus}
                      </span>
                    </div>

                    {/* Property Accumulated Cost Display */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/40 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 font-medium">Gasto Mantenimiento Inmueble:</span>
                      <span className="font-mono font-bold text-slate-700">{formatCOP(localAccumulatedCost)}</span>
                    </div>

                    {/* Collapsible Dropdown for Maintenance History */}
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedMaintPropMap(prev => ({
                            ...prev,
                            [prop.id]: !prev[prop.id]
                          }));
                        }}
                        className="w-full flex items-center justify-between px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200/60 rounded text-[10px] text-slate-600 font-extrabold cursor-pointer transition-all"
                      >
                        <span>📋 Histórico Mantenimiento ({prop.maintenanceHistory?.length || 0})</span>
                        <span className="text-[9px] text-slate-400">{isExpanded ? "â–² Ocultar" : "â–¼ Ver Detalle"}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-1.5 p-2 bg-white border border-slate-100 rounded-lg max-h-40 overflow-y-auto flex flex-col gap-1.5 animate-fadeIn shadow-inner">
                          {(!prop.maintenanceHistory || prop.maintenanceHistory.length === 0) ? (
                            <span className="text-[9px] text-slate-400 italic block text-center py-1">No hay incidencias reportadas.</span>
                          ) : (
                            prop.maintenanceHistory.map((job) => (
                              <div key={job.id} className="p-1.5 border-b border-slate-100 last:border-0 text-[10px] text-slate-600 flex flex-col gap-0.5">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-slate-800">{job.type || "General"}</span>
                                  <span className={`px-1 rounded text-[8px] font-bold ${
                                    job.status === "COMPLETADO" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                  }`}>
                                    {job.status}
                                  </span>
                                </div>
                                <p className="text-slate-500 leading-snug">{job.description}</p>
                                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                                  <span>{job.date} | Responsable: {job.responsible}</span>
                                  <span className="font-mono font-bold text-emerald-600">{job.cost > 0 ? formatCOP(job.cost) : "Pendiente"}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tenant / Rent Details */}
                  {prop.tenantName && (
                    <div className="bg-white p-2 rounded-lg border border-emerald-100 text-[11px]">
                      <p className="text-slate-400">Arrendatario: <strong className="text-slate-700">{prop.tenantName}</strong></p>
                      <p className="text-slate-400 mt-0.5">Renta Percibida: <strong className="text-emerald-600 font-mono font-bold">{formatCOP(prop.rentIncomeAmount || 0)}</strong></p>
                    </div>
                  )}

                  {/* Operations */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/60">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Cambiar Estado de Alquiler / Contrato</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleUpdateOccupancy(prop.id, "DISPONIBLE")}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${prop.occupancyStatus === 'DISPONIBLE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                      >
                        Disponible
                      </button>
                      <button
                        onClick={() => {
                          const guest = prompt("Ingrese nombre del huésped de turismo:");
                          const fee = parseFloat(prompt("Ingrese valor total de la reserva (COP):") || "0");
                          if (guest && fee > 0) {
                            handleUpdateOccupancy(prop.id, "ALQUILADO_CORTO", guest, fee);
                          }
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${prop.occupancyStatus === 'ALQUILADO_CORTO' ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                      >
                        + Alquiler Vacacional
                      </button>
                      <button
                        onClick={() => {
                          const tenant = prompt("Ingrese nombre del arrendatario:");
                          const rent = parseFloat(prompt("Ingrese canon mensual de arrendamiento (COP):") || "0");
                          if (tenant && rent > 0) {
                            handleUpdateOccupancy(prop.id, "ALQUILADO_LARGO", tenant, rent);
                          }
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${prop.occupancyStatus === 'ALQUILADO_LARGO' ? 'bg-teal-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                      >
                        + Contrato Anual
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cleaning Logs (1 Col) */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b pb-2">
            <Sparkles className="w-4 h-4 text-emerald-500" /> Historial de Limpiezas y Servicios
          </h3>

          {/* Form Add Cleaning Log */}
          {isAddingCleaning && (
            <form onSubmit={handleAddCleaningLog} className="p-3 bg-slate-50 border rounded-xl flex flex-col gap-2 animate-fadeIn">
              <h4 className="text-[10px] font-bold text-slate-600 uppercase border-b pb-1">Reportar Limpieza Realizada</h4>
              
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400">PROPIEDAD</label>
                <select 
                  value={targetPropId}
                  onChange={(e) => setTargetPropId(e.target.value)}
                  className="p-1 text-xs border rounded bg-white text-slate-800"
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400">RESPONSABLE / OPERARIO</label>
                <input 
                  type="text" 
                  value={cleanResponsible}
                  onChange={(e) => setCleanResponsible(e.target.value)}
                  className="p-1 text-xs border rounded bg-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400">COSTO DEL SERVICIO (COP)</label>
                <input 
                  type="number" 
                  value={cleanCost}
                  onChange={(e) => setCleanCost(e.target.value)}
                  className="p-1 text-xs border rounded bg-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400">NOTAS</label>
                <input 
                  type="text" 
                  placeholder="Ej: Cambio de sábanas completo, lavado de vidrios."
                  value={cleanNotes}
                  onChange={(e) => setCleanNotes(e.target.value)}
                  className="p-1 text-xs border rounded bg-white"
                />
              </div>

              <div className="flex justify-end gap-1.5 mt-1">
                <button type="button" onClick={() => setIsAddingCleaning(false)} className="px-2 py-0.5 text-[10px] border bg-white rounded">Cancelar</button>
                <button type="submit" className="px-2 py-0.5 text-[10px] bg-emerald-600 text-white font-bold rounded">Registrar</button>
              </div>
            </form>
          )}

          {/* Rendering historic cleanings */}
          <div className="flex flex-col gap-3">
            {properties.flatMap(p => p.cleaningHistory.map(ch => ({ ...ch, propertyName: p.name }))).map((ch, index) => (
              <div key={index} className="p-3 bg-white border rounded-xl shadow-2xs hover:bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">{ch.propertyName}</span>
                  <span className="text-xs font-mono font-bold text-rose-600">{formatCOP(ch.cost)}</span>
                </div>
                <p className="text-xs text-slate-700 font-bold mt-1.5">Aseo por: {ch.responsible}</p>
                <p className="text-[11px] text-slate-400 italic mt-1">"{ch.notes}"</p>
                <span className="text-[9px] text-slate-400 block mt-1.5">Fecha: {ch.date}</span>
              </div>
            ))}
          </div>

          <div className="bg-amber-50/70 p-3 border border-amber-100 rounded-xl flex items-start gap-2 text-[10px] text-amber-800 leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>Rentabilidad de Helenamar:</strong> Cada limpieza registrada reporta contablemente un gasto debitado en la cuenta <strong>512010 (Mantenimiento y Aseo)</strong>. Del mismo modo, registrar alquileres turísticos alimenta en tiempo real la facturación neta de la cuenta <strong>415005 (Arrendamientos)</strong>.
            </p>
          </div>
        </div>
      </div>
    </>
    )}
  </div>
  );
}
