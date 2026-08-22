import { Transaction, InventoryItem } from "../types";

/**
 * Módulo ÚNICO de cálculos financieros del Holding.
 * Todas las tarjetas, gráficos y reportes deben usar estas funciones
 * para evitar las fórmulas divergentes que existían antes.
 */

export const IVA_RATE = 0.19;

// Ratio de costo de ventas usado SOLO cuando no hay costo real trazable.
// En el futuro debe salir de la contabilidad de costos real (costo de inventario vendido).
export const DEFAULT_COST_OF_SALES_RATIO = 0.6;

export interface LedgerTotals {
  ventas: number;
  compras: number;
  gastos: number;
  recaudos: number;
  pagos: number;
}

export function sumLedger(transactions: Transaction[], companyId?: string): LedgerTotals {
  const totals: LedgerTotals = { ventas: 0, compras: 0, gastos: 0, recaudos: 0, pagos: 0 };
  transactions.forEach((tx) => {
    if (tx.status !== "CONTABILIZADO") return;
    if (companyId && tx.companyId !== companyId) return;
    switch (tx.type) {
      case "VENTA":
        totals.ventas += tx.amount;
        break;
      case "COMPRA":
        totals.compras += tx.amount;
        break;
      case "GASTO":
        totals.gastos += tx.amount;
        break;
      case "RECAUDO":
        totals.recaudos += tx.amount;
        break;
      case "PAGO":
        totals.pagos += tx.amount;
        break;
    }
  });
  return totals;
}

/** Valor del inventario real a costo unitario (unitCostReal ?? unitCost). */
export function inventoryValue(inventory: InventoryItem[], companyId?: string): number {
  return inventory
    .filter((it) => !companyId || it.companyId === companyId)
    .reduce((sum, it) => sum + (it.quantity || 0) * (it.unitCostReal ?? it.unitCost ?? 0), 0);
}

export interface FinancialMetricsResult {
  ventas: number;
  compras: number;
  gastos: number;
  flujoCaja: number;
  cuentasPorCobrar: number;
  cuentasPorPagar: number;
  inventario: number;
  ebitda: number;
  margenUtilidad: number;
}

/**
 * Métricas consolidadas del holding.
 * - flujoCaja = recaudos - pagos - gastos (caja real)
 * - inventario = valor del inventario físico real (no una heurística de compras)
 * - ebitda = ventas - costoDeVenta - gastos (sin clamp: se muestran pérdidas reales)
 */
export function computeMetrics(transactions: Transaction[], inventory: InventoryItem[]): FinancialMetricsResult {
  const totals = sumLedger(transactions);
  const ventas = totals.ventas;
  const costoVentas = ventas * DEFAULT_COST_OF_SALES_RATIO;
  const ebitda = ventas - costoVentas - totals.gastos;
  const margenUtilidad = ventas > 0 ? (ebitda / ventas) * 100 : 0;

  return {
    ventas,
    compras: totals.compras,
    gastos: totals.gastos,
    flujoCaja: totals.recaudos - totals.pagos - totals.gastos,
    cuentasPorCobrar: ventas - totals.recaudos,
    cuentasPorPagar: totals.compras - totals.pagos,
    inventario: inventoryValue(inventory),
    ebitda,
    margenUtilidad,
  };
}

export type CompanyId = "WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR";

/**
 * Utilidad comercial por empresa (estado de resultados simplificado).
 * Uniforme para todas las empresas: utilidad = ventas - compras - gastos.
 * RECAUDO/PAGO afectan caja, no utilidad.
 */
export function computeCompanyProfits(transactions: Transaction[]): Record<CompanyId, number> {
  const ids: CompanyId[] = ["WPC", "FUNDACION", "RAEZ", "HELENAMAR"];
  const out = {} as Record<CompanyId, number>;
  ids.forEach((id) => {
    const t = sumLedger(transactions, id);
    out[id] = t.ventas - t.compras - t.gastos;
  });
  return out;
}

/** Escapa un campo para CSV (comillas, punto y coma, saltos de línea). */
export function csvEscape(value: any): string {
  const s = String(value ?? "");
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
