import { useState, useEffect, useMemo } from "react";
import { 
  UserRole, 
  UserProfile, 
  Transaction, 
  ThresholdSetting, 
  Notification,
  FinancialMetric,
  InventoryItem,
  PurchaseOrder,
  Estimate,
  ServiceOrder,
  Property,
  FundacionProgram,
  Donation
} from "./types";
import { useHoldingData } from "./hooks/useHoldingData";
import LoginScreen from "./components/LoginScreen";
import { computeMetrics, computeCompanyProfits, sumLedger, inventoryValue } from "./utils/finance";
import FinancialMetrics from "./components/FinancialMetrics";
import RealTimeFeed from "./components/RealTimeFeed";
import ReportsPanel from "./components/ReportsPanel";
import RoleManagement from "./components/RoleManagement";
import NotificationSettings from "./components/NotificationSettings";

// Multi-company holding sub-panels
import WpcInventoryPanel from "./components/WpcInventoryPanel";
import WpcLogo from "./components/WpcLogo";
import MakerHoldingLogo from "./components/MakerHoldingLogo";
import SheMakerFoundationPanel from "./components/SheMakerFoundationPanel";
import RaezEngineeringPanel from "./components/RaezEngineeringPanel";
import HelenamarRealEstatePanel from "./components/HelenamarRealEstatePanel";
import AiAdvisorPanel from "./components/AiAdvisorPanel";
import { 
  BarChart3, 
  BookOpen, 
  Layers, 
  Settings, 
  Users, 
  Bell, 
  Menu, 
  X, 
  LogOut, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle,
  Play,
  Pause,
  Check,
  CheckCircle2,
  Lock,
  Truck,
  Heart,
  Wrench,
  Building2
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

type ActiveTab = 
  | "DASHBOARD" 
  | "WPC" 
  | "FUNDACION" 
  | "RAEZ" 
  | "HELENAMAR" 
  | "AI_ADVISOR" 
  | "TRANSACTIONS" 
  | "REPORTS" 
  | "USERS" 
  | "SETTINGS";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("DASHBOARD");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estado central: autenticación + datos + persistencia en la nube (Supabase).
  const holding = useHoldingData();
  const {
    ready,
    isAuthenticated,
    currentUser,
    syncStatus,
    lastSyncError,
    login,
    logout,
    createUserAccount,
    users,
    setUsers,
    transactions,
    setTransactions,
    inventory,
    setInventory,
    inventoryHistory,
    setInventoryHistory,
    purchaseOrders,
    setPurchaseOrders,
    estimates,
    setEstimates,
    serviceOrders,
    setServiceOrders,
    properties,
    setProperties,
    programs,
    setPrograms,
    donations,
    setDonations,
    thresholds,
    setThresholds,
    notifications,
    setNotifications,
  } = holding;

  const configMissing = Boolean(holding.config) &&
    !(holding.config?.supabaseUrl && holding.config?.supabaseAnonKey);

  // Compute actual commercial profits dynamically based on active transactions
  const commercialProfits = useMemo(() => computeCompanyProfits(transactions), [transactions]);

  // Recalculate metrics on the fly based on current transaction ledger state
  const metrics = useMemo<FinancialMetric>(() => computeMetrics(transactions, inventory), [transactions, inventory]);

  // Check metrics against thresholds, automatically trigger notifications
  const checkMetricThresholdAlarms = (newMetrics: FinancialMetric) => {
    // Sin transacciones registradas no hay criterio real para alarmar.
    if (transactions.length === 0) return;

    thresholds.forEach((thresh) => {
      if (!thresh.enabled) return;

      const currentValue = newMetrics[thresh.metricName as keyof FinancialMetric] ?? 0;
      let isTriggered = false;

      if (thresh.operator === "LESS_THAN") {
        isTriggered = currentValue < thresh.value;
      } else {
        isTriggered = currentValue > thresh.value;
      }

      if (isTriggered) {
        // Prevent adding duplicate unread alarms for the same metric
        const alreadyHasActiveAlarm = notifications.some(
          n => n.metricAffected === thresh.metricName && n.type === "ALERT" && !n.read
        );

        if (!alreadyHasActiveAlarm) {
          const valueFormatted = new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
          }).format(thresh.value);

          const curFormatted = new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
          }).format(currentValue);

          const newAlarm: Notification = {
            id: `alert-${Date.now()}`,
            timestamp: new Date().toISOString(),
            title: `Alerta Crítica: ${thresh.displayName}`,
            message: `La métrica ${thresh.displayName} se encuentra en ${curFormatted}, incumpliendo el umbral establecido de ${thresh.operator === "LESS_THAN" ? "menor que" : "mayor que"} ${valueFormatted}.`,
            type: "ALERT",
            read: false,
            metricAffected: thresh.metricName as string,
          };

          setNotifications(prev => [newAlarm, ...prev]);
          setToastMessage(`🚨 ¡Alerta Crítica!: ${thresh.displayName} ha superado el límite.`);
        }
      }
    });
  };

  // Run threshold checks whenever metrics update
  useEffect(() => {
    checkMetricThresholdAlarms(metrics);
  }, [metrics, thresholds]);

  // Real-time transaction simulation removed per user directive.
  // All transactions are entered or uploaded directly by the user.

  // Transaction Event Handlers passed to Children Components
  const handleAddTransaction = (newTx: Omit<Transaction, "id" | "date">) => {
    const transaction: Transaction = {
      ...newTx,
      id: `TRX-${Math.floor(Math.random() * 9000) + 1000}`,
      date: new Date().toISOString(),
    };
    
    setTransactions(prev => [transaction, ...prev]);

    // Add immediate action notification
    const newNotification: Notification = {
      id: `noti-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: "Documento Contable Creado",
      message: `El usuario ${currentUser.name} ha registrado un documento tipo ${transaction.type} para ${transaction.customerSupplier} por ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(transaction.amount)} en estado ${transaction.status}.`,
      type: "INFO",
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
    setToastMessage(`✓ Transacción ${transaction.id} registrada exitosamente.`);
  };

  const handleUpdateTransactionStatus = (id: string, status: "BORRADOR" | "CONTABILIZADO" | "ANULADO") => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    setToastMessage(`Asiento ${id} actualizado a estado: ${status}`);
    
    const noti: Notification = {
      id: `noti-up-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: "Estado de Documento Modificado",
      message: `El asiento contable ${id} fue marcado como ${status} por ${currentUser.name}.`,
      type: "SUCCESS",
      read: false,
    };
    setNotifications(prev => [noti, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    setToastMessage(`Transacción ${id} eliminada físicamente de la base de datos.`);
  };

  const handleClearAllTransactions = () => {
    if (window.confirm("¿Está seguro de que desea limpiar todos los asientos contables actuales? La plataforma quedará en cero lista para el ingreso de sus transacciones reales.")) {
      setTransactions([]);
      setToastMessage("✓ Libro contable limpiado en su totalidad. Registre sus transacciones reales.");
    }
  };

  // User Administration Handlers
  const handleToggleUserStatus = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
    const u = users.find(x => x.id === userId);
    if (u) {
      setToastMessage(`Estado de usuario ${u.name} alternado.`);
    }
  };

  const handleUpdateUserRole = (userId: string, role: UserRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    const u = users.find(x => x.id === userId);
    if (u) {
      setToastMessage(`Rol de ${u.name} actualizado a ${role}.`);
    }
  };

  // Notification configuration handlers
  const handleUpdateThreshold = (id: string, updated: Partial<ThresholdSetting>) => {
    setThresholds(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
    setToastMessage("Regla de alarma actualizada con éxito.");
  };

  const handleAddThreshold = (newThresh: Omit<ThresholdSetting, "id">) => {
    const created: ThresholdSetting = {
      ...newThresh,
      id: `TS-${Date.now()}`,
    };
    setThresholds(prev => [...prev, created]);
    setToastMessage(`Alerta de KPI "${created.displayName}" agregada.`);
  };

  const handleDeleteThreshold = (id: string) => {
    setThresholds(prev => prev.filter(t => t.id !== id));
    setToastMessage("Regla de alarma financiera eliminada.");
  };

  // Notifications bell actions
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setIsNotificationsDropdownOpen(false);
  };

  // Dynamic Chart calculations (solo datos reales del libro)
  const parsedChartData = useMemo(() => {
    const totals = sumLedger(transactions);
    const monthLabel = new Date().toLocaleDateString("es-CO", { month: "short" });

    return [{
      period: `${monthLabel} (Hoy)`,
      ventas: totals.ventas,
      gastos: totals.gastos,
      flujo: totals.recaudos - totals.pagos - totals.gastos,
      inventario: inventoryValue(inventory),
    }];
  }, [transactions, inventory]);

  const expenseCompositionData = useMemo(() => {
    const comps: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.status !== "CONTABILIZADO" || tx.type !== "GASTO") return;
      const cat = tx.category || "Otros Costos";
      comps[cat] = (comps[cat] || 0) + tx.amount;
    });
    if (Object.keys(comps).length === 0) return [];
    return Object.entries(comps).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const COLORS_PALETTE = ["#0284c7", "#f97316", "#10b981", "#8b5cf6", "#f43f5e"];

  // Clear toast banner automatically
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Compuerta de autenticación: mientras no haya sesión no se renderiza la app.
  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
          <p className="text-xs font-semibold">Inicializando CONTROL GENERAL HOLDING WPC...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={login}
        configMissing={configMissing}
        error={holding.configError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row relative text-slate-800" id="main-app-shell">
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white border border-slate-700 p-4 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-3 animate-fadeIn max-w-sm" id="toast-alert-banner">
          <div className="p-1 bg-sky-600 rounded-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="flex-1">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Sidebar (Desktop) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-col shrink-0 border-r border-slate-800 hidden md:flex print:hidden">
        {/* Brand Logo - Matriz Maker Holding */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <MakerHoldingLogo variant="horizontal" size="md" lightText={true} />
        </div>

        {/* User context widget in sidebar */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/40 flex items-center gap-2.5">
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            className="w-10 h-10 rounded-full object-cover border-2 border-lime-400 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="truncate flex-1">
            <h4 className="text-xs font-bold text-slate-100 truncate">{currentUser.name}</h4>
            {currentUser.title && (
              <p className="text-[10px] text-lime-400 font-semibold truncate leading-tight mt-0.5">{currentUser.title}</p>
            )}
            <span className="text-[8px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded uppercase mt-1 inline-block">
              {currentUser.role.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Grouped Navigation Items */}
        <nav className="p-4 flex-1 flex flex-col gap-4 text-xs overflow-y-auto scrollbar-none">
          {/* Group 1: General Consolidated */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider px-2 mb-1 block">Consolidado</span>
            <button
              onClick={() => setActiveTab("DASHBOARD")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-semibold ${
                activeTab === "DASHBOARD" 
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-600/15" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Tablero de Control (KPI)
            </button>
          </div>

          {/* Group 2: Holding Sub-companies */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider px-2 mb-1 block">Empresas Holding</span>
            
            <button
              onClick={() => setActiveTab("WPC")}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all font-semibold ${
                activeTab === "WPC" 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <WpcLogo variant="icon" size="sm" /> 1. WPC Autopartes
            </button>

            <button
              onClick={() => setActiveTab("FUNDACION")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-semibold ${
                activeTab === "FUNDACION" 
                  ? "bg-pink-600 text-white shadow-lg shadow-pink-600/15" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Heart className="w-4 h-4" /> 2. Fundación She Maker
            </button>

            <button
              onClick={() => setActiveTab("RAEZ")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-semibold ${
                activeTab === "RAEZ" 
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/15" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Wrench className="w-4 h-4" /> 3. Raez Ingeniería
            </button>

            <button
              onClick={() => setActiveTab("HELENAMAR")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-semibold ${
                activeTab === "HELENAMAR" 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/15" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Building2 className="w-4 h-4" /> 4. Helenamar Turismo
            </button>
          </div>

          {/* Group 3: Intelligent Advisor */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider px-2 mb-1 block">Asesoría Inteligente</span>
            <button
              onClick={() => setActiveTab("AI_ADVISOR")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-bold ${
                activeTab === "AI_ADVISOR" 
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "text-indigo-400 hover:bg-slate-800/50 hover:text-indigo-200"
              }`}
            >
              <Sparkles className="w-4 h-4" /> Asesor Contable IA
            </button>
          </div>

          {/* Group 4: Accounting & Admin */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider px-2 mb-1 block">Contabilidad General</span>
            
            <button
              onClick={() => setActiveTab("TRANSACTIONS")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-semibold ${
                activeTab === "TRANSACTIONS" 
                  ? "bg-sky-600 text-white shadow-lg" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4" /> Operaciones & PUC
            </button>

            <button
              onClick={() => setActiveTab("REPORTS")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-semibold ${
                activeTab === "REPORTS" 
                  ? "bg-sky-600 text-white shadow-lg" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4" /> Reportes & Balances
            </button>

            <button
              onClick={() => setActiveTab("USERS")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-semibold ${
                activeTab === "USERS" 
                  ? "bg-sky-600 text-white shadow-lg" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4" /> Gestión de Roles
            </button>

            <button
              onClick={() => setActiveTab("SETTINGS")}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-semibold ${
                activeTab === "SETTINGS" 
                  ? "bg-sky-600 text-white shadow-lg" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Settings className="w-4 h-4" /> Límites de KPI
            </button>
          </div>
        </nav>

        {/* Info panel in sidebar */}
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 flex flex-col gap-1 font-medium">
          <p className="font-bold text-lime-400">MATRIZ MAKER HOLDING</p>
          <p>Hora Bogotá: <span className="font-mono">{new Date().toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: true })}</span></p>
          <p>Fecha fiscal: {new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}</p>
        </div>
      </aside>

      {/* Mobile Top Navigation Header */}
      <header className="md:hidden bg-slate-900 text-white p-3 flex items-center justify-between shadow-md print:hidden border-b border-slate-800">
        <div className="flex items-center gap-2">
          <MakerHoldingLogo variant="horizontal" size="sm" lightText={true} />
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile notifications trigger */}
          <button 
            onClick={() => setIsNotificationsDropdownOpen(!isNotificationsDropdownOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-950 text-slate-300 p-4 border-b border-slate-800 flex flex-col gap-1.5 font-semibold text-xs animate-slideDown print:hidden z-30 relative max-h-[80vh] overflow-y-auto">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider px-2 mt-2">Tableros</span>
          <button
            onClick={() => { setActiveTab("DASHBOARD"); setIsMobileMenuOpen(false); }}
            className={`p-2.5 rounded-lg flex items-center gap-3 ${activeTab === "DASHBOARD" ? "bg-sky-600 text-white" : ""}`}
          >
            <BarChart3 className="w-4 h-4" /> Tablero de Control
          </button>

          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider px-2 mt-2">Empresas Holding</span>
          <button
            onClick={() => { setActiveTab("WPC"); setIsMobileMenuOpen(false); }}
            className={`p-2.5 rounded-lg flex items-center gap-3 ${activeTab === "WPC" ? "bg-indigo-600 text-white" : ""}`}
          >
            <Truck className="w-4 h-4" /> 1. WPC Autopartes
          </button>
          <button
            onClick={() => { setActiveTab("FUNDACION"); setIsMobileMenuOpen(false); }}
            className={`p-2.5 rounded-lg flex items-center gap-3 ${activeTab === "FUNDACION" ? "bg-pink-600 text-white" : ""}`}
          >
            <Heart className="w-4 h-4" /> 2. Fundación She Maker
          </button>
          <button
            onClick={() => { setActiveTab("RAEZ"); setIsMobileMenuOpen(false); }}
            className={`p-2.5 rounded-lg flex items-center gap-3 ${activeTab === "RAEZ" ? "bg-amber-600 text-white" : ""}`}
          >
            <Wrench className="w-4 h-4" /> 3. Raez Ingeniería
          </button>
          <button
            onClick={() => { setActiveTab("HELENAMAR"); setIsMobileMenuOpen(false); }}
            className={`p-2.5 rounded-lg flex items-center gap-3 ${activeTab === "HELENAMAR" ? "bg-emerald-600 text-white" : ""}`}
          >
            <Building2 className="w-4 h-4" /> 4. Helenamar Turismo
          </button>

          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider px-2 mt-2">Inteligencia Artificial</span>
          <button
            onClick={() => { setActiveTab("AI_ADVISOR"); setIsMobileMenuOpen(false); }}
            className={`p-2.5 rounded-lg flex items-center gap-3 ${activeTab === "AI_ADVISOR" ? "bg-violet-600 text-white font-bold" : ""}`}
          >
            <Sparkles className="w-4 h-4" /> Asesor Contable IA
          </button>

          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider px-2 mt-2">Contabilidad</span>
          <button
            onClick={() => { setActiveTab("TRANSACTIONS"); setIsMobileMenuOpen(false); }}
            className={`p-2.5 rounded-lg flex items-center gap-3 ${activeTab === "TRANSACTIONS" ? "bg-sky-600 text-white" : ""}`}
          >
            <Layers className="w-4 h-4" /> Operaciones PUC
          </button>
          <button
            onClick={() => { setActiveTab("REPORTS"); setIsMobileMenuOpen(false); }}
            className={`p-2.5 rounded-lg flex items-center gap-3 ${activeTab === "REPORTS" ? "bg-sky-600 text-white" : ""}`}
          >
            <BookOpen className="w-4 h-4" /> Reportes & Balances
          </button>
          <button
            onClick={() => { setActiveTab("USERS"); setIsMobileMenuOpen(false); }}
            className={`p-3 rounded-lg flex items-center gap-3 ${activeTab === "USERS" ? "bg-sky-600 text-white" : ""}`}
          >
            <Users className="w-4 h-4" /> Gestión de Roles
          </button>
          <button
            onClick={() => { setActiveTab("SETTINGS"); setIsMobileMenuOpen(false); }}
            className={`p-3 rounded-lg flex items-center gap-3 ${activeTab === "SETTINGS" ? "bg-sky-600 text-white" : ""}`}
          >
            <Settings className="w-4 h-4" /> Límites de Alerta
          </button>

          {/* Mobile Current user indicator */}
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-2">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-8 h-8 rounded-full object-cover border border-slate-800"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-[11px] font-bold text-white leading-none">{currentUser.name}</p>
                <span className="text-[8px] bg-slate-800 text-slate-300 font-bold px-1 rounded uppercase mt-1 inline-block">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={() => { setIsMobileMenuOpen(false); void logout(); }}
                className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-rose-400 border border-slate-700 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5" /> Salir
              </button>
            </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {/* Desktop Top Bar Header */}
        <header className="bg-white border-b border-slate-100 p-4 md:flex items-center justify-between hidden print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-xs bg-slate-100 font-semibold px-2.5 py-1 rounded-md text-slate-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Holding Principal Bogotá
            </span>
            <div className="text-xs text-slate-400 font-medium">
              Hora de Bogotá: <span className="font-mono text-slate-700 font-bold bg-slate-50 px-2 py-1 border border-slate-100 rounded-lg">{new Date().toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Real-time status indicator (Manual Mode) */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Operación Manual
              </span>
              {/* Cloud sync indicator */}
              <span
                title={lastSyncError ? `Error de sincronización: ${lastSyncError}` : "Sincronizado en la nube"}
                className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                  syncStatus === "error"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : syncStatus === "saving"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  syncStatus === "error" ? "bg-red-500" : syncStatus === "saving" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                }`} />
                {syncStatus === "error" ? "Error de sync" : syncStatus === "saving" ? "Guardando..." : "Cloud OK"}
              </span>
            </div>

            {/* Notifications Alert Bell Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsDropdownOpen(!isNotificationsDropdownOpen)}
                className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 hover:text-slate-800 relative transition-all"
                id="notifications-bell-trigger"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Drawer list */}
              {isNotificationsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-40 p-4 flex flex-col gap-3 animate-fadeIn" id="notifications-dropdown">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-sky-600" />
                      Notificaciones ({unreadCount} unread)
                    </h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[10px] text-sky-600 font-bold hover:underline"
                      >
                        Marcar todo leído
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-center text-slate-400 text-xs py-4 font-medium">No hay notificaciones recientes</p>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`p-2.5 rounded-xl border text-[11px] flex flex-col gap-1 ${
                            n.type === "ALERT" 
                              ? "bg-red-50/50 border-red-100 text-red-900" 
                              : n.type === "SUCCESS"
                              ? "bg-emerald-50/50 border-emerald-100 text-emerald-950"
                              : "bg-slate-50 border-slate-100 text-slate-600"
                          } ${!n.read ? "ring-2 ring-sky-500/10 font-medium" : ""}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold flex items-center gap-1">
                              {n.type === "ALERT" && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                              {n.type === "SUCCESS" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                              {n.title}
                            </span>
                            <span className="text-[8px] text-slate-400 font-mono">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-500 leading-normal">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Current user micro profile card */}
            <div className="flex items-center gap-2.5 border-l pl-4 border-slate-200">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-9 h-9 rounded-full object-cover border-2 border-lime-500 shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div className="text-left leading-tight">
                <p className="text-xs font-black text-slate-800">{currentUser.name}</p>
                {currentUser.title && (
                  <p className="text-[10px] font-bold text-indigo-600">{currentUser.title}</p>
                )}
                <p className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wide">{currentUser.role.replace("_", " ")}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => { void logout(); }}
              className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>

          </div>
        </header>

        {/* Dynamic Route Body Container */}
        <div className="p-4 md:p-6 flex flex-col gap-6 flex-1 print:p-0">
          
          {/* TAB 1: DASHBOARD AND CHARTS OVERVIEW */}
          {activeTab === "DASHBOARD" && (
            <div className="flex flex-col gap-6">
              
              {/* Dashboard Welcome Header block */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 border border-slate-100 rounded-2xl print:hidden">
                <div>
                  <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    Tablero Gerencial de Control Financiero
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> En Linea
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Indicadores consolidados de la compañía para el cierre de operaciones. Monitoreo constante de PUC bajo NIIF.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Carga Directa de Información
                  </span>
                </div>
              </div>

              {/* KPI metrics row */}
              <FinancialMetrics metrics={metrics} thresholds={thresholds} />

              {/* Interactive Charts Section (Bento Grid) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-grid">
                
                {/* Chart 1: Revenue vs Expenses over time (2 columns on large screen) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-sky-600" />
                      Ingresos de Venta vs Gastos Operacionales (COP)
                    </h3>
                    <p className="text-[11px] text-slate-400">Evolución de egresos e ingresos históricos más el mes de curso actual (Julio)</p>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={parsedChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="period" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v/1000000}M`} />
                        <Tooltip 
                          formatter={(value) => [formatCOP(Number(value)), "COP"]} 
                          contentStyle={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "11px" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorVentas)" />
                        <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorGastos)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Expense Breakdown Pie Chart */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-sky-600" />
                      Composición de Gastos Operacionales
                    </h3>
                    <p className="text-[11px] text-slate-400">Distribución de egresos del ejercicio actual según rubros del PUC</p>
                  </div>

                  <div className="h-48 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseCompositionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {expenseCompositionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS_PALETTE[index % COLORS_PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCOP(Number(value)), "Total"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {expenseCompositionData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS_PALETTE[index % COLORS_PALETTE.length] }} />
                          <span className="text-slate-600 truncate">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-800">{formatCOP(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Dynamic Inventory & Cash Flow Trends chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Historical Cash Flow & Inventory Trends bar */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-sky-600" />
                      Inventario de Bodega vs Flujo de Caja (NIIF)
                    </h3>
                    <p className="text-[11px] text-slate-400">Evaluación del capital de trabajo disponible y rotación de stock de mercancía</p>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={parsedChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="period" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v/1000000}M`} />
                        <Tooltip formatter={(value) => [formatCOP(Number(value)), "COP"]} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="flujo" name="Flujo de Caja" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="inventario" name="Valor de Inventario" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Mini Quick Actions pane */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Accesos y Tareas Frecuentes</h3>
                    <p className="text-[11px] text-slate-400">Flujos directos para optimización contable</p>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <button
                      onClick={() => setActiveTab("TRANSACTIONS")}
                      className="p-3 bg-slate-50 hover:bg-sky-50 hover:border-sky-100 border border-slate-100 rounded-xl text-left transition-all group"
                    >
                      <h4 className="text-xs font-bold text-slate-700 group-hover:text-sky-900">Registrar Venta o Gasto</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Cree facturas electrónicas y egresos de caja para integrar al PUC.</p>
                    </button>

                    <button
                      onClick={() => setActiveTab("REPORTS")}
                      className="p-3 bg-slate-50 hover:bg-sky-50 hover:border-sky-100 border border-slate-100 rounded-xl text-left transition-all group"
                    >
                      <h4 className="text-xs font-bold text-slate-700 group-hover:text-sky-900">Generar Balance General</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Consolide el estado de situación financiera y descargue reportes.</p>
                    </button>

                    <button
                      onClick={() => setActiveTab("SETTINGS")}
                      className="p-3 bg-slate-50 hover:bg-sky-50 hover:border-sky-100 border border-slate-100 rounded-xl text-left transition-all group"
                    >
                      <h4 className="text-xs font-bold text-slate-700 group-hover:text-sky-900">Ajustar Alertas de Caja</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Configure límites mínimos presupuestales para evitar iliquidez.</p>
                    </button>
                  </div>

                  <div className="mt-auto p-3.5 bg-sky-50 rounded-xl border border-sky-100 text-[10px] text-sky-800 flex items-start gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <p>
                      <strong>Protección Contable NIIF:</strong> Este tablero se bloquea automáticamente en períodos cerrados por el Revisor Fiscal.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB: WPC INVENTORY AND LOGISTICS */}
          {activeTab === "WPC" && (
            <WpcInventoryPanel
              inventory={inventory}
              setInventory={setInventory}
              history={inventoryHistory}
              setHistory={setInventoryHistory}
              purchaseOrders={purchaseOrders}
              setPurchaseOrders={setPurchaseOrders}
              estimates={estimates}
              setEstimates={setEstimates}
              onAddTransaction={handleAddTransaction}
              currentUser={currentUser}
            />
          )}

          {/* TAB: SHE MAKER FOUNDATION TAX OPTIMIZER */}
          {activeTab === "FUNDACION" && (
            <SheMakerFoundationPanel
              programs={programs}
              setPrograms={setPrograms}
              donations={donations}
              setDonations={setDonations}
              commercialProfits={commercialProfits}
              onAddTransaction={handleAddTransaction}
              estimates={estimates}
              setEstimates={setEstimates}
              purchaseOrders={purchaseOrders}
              setPurchaseOrders={setPurchaseOrders}
            />
          )}

          {/* TAB: RAEZ ENGINEERING PROJECTS */}
          {activeTab === "RAEZ" && (
            <RaezEngineeringPanel
              serviceOrders={serviceOrders}
              setServiceOrders={setServiceOrders}
              inventory={inventory}
              setInventory={setInventory}
              onAddTransaction={handleAddTransaction}
              estimates={estimates}
              setEstimates={setEstimates}
              purchaseOrders={purchaseOrders}
              setPurchaseOrders={setPurchaseOrders}
            />
          )}

          {/* TAB: HELENAMAR REAL ESTATE TURISMO */}
          {activeTab === "HELENAMAR" && (
            <HelenamarRealEstatePanel
              properties={properties}
              setProperties={setProperties}
              inventory={inventory}
              setInventory={setInventory}
              onAddTransaction={handleAddTransaction}
              estimates={estimates}
              setEstimates={setEstimates}
              purchaseOrders={purchaseOrders}
              setPurchaseOrders={setPurchaseOrders}
            />
          )}

          {/* TAB: INTUITIVE AI EXPERT ADVISOR */}
          {activeTab === "AI_ADVISOR" && (
            <AiAdvisorPanel
              inventory={inventory}
              commercialProfits={commercialProfits}
            />
          )}

          {/* TAB 2: OPERATIONS & PUC LEDGER FEED */}
          {activeTab === "TRANSACTIONS" && (
            <RealTimeFeed
              transactions={transactions}
              currentUserRole={currentUser.role}
              onAddTransaction={handleAddTransaction}
              onUpdateStatus={handleUpdateTransactionStatus}
              onDeleteTransaction={handleDeleteTransaction}
              onClearAllTransactions={handleClearAllTransactions}
            />
          )}

          {/* TAB 3: REPORTS & DETAILED BALANCE SHEETS */}
          {activeTab === "REPORTS" && (
            <ReportsPanel
              transactions={transactions}
              inventory={inventory}
              userRole={currentUser.role}
            />
          )}

          {/* TAB 4: USERS & ROLE PERMISSIONS MATRIX */}
          {activeTab === "USERS" && (
            <RoleManagement
              users={users}
              currentUser={currentUser}
              onCreateUser={createUserAccount}
              onToggleUserStatus={handleToggleUserStatus}
              onUpdateUserRole={handleUpdateUserRole}
            />
          )}

          {/* TAB 5: ALERTS & NOTIFICATION CONFIGURATION */}
          {activeTab === "SETTINGS" && (
            <NotificationSettings
              thresholds={thresholds}
              currentUserRole={currentUser.role}
              onUpdateThreshold={handleUpdateThreshold}
              onAddThreshold={handleAddThreshold}
              onDeleteThreshold={handleDeleteThreshold}
              metrics={metrics}
            />
          )}

        </div>

        {/* Footer print segment */}
        <footer className="bg-white border-t border-slate-100 p-4 text-center text-xs text-slate-400 print:hidden mt-auto">
          <p>© 2026 CONTROL GENERAL HOLDING WPC. Todos los derechos reservados. Optimizado para la gestión corporativa de empresas del grupo.</p>
          <div className="flex justify-center gap-3 mt-1 text-[10px] text-slate-400">
            <span className="hover:underline cursor-pointer">Soporte Técnico</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Manual NIIF</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Políticas de Privacidad</span>
          </div>
        </footer>

      </main>

    </div>
  );
}
