import React, { useState } from "react";
import { Transaction, TransactionType, TransactionStatus, UserRole } from "../types";
import { 
  Plus, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Ban, 
  FileText, 
  Filter, 
  Zap, 
  ZapOff 
} from "lucide-react";

interface RealTimeFeedProps {
  transactions: Transaction[];
  currentUserRole: UserRole;
  onAddTransaction: (newTx: Omit<Transaction, "id" | "date">) => void;
  onUpdateStatus: (id: string, status: TransactionStatus) => void;
  onDeleteTransaction: (id: string) => void;
  onClearAllTransactions?: () => void;
  isSimulating?: boolean;
  onToggleSimulation?: () => void;
}

export default function RealTimeFeed({
  transactions,
  currentUserRole,
  onAddTransaction,
  onUpdateStatus,
  onDeleteTransaction,
  onClearAllTransactions,
}: RealTimeFeedProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Form states for new transactions
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState<TransactionType>("VENTA");
  const [newAmount, setNewAmount] = useState("");
  const [newCustomer, setNewCustomer] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newAccount, setNewAccount] = useState("413505 - Venta de Mercancías");
  const [newCompanyId, setNewCompanyId] = useState<"WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR">("WPC");

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case "CONTABILIZADO":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Contabilizado
          </span>
        );
      case "BORRADOR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" /> Borrador
          </span>
        );
      case "ANULADO":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200 line-through">
            <Ban className="w-3 h-3" /> Anulado
          </span>
        );
    }
  };

  const getTypeColor = (type: TransactionType) => {
    switch (type) {
      case "VENTA": return "text-emerald-600 font-bold";
      case "RECAUDO": return "text-teal-600 font-semibold";
      case "COMPRA": return "text-amber-600 font-bold";
      case "GASTO": return "text-rose-600 font-bold";
      case "PAGO": return "text-indigo-600 font-semibold";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || !newCustomer || !newDesc) return;

    onAddTransaction({
      type: newType,
      amount: parseFloat(newAmount),
      customerSupplier: newCustomer,
      description: newDesc,
      category: newCategory || "General",
      status: currentUserRole === UserRole.AUXILIAR_CONTABLE ? "BORRADOR" : "CONTABILIZADO",
      account: newAccount,
      companyId: newCompanyId,
    });

    // Reset fields
    setNewAmount("");
    setNewCustomer("");
    setNewDesc("");
    setNewCategory("");
    setNewCompanyId("WPC");
    setIsAdding(false);
  };

  // Pre-fill categories based on transaction type
  const handleTypeChange = (type: TransactionType) => {
    setNewType(type);
    if (type === "VENTA" || type === "RECAUDO") {
      setNewAccount("413505 - Venta de Mercancías");
    } else if (type === "COMPRA") {
      setNewAccount("143501 - Mercancías No Fabricadas");
    } else {
      setNewAccount("510506 - Sueldos y Salarios");
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      tx.customerSupplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "ALL" || tx.type === typeFilter;
    const matchesStatus = statusFilter === "ALL" || tx.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col gap-5" id="realtime-feed-container">
      {/* Header and Simulation Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Flujo de Operaciones Contables (ERP)
          </h2>
          <p className="text-xs text-slate-400">Transacciones y asientos contables procesados en tiempo real</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Clear All Ledger Button */}
          {onClearAllTransactions && transactions.length > 0 && (
            <button
              onClick={onClearAllTransactions}
              id="clear-all-ledger-btn"
              title="Borrar todas las transacciones para iniciar desde cero con sus datos reales"
              className="flex items-center gap-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpiar Libro (A Cero)
            </button>
          )}

          {/* Add Transaction Button */}
          <button
            onClick={() => setIsAdding(!isAdding)}
            id="add-transaction-btn"
            className="flex items-center gap-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-lg transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" /> Registrar Transacción
          </button>
        </div>
      </div>

      {/* Adding Transaction Drawer / Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-4 animate-fadeIn" id="new-transaction-form">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-700">Registrar Nuevo Asiento Contable</h3>
            {currentUserRole === UserRole.AUXILIAR_CONTABLE && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-medium">
                Se guardará como Borrador (Rol Auxiliar)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Tipo de Documento</label>
              <select
                value={newType}
                onChange={(e) => handleTypeChange(e.target.value as TransactionType)}
                className="text-sm p-2 bg-white border border-slate-200 rounded-lg text-slate-700"
              >
                <option value="VENTA">VENTA (Factura de Venta)</option>
                <option value="COMPRA">COMPRA (Factura de Compra)</option>
                <option value="GASTO">GASTO (Egreso / Pago de Gasto)</option>
                <option value="RECAUDO">RECAUDO (Recibo de Caja)</option>
                <option value="PAGO">PAGO (Comprobante de Egreso)</option>
              </select>
            </div>

            {/* Customer/Supplier */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Tercero (Cliente / Proveedor)</label>
              <input
                type="text"
                placeholder="Nombre de la empresa o persona"
                value={newCustomer}
                onChange={(e) => setNewCustomer(e.target.value)}
                className="text-sm p-2 bg-white border border-slate-200 rounded-lg text-slate-700"
                required
              />
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Monto ($ COP)</label>
              <input
                type="number"
                placeholder="Valor en pesos colombianos"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="text-sm p-2 bg-white border border-slate-200 rounded-lg text-slate-700"
                required
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Categoría</label>
              <input
                type="text"
                placeholder="Ej: Honorarios, Ventas Mayoristas, Servicios"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="text-sm p-2 bg-white border border-slate-200 rounded-lg text-slate-700"
              />
            </div>

            {/* Accounting Account (PUC) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Cuenta Contable (PUC)</label>
              <select
                value={newAccount}
                onChange={(e) => setNewAccount(e.target.value)}
                className="text-sm p-2 bg-white border border-slate-200 rounded-lg text-slate-700"
              >
                <option value="413505 - Comercio al por mayor y menor">413505 - Comercio al por mayor y menor</option>
                <option value="111005 - Bancos Nacionales">111005 - Bancos Nacionales</option>
                <option value="130505 - Clientes Nacionales">130505 - Clientes Nacionales</option>
                <option value="143501 - Mercancías No Fabricadas">143501 - Mercancías No Fabricadas</option>
                <option value="510506 - Sueldos y Salarios">510506 - Sueldos y Salarios</option>
                <option value="522010 - Arrendamientos">522010 - Arrendamientos</option>
                <option value="519530 - Servicios Públicos">519530 - Servicios Públicos</option>
              </select>
            </div>

            {/* Empresa del Holding */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Empresa del Holding</label>
              <select
                value={newCompanyId}
                onChange={(e) => setNewCompanyId(e.target.value as any)}
                className="text-sm p-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="WPC">World Parts Company S.A.S.</option>
                <option value="FUNDACION">Fundación She Maker</option>
                <option value="RAEZ">Raez Ingeniería S.A.S.</option>
                <option value="HELENAMAR">Helenamar Turismo</option>
              </select>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1 md:col-span-3">
              <label className="text-xs font-semibold text-slate-600">Descripción / Concepto</label>
              <input
                type="text"
                placeholder="Breve descripción del hecho económico"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="text-sm p-2 bg-white border border-slate-200 rounded-lg text-slate-700"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs font-semibold px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="text-xs font-semibold px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg"
            >
              Confirmar Registro
            </button>
          </div>
        </form>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por tercero, descripción o ID de transacción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Type */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-transparent border-none text-slate-600 focus:outline-none pr-2 font-medium"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="VENTA">Ventas</option>
              <option value="COMPRA">Compras</option>
              <option value="GASTO">Gastos</option>
              <option value="RECAUDO">Recaudos</option>
              <option value="PAGO">Pagos</option>
            </select>
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-transparent border-none text-slate-600 focus:outline-none pr-2 font-medium"
            >
              <option value="ALL">Todos los estados</option>
              <option value="CONTABILIZADO">Contabilizados</option>
              <option value="BORRADOR">Borradores</option>
              <option value="ANULADO">Anulados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-left border-collapse" id="transactions-table">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
              <th className="p-3">Ref ID</th>
              <th className="p-3">Fecha y Hora</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Tercero</th>
              <th className="p-3">Descripción / Cuenta</th>
              <th className="p-3 text-right">Valor COP</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center p-8 text-slate-400 font-medium bg-slate-50/50">
                  No se encontraron transacciones con los filtros seleccionados
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id} id={`tx-row-${tx.id}`} className="hover:bg-slate-50/50 transition-colors">
                  {/* ID */}
                  <td className="p-3 font-mono font-medium text-slate-500">{tx.id}</td>
                  
                  {/* Date */}
                  <td className="p-3 text-slate-600">
                    {new Date(tx.date).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  
                  {/* Type */}
                  <td className="p-3">
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-slate-100 ${getTypeColor(tx.type)}`}>
                      {tx.type}
                    </span>
                  </td>
                  
                  {/* Third Party */}
                  <td className="p-3 font-medium text-slate-700">{tx.customerSupplier}</td>
                  
                  {/* Desc / Account */}
                  <td className="p-3">
                    <p className="text-slate-700 font-medium truncate max-w-[200px]">{tx.description}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.account}</p>
                  </td>
                  
                  {/* Amount */}
                  <td className="p-3 text-right font-semibold text-slate-800 font-mono">
                    {formatCOP(tx.amount)}
                  </td>
                  
                  {/* Status */}
                  <td className="p-3 text-center whitespace-nowrap">
                    {getStatusBadge(tx.status)}
                  </td>
                  
                  {/* Actions */}
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      {/* Approve button for Contador/Admin on Drafts */}
                      {tx.status === "BORRADOR" && (currentUserRole === UserRole.ADMINISTRADOR || currentUserRole === UserRole.CONTADOR) && (
                        <button
                          onClick={() => onUpdateStatus(tx.id, "CONTABILIZADO")}
                          className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-md hover:bg-emerald-600 transition-colors shadow-2xs"
                          title="Contabilizar Asiento"
                        >
                          Aprobar
                        </button>
                      )}

                      {/* Annul/Unannul toggle for Admin/Contador */}
                      {tx.status === "CONTABILIZADO" && (currentUserRole === UserRole.ADMINISTRADOR || currentUserRole === UserRole.CONTADOR) && (
                        <button
                          onClick={() => onUpdateStatus(tx.id, "ANULADO")}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-amber-600 transition-colors"
                          title="Anular Documento"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {tx.status === "ANULADO" && (currentUserRole === UserRole.ADMINISTRADOR || currentUserRole === UserRole.CONTADOR) && (
                        <button
                          onClick={() => onUpdateStatus(tx.id, "CONTABILIZADO")}
                          className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] rounded hover:bg-slate-300 transition-colors"
                          title="Re-contabilizar"
                        >
                          Restaurar
                        </button>
                      )}

                      {/* Delete option only for Administrator */}
                      {currentUserRole === UserRole.ADMINISTRADOR && (
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-500 transition-colors"
                          title="Eliminar de base de datos"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* If Auxiliar, they can't do actions */}
                      {currentUserRole === UserRole.AUXILIAR_CONTABLE && tx.status !== "BORRADOR" && (
                        <span className="text-[10px] text-slate-300 italic">Solo Lectura</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
