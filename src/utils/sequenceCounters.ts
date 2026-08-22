// Utility to track and persist sequential counters for Purchase Orders (ODC) and Quotations (COT)

const ODC_COUNTER_KEY = "wpc_odc_counters_v3";
const COT_COUNTER_KEY = "wpc_cot_counters_v3";

function getStoredCounters(key: string): Record<string, number> {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to read counter from localStorage", e);
  }
  return { WPC: 1, RAEZ: 1, HELENAMAR: 1, FUNDACION: 1 };
}

function saveStoredCounters(key: string, counters: Record<string, number>) {
  try {
    localStorage.setItem(key, JSON.stringify(counters));
  } catch (e) {
    console.error("Failed to save counter to localStorage", e);
  }
}

/**
 * Generates next sequential Purchase Order ID (e.g. ODC-WPC-0001, ODC-WPC-0002)
 */
export function generateNextODCId(companyId: string = "WPC"): string {
  const normCompany = (companyId || "WPC").toUpperCase();
  const counters = getStoredCounters(ODC_COUNTER_KEY);
  const currentCount = counters[normCompany] ?? 1;

  const padded = String(currentCount).padStart(4, "0");
  const id = `ODC-${normCompany}-${padded}`;

  counters[normCompany] = currentCount + 1;
  saveStoredCounters(ODC_COUNTER_KEY, counters);

  return id;
}

/**
 * Generates next sequential Quotation / Estimate ID (e.g. COT-WPC-0001, COT-WPC-0002)
 */
export function generateNextCOTId(companyId: string = "WPC"): string {
  const normCompany = (companyId || "WPC").toUpperCase();
  const counters = getStoredCounters(COT_COUNTER_KEY);
  const currentCount = counters[normCompany] ?? 1;

  const padded = String(currentCount).padStart(4, "0");
  const id = `COT-${normCompany}-${padded}`;

  counters[normCompany] = currentCount + 1;
  saveStoredCounters(COT_COUNTER_KEY, counters);

  return id;
}

/**
 * Resets counters back to 1 for all companies
 */
export function resetSequenceCounters() {
  const initial = { WPC: 1, RAEZ: 1, HELENAMAR: 1, FUNDACION: 1 };
  saveStoredCounters(ODC_COUNTER_KEY, initial);
  saveStoredCounters(COT_COUNTER_KEY, initial);
}

