import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { WENDY_LEGAL_INFO } from "../assets/wendySignatureData";
import WendySignatureBlock from "./WendySignatureBlock";
import { FundacionProgram, Donation, Estimate, PurchaseOrder } from "../types";
import { 
  Heart, 
  Plus, 
  Target, 
  TrendingDown, 
  DollarSign, 
  FileCheck, 
  HelpCircle, 
  AlertTriangle, 
  Building,
  ArrowRight,
  Calculator,
  Award,
  Sparkles,
  ShoppingBag
} from "lucide-react";
import CommercialProcurementHub from "./CommercialProcurementHub";

interface SheMakerFoundationPanelProps {
  programs: FundacionProgram[];
  setPrograms: React.Dispatch<React.SetStateAction<FundacionProgram[]>>;
  donations: Donation[];
  setDonations: React.Dispatch<React.SetStateAction<Donation[]>>;
  commercialProfits: {
    WPC: number;
    RAEZ: number;
    HELENAMAR: number;
  };
  onAddTransaction: (tx: any) => void;
  estimates: Estimate[];
  setEstimates: React.Dispatch<React.SetStateAction<Estimate[]>>;
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
}

export default function SheMakerFoundationPanel({
  programs,
  setPrograms,
  donations,
  setDonations,
  commercialProfits,
  onAddTransaction,
  estimates,
  setEstimates,
  purchaseOrders,
  setPurchaseOrders
}: SheMakerFoundationPanelProps) {
  const [activeInternalTab, setActiveInternalTab] = useState<"PROGRAMAS" | "COMMERCIAL">("PROGRAMAS");
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);
  const [isAddingDonation, setIsAddingDonation] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // New program state
  const [progName, setProgName] = useState("");
  const [progObjective, setProgObjective] = useState("");
  const [progTargetBeneficiaries, setProgTargetBeneficiaries] = useState("");
  const [progBudget, setProgBudget] = useState("");

  // New Donation state
  const [donCompany, setDonCompany] = useState<"WPC" | "RAEZ" | "HELENAMAR">("WPC");
  const [donAmount, setDonAmount] = useState("");

  // New program expense state
  const [targetProgId, setTargetProgId] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Kits de Electrónica");

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Add new program
  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progName || !progObjective || !progBudget) return;

    const newProg: FundacionProgram = {
      id: `PROG-${Date.now()}`,
      name: progName,
      objective: progObjective,
      status: "PLANIFICACION",
      targetBeneficiaries: parseInt(progTargetBeneficiaries, 10) || 100,
      currentBeneficiaries: 0,
      budgetAllocated: parseFloat(progBudget),
      currentExpenses: 0,
      associatedExpenses: []
    };

    setPrograms(prev => [newProg, ...prev]);

    setProgName("");
    setProgObjective("");
    setProgTargetBeneficiaries("");
    setProgBudget("");
    setIsCreatingProgram(false);
    alert(`✓ Programa social '${newProg.name}' creado y listo para ejecución.`);
  };

  // Track program expense
  const handleAddProgramExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProgId || !expAmount || !expDesc) return;

    const amountValue = parseFloat(expAmount);

    setPrograms(prev => prev.map(p => {
      if (p.id !== targetProgId) return p;

      const newExpense = {
        id: `EXP-FSM-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        description: expDesc,
        amount: amountValue,
        category: expCategory
      };

      return {
        ...p,
        currentExpenses: p.currentExpenses + amountValue,
        associatedExpenses: [newExpense, ...p.associatedExpenses]
      };
    }));

    // FINANCIAL: post gasto in Fundación accounts (PUC 519595 against 111005)
    onAddTransaction({
      type: "GASTO",
      amount: amountValue,
      customerSupplier: "Proveedor de Fundación",
      description: `Egreso asociado a programa social: ${expDesc}`,
      category: "Gasto Social Fundación",
      status: "CONTABILIZADO",
      account: "519595 - Gastos Sociales y Programas de Beneficencia - Fundación",
      companyId: "FUNDACION"
    });

    setExpAmount("");
    setExpDesc("");
    setIsAddingExpense(false);
    alert("✓ Gasto de programa registrado contablemente en la Fundación.");
  };

  // Register sister company donation (Tax Optimizer link)
  const handleRegisterDonation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donAmount) return;

    const amountValue = parseFloat(donAmount);
    if (isNaN(amountValue) || amountValue <= 0) return;

    const receiptNumber = `CERT-DON-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Art 257 ET: la donación NO es un gasto deducible. Genera un DESCUENTO
    // del 25% sobre el impuesto de renta, LIMITADO al 30% de la renta líquida.
    const rentaLiquida = Math.max(0, commercialProfits[donCompany]);
    const maxDonationByLaw = rentaLiquida * 0.30;
    const discountBase = Math.min(amountValue, maxDonationByLaw);
    const taxDiscount = discountBase * 0.25;

    const newDonation: Donation = {
      id: `DON-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      fromCompanyId: donCompany,
      amount: amountValue,
      legalReceiptNumber: receiptNumber,
      taxDiscountValue: taxDiscount
    };

    setDonations(prev => [newDonation, ...prev]);

    // La donación se registra como INGRESO de la Fundación (RECAUDO).
    // Ya NO se contabiliza como GASTO en la empresa donante (evita el doble beneficio).
    onAddTransaction({
      type: "RECAUDO",
      amount: amountValue,
      customerSupplier: donCompany === "WPC" ? "World Parts Company S.A.S." : donCompany === "RAEZ" ? "Raez Ingeniería S.A.S." : "Helenamar Turismo",
      description: `Donación certificada para programas sociales (${receiptNumber})`,
      category: "Donaciones Recibidas",
      status: "CONTABILIZADO",
      account: "480505 - Donaciones Recibidas - Fundación She Maker",
      companyId: "FUNDACION"
    });

    setDonAmount("");
    setIsAddingDonation(false);

    if (amountValue > maxDonationByLaw && maxDonationByLaw > 0) {
      alert(`✓ Donación de ${formatCOP(amountValue)} registrada. ⚠ El descuento tributario aplica hasta el tope legal del 30% de la renta líquida (${formatCOP(maxDonationByLaw)}). El excedente no genera descuento.`);
    } else {
      alert(`✓ Donación de ${donCompany} a Fundación registrada por ${formatCOP(amountValue)}. Descuento tributario: ${formatCOP(taxDiscount)} (25% Art 257 E.T., con tope del 30% de la renta líquida).`);
    }
  };

  // Download official donation certificate signed by Wendy Colpas Fernández
  const handleDownloadCertificatePDF = (don: Donation) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const companyName = don.fromCompanyId === "WPC" ? "WORLD PARTS COMPANY S.A.S. (NIT 901.341.558-1)" :
                        don.fromCompanyId === "RAEZ" ? "RAEZ INGENIERÍA S.A.S. (NIT 901.214.568-1)" :
                        "HELENAMAR TURISMO E INMOBILIARIA (NIT 900.564.123-7)";

    // Header bar
    doc.setFillColor(219, 39, 119);
    doc.rect(0, 0, 210, 18, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("FUNDACIÓN SHE MAKER - ESAL NIT 901.837.241-9", 105, 12, { align: "center" });

    // Certificate Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text("CERTIFICADO OFICIAL DE DONACIÓN Y DESCUENTO TRIBUTARIO", 105, 36, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Estatuto Tributario Colombia - Artículo 257 (Descuento Tributario del 25%)", 105, 43, { align: "center" });
    doc.text(`Certificado N°: ${don.legalReceiptNumber} | Fecha de Emisión: ${don.date}`, 105, 49, { align: "center" });

    // Decorative line
    doc.setDrawColor(236, 72, 153);
    doc.setLineWidth(0.8);
    doc.line(20, 54, 190, 54);

    // Body text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);

    const bodyParagraph1 = "La FUNDACIÓN SHE MAKER, entidad sin ánimo de lucro perteneciente al Régimen Tributario Especial (RTE), por medio de la presente CERTIFICA que ha recibido en calidad de donación irrevocable el siguiente valor:";
    const splitP1 = doc.splitTextToSize(bodyParagraph1, 170);
    doc.text(splitP1, 20, 68);

    // Amount Box
    doc.setFillColor(253, 242, 248);
    doc.setDrawColor(244, 114, 182);
    doc.roundedRect(20, 82, 170, 24, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(190, 24, 93);
    doc.text(formatCOP(don.amount), 105, 93, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(131, 24, 67);
    doc.text(`DESCUENTO TRIBUTARIO DIRECTO EN IMPUESTO DE RENTA (25%): ${formatCOP(don.taxDiscountValue)}`, 105, 101, { align: "center" });

    // Donor info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text("Entidad Aportante / Donante:", 20, 118);

    doc.setFont("helvetica", "bold");
    doc.text(companyName, 20, 124);

    const bodyParagraph2 = "Los recursos recibidos han sido destinados exclusivamente al desarrollo de los programas sociales y educativos de la Fundación She Maker en beneficio de jóvenes y mujeres en condiciones de vulnerabilidad, en estricto cumplimiento del Artículo 257 del Estatuto Tributario.";
    const splitP2 = doc.splitTextToSize(bodyParagraph2, 170);
    doc.text(splitP2, 20, 136);

    // Signature Block
    const sigY = 190;
    try {
      doc.addImage(WENDY_LEGAL_INFO.signatureImg, "JPEG", 80, sigY - 18, 50, 18);
    } catch (e) {
      console.warn("Signature img load warn", e);
    }

    doc.setDrawColor(15, 23, 42);
    doc.line(65, sigY + 2, 145, sigY + 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("WENDY COLPAS FERNÁNDEZ", 105, sigY + 8, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("C.C. No. 1.143.374.671 de Barranquilla", 105, sigY + 13, { align: "center" });
    doc.text("Representante Legal & Directora Administrativa", 105, sigY + 18, { align: "center" });
    doc.text("Fundación She Maker / Matriz Maker Holding", 105, sigY + 23, { align: "center" });

    doc.save(`Certificado_Donacion_${don.legalReceiptNumber}.pdf`);
  };

  // Deduct/Add beneficiaries
  const handleIncrementBeneficiaries = (progId: string) => {
    const qty = prompt("¿Cuántas beneficiarias se graduaron o ingresaron hoy?:");
    if (!qty) return;
    const num = parseInt(qty, 10);
    if (isNaN(num)) return;

    setPrograms(prev => prev.map(p => p.id === progId ? {
      ...p,
      currentBeneficiaries: p.currentBeneficiaries + num,
      status: p.currentBeneficiaries + num >= p.targetBeneficiaries ? "COMPLETADO" : "EN_DESARROLLO"
    } : p));
  };

  // Colombia Tax optimization analysis values
  const totalDonated = donations.reduce((acc, d) => acc + d.amount, 0);
  const totalTaxCredit = donations.reduce((acc, d) => acc + d.taxDiscountValue, 0);

  // Suggested donation calculations: WPC, Raez, Helenamar
  // Companies can donate up to 25% of their total computed net tax or optimize based on legal benefit.
  // Generally, a robust recommendation is to donate about 10% of profit to optimize tax + ESG budget.
  const wpcSuggested = Math.max(0, commercialProfits.WPC * 0.10);
  const raezSuggested = Math.max(0, commercialProfits.RAEZ * 0.10);
  const helenamarSuggested = Math.max(0, commercialProfits.HELENAMAR * 0.10);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col gap-6" id="shemaker-foundation-container">
      {/* Sub-tabs switch */}
      <div className="flex border-b border-slate-100 pb-2">
        <button
          onClick={() => setActiveInternalTab("PROGRAMAS")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeInternalTab === "PROGRAMAS"
              ? "border-pink-600 text-pink-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Heart className="w-4 h-4" /> Programas y Donaciones
        </button>
        <button
          onClick={() => setActiveInternalTab("COMMERCIAL")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeInternalTab === "COMMERCIAL"
              ? "border-pink-600 text-pink-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Cotizaciones y Compras de Fundación (IA)
        </button>
      </div>

      {activeInternalTab === "COMMERCIAL" ? (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <CommercialProcurementHub
            companyId="FUNDACION"
            companyName="Fundación She Maker"
            estimates={estimates}
            setEstimates={setEstimates}
            purchaseOrders={purchaseOrders}
            setPurchaseOrders={setPurchaseOrders}
            onAddTransaction={onAddTransaction}
          />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-pink-50 text-pink-600 rounded-lg">
              <Heart className="w-5 h-5 fill-pink-500 text-pink-500" />
            </span>
            <h2 className="text-xl font-bold text-slate-800">
              Módulo de Programas y Donaciones (Fundación She Maker)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fundación She Maker - NIT: 901.837.241-9 | Seguimiento de programas sociales educativos para mujeres jóvenes, control de gastos asociados y optimizador de carga impositiva.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreatingProgram(!isCreatingProgram)}
            className="flex items-center gap-1.5 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white px-3.5 py-2 rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" /> Crear Programa Social
          </button>
          
          <button
            onClick={() => setIsAddingExpense(!isAddingExpense)}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border px-3 py-2 rounded-lg transition-all"
          >
            <TrendingDown className="w-4 h-4 text-red-500" /> Reportar Gasto de Programa
          </button>

          <button
            onClick={() => setIsAddingDonation(!isAddingDonation)}
            className="flex items-center gap-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg transition-all"
            title="Registrar una donación de las empresas del holding para obtener descuentos tributarios"
          >
            <Calculator className="w-4 h-4 text-indigo-600" /> Inyectar Donación
          </button>
        </div>
      </div>

      {/* Tax Optimizer Widget */}
      <div className="p-5 bg-gradient-to-r from-indigo-50 to-pink-50 rounded-2xl border border-indigo-100 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-extrabold text-indigo-950 uppercase tracking-wide">
            Optimizador de Carga Impositiva del Holding (Art. 257 E.T. Colombia)
          </h3>
        </div>

        <p className="text-xs text-slate-600 leading-normal">
          Bajo el estatuto tributario colombiano, las donaciones a ESALs calificadas como la Fundación She Maker otorgan un <strong>descuento tributario directo del 25% de la donación</strong> sobre el impuesto de renta de las empresas comerciales aportantes, disminuyendo drásticamente su carga impositiva anual.
        </p>

        {/* Dashboard Matrix Suggested */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
          {/* WPC */}
          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-3xs">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400">WORLD PARTS CO. (WPC)</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700">Importador</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Utilidad Estimada: <strong className="text-slate-800">{formatCOP(commercialProfits.WPC)}</strong></p>
            <div className="mt-2 pt-2 border-t flex justify-between items-center text-xs">
              <span className="text-indigo-600 font-semibold">Donación Recomendada:</span>
              <span className="font-bold font-mono text-slate-800">{formatCOP(wpcSuggested)}</span>
            </div>
            <p className="text-[9px] text-emerald-600 font-semibold mt-1">✓ Descuento Tributario Directo: {formatCOP(wpcSuggested * 0.25)}</p>
          </div>

          {/* RAEZ */}
          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-3xs">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400">RAEZ INGENIERÍA</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700">Servicios</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Utilidad Estimada: <strong className="text-slate-800">{formatCOP(commercialProfits.RAEZ)}</strong></p>
            <div className="mt-2 pt-2 border-t flex justify-between items-center text-xs">
              <span className="text-indigo-600 font-semibold">Donación Recomendada:</span>
              <span className="font-bold font-mono text-slate-800">{formatCOP(raezSuggested)}</span>
            </div>
            <p className="text-[9px] text-emerald-600 font-semibold mt-1">✓ Descuento Tributario Directo: {formatCOP(raezSuggested * 0.25)}</p>
          </div>

          {/* HELENAMAR */}
          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-3xs">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400">HELENAMAR INMOBILIARIA</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700">Inmuebles</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Utilidad Estimada: <strong className="text-slate-800">{formatCOP(commercialProfits.HELENAMAR)}</strong></p>
            <div className="mt-2 pt-2 border-t flex justify-between items-center text-xs">
              <span className="text-indigo-600 font-semibold">Donación Recomendada:</span>
              <span className="font-bold font-mono text-slate-800">{formatCOP(helenamarSuggested)}</span>
            </div>
            <p className="text-[9px] text-emerald-600 font-semibold mt-1">✓ Descuento Tributario Directo: {formatCOP(helenamarSuggested * 0.25)}</p>
          </div>
        </div>

        {/* Current status on donations */}
        <div className="bg-indigo-950 text-white rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 mt-2">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide">Total Recaudado en Donaciones de Filiales</p>
            <h4 className="text-xl md:text-2xl font-black font-mono mt-1 text-pink-400">{formatCOP(totalDonated)}</h4>
          </div>
          <div className="text-center md:text-right bg-indigo-900 px-4 py-2 rounded-lg border border-indigo-800">
            <p className="text-[10px] text-indigo-300 uppercase font-bold flex items-center gap-1 justify-center md:justify-end">
              <Award className="w-4 h-4 text-pink-400" /> Ahorro Fiscal Consolidado (Holding)
            </p>
            <h4 className="text-lg font-black font-mono text-emerald-400 mt-1">{formatCOP(totalTaxCredit)}</h4>
          </div>
        </div>
      </div>

      {/* Certificados Emitidos Firmados */}
      {donations.length > 0 && (
        <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-3xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-pink-600" /> Certificados Oficiales de Donación DIAN (Art. 257 E.T.)
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Certificados con firma digital respaldada por la Representante Legal Wendy Colpas Fernández
              </p>
            </div>
            <WendySignatureBlock variant="stamp" className="shrink-0" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="p-2.5">N° Certificado</th>
                  <th className="p-2.5">Fecha</th>
                  <th className="p-2.5">Empresa Donante</th>
                  <th className="p-2.5 text-right">Monto Donación</th>
                  <th className="p-2.5 text-right">Descuento Tributario (25%)</th>
                  <th className="p-2.5 text-center">Firma Representante Legal</th>
                  <th className="p-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {donations.map(don => (
                  <tr key={don.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 font-mono font-bold text-pink-700">{don.legalReceiptNumber}</td>
                    <td className="p-2.5 text-slate-500">{don.date}</td>
                    <td className="p-2.5 font-bold text-slate-800">
                      {don.fromCompanyId === "WPC" ? "World Parts Company S.A.S." : don.fromCompanyId === "RAEZ" ? "Raez Ingeniería S.A.S." : "Helenamar Turismo"}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCOP(don.amount)}</td>
                    <td className="p-2.5 text-right font-mono font-black text-emerald-600">{formatCOP(don.taxDiscountValue)}</td>
                    <td className="p-2.5 text-center">
                      <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                        <Award className="w-3 h-3 text-emerald-600" /> Wendy Colpas F.
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => handleDownloadCertificatePDF(don)}
                        className="px-2.5 py-1 text-[10px] bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-md shadow-3xs flex items-center gap-1 mx-auto transition-all cursor-pointer"
                        title="Descargar Certificado Oficial en PDF con la firma de la Representante Legal"
                      >
                        <FileCheck className="w-3 h-3" /> Descargar PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Forms Drawer */}
      <div className="flex flex-col gap-4">
        {/* Form Create Program */}
        {isCreatingProgram && (
          <form onSubmit={handleCreateProgram} className="p-4 bg-pink-50/50 border border-pink-100 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
            <h4 className="col-span-1 md:col-span-2 text-xs font-bold text-pink-900 uppercase">Diseñar Nuevo Programa Social</h4>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">NOMBRE DEL PROGRAMA</label>
              <input 
                type="text" 
                placeholder="Ej: She Maker Robotics Camp"
                value={progName}
                onChange={(e) => setProgName(e.target.value)}
                className="p-1.5 text-xs border rounded bg-white"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">PRESUPUESTO ASIGNADO (COP)</label>
              <input 
                type="number" 
                placeholder="Ej: 15000000"
                value={progBudget}
                onChange={(e) => setProgBudget(e.target.value)}
                className="p-1.5 text-xs border rounded bg-white"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">POBLACIÓN OBJETIVO (Graduandas / Beneficiarias)</label>
              <input 
                type="number" 
                placeholder="Ej: 50"
                value={progTargetBeneficiaries}
                onChange={(e) => setProgTargetBeneficiaries(e.target.value)}
                className="p-1.5 text-xs border rounded bg-white"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">OBJETIVO GENERAL DEL PROGRAMA</label>
              <input 
                type="text" 
                placeholder="Ej: Formación en micro-soldadura e impresión 3D..."
                value={progObjective}
                onChange={(e) => setProgObjective(e.target.value)}
                className="p-1.5 text-xs border rounded bg-white"
                required
              />
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-1">
              <button type="button" onClick={() => setIsCreatingProgram(false)} className="px-3 py-1 text-xs border bg-white rounded">Cancelar</button>
              <button type="submit" className="px-3 py-1 text-xs bg-pink-600 text-white font-bold rounded">Guardar Programa</button>
            </div>
          </form>
        )}

        {/* Form Donation */}
        {isAddingDonation && (
          <form onSubmit={handleRegisterDonation} className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 animate-fadeIn">
            <h4 className="col-span-1 md:col-span-3 text-xs font-bold text-indigo-950 uppercase border-b pb-1">Registrar Donación Inter-empresas (Art. 257 E.T.)</h4>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">EMPRESA DEL HOLDING DONANTE</label>
              <select 
                value={donCompany}
                onChange={(e) => setDonCompany(e.target.value as any)}
                className="p-1.5 text-xs border rounded bg-white text-slate-800"
              >
                <option value="WPC">World Parts Company (WPC S.A.S.)</option>
                <option value="RAEZ">Raez Ingeniería S.A.S.</option>
                <option value="HELENAMAR">Helenamar Inmobiliaria</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">MONTO DE LA DONACIÓN EN EFECTIVO (COP)</label>
              <input 
                type="number" 
                placeholder="Ej: 10000000"
                value={donAmount}
                onChange={(e) => setDonAmount(e.target.value)}
                className="p-1.5 text-xs border rounded bg-white"
                required
              />
            </div>

            <div className="flex flex-col gap-1 justify-end">
              <button type="submit" className="p-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded">
                Realizar e Interconectar Libros
              </button>
            </div>
          </form>
        )}

        {/* Form Expense */}
        {isAddingExpense && (
          <form onSubmit={handleAddProgramExpense} className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
            <h4 className="col-span-1 md:col-span-2 text-xs font-bold text-slate-700 uppercase border-b pb-1">Reportar Egreso Asociado a Programa Benéfico</h4>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">PROGRAMA DESTINO</label>
              <select 
                value={targetProgId}
                onChange={(e) => setTargetProgId(e.target.value)}
                className="p-1.5 text-xs border rounded bg-white text-slate-800"
                required
              >
                <option value="">-- Seleccionar programa --</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">CATEGORÍA DE GASTO</label>
              <select 
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="p-1.5 text-xs border rounded bg-white text-slate-700"
              >
                <option value="Kits de Electrónica">Kits de Electrónica (Arduino, Sensores)</option>
                <option value="Suscripciones Digitales">Licencias & Herramientas Web</option>
                <option value="Logística y Alimentación">Logística, Refrigerios, Auxilio</option>
                <option value="Honorarios Mentoras">Honorarios Profesores / Mentoras</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">DESCRIPCIÓN / CONCEPTO</label>
              <input 
                type="text" 
                placeholder="Ej: Compra de 50 placas Arduino Nano para el taller"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                className="p-1.5 text-xs border rounded bg-white"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500">VALOR COP (GASTO)</label>
              <input 
                type="number" 
                placeholder="Ej: 3200000"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="p-1.5 text-xs border rounded bg-white"
                required
              />
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-1">
              <button type="button" onClick={() => setIsAddingExpense(false)} className="px-3 py-1 text-xs border bg-white rounded">Cancelar</button>
              <button type="submit" className="px-3 py-1 text-xs bg-slate-700 text-white font-bold rounded">Procesar Egreso</button>
            </div>
          </form>
        )}
      </div>

      {/* Program Dashboard list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {programs.map(prog => {
          const completionPercent = Math.min(100, Math.round((prog.currentBeneficiaries / prog.targetBeneficiaries) * 100)) || 0;
          const budgetPercent = Math.min(100, Math.round((prog.currentExpenses / prog.budgetAllocated) * 100)) || 0;

          return (
            <div key={prog.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between gap-4">
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-pink-500" /> {prog.name}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${prog.status === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-pink-800'}`}>
                    {prog.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed italic">"{prog.objective}"</p>

                {/* Progress bars */}
                <div className="mt-4 flex flex-col gap-3">
                  {/* Beneficiaries Progress */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-1">
                      <span>Beneficiarias Capacitadas:</span>
                      <span className="text-pink-600">{prog.currentBeneficiaries} / {prog.targetBeneficiaries} ({completionPercent}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full" style={{ width: `${completionPercent}%` }} />
                    </div>
                  </div>

                  {/* Budget Spent Progress */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-1">
                      <span>Presupuesto Ejecutado:</span>
                      <span className="text-slate-700 font-mono">{formatCOP(prog.currentExpenses)} / {formatCOP(prog.budgetAllocated)} ({budgetPercent}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-700 rounded-full" style={{ width: `${budgetPercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons inside progress cards */}
              {prog.status !== "COMPLETADO" && (
                <div className="flex justify-end pt-2 border-t">
                  <button
                    onClick={() => handleIncrementBeneficiaries(prog.id)}
                    className="text-[10px] font-bold text-pink-600 hover:text-pink-800 bg-white border border-pink-200 px-2.5 py-1 rounded-md"
                  >
                    + Registrar Graduación
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
    )}
  </div>
  );
}
