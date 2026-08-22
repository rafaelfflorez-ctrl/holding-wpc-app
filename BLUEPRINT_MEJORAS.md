# BLUEPRINT — CONTROL GENERAL HOLDING WPC (versión mejorada)

Proyecto base: export de Google AI Studio (`matriz-maker-holding`).
App publicada (original, sin mejoras): `https://holding-wpc-log.ai.studio`
Versión mejorada local: `C:\Users\user\Downloads\matriz-maker-holding`

---

## 1. Qué se hizo (resumen)

La versión original era una demo en memoria: sin persistencia, sin login real, con
datos inventados en los gráficos y fallbacks de IA que fabricaban datos falsos.
La versión mejorada agrega: persistencia en la nube (Supabase), autenticación real,
cálculos financieros unificados y corrección de bugs contables/IA.

## 2. Infraestructura (ya configurada, fuera del código)

| Recurso | Valor |
|---|---|
| Supabase project ref | `tmkuouartocffttvivjh` |
| Supabase URL | `https://tmkuouartocffttvivjh.supabase.co` |
| Admin (Supabase Auth) | `logisticawpc@gmail.com` / `WpcLog!2026` — rol `ADMINISTRADOR` |
| Schema | `supabase/schema.sql` (ejecutado: tablas, RLS, seed, auto-alta del admin) |
| Modelo Gemini | `gemini-3.6-flash` (el 3.7 daba 503 por saturación) |
| Fallbacks Gemini | `gemini-3.7-flash`, `gemini-flash-latest` |

Secrets necesarios (AI Studio Secrets o `.env.local`):
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
GEMINI_MODEL                 (opcional)
GEMINI_FALLBACK_MODELS       (opcional)
```

## 3. Cambios de código (por archivo)

### Nueva capa de datos y autenticación
- `src/lib/supabase.ts` — cliente Supabase + `fetchConfig()` desde `/api/config`.
- `src/hooks/useHoldingData.ts` — estado global: sesión, carga de `app_data` desde
  Supabase, persistencia automática (debounce 700 ms), login/logout, `createUserAccount`.
- `src/components/LoginScreen.tsx` — pantalla de login (email+password) + aviso si
  Supabase no está configurado.
- `src/utils/finance.ts` — MÓDULO ÚNICO de cálculo (EBITDA, flujo, inventario real,
  utilidades por empresa, IVA, `csvEscape`). Todas las tarjetas/reportes lo usan.
- `src/utils/sequenceCounters.ts` — sin cambios (ya persistía contadores).

### Servidor (`server.ts`)
- `dotenv` lee `.env.local`.
- `GET /api/config` — expone URL/anon/hasGemini/hasServiceRole/modelo.
- `POST /api/auth/create-user` — crea Auth user + perfil (usa service role).
- `GEMINI_MODEL` + `GEMINI_FALLBACK_MODELS` configurables por env.
- `generateWithRetry()` — reintenta y prueba modelos alternos ante 503/404.
- Distingue errores: `isDemo` (sin clave) vs `isError` (modelo saturado).
- NITs canónicos en el prompt del asesor.

### App principal (`src/App.tsx`)
- Reemplaza todos los `useState` por el hook `useHoldingData` (datos en la nube).
- Compuerta de login: sin sesión → `LoginScreen`; logout en header desktop y móvil.
- Indicador de sincronización ("Cloud OK / Guardando / Error").
- Gráficos SOLO con datos reales (se eliminan valores inventados 48M/32M/12.5M).
- `Math.max(0,...)` eliminado de métricas (se muestran pérdidas reales).
- Alarmas de umbral: no se disparan con el sistema vacío.

### Panel comercial (`CommercialProcurementHub.tsx`)
- **O.C. manuales con IVA**: `subtotal + IVA(19%) = total` (antes el total no incluía IVA).
- **PDF de O.C.**: total correcto con IVA; paginación al exceder la página.
- **PDF de cotización**: nota corregida ("los precios NO incluyen IVA"), paginación.
- Fallbacks de IA → **MODO DEMO honesto** (confirmación + etiqueta, sin datos falsos).
  Errores reales del modelo → mensaje claro sin flujo demo.
- NITs canónicos por empresa. Inputs "Referencia" y "Responsable" ahora funcionan.
- Botón **"Marcar Recibida"** en O.C. (contabiliza la compra).
- Se eliminan `simulateOfflineQuote/PO` y imports sin uso.

### Inventario (`WpcInventoryPanel.tsx`)
- O.C. y cotizaciones con IVA redondeado (`Math.round`).
- Bajas de inventario contabilizadas en cuenta PUC correcta (`519580`), no "Servicios".
- Exportación CSV con escaping de comas/comillas.
- NITs canónicos en PDF y encabezado.

### Fundación (`SheMakerFoundationPanel.tsx`)
- **Donaciones Art 257 ET corregidas**: ya NO se registra como GASTO en el donante
  (era doble beneficio). Solo descuento 25% sobre impuesto, con **tope del 30%** de la
  renta líquida. NITs canónicos en el certificado. Cuenta PUC de gasto social (`519595`).

### Reportes (`ReportsPanel.tsx`)
- Usa `finance.ts` (un solo ratio de costo de venta en todo el sistema).
- CSV con escaping; fechas por defecto al mes en curso; NIT dinámico por empresa.

### Roles (`RoleManagement.tsx`)
- Crea usuarios con contraseña (usa `/api/auth/create-user`).
- Sin suplantación de sesión; aviso de autenticación real en la nube.

### Otros
- `AiAdvisorPanel.tsx`: badge genérico "ASISTENTE CON GEMINI".
- `HelenamarRealEstatePanel.tsx`: elimina costos/proveedores aleatorios en fallback.
- `RaezEngineeringPanel.tsx`: valida precio (evita NaN) + ID único.
- `data.ts`: cuenta PUC `519595` descrita correctamente; agrega `519580`.
- `supabase/schema.sql`: setup único re-ejecutable + auto-alta del primer ADMIN.

## 4. Cómo republicar en AI Studio (vía GitHub — recomendado)

El código mejorado YA está en GitHub (privado):
**`https://github.com/rafaelfflorez-ctrl/holding-wpc-app`** (rama `master`).

1. En AI Studio, abre tu app (`aistudio.google.com/apps/327086c2-...`).
2. Conecta/importa el código desde el repo de GitHub (Build → conectar repo, o crea
   el app desde el repo). Los push a `master` despliegan automáticamente.
3. En los **Secrets** del app pega las 5 variables de la sección 2.
4. Publicar/Deploy. El link (`https://holding-wpc-log.ai.studio` u otro) servirá la
   versión mejorada.

Alternativa de host permanente si no se usa AI Studio: Render/Railway/Fly con el mismo
`npm run build` + `node dist/server.cjs`, o Cloud Run.

## 5. Estado actual (demo en vivo)

Túnel temporal (versión mejorada corriendo localmente): se indicó en conversación.
Requiere la PC encendida; sirve solo para pruebas mientras se define el host final.
