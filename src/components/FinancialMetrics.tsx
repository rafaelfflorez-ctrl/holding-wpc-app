import { FinancialMetric, ThresholdSetting } from "../types";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  TrendingUp as CashIcon, 
  Users, 
  ShoppingBag, 
  AlertTriangle, 
  Briefcase, 
  Receipt,
  Layers
} from "lucide-react";

interface FinancialMetricsProps {
  metrics: FinancialMetric;
  thresholds: ThresholdSetting[];
}

export default function FinancialMetrics({ metrics, thresholds }: FinancialMetricsProps) {
  const formatCOP = (num: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getMetricThresholdAlert = (metricName: keyof FinancialMetric) => {
    const threshold = thresholds.find(t => t.metricName === metricName && t.enabled);
    if (!threshold) return null;

    const value = metrics[metricName];
    let isTriggered = false;
    if (threshold.operator === "LESS_THAN") {
      isTriggered = value < threshold.value;
    } else if (threshold.operator === "GREATER_THAN") {
      isTriggered = value > threshold.value;
    }

    if (isTriggered) {
      return {
        message: `${threshold.displayName}: ${threshold.operator === "LESS_THAN" ? "Menor a" : "Mayor a"} ${formatCOP(threshold.value)}`,
        value: threshold.value,
        operator: threshold.operator
      };
    }
    return null;
  };

  const metricCards = [
    {
      id: "metric-ventas",
      title: "Ventas Totales (Mes)",
      value: metrics.ventas,
      key: "ventas" as keyof FinancialMetric,
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      darkColor: "text-emerald-400 bg-emerald-950/40 border-emerald-900/30",
      description: "Ingresos consolidados facturados",
      isCurrency: true,
      trend: "+12.4% vs mes anterior",
      trendUp: true,
    },
    {
      id: "metric-compras",
      title: "Compras & Costos",
      value: metrics.compras,
      key: "compras" as keyof FinancialMetric,
      icon: ShoppingBag,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      darkColor: "text-amber-400 bg-amber-950/40 border-amber-900/30",
      description: "Adquisición de mercancías",
      isCurrency: true,
      trend: "+3.2% vs mes anterior",
      trendUp: false,
    },
    {
      id: "metric-gastos",
      title: "Gastos Operacionales",
      value: metrics.gastos,
      key: "gastos" as keyof FinancialMetric,
      icon: Receipt,
      color: "text-rose-600 bg-rose-50 border-rose-100",
      darkColor: "text-rose-400 bg-rose-950/40 border-rose-900/30",
      description: "Gastos de admin, ventas y servicios",
      isCurrency: true,
      trend: "-1.5% vs mes anterior",
      trendUp: true, // means decreased, which is good
    },
    {
      id: "metric-flujo",
      title: "Flujo de Caja Neto",
      value: metrics.flujoCaja,
      key: "flujoCaja" as keyof FinancialMetric,
      icon: CashIcon,
      color: "text-sky-600 bg-sky-50 border-sky-100",
      darkColor: "text-sky-400 bg-sky-950/40 border-sky-900/30",
      description: "Efectivo disponible en bancos y caja",
      isCurrency: true,
      trend: "+8.7% vs mes anterior",
      trendUp: true,
    },
    {
      id: "metric-cartera",
      title: "Cuentas por Cobrar (Cartera)",
      value: metrics.cuentasPorCobrar,
      key: "cuentasPorCobrar" as keyof FinancialMetric,
      icon: Users,
      color: "text-violet-600 bg-violet-50 border-violet-100",
      darkColor: "text-violet-400 bg-violet-950/40 border-violet-900/30",
      description: "Saldos pendientes de clientes",
      isCurrency: true,
      trend: "Promedio cobro: 28 días",
      trendUp: true,
    },
    {
      id: "metric-proveedores",
      title: "Cuentas por Pagar (Proveedores)",
      value: metrics.cuentasPorPagar,
      key: "cuentasPorPagar" as keyof FinancialMetric,
      icon: Briefcase,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
      darkColor: "text-indigo-400 bg-indigo-950/40 border-indigo-900/30",
      description: "Obligaciones corrientes adquiridas",
      isCurrency: true,
      trend: "Vencimiento prom: 15 días",
      trendUp: false,
    },
    {
      id: "metric-inventario",
      title: "Inventario de Mercancía",
      value: metrics.inventario,
      key: "inventario" as keyof FinancialMetric,
      icon: Layers,
      color: "text-teal-600 bg-teal-50 border-teal-100",
      darkColor: "text-teal-400 bg-teal-950/40 border-teal-900/30",
      description: "Valorización de stock disponible",
      isCurrency: true,
      trend: "Rotación stock: 4.2 veces/año",
      trendUp: true,
    },
    {
      id: "metric-margen",
      title: "Margen de Utilidad",
      value: metrics.margenUtilidad,
      key: "margenUtilidad" as keyof FinancialMetric,
      icon: DollarSign,
      color: "text-blue-600 bg-blue-50 border-blue-100",
      darkColor: "text-blue-400 bg-blue-950/40 border-blue-900/30",
      description: "Margen neto después de costos y gastos",
      isCurrency: false,
      trend: "+2.1% vs mes anterior",
      trendUp: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="financial-metrics-container">
      {metricCards.map((card) => {
        const alert = getMetricThresholdAlert(card.key);
        const IconComponent = card.icon;

        return (
          <div 
            key={card.id} 
            id={card.id}
            className={`p-4 bg-white rounded-xl border border-slate-100 shadow-xs transition-all hover:shadow-md flex flex-col justify-between relative overflow-hidden ${alert ? 'ring-2 ring-red-500/20 border-red-200' : ''}`}
          >
            {/* Alert Background Indicator */}
            {alert && (
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
            )}

            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.title}</p>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mt-1 font-mono">
                  {card.isCurrency ? formatCOP(card.value) : `${card.value.toFixed(1)}%`}
                </h3>
              </div>
              <div className={`p-2 rounded-lg border ${card.color}`}>
                <IconComponent className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1">
              <div className="flex items-center text-xs justify-between">
                <span className="text-slate-500 truncate">{card.description}</span>
                <span className={`font-semibold shrink-0 ml-2 ${card.trendUp ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {card.trend}
                </span>
              </div>

              {alert && (
                <div className="mt-2 flex items-center gap-1.5 p-1.5 bg-red-50 text-red-700 rounded-md text-xs font-medium border border-red-100 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{alert.message}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
