import { useState } from "react";
import { FileText, Upload, CheckCircle2, AlertTriangle, Download, ShieldCheck } from "lucide-react";
import type { Transaction } from "../types";

type ParsedInvoice = {
  numero: string;
  fecha: string;
  proveedorNit: string;
  proveedorNombre: string;
  clienteNit: string;
  total: number;
  iva: number;
  moneda: string;
  rawXml: string;
};

function parseUBL(xmlText: string): ParsedInvoice | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) return null;

  const get = (tag: string) => {
    const el = Array.from(doc.getElementsByTagName("*")).find(
      (e) => e.localName === tag || e.tagName.endsWith(":" + tag)
    );
    return el?.textContent?.trim() || "";
  };
  const getAll = (tag: string) =>
    Array.from(doc.getElementsByTagName("*")).filter(
      (e) => e.localName === tag || e.tagName.endsWith(":" + tag)
    );

  const parties = getAll("PartyTaxScheme");
  const proveedorNit = parties[0]?.getElementsByTagNameNS("*", "CompanyID")[0]?.textContent?.trim() || get("CompanyID");
  const clienteNit = parties[1]?.getElementsByTagNameNS("*", "CompanyID")[0]?.textContent?.trim() || "";

  const totalStr = get("PayableAmount") || get("LineExtensionAmount");
  const ivaStr = doc.querySelector("*|TaxAmount")?.textContent || get("TaxAmount") || "0";

  return {
    numero: get("ID") || "SIN-NUMERO",
    fecha: get("IssueDate") || new Date().toISOString().slice(0, 10),
    proveedorNit,
    proveedorNombre: get("RegistrationName") || get("Name") || "Proveedor DIAN",
    clienteNit,
    total: parseFloat(totalStr.replace(/[^0-9.-]/g, "")) || 0,
    iva: parseFloat(ivaStr.replace(/[^0-9.-]/g, "")) || 0,
    moneda: get("DocumentCurrencyCode") || "COP",
    rawXml: xmlText,
  };
}

export default function DianPanel({
  onImport,
}: {
  onImport: (tx: Omit<Transaction, "id" | "date">) => void;
}) {
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFile = async (file: File) => {
    setError(null);
    setParsed(null);
    setFileName(file.name);
    const text = await file.text();
    if (!text.includes("<?xml") && !text.includes("<Invoice")) {
      setError("El archivo no parece ser un XML UBL de factura electrónica DIAN.");
      return;
    }
    const inv = parseUBL(text);
    if (!inv) setError("No se pudo parsear el XML. Verifica que sea UBL 2.1 válido.");
    else setParsed(inv);
  };

  const handleImport = () => {
    if (!parsed) return;
    onImport({
      type: parsed.total >= 0 ? "VENTA" : "COMPRA",
      amount: Math.abs(parsed.total),
      customerSupplier: parsed.proveedorNombre || parsed.proveedorNit,
      description: `Factura DIAN ${parsed.numero} importada (XML)`,
      category: "Factura Electrónica DIAN",
      status: "BORRADOR",
      account: "413505 - Ingresos Venta Autopartes WPC",
      companyId: "WPC",
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Facturación Electrónica DIAN — Importación UBL 2.1
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Carga el XML UBL 2.1 validado por la DIAN. El sistema extrae NIT, fecha, totales e IVA (19%) y crea el asiento borrador. Validación contra web-service DIAN pendiente de habilitar con certificado digital.
        </p>
        <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
          <AlertTriangle className="w-3 h-3" /> Stub — validación DIAN y envío a CUFE en roadmap
        </span>
      </div>

      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-colors">
        <Upload className="w-6 h-6 text-slate-400" />
        <span className="text-xs font-semibold text-slate-700">Arrastra el XML aquí o haz clic para seleccionar</span>
        <span className="text-[11px] text-slate-400">.xml — UBL Invoice 2.1 (DIAN Colombia)</span>
        <input
          type="file"
          accept=".xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>

      {fileName && <p className="text-xs text-slate-500">Archivo: <span className="font-mono font-semibold">{fileName}</span></p>}

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {parsed && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 overflow-hidden">
          <div className="bg-white border-b border-emerald-100 px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> XML parseado correctamente
            </span>
            <span className="text-[10px] font-mono bg-slate-900 text-white px-2 py-0.5 rounded">{parsed.moneda}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Número</p>
              <p className="font-mono font-bold text-slate-800">{parsed.numero}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Fecha</p>
              <p className="font-semibold text-slate-800">{parsed.fecha}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Proveedor NIT</p>
              <p className="font-mono text-slate-800">{parsed.proveedorNit || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total / IVA</p>
              <p className="font-bold text-slate-800">
                {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(parsed.total)}{" "}
                <span className="text-slate-500 font-normal">/ IVA {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(parsed.iva)}</span>
              </p>
            </div>
            <div className="col-span-2 md:col-span-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Proveedor</p>
              <p className="text-slate-800">{parsed.proveedorNombre}</p>
            </div>
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={handleImport}
              className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Importar como asiento borrador
            </button>
            <a
              href={`data:text/xml;charset=utf-8,${encodeURIComponent(parsed.rawXml)}`}
              download={fileName || "factura.xml"}
              className="text-xs font-semibold bg-white border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" /> Descargar XML
            </a>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-slate-950 text-slate-300 p-4 text-[11px] leading-relaxed">
        <p className="font-bold text-white mb-1">Próximos pasos (roadmap DIAN):</p>
        <ul className="list-disc list-inside space-y-1 text-slate-400">
          <li>Validación del CUFE y firma con certificado digital ante web-service DIAN.</li>
          <li>Conciliación automática contra extractos bancarios (Bancolombia/Davivienda) vía Open Banking.</li>
          <li>Generación de nómina electrónica y PILA desde el mismo PUC.</li>
        </ul>
      </div>
    </div>
  );
}
