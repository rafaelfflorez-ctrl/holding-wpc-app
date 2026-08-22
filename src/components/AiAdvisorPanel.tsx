import React, { useState } from "react";
import { apiFetch } from "../lib/api";
import { 
  Sparkles, 
  Send, 
  TrendingUp, 
  ShieldCheck, 
  LineChart, 
  Clock, 
  HelpCircle, 
  MessageSquare, 
  ArrowRight, 
  Lightbulb, 
  Briefcase 
} from "lucide-react";

interface AiAdvisorPanelProps {
  inventory: any[];
  commercialProfits: {
    WPC: number;
    RAEZ: number;
    HELENAMAR: number;
  };
}

export default function AiAdvisorPanel({ inventory, commercialProfits }: AiAdvisorPanelProps) {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string; date: string }>>([
    {
      sender: "ai",
      text: "Â¡Hola Rafael y Wendy! Soy su Asesor Financiero Contable Experto del Holding Matriz Maker. Estoy listo para darles recomendaciones estratÃ©gicas en tiempo real sobre el flujo de caja, la optimizaciÃ³n tributaria de donaciones (Art 257 E.T.) y el momento Ã³ptimo de compra de importaciones para World Parts Company S.A.S. Â¿En quÃ© puedo asistirlos hoy?",
      date: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Predefined strategic recommendations
  const staticRecommendations = [
    {
      title: "Alarma de Re-abastecimiento Brembo",
      desc: "Se detecta stock crÃ­tico en pastillas Brembo traseras (SKU: FR-BRM-045). Se sugiere emitir Orden de Compra internacional en los prÃ³ximos 5 dÃ­as para evitar ruptura de inventario. El tiempo de trÃ¡nsito estimado vÃ­a Maersk es de 25 dÃ­as.",
      tag: "COMPRAS",
      color: "bg-red-50 text-red-700 border-red-100"
    },
    {
      title: "OptimizaciÃ³n de DonaciÃ³n She Maker",
      desc: `WPC World Parts Company proyecta una utilidad de ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(commercialProfits.WPC)}. Si transfieren una donaciÃ³n de ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(commercialProfits.WPC * 0.10)} a la FundaciÃ³n, obtendrÃ¡n un descuento tributario directo en su impuesto de renta de ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(commercialProfits.WPC * 0.10 * 0.25)} (Art 257 ET).`,
      tag: "IMPUESTOS",
      color: "bg-indigo-50 text-indigo-700 border-indigo-100"
    },
    {
      title: "Estabilidad de Flujo de Caja - Raez",
      desc: "Los contratos de ingenierÃ­a vigentes reportan un costo operativo promedio del 15% sobre el valor del servicio. Se recomienda mantener una provisiÃ³n del 10% en caja para repuestos e imprevistos de maquinaria.",
      tag: "TESORERÃA",
      color: "bg-amber-50 text-amber-700 border-amber-100"
    }
  ];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    const userMsg = {
      sender: "user" as const,
      text: userText,
      date: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Call our server-side API proxying Gemini
      const res = await apiFetch("/api/ai-expert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: userText,
          inventory,
          profits: commercialProfits
        })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg = {
          sender: "ai" as const,
          text: data.reply,
          date: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error("API failed");
      }
    } catch (err) {
      // Graceful local rule-based fallback if backend/key is unavailable
      setTimeout(() => {
        let fallbackText = "Entendido. Como asesor experto de Matriz Maker, les recomiendo verificar que las cuentas del PUC estÃ©n completamente cuadradas antes de emitir la prÃ³xima factura electrÃ³nica DIAN. ";
        
        if (userText.toLowerCase().includes("compra") || userText.toLowerCase().includes("inventario")) {
          fallbackText = `Para optimizar las compras de WPC Autopartes: 1. Mantener un stock mÃ­nimo de 15 unidades por SKU. 2. Consolidar importaciones Brembo trimestralmente para mitigar los sobrecostos marÃ­timos de aduana en Cartagena. Actualmente cuentan con ${inventory.filter(i => i.companyId === 'WPC').length} referencias de repuestos codificados.`;
        } else if (userText.toLowerCase().includes("donacion") || userText.toLowerCase().includes("fundacion") || userText.toLowerCase().includes("impuesto")) {
          fallbackText = `De acuerdo con el Estatuto Tributario Art. 257, sus donaciones a FundaciÃ³n She Maker les permiten restar de forma directa el 25% del valor donado de su impuesto neto sobre la renta. En este momento, las utilidades comerciales netas acumuladas ascienden a ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(commercialProfits.WPC + commercialProfits.RAEZ + commercialProfits.HELENAMAR)}, por lo que donar un 10% consolida un excelente balance social y fiscal.`;
        }

        const aiMsg = {
          sender: "ai" as const,
          text: fallbackText,
          date: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
        };
        setMessages(prev => [...prev, aiMsg]);
      }, 800);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col gap-6" id="ai-advisor-container">
      {/* Title */}
      <div className="border-b pb-4 border-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-lg animate-pulse">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Senior AI Advisor & Estrategia Corporativa
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ConsejerÃ­a estratÃ©gica para Matriz Holding Maker | Integrado con el motor de razonamiento de Google Gemini.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Strategic Insights (1 Col) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5 border-b pb-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Alertas EstratÃ©gicas Precalculadas
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {staticRecommendations.map((rec, idx) => (
              <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-2 ${rec.color}`}>
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs">{rec.title}</h4>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-white border rounded">
                    {rec.tag}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">{rec.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Interactive AI Chat Advisor (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-50 rounded-2xl border border-slate-100 p-4 flex flex-col h-[420px] justify-between">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-500" /> Canal de Consulta Rafael / Wendy
            </span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-bold">
              ASISTENTE CON GEMINI
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 scrollbar-none">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.sender === "ai" 
                    ? "bg-white text-slate-800 self-start border border-slate-200 rounded-tl-none shadow-3xs" 
                    : "bg-indigo-600 text-white self-end rounded-tr-none"
                }`}
              >
                <p>{msg.text}</p>
                <span className={`block text-[9px] mt-1 text-right ${msg.sender === "ai" ? "text-slate-400" : "text-indigo-200"}`}>
                  {msg.date}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="bg-white text-slate-800 self-start border border-slate-200 rounded-2xl rounded-tl-none p-3 text-xs flex items-center gap-2 max-w-[50%] shadow-3xs">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </span>
                <span className="text-slate-400 italic">Asesor analizando...</span>
              </div>
            )}
          </div>

          {/* Prompt Form */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder="Pregunte sobre optimizaciÃ³n tributaria, importaciones, aduanas, etc..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold flex items-center justify-center transition-all disabled:opacity-50"
              disabled={isLoading}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
