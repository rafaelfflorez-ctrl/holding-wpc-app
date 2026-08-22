import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

// Modelo de Gemini configurable vía env (AI Studio inyecta los secrets).
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
// Cadena de respaldo ante saturación (503) o modelos no disponibles (404).
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || "gemini-3.7-flash,gemini-flash-latest")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// AUTENTICACIÓN de las rutas del servidor (seguridad B1)
// Exige una sesión válida de Supabase (Bearer token) y, cuando aplica, rol ADMIN.
// ---------------------------------------------------------------------------
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAuth(req: any): Promise<{ user: any; role: string | null }> {
  const header = req?.headers?.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "No autorizado: inicie sesión para continuar.");
  const sb = getServiceClient();
  if (!sb) throw new HttpError(500, "El servidor no tiene SUPABASE_SERVICE_ROLE_KEY configurada.");
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "Sesión inválida o expirada. Inicie sesión de nuevo.");
  const { data: profile } = await sb
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  return { user: data.user, role: profile?.role || null };
}

async function requireAdmin(req: any) {
  const auth = await requireAuth(req);
  if (auth.role !== "ADMINISTRADOR") {
    throw new HttpError(403, "Solo un ADMINISTRADOR puede realizar esta operación.");
  }
  return auth;
}

// Llama a Gemini probando varios modelos ante saturación temporal (HTTP 503).
async function generateWithRetry(ai: any, contents: any, config: any) {
  const models = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== GEMINI_MODEL)];
  let lastErr: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await ai.models.generateContent({ model, contents, config });
      } catch (e: any) {
        lastErr = e;
        const str = JSON.stringify(e);
        const isCapacity = String(e?.status || "").includes("503") || str.includes('"code":503');
        const isMissing = String(e?.status || "").includes("404") || str.includes("no longer available") || /not found|does not exist/i.test(str);
        if (isCapacity) {
          if (attempt < 2) {
            await sleepMs(1500 * attempt);
            continue;
          }
          break; // saturado -> siguiente modelo
        }
        if (isMissing) break; // no disponible -> siguiente modelo
        throw e; // error real (auth, contenido, cuota) -> propagar
      }
    }
  }
  throw lastErr || new Error("Gemini no disponible (todos los modelos saturados).");
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Support large base64 file payloads for PDF, Excel, Word, and Image uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Helper to extract file content for Gemini multimodal or text processing
  function processFileForGemini(fileName: string = "", fileType: string = "", fileData?: string) {
    if (!fileData) return null;

    // Clean data URL prefix if present (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, "").trim().replace(/[\r\n\s]+/g, "");
    const lowerName = fileName.toLowerCase();
    const lowerType = fileType.toLowerCase();

    // 1. Handle Excel / Spreadsheets (.xlsx, .xls, .csv)
    if (
      lowerName.endsWith(".xlsx") ||
      lowerName.endsWith(".xls") ||
      lowerType.includes("spreadsheet") ||
      lowerType.includes("excel")
    ) {
      try {
        const buffer = Buffer.from(cleanBase64, "base64");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        let combinedCsv = "";
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          combinedCsv += `\n--- HOJA / PESTAÑA: ${sheetName} ---\n${csv}\n`;
        }
        return {
          type: "text" as const,
          content: `[CONTENIDO EXTRAÍDO DE ARCHIVO EXCEL/HOJA DE CÁLCULO "${fileName}"]:\n${combinedCsv}`
        };
      } catch (err) {
        console.error("Error reading Excel with xlsx:", err);
      }
    }

    // 2. Handle Text / CSV / JSON / Markdown
    if (
      lowerName.endsWith(".csv") ||
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".json") ||
      lowerName.endsWith(".md") ||
      lowerType.startsWith("text/")
    ) {
      try {
        const text = Buffer.from(cleanBase64, "base64").toString("utf-8");
        return {
          type: "text" as const,
          content: `[CONTENIDO DE TEXTO DEL ARCHIVO "${fileName}"]:\n${text}`
        };
      } catch (err) {
        console.error("Error reading text file:", err);
      }
    }

    // 3. Handle PDF and Images / Photographs (Multimodal inlineData)
    // Intelligent MIME detection with magic bytes inspection and extension fallbacks
    let validMimeType = "image/jpeg"; // Safe default for camera photos if ambiguous

    if (cleanBase64.startsWith("JVBERi0") || lowerName.endsWith(".pdf") || lowerType === "application/pdf") {
      validMimeType = "application/pdf";
    } else if (cleanBase64.startsWith("/9j/") || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") || lowerName.endsWith(".jfif") || lowerType.includes("jpeg") || lowerType.includes("jpg")) {
      validMimeType = "image/jpeg";
    } else if (cleanBase64.startsWith("iVBORw0KGgo") || lowerName.endsWith(".png") || lowerType.includes("png")) {
      validMimeType = "image/png";
    } else if (cleanBase64.startsWith("UklGR") || lowerName.endsWith(".webp") || lowerType.includes("webp")) {
      validMimeType = "image/webp";
    } else if (cleanBase64.startsWith("R0lGOD") || lowerName.endsWith(".gif") || lowerType.includes("gif")) {
      validMimeType = "image/gif";
    } else if (cleanBase64.startsWith("Qk") || lowerName.endsWith(".bmp") || lowerType.includes("bmp")) {
      validMimeType = "image/bmp";
    } else if (lowerName.endsWith(".heic") || lowerType.includes("heic")) {
      validMimeType = "image/heic";
    } else if (lowerName.endsWith(".heif") || lowerType.includes("heif")) {
      validMimeType = "image/heif";
    } else if (lowerType.startsWith("image/")) {
      validMimeType = lowerType === "image/jpg" ? "image/jpeg" : lowerType;
    } else if (lowerType.startsWith("application/pdf")) {
      validMimeType = "application/pdf";
    }

    return {
      type: "inline" as const,
      mimeType: validMimeType,
      data: cleanBase64
    };
  }

  // Offline quote simulation helpers
  function simulateOfflineQuote(fileName: string, companyId: string) {
    const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    let customer = "Tercero Asociado de Colombia S.A.";
    let items = [{ code: "SERV-GEN", description: `Servicio General de ${cleanName}`, quantity: 1, unitPrice: 4500000, total: 4500000 }];
    
    if (companyId === "WPC") {
      customer = "Distribuidora de Repuestos El Sol SAS";
      items = [
        { code: "FR-BRM-045", description: "Juegos Pastillas de Freno Brembo Premium", quantity: 10, unitPrice: 320000, total: 3200000 },
        { code: "FR-DISC-102", description: "Pares Discos Ventilados Brembo 300mm", quantity: 4, unitPrice: 510000, total: 2040000 }
      ];
    } else if (companyId === "FUNDACION") {
      customer = "Alcaldía Mayor de Bogotá (Desarrollo Social)";
      items = [
        { code: "FND-TLL-10", description: "Talleres Formativos en Robótica & Arduino para 50 Niñas", quantity: 1, unitPrice: 8500000, total: 8500000 }
      ];
    } else if (companyId === "RAEZ") {
      customer = "Ingenio Azucarero Manuelita S.A.";
      items = [
        { code: "RZ-PROJ-CNC", description: "Diseño, Mecanizado CNC y Soldadura de Vástago de Prensa", quantity: 1, unitPrice: 12800000, total: 12800000 }
      ];
    } else if (companyId === "HELENAMAR") {
      customer = "Sra. Carmen Villalobos (Corretaje Turístico)";
      items = [
        { code: "HMR-SERV-30", description: "Servicios de Limpieza Profunda, Lavandería y Logística", quantity: 6, unitPrice: 300000, total: 1800000 }
      ];
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = Math.round(subtotal * 0.19);
    const total = subtotal + taxAmount;

    return {
      id: `COT-${companyId}-0001`,
      date: new Date().toISOString().split("T")[0],
      customer,
      customerNit: "900.582.493-1",
      customerPhone: "+57 (315) 890-4412",
      customerEmail: "compras@tercerocolombia.co",
      customerAddress: "Calle Industrial # 10-25, Bogotá D.C.",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      items,
      subtotal,
      taxAmount,
      total,
      status: "BORRADOR",
      companyId,
      notes: "Cargada y convertida por IA de forma offline desde el documento previo " + fileName
    };
  }

  function simulateOfflineLearning(fileName: string, companyId: string) {
    return {
      valoresCotizadosAnalysis: `[OFFLINE IA] Tarifas evaluadas para ${companyId}. Se encuentran dentro del rango óptimo histórico para Bogotá con una dispersión de ±4.2%.`,
      tiempoEstimadoEjecucion: "Estimado entre 6 y 14 días calendarios según carga del holding actual.",
      viabilidadUtilidad: `[OFFLINE IA] Rentabilidad estimada en un 38.5% neto. Cumple con el objetivo del holding de un margen superior al 30%.`,
      sobrecostos: "[OFFLINE IA] Riesgo menor de sobrecostos en materiales de taller. Se sugiere asegurar insumos antes de 15 días.",
      imprevistos: "[OFFLINE IA] Se sugiere constituir reserva contable técnica del 7.5% por eventuales novedades imprevistas de entrega."
    };
  }

  function simulateOfflinePO(fileName: string, companyId: string) {
    let supplier = "Proveedor General del Holding";
    let items = [{ code: "INS-GEN", description: "Insumos Varios del Documento", quantity: 1, unitCost: 1500000, total: 1500000 }];

    if (companyId === "WPC") {
      supplier = "Brembo Parts Europe S.P.A. (Milán)";
      items = [
        { code: "BRM-IMP-9", description: "Importación Pastillas Cerámicas Brembo Brembo-X", quantity: 50, unitCost: 120000, total: 6000000 }
      ];
    } else if (companyId === "FUNDACION") {
      supplier = "Ferretería Arduino Robot Store Bogotá";
      items = [
        { code: "FND-INS-2", description: "Placas Arduino Nano, Sensores Ultrasonido y Jumpers", quantity: 30, unitCost: 45000, total: 1350000 }
      ];
    } else if (companyId === "RAEZ") {
      supplier = "Siderúrgica del Pacífico (Aceros S.A.)";
      items = [
        { code: "RZ-AC-02", description: "Láminas de Acero Inoxidable 316L Calibre 1/4", quantity: 8, unitCost: 850000, total: 6800000 }
      ];
    } else if (companyId === "HELENAMAR") {
      supplier = "Distribuidora HomeCenter Santa Marta";
      items = [
        { code: "HM-LIMP-10", description: "Kits de Aseo, Lencería de Cama Premium y Toallas", quantity: 5, unitCost: 280000, total: 1400000 }
      ];
    }

    const total = items.reduce((sum, item) => sum + item.total, 0);

    return {
      id: `ODC-${companyId}-0001`,
      date: new Date().toISOString().split("T")[0],
      supplier,
      companyId,
      items,
      total,
      status: "CREADO",
      notes: "Generado de forma autónoma por IA desde documento de compra previo " + fileName,
      carrier: "DHL Express",
      etaDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    };
  }

  // Public config for the frontend (Supabase anon key is public by design).
  app.get("/api/config", (_req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      modelName: GEMINI_MODEL,
    });
  });

  // Create an application user (profile + Supabase Auth) — admin only via UI.
  // Requires SUPABASE_SERVICE_ROLE_KEY in server secrets.
  app.post("/api/auth/create-user", async (req, res) => {
    try {
      await requireAdmin(req);
      const { email, password, name, role, title } = req.body || {};
      if (!email || !password || !name) {
        return res.status(400).json({ error: "email, password y name son obligatorios." });
      }
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceKey) {
        return res.status(400).json({
          error: "SUPABASE_SERVICE_ROLE_KEY no está configurada en los secrets del servidor.",
        });
      }
      const admin = createSupabaseClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: created, error: authErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: role || "AUXILIAR_CONTABLE", title: title || "" },
      });
      if (authErr) return res.status(400).json({ error: authErr.message });

      // Bridge row for RLS role checks.
      await admin
        .from("users")
        .upsert({ id: created.user.id, email, name, role: role || "AUXILIAR_CONTABLE", title: title || "" }, { onConflict: "id" });

      // Append profile into the shared app_data.users collection.
      const profile = {
        id: created.user.id,
        name,
        email,
        role: role || "AUXILIAR_CONTABLE",
        title: title || "Auxiliar Contable",
        avatar: "",
        lastLogin: "Sin registros anteriores",
        isActive: true,
      };
      const { data: usersRow } = await admin.from("app_data").select("value").eq("key", "users").maybeSingle();
      const list = Array.isArray(usersRow?.value) ? usersRow.value : [];
      list.push(profile);
      await admin
        .from("app_data")
        .upsert({ key: "users", value: list, updated_at: new Date().toISOString() }, { onConflict: "key" });

      res.json({ ok: true, user: profile });
    } catch (e: any) {
      if (e instanceof HttpError) {
        return res.status(e.status).json({ error: e.message });
      }
      console.error("Error creando usuario:", e);
      res.status(500).json({ error: e?.message || "Error al crear el usuario." });
    }
  });
  // API Route to analyze an existing quote
  app.post("/api/analyze-quote", async (req, res) => {
    const { fileName = "documento", fileType = "", fileData, companyId = "WPC", userInstruction } = req.body || {};
    try {
      await requireAuth(req);
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          isDemo: true,
          estimate: simulateOfflineQuote(fileName, companyId),
          learning: simulateOfflineLearning(fileName, companyId)
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const parts: any[] = [];
      const processed = processFileForGemini(fileName, fileType, fileData);

      if (processed) {
        if (processed.type === "text") {
          parts.push({ text: processed.content });
        } else if (processed.type === "inline") {
          parts.push({
            inlineData: {
              mimeType: processed.mimeType,
              data: processed.data
            }
          });
        }
      }
      
      let basePrompt = `Eres un auditor financiero y extractor experto de documentos de compras, presupuestos y cotizaciones para la empresa "${companyId}" en nuestro holding empresarial.
Analiza este documento comercial adjunto (puede ser una fotografía tomada con celular, imagen escaneada, captura de pantalla, PDF, Excel o presupuesto en papel).
Realiza una lectura OCR minuciosa de todos los textos, tablas, filas de ítems, cantidades, costos, referencias, fechas, notas y totales.

Extrae la información con máxima fidelidad e inteligencia y adáptala a nuestro esquema JSON.

El resultado debe ser estrictamente un JSON válido con la siguiente estructura:
{
  "customer": "Nombre del cliente, empresa o destinatario que figura en el documento",
  "customerNit": "NIT o cédula del cliente si figura",
  "customerPhone": "Teléfono de contacto si figura",
  "customerEmail": "Correo electrónico si figura",
  "customerAddress": "Dirección física si figura",
  "validUntil": "Fecha de validez (YYYY-MM-DD)",
  "quoteReference": "Referencia, consecutivo, folio o código de la cotización o factura (ej: COT-2026-99)",
  "quoteDate": "Fecha de creación, emisión o vigencia que figure en el documento original (YYYY-MM-DD)",
  "items": [
    {
      "code": "Código de artículo o servicio (ej: REF-001)",
      "description": "Descripción clara del artículo o servicio cotizado",
      "quantity": 1,
      "unitCost": 80000,
      "profitMarginPercent": 25,
      "unitPrice": 100000,
      "total": 100000
    }
  ],
  "subtotal": 100000,
  "taxAmount": 19000,
  "total": 119000,
  "notes": "Notas, términos o condiciones comerciales presentes en el documento",
  "learning": {
    "valoresCotizadosAnalysis": "Análisis comparativo de los precios cotizados frente al mercado actual",
    "tiempoEstimadoEjecucion": "Estimación del tiempo de ejecución o entrega del servicio/producto",
    "viabilidadUtilidad": "Análisis de rentabilidad y margen de utilidad estimado para el holding",
    "sobrecostos": "Posibles sobrecostos detectados o riesgos de variación de costos",
    "imprevistos": "Cálculo o sugerencias para contingencias e imprevistos"
  }
}

Pautas obligatorias:
- Si el documento es una fotografía o imagen, lee con atención todas las filas de texto, valores manuscritos o impresos y tablas.
- Genera los valores numéricos en pesos colombianos (COP) limpios de puntos o caracteres especiales.
- Si no figura explícitamente el costo base (unitCost), calcula unitCost asumiendo un margen sugerido del 25% o deduce unitCost = unitPrice / 1.25.
- Deduce datos faltantes de manera coherente según la actividad de ${companyId}.`;

      if (userInstruction) {
        basePrompt += `\n\nINSTRUCCIÓN ADICIONAL DE CONTEXTO DADA POR EL USUARIO: "${userInstruction}". Aplica estrictamente estas pautas al procesar el documento.`;
      }

      parts.push({ text: basePrompt });

      const response = await generateWithRetry(ai, { parts }, {
        responseMimeType: "application/json",
        temperature: 0.1,
      });

      const responseText = response.text || "{}";
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, responseText];
      const cleanedJson = (jsonMatch[1] || responseText).trim();
      const parsed = JSON.parse(cleanedJson || "{}");

      // Calculate items and profitability
      const parsedItems = Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items.map((it: any) => {
        const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
        const price = Math.max(0, parseFloat(it.unitPrice) || 0);
        const cost = it.unitCost !== undefined ? Math.max(0, parseFloat(it.unitCost) || 0) : Math.round(price / 1.25);
        const margin = it.profitMarginPercent !== undefined ? parseFloat(it.profitMarginPercent) : (cost > 0 ? Number((((price - cost) / cost) * 100).toFixed(1)) : 25);
        const total = qty * price;
        const profitAmount = price - cost;

        return {
          code: it.code || "ITEM",
          description: it.description || "Servicio / Insumo cotizado",
          quantity: qty,
          unitCost: cost,
          profitMarginPercent: margin,
          profitAmount,
          unitPrice: price,
          total
        };
      }) : [
        { code: "GEN-01", description: `Servicio/Insumo extraído de ${fileName}`, quantity: 1, unitCost: 80000, profitMarginPercent: 25, profitAmount: 20000, unitPrice: 100000, total: 100000 }
      ];

      let totalCost = 0;
      let calculatedSub = 0;
      let totalProfit = 0;

      parsedItems.forEach(it => {
        totalCost += (it.quantity * (it.unitCost || 0));
        calculatedSub += it.total;
        totalProfit += (it.quantity * (it.profitAmount || 0));
      });

      if (parsed.subtotal && parsed.subtotal > calculatedSub) {
        calculatedSub = parsed.subtotal;
      }
      const calculatedTax = parsed.taxAmount !== undefined ? parsed.taxAmount : Math.round(calculatedSub * 0.19);
      const calculatedTotal = parsed.total || (calculatedSub + calculatedTax);
      const profitMarginPercent = totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(1)) : 25;

      const estimateResult = {
        id: `COT-${companyId}-0001`,
        date: parsed.quoteDate || new Date().toISOString().split("T")[0],
        customer: parsed.customer || "Cliente Comercial",
        customerNit: parsed.customerNit || "",
        customerPhone: parsed.customerPhone || "",
        customerEmail: parsed.customerEmail || "",
        customerAddress: parsed.customerAddress || "",
        validUntil: parsed.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        quoteReference: parsed.quoteReference || "",
        quoteDate: parsed.quoteDate || new Date().toISOString().split("T")[0],
        items: parsedItems,
        totalCost,
        totalProfit,
        profitMarginPercent,
        subtotal: calculatedSub,
        taxAmount: calculatedTax,
        total: calculatedTotal,
        notes: parsed.notes || `Procesado mediante IA desde imagen/documento "${fileName}"`,
        companyId,
        status: "BORRADOR"
      };

      const learningResult = parsed.learning || {
        valoresCotizadosAnalysis: "Precios evaluados y compatibles con tarifas del mercado nacional.",
        tiempoEstimadoEjecucion: "Plazo estándar según disponibilidad de insumos.",
        viabilidadUtilidad: "Margen operativo proyectado superior al 30%.",
        sobrecostos: "Sin riesgo crítico de sobrecostos detectado.",
        imprevistos: "Se aconseja una previsión del 5% para imprevistos."
      };

      res.json({
        success: true,
        isDemo: false,
        estimate: estimateResult,
        data: estimateResult,
        learning: learningResult
      });

    } catch (err: any) {
      if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("Error analyzing quote with Gemini:", err);
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        // La clave existe pero la llamada falló (saturación, red, formato).
        return res.json({
          success: false,
          isDemo: false,
          isError: true,
          errorMessage: "Gemini no pudo procesar el documento en este momento (saturación temporal del modelo). Inténtalo de nuevo en unos segundos."
        });
      }
      // Sin API key: modo demo explícito.
      const fallbackEstimate = simulateOfflineQuote(fileName, companyId);
      res.json({
        success: true,
        isDemo: true,
        estimate: fallbackEstimate,
        data: fallbackEstimate,
        learning: simulateOfflineLearning(fileName, companyId)
      });
    }
  });

  // API Route to analyze a purchase order or supplier document
  app.post("/api/analyze-po", async (req, res) => {
    const { fileName = "documento", fileType = "", fileData, companyId = "WPC", userInstruction } = req.body || {};
    try {
      await requireAuth(req);
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          isDemo: true,
          purchaseOrder: simulateOfflinePO(fileName, companyId)
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const parts: any[] = [];
      const processed = processFileForGemini(fileName, fileType, fileData);

      if (processed) {
        if (processed.type === "text") {
          parts.push({ text: processed.content });
        } else if (processed.type === "inline") {
          parts.push({
            inlineData: {
              mimeType: processed.mimeType,
              data: processed.data
            }
          });
        }
      }

      let basePrompt = `Eres un auditor de compras y adquisiciones de la empresa "${companyId}" en nuestro holding empresarial.
Analiza esta fotografía, cotización de proveedor, presupuesto, factura o documento de insumos/repuestos.
Realiza OCR exhaustivo para extraer todos los ítems, cantidades, costos unitarios, el nombre del proveedor y la referencia del documento original.
Genera una Orden de Compra formal en formato JSON.

El resultado debe ser estrictamente un JSON válido con esta estructura:
{
  "supplier": "Nombre del proveedor o emisor de la cotización",
  "quoteReference": "Referencia, consecutivo, folio o código de la cotización original del proveedor (ej: COT-REF-99)",
  "quoteDate": "Fecha que figure en el documento del proveedor (YYYY-MM-DD)",
  "items": [
    {
      "code": "Código del insumo o repuesto",
      "description": "Descripción del ítem cotizado",
      "quantity": 2,
      "unitCost": 150000,
      "total": 300000
    }
  ],
  "subtotal": 300000,
  "taxAmount": 57000,
  "total": 357000,
  "carrier": "Transportadora sugerida (ej: Servientrega, DHL, Envia)",
  "etaDate": "Fecha estimada de entrega (YYYY-MM-DD)",
  "notes": "Condiciones comerciales, forma de pago o entrega"
}

Importante:
- Lee fotografías y facturas tomadas con celular con precisión de caracteres.
- Calcula los valores numéricos en pesos colombianos (COP).
- Aplica el IVA del 19% sobre el subtotal si aplica.`;

      if (userInstruction) {
        basePrompt += `\n\nINSTRUCCIÓN ADICIONAL DE CONTEXTO DADA POR EL USUARIO: "${userInstruction}". Aplica estrictamente estas pautas al procesar la orden de compra.`;
      }

      parts.push({ text: basePrompt });

      const response = await generateWithRetry(ai, { parts }, {
        responseMimeType: "application/json",
        temperature: 0.1,
      });

      const responseText = response.text || "{}";
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, responseText];
      const cleanedJson = (jsonMatch[1] || responseText).trim();
      const parsed = JSON.parse(cleanedJson || "{}");
      
      const subtotal = parsed.subtotal || parsed.items?.reduce((acc: number, it: any) => acc + ((it.quantity || 1) * (it.unitCost || 0)), 0) || 0;
      const taxAmount = parsed.taxAmount !== undefined ? parsed.taxAmount : Math.round(subtotal * 0.19);
      const total = parsed.total || (subtotal + taxAmount);

      res.json({
        success: true,
        isDemo: false,
        purchaseOrder: {
          id: `ODC-${companyId}-0001`,
          date: parsed.quoteDate || new Date().toISOString().split("T")[0],
          supplier: parsed.supplier || "Proveedor Comercial",
          quoteReference: parsed.quoteReference || "",
          quoteDate: parsed.quoteDate || new Date().toISOString().split("T")[0],
          items: Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : [
            { code: "INS-01", description: `Insumos adquiridos de ${fileName}`, quantity: 1, unitCost: subtotal || 100000, total: subtotal || 100000 }
          ],
          subtotal,
          taxAmount,
          total,
          carrier: parsed.carrier || "Despacho Directo / Transportadora",
          etaDate: parsed.etaDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          notes: parsed.notes || `Orden generada por IA desde imagen/documento "${fileName}"`,
          companyId,
          status: "CREADO"
        }
      });

    } catch (err: any) {
      if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("Error analyzing PO with Gemini:", err);
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        return res.json({
          success: false,
          isDemo: false,
          isError: true,
          errorMessage: "Gemini no pudo procesar el documento en este momento (saturación temporal del modelo). Inténtalo de nuevo en unos segundos."
        });
      }
      res.json({
        success: true,
        isDemo: true,
        purchaseOrder: simulateOfflinePO(fileName, companyId)
      });
    }
  });

  // API Route for AI Advisor powered by Google Gemini
  app.post("/api/ai-expert", async (req, res) => {
    try {
      await requireAuth(req);
      const { prompt, inventory, profits } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "Missing GEMINI_API_KEY in environment variables." });
      }

      // Initialize modern SDK
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0
        }).format(val);
      };

      const systemInstruction = `Eres el Asesor Financiero Contable Senior del holding 'Matriz Holding Maker'.
El holding pertenece a Rafael y Wendy, y opera en Colombia bajo normas de la DIAN y el PUC colombiano (Plan Único de Cuentas).
Subdivisiones:
1. World Parts Company S.A.S. (NIT: 901.341.558-1) - Importación de autopartes (frenos, pastillas Brembo, etc.)
2. Fundación She Maker (NIT: 901.837.241-9) - Programas sociales para mujeres. Donaciones deducibles al 25% directo del impuesto de renta (Art 257 E.T.).
3. Raez Ingeniería S.A.S. (NIT: 901.214.568-1) - Metalmecánica y obras preventivas.
4. Helenamar Turismo e Inmobiliaria (NIT: 900.564.123-7) - Rentas turísticas.

Analiza estos datos actuales del sistema para fundamentar tu consejo:
- Utilidades estimadas: 
  * WPC: ${formatCurrency(profits?.WPC || 0)} COP
  * RAEZ: ${formatCurrency(profits?.RAEZ || 0)} COP
  * HELENAMAR: ${formatCurrency(profits?.HELENAMAR || 0)} COP
- Resumen del inventario actual del holding:
  ${JSON.stringify(inventory || [])}

Responde de forma ejecutiva, altamente analítica y empática con Wendy (Contadora) y Rafael (Administrador). Proporciona consejos contables/estratégicos sumamente útiles sobre:
1. Recomendación de reabastecimiento internacional de Brembo e importaciones óptimas para WPC basado en stock bajo/crítico.
2. Consejos prácticos de planeación fiscal usando la deducibilidad de donaciones de la Fundación (Art 257 ET) para reducir el impuesto neto sobre la renta.
3. Sugerencias concretas para mantener el ledger PUC alineado con la DIAN para emisión de factura electrónica sin errores.

Mantén el estilo profesional, ordenado con viñetas, sin explicaciones técnicas del código del bot, enfocado estrictamente en resultados empresariales.`;

      const response = await generateWithRetry(ai, prompt || "Analiza mi situación del holding actual.", {
        systemInstruction,
        temperature: 0.7,
      });

      res.json({ reply: response?.text || "No se pudo generar respuesta." });
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Error al conectar con el asesor de inteligencia artificial." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
