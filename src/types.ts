/**
 * Types representing Matriz Holding Maker ERP Dashboard Entities and States
 */

export enum UserRole {
  ADMINISTRADOR = "ADMINISTRADOR",
  CONTADOR = "CONTADOR",
  AUXILIAR_CONTABLE = "AUXILIAR_CONTABLE",
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  title?: string;
  lastLogin: string;
  isActive: boolean;
}

export type TransactionType = "VENTA" | "COMPRA" | "GASTO" | "RECAUDO" | "PAGO";
export type TransactionStatus = "BORRADOR" | "CONTABILIZADO" | "ANULADO";

export interface Transaction {
  id: string;
  date: string; // ISO String or Date string
  type: TransactionType;
  amount: number;
  customerSupplier: string;
  description: string;
  category: string;
  status: TransactionStatus;
  account: string;
  companyId: "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR";
}

export interface FinancialMetric {
  ventas: number;
  compras: number;
  gastos: number;
  flujoCaja: number;
  cuentasPorCobrar: number;
  cuentasPorPagar: number;
  inventario: number;
  ebitda: number;
  margenUtilidad: number; // percentage (e.g., 24.5)
}

export interface Notification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "ALERT" | "SUCCESS";
  read: boolean;
  metricAffected?: string;
  companyId?: string;
}

export interface ThresholdSetting {
  id: string;
  metricName: string;
  displayName: string;
  operator: "GREATER_THAN" | "LESS_THAN";
  value: number;
  enabled: boolean;
}

export interface ChartDataPoint {
  period: string; // e.g. "Ene", "Feb", etc.
  ventas: number;
  gastos: number;
  flujo: number;
  inventario: number;
}

// HOLDING SUB-COMPANIES
export interface HoldingCompany {
  id: "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR";
  name: string;
  nit: string;
  description: string;
  primaryColor: string;
  accentColor: string;
}

// INVENTORY SYSTEM
export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  productLine: string; // WPC specific product line (e.g. "Frenos", "Filtros")
  quantity: number;
  unit: string;
  unitCost: number;
  unitPrice: number;
  status: "SUFICIENTE" | "STOCK_BAJO" | "CRITICO";
  location: string;
  companyId: "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR";
  lastUpdated: string;
  // Extended fields for holding and classification tracking
  unitCostReal?: number;
  unitPriceB2B?: number;
  unitPriceB2C?: number;
  productClassification?: string; // internal product classification
}

export type InventoryTxType = 
  | "ENTRADA_COMPRA" 
  | "ENTRADA_INICIAL" 
  | "SALIDA_VENTA" 
  | "SALIDA_DEFECTO" 
  | "SALIDA_MUESTREO" 
  | "SALIDA_PERDIDA"
  | "STOCK_BODEGA"     // Bodega internal stock movement
  | "STOCK_CLIENTES";   // Consignment/client stock

export interface InventoryHistoryEntry {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  date: string;
  type: InventoryTxType;
  quantity: number;
  user: string;
  description: string;
  companyId: "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR";
  // Track who is responsible for the movement and customized value
  responsiblePerson?: string;
  movementValue?: number;
}

// ESTIMATES (COTIZACIONES)
export interface EstimateItem {
  code: string;
  description: string;
  quantity: number;
  unitCost?: number;          // Costo base / adquisición unitario
  profitMarginPercent?: number; // % Margen de utilidad asignado
  profitAmount?: number;      // Utilidad monetaria unitaria
  unitPrice: number;          // Precio final de venta unitario
  total: number;              // Subtotal de venta de la línea (quantity * unitPrice)
}

export interface Estimate {
  id: string;
  date: string;
  customer: string;
  customerNit?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  validUntil: string;
  items: Array<{
    code: string;
    description: string;
    quantity: number;
    unitCost?: number;
    profitMarginPercent?: number;
    profitAmount?: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number; // 19% IVA commonly
  total: number;
  totalCost?: number;   // Costo base total acumulado
  totalProfit?: number; // Utilidad total generada antes de IVA
  profitMarginPercent?: number; // % de margen global efectivo
  status: "BORRADOR" | "ENVIADO" | "ACEPTADO" | "VENCIDO";
  companyId: "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR";
  notes?: string;
  quoteReference?: string; // Reference of provider quote loaded
  quoteDate?: string;      // Modification or creation date of quote loaded
  responsiblePerson?: string; // Responsible person managing request
}

// PURCHASE ORDERS (ORDENES DE COMPRA)
export interface PurchaseOrder {
  id: string;
  date: string;
  supplier: string;
  companyId: "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR";
  items: Array<{
    code: string;
    description: string;
    quantity: number;
    unitCost: number;
    total: number;
  }>;
  subtotal?: number;     // Subtotal before tax
  taxAmount?: number;    // IVA 19%
  total: number;
  status: "CREADO" | "EN_TRANSITO" | "RECIBIDO" | "CANCELADO";
  trackingNumber?: string;
  etaDate?: string;
  carrier?: string;
  notes?: string;
  quoteReference?: string; // Reference of provider quote loaded
  quoteDate?: string;      // Modification or creation date of quote loaded
  responsiblePerson?: string; // Responsible person managing request
}

// SERVICE ORDERS (ORDENES DE SERVICIO)
export interface ServiceOrder {
  id: string;
  date: string;
  customer: string;
  assignedTo: string;
  description: string;
  priority: "BAJA" | "MEDIA" | "ALTA";
  status: "PROGRAMADO" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO";
  notes?: string;
  cost: number;
  price: number;
  scheduledDate: string;
  completedDate?: string;
  companyId: "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR";
}

// PROPERTY OCCUPANCY (HELENAMAR TURISMO E INMOBILIARIA)
export interface Property {
  id: string;
  name: string;
  address: string;
  value: number; // patrimonio valuation
  occupancyStatus: "DISPONIBLE" | "ALQUILADO_CORTO" | "ALQUILADO_LARGO" | "MANTENIMIENTO";
  tenantName?: string;
  rentIncomeAmount?: number; // monthly or per booking
  lastCleaningDate: string;
  maintenanceStatus: "EXCELENTE" | "REQUIERE_LIMPIEZA" | "MANTENIMIENTO_PENDIENTE" | "CRITICO";
  nextMaintenanceDate?: string;
  cleaningHistory: Array<{
    date: string;
    responsible: string;
    cost: number;
    notes?: string;
  }>;
  maintenanceHistory: Array<{
    id?: string;
    date: string;
    description: string;
    cost: number;
    responsible: string;
    type?: string;
    status?: "PENDIENTE" | "COMPLETADO";
    attachedQuoteName?: string;
  }>;
}

// FOUNDATION PROGRAMS (SHE MAKER)
export interface FundacionProgram {
  id: string;
  name: string;
  objective: string;
  status: "PLANIFICACION" | "CONVOCATORIA" | "EN_DESARROLLO" | "COMPLETADO";
  targetBeneficiaries: number;
  currentBeneficiaries: number;
  budgetAllocated: number;
  currentExpenses: number;
  associatedExpenses: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    category: string;
  }>;
}

// DONATIONS TRACKER
export interface Donation {
  id: string;
  date: string;
  fromCompanyId: "WPC" | "RAEZ" | "HELENAMAR";
  amount: number;
  legalReceiptNumber: string;
  taxDiscountValue: number; // 25% under Art 257 ET Colombia
}
