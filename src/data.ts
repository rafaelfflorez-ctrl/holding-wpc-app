import { 
  UserRole, 
  UserProfile, 
  Transaction, 
  ThresholdSetting, 
  ChartDataPoint, 
  Notification,
  HoldingCompany,
  InventoryItem,
  Property,
  FundacionProgram,
  PurchaseOrder,
  ServiceOrder,
  Estimate
} from "./types";

import wendyAvatar from "./assets/images/wendy_colpas_avatar_1784690319150.jpg";

// Extended Colombian PUC (Plan Único de Cuentas) Accounts
export const PUC_ACCOUNTS = [
  // ACTIVO
  { code: "110505", name: "Caja General (Activo - Caja)" },
  { code: "111005", name: "Bancos Nacionales (Activo - Efectivo)" },
  { code: "130505", name: "Clientes Nacionales (Activo - Cartera)" },
  { code: "135515", name: "Retención en la Fuente a Favor (Activo)" },
  { code: "143501", name: "Mercancías de Importación - WPC Autopartes (Activo)" },
  { code: "143505", name: "Mercancías en Tránsito de Importación (Activo)" },
  { code: "151605", name: "Edificaciones e Inmuebles - Helenamar Inmobiliaria (Activo)" },
  { code: "152405", name: "Herramientas y Maquinaria Técnica - Raez (Activo)" },
  // PASIVO
  { code: "220505", name: "Proveedores Nacionales (Pasivo)" },
  { code: "221005", name: "Proveedores del Exterior - Importaciones WPC (Pasivo)" },
  { code: "233550", name: "Costos y Gastos por Pagar - Servicios (Pasivo)" },
  { code: "236540", name: "Retención en la Fuente por Pagar (Pasivo)" },
  { code: "240805", name: "Impuesto Sobre las Ventas (IVA) por Pagar 19% (Pasivo)" },
  // PATRIMONIO
  { code: "311505", name: "Aportes Sociales (Patrimonio)" },
  { code: "360505", name: "Utilidad del Ejercicio Contable (Patrimonio)" },
  // INGRESOS
  { code: "413505", name: "Ingresos Venta Autopartes WPC (Ingresos - Comercio)" },
  { code: "415005", name: "Ingresos Arrendamientos y Turismo Helenamar (Ingresos)" },
  { code: "413005", name: "Ingresos Contratos de Ingeniería Raez (Ingresos)" },
  { code: "480505", name: "Donaciones Recibidas - Fundación She Maker (Ingresos No Operacionales)" },
  // GASTOS
  { code: "510506", name: "Sueldos y Salarios de Personal (Gastos)" },
  { code: "519530", name: "Gastos de Servicios Públicos e Internet (Gastos)" },
  { code: "519580", name: "Pérdidas y Castigos de Inventario (Otros Gastos)" },
  { code: "512010", name: "Gastos de Mantenimiento y Aseo Propiedades Helenamar (Gastos)" },
  { code: "519595", name: "Gastos Sociales y Programas de Beneficencia - Fundación (Gastos)" },
  { code: "530505", name: "Gastos Financieros e Impuestos Gravámenes GMF 4x1000 (Gastos)" },
  // COSTOS
  { code: "613505", name: "Costo de Ventas - Autopartes Importadas WPC (Costos)" },
  { code: "613005", name: "Costo de Servicios de Ingeniería Raez (Costos)" }
];

// Defined Holding Companies
export const HOLDING_COMPANIES: HoldingCompany[] = [
  {
    id: "WPC",
    name: "World Parts Company S.A.S.",
    nit: "901.341.558-1",
    description: "Suministros e importaciones de productos de alta calidad.",
    primaryColor: "indigo",
    accentColor: "blue"
  },
  {
    id: "FUNDACION",
    name: "Fundación She Maker",
    nit: "901.837.241-9",
    description: "Programas sociales, empoderamiento femenino, educación tecnológica y maker.",
    primaryColor: "pink",
    accentColor: "rose"
  },
  {
    id: "RAEZ",
    name: "Raez Ingeniería S.A.S.",
    nit: "901.214.568-1",
    description: "Servicios de ingeniería, mantenimiento industrial, mecanizado y proyectos técnicos.",
    primaryColor: "amber",
    accentColor: "orange"
  },
  {
    id: "HELENAMAR",
    name: "Helenamar Turismo e Inmobiliaria",
    nit: "900.564.123-7",
    description: "Gestión de propiedades turísticas, alquileres, corretaje y mantenimiento de inmuebles.",
    primaryColor: "emerald",
    accentColor: "teal"
  }
];

// Pre-registered users: Wendy Colpas (Administradora / Directora Administrativa), Rafael Olarte (Gerente General)
export const INITIAL_USERS: UserProfile[] = [
  {
    id: "u-wendy",
    name: "Wendy Colpas",
    email: "logisticawpc@gmail.com",
    role: UserRole.ADMINISTRADOR,
    title: "Directora Administrativa del Holding",
    avatar: wendyAvatar,
    lastLogin: "2026-07-21T20:18:00-05:00",
    isActive: true,
  },
  {
    id: "u-rafael",
    name: "Rafael Olarte",
    email: "rafael.olarte@holdingmaker.com",
    role: UserRole.ADMINISTRADOR,
    title: "Gerente General del Holding",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    lastLogin: "2026-07-20T12:00:00-05:00",
    isActive: true,
  },
  {
    id: "u-3",
    name: "Carlos Mario Ortiz",
    email: "carlos.auxiliar@holdingmaker.com",
    role: UserRole.AUXILIAR_CONTABLE,
    title: "Auxiliar Contable",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    lastLogin: "2026-07-19T08:00:00-05:00",
    isActive: true,
  },
];

// Real ledger transactions, segmented by holding company
export const INITIAL_TRANSACTIONS: Transaction[] = [];

// Initial real stock for WPC Autopartes
export const INITIAL_INVENTORY: InventoryItem[] = [];

// Initial Real Properties Database for Helenamar
export const INITIAL_PROPERTIES: Property[] = [];

// Initial Foundation Programs for She Maker
export const INITIAL_PROGRAMS: FundacionProgram[] = [];

// Initial Estimates (Cotizaciones)
export const INITIAL_ESTIMATES: Estimate[] = [];

// Initial Purchase Orders (Órdenes de Compra)
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];

// Initial Service Orders (Órdenes de Servicio)
export const INITIAL_SERVICE_ORDERS: ServiceOrder[] = [];

export const INITIAL_THRESHOLDS: ThresholdSetting[] = [
  {
    id: "TS-1",
    metricName: "flujoCaja",
    displayName: "Caja Mínima Holding Requerida",
    operator: "LESS_THAN",
    value: 1000000,
    enabled: true,
  },
  {
    id: "TS-2",
    metricName: "margenUtilidad",
    displayName: "Margen Neto Holding Objetivo",
    operator: "LESS_THAN",
    value: 22,
    enabled: true,
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n-1",
    timestamp: new Date().toISOString(),
    title: "Sistema Limpio y Preparado",
    message: "Base de datos inicializada limpia. Lista para cargar la información de cada empresa del holding.",
    type: "SUCCESS",
    read: false,
  }
];

export const HISTORIC_CHART_DATA: ChartDataPoint[] = [];
