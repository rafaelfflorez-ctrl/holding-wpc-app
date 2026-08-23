# Matriz Maker Holding - Manual de Usuario

**Plataforma:** Control General Holding WPC  
**URL para compartir (producción):** **https://holding-wpc-log.ai.studio**  
> Funciona en cualquier dispositivo (PC, tablet, móvil) y es instalable como App (PWA). Requiere login.

---

## 1. Acceso

**Link:** https://holding-wpc-log.ai.studio

**Cuenta administradora inicial:**
- **Usuario:** `logisticawpc@gmail.com`
- **Contraseña:** `WpcLog!2026`
- **Rol:** `ADMINISTRADOR` (acceso total)

**Crear más usuarios:** `Gestión de Roles` -> *Agregar Usuario* (solo ADMIN) -> define email, contraseña, rol y título. El nuevo usuario entra con esas credenciales en cualquier dispositivo.

**Roles:**
- **ADMINISTRADOR:** todo (contabilizar, anular, borrar físico, umbrales, usuarios, recibir O.C.).
- **CONTADOR:** registra y contabiliza/anula, no borra físico ni toca umbrales.
- **AUXILIAR_CONTABLE:** solo crea en `BORRADOR`.

**Cambiar tu contraseña:** `Gestión de Roles` -> tu tarjeta -> *Cambiar contraseña*.

---

## 2. Qué puedes hacer (por módulo)

### Tablero de Control (KPI)
- Métricas consolidadas: ventas, compras, gastos, flujo de caja (`recaudos-pagos-gastos`), cartera, proveedores, inventario **real**, EBITDA y margen.
- Gráficos solo con datos reales (sin valores inventados).
- Alertas si un KPI cruza su umbral.

### WPC Autopartes - Inventario, Cotizaciones y Órdenes de Compra
- **Stock:** buscar/filtrar, codificar producto, cargar Excel/CSV, registrar movimientos (entrada, venta, consignación, defectuoso/muestra/pérdida con cuenta `519580`).
- **Cotizaciones:** crear manual (costo->margen->precio), cargar PDF/Excel/foto con IA (Gemini), editar en vivo (costos/márgenes), exportar PDF con IVA. Inputs "Referencia" y "Responsable" ya operativos.
- **Órdenes de Compra:** crear manual o vía IA, ver subtotal/IVA/total cuadrados, editar, **Marcar Recibida** (contabiliza compra).

### Fundación She Maker - Programas y Donaciones (Art. 257 E.T.)
- Crear programas, registrar beneficiarios y gastos (cuenta `519595`).
- **Donaciones:** registra aporte de WPC/RAEZ/HELENAMAR -> calcula descuento 25% con **tope 30% renta líquida** (evita doble beneficio). Genera **Certificado DIAN** con firma.

### Raez Ingeniería - Proyectos
- Cotizaciones/órdenes de servicio, validación de precio (evita NaN), seguimiento de hitos.

### Helenamar - Inmobiliaria
- Portafolio, ocupación, costos de mantenimiento, historial colapsable. Cotizaciones de mantenimiento vía IA sin datos aleatorios.

### Asesor Contable IA
- Chat con contexto real (utilidades + inventario). Ahora corre con **Groq `groq/compound`** (gratis, sin cuota diaria de Gemini) y limpia bloques `<think>`. Badge muestra el proveedor activo.

### Operaciones & PUC
- Libro diario con PUC colombiano (1105 Caja, 1305 Clientes, 4135 Comercio, etc.). Cambiar estado `BORRADOR->CONTABILIZADO->ANULADO`, eliminar (solo ADMIN).

### Facturación DIAN (nuevo)
- **Pestaña Facturación DIAN:** arrastra XML UBL 2.1, extrae NIT/fecha/total/IVA, previsualiza y **Importar como asiento borrador**. Stub listo para CUFE y Open Banking.

### Reportes & Balances
- **Estado de Resultados, Balance General (cuadrado: Activo = Pasivo+Patrimonio con inventario real), Libro Mayor PUC** por empresa o consolidado. Exporta CSV (escapado) e imprime PDF.
- Fechas por defecto al mes en curso; NIT dinámico por empresa.

### Gestión de Roles / Límites de KPI
- Alta/edición de usuarios, activación, cambio de rol (vía servidor, solo ADMIN), auditoría básica.

---

## 3. Instalación como App (PWA)

En móvil/PC con Chrome/Edge: abre el link -> menú ⋮ -> **Instalar app / Agregar a pantalla de inicio**. Manifest y icono (`icon.svg`) incluidos; service worker se activará en la próxima versión estable.

---

## 4. Datos y seguridad

- **Persistencia en la nube (Supabase):** todo (transacciones, inventario, Kardex, cotizaciones, O.C., inmuebles, programas, donaciones, umbrales, notificaciones, auditoría) se guarda en `app_data` y se sincroniza entre dispositivos.
- **Rutas `/api/*` protegidas:** exigen Bearer token de Supabase; `create-user/update-user` solo ADMIN. Rate limit 30 req/min en IA.
- **RLS:** `users` no escribible desde el navegador (solo servidor).
- **Auditoría:** `auditLog` registra creaciones/cambios de asientos y usuarios.

---

## 5. Compartir

Envía el link + credenciales. Cada persona inicia sesión con su cuenta; el acceso está restringido al equipo (aunque el link sea público, sin login no se ve nada).

**Soporte:** Si ves `401` en IA, es falta de login; si ves `429`, es cuota temporal (espera ~1 min). Para dudas de despliegue, el repo es `github.com/rafaelfflorez-ctrl/holding-wpc-app`.
