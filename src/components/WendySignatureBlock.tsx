import React from "react";
import { WENDY_LEGAL_INFO } from "../assets/wendySignatureData";

interface WendySignatureBlockProps {
  className?: string;
  showTitle?: boolean;
  showDocId?: boolean;
  variant?: "compact" | "full" | "stamp";
  lightText?: boolean;
}

export default function WendySignatureBlock({
  className = "",
  showTitle = true,
  showDocId = true,
  variant = "full",
  lightText = false,
}: WendySignatureBlockProps) {
  if (variant === "compact") {
    return (
      <div className={`flex flex-col items-start ${className}`}>
        <div className="relative h-12 w-36 mb-1">
          <img
            src={WENDY_LEGAL_INFO.signatureImg}
            alt="Firma Wendy Colpas Fernández"
            className="h-full w-full object-contain mix-blend-multiply filter contrast-125"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="border-t border-slate-400 pt-1 w-full text-left">
          <p className={`text-xs font-black uppercase tracking-tight ${lightText ? "text-white" : "text-slate-800"}`}>
            {WENDY_LEGAL_INFO.fullName}
          </p>
          {showDocId && (
            <p className={`text-[10px] font-mono ${lightText ? "text-slate-300" : "text-slate-500"}`}>
              {WENDY_LEGAL_INFO.documentType}: {WENDY_LEGAL_INFO.documentId}
            </p>
          )}
          {showTitle && (
            <p className={`text-[10px] font-bold ${lightText ? "text-lime-400" : "text-indigo-600"}`}>
              {WENDY_LEGAL_INFO.title}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (variant === "stamp") {
    return (
      <div className={`p-3 bg-slate-50 rounded-xl border border-slate-200/80 shadow-3xs flex items-center gap-3 ${className}`}>
        <div className="w-24 h-12 shrink-0 bg-white rounded-lg border border-slate-100 p-1 flex items-center justify-center">
          <img
            src={WENDY_LEGAL_INFO.signatureImg}
            alt="Firma Wendy Colpas Fernández"
            className="max-h-full max-w-full object-contain mix-blend-multiply"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="text-left leading-tight">
          <div className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase rounded mb-0.5">
            ✓ Firma Digital Verificada
          </div>
          <p className="text-xs font-black text-slate-800 uppercase">{WENDY_LEGAL_INFO.fullName}</p>
          <p className="text-[10px] font-bold text-slate-500">C.C. {WENDY_LEGAL_INFO.documentId} de Barranquilla</p>
          <p className="text-[10px] font-extrabold text-indigo-600">{WENDY_LEGAL_INFO.title}</p>
        </div>
      </div>
    );
  }

  // Default: "full"
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {/* Handwritten Signature Container */}
      <div className="relative h-16 w-48 mb-1 flex items-center justify-center">
        <img
          src={WENDY_LEGAL_INFO.signatureImg}
          alt="Firma Wendy Colpas Fernández"
          className="max-h-full max-w-full object-contain mix-blend-multiply filter contrast-125 hover:scale-105 transition-transform"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Underline line */}
      <div className={`w-48 border-t-2 ${lightText ? "border-slate-500" : "border-slate-800"} mb-1.5`} />

      {/* Text Details */}
      <p className={`text-xs font-black uppercase tracking-wide ${lightText ? "text-white" : "text-slate-900"}`}>
        {WENDY_LEGAL_INFO.fullName}
      </p>
      {showDocId && (
        <p className={`text-[10px] font-bold font-mono ${lightText ? "text-slate-300" : "text-slate-600"}`}>
          C.C. No. {WENDY_LEGAL_INFO.documentId}
        </p>
      )}
      {showTitle && (
        <p className={`text-[10px] font-black uppercase tracking-tight mt-0.5 ${lightText ? "text-lime-400" : "text-indigo-600"}`}>
          {WENDY_LEGAL_INFO.title}
        </p>
      )}
      <p className={`text-[9px] font-semibold uppercase ${lightText ? "text-slate-400" : "text-slate-400"}`}>
        World Parts Company S.A.S. / Matriz Maker Holding
      </p>
    </div>
  );
}
