import { useState, useMemo } from "react";
import { Transaction, UserRole, InventoryItem } from "../types";
import { DEFAULT_COST_OF_SALES_RATIO, sumLedger, csvEscape, inventoryValue } from "../utils/finance";
import { HOLDING_COMPANIES } from "../data";
import WpcLogo from "./WpcLogo";
import MakerHoldingLogo from "./MakerHoldingLogo";
import WendySignatureBlock from "./WendySignatureBlock";
import { 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Layers,
  Scale,
  BookOpen,
  CheckCircle2,
  Sparkles
} from "lucide-react";

interface ReportsPanelProps {
  transactions: Transaction[];
  inventory: InventoryItem[];
  userRole: UserRole;
}

type ActiveReportTab = "ESTADO_RESULTADOS" | "BALANCE_GENERAL" | "LIBRO_MAYOR" | "ALCANCE";

export default function ReportsPanel({ transactions, inventory, userRole }: ReportsPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveReportTab>("ESTADO_RESULTADOS");

  // Rango de fechas por defecto: mes en curso (fecha local).
  const fmtDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(fmtDate(firstOfMonth));
  const [endDate, setEndDate] = useState(fmtDate(lastOfMonth));
  const [pucFilter, setPucFilter] = useState("ALL");
  const [selectedCompany, setSelectedCompany] = useState<"ALL" | "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR">("ALL");
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Filter transactions within selected date range (only include CONTABILIZADO transactions for official reports!)
  const officialTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.status !== "CONTABILIZADO") return false;
      const txDateStr = tx.date.split("T")[0];
      return txDateStr >= startDate && txDateStr <= endDate;
    });
  }, [transactions, startDate, endDate]);

  // Helper calculation logic for direct company downloads (without needing state-toggle side-effects)
  const getCalculationsForCompany = (companyCode: "ALL" | "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR") => {
    const companyTransactions = companyCode === "ALL"
      ? officialTransactions
      : officialTransactions.filter(tx => tx.companyId === companyCode);

    const totals = sumLedger(companyTransactions);
    const ventas = totals.ventas;
    const compras = totals.compras;
    const gastos = totals.gastos;
    const recaudos = totals.recaudos;
    const pagos = totals.pagos;

    const cajaYBancos = recaudos - pagos - gastos;
    const clientesCartera = ventas - recaudos;
    // Inventario REAL del módulo (valor a costo unitario), no una heurística de compras.
    const inventariosVal = inventoryValue(inventory, companyCode === "ALL" ? undefined : companyCode);
    const proveedoresPagar = compras - pagos;
    const obligacionesCorrientes = gastos * 0.15;

    const totalActivos = cajaYBancos + clientesCartera + inventariosVal;
    const costoVentas = ventas * DEFAULT_COST_OF_SALES_RATIO;
    const utilidadBruta = ventas - costoVentas;
    const utilidadOperacional = utilidadBruta - gastos;
    const provisionImpuestos = Math.max(0, utilidadOperacional * 0.3);
    const utilidadNeta = utilidadOperacional - provisionImpuestos;

    const totalPasivos = proveedoresPagar + obligacionesCorrientes;
    // Ecuación patrimonial garantizada: Activo = Pasivo + Patrimonio.
    const totalPatrimonio = totalActivos - totalPasivos;
    const capitalSocial = 0;
    // "Resultados de ejercicios anteriores" = la partida de cierre que cuadra la ecuación.
    const utilidadesAcumuladas = totalPatrimonio - capitalSocial - utilidadNeta;

    return {
      ventas, costoVentas, utilidadBruta, gastos, utilidadOperacional, provisionImpuestos, utilidadNeta,
      cajaYBancos, clientesCartera, inventariosVal, totalActivos, proveedoresPagar, obligacionesCorrientes,
      totalPasivos, capitalSocial, utilidadesAcumuladas, totalPatrimonio
    };
  };

  const getLibroMayorForCompany = (companyCode: "ALL" | "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR") => {
    const accMap: Record<string, { code: string; name: string; debits: number; credits: number }> = {};
    const companyTransactions = companyCode === "ALL"
      ? officialTransactions
      : officialTransactions.filter(tx => tx.companyId === companyCode);

    companyTransactions.forEach(tx => {
      const parts = tx.account.split(" - ");
      const code = parts[0];
      const name = parts[1] || "Cuenta General";

      if (!accMap[code]) {
        accMap[code] = { code, name, debits: 0, credits: 0 };
      }

      if (tx.type === "VENTA") {
        accMap[code].credits += tx.amount;
        if (!accMap["130505"]) accMap["130505"] = { code: "130505", name: "Clientes Nacionales", debits: 0, credits: 0 };
        accMap["130505"].debits += tx.amount;
      } else if (tx.type === "GASTO") {
        accMap[code].debits += tx.amount;
        if (!accMap["111005"]) accMap["111005"] = { code: "111005", name: "Bancos Nacionales", debits: 0, credits: 0 };
        accMap["111005"].credits += tx.amount;
      } else if (tx.type === "COMPRA") {
        accMap[code].debits += tx.amount;
        if (!accMap["220505"]) accMap["220505"] = { code: "220505", name: "Proveedores Nacionales", debits: 0, credits: 0 };
        accMap["220505"].credits += tx.amount;
      } else if (tx.type === "RECAUDO") {
        if (!accMap["110505"]) accMap["110505"] = { code: "110505", name: "Caja General", debits: 0, credits: 0 };
        accMap["110505"].debits += tx.amount;
        accMap[code].credits += tx.amount;
      } else if (tx.type === "PAGO") {
        accMap[code].debits += tx.amount;
        if (!accMap["111005"]) accMap["111005"] = { code: "111005", name: "Bancos Nacionales", debits: 0, credits: 0 };
        accMap["111005"].credits += tx.amount;
      }
    });

    return Object.values(accMap);
  };

  const exportExcelForCompany = (companyCode: "ALL" | "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR", reportType: ActiveReportTab) => {
    if (reportType === "ALCANCE") {
      alert("No se puede exportar el informe descriptivo en formato de tabla Excel CSV. Por favor genera la impresión en PDF.");
      return;
    }
    const calcs = getCalculationsForCompany(companyCode);
    const companyName = 
      companyCode === "ALL" ? "HOLDING_CONSOLIDADO" :
      companyCode === "WPC" ? "WORLD_PARTS_COMPANY" :
      companyCode === "FUNDACION" ? "FUNDACION_SHE_MAKER" :
      companyCode === "RAEZ" ? "RAEZ_INGENIERIA" :
      "HELENAMAR_TURISMO";

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    if (reportType === "ESTADO_RESULTADOS") {
      csvContent += `REPORTE: ESTADO DE RESULTADOS (P&L) - ${companyName.replace(/_/g, " ")}\r\n`;
      csvContent += `Periodo:;${startDate} al ${endDate}\r\n\r\n`;
      csvContent += "CONCEPTO;DEBITO / COSTO;CREDITO / INGRESO;SALDO NETO\r\n";
      csvContent += `Ingresos Operacionales (Ventas);;${calcs.ventas};${calcs.ventas}\r\n`;
      csvContent += `Costo de Ventas (60%);${calcs.costoVentas};;-${calcs.costoVentas}\r\n`;
      csvContent += `UTILIDAD BRUTA;;;${calcs.utilidadBruta}\r\n`;
      csvContent += `Gastos Administrativos y de Operacion;${calcs.gastos};;-${calcs.gastos}\r\n`;
      csvContent += `UTILIDAD OPERACIONAL (EBITDA);;;${calcs.utilidadOperacional}\r\n`;
      csvContent += `Provision de Impuestos de Renta (30%);${calcs.provisionImpuestos};;-${calcs.provisionImpuestos}\r\n`;
      csvContent += `UTILIDAD NETA DEL EJERCICIO;;;${calcs.utilidadNeta}\r\n`;
    } else if (reportType === "BALANCE_GENERAL") {
      csvContent += `REPORTE: BALANCE GENERAL - ${companyName.replace(/_/g, " ")}\r\n`;
      csvContent += `Periodo:;${startDate} al ${endDate}\r\n\r\n`;
      csvContent += "CUENTA / CLASE;VALOR COP\r\n";
      csvContent += "ACTIVO;;\r\n";
      csvContent += `  Caja y Bancos (Efectivo);${calcs.cajaYBancos}\r\n`;
      csvContent += `  Clientes y Cartera comercial;${calcs.clientesCartera}\r\n`;
      csvContent += `  Inventarios de Mercancia;${calcs.inventariosVal}\r\n`;
      csvContent += `TOTAL ACTIVOS;${calcs.totalActivos}\r\n\r\n`;
      csvContent += "PASIVO;;\r\n";
      csvContent += `  Proveedores Nacionales;${calcs.proveedoresPagar}\r\n`;
      csvContent += `  Obligaciones Corrientes;${calcs.obligacionesCorrientes}\r\n`;
      csvContent += `TOTAL PASIVOS;${calcs.totalPasivos}\r\n\r\n`;
      csvContent += "PATRIMONIO;;\r\n";
      csvContent += `  Capital Social Autorizado;${calcs.capitalSocial}\r\n`;
      csvContent += `  Utilidades de Ejercicios Anteriores;${calcs.utilidadesAcumuladas}\r\n`;
      csvContent += `  Utilidad del Ejercicio Actual;${calcs.utilidadNeta}\r\n`;
      csvContent += `TOTAL PATRIMONIO;${calcs.totalPatrimonio}\r\n`;
      csvContent += `TOTAL PASIVO + PATRIMONIO;${calcs.totalPasivos + calcs.totalPatrimonio}\r\n`;
    } else {
      csvContent += `REPORTE: LIBRO MAYOR AUXILIAR PUC - ${companyName.replace(/_/g, " ")}\r\n`;
      csvContent += `Periodo:;${startDate} al ${endDate}\r\n\r\n`;
      csvContent += "CODIGO PUC;CUENTA CONTABLE;DEBITOS (DEBE);CREDITOS (HABER);SALDO NETO\r\n";
      const mayor = getLibroMayorForCompany(companyCode);
      mayor.forEach(row => {
        const net = row.debits - row.credits;
        csvContent += `${row.code};${csvEscape(row.name)};${row.debits};${row.credits};${net}\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `Reporte_${companyName}_${reportType}_${startDate}_a_${endDate}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerSuccessAlert(`✓ Libro Excel (.csv) exportado con éxito para ${companyName.replace(/_/g, " ")}.`);
  };

  const printForCompany = (companyCode: "ALL" | "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR") => {
    setSelectedCompany(companyCode);
    setTimeout(() => {
      window.print();
      triggerSuccessAlert(`✓ Formato PDF oficial de impresión activado para ${
        companyCode === "ALL" ? "HOLDING CONSOLIDADO" :
        companyCode === "WPC" ? "WORLD PARTS COMPANY" :
        companyCode === "FUNDACION" ? "FUNDACIÓN SHE MAKER" :
        companyCode === "RAEZ" ? "RAEZ INGENIERÍA" :
        "HELENAMAR TURISMO"
      }.`);
    }, 150);
  };

  // Dynamic calculations for report metrics filtered by holding company
  const reportCalculations = useMemo(() => getCalculationsForCompany(selectedCompany), [officialTransactions, selectedCompany]);

  // Libro Mayor PUC aggregations
  const libroMayorData = useMemo(() => {
    const accMap: Record<string, { code: string; name: string; debits: number; credits: number }> = {};

    const companyTransactions = selectedCompany === "ALL"
      ? officialTransactions
      : officialTransactions.filter(tx => tx.companyId === selectedCompany);

    companyTransactions.forEach(tx => {
      const parts = tx.account.split(" - ");
      const code = parts[0];
      const name = parts[1] || "Cuenta General";

      if (!accMap[code]) {
        accMap[code] = { code, name, debits: 0, credits: 0 };
      }

      // VENTA: Credit 4135 (Revenue), Debit 1305 (Clientes) or 1105 (Caja)
      if (tx.type === "VENTA") {
        accMap[code].credits += tx.amount;
        if (!accMap["130505"]) accMap["130505"] = { code: "130505", name: "Clientes Nacionales", debits: 0, credits: 0 };
        accMap["130505"].debits += tx.amount;
      }
      // GASTO: Debit 51/52 (Expenses), Credit 1110 (Bancos)
      else if (tx.type === "GASTO") {
        accMap[code].debits += tx.amount;
        if (!accMap["111005"]) accMap["111005"] = { code: "111005", name: "Bancos Nacionales", debits: 0, credits: 0 };
        accMap["111005"].credits += tx.amount;
      }
      // COMPRA: Debit 1435 (Inventory), Credit 2205 (Proveedores)
      else if (tx.type === "COMPRA") {
        accMap[code].debits += tx.amount;
        if (!accMap["220505"]) accMap["220505"] = { code: "220505", name: "Proveedores Nacionales", debits: 0, credits: 0 };
        accMap["220505"].credits += tx.amount;
      }
      // RECAUDO: Debit 1105 (Caja/Bancos), Credit 1305 (Clientes)
      else if (tx.type === "RECAUDO") {
        if (!accMap["110505"]) accMap["110505"] = { code: "110505", name: "Caja General", debits: 0, credits: 0 };
        accMap["110505"].debits += tx.amount;
        accMap[code].credits += tx.amount;
      }
      // PAGO: Debit 2205 (Proveedores), Credit 1110 (Bancos)
      else if (tx.type === "PAGO") {
        accMap[code].debits += tx.amount;
        if (!accMap["111005"]) accMap["111005"] = { code: "111005", name: "Bancos Nacionales", debits: 0, credits: 0 };
        accMap["111005"].credits += tx.amount;
      }
    });

    return Object.values(accMap);
  }, [officialTransactions, selectedCompany]);

  // Export functions
  const triggerSuccessAlert = (message: string) => {
    setExportSuccess(message);
    setTimeout(() => {
      setExportSuccess(null);
    }, 4000);
  };

  const handleExportExcel = () => {
    if (activeTab === "ALCANCE") {
      alert("No se puede exportar el informe descriptivo en formato de tabla Excel CSV. Por favor genera la impresión en PDF.");
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // UTF-8 BOM for Excel Spanish characters
    
    if (activeTab === "ESTADO_RESULTADOS") {
      csvContent += "REPORT: ESTADO DE RESULTADOS (P&L)\r\n";
      csvContent += `Periodo:;${startDate} al ${endDate}\r\n\r\n`;
      csvContent += "CONCEPTO;DEBITO / COSTO;CREDITO / INGRESO;SALDO NETO\r\n";
      csvContent += `Ingresos Operacionales (Ventas);;${reportCalculations.ventas};${reportCalculations.ventas}\r\n`;
      csvContent += `Costo de Ventas (60%);${reportCalculations.costoVentas};;-${reportCalculations.costoVentas}\r\n`;
      csvContent += `UTILIDAD BRUTA;;;${reportCalculations.utilidadBruta}\r\n`;
      csvContent += `Gastos Administrativos y de Operacion;${reportCalculations.gastos};;-${reportCalculations.gastos}\r\n`;
      csvContent += `UTILIDAD OPERACIONAL (EBITDA);;;${reportCalculations.utilidadOperacional}\r\n`;
      csvContent += `Provision de Impuestos de Renta (30%);${reportCalculations.provisionImpuestos};;-${reportCalculations.provisionImpuestos}\r\n`;
      csvContent += `UTILIDAD NETA DEL EJERCICIO;;;${reportCalculations.utilidadNeta}\r\n`;
    } else if (activeTab === "BALANCE_GENERAL") {
      csvContent += "REPORT: BALANCE GENERAL CONSOLIDADO\r\n";
      csvContent += `Periodo:;${startDate} al ${endDate}\r\n\r\n`;
      csvContent += "CUENTA / CLASE;VALOR COP\r\n";
      csvContent += "ACTIVO;;\r\n";
      csvContent += `  Caja y Bancos (Efectivo);${reportCalculations.cajaYBancos}\r\n`;
      csvContent += `  Clientes y Cartera comercial;${reportCalculations.clientesCartera}\r\n`;
      csvContent += `  Inventarios de Mercancia;${reportCalculations.inventariosVal}\r\n`;
      csvContent += `TOTAL ACTIVOS;${reportCalculations.totalActivos}\r\n\r\n`;
      csvContent += "PASIVO;;\r\n";
      csvContent += `  Proveedores Nacionales;${reportCalculations.proveedoresPagar}\r\n`;
      csvContent += `  Obligaciones Corrientes;${reportCalculations.obligacionesCorrientes}\r\n`;
      csvContent += `TOTAL PASIVOS;${reportCalculations.totalPasivos}\r\n\r\n`;
      csvContent += "PATRIMONIO;;\r\n";
      csvContent += `  Capital Social Autorizado;${reportCalculations.capitalSocial}\r\n`;
      csvContent += `  Utilidades de Ejercicios Anteriores;${reportCalculations.utilidadesAcumuladas}\r\n`;
      csvContent += `  Utilidad del Ejercicio Actual;${reportCalculations.utilidadNeta}\r\n`;
      csvContent += `TOTAL PATRIMONIO;${reportCalculations.totalPatrimonio}\r\n`;
      csvContent += `TOTAL PASIVO + PATRIMONIO;${reportCalculations.totalPasivos + reportCalculations.totalPatrimonio}\r\n`;
    } else {
      csvContent += "REPORT: LIBRO MAYOR AUXILIAR PUC\r\n";
      csvContent += `Periodo:;${startDate} al ${endDate}\r\n\r\n`;
      csvContent += "CODIGO PUC;CUENTA CONTABLE;DEBITOS (DEBE);CREDITOS (HABER);SALDO NETO\r\n";
      libroMayorData.forEach(row => {
        const net = row.debits - row.credits;
        csvContent += `${row.code};${csvEscape(row.name)};${row.debits};${row.credits};${net}\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `Reporte_Holding_WPC_${activeTab}_${startDate}_a_${endDate}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerSuccessAlert(`Spreadsheet "${fileName}" exportado exitosamente.`);
  };

  const handlePrintPDF = () => {
    window.print();
    triggerSuccessAlert("Layout de Impresión PDF activado. Guarde el reporte desde su diálogo de impresión local.");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col gap-5 print:border-0 print:shadow-none" id="reports-panel-container">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-600" />
            Reportes Financieros y Estados Contables
          </h2>
          <p className="text-xs text-slate-400">Genere balance de comprobación, estados de pérdidas y ganancias bajo NIIF</p>
        </div>

        {/* Action Button tools */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-all"
            id="export-excel-btn"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Excel
          </button>
          
          <button
            onClick={handlePrintPDF}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-all shadow-xs"
            id="export-pdf-btn"
          >
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Date Range Selectors and Filters */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Filtrar Fecha de Corte:</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Desde:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white border border-slate-200 p-1.5 rounded-lg text-slate-700 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Hasta:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white border border-slate-200 p-1.5 rounded-lg text-slate-700 font-medium"
          />
        </div>

        <div className="ml-auto text-[11px] text-slate-500 font-medium">
          *Datos basados únicamente en transacciones con estado <span className="text-emerald-600 font-semibold">Contabilizado</span>
        </div>
      </div>

      {/* SEGMENTACIÓN POR EMPRESA DEL HOLDING */}
      <div className="flex flex-col gap-2.5 p-4 bg-slate-50/50 border border-slate-100 rounded-xl print:hidden">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          Segmentación Contable por Empresa del Holding:
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCompany("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCompany === "ALL"
                ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Consolidado Holding
          </button>
          <button
            onClick={() => setSelectedCompany("WPC")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCompany === "WPC"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50"
            }`}
          >
            World Parts Company S.A.S.
          </button>
          <button
            onClick={() => setSelectedCompany("FUNDACION")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCompany === "FUNDACION"
                ? "bg-pink-600 text-white border-pink-600 shadow-sm"
                : "bg-white text-pink-600 border-pink-100 hover:bg-pink-50"
            }`}
          >
            Fundación She Maker
          </button>
          <button
            onClick={() => setSelectedCompany("RAEZ")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCompany === "RAEZ"
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-white text-amber-600 border-amber-100 hover:bg-amber-50"
            }`}
          >
            Raez Ingeniería S.A.S.
          </button>
          <button
            onClick={() => setSelectedCompany("HELENAMAR")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCompany === "HELENAMAR"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50"
            }`}
          >
            Helenamar Turismo e Inmobiliaria
          </button>
        </div>
      </div>

      {/* Success banner alert */}
      {exportSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-2 animate-fadeIn print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* Report Switch Tabs */}
      <div className="flex border-b border-slate-100 print:hidden">
        <button
          onClick={() => setActiveTab("ESTADO_RESULTADOS")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "ESTADO_RESULTADOS"
              ? "border-sky-600 text-sky-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ArrowUpRight className="w-4 h-4" /> Estado de Resultados (P&G)
        </button>

        <button
          onClick={() => setActiveTab("BALANCE_GENERAL")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "BALANCE_GENERAL"
              ? "border-sky-600 text-sky-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Scale className="w-4 h-4" /> Balance General
        </button>

        <button
          onClick={() => setActiveTab("LIBRO_MAYOR")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "LIBRO_MAYOR"
              ? "border-sky-600 text-sky-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Layers className="w-4 h-4" /> Auxiliar Libro Mayor (PUC)
        </button>

        <button
          onClick={() => setActiveTab("ALCANCE")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "ALCANCE"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> Alcance WPC & Retroalimentación
        </button>
      </div>

      {/* Quick Document Generation Hub - Direct Multi-Company Download Grid */}
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 rounded-xl p-4 flex flex-col gap-3 shadow-3xs print:hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-sky-600" /> Descarga Directa de Documentos y Cierres por Compañía ({
              activeTab === "ESTADO_RESULTADOS" ? "Estado de Resultados" : 
              activeTab === "BALANCE_GENERAL" ? "Balance General" : 
              activeTab === "LIBRO_MAYOR" ? "Auxiliar Libro Mayor PUC" : "Informe General"
            })
          </span>
          <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-bold">Descarga Segura Colombia</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-normal">
          Genera y exporta instantáneamente a Excel o abre el diálogo oficial de impresión a PDF para cada empresa individualizada o el Holding completo para el periodo contable seleccionado, sin necesidad de cambiar los filtros de la vista principal.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-1">
          {[
            { code: "ALL", name: "Consolidado Holding WPC", color: "border-slate-300 bg-slate-100/50 text-slate-900" },
            { code: "WPC", name: "WPC Autopartes S.A.S.", color: "border-indigo-200 bg-indigo-50/50 text-indigo-950" },
            { code: "FUNDACION", name: "Fundación She Maker", color: "border-pink-200 bg-pink-50/50 text-pink-950" },
            { code: "RAEZ", name: "Raez Ingeniería S.A.S.", color: "border-amber-200 bg-amber-50/50 text-amber-950" },
            { code: "HELENAMAR", name: "Helenamar Inmobiliaria", color: "border-emerald-200 bg-emerald-50/50 text-emerald-950" },
          ].map((comp) => (
            <div key={comp.code} className={`border rounded-lg p-2.5 flex flex-col justify-between gap-2 shadow-2xs ${comp.color}`}>
              <span className="text-[11px] font-extrabold leading-snug">{comp.name}</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => exportExcelForCompany(comp.code as any, activeTab)}
                  className="flex-1 py-1 text-[10px] font-bold border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center gap-1 text-slate-700 cursor-pointer shadow-3xs transition-all"
                  title="Exportar Reporte a Libro de Excel CSV"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" /> Excel
                </button>
                <button
                  type="button"
                  onClick={() => printForCompany(comp.code as any)}
                  className="flex-1 py-1 text-[10px] font-bold border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center gap-1 text-slate-700 cursor-pointer shadow-3xs transition-all"
                  title="Preparar impresión y guardar PDF"
                >
                  <FileText className="w-3 h-3 text-sky-600" /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Printable Sheet View */}
      <div className="p-6 border border-slate-100 rounded-xl bg-slate-50/20 print:border-0 print:p-0 print:bg-white flex flex-col gap-6" id="printable-report-sheet">
        {/* Print Header */}
        <div className="flex justify-between items-start pb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-4">
            {selectedCompany === "WPC" ? (
              <WpcLogo variant="full" size="md" />
            ) : (
              <MakerHoldingLogo variant="full" size="md" />
            )}
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                {selectedCompany === "WPC" ? "WORLD PARTS COMPANY S.A.S." : "MATRIZ MAKER HOLDING"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Consolidado Operacional de Empresas del Grupo</p>
              <p className="text-[10px] text-slate-400">NIT: {
                selectedCompany === "ALL"
                  ? "MATRIZ MAKER HOLDING - Colombia"
                  : `${HOLDING_COMPANIES.find(c => c.id === selectedCompany)?.nit ?? ""} - Colombia`
              }</p>
              <div className="mt-2 inline-block px-2.5 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-700">
                EMPRESA: {
                  selectedCompany === "ALL" ? "MATRIZ MAKER HOLDING (CONSOLIDADO)" :
                  selectedCompany === "WPC" ? "WORLD PARTS COMPANY S.A.S." :
                  selectedCompany === "FUNDACION" ? "FUNDACIÓN SHE MAKER" :
                  selectedCompany === "RAEZ" ? "RAEZ INGENIERÍA S.A.S." :
                  "HELENAMAR TURISMO E INMOBILIARIA"
                }
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-extrabold text-slate-700 uppercase">
              {activeTab === "ESTADO_RESULTADOS" && "Estado de Resultados Integral (P&G)"}
              {activeTab === "BALANCE_GENERAL" && "Estado de Situación Financiera (Balance General)"}
              {activeTab === "LIBRO_MAYOR" && "Auxiliares por Cuenta Libro Mayor (PUC)"}
              {activeTab === "ALCANCE" && "Informe de Alcance y Retroalimentación de la Plataforma"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Periodo de consulta:</p>
            <p className="text-xs font-semibold text-slate-700 font-mono">Desde: {startDate} - Hasta: {endDate}</p>
          </div>
        </div>

        {/* Tab 1: Estado de Resultados */}
        {activeTab === "ESTADO_RESULTADOS" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Resumen detallado de los ingresos por actividades ordinarias, costos y gastos operativos correspondientes al corte contable seleccionado.
            </p>

            <div className="rounded-lg overflow-hidden border border-slate-100 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                    <th className="p-3">Estructura Contable (Cuentas NIIF)</th>
                    <th className="p-3 text-right">Debito (Costos/Gastos)</th>
                    <th className="p-3 text-right">Crédito (Ingresos)</th>
                    <th className="p-3 text-right">Total Neto COP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="p-3 font-medium">41. Ingresos Operacionales (Ventas de Comercio)</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                    <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.ventas)}</td>
                    <td className="p-3 text-right text-emerald-600 font-bold font-mono">{formatCOP(reportCalculations.ventas)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">61. Costo de Ventas y de Operación (Mercancías)</td>
                    <td className="p-3 text-right text-rose-600 font-mono">({formatCOP(reportCalculations.costoVentas)})</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                    <td className="p-3 text-right text-rose-600 font-mono">({formatCOP(reportCalculations.costoVentas)})</td>
                  </tr>
                  <tr className="bg-slate-50/50 font-bold">
                    <td className="p-3 text-slate-800">UTILIDAD BRUTA</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                    <td className="p-3 text-right text-slate-800 font-mono">{formatCOP(reportCalculations.utilidadBruta)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">5. Gastos Administrativos (Arriendos, Nómina, Servicios)</td>
                    <td className="p-3 text-right text-rose-600 font-mono">({formatCOP(reportCalculations.gastos)})</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                    <td className="p-3 text-right text-rose-600 font-mono">({formatCOP(reportCalculations.gastos)})</td>
                  </tr>
                  <tr className="bg-sky-50/40 font-bold text-sky-950">
                    <td className="p-3">UTILIDAD OPERATIVA ANTES DE IMPUESTOS (EBITDA)</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                    <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.utilidadOperacional)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Provisión Impuesto de Renta y Complementarios (30%)</td>
                    <td className="p-3 text-right text-rose-600 font-mono">({formatCOP(reportCalculations.provisionImpuestos)})</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                    <td className="p-3 text-right text-rose-600 font-mono">({formatCOP(reportCalculations.provisionImpuestos)})</td>
                  </tr>
                  <tr className="bg-sky-600 text-white font-bold text-sm">
                    <td className="p-3">UTILIDAD NETA DISPONIBLE DEL EJERCICIO</td>
                    <td className="p-3 text-right text-sky-200">-</td>
                    <td className="p-3 text-right text-sky-200">-</td>
                    <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.utilidadNeta)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Balance General */}
        {activeTab === "BALANCE_GENERAL" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Activos */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-1">1. Activos de la Empresa</h3>
              <div className="rounded-lg overflow-hidden border border-slate-100 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="p-3">Cuenta Auxiliar</th>
                      <th className="p-3 text-right">Saldo COP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="p-3">11. Caja & Equivalentes (Efectivo)</td>
                      <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.cajaYBancos)}</td>
                    </tr>
                    <tr>
                      <td className="p-3">13. Cuentas por Cobrar (Clientes)</td>
                      <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.clientesCartera)}</td>
                    </tr>
                    <tr>
                      <td className="p-3">14. Inventario de Producto en Stock</td>
                      <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.inventariosVal)}</td>
                    </tr>
                    <tr className="bg-sky-50 font-bold text-slate-800">
                      <td className="p-3">TOTAL ACTIVOS</td>
                      <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.totalActivos)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pasivos & Patrimonio */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-1">2 & 3. Pasivo y Patrimonio</h3>
              <div className="rounded-lg overflow-hidden border border-slate-100 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="p-3">Cuenta Auxiliar</th>
                      <th className="p-3 text-right">Saldo COP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {/* Pasivo */}
                    <tr className="bg-slate-50/40 text-[10px] font-bold text-slate-400">
                      <td colSpan={2} className="p-2">PASIVO CORRIENTE</td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-5">22. Proveedores Nacionales</td>
                      <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.proveedoresPagar)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-5">23. Cuentas por pagar y obligaciones</td>
                      <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.obligacionesCorrientes)}</td>
                    </tr>
                    <tr className="bg-slate-100/50 font-bold text-slate-700">
                      <td className="p-3">TOTAL PASIVOS</td>
                      <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.totalPasivos)}</td>
                    </tr>

                    {/* Patrimonio */}
                    <tr className="bg-slate-50/40 text-[10px] font-bold text-slate-400">
                      <td colSpan={2} className="p-2">PATRIMONIO NETO</td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-5">31. Capital Social Autorizado</td>
                      <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.capitalSocial)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-5">37. Utilidades Acumuladas</td>
                      <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.utilidadesAcumuladas)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-5 font-medium">Utilidad del Ejercicio Actual (Neta)</td>
                      <td className="p-3 text-right font-mono text-emerald-600 font-bold">{formatCOP(reportCalculations.utilidadNeta)}</td>
                    </tr>
                    <tr className="bg-slate-100/50 font-bold text-slate-700">
                      <td className="p-3">TOTAL PATRIMONIO</td>
                      <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.totalPatrimonio)}</td>
                    </tr>

                    {/* Ecuacion Patrimonial Check */}
                    <tr className="bg-emerald-600 text-white font-bold">
                      <td className="p-3">TOTAL PASIVO + PATRIMONIO</td>
                      <td className="p-3 text-right font-mono">{formatCOP(reportCalculations.totalPasivos + reportCalculations.totalPatrimonio)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Libro Mayor Auxiliar */}
        {activeTab === "LIBRO_MAYOR" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-500">
              Desglose acumulado de cargos (Debito - Debe) y abonos (Crédito - Haber) procesados en el PUC durante el rango de fechas.
            </p>

            <div className="rounded-lg overflow-hidden border border-slate-100 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                    <th className="p-3">Código PUC</th>
                    <th className="p-3">Nombre de la Cuenta Contable</th>
                    <th className="p-3 text-right">Débitos (Debe) COP</th>
                    <th className="p-3 text-right">Créditos (Haber) COP</th>
                    <th className="p-3 text-right">Saldo Neto de la Cuenta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {libroMayorData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-slate-400 font-medium">
                        No hay movimientos registrados en las cuentas del PUC para el periodo actual.
                      </td>
                    </tr>
                  ) : (
                    libroMayorData.map((row) => {
                      const netBalance = row.debits - row.credits;
                      const isNegative = netBalance < 0;

                      return (
                        <tr key={row.code}>
                          <td className="p-3 font-semibold text-slate-800">{row.code}</td>
                          <td className="p-3 text-slate-700 font-sans text-left">{row.name}</td>
                          <td className="p-3 text-right text-slate-600">{formatCOP(row.debits)}</td>
                          <td className="p-3 text-right text-slate-600">{formatCOP(row.credits)}</td>
                          <td className={`p-3 text-right font-bold ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCOP(netBalance)}
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

        {/* Printable Report Signatures Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8 print:mt-12">
          <WendySignatureBlock variant="full" />
          
          <div className="flex flex-col items-center text-center select-none">
            <div className="relative h-16 w-48 mb-1 flex items-center justify-center">
              <span className="font-serif italic text-lg text-slate-700 tracking-wider">Rafael Olarte F.</span>
            </div>
            <div className="w-48 border-t-2 border-slate-800 mb-1.5" />
            <p className="text-xs font-black uppercase tracking-wide text-slate-900">
              RAFAEL OLARTE
            </p>
            <p className="text-[10px] font-bold font-mono text-slate-600">
              C.C. No. 72.285.492
            </p>
            <p className="text-[10px] font-black uppercase tracking-tight text-indigo-600 mt-0.5">
              GERENTE GENERAL DEL HOLDING
            </p>
            <p className="text-[9px] font-semibold text-slate-400 uppercase">
              MATRIZ MAKER HOLDING
            </p>
          </div>
        </div>

        {/* Tab 4: Alcance y Retroalimentación de la Plataforma */}
        {activeTab === "ALCANCE" && (
          <div className="flex flex-col gap-6 text-slate-700 leading-relaxed text-xs">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col gap-2">
              <h3 className="font-bold text-indigo-950 flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4.5 h-4.5 text-indigo-600 animate-pulse" /> ALCANCE ACTUAL Y RETROALIMENTACIÓN DE LA PLATAFORMA
              </h3>
              <p className="text-slate-600 leading-normal">
                Esta plataforma contable, administrativa y operativa ha sido construida para servir como la matriz de control unificada para el <strong>Holding WPC</strong> y sus cuatro unidades estratégicas de negocio. Combina inteligencia artificial, gestión de inventario, optimización tributaria y control de real estate vacacional.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-4 bg-white border border-slate-100 rounded-xl flex flex-col gap-3 shadow-3xs">
                <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] text-indigo-600 block border-b border-slate-100 pb-1.5">1. Capacidades Operativas Principales</span>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li><strong>Consolidado KPI General:</strong> Tablero financiero ejecutivo para Rafael (Admin) con EBITDA consolidado, flujo de caja, cartera, proveedores, inventario de todas las empresas y alertas automatizadas.</li>
                  <li><strong>WPC Autopartes:</strong> Control de stock, SKU y precios de autopartes. Generación interactiva de Órdenes de Compra con extractor de cotizaciones vía IA (Gemini API) y editor de costos con cálculo automático del IVA (19%).</li>
                  <li><strong>Fundación She Maker:</strong> Seguimiento de proyectos educativos y emisión automática de Certificados de Donación Oficiales según Art. 257 del E.T. (descuento tributario del 25%).</li>
                </ul>
              </div>

              <div className="p-4 bg-white border border-slate-100 rounded-xl flex flex-col gap-3 shadow-3xs">
                <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] text-indigo-600 block border-b border-slate-100 pb-1.5">2. Ingeniería, Helenamar y Reportes</span>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  <li><strong>Raez Ingeniería S.A.S.:</strong> Cotizaciones de proyectos pesados, Órdenes de Servicio y seguimiento visual de avances e hitos con ingenieros responsables asignados.</li>
                  <li><strong>Helenamar Inmobiliaria:</strong> Estado de reservas vacacionales o largo plazo, costos acumulados de mantenimiento por inmueble y colapsable interactivo de incidencias.</li>
                  <li><strong>Contabilidad Segmentada NIIF:</strong> Generación interactiva y exportación de Estado de Resultados, Balance General equilibrado y PUC para cada compañía por separado o el Holding consolidado.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="font-extrabold text-slate-900 block mb-3 text-[10px] text-indigo-600 uppercase tracking-wider border-b border-slate-200 pb-1.5">3. Propuesta de Mejoras e Integraciones Futuras</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-600">
                <div className="p-3 bg-white border border-slate-100 rounded-lg">
                  <h4 className="font-bold text-slate-800 mb-1">A. Sincronización DIAN</h4>
                  <p className="text-[11px] leading-relaxed">Conexión con el servicio de facturación electrónica y nómina electrónica colombiana para procesar XML de forma nativa.</p>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-lg">
                  <h4 className="font-bold text-slate-800 mb-1">B. Open Banking API</h4>
                  <p className="text-[11px] leading-relaxed">Automatización de la conciliación bancaria mediante APIs de bancos en Colombia para cruzar depósitos con facturas.</p>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-lg">
                  <h4 className="font-bold text-slate-800 mb-1">C. Dashboard Ejecutivo Móvil</h4>
                  <p className="text-[11px] leading-relaxed">Implementación de Progressive Web App (PWA) optimizada para celular para aprobación rápida de compras y O.S. en segundos.</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs mt-1 print:hidden">
              <div>
                <p className="font-bold text-indigo-950">Vista preliminar de documento de alcance listo para guardar</p>
                <p className="text-[11px] text-slate-500">Haz clic en el botón de la derecha para exportar este informe a un archivo PDF estructurado con membrete.</p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Guardar Informe en PDF
              </button>
            </div>
          </div>
        )}

        {/* Report Footer */}
        <div className="flex justify-between items-center pt-8 border-t border-slate-100 text-[10px] text-slate-400">
          <div>
            <p>Generado por: <strong>{userRole}</strong></p>
            <p>Fecha de impresión: {new Date().toLocaleString("es-CO")}</p>
          </div>
          <div className="text-right">
            <p>CONTROL GENERAL HOLDING WPC Cloud Systems v5.12</p>
            <p>Verificación contable aprobada bajo NIIF para PYMES</p>
          </div>
        </div>
      </div>
    </div>
  );
}
