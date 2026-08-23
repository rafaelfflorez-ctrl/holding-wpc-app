import React, { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import { 
  Estimate, 
  PurchaseOrder, 
  InventoryItem 
} from "../types";
import { generateNextODCId, generateNextCOTId } from "../utils/sequenceCounters";
import { apiFetch } from "../lib/api";
import { 
  Plus, 
  Upload, 
  FileText, 
  Trash2, 
  Calendar, 
  ClipboardList, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  Brain, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  User, 
  Search, 
  Eye,
  FileCheck,
  X,
  Edit,
  Percent,
  Calculator,
  Sliders,
  Camera,
  Image as ImageIcon,
  Scan,
  Loader2,
  UploadCloud
} from "lucide-react";

interface CommercialProcurementHubProps {
  companyId: "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR";
  companyName: string;
  estimates: Estimate[];
  setEstimates: React.Dispatch<React.SetStateAction<Estimate[]>>;
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  onAddTransaction: (tx: any) => void;
}

interface QuoteLearningInsight {
  id: string;
  fileName: string;
  date: string;
  companyId: string;
  extractedTitle: string;
  customerName: string;
  valueQuoted: number;
  timeEstimated: string;
  profitabilityAnalysis: string;
  overcosts: string;
  imprevistos: string;
}

export default function CommercialProcurementHub({
  companyId,
  companyName,
  estimates,
  setEstimates,
  purchaseOrders,
  setPurchaseOrders,
  onAddTransaction
}: CommercialProcurementHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<"COTIZACIONES" | "COMPRAS" | "APRENDIZAJE">("COTIZACIONES");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Custom AI instruction context state
  const [userInstruction, setUserInstruction] = useState("");

  // Editing states for real-time adjustments
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);
  const [editingEstimateData, setEditingEstimateData] = useState<Estimate | null>(null);
  const [editingPoId, setEditingPoId] = useState<string | null>(null);
  const [editingPoData, setEditingPoData] = useState<PurchaseOrder | null>(null);

  // Manual Quote states
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [quoteCustomer, setQuoteCustomer] = useState("");
  const [quoteNit, setQuoteNit] = useState("");
  const [quotePhone, setQuotePhone] = useState("");
  const [quoteEmail, setQuoteEmail] = useState("");
  const [quoteAddress, setQuoteAddress] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [quoteReference, setQuoteReference] = useState("");
  const [quoteResponsible, setQuoteResponsible] = useState("");
  const [quoteItems, setQuoteItems] = useState<Array<{ code: string; desc: string; qty: number; cost: number; margin: number; price: number }>>([
    { code: "", desc: "", qty: 1, cost: 0, margin: 25, price: 0 }
  ]);

  // Manual PO states
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [poSupplier, setPoSupplier] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poCarrier, setPoCarrier] = useState("");
  const [poItems, setPoItems] = useState<Array<{ code: string; desc: string; qty: number; cost: number }>>([
    { code: "", desc: "", qty: 1, cost: 0 }
  ]);

  // Learning database state (stored in local memory per session)
  const [learningDb, setLearningDb] = useState<QuoteLearningInsight[]>([
    {
      id: "LRN-001",
      fileName: "Cotizacion_Metalica_Estructuras_2026.pdf",
      date: "2026-07-15",
      companyId: "RAEZ",
      extractedTitle: "Montaje de Viga H Soldada",
      customerName: "Aceros del Norte SAS",
      valueQuoted: 14500000,
      timeEstimated: "12 días hábiles",
      profitabilityAnalysis: "Margen operativo neto de 32% sobre costos directos de fundición y electrodos.",
      overcosts: "Sensible a fluctuación del precio de acero laminado (+12% proyectado para Q3).",
      imprevistos: "Reserva técnica recomendada del 8% por demoras logísticas en transporte pesado de grúa."
    },
    {
      id: "LRN-002",
      fileName: "Quote_Brembo_Carbon_Ceramic_WPC.xlsx",
      date: "2026-07-18",
      companyId: "WPC",
      extractedTitle: "Importación Brembo Carbon Ceramic",
      customerName: "Taller Automotriz Los Coches",
      valueQuoted: 42000000,
      timeEstimated: "25 días de tránsito aéreo",
      profitabilityAnalysis: "Utilidad alta de 48% debido a exclusividad de distribución directa Brembo.",
      overcosts: "Riesgo cambiario TRM alto. Incremento de aranceles de importación de la DIAN.",
      imprevistos: "Proveer contingencia del 10% por inspección física de aduanas en el Puerto de Cartagena."
    }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const poFileInputRef = useRef<HTMLInputElement>(null);
  const poImageInputRef = useRef<HTMLInputElement>(null);
  const poCameraInputRef = useRef<HTMLInputElement>(null);

  // Live analyzing preview state
  const [analyzingFilePreview, setAnalyzingFilePreview] = useState<{
    name: string;
    type: string;
    previewUrl?: string;
    isImage: boolean;
  } | null>(null);

  const getBrandDetails = () => {
    switch (companyId) {
      case "FUNDACION":
        return {
          color: [219, 39, 119], // Pink-600
          hex: "#DB2777",
          bgLight: "bg-pink-50 border-pink-100",
          text: "text-pink-700",
          button: "bg-pink-600 hover:bg-pink-700",
          badgeLetter: "F",
          nit: "901.837.241-9",
          address: "Calle 45 # 13-10, Bogotá D.C., Colombia",
          phone: "Tel: +57 (601) 321-7492",
          email: "contacto@shemaker.org",
          moto: "Empoderando mujeres mediante la tecnología, hardware y código"
        };
      case "RAEZ":
        return {
          color: [217, 119, 6], // Amber-600
          hex: "#D97706",
          bgLight: "bg-amber-50 border-amber-100",
          text: "text-amber-700",
          button: "bg-amber-600 hover:bg-amber-700",
          badgeLetter: "R",
          nit: "901.214.568-1",
          address: "Zona Industrial Puente Aranda, Bogotá D.C., Colombia",
          phone: "Tel: +57 (601) 752-1920",
          email: "proyectos@raez.co",
          moto: "Ingeniería de precisión, mecanizados de alta tolerancia y soldadura"
        };
      case "HELENAMAR":
        return {
          color: [5, 150, 105], // Emerald-600
          hex: "#059669",
          bgLight: "bg-emerald-50 border-emerald-100",
          text: "text-emerald-700",
          button: "bg-emerald-600 hover:bg-emerald-700",
          badgeLetter: "H",
          nit: "900.564.123-7",
          address: "Av. Rodadero, Edificio Alamar, Santa Marta, Colombia",
          phone: "Tel: +57 (605) 421-9876",
          email: "reservas@helenamar.com",
          moto: "Alquiler vacacional de lujo, corretaje inmobiliario y turismo en el Caribe"
        };
      default:
        return {
          color: [79, 70, 229], // Indigo-600
          hex: "#4F46E5",
          bgLight: "bg-indigo-50 border-indigo-100",
          text: "text-indigo-700",
          button: "bg-indigo-600 hover:bg-indigo-700",
          badgeLetter: "W",
          nit: "901.341.558-1",
          address: "Alto Bosque, Transversal 49 # 21B-55, Cartagena - Colombia",
          phone: "+57 3235294526",
          email: "logisticawpc@gmail.com",
          moto: "Suministros e importaciones de productos"
        };
    }
  };

  const brand = getBrandDetails();

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Filter local records
  const filteredEstimates = estimates.filter(e => e.companyId === companyId);
  const filteredPOs = purchaseOrders.filter(po => po.companyId === companyId);
  const filteredLearning = learningDb.filter(l => l.companyId === companyId);

  // Handlers for manual Quote Item row management
  const handleAddQuoteItemRow = () => {
    setQuoteItems([...quoteItems, { code: "", desc: "", qty: 1, cost: 0, margin: 25, price: 0 }]);
  };

  const handleRemoveQuoteItemRow = (index: number) => {
    if (quoteItems.length === 1) return;
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const handleQuoteItemChange = (index: number, field: string, val: any) => {
    setQuoteItems(quoteItems.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: val };
      if (field === "cost") {
        const cost = Math.max(0, parseFloat(val) || 0);
        updated.cost = cost;
        const margin = updated.margin !== undefined ? updated.margin : 25;
        updated.price = Math.round(cost * (1 + margin / 100));
      } else if (field === "margin") {
        const margin = parseFloat(val) || 0;
        updated.margin = margin;
        const cost = updated.cost || 0;
        updated.price = Math.round(cost * (1 + margin / 100));
      } else if (field === "price") {
        const price = Math.max(0, parseFloat(val) || 0);
        updated.price = price;
        const cost = updated.cost || 0;
        updated.margin = cost > 0 ? Number((((price - cost) / cost) * 100).toFixed(1)) : 0;
      }
      return updated;
    }));
  };

  const handleApplyManualQuoteGlobalMargin = (margin: number) => {
    setQuoteItems(quoteItems.map(item => {
      const cost = item.cost || item.price || 0;
      const price = Math.round(cost * (1 + margin / 100));
      return {
        ...item,
        cost,
        margin,
        price
      };
    }));
  };

  // Submit manual Quote
  const handleSaveManualQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteCustomer || quoteItems.some(item => !item.desc || item.price <= 0)) {
      alert("Por favor complete todos los datos de los ítems de la cotización");
      return;
    }

    const calculatedItems = quoteItems.map(it => {
      const cost = it.cost !== undefined ? it.cost : it.price;
      const margin = it.margin !== undefined ? it.margin : 0;
      const price = it.price || Math.round(cost * (1 + margin / 100));
      const qty = it.qty || 1;
      return {
        code: it.code || "SERV-GEN",
        description: it.desc,
        quantity: qty,
        unitCost: cost,
        profitMarginPercent: margin,
        profitAmount: price - cost,
        unitPrice: price,
        total: qty * price
      };
    });

    let totalCost = 0;
    let subtotal = 0;
    let totalProfit = 0;
    calculatedItems.forEach(it => {
      totalCost += (it.quantity * (it.unitCost || 0));
      subtotal += it.total;
      totalProfit += (it.quantity * (it.profitAmount || 0));
    });

    const taxAmount = Math.round(subtotal * 0.19);
    const total = subtotal + taxAmount;
    const profitMarginPercent = totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(1)) : 0;

    const newEstimate: Estimate = {
      id: generateNextCOTId(companyId),
      date: new Date().toISOString().split("T")[0],
      customer: quoteCustomer,
      customerNit: quoteNit,
      customerPhone: quotePhone,
      customerEmail: quoteEmail,
      customerAddress: quoteAddress,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      items: calculatedItems,
      totalCost,
      totalProfit,
      profitMarginPercent,
      subtotal,
      taxAmount,
      total,
      status: "BORRADOR",
      companyId,
      notes: quoteNotes,
      quoteReference: quoteReference || undefined,
      responsiblePerson: quoteResponsible || undefined
    };

    setEstimates(prev => [newEstimate, ...prev]);
    setIsCreatingQuote(false);
    resetQuoteForm();
    alert(`✓ Cotización ${newEstimate.id} creada para ${newEstimate.customer} (Utilidad estimada: ${formatCOP(totalProfit)} COP).`);
  };

  const resetQuoteForm = () => {
    setQuoteCustomer("");
    setQuoteNit("");
    setQuotePhone("");
    setQuoteEmail("");
    setQuoteAddress("");
    setQuoteNotes("");
    setQuoteReference("");
    setQuoteResponsible("");
    setQuoteItems([{ code: "", desc: "", qty: 1, cost: 0, margin: 25, price: 0 }]);
  };

  // Real-time Editor Item modification handlers
  const handleEditItemValueChange = (
    idx: number,
    field: "description" | "quantity" | "unitCost" | "profitMarginPercent" | "unitPrice",
    val: any
  ) => {
    if (!editingEstimateData) return;
    const updatedItems = [...editingEstimateData.items];
    const item = { ...updatedItems[idx] };

    if (field === "description") {
      item.description = val;
    } else if (field === "quantity") {
      const qty = Math.max(1, parseInt(val, 10) || 1);
      item.quantity = qty;
      item.total = qty * (item.unitPrice || 0);
    } else if (field === "unitCost") {
      const cost = Math.max(0, parseFloat(val) || 0);
      item.unitCost = cost;
      const margin = item.profitMarginPercent !== undefined ? item.profitMarginPercent : 0;
      item.unitPrice = Math.round(cost * (1 + margin / 100));
      item.profitAmount = item.unitPrice - cost;
      item.total = (item.quantity || 1) * item.unitPrice;
    } else if (field === "profitMarginPercent") {
      const margin = parseFloat(val) || 0;
      item.profitMarginPercent = margin;
      const cost = item.unitCost !== undefined ? item.unitCost : item.unitPrice;
      item.unitCost = cost;
      item.unitPrice = Math.round(cost * (1 + margin / 100));
      item.profitAmount = item.unitPrice - cost;
      item.total = (item.quantity || 1) * item.unitPrice;
    } else if (field === "unitPrice") {
      const price = Math.max(0, parseFloat(val) || 0);
      item.unitPrice = price;
      const cost = item.unitCost !== undefined ? item.unitCost : price;
      item.unitCost = cost;
      item.profitMarginPercent = cost > 0 ? Number((((price - cost) / cost) * 100).toFixed(1)) : 0;
      item.profitAmount = price - cost;
      item.total = (item.quantity || 1) * price;
    }

    updatedItems[idx] = item;

    // Recalculate totals
    let totalCost = 0;
    let subtotal = 0;
    let totalProfit = 0;

    updatedItems.forEach(it => {
      const qty = it.quantity || 1;
      const cost = it.unitCost !== undefined ? it.unitCost : it.unitPrice;
      const price = it.unitPrice || 0;
      const lineCost = qty * cost;
      const lineTotal = qty * price;
      const lineProfit = qty * (price - cost);

      totalCost += lineCost;
      subtotal += lineTotal;
      totalProfit += lineProfit;
    });

    const taxAmount = Math.round(subtotal * 0.19);
    const total = subtotal + taxAmount;
    const profitMarginPercent = totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(1)) : 0;

    setEditingEstimateData({
      ...editingEstimateData,
      items: updatedItems,
      totalCost,
      totalProfit,
      profitMarginPercent,
      subtotal,
      taxAmount,
      total
    });
  };

  const handleApplyGlobalMargin = (margin: number) => {
    if (!editingEstimateData) return;
    const updatedItems = editingEstimateData.items.map(it => {
      const cost = it.unitCost !== undefined ? it.unitCost : it.unitPrice;
      const unitPrice = Math.round(cost * (1 + margin / 100));
      const qty = it.quantity || 1;
      return {
        ...it,
        unitCost: cost,
        profitMarginPercent: margin,
        profitAmount: unitPrice - cost,
        unitPrice,
        total: qty * unitPrice
      };
    });

    let totalCost = 0;
    let subtotal = 0;
    let totalProfit = 0;

    updatedItems.forEach(it => {
      const qty = it.quantity || 1;
      const cost = it.unitCost || 0;
      const price = it.unitPrice || 0;
      totalCost += qty * cost;
      subtotal += qty * price;
      totalProfit += qty * (price - cost);
    });

    const taxAmount = Math.round(subtotal * 0.19);
    const total = subtotal + taxAmount;
    const profitMarginPercent = totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(1)) : 0;

    setEditingEstimateData({
      ...editingEstimateData,
      items: updatedItems,
      totalCost,
      totalProfit,
      profitMarginPercent,
      subtotal,
      taxAmount,
      total
    });
  };

  // Handlers for manual PO Item row management
  const handleAddPoItemRow = () => {
    setPoItems([...poItems, { code: "", desc: "", qty: 1, cost: 0 }]);
  };

  const handleRemovePoItemRow = (index: number) => {
    if (poItems.length === 1) return;
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handlePoItemChange = (index: number, field: string, val: any) => {
    setPoItems(poItems.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: val };
    }));
  };

  // Submit manual Purchase Order
  const handleSaveManualPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplier || poItems.some(item => !item.desc || item.cost <= 0)) {
      alert("Por favor complete todos los datos de los insumos de la orden de compra");
      return;
    }

    const subtotal = poItems.reduce((acc, item) => acc + (item.qty * item.cost), 0);
    const taxAmount = Math.round(subtotal * 0.19);
    const total = subtotal + taxAmount;

    const newPO: PurchaseOrder = {
      id: generateNextODCId(companyId),
      date: new Date().toISOString().split("T")[0],
      supplier: poSupplier,
      companyId,
      items: poItems.map(it => ({
        code: it.code || "MAT-GEN",
        description: it.desc,
        quantity: it.qty,
        unitCost: it.cost,
        total: it.qty * it.cost
      })),
      subtotal,
      taxAmount,
      total,
      status: "CREADO",
      notes: poNotes,
      carrier: poCarrier || "Transporte Propio",
      etaDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    };

    setPurchaseOrders(prev => [newPO, ...prev]);
    setIsCreatingPO(false);
    resetPoForm();

    // Side effect: Register as a pending accounting obligation (COMPRA)
    onAddTransaction({
      type: "COMPRA",
      amount: total,
      customerSupplier: newPO.supplier,
      description: `Orden de Compra emitida ${newPO.id}: Adquisición de materiales/suministros`,
      category: "Adquisición Materiales",
      status: "BORRADOR",
      account: "220505 - Proveedores Nacionales",
      companyId
    });

    alert(`✓ Orden de Compra ${newPO.id} emitida a ${newPO.supplier}.`);
  };

  const resetPoForm = () => {
    setPoSupplier("");
    setPoNotes("");
    setPoCarrier("");
    setPoItems([{ code: "", desc: "", qty: 1, cost: 0 }]);
  };

  // Universal Quote File Processor (Images, Photos, PDFs, Excel, etc.)
  const processQuoteFile = async (file: File) => {
    if (!file) return;

    const isImg = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic|heif|bmp|jfif|tif|tiff)$/i.test(file.name);
    let previewUrl: string | undefined;
    if (isImg) {
      previewUrl = URL.createObjectURL(file);
    }

    setAnalyzingFilePreview({
      name: file.name,
      type: file.type || "image/jpeg",
      previewUrl,
      isImage: isImg
    });
    setIsAnalyzing(true);
    setAnalysisError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(",")[1];
        
        const response = await apiFetch("/api/analyze-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || (isImg ? "image/jpeg" : "application/pdf"),
            fileData: base64Data,
            companyId,
            userInstruction
          })
        });

        if (!response.ok) {
          throw new Error("Respuesta de servidor fallida");
        }

        const data = await response.json();

        // Error real del modelo (saturación/red): avisar sin inventar datos.
        if (data.isError) {
          setIsAnalyzing(false);
          setAnalyzingFilePreview(null);
          setAnalysisError(data.errorMessage || "Gemini no pudo procesar el documento. Reintenta en unos segundos.");
          return;
        }
        
        // Add extracted quote to estimates list
        const extractedEstimate: Estimate = data.estimate;

        // MODO DEMO: sin GEMINI_API_KEY el servidor devuelve datos simulados.
        if (data.isDemo) {
          const proceed = window.confirm(
            "⚠️ MODO DEMO: la API de Gemini no está configurada en el servidor. Se generará una cotización con datos SIMULADOS para previsualizar el flujo, pero NO reflejará el contenido real del documento. ¿Desea incluirla?"
          );
          if (!proceed) {
            setIsAnalyzing(false);
            setAnalyzingFilePreview(null);
            setAnalysisError("Extracción cancelada. Configure GEMINI_API_KEY en los secrets del proyecto para el procesamiento real del documento.");
            return;
          }
          extractedEstimate.notes = [extractedEstimate.notes, "⚠ SIMULACIÓN (sin GEMINI_API_KEY)"].filter(Boolean).join(" | ");
        }

        if (!extractedEstimate.id || !extractedEstimate.id.startsWith("COT-")) {
          extractedEstimate.id = generateNextCOTId(companyId);
        }
        setEstimates(prev => [extractedEstimate, ...prev]);

        // Add extracted learning insight to local learning DB
        const newLearning: QuoteLearningInsight = {
          id: `LRN-${Date.now().toString().slice(-3)}`,
          fileName: file.name,
          date: new Date().toISOString().split("T")[0],
          companyId,
          extractedTitle: extractedEstimate.items[0]?.description || "Servicios Varios",
          customerName: extractedEstimate.customer,
          valueQuoted: extractedEstimate.total,
          timeEstimated: data.learning?.tiempoEstimadoEjecucion || "No especificado",
          profitabilityAnalysis: data.learning?.viabilidadUtilidad || "Margen óptimo.",
          overcosts: data.learning?.sobrecostos || "Bajo riesgo de sobrecosto.",
          imprevistos: data.learning?.imprevistos || "Se aconseja un 5% de imprevistos."
        };

        setLearningDb(prev => [newLearning, ...prev]);
        setIsAnalyzing(false);
        setAnalyzingFilePreview(null);
        alert(`✓ IA analizó con éxito la ${isImg ? "fotografía/imagen" : "cotización"} "${file.name}". Extrajo la cotización ${extractedEstimate.id} con cálculo de utilidad.`);

      } catch (err: any) {
        console.error(err);
        setIsAnalyzing(false);
        setAnalyzingFilePreview(null);
        setAnalysisError("No se pudo analizar el archivo (servidor o API de Gemini no disponible). No se generaron datos automáticos. Verifique que GEMINI_API_KEY esté configurada y vuelva a intentarlo.");
      }
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleQuoteFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processQuoteFile(file);
  };

  // Universal PO File Processor (Images, Photos, PDFs, etc.)
  const processPoFile = async (file: File) => {
    if (!file) return;

    const isImg = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic|heif|bmp|jfif|tif|tiff)$/i.test(file.name);
    let previewUrl: string | undefined;
    if (isImg) {
      previewUrl = URL.createObjectURL(file);
    }

    setAnalyzingFilePreview({
      name: file.name,
      type: file.type || "image/jpeg",
      previewUrl,
      isImage: isImg
    });
    setIsAnalyzing(true);
    setAnalysisError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(",")[1];
        
        const response = await apiFetch("/api/analyze-po", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || (isImg ? "image/jpeg" : "application/pdf"),
            fileData: base64Data,
            companyId,
            userInstruction
          })
        });

        if (!response.ok) {
          throw new Error("Respuesta de servidor fallida");
        }

        const data = await response.json();

        // Error real del modelo (saturación/red): avisar sin inventar datos.
        if (data.isError) {
          setIsAnalyzing(false);
          setAnalyzingFilePreview(null);
          setAnalysisError(data.errorMessage || "Gemini no pudo procesar el documento. Reintenta en unos segundos.");
          return;
        }
        
        // Add extracted PO to state
        const extractedPO: PurchaseOrder = data.purchaseOrder;

        // MODO DEMO: sin GEMINI_API_KEY el servidor devuelve datos simulados.
        if (data.isDemo) {
          const proceed = window.confirm(
            "⚠️ MODO DEMO: la API de Gemini no está configurada en el servidor. Se generará una orden de compra con datos SIMULADOS para previsualizar el flujo, pero NO reflejará el contenido real del documento. ¿Desea incluirla?"
          );
          if (!proceed) {
            setIsAnalyzing(false);
            setAnalyzingFilePreview(null);
            setAnalysisError("Extracción cancelada. Configure GEMINI_API_KEY en los secrets del proyecto para el procesamiento real del documento.");
            return;
          }
          extractedPO.notes = [extractedPO.notes, "⚠ SIMULACIÓN (sin GEMINI_API_KEY)"].filter(Boolean).join(" | ");
        }

        extractedPO.id = generateNextODCId(companyId);
        setPurchaseOrders(prev => [extractedPO, ...prev]);

        // Register in Accounting
        onAddTransaction({
          type: "COMPRA",
          amount: extractedPO.total,
          customerSupplier: extractedPO.supplier,
          description: `Orden de Compra extraída por IA ${extractedPO.id} para ${extractedPO.supplier}`,
          category: "Adquisición Insumos IA",
          status: "CONTABILIZADO",
          account: "220505 - Proveedores Nacionales",
          companyId
        });

        setIsAnalyzing(false);
        setAnalyzingFilePreview(null);
        alert(`✓ IA procesó con éxito la ${isImg ? "fotografía/factura" : "cotización"} "${file.name}". Orden de compra ${extractedPO.id} generada y contabilizada.`);

      } catch (err: any) {
        console.error(err);
        setIsAnalyzing(false);
        setAnalyzingFilePreview(null);
        setAnalysisError("No se pudo analizar el archivo (servidor o API de Gemini no disponible). No se generaron datos automáticos. Verifique que GEMINI_API_KEY esté configurada y vuelva a intentarlo.");
      }
    };

    reader.readAsDataURL(file);
    if (poFileInputRef.current) poFileInputRef.current.value = "";
    if (poImageInputRef.current) poImageInputRef.current.value = "";
    if (poCameraInputRef.current) poCameraInputRef.current.value = "";
  };

  const handlePoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processPoFile(file);
  };

  // Clipboard Paste Support (Ctrl+V for screenshots and copied image files)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            if (activeSubTab === "COMPRAS") {
              processPoFile(file);
            } else {
              processQuoteFile(file);
            }
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeSubTab, companyId, userInstruction]);

  // PDF Generators using jsPDF
  const handleGenerateQuotePDF = (cot: Estimate) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const b = getBrandDetails();

    // Top background color bar
    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.rect(0, 0, 210, 4, "F");

    // Geometric badge logo
    const logoX = 15;
    const logoY = 15;
    if (companyId === "WPC") {
      doc.setFillColor(99, 102, 241);
      doc.triangle(logoX + 4, logoY + 1, logoX + 8, logoY + 7, logoX + 4, logoY + 13, "F");
      doc.triangle(logoX + 4, logoY + 1, logoX, logoY + 7, logoX + 4, logoY + 13, "F");
      doc.setFillColor(30, 41, 59);
      doc.triangle(logoX + 4, logoY + 13, logoX + 8, logoY + 7, logoX + 12, logoY + 13, "F");
      doc.setFillColor(100, 116, 139);
      doc.triangle(logoX + 12, logoY + 1, logoX + 16, logoY + 7, logoX + 12, logoY + 13, "F");
      doc.triangle(logoX + 12, logoY + 1, logoX + 8, logoY + 7, logoX + 12, logoY + 13, "F");
    } else {
      doc.setFillColor(b.color[0], b.color[1], b.color[2]);
      doc.roundedRect(logoX, logoY, 14, 14, 2, 2, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(b.badgeLetter, logoX + 5, logoY + 9.5);
    }

    // Brand details beside logo
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(companyName.toUpperCase(), logoX + 18, logoY + 5);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // Slate-400
    doc.text(b.moto, logoX + 18, logoY + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`NIT: ${b.nit}`, logoX + 18, logoY + 13);

    // Right aligned company details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(b.address, 195, logoY + 4, { align: "right" });
    doc.text(b.phone, 195, logoY + 8, { align: "right" });
    doc.text(b.email, 195, logoY + 12, { align: "right" });

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(15, 34, 195, 34);

    // --- Title block ---
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 38, 180, 16, 1.5, 1.5, "F");

    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("COTIZACIÓN COMERCIAL", 20, 48);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`REF: ${cot.id}`, 190, 45, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha Emisión: ${cot.date}   |   Válido Hasta: ${cot.validUntil}`, 190, 50, { align: "right" });

    // --- Client Metadata ---
    const clientY = 58;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, clientY, 180, 28, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text("INFORMACIÓN DESTINATARIO (CLIENTE)", 20, clientY + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("Nombre / Cliente:", 20, clientY + 13);
    doc.text("NIT / Cédula:", 20, clientY + 19);
    doc.text("Dirección:", 20, clientY + 25);

    doc.setFont("helvetica", "normal");
    doc.text(cot.customer, 48, clientY + 13);
    doc.text(cot.customerNit || "N/A", 48, clientY + 19);
    doc.text(cot.customerAddress || "No registrada", 48, clientY + 25);

    doc.setFont("helvetica", "bold");
    doc.text("Teléfono:", 115, clientY + 13);
    doc.text("Correo Elec.:", 115, clientY + 19);
    
    doc.setFont("helvetica", "normal");
    doc.text(cot.customerPhone || "N/A", 135, clientY + 13);
    doc.text(cot.customerEmail || "N/A", 135, clientY + 19);

    // --- Table ---
    const tableHeaderY = 92;
    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.rect(15, tableHeaderY, 180, 7.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("CÓDIGO", 18, tableHeaderY + 5);
    doc.text("DESCRIPCIÓN DEL ARTÍCULO / SERVICIO", 42, tableHeaderY + 5);
    doc.text("CANT.", 130, tableHeaderY + 5, { align: "right" });
    doc.text("VALOR UNIT. (COP)", 160, tableHeaderY + 5, { align: "right" });
    doc.text("TOTAL (COP)", 192, tableHeaderY + 5, { align: "right" });

    let currentY = tableHeaderY + 7.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    cot.items.forEach((item, index) => {
      const splitDesc = doc.splitTextToSize(item.description, 83);
      const rowHeight = Math.max(8, splitDesc.length * 4 + 3);

      // Paginación: si la fila excede el pie de página, nueva hoja con encabezado repetido.
      if (currentY + rowHeight > 272) {
        doc.addPage();
        currentY = 20;
        doc.setFillColor(b.color[0], b.color[1], b.color[2]);
        doc.rect(15, currentY, 180, 7.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text("CÓDIGO", 18, currentY + 5);
        doc.text("DESCRIPCIÓN DEL ARTÍCULO / SERVICIO", 42, currentY + 5);
        doc.text("CANT.", 130, currentY + 5, { align: "right" });
        doc.text("VALOR UNIT. (COP)", 160, currentY + 5, { align: "right" });
        doc.text("TOTAL (COP)", 192, currentY + 5, { align: "right" });
        currentY += 7.5;
      }

      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(15, currentY, 180, rowHeight, "F");

      doc.setDrawColor(241, 245, 249);
      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);

      doc.setFont("helvetica", "bold");
      doc.text(item.code || "N/A", 18, currentY + 5);
      
      doc.setFont("helvetica", "normal");
      doc.text(splitDesc, 42, currentY + 5);
      
      doc.text(String(item.quantity), 130, currentY + 5, { align: "right" });
      doc.text(formatCOP(item.unitPrice), 160, currentY + 5, { align: "right" });
      
      doc.setFont("helvetica", "bold");
      doc.text(formatCOP(item.total), 192, currentY + 5, { align: "right" });

      currentY += rowHeight;
    });

    // Asegurar espacio para totales + pie de página.
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    const totalsY = currentY + 4;
    const boxWidth = 70;
    const boxX = 195 - boxWidth;

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(boxX, totalsY, 195, totalsY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("SUBTOTAL:", boxX + 2, totalsY + 6);
    doc.text("IVA REPERCUTIDO (19%):", boxX + 2, totalsY + 11);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(formatCOP(cot.subtotal), 192, totalsY + 6, { align: "right" });
    doc.text(formatCOP(cot.taxAmount), 192, totalsY + 11, { align: "right" });

    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.roundedRect(boxX, totalsY + 14, boxWidth, 8, 0.8, 0.8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL NETO:", boxX + 4, totalsY + 19.5);
    doc.text(formatCOP(cot.total), 192, totalsY + 19.5, { align: "right" });

    const footerY = totalsY + 30;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, footerY, 180, 22, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Notas y Condiciones Comerciales:", 18, footerY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const notesText = cot.notes || "Validez de la oferta por 30 días calendario a partir de la fecha de emisión. Los precios NO incluyen el impuesto al valor agregado (IVA); el IVA del 19% se suma sobre el subtotal. Despacho sujeto a disponibilidad de stock en el inventario real de la subdivisión del holding.";
    const splitNotes = doc.splitTextToSize(notesText, 174);
    doc.text(splitNotes, 18, footerY + 10);

    doc.save(`Cotizacion_${cot.id}_Formal.pdf`);
  };

  const handleGeneratePOPDF = (po: PurchaseOrder) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const b = getBrandDetails();

    // Top background color bar
    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.rect(0, 0, 210, 4, "F");

    // Geometric badge logo
    const logoX = 15;
    const logoY = 15;
    if (companyId === "WPC") {
      doc.setFillColor(99, 102, 241);
      doc.triangle(logoX + 4, logoY + 1, logoX + 8, logoY + 7, logoX + 4, logoY + 13, "F");
      doc.triangle(logoX + 4, logoY + 1, logoX, logoY + 7, logoX + 4, logoY + 13, "F");
      doc.setFillColor(30, 41, 59);
      doc.triangle(logoX + 4, logoY + 13, logoX + 8, logoY + 7, logoX + 12, logoY + 13, "F");
      doc.setFillColor(100, 116, 139);
      doc.triangle(logoX + 12, logoY + 1, logoX + 16, logoY + 7, logoX + 12, logoY + 13, "F");
      doc.triangle(logoX + 12, logoY + 1, logoX + 8, logoY + 7, logoX + 12, logoY + 13, "F");
    } else {
      doc.setFillColor(b.color[0], b.color[1], b.color[2]);
      doc.roundedRect(logoX, logoY, 14, 14, 2, 2, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(b.badgeLetter, logoX + 5, logoY + 9.5);
    }

    // Brand details beside logo
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(companyName.toUpperCase(), logoX + 18, logoY + 5);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(b.moto, logoX + 18, logoY + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`NIT: ${b.nit}`, logoX + 18, logoY + 13);

    // Right aligned company details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(b.address, 195, logoY + 4, { align: "right" });
    doc.text(b.phone, 195, logoY + 8, { align: "right" });
    doc.text(b.email, 195, logoY + 12, { align: "right" });

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(15, 34, 195, 34);

    // --- Title block ---
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 38, 180, 16, 1.5, 1.5, "F");

    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("ORDEN DE COMPRA COMERCIAL", 20, 48);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`REF: ${po.id}`, 190, 45, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha Emisión: ${po.date}   |   Estatus: ${po.status}`, 190, 50, { align: "right" });

    // --- Supplier Metadata ---
    const clientY = 58;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, clientY, 180, 32, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text("PROVEEDOR ADJUDICADO / BENEFICIARIO", 20, clientY + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("Proveedor / Razón Social:", 20, clientY + 13);
    doc.text("Transportadora:", 20, clientY + 19);
    doc.text("Condición Pago:", 20, clientY + 25);

    doc.setFont("helvetica", "normal");
    doc.text(po.supplier, 56, clientY + 13);
    doc.text(po.carrier || "Envíos directos", 56, clientY + 19);
    doc.text("Pago posterior a recepción factura (30 días)", 56, clientY + 25);

    doc.setFont("helvetica", "bold");
    doc.text("E.T.A. llegada:", 115, clientY + 13);
    doc.text("Destino Despacho:", 115, clientY + 19);
    
    doc.setFont("helvetica", "normal");
    doc.text(po.etaDate || "7 días hábiles", 142, clientY + 13);

    const fullDispatchAddress = `Edificio Torres Bahía I y II Apt 402, ${b.address}`;
    const splitDispatch = doc.splitTextToSize(fullDispatchAddress, 50);
    doc.text(splitDispatch, 142, clientY + 19);

    // --- Table ---
    const tableHeaderY = 96;
    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.rect(15, tableHeaderY, 180, 7.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("CÓDIGO", 18, tableHeaderY + 5);
    doc.text("INSUMO / REPUESTO / SERVICIO SOLICITADO", 42, tableHeaderY + 5);
    doc.text("CANTIDAD", 130, tableHeaderY + 5, { align: "right" });
    doc.text("COSTO UNIT. (COP)", 160, tableHeaderY + 5, { align: "right" });
    doc.text("TOTAL BRUTO (COP)", 192, tableHeaderY + 5, { align: "right" });

    let currentY = tableHeaderY + 7.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    po.items.forEach((item, index) => {
      const splitDesc = doc.splitTextToSize(item.description, 83);
      const rowHeight = Math.max(8, splitDesc.length * 4 + 3);

      // Paginación: si la fila excede el pie de página, nueva hoja con encabezado repetido.
      if (currentY + rowHeight > 272) {
        doc.addPage();
        currentY = 20;
        doc.setFillColor(b.color[0], b.color[1], b.color[2]);
        doc.rect(15, currentY, 180, 7.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text("CÓDIGO", 18, currentY + 5);
        doc.text("INSUMO / REPUESTO / SERVICIO SOLICITADO", 42, currentY + 5);
        doc.text("CANTIDAD", 130, currentY + 5, { align: "right" });
        doc.text("COSTO UNIT. (COP)", 160, currentY + 5, { align: "right" });
        doc.text("TOTAL BRUTO (COP)", 192, currentY + 5, { align: "right" });
        currentY += 7.5;
      }

      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(15, currentY, 180, rowHeight, "F");

      doc.setDrawColor(241, 245, 249);
      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);

      doc.setFont("helvetica", "bold");
      doc.text(item.code || "N/A", 18, currentY + 5);
      
      doc.setFont("helvetica", "normal");
      doc.text(splitDesc, 42, currentY + 5);
      
      doc.text(String(item.quantity), 130, currentY + 5, { align: "right" });
      doc.text(formatCOP(item.unitCost), 160, currentY + 5, { align: "right" });
      
      doc.setFont("helvetica", "bold");
      doc.text(formatCOP(item.total), 192, currentY + 5, { align: "right" });

      currentY += rowHeight;
    });

    // Asegurar espacio para totales + pie de página.
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    const itemsSubtotal = po.items.reduce((sum, i) => sum + i.total, 0);
    const poSubtotal = po.subtotal ?? itemsSubtotal;
    const poTax = po.taxAmount ?? Math.round(poSubtotal * 0.19);
    const poGrandTotal = poSubtotal + poTax;

    const totalsY = currentY + 4;
    const boxWidth = 80;
    const boxX = 195 - boxWidth;

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(boxX, totalsY, 195, totalsY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("SUBTOTAL (Sin IVA):", boxX + 2, totalsY + 5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(formatCOP(poSubtotal), 192, totalsY + 5, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("IVA DISCRIMINADO (19%):", boxX + 2, totalsY + 10);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(formatCOP(poTax), 192, totalsY + 10, { align: "right" });

    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.roundedRect(boxX, totalsY + 13, boxWidth, 8, 0.8, 0.8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL ORDEN DE COMPRA:", boxX + 3, totalsY + 18.5);
    doc.text(formatCOP(poGrandTotal), 192, totalsY + 18.5, { align: "right" });

    const footerY = totalsY + 28;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, footerY, 180, 22, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Condiciones de Suministro y Facturación:", 18, footerY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const notesText = po.notes || "Se requiere facturación electrónica con el NIT de la empresa holding emisor en un plazo no mayor a 5 días hábiles posterior a la entrega. Los productos deben coincidir de forma idéntica con los códigos descritos. No se admiten sustitutos sin aprobación escrita del revisor.";
    const splitNotes = doc.splitTextToSize(notesText, 174);
    doc.text(splitNotes, 18, footerY + 10);

    doc.save(`OrdenCompra_${po.id}_${companyId}.pdf`);
  };

  // Marcar una O.C. como RECIBIDA y contabilizar la compra.
  const handleMarkPOReceived = (po: PurchaseOrder) => {
    if (po.status === "RECIBIDO") return;
    setPurchaseOrders(prev => prev.map(p => p.id === po.id ? { ...p, status: "RECIBIDO" } : p));
    const account = companyId === "WPC"
      ? "143501 - Mercancías de Importación - WPC Autopartes"
      : "220505 - Proveedores Nacionales";
    onAddTransaction({
      type: "COMPRA",
      amount: po.total,
      customerSupplier: po.supplier,
      description: `Compra registrada al recibir la O.C. ${po.id}`,
      category: "Adquisición Recibida",
      status: "CONTABILIZADO",
      account,
      companyId
    });
    alert(`✓ O.C. ${po.id} marcada como RECIBIDA y contabilizada en compras.`);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden" id={`procurement-hub-${companyId}`}>
      
      {/* Sub Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
        <button
          onClick={() => setActiveSubTab("COTIZACIONES")}
          className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === "COTIZACIONES"
              ? `${brand.bgLight} ${brand.text} border`
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" /> Cotizaciones de Venta
        </button>
        <button
          onClick={() => setActiveSubTab("COMPRAS")}
          className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === "COMPRAS"
              ? `${brand.bgLight} ${brand.text} border`
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Órdenes de Compra (Proveedores)
        </button>
        <button
          onClick={() => setActiveSubTab("APRENDIZAJE")}
          className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === "APRENDIZAJE"
              ? `${brand.bgLight} ${brand.text} border`
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          <Brain className="w-4 h-4" /> Base IA de Aprendizaje de Costos
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-5">

        {/* Loading Spinner overlay */}
        {isAnalyzing && (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 animate-pulse mb-4 flex flex-col items-center justify-center gap-3">
            <Sparkles className={`w-8 h-8 animate-spin ${brand.text}`} />
            <div>
              <p className="text-xs font-bold text-slate-700">Analizando Documento con Google Gemini 3.7-Flash...</p>
              <p className="text-[10px] text-slate-400 mt-1">Extrayendo ítems, códigos, precios y generando insights contables preventivos.</p>
            </div>
          </div>
        )}

        {/* Live Analyzing Preview Overlay / Modal */}
        {isAnalyzing && (
          <div className="mb-4 p-4 bg-gradient-to-r from-indigo-900 to-slate-900 border border-indigo-500/30 text-white rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-4 relative overflow-hidden animate-fadeIn">
            {/* Background Glow */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
            
            {analyzingFilePreview?.previewUrl ? (
              <div className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-indigo-400/50 bg-black/40 shrink-0 shadow-md">
                <img 
                  src={analyzingFilePreview.previewUrl} 
                  alt="Vista previa fotografía" 
                  className="w-full h-full object-cover" 
                />
                {/* Laser scanline animation */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent animate-pulse h-1/2 w-full border-b-2 border-cyan-300" />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-[8px] font-bold text-cyan-300 rounded uppercase">
                  FOTO OCR
                </span>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-indigo-800/60 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <Scan className="w-8 h-8 text-indigo-300 animate-spin" />
              </div>
            )}

            <div className="flex-1 flex flex-col gap-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Loader2 className="w-4 h-4 text-cyan-300 animate-spin" />
                <span className="text-xs font-extrabold text-cyan-300 uppercase tracking-wide">
                  {analyzingFilePreview?.isImage ? "📸 Analizando Fotografía / Imagen con Gemini Vision OCR" : "📄 Procesando Documento con IA"}
                </span>
              </div>
              <p className="text-sm font-bold text-white truncate max-w-md">
                {analyzingFilePreview?.name || "Leyendo archivo..."}
              </p>
              <p className="text-[11px] text-slate-300">
                Extrayendo tablas de cotización, ítems, precios unitarios, margen de utilidad por ítem y consolidado antes de IVA para <strong className="text-indigo-200">{companyName}</strong>...
              </p>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-indigo-800/50 border border-indigo-600/40 text-[10px] text-indigo-200 font-semibold shrink-0">
              Procesamiento Activo
            </div>
          </div>
        )}

        {analysisError && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>{analysisError}</span>
          </div>
        )}

        {/* Tab 1: COTIZACIONES */}
        {activeSubTab === "COTIZACIONES" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b pb-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Historial de Cotizaciones Emitidas ({companyId})</h3>
                <p className="text-[10px] text-slate-400">Cotizaciones locales de servicios y productos sin mezclar con otras empresas</p>
              </div>

              {/* Action Buttons Toolbar for Cotizaciones */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* 1. Standard Document Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleQuoteFileUpload} 
                  className="hidden" 
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.txt" 
                />

                {/* 2. Photo / Image Input */}
                <input 
                  type="file" 
                  ref={imageInputRef} 
                  onChange={handleQuoteFileUpload} 
                  className="hidden" 
                  accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.bmp,.jfif,.tif,.tiff" 
                />

                {/* 3. Direct Camera Capture Input */}
                <input 
                  type="file" 
                  ref={cameraInputRef} 
                  onChange={handleQuoteFileUpload} 
                  className="hidden" 
                  accept="image/*"
                  capture="environment"
                />

                {/* Button: Camera Capture */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
                  title="Tomar foto directa de una cotización con tu cámara o celular"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-600" /> Tomar Foto
                </button>

                {/* Button: Image Upload */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
                  title="Cargar fotografía o captura de pantalla (JPG, PNG, WEBP, HEIC)"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-600" /> Cargar Imagen / Foto
                </button>

                {/* Button: Document Upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
                  title="Carga una cotización en PDF, Excel o Word para adaptarla automáticamente"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-600" /> Cargar PDF / Excel
                </button>

                {/* Button: Manual Quote */}
                <button
                  type="button"
                  onClick={() => setIsCreatingQuote(!isCreatingQuote)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs ${brand.button}`}
                >
                  <Plus className="w-3.5 h-3.5" /> Nueva Cotización
                </button>
              </div>
            </div>

            {/* Drag & Drop / Photo OCR Banner */}
            <div 
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file) processQuoteFile(file);
              }}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-xl p-3 text-center transition-all flex flex-col sm:flex-row items-center justify-between gap-2 cursor-pointer"
              onClick={() => imageInputRef.current?.click()}
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <span>Arrastra o pega (Ctrl+V) fotografías de cotizaciones, capturas, PDFs o Excels</span>
                    <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[9px] font-bold">OCR Activo</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Soporta fotos de celular (JPG, PNG, HEIC, WEBP), presupuestos manuscritos o impresos, facturas y archivos de cálculo.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold shrink-0">
                <Camera className="w-3.5 h-3.5" /> O pulsa aquí para seleccionar
              </div>
            </div>

            {/* AI Contextualization Instruction Box */}
            <div className="bg-gradient-to-r from-indigo-50/50 to-sky-50/50 border border-indigo-100 rounded-xl p-3.5 flex flex-col gap-2 shadow-2xs">
              <span className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Instrucción de Contexto para Asimilación de la IA (Opcional)
              </span>
              <p className="text-[10px] text-slate-500 leading-normal">
                Escribe indicaciones especiales sobre el archivo que vas a cargar (ej: <em>"Aplica IVA del 19%, la referencia de la cotización es REF-777-XYZ, margen de utilidad del 30%"</em>). La IA asimilará estos datos y adaptará los costos reales automáticamente.
              </p>
              <textarea
                placeholder="Escribe instrucciones de contextualización para la IA aquí antes de cargar la fotografía o archivo..."
                value={userInstruction}
                onChange={(e) => setUserInstruction(e.target.value)}
                className="w-full p-2 text-xs border rounded-lg bg-white text-slate-800 shadow-3xs focus:outline-indigo-500"
                rows={2}
              />
            </div>

            {/* Formulario Nueva Cotización Manual */}
            {isCreatingQuote && (
              <form onSubmit={handleSaveManualQuote} className="p-4 bg-slate-50 border rounded-xl flex flex-col gap-4 animate-fadeIn">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" /> Crear Cotización para {companyId}
                  </h4>
                  <button type="button" onClick={() => setIsCreatingQuote(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Cliente / Destinatario</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: Aceros Nacionales SAS"
                      value={quoteCustomer}
                      onChange={(e) => setQuoteCustomer(e.target.value)}
                      className="p-1.5 text-xs border rounded bg-white text-slate-800 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">NIT / Cédula</label>
                    <input 
                      type="text" 
                      placeholder="Ej: 900.281.334-1"
                      value={quoteNit}
                      onChange={(e) => setQuoteNit(e.target.value)}
                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Referencia de Cotización original</label>
                    <input 
                      type="text" 
                      placeholder="Ej: COT-WPC-0001"
                      value={quoteReference}
                      onChange={(e) => setQuoteReference(e.target.value)}
                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Teléfono de Contacto</label>
                    <input 
                      type="text" 
                      placeholder="Ej: 315 281 9281"
                      value={quotePhone}
                      onChange={(e) => setQuotePhone(e.target.value)}
                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Correo Electrónico</label>
                    <input 
                      type="email" 
                      placeholder="ejemplo@correo.com"
                      value={quoteEmail}
                      onChange={(e) => setQuoteEmail(e.target.value)}
                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Responsable de Gestión</label>
                    <input 
                      type="text" 
                      placeholder="Nombre del responsable"
                      value={quoteResponsible}
                      onChange={(e) => setQuoteResponsible(e.target.value)}
                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                    />
                  </div>
                  <div className="flex flex-col gap-1 col-span-1 md:col-span-3">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Dirección de Despacho / Obra</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Calle 80 # 15-20 Of 402, Bogotá"
                      value={quoteAddress}
                      onChange={(e) => setQuoteAddress(e.target.value)}
                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t pt-3">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wide">
                      ARTÍCULOS O SERVICIOS COTIZADOS & MÁRGENES DE UTILIDAD
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-slate-500 font-bold flex items-center gap-1">
                        <Sliders className="w-3 h-3 text-indigo-600" /> Margen Rápido:
                      </span>
                      {[0, 15, 20, 25, 30, 35, 40, 50].map((m) => (
                        <button
                          key={`manual-m-${m}`}
                          type="button"
                          onClick={() => handleApplyManualQuoteGlobalMargin(m)}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 font-bold rounded text-[9px] transition-all cursor-pointer"
                        >
                          +{m}%
                        </button>
                      ))}
                      <button 
                        type="button" 
                        onClick={handleAddQuoteItemRow}
                        className="ml-2 text-[10px] font-extrabold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer bg-sky-50 px-2 py-0.5 rounded border border-sky-200"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Fila
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[700px] flex flex-col gap-1.5">
                      <div className="grid grid-cols-12 gap-1.5 text-[8px] font-extrabold text-slate-500 uppercase px-1">
                        <div className="col-span-1">Código</div>
                        <div className="col-span-4">Descripción / Servicio</div>
                        <div className="col-span-1 text-center">Cant.</div>
                        <div className="col-span-2 text-right">Costo Base Unit.</div>
                        <div className="col-span-1 text-center">% Utilidad</div>
                        <div className="col-span-2 text-right">Nuevo Valor Venta Unit.</div>
                        <div className="col-span-1 text-center">Acción</div>
                      </div>

                      {quoteItems.map((item, index) => {
                        const lineCost = (item.qty || 1) * (item.cost || 0);
                        const lineTotal = (item.qty || 1) * (item.price || 0);
                        const lineProfit = lineTotal - lineCost;

                        return (
                          <div key={index} className="grid grid-cols-12 gap-1.5 items-center bg-slate-50/70 p-1.5 rounded-lg border border-slate-200/80">
                            <div className="col-span-1">
                              <input 
                                type="text" 
                                placeholder="Cód"
                                value={item.code}
                                onChange={(e) => handleQuoteItemChange(index, "code", e.target.value)}
                                className="w-full p-1 text-[11px] border rounded bg-white text-slate-800 font-mono font-bold"
                              />
                            </div>
                            <div className="col-span-4">
                              <input 
                                type="text" 
                                required
                                placeholder="Descripción del ítem cotizado"
                                value={item.desc}
                                onChange={(e) => handleQuoteItemChange(index, "desc", e.target.value)}
                                className="w-full p-1 text-[11px] border rounded bg-white text-slate-800 font-medium"
                              />
                            </div>
                            <div className="col-span-1">
                              <input 
                                type="number" 
                                required
                                min="1"
                                placeholder="1"
                                value={item.qty}
                                onChange={(e) => handleQuoteItemChange(index, "qty", parseInt(e.target.value, 10) || 1)}
                                className="w-full p-1 text-[11px] border rounded bg-white text-center text-slate-800 font-bold"
                              />
                            </div>
                            <div className="col-span-2">
                              <input 
                                type="number" 
                                required
                                placeholder="Costo COP"
                                value={item.cost || ""}
                                onChange={(e) => handleQuoteItemChange(index, "cost", parseFloat(e.target.value) || 0)}
                                className="w-full p-1 text-[11px] border rounded bg-white text-right font-mono text-slate-700"
                              />
                            </div>
                            <div className="col-span-1 relative">
                              <input 
                                type="number" 
                                required
                                placeholder="25"
                                value={item.margin !== undefined ? item.margin : 25}
                                onChange={(e) => handleQuoteItemChange(index, "margin", parseFloat(e.target.value) || 0)}
                                className="w-full p-1 text-[11px] border rounded bg-emerald-50/60 text-center font-mono font-bold text-emerald-800 border-emerald-300"
                              />
                            </div>
                            <div className="col-span-2">
                              <input 
                                type="number" 
                                required
                                placeholder="Precio Venta"
                                value={item.price || ""}
                                onChange={(e) => handleQuoteItemChange(index, "price", parseFloat(e.target.value) || 0)}
                                className="w-full p-1 text-[11px] border rounded bg-white text-right font-mono font-black text-indigo-900 border-indigo-200"
                              />
                              <div className="text-[9px] text-right font-mono text-emerald-600 font-bold mt-0.5">
                                +{formatCOP(lineProfit)} ({item.margin || 0}%)
                              </div>
                            </div>
                            <div className="col-span-1 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveQuoteItemRow(index)}
                                disabled={quoteItems.length === 1}
                                className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-30 cursor-pointer"
                                title="Eliminar ítem"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manual Quote Real-time Totals and Profit Summary */}
                  {(() => {
                    const totalCost = quoteItems.reduce((acc, item) => acc + ((item.qty || 1) * (item.cost || 0)), 0);
                    const subtotal = quoteItems.reduce((acc, item) => acc + ((item.qty || 1) * (item.price || 0)), 0);
                    const totalProfit = subtotal - totalCost;
                    const taxAmount = Math.round(subtotal * 0.19);
                    const total = subtotal + taxAmount;
                    const effectiveMargin = totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(1)) : 0;

                    return (
                      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-extrabold text-slate-400">Costo Base Total</span>
                            <span className="text-xs font-bold font-mono text-slate-700">{formatCOP(totalCost)}</span>
                          </div>
                          <div className="h-6 w-px bg-slate-300" />
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-extrabold text-emerald-700 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-emerald-600" /> Utilidad Estimada (Antes de IVA)
                            </span>
                            <span className="text-xs font-extrabold font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                              +{formatCOP(totalProfit)} COP (+{effectiveMargin}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] text-slate-400 font-sans font-bold">Subtotal Venta:</span>
                            <span className="font-bold text-slate-800">{formatCOP(subtotal)}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] text-rose-500 font-sans font-bold">IVA (19%):</span>
                            <span className="font-bold text-rose-600">{formatCOP(taxAmount)}</span>
                          </div>
                          <div className="flex flex-col items-end bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-xs">
                            <span className="text-[9px] text-slate-800 font-sans font-extrabold">Total Facturable con IVA:</span>
                            <span className="text-sm font-black text-slate-900">{formatCOP(total)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex flex-col gap-1 border-t pt-3">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase">NOTAS / CONDICIONES COMERCIALES ADICIONALES</label>
                  <textarea 
                    placeholder="Validez de oferta, formas de pago, garantías..."
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    className="p-1.5 text-xs border rounded bg-white text-slate-800 h-16 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => { setIsCreatingQuote(false); resetQuoteForm(); }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-3.5 py-1.5 text-white text-xs font-bold rounded-lg transition-all cursor-pointer ${brand.button}`}
                  >
                    Guardar Cotización
                  </button>
                </div>
              </form>
            )}

            {/* List of Quotes */}
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 border-b text-[10px] text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Ref Interna / Orig</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Cliente / Gestor</th>
                    <th className="p-3">Items / Conceptos</th>
                    <th className="p-3 text-right font-semibold text-slate-500">Costo Base</th>
                    <th className="p-3 text-right font-bold text-emerald-700">Utilidad (antes IVA)</th>
                    <th className="p-3 text-right font-semibold">Subtotal Venta</th>
                    <th className="p-3 text-right font-bold">IVA (19%)</th>
                    <th className="p-3 text-right font-bold text-slate-900">Total Neto</th>
                    <th className="p-3 text-center">Estatus</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {filteredEstimates.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-slate-400 font-medium">
                        No hay cotizaciones registradas para {companyName}. ¡Crea una nueva manual o sube un archivo!
                      </td>
                    </tr>
                  ) : (
                    filteredEstimates.map((cot, cotIdx) => {
                      if (editingEstimateId === cot.id && editingEstimateData) {
                        return (
                          <tr key={`cot-${cot.id}-${cotIdx}`} className="bg-indigo-50/40 border-y-2 border-indigo-200">
                            <td colSpan={11} className="p-4">
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap justify-between items-center border-b border-indigo-100 pb-2 gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-xs text-indigo-950 uppercase flex items-center gap-1.5">
                                      <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" /> Editor de Cotización en Tiempo Real ({cot.id})
                                    </span>
                                  </div>

                                  {/* Quick Global Margin Toolbar */}
                                  <div className="flex flex-wrap items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-xs">
                                    <span className="text-[10px] font-extrabold text-indigo-900 flex items-center gap-1">
                                      <Percent className="w-3 h-3 text-indigo-600" /> Margen Rápido Global:
                                    </span>
                                    {[0, 10, 15, 20, 25, 30, 35, 40, 50].map((marginVal) => (
                                      <button
                                        key={`preset-margin-${marginVal}`}
                                        type="button"
                                        onClick={() => handleApplyGlobalMargin(marginVal)}
                                        className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 text-[10px] font-bold rounded border border-indigo-200 transition-all cursor-pointer"
                                      >
                                        +{marginVal}%
                                      </button>
                                    ))}
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEstimates(prev => prev.map(e => e.id === cot.id ? editingEstimateData : e));
                                        setEditingEstimateId(null);
                                        setEditingEstimateData(null);
                                        alert("✓ Cambios de cotización y márgenes guardados con éxito.");
                                      }}
                                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-extrabold hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
                                    >
                                      Guardar Cambios
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingEstimateId(null);
                                        setEditingEstimateData(null);
                                      }}
                                      className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-all cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Cliente / Destinatario</label>
                                    <input
                                      type="text"
                                      value={editingEstimateData.customer}
                                      onChange={(e) => setEditingEstimateData({ ...editingEstimateData, customer: e.target.value })}
                                      className="p-1.5 text-xs border rounded bg-white text-slate-800 font-semibold"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">NIT Cliente</label>
                                    <input
                                      type="text"
                                      value={editingEstimateData.customerNit || ""}
                                      onChange={(e) => setEditingEstimateData({ ...editingEstimateData, customerNit: e.target.value })}
                                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Referencia Original de Cotización</label>
                                    <input
                                      type="text"
                                      value={editingEstimateData.quoteReference || ""}
                                      onChange={(e) => setEditingEstimateData({ ...editingEstimateData, quoteReference: e.target.value })}
                                      placeholder="Ej: FV03-V7 No. 321781"
                                      className="p-1.5 text-xs border rounded bg-white text-slate-800 font-mono font-bold"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Fecha Documento Original</label>
                                    <input
                                      type="date"
                                      value={editingEstimateData.quoteDate || ""}
                                      onChange={(e) => setEditingEstimateData({ ...editingEstimateData, quoteDate: e.target.value })}
                                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Responsable de Gestión / Solicitud</label>
                                    <input
                                      type="text"
                                      value={editingEstimateData.responsiblePerson || ""}
                                      onChange={(e) => setEditingEstimateData({ ...editingEstimateData, responsiblePerson: e.target.value })}
                                      placeholder="Ej: Rafael (Líder)"
                                      className="p-1.5 text-xs border rounded bg-white text-slate-800 font-semibold"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Notas del Proveedor / Gestor</label>
                                    <input
                                      type="text"
                                      value={editingEstimateData.notes || ""}
                                      onChange={(e) => setEditingEstimateData({ ...editingEstimateData, notes: e.target.value })}
                                      placeholder="Forma de pago, tiempo de entrega..."
                                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                                    />
                                  </div>
                                </div>

                                <div className="border-t border-slate-200/60 pt-2.5 mt-1.5">
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                                      <Calculator className="w-3.5 h-3.5 text-indigo-600" /> Desglose de Ítems, Costos Base & Márgenes de Utilidad (IVA 19% Calculado)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedItems = [
                                          ...editingEstimateData.items, 
                                          { 
                                            code: "ITEM", 
                                            description: "Nuevo Concepto / Insumo", 
                                            quantity: 1, 
                                            unitCost: 0, 
                                            profitMarginPercent: 25, 
                                            profitAmount: 0, 
                                            unitPrice: 0, 
                                            total: 0 
                                          }
                                        ];
                                        setEditingEstimateData({ ...editingEstimateData, items: updatedItems });
                                      }}
                                      className="text-[10px] text-indigo-600 font-extrabold hover:underline flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-indigo-200"
                                    >
                                      + Agregar Ítem de Cotización
                                    </button>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <div className="min-w-[850px] flex flex-col gap-1.5">
                                      {/* Header row */}
                                      <div className="grid grid-cols-12 gap-1.5 text-[8px] font-black text-slate-400 uppercase px-1">
                                        <div className="col-span-4">Descripción / Servicio</div>
                                        <div className="col-span-1 text-center">Cant.</div>
                                        <div className="col-span-2 text-right">Costo Base Unit.</div>
                                        <div className="col-span-1 text-center">% Utilidad</div>
                                        <div className="col-span-2 text-right">Nuevo Valor Venta Unit.</div>
                                        <div className="col-span-1 text-right">Total Fila</div>
                                        <div className="col-span-1 text-center">Acción</div>
                                      </div>

                                      {editingEstimateData.items.map((it, idx) => {
                                        const cost = it.unitCost !== undefined ? it.unitCost : it.unitPrice;
                                        const margin = it.profitMarginPercent !== undefined ? it.profitMarginPercent : 0;
                                        const price = it.unitPrice || 0;
                                        const qty = it.quantity || 1;
                                        const lineProfit = qty * (price - cost);

                                        return (
                                          <div key={idx} className="grid grid-cols-12 gap-1.5 items-center bg-white p-1.5 rounded-lg border border-slate-200">
                                            <input
                                              type="text"
                                              value={it.description}
                                              onChange={(e) => handleEditItemValueChange(idx, "description", e.target.value)}
                                              className="col-span-4 p-1 text-[11px] border rounded bg-white font-medium text-slate-800"
                                              placeholder="Descripción"
                                            />
                                            <input
                                              type="number"
                                              value={it.quantity}
                                              min="1"
                                              onChange={(e) => handleEditItemValueChange(idx, "quantity", e.target.value)}
                                              className="col-span-1 p-1 text-[11px] border rounded bg-white text-center text-slate-800 font-bold"
                                              placeholder="Cant"
                                            />
                                            <input
                                              type="number"
                                              value={cost}
                                              onChange={(e) => handleEditItemValueChange(idx, "unitCost", e.target.value)}
                                              className="col-span-2 p-1 text-[11px] border rounded bg-white text-right font-mono text-slate-700"
                                              placeholder="Costo COP"
                                            />
                                            <div className="col-span-1 relative">
                                              <input
                                                type="number"
                                                value={margin}
                                                onChange={(e) => handleEditItemValueChange(idx, "profitMarginPercent", e.target.value)}
                                                className="w-full p-1 text-[11px] border rounded bg-emerald-50 text-center font-mono font-extrabold text-emerald-800 border-emerald-300"
                                                placeholder="% Margen"
                                              />
                                            </div>
                                            <div className="col-span-2">
                                              <input
                                                type="number"
                                                value={price}
                                                onChange={(e) => handleEditItemValueChange(idx, "unitPrice", e.target.value)}
                                                className="w-full p-1 text-[11px] border rounded bg-indigo-50/50 text-right font-mono font-black text-indigo-950 border-indigo-300"
                                                placeholder="Precio Venta COP"
                                              />
                                              <div className="text-[9px] text-right font-mono text-emerald-600 font-bold mt-0.5">
                                                +{formatCOP(lineProfit)} ({margin}%)
                                              </div>
                                            </div>
                                            <div className="col-span-1 text-right font-mono font-bold text-slate-900 text-xs pr-1">
                                              {formatCOP(qty * price)}
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const updated = editingEstimateData.items.filter((_, i) => i !== idx);
                                                  let totalCost = 0;
                                                  let subtotal = 0;
                                                  let totalProfit = 0;
                                                  updated.forEach(item => {
                                                    const q = item.quantity || 1;
                                                    const c = item.unitCost !== undefined ? item.unitCost : item.unitPrice;
                                                    const p = item.unitPrice || 0;
                                                    totalCost += q * c;
                                                    subtotal += q * p;
                                                    totalProfit += q * (p - c);
                                                  });
                                                  const tax = Math.round(subtotal * 0.19);
                                                  const profitMarginPercent = totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(1)) : 0;
                                                  setEditingEstimateData({
                                                    ...editingEstimateData,
                                                    items: updated,
                                                    totalCost,
                                                    totalProfit,
                                                    profitMarginPercent,
                                                    subtotal,
                                                    taxAmount: tax,
                                                    total: subtotal + tax
                                                  });
                                                }}
                                                className="text-red-500 hover:text-red-700 font-extrabold text-center text-sm p-1 rounded hover:bg-red-50 cursor-pointer"
                                                title="Eliminar este ítem"
                                              >
                                                ×
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>

                                {/* Editor Bottom Summary */}
                                <div className="flex flex-wrap items-center justify-between gap-4 mt-2.5 border-t border-slate-200/80 pt-3 bg-white p-3 rounded-xl shadow-xs">
                                  <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] uppercase font-extrabold text-slate-400">Costo Base Total (Insumos)</span>
                                      <span className="text-xs font-bold font-mono text-slate-700">{formatCOP(editingEstimateData.totalCost || 0)}</span>
                                    </div>
                                    <div className="h-7 w-px bg-slate-200" />
                                    <div className="flex flex-col">
                                      <span className="text-[10px] uppercase font-extrabold text-emerald-700 flex items-center gap-1">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Utilidad Generada (Antes de IVA)
                                      </span>
                                      <span className="text-sm font-extrabold font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-300">
                                        +{formatCOP(editingEstimateData.totalProfit || 0)} COP (+{editingEstimateData.profitMarginPercent || 0}% Margen)
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-5 text-xs font-mono">
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-slate-400 font-sans font-bold">Subtotal Venta:</span>
                                      <span className="font-bold text-slate-800">{formatCOP(editingEstimateData.subtotal)}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-rose-500 font-sans font-bold">IVA (19%):</span>
                                      <span className="font-bold text-rose-600">{formatCOP(editingEstimateData.taxAmount)}</span>
                                    </div>
                                    <div className="flex flex-col items-end bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
                                      <span className="text-[10px] text-indigo-900 font-sans font-extrabold">Total Facturable con IVA:</span>
                                      <span className="text-sm font-black text-indigo-950">{formatCOP(editingEstimateData.total)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const cotCost = cot.totalCost !== undefined ? cot.totalCost : cot.items.reduce((s, it) => s + ((it.quantity || 1) * (it.unitCost !== undefined ? it.unitCost : it.unitPrice)), 0);
                      const cotProfit = cot.totalProfit !== undefined ? cot.totalProfit : (cot.subtotal - cotCost);
                      const cotMargin = cot.profitMarginPercent !== undefined ? cot.profitMarginPercent : (cotCost > 0 ? Number(((cotProfit / cotCost) * 100).toFixed(1)) : 0);

                      return (
                        <tr key={`cot-${cot.id}-${cotIdx}`} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="font-mono font-bold text-slate-900">{cot.id}</div>
                            {cot.quoteReference && (
                              <div className="text-[9px] bg-slate-100 text-slate-500 font-mono font-bold rounded px-1 py-0.5 mt-0.5 inline-block">
                                Ref Orig: {cot.quoteReference}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="whitespace-nowrap">{cot.date}</div>
                            {cot.quoteDate && (
                              <div className="text-[9px] text-slate-400">Orig: {cot.quoteDate}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{cot.customer}</div>
                            {cot.customerNit && <div className="text-[10px] text-slate-400 font-mono">NIT: {cot.customerNit}</div>}
                            {cot.responsiblePerson && (
                              <div className="text-[10px] text-indigo-600 font-bold mt-0.5">Responsable: {cot.responsiblePerson}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="max-w-md font-medium text-slate-800 space-y-1">
                              {cot.items.map((it, idx) => (
                                <div key={idx} className="leading-snug break-words">
                                  <span className="font-bold text-slate-900">{it.quantity}x</span> {it.description}
                                  {it.profitMarginPercent !== undefined && it.profitMarginPercent > 0 && (
                                    <span className="ml-1 text-[9px] text-emerald-600 font-mono font-bold">(+{it.profitMarginPercent}%)</span>
                                  )}
                                </div>
                              ))}
                            </div>
                            {cot.notes && (
                              <div className="text-[9px] text-slate-400 italic max-w-md mt-1 break-words">"{cot.notes}"</div>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-slate-500">{formatCOP(cotCost)}</td>
                          <td className="p-3 text-right">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono whitespace-nowrap inline-flex items-center gap-1">
                              <TrendingUp className="w-2.5 h-2.5" /> +{formatCOP(cotProfit)} ({cotMargin}%)
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-700">{formatCOP(cot.subtotal)}</td>
                          <td className="p-3 text-right font-mono text-rose-600 font-bold">{formatCOP(cot.taxAmount)}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCOP(cot.total)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              cot.status === "ACEPTADO"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : cot.status === "BORRADOR"
                                ? "bg-slate-50 text-slate-600 border border-slate-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {cot.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleGenerateQuotePDF(cot)}
                                className="p-1 hover:bg-rose-50 rounded text-rose-600 transition-all cursor-pointer"
                                title="Descargar PDF Formal de Cotización"
                              >
                                <FileCheck className="w-4 h-4" />
                              </button>
                              
                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  const cloned = JSON.parse(JSON.stringify(cot));
                                  let totalCost = 0;
                                  let subtotal = 0;
                                  let totalProfit = 0;

                                  cloned.items = (cloned.items || []).map((it: any) => {
                                    const qty = it.quantity || 1;
                                    const cost = it.unitCost !== undefined ? it.unitCost : it.unitPrice;
                                    const margin = it.profitMarginPercent !== undefined ? it.profitMarginPercent : (cost > 0 && it.unitPrice > cost ? Number((((it.unitPrice - cost) / cost) * 100).toFixed(1)) : 0);
                                    const price = it.unitPrice !== undefined ? it.unitPrice : Math.round(cost * (1 + margin / 100));
                                    const lineCost = qty * cost;
                                    const lineTotal = qty * price;
                                    const lineProfit = qty * (price - cost);

                                    totalCost += lineCost;
                                    subtotal += lineTotal;
                                    totalProfit += lineProfit;

                                    return {
                                      ...it,
                                      quantity: qty,
                                      unitCost: cost,
                                      profitMarginPercent: margin,
                                      profitAmount: price - cost,
                                      unitPrice: price,
                                      total: lineTotal
                                    };
                                  });

                                  const taxAmount = Math.round(subtotal * 0.19);
                                  const total = subtotal + taxAmount;
                                  const profitMarginPercent = totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(1)) : 0;

                                  cloned.totalCost = totalCost;
                                  cloned.totalProfit = totalProfit;
                                  cloned.profitMarginPercent = profitMarginPercent;
                                  cloned.subtotal = subtotal;
                                  cloned.taxAmount = taxAmount;
                                  cloned.total = total;

                                  setEditingEstimateId(cot.id);
                                  setEditingEstimateData(cloned);
                                }}
                                className="p-1 hover:bg-indigo-50 rounded text-indigo-600 transition-all cursor-pointer"
                                title="Editar Cotización & Márgenes en Tiempo Real"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {cot.status !== "ACEPTADO" && (
                                <button
                                  onClick={() => {
                                    setEstimates(prev => prev.map(e => e.id === cot.id ? { ...e, status: "ACEPTADO" as any } : e));
                                    // Add financial transaction
                                    onAddTransaction({
                                      type: "VENTA",
                                      amount: cot.total,
                                      customerSupplier: cot.customer,
                                      description: `Facturación de la cotización aprobada ${cot.id} para ${cot.customer}`,
                                      category: "Venta Comercial",
                                      status: "CONTABILIZADO",
                                      account: "413505 - Ventas de Mercancías",
                                      companyId
                                    });
                                    alert(`✓ Cotización aprobada. Se ha registrado un ingreso contable (VENTA) por ${formatCOP(cot.total)}.`);
                                  }}
                                  className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-extrabold rounded"
                                  title="Aprobar y Registrar Ingreso en Contabilidad"
                                >
                                  Aprobar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: COMPRAS (ORDENES DE COMPRA) */}
        {activeSubTab === "COMPRAS" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b pb-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Órdenes de Compra Emitidas ({companyId})</h3>
                <p className="text-[10px] text-slate-400">Gestione solicitudes de abastecimiento y adquisiciones de insumos y servicios</p>
              </div>

              {/* Action Buttons Toolbar for Compras / POs */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* 1. Document Input */}
                <input 
                  type="file" 
                  ref={poFileInputRef} 
                  onChange={handlePoFileUpload} 
                  className="hidden" 
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.txt" 
                />

                {/* 2. Photo / Image Input */}
                <input 
                  type="file" 
                  ref={poImageInputRef} 
                  onChange={handlePoFileUpload} 
                  className="hidden" 
                  accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.bmp,.jfif,.tif,.tiff" 
                />

                {/* 3. Camera Capture Input */}
                <input 
                  type="file" 
                  ref={poCameraInputRef} 
                  onChange={handlePoFileUpload} 
                  className="hidden" 
                  accept="image/*"
                  capture="environment"
                />

                {/* Button: Camera Capture */}
                <button
                  type="button"
                  onClick={() => poCameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
                  title="Tomar foto directa a una factura o presupuesto con tu cámara o celular"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-600" /> Tomar Foto Factura
                </button>

                {/* Button: Image Upload */}
                <button
                  type="button"
                  onClick={() => poImageInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
                  title="Cargar fotografía o imagen de factura de proveedor (JPG, PNG, WEBP, HEIC)"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-600" /> Cargar Foto / Factura
                </button>

                {/* Button: Document Upload */}
                <button
                  type="button"
                  onClick={() => poFileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
                  title="Carga una factura o cotización de proveedor en PDF o Excel para generar la orden"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-600" /> Cargar PDF / Excel
                </button>

                {/* Button: Manual PO */}
                <button
                  type="button"
                  onClick={() => setIsCreatingPO(!isCreatingPO)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs ${brand.button}`}
                >
                  <Plus className="w-3.5 h-3.5" /> Nueva Orden de Compra
                </button>
              </div>
            </div>

            {/* Drag & Drop / Photo OCR Banner for PO */}
            <div 
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file) processPoFile(file);
              }}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-xl p-3 text-center transition-all flex flex-col sm:flex-row items-center justify-between gap-2 cursor-pointer"
              onClick={() => poImageInputRef.current?.click()}
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <span>Arrastra o pega (Ctrl+V) fotografías de facturas, presupuestos de proveedores o PDFs</span>
                    <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[9px] font-bold">Generación Automática</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    La IA extraerá proveedores, referencias, costos unitarios, cantidades e impuestos para emitir la Orden de Compra y contabilizarla.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold shrink-0">
                <Camera className="w-3.5 h-3.5" /> O pulsa aquí para seleccionar foto
              </div>
            </div>

            {/* AI Contextualization Instruction Box */}
            <div className="bg-gradient-to-r from-indigo-50/50 to-sky-50/50 border border-indigo-100 rounded-xl p-3.5 flex flex-col gap-2 shadow-2xs">
              <span className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Instrucción de Contexto para Generación de O.C. por IA (Opcional)
              </span>
              <p className="text-[10px] text-slate-500 leading-normal">
                Escribe indicaciones especiales sobre la cotización del proveedor que vas a cargar para generar tu orden de compra formal (ej: <em>"Aplica IVA del 19%, asigna a Servientrega como transportadora y la referencia de cotización es Brembo-998, asimilado por Rafael"</em>).
              </p>
              <textarea
                placeholder="Escribe instrucciones de contextualización para la IA aquí antes de cargar la fotografía o cotización de proveedor..."
                value={userInstruction}
                onChange={(e) => setUserInstruction(e.target.value)}
                className="w-full p-2 text-xs border rounded-lg bg-white text-slate-800 shadow-3xs focus:outline-indigo-500"
                rows={2}
              />
            </div>

            {/* Formulario Nueva Orden de Compra Manual */}
            {isCreatingPO && (
              <form onSubmit={handleSaveManualPO} className="p-4 bg-slate-50 border rounded-xl flex flex-col gap-4 animate-fadeIn">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-slate-500" /> Emitir Orden de Compra desde {companyId}
                  </h4>
                  <button type="button" onClick={() => setIsCreatingPO(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Proveedor / Beneficiario</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: Brembo Italia S.P.A."
                      value={poSupplier}
                      onChange={(e) => setPoSupplier(e.target.value)}
                      className="p-1.5 text-xs border rounded bg-white text-slate-800 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Transportadora / Operador Logístico</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Servientrega, DHL, FedEx"
                      value={poCarrier}
                      onChange={(e) => setPoCarrier(e.target.value)}
                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Condiciones de Entrega</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Entrega inmediata, FOB Cartagena"
                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-600">MATERIALES / INSUMOS A ADQUIRIR</span>
                    <button 
                      type="button" 
                      onClick={handleAddPoItemRow}
                      className="text-[10px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Fila
                    </button>
                  </div>

                  {poItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-2 flex flex-col gap-0.5">
                        <label className="text-[8px] font-bold text-slate-400">CÓDIGO</label>
                        <input 
                          type="text" 
                          placeholder="Ej: FR-BRM-10"
                          value={item.code}
                          onChange={(e) => handlePoItemChange(index, "code", e.target.value)}
                          className="p-1 text-xs border rounded bg-white text-slate-800"
                        />
                      </div>
                      <div className="md:col-span-5 flex flex-col gap-0.5">
                        <label className="text-[8px] font-bold text-slate-400">DESCRIPCIÓN DEL INSUMO</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Descripción detallada"
                          value={item.desc}
                          onChange={(e) => handlePoItemChange(index, "desc", e.target.value)}
                          className="p-1 text-xs border rounded bg-white text-slate-800 font-medium"
                        />
                      </div>
                      <div className="md:col-span-2 flex flex-col gap-0.5">
                        <label className="text-[8px] font-bold text-slate-400">CANT.</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          placeholder="1"
                          value={item.qty}
                          onChange={(e) => handlePoItemChange(index, "qty", parseInt(e.target.value, 10) || 1)}
                          className="p-1 text-xs border rounded bg-white text-slate-800"
                        />
                      </div>
                      <div className="md:col-span-2 flex flex-col gap-0.5">
                        <label className="text-[8px] font-bold text-slate-400">COSTO UNIT. (COP)</label>
                        <input 
                          type="number" 
                          required
                          placeholder="Ej: 100000"
                          value={item.cost || ""}
                          onChange={(e) => handlePoItemChange(index, "cost", parseFloat(e.target.value) || 0)}
                          className="p-1 text-xs border rounded bg-white text-slate-800"
                        />
                      </div>
                      <div className="md:col-span-1 py-1 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePoItemRow(index)}
                          disabled={poItems.length === 1}
                          className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-1 border-t pt-3">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase">NOTAS DE SUMINISTRO / INSTRUCCIONES</label>
                  <textarea 
                    placeholder="Escriba condiciones, penalidades por demora, requisitos de factura..."
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    className="p-1.5 text-xs border rounded bg-white text-slate-800 h-16 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => { setIsCreatingPO(false); resetPoForm(); }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-3.5 py-1.5 text-white text-xs font-bold rounded-lg transition-all ${brand.button}`}
                  >
                    Guardar y Emitir Orden de Compra
                  </button>
                </div>
              </form>
            )}

            {/* List of POs */}
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 border-b text-[10px] text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Ref O.C. / Cot Proveedor</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Proveedor / Gestor</th>
                    <th className="p-3">Insumos Solicitados</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-right">IVA (19%)</th>
                    <th className="p-3 text-right text-slate-900">Total O.C.</th>
                    <th className="p-3">Llegada Estimada / Transp</th>
                    <th className="p-3 text-center">Estatus</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {filteredPOs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400 font-medium">
                        No hay órdenes de compra emitidas para {companyName}. ¡Crea una nueva manual o procesa una por IA!
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map((po, poIdx) => {
                      if (editingPoId === po.id && editingPoData) {
                        return (
                          <tr key={`po-${po.id}-${poIdx}`} className="bg-emerald-50/40 border-y-2 border-emerald-200">
                            <td colSpan={10} className="p-4">
                              <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center border-b border-emerald-100 pb-1.5">
                                  <span className="font-extrabold text-xs text-emerald-950 uppercase flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" /> Editor de Orden de Compra en Tiempo Real ({po.id})
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPurchaseOrders(prev => prev.map(p => p.id === po.id ? editingPoData : p));
                                        setEditingPoId(null);
                                        setEditingPoData(null);
                                        alert("✓ Cambios de orden de compra guardados con éxito.");
                                      }}
                                      className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-extrabold hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
                                    >
                                      Guardar Cambios
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPoId(null);
                                        setEditingPoData(null);
                                      }}
                                      className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-all cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Proveedor / Beneficiario</label>
                                    <input
                                      type="text"
                                      value={editingPoData.supplier}
                                      onChange={(e) => setEditingPoData({ ...editingPoData, supplier: e.target.value })}
                                      className="p-1.5 text-xs border rounded bg-white text-slate-800 font-semibold"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Referencia de Cotización Proveedor</label>
                                    <input
                                      type="text"
                                      value={editingPoData.quoteReference || ""}
                                      onChange={(e) => setEditingPoData({ ...editingPoData, quoteReference: e.target.value })}
                                      placeholder="Ej: ODC-WPC-0001"
                                      className="p-1.5 text-xs border rounded bg-white text-slate-800 font-mono font-bold"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Fecha Cotización Proveedor</label>
                                    <input
                                      type="date"
                                      value={editingPoData.quoteDate || ""}
                                      onChange={(e) => setEditingPoData({ ...editingPoData, quoteDate: e.target.value })}
                                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Responsable de Gestión</label>
                                    <input
                                      type="text"
                                      value={editingPoData.responsiblePerson || ""}
                                      onChange={(e) => setEditingPoData({ ...editingPoData, responsiblePerson: e.target.value })}
                                      placeholder="Nombre del gestor de compras"
                                      className="p-1.5 text-xs border rounded bg-white text-slate-800 font-semibold"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Notas de Suministro / Instrucciones</label>
                                    <input
                                      type="text"
                                      value={editingPoData.notes || ""}
                                      onChange={(e) => setEditingPoData({ ...editingPoData, notes: e.target.value })}
                                      placeholder="Plazos, penalidades, garantías..."
                                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">Transportadora</label>
                                    <input
                                      type="text"
                                      value={editingPoData.carrier || ""}
                                      onChange={(e) => setEditingPoData({ ...editingPoData, carrier: e.target.value })}
                                      placeholder="Servientrega, DHL, FedEx..."
                                      className="p-1.5 text-xs border rounded bg-white text-slate-800"
                                    />
                                  </div>
                                </div>

                                <div className="border-t border-slate-200/60 pt-2.5 mt-1.5">
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Desglose de Ítems & Costos de Adquisición (IVA 19% Incluido)</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedItems = [...editingPoData.items, { code: "ITEM", description: "Nuevo Insumo", quantity: 1, unitCost: 0, total: 0 }];
                                        setEditingPoData({ ...editingPoData, items: updatedItems });
                                      }}
                                      className="text-[10px] text-emerald-700 font-extrabold hover:underline"
                                    >
                                      + Agregar Ítem de Compra
                                    </button>
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    {editingPoData.items.map((it, idx) => (
                                      <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                                        <input
                                          type="text"
                                          value={it.description}
                                          onChange={(e) => {
                                            const updated = [...editingPoData.items];
                                            updated[idx].description = e.target.value;
                                            setEditingPoData({ ...editingPoData, items: updated });
                                          }}
                                          className="col-span-6 p-1 text-[11px] border rounded bg-white font-medium text-slate-800"
                                          placeholder="Descripción del material"
                                        />
                                        <input
                                          type="number"
                                          value={it.quantity}
                                          onChange={(e) => {
                                            const qty = parseInt(e.target.value) || 1;
                                            const updated = [...editingPoData.items];
                                            updated[idx].quantity = qty;
                                            updated[idx].total = qty * (updated[idx].unitCost || 0);
                                            
                                            const subtotal = updated.reduce((sum, item) => sum + item.total, 0);
                                            const tax = Math.round(subtotal * 0.19);
                                            setEditingPoData({
                                              ...editingPoData,
                                              items: updated,
                                              subtotal,
                                              taxAmount: tax,
                                              total: subtotal + tax
                                            });
                                          }}
                                          className="col-span-2 p-1 text-[11px] border rounded bg-white text-center text-slate-800"
                                          placeholder="Cant"
                                        />
                                        <input
                                          type="number"
                                          value={it.unitCost || 0}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const updated = [...editingPoData.items];
                                            updated[idx].unitCost = val;
                                            updated[idx].total = updated[idx].quantity * val;

                                            const subtotal = updated.reduce((sum, item) => sum + item.total, 0);
                                            const tax = Math.round(subtotal * 0.19);
                                            setEditingPoData({
                                              ...editingPoData,
                                              items: updated,
                                              subtotal,
                                              taxAmount: tax,
                                              total: subtotal + tax
                                            });
                                          }}
                                          className="col-span-3 p-1 text-[11px] border rounded bg-white text-right font-mono text-slate-800 font-bold"
                                          placeholder="Costo COP"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = editingPoData.items.filter((_, i) => i !== idx);
                                            const subtotal = updated.reduce((sum, item) => sum + item.total, 0);
                                            const tax = Math.round(subtotal * 0.19);
                                            setEditingPoData({
                                              ...editingPoData,
                                              items: updated,
                                              subtotal,
                                              taxAmount: tax,
                                              total: subtotal + tax
                                            });
                                          }}
                                          className="col-span-1 text-red-500 hover:text-red-700 font-extrabold text-center text-xs"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex justify-end gap-5 mt-2.5 border-t border-slate-200/60 pt-2 text-[11px] font-mono text-slate-600 bg-white p-2 rounded-lg">
                                  <span>Subtotal: <strong className="text-slate-800">{formatCOP(editingPoData.subtotal || editingPoData.total - (editingPoData.taxAmount || 0))}</strong></span>
                                  <span>IVA (19%): <strong className="text-rose-600">{formatCOP(editingPoData.taxAmount || Math.round(editingPoData.total * 0.19))}</strong></span>
                                  <span className="text-slate-900 font-bold">Total O.C.: <strong className="text-slate-900">{formatCOP(editingPoData.total)}</strong></span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const itemsSub = po.items.reduce((sum, i) => sum + i.total, 0);
                      const calculatedSub = po.subtotal ?? itemsSub;
                      const calculatedTax = po.taxAmount ?? Math.round(calculatedSub * 0.19);
                      const displayTotal = po.subtotal !== undefined && po.taxAmount !== undefined
                        ? po.total
                        : (calculatedSub + calculatedTax);

                      return (
                        <tr key={`po-${po.id}-${poIdx}`} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="font-mono font-bold text-slate-900">{po.id}</div>
                            {po.quoteReference && (
                              <div className="text-[9px] bg-slate-100 text-slate-500 font-mono font-bold rounded px-1 py-0.5 mt-0.5 inline-block">
                                Ref Proveedor: {po.quoteReference}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="whitespace-nowrap">{po.date}</div>
                            {po.quoteDate && (
                              <div className="text-[9px] text-slate-400">Orig: {po.quoteDate}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{po.supplier}</div>
                            {po.responsiblePerson && (
                              <div className="text-[10px] text-indigo-600 font-bold mt-0.5">Responsable: {po.responsiblePerson}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="max-w-md font-medium text-slate-800 space-y-1">
                              {po.items.map((it, idx) => (
                                <div key={idx} className="leading-snug break-words">
                                  <span className="font-bold text-slate-900">{it.quantity}x</span> {it.description}
                                </div>
                              ))}
                            </div>
                            {po.notes && (
                              <div className="text-[9px] text-slate-400 italic max-w-md mt-1 break-words">"{po.notes}"</div>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-700">{formatCOP(calculatedSub)}</td>
                          <td className="p-3 text-right font-mono text-rose-600 font-bold">{formatCOP(calculatedTax)}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCOP(displayTotal)}</td>
                          <td className="p-3">
                            <div className="whitespace-nowrap text-slate-800 font-medium">{po.etaDate || "N/A"}</div>
                            {po.carrier && (
                              <div className="text-[9px] text-slate-400">Transp: {po.carrier}</div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              po.status === "RECIBIDO"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {po.status}
                            </span>
                            {po.status !== "RECIBIDO" && po.status !== "CANCELADO" && (
                              <button
                                onClick={() => handleMarkPOReceived(po)}
                                className="mt-1 block mx-auto text-[9px] font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                                title="Marcar como recibida y contabilizar la compra"
                              >
                                Marcar Recibida
                              </button>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleGeneratePOPDF(po)}
                                className="p-1 hover:bg-rose-50 rounded text-rose-600 transition-all cursor-pointer"
                                title="Descargar Orden de Compra PDF (Formato Oficial)"
                              >
                                <FileCheck className="w-4 h-4" />
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  setEditingPoId(po.id);
                                  setEditingPoData(JSON.parse(JSON.stringify(po)));
                                }}
                                className="p-1 hover:bg-indigo-50 rounded text-indigo-600 transition-all cursor-pointer"
                                title="Editar Orden de Compra en Tiempo Real"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: APRENDIZAJE IA DE COTIZACIONES */}
        {activeSubTab === "APRENDIZAJE" && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center gap-2 border-b pb-3">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Brain className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Base IA de Aprendizaje de Cotizaciones y Costeo</h3>
                <p className="text-[10px] text-slate-400">Modelos predictivos entrenados dinámicamente de acuerdo a las cotizaciones históricas del holding</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Contexto del Holding</span>
                <span className="text-sm font-bold text-slate-800">Cruce de Bases de Datos</span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Las bases de datos están segregadas para garantizar que WPC, Fundación, Raez y Helenamar operen independientemente. La IA aprende de cada una para simular escenarios de costeo autónomo.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Algoritmo de Viabilidad</span>
                <span className="text-sm font-bold text-slate-800">Rentabilidad & Imprevistos</span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Basado en las cotizaciones anteriores cargadas, la IA calcula variaciones de precios de materias primas y mano de obra para advertir sobre posibles pérdidas o costos ocultos de ejecución.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Auto-Entrenamiento</span>
                <span className="text-sm font-bold text-slate-800">Tiempo de Entrega (E.T.A)</span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  El sistema extrae el tiempo estimado de ejecución de servicios previos y ajusta el cronograma de capacidad de los operarios mecánicos (Raez) o disponibilidad de bienes (Helenamar).
                </p>
              </div>
            </div>

            {/* List of Insights Learned */}
            <div className="border rounded-xl overflow-hidden mt-2">
              <div className="bg-slate-50 border-b p-3 text-[10px] font-extrabold text-slate-500 uppercase">
                Lecciones Aprendidas por IA desde Cotizaciones de {companyId}
              </div>
              <div className="divide-y divide-slate-100 bg-white">
                {filteredLearning.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                    No se han registrado aprendizajes aún. Sube archivos de cotizaciones previas en el tab "Cotizaciones de Venta" para comenzar a entrenar el modelo.
                  </div>
                ) : (
                  filteredLearning.map((learn, learnIdx) => (
                    <div key={`learn-${learn.id || learnIdx}-${learnIdx}`} className="p-4 flex flex-col gap-3 hover:bg-slate-50/30 transition-all">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1 bg-purple-50 text-purple-600 rounded text-[9px] font-mono font-bold">{learn.id}</span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">{learn.extractedTitle}</h4>
                            <p className="text-[9px] text-slate-400">Origen: {learn.fileName} | Cliente: {learn.customerName}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="text-slate-500">Valor Cotizado: <strong className="text-slate-800 font-mono">{formatCOP(learn.valueQuoted)}</strong></span>
                          <span className="text-slate-500">Plazo Estimado: <strong className="text-slate-800">{cleanTime(learn.timeEstimated)}</strong></span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t pt-2.5 text-[10px]">
                        <div className="flex flex-col gap-1 bg-sky-50/40 p-2.5 border border-sky-100/50 rounded-lg">
                          <span className="font-extrabold text-sky-800 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> ANÁLISIS DE UTILIDAD Y VIABILIDAD
                          </span>
                          <p className="text-slate-600 leading-relaxed">{learn.profitabilityAnalysis}</p>
                        </div>

                        <div className="flex flex-col gap-1 bg-amber-50/40 p-2.5 border border-amber-100/50 rounded-lg">
                          <span className="font-extrabold text-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> CONTROL DE SOBRECOSTOS Y RIESGOS
                          </span>
                          <p className="text-slate-600 leading-relaxed">{learn.overcosts}</p>
                        </div>

                        <div className="flex flex-col gap-1 bg-indigo-50/40 p-2.5 border border-indigo-100/50 rounded-lg">
                          <span className="font-extrabold text-indigo-800 flex items-center gap-1">
                            <Brain className="w-3.5 h-3.5 animate-pulse" /> ESTIMACIÓN DE IMPREVISTOS
                          </span>
                          <p className="text-slate-600 leading-relaxed">{learn.imprevistos}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// Clean extracted strings
function cleanTime(val: any) {
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}
