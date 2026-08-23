import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { 
  InventoryItem, 
  InventoryHistoryEntry, 
  PurchaseOrder, 
  Estimate, 
  InventoryTxType,
  HoldingCompany
} from "../types";
import { generateNextODCId, generateNextCOTId } from "../utils/sequenceCounters";
import CommercialProcurementHub from "./CommercialProcurementHub";
import WpcLogo from "./WpcLogo";
import { 
  Plus, 
  Upload, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Package, 
  Truck, 
  TrendingUp, 
  ClipboardList, 
  FileText, 
  AlertTriangle,
  FileCheck,
  Search,
  Filter,
  Trash2,
  Calendar
} from "lucide-react";

interface WpcInventoryPanelProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  history: InventoryHistoryEntry[];
  setHistory: React.Dispatch<React.SetStateAction<InventoryHistoryEntry[]>>;
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  estimates: Estimate[];
  setEstimates: React.Dispatch<React.SetStateAction<Estimate[]>>;
  onAddTransaction: (tx: any) => void;
  currentUser: any;
}

export default function WpcInventoryPanel({
  inventory,
  setInventory,
  history,
  setHistory,
  purchaseOrders,
  setPurchaseOrders,
  estimates,
  setEstimates,
  onAddTransaction,
  currentUser
}: WpcInventoryPanelProps) {
  // Inventory Active View: "STOCK" | "MOVIMIENTOS" | "COTIZACIONES" | "COMPRAS" | "LOGISTICA"
  const [wpcTab, setWpcTab] = useState<"STOCK" | "MOVIMIENTOS" | "COTIZACIONES" | "COMPRAS" | "LOGISTICA">("STOCK");
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [lineFilter, setLineFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // History tracking (persistido en la nube via props: useHoldingData)

  // Adjustments Form state
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjItemId, setAdjItemId] = useState("");
  const [adjType, setAdjType] = useState<InventoryTxType>("ENTRADA_INICIAL");
  const [adjQty, setAdjQty] = useState("");
  const [adjDesc, setAdjDesc] = useState("");
  const [adjValue, setAdjValue] = useState("");
  const [adjResponsible, setAdjResponsible] = useState("");

  // Sync default value suggestion when selected item or type changes
  React.useEffect(() => {
    if (!adjItemId) return;
    const item = inventory.find(i => i.id === adjItemId);
    if (!item) return;

    if (adjType === "SALIDA_VENTA") {
      setAdjValue(String(item.unitPriceB2C || item.unitPrice));
    } else if (adjType === "STOCK_CLIENTES") {
      setAdjValue(String(item.unitPriceB2B || item.unitPrice * 0.9));
    } else if (adjType === "SALIDA_MUESTREO" || adjType === "SALIDA_DEFECTO" || adjType === "SALIDA_PERDIDA") {
      setAdjValue(String(item.unitCostReal || item.unitCost));
    } else {
      setAdjValue(String(item.unitCostReal || item.unitCost));
    }
  }, [adjItemId, adjType, inventory]);

  // Create New Item manually state
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [newItemCode, setNewItemCode] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemLine, setNewItemLine] = useState("Línea Frenos");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("Unidad");
  const [newItemCost, setNewItemCost] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemLocation, setNewItemLocation] = useState("Bodega Principal Alamar");

  // Create Purchase Order form state
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [poSupplier, setPoSupplier] = useState("");
  const [poItems, setPoItems] = useState<Array<{ code: string; description: string; quantity: number; unitCost: number }>>([
    { code: "", description: "", quantity: 1, unitCost: 0 }
  ]);
  const [poNotes, setPoNotes] = useState("");

  // Create Cotización form state
  const [isCreatingCot, setIsCreatingCot] = useState(false);
  const [cotCustomer, setCotCustomer] = useState("");
  const [cotCustomerNit, setCotCustomerNit] = useState("");
  const [cotCustomerPhone, setCotCustomerPhone] = useState("");
  const [cotCustomerEmail, setCotCustomerEmail] = useState("");
  const [cotCustomerAddress, setCotCustomerAddress] = useState("");
  const [cotCompanyId, setCotCompanyId] = useState<"WPC" | "FUNDACION" | "RAEZ" | "HELENAMAR">("WPC");
  const [cotItems, setCotItems] = useState<Array<{ code: string; description: string; quantity: number; unitPrice: number }>>([
    { code: "", description: "", quantity: 1, unitPrice: 0 }
  ]);
  const [cotNotes, setCotNotes] = useState("");

  // File Upload input ref for Excel load
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cotFileInputRef = useRef<HTMLInputElement>(null);

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const wpcInventory = inventory.filter(item => item.companyId === "WPC");

  // Filter Inventory items
  const filteredInventory = wpcInventory.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLine = lineFilter === "ALL" || item.productLine === lineFilter;
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

    return matchesSearch && matchesLine && matchesStatus;
  });

  // Calculate alert counts
  const lowStockCount = wpcInventory.filter(i => i.status === "STOCK_BAJO").length;
  const criticalCount = wpcInventory.filter(i => i.status === "CRITICO").length;

  // Handle excel .xlsx/.xls/CSV file load using SheetJS
  const handleCSVLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

        if (jsonData.length === 0) {
          alert("⚠️ El archivo de Excel está vacío o no es válido.");
          return;
        }

        const loadedItems: InventoryItem[] = [];
        let parsedCount = 0;

        jsonData.forEach((row: any) => {
          // Helper to find column keys case-insensitively
          const getVal = (possibleKeys: string[], defaultVal = "") => {
            const foundKey = Object.keys(row).find(k => 
              possibleKeys.some(pk => k.toLowerCase().trim() === pk.toLowerCase())
            );
            return foundKey ? row[foundKey] : defaultVal;
          };

          const code = String(getVal(["código", "codigo", "code", "sku", "referencia"]) || "").trim();
          const name = String(getVal(["nombre", "name", "descripción", "descripcion", "producto", "repuesto"]) || "").trim();
          const productLine = String(getVal(["linea", "línea", "productline", "categoría", "categoria", "clasificación", "clasificacion"]) || "Línea General").trim();
          const quantity = parseInt(String(getVal(["cantidad", "qty", "quantity", "cant", "stock"]) || "0"), 10);
          const unit = String(getVal(["unidad", "unit", "medida"]) || "Unidad").trim();
          
          const unitCost = parseFloat(String(getVal(["costo", "unitcost", "costo_unitario", "costo unitario"]) || "0"));
          const unitPrice = parseFloat(String(getVal(["precio", "unitprice", "precio_venta", "precio venta"]) || "0"));
          
          // Granular prices and costs requested by the user
          const unitCostReal = parseFloat(String(getVal(["costo_real", "costo real", "real_cost", "costoreal"]) || String(unitCost || 0)));
          const unitPriceB2B = parseFloat(String(getVal(["b2b", "precio_b2b", "precio b2b", "priceb2b"]) || String(unitPrice || 0)));
          const unitPriceB2C = parseFloat(String(getVal(["b2c", "precio_b2c", "precio b2c", "priceb2c"]) || String(unitPrice || 0)));
          const productClassification = String(getVal(["clasificacion_interna", "clasificación interna", "tipo", "tipo_producto", "tipo producto"]) || name.split(" ")[0]).trim();
          
          const location = String(getVal(["ubicación", "ubicacion", "location", "bodega"]) || "Bodega Principal Alamar, Bogotá").trim();

          if (code && name) {
            let status: "SUFICIENTE" | "STOCK_BAJO" | "CRITICO" = "SUFICIENTE";
            if (quantity <= 5) status = "CRITICO";
            else if (quantity <= 15) status = "STOCK_BAJO";

            loadedItems.push({
              id: `INV-LOAD-${Date.now()}-${parsedCount}`,
              code: code.toUpperCase(),
              name,
              productLine,
              quantity,
              unit,
              unitCost: unitCost || unitCostReal,
              unitPrice: unitPrice || unitPriceB2C,
              status,
              location,
              companyId: "WPC",
              lastUpdated: new Date().toISOString(),
              unitCostReal,
              unitPriceB2B,
              unitPriceB2C,
              productClassification
            });
            parsedCount++;
          }
        });

        if (loadedItems.length > 0) {
          setInventory(prev => {
            const loadedCodes = loadedItems.map(item => item.code);
            const nonWpc = prev.filter(item => item.companyId !== "WPC");
            const remainingWpc = prev.filter(item => item.companyId === "WPC" && !loadedCodes.includes(item.code));
            return [...nonWpc, ...remainingWpc, ...loadedItems];
          });

          loadedItems.forEach(item => {
            setHistory(prev => [
              {
                id: `H-EXCEL-${Date.now()}-${item.code}`,
                itemId: item.id,
                itemCode: item.code,
                itemName: item.name,
                date: new Date().toISOString(),
                type: "ENTRADA_INICIAL",
                quantity: item.quantity,
                user: currentUser?.name || "Administrador",
                description: `Importación masiva: ${item.productClassification || "Repuesto"} cargado mediante Excel.`,
                companyId: "WPC",
                responsiblePerson: currentUser?.name || "Administrador",
                movementValue: item.unitCostReal
              },
              ...prev
            ]);
          });

          alert(`✓ Excel / CSV procesado con éxito. Se cargaron e integraron ${loadedItems.length} repuestos a la base de datos de WPC Autopartes.`);
        } else {
          alert("⚠️ No se encontraron repuestos válidos en el archivo Excel. Asegúrese de tener columnas llamadas 'Código', 'Nombre', 'Cantidad' y 'Costo'.");
        }
      } catch (err) {
        console.error(err);
        alert("⚠️ Falló la lectura del archivo de Excel. Por favor verifique el formato de las columnas.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Import Estimación (Cotización) from CSV
  const handleCotizaciónCSVLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      if (lines.length < 2) return;

      // Read header/first line for customer
      // Expect format: customer,validUntil,code,description,quantity,unitPrice
      const parts = lines[1].split(",");
      const customer = parts[0]?.trim() || "Cliente Cotización Importada";
      const validUntil = parts[1]?.trim() || "2026-08-20";

      const items: any[] = [];
      let subtotal = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const col = line.split(",");
        if (col.length >= 6) {
          const code = col[2]?.trim();
          const description = col[3]?.trim();
          const quantity = parseInt(col[4]?.trim() || "0", 10);
          const unitPrice = parseFloat(col[5]?.trim() || "0");

          if (code && quantity > 0) {
            const total = quantity * unitPrice;
            subtotal += total;
            items.push({ code, description, quantity, unitPrice, total });
          }
        }
      }

      if (items.length > 0) {
        const taxAmount = Math.round(subtotal * 0.19);
        const total = subtotal + taxAmount;

        const newCot: Estimate = {
          id: generateNextCOTId("WPC"),
          date: new Date().toISOString().split("T")[0],
          customer,
          validUntil,
          items,
          subtotal,
          taxAmount,
          total,
          status: "ENVIADO",
          companyId: "WPC",
          notes: "Importado desde plantilla CSV"
        };

        setEstimates(prev => [newCot, ...prev]);
        alert(`✓ Cotización ${newCot.id} para ${customer} cargada con éxito.`);
      } else {
        alert("No se encontraron ítems válidos en el archivo.");
      }
    };
    reader.readAsText(file);
  };

  // Apply inputs, outputs, defective, samples, losses
  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjItemId || !adjQty || parseFloat(adjQty) <= 0) return;

    const qty = parseInt(adjQty, 10);
    const item = inventory.find(i => i.id === adjItemId);
    if (!item) return;

    // Determine quantity modifier
    const isIncrement = adjType === "ENTRADA_COMPRA" || adjType === "ENTRADA_INICIAL" || adjType === "STOCK_BODEGA";
    const delta = isIncrement ? qty : -qty;

    if (!isIncrement && item.quantity < qty) {
      alert("⚠️ Error: No hay suficiente stock para realizar este egreso.");
      return;
    }

    const updatedQty = item.quantity + delta;
    let newStatus: "SUFICIENTE" | "STOCK_BAJO" | "CRITICO" = "SUFICIENTE";
    if (updatedQty <= 5) newStatus = "CRITICO";
    else if (updatedQty <= 15) newStatus = "STOCK_BAJO";

    const customValue = parseFloat(adjValue) || 0;

    // Update inventory
    setInventory(prev => prev.map(i => i.id === adjItemId ? {
      ...i,
      quantity: updatedQty,
      status: newStatus,
      lastUpdated: new Date().toISOString()
    } : i));

    // Register history entry
    const newHist: InventoryHistoryEntry = {
      id: `H-${Date.now()}`,
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      date: new Date().toISOString(),
      type: adjType,
      quantity: qty,
      user: currentUser.name,
      description: adjDesc || `Ajuste manual de inventario (${adjType.toLowerCase()})`,
      companyId: "WPC",
      responsiblePerson: adjResponsible || "No asignado",
      movementValue: customValue
    };

    setHistory(prev => [newHist, ...prev]);

    // Financial side effect integration (real ledger update)
    if (adjType === "SALIDA_VENTA" || adjType === "STOCK_CLIENTES") {
      const saleValue = qty * customValue;
      onAddTransaction({
        type: "VENTA",
        amount: saleValue,
        customerSupplier: adjResponsible || "Cliente General WPC",
        description: `Despacho (${adjType === "SALIDA_VENTA" ? "Venta Directa" : "Stock en Consignación Clientes"}): ${qty}x ${item.name}. Responsable: ${adjResponsible || "N/A"}. Obs: ${adjDesc}`,
        category: adjType === "SALIDA_VENTA" ? "Venta Directa" : "Consignación de Stock",
        status: "CONTABILIZADO",
        account: "413505 - Ingresos Venta Autopartes WPC",
        companyId: "WPC"
      });
    } else if (adjType === "SALIDA_DEFECTO" || adjType === "SALIDA_MUESTREO" || adjType === "SALIDA_PERDIDA") {
      const lossValue = qty * customValue;
      onAddTransaction({
        type: "GASTO",
        amount: lossValue,
        customerSupplier: adjResponsible || "Responsable Logística WPC",
        description: `Baja de inventario por ${adjType.replace("SALIDA_", "").toLowerCase()}: ${qty}x ${item.name}. Responsable: ${adjResponsible || "N/A"}. Obs: ${adjDesc}`,
        category: "Pérdida de Inventario",
        status: "CONTABILIZADO",
        account: "519580 - Pérdidas y Castigos de Inventario (Otros Gastos)",
        companyId: "WPC"
      });
    }

    // Reset Form
    setAdjQty("");
    setAdjDesc("");
    setAdjResponsible("");
    setIsAdjusting(false);
    alert("✓ Movimiento de inventario aplicado, registrado en Kardex y contabilizado en el libro diario.");
  };

  // Create new inventory item manually
  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCode || !newItemName || !newItemQty || !newItemCost || !newItemPrice) return;

    const qty = parseInt(newItemQty, 10);
    const cost = parseFloat(newItemCost);
    const price = parseFloat(newItemPrice);

    let status: "SUFICIENTE" | "STOCK_BAJO" | "CRITICO" = "SUFICIENTE";
    if (qty <= 5) status = "CRITICO";
    else if (qty <= 15) status = "STOCK_BAJO";

    const newItem: InventoryItem = {
      id: `INV-${Date.now()}`,
      code: newItemCode.toUpperCase(),
      name: newItemName,
      productLine: newItemLine,
      quantity: qty,
      unit: newItemUnit,
      unitCost: cost,
      unitPrice: price,
      status,
      location: newItemLocation,
      companyId: "WPC",
      lastUpdated: new Date().toISOString()
    };

    setInventory(prev => [...prev, newItem]);

    // Log to history
    setHistory(prev => [
      {
        id: `H-${Date.now()}`,
        itemId: newItem.id,
        itemCode: newItem.code,
        itemName: newItem.name,
        date: new Date().toISOString(),
        type: "ENTRADA_INICIAL",
        quantity: qty,
        user: currentUser.name,
        description: "Creación manual inicial de nuevo catálogo de mercancías",
        companyId: "WPC"
      },
      ...prev
    ]);

    // Reset Form
    setNewItemCode("");
    setNewItemName("");
    setNewItemQty("");
    setNewItemCost("");
    setNewItemPrice("");
    setIsCreatingItem(false);
    alert(`✓ Producto ${newItem.code} codificado y creado en inventario.`);
  };

  // Create Purchase Order
  const handleAddPoItemRow = () => {
    setPoItems(prev => [...prev, { code: "", description: "", quantity: 1, unitCost: 0 }]);
  };

  const handlePoItemChange = (index: number, field: string, value: any) => {
    setPoItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      
      const updated = { ...item, [field]: value };
      // Autofill description and cost if item code is matched in stock!
      if (field === "code") {
        const found = inventory.find(inv => inv.code === value.toUpperCase());
        if (found) {
          updated.description = found.name;
          updated.unitCost = found.unitCost;
        }
      }
      return updated;
    }));
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplier || poItems.some(i => !i.description || i.quantity <= 0)) return;

    const subtotal = poItems.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
    const taxAmount = Math.round(subtotal * 0.19);
    const total = subtotal + taxAmount;

    const newPO: PurchaseOrder = {
      id: generateNextODCId("WPC"),
      date: new Date().toISOString().split("T")[0],
      supplier: poSupplier,
      companyId: "WPC",
      items: poItems.map(i => ({ ...i, total: i.quantity * i.unitCost })),
      subtotal,
      taxAmount,
      total,
      status: "CREADO",
      notes: poNotes
    };

    setPurchaseOrders(prev => [newPO, ...prev]);

    // Financial side effect: we don't post a VENTA/COMPRA ledger transaction until actually received!
    // This allows real tracking first.
    setIsCreatingPO(false);
    setPoSupplier("");
    setPoItems([{ code: "", description: "", quantity: 1, unitCost: 0 }]);
    setPoNotes("");
    alert(`✓ Orden de Compra ${newPO.id} emitida con éxito.`);
  };

  // Create Cotización (Estimate)
  const handleAddCotItemRow = () => {
    setCotItems(prev => [...prev, { code: "", description: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleCotItemChange = (index: number, field: string, value: any) => {
    setCotItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      
      const updated = { ...item, [field]: value };
      if (field === "code") {
        const found = inventory.find(inv => inv.code === value.toUpperCase());
        if (found) {
          updated.description = found.name;
          updated.unitPrice = found.unitPrice;
        }
      }
      return updated;
    }));
  };

  const handleCreateCotización = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cotCustomer || cotItems.some(i => !i.description || i.quantity <= 0)) return;

    const subtotal = cotItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const taxAmount = Math.round(subtotal * 0.19);
    const total = subtotal + taxAmount;

    const newCot: Estimate = {
      id: generateNextCOTId(cotCompanyId),
      date: new Date().toISOString().split("T")[0],
      customer: cotCustomer,
      customerNit: cotCustomerNit || "N/A",
      customerPhone: cotCustomerPhone || "N/A",
      customerEmail: cotCustomerEmail || "N/A",
      customerAddress: cotCustomerAddress || "N/A",
      validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0], // 30 days
      items: cotItems.map(i => ({ ...i, total: i.quantity * i.unitPrice })),
      subtotal,
      taxAmount,
      total,
      status: "BORRADOR",
      companyId: cotCompanyId,
      notes: cotNotes
    };

    setEstimates(prev => [newCot, ...prev]);

    setIsCreatingCot(false);
    setCotCustomer("");
    setCotCustomerNit("");
    setCotCustomerPhone("");
    setCotCustomerEmail("");
    setCotCustomerAddress("");
    setCotCompanyId("WPC");
    setCotItems([{ code: "", description: "", quantity: 1, unitPrice: 0 }]);
    setCotNotes("");
    alert(`✓ Cotización ${newCot.id} generada con éxito.`);
  };


  const triggerExcelSelect = () => {
    fileInputRef.current?.click();
  };

  const triggerCotExcelSelect = () => {
    cotFileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col gap-6" id="wpc-inventory-container">
      {/* Brand & Subtitle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 border-slate-100 gap-4">
        <div className="flex items-center gap-4">
          <WpcLogo variant="full" size="md" />
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              Módulo de Importaciones e Inventarios
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              World Parts Company S.A.S. - NIT: 901.341.558-1 | Gestión real de stock logístico, importaciones Brembo, cotizaciones y órdenes de compra.
            </p>
          </div>
        </div>

        {/* Rapid Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border px-3 py-1.5 rounded-xl text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Ítems Totales</p>
            <p className="text-sm font-bold text-slate-700 font-mono">{wpcInventory.length}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-center">
            <p className="text-[10px] text-amber-500 font-bold uppercase">Bajo Stock</p>
            <p className="text-sm font-bold text-amber-600 font-mono">{lowStockCount}</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-center">
            <p className="text-[10px] text-rose-500 font-bold uppercase">Stock Crítico</p>
            <p className="text-sm font-bold text-rose-600 font-mono">{criticalCount}</p>
          </div>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="flex flex-wrap border-b border-slate-100">
        <button
          onClick={() => setWpcTab("STOCK")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            wpcTab === "STOCK" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Package className="w-4 h-4" /> Inventario Físico Real
        </button>
        <button
          onClick={() => setWpcTab("MOVIMIENTOS")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            wpcTab === "MOVIMIENTOS" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Kardex de Movimientos
        </button>
        <button
          onClick={() => setWpcTab("COTIZACIONES")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            wpcTab === "COTIZACIONES" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <FileText className="w-4 h-4" /> Cotizaciones (Ventas)
        </button>
        <button
          onClick={() => setWpcTab("COMPRAS")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            wpcTab === "COMPRAS" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <FileCheck className="w-4 h-4" /> Órdenes de Compra
        </button>
        <button
          onClick={() => setWpcTab("LOGISTICA")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            wpcTab === "LOGISTICA" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Truck className="w-4 h-4" /> Logística de Importaciones
        </button>
      </div>

      {/* Hidden file input for Excel uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleCSVLoad} 
        accept=".csv" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={cotFileInputRef} 
        onChange={handleCotizaciónCSVLoad} 
        accept=".csv" 
        className="hidden" 
      />

      {/* TAB 1: STOCK & CODIFICATION */}
      {wpcTab === "STOCK" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            {/* Left search */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs p-2 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                />
              </div>

              {/* Line filter */}
              <select
                value={lineFilter}
                onChange={(e) => setLineFilter(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
              >
                <option value="ALL">Todas las líneas</option>
                <option value="Línea Frenos">Línea Frenos</option>
                <option value="Línea Filtros">Línea Filtros</option>
                <option value="Línea Suspensión">Línea Suspensión</option>
                <option value="Línea General">Línea General</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
              >
                <option value="ALL">Todos los estados</option>
                <option value="SUFICIENTE">Suficiente stock</option>
                <option value="STOCK_BAJO">Stock bajo</option>
                <option value="CRITICO">Crítico</option>
              </select>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={triggerExcelSelect}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all"
                title="Cargar CSV de inventario con codificación de repuestos"
              >
                <Upload className="w-4 h-4" /> Cargar Excel / CSV Stock
              </button>
              
              <button
                onClick={() => setIsCreatingItem(!isCreatingItem)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-4 h-4" /> Codificar Producto
              </button>

              <button
                onClick={() => setIsAdjusting(!isAdjusting)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border rounded-lg transition-all"
              >
                Registrar Movimiento
              </button>
            </div>
          </div>

          {/* Form Create Item */}
          {isCreatingItem && (
            <form onSubmit={handleCreateNewItem} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 animate-fadeIn">
              <h3 className="col-span-1 md:col-span-3 text-xs font-bold text-indigo-900 border-b pb-1">Codificación e Ingreso de Nuevo Producto</h3>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Código Único (Codificación)</label>
                <input 
                  type="text" 
                  placeholder="Ej: FR-BRM-782"
                  value={newItemCode}
                  onChange={(e) => setNewItemCode(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800 uppercase"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre Completo del Repuesto</label>
                <input 
                  type="text" 
                  placeholder="Ej: Pastillas de Freno Brembo Premium Traseras"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Línea de Producto WPC</label>
                <select 
                  value={newItemLine}
                  onChange={(e) => setNewItemLine(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                >
                  <option value="Línea Frenos">Línea Frenos</option>
                  <option value="Línea Filtros">Línea Filtros</option>
                  <option value="Línea Suspensión">Línea Suspensión</option>
                  <option value="Línea General">Línea General</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Cantidad Inicial</label>
                <input 
                  type="number" 
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Costo Unitario de Importación (COP)</label>
                <input 
                  type="number" 
                  value={newItemCost}
                  onChange={(e) => setNewItemCost(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Precio de Venta Sugerido (COP)</label>
                <input 
                  type="number" 
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                  required
                />
              </div>

              <div className="col-span-1 md:col-span-3 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setIsCreatingItem(false)} className="px-3 py-1 text-xs border bg-white text-slate-600 rounded">Cancelar</button>
                <button type="submit" className="px-3 py-1 text-xs bg-indigo-600 text-white font-bold rounded">Guardar y Codificar</button>
              </div>
            </form>
          )}

          {/* Form Adjustments */}
          {isAdjusting && (
            <form onSubmit={handleApplyAdjustment} className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 animate-fadeIn">
              <h3 className="col-span-1 md:col-span-4 text-xs font-bold text-slate-700 border-b pb-1">Ingresos, Salidas, Ventas o Bajas por Defecto/Muestreo</h3>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Seleccionar Repuesto</label>
                <select 
                  value={adjItemId}
                  onChange={(e) => setAdjItemId(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                  required
                >
                  <option value="">-- Seleccionar item --</option>
                  {wpcInventory.map(item => (
                    <option key={item.id} value={item.id}>[{item.code}] {item.name} (Stock: {item.quantity})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Movimiento</label>
                <select 
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as InventoryTxType)}
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                >
                  <option value="ENTRADA_COMPRA">ENTRADA: Abastecimiento por Compra</option>
                  <option value="ENTRADA_INICIAL">ENTRADA: Carga de Inventario Inicial</option>
                  <option value="STOCK_BODEGA">AJUSTE: Stock en Bodega (Ingreso/Reubicación)</option>
                  <option value="SALIDA_VENTA">SALIDA: Despacho por Venta Directa</option>
                  <option value="SALIDA_DEFECTO">SALIDA: Pérdida por Defecto de Fábrica</option>
                  <option value="SALIDA_MUESTREO">SALIDA: Muestreo Técnico o Muestras</option>
                  <option value="SALIDA_PERDIDA">SALIDA: Pérdida o Merma de Bodega</option>
                  <option value="STOCK_CLIENTES">MOVIMIENTO: Stock con Clientes (Consignación)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Cantidad</label>
                <input 
                  type="number" 
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  placeholder="Ej: 10"
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Editar Valor Unit. Movimiento (COP)</label>
                <input 
                  type="number" 
                  value={adjValue}
                  onChange={(e) => setAdjValue(e.target.value)}
                  placeholder="Ej: 320000"
                  className="p-1.5 text-xs border rounded bg-white text-slate-800 font-mono font-bold text-indigo-700"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Cliente / Persona Responsable</label>
                <input 
                  type="text" 
                  value={adjResponsible}
                  onChange={(e) => setAdjResponsible(e.target.value)}
                  placeholder="Ej: Rafael Olarte / Wendy S."
                  className="p-1.5 text-xs border rounded bg-white text-slate-800 font-semibold"
                  required
                />
              </div>

              <div className="col-span-1 md:col-span-4 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Observación / Justificación</label>
                <input 
                  type="text" 
                  value={adjDesc}
                  onChange={(e) => setAdjDesc(e.target.value)}
                  placeholder="Ej: Despacho Factura #02, muestras gratis de mercadeo"
                  className="p-1.5 text-xs border rounded bg-white text-slate-800"
                  required
                />
              </div>

              <div className="col-span-1 md:col-span-4 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setIsAdjusting(false)} className="px-3 py-1 text-xs border bg-white text-slate-600 rounded">Cancelar</button>
                <button type="submit" className="px-3 py-1 text-xs bg-indigo-600 text-white font-bold rounded">Procesar Movimiento</button>
              </div>
            </form>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b">
                  <th className="p-3">Código</th>
                  <th className="p-3">Repuesto</th>
                  <th className="p-3">Clasificación Interna</th>
                  <th className="p-3 text-right">Cant. Actual</th>
                  <th className="p-3">Unidad</th>
                  <th className="p-3 text-right">Costo Real (COP)</th>
                  <th className="p-3 text-right">Precio B2B (COP)</th>
                  <th className="p-3 text-right">Precio B2C (COP)</th>
                  <th className="p-3">Bodega / Ubicación</th>
                  <th className="p-3 text-center">Estado Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center p-8 text-slate-400 font-medium">No hay repuestos registrados en el inventario.</td>
                  </tr>
                ) : (
                  filteredInventory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-800">{item.code}</td>
                      <td className="p-3 font-medium">
                        <div>{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{item.productLine}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 uppercase">
                          {item.productClassification || "Repuesto"}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold font-mono">{item.quantity}</td>
                      <td className="p-3 text-slate-400">{item.unit}</td>
                      <td className="p-3 text-right font-mono text-slate-500 font-semibold">{formatCOP(item.unitCostReal || item.unitCost)}</td>
                      <td className="p-3 text-right font-mono text-amber-600 font-bold">{formatCOP(item.unitPriceB2B || item.unitPrice * 0.9)}</td>
                      <td className="p-3 text-right font-mono text-indigo-600 font-black">{formatCOP(item.unitPriceB2C || item.unitPrice)}</td>
                      <td className="p-3 text-slate-500">{item.location}</td>
                      <td className="p-3 text-center">
                        {item.status === "CRITICO" ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-extrabold text-[10px] animate-pulse">CRÍTICO (≤5)</span>
                        ) : item.status === "STOCK_BAJO" ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">STOCK BAJO</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">SUFICIENTE</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-100 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-normal">
              <strong>Estrategia de Codificación de Repuestos:</strong> El holding Matriz Maker pre-establece códigos únicos estructurados para WPC (e.g., <code>FR-</code> para Frenos, <code>FL-</code> para Filtros, <code>SU-</code> para Suspensión). Al cargar nuevos inventarios por Excel, asegúrese de codificar adecuadamente cada SKU para activar las alarmas automáticas de existencias críticas.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: KARDEX MOVIMIENTOS */}
      {wpcTab === "MOVIMIENTOS" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Kardex de Inventario - Historial Completo de Entradas y Salidas</h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-bold">WPC World Parts Company</span>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b">
                  <th className="p-3">Fecha y Hora</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Tipo de Movimiento</th>
                  <th className="p-3 text-right">Cantidad</th>
                  <th className="p-3 text-right">Valor Unitario</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3">Operario</th>
                  <th className="p-3">Concepto / Justificación</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {history.map(hist => (
                  <tr key={hist.id} className="hover:bg-slate-50/30">
                    <td className="p-3 text-slate-500 font-mono">
                      {new Date(hist.date).toLocaleString("es-CO")}
                    </td>
                    <td className="p-3 font-mono font-bold">{hist.itemCode}</td>
                    <td className="p-3 font-medium">{hist.itemName}</td>
                    <td className="p-3">
                      {hist.type.startsWith("ENTRADA") || hist.type === "STOCK_BODEGA" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <ArrowDownCircle className="w-3.5 h-3.5" /> INGRESO / AJUSTE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                          <ArrowUpCircle className="w-3.5 h-3.5" /> EGRESO / DESPACHO
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 ml-1">({hist.type.replace("SALIDA_", "").replace("ENTRADA_", "")})</span>
                    </td>
                    <td className="p-3 text-right font-bold font-mono text-slate-800">{hist.quantity}</td>
                    <td className="p-3 text-right font-mono text-slate-600 font-semibold">
                      {hist.movementValue ? formatCOP(hist.movementValue) : "N/A"}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {hist.responsiblePerson || "No asignado"}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{hist.user}</td>
                    <td className="p-3 text-slate-500 italic">{hist.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COTIZACIONES */}
      {wpcTab === "COTIZACIONES" && (
        <CommercialProcurementHub
          companyId="WPC"
          companyName="World Parts Company S.A.S."
          estimates={estimates}
          setEstimates={setEstimates}
          purchaseOrders={purchaseOrders}
          setPurchaseOrders={setPurchaseOrders}
          onAddTransaction={onAddTransaction}
        />
      )}

      {/* TAB 4: COMPRAS & PO */}
      {wpcTab === "COMPRAS" && (
        <CommercialProcurementHub
          companyId="WPC"
          companyName="World Parts Company S.A.S."
          estimates={estimates}
          setEstimates={setEstimates}
          purchaseOrders={purchaseOrders}
          setPurchaseOrders={setPurchaseOrders}
          onAddTransaction={onAddTransaction}
        />
      )}

      {/* TAB 5: LOGISTICA */}
      {wpcTab === "LOGISTICA" && (
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-bold text-slate-700">Rastreo y Seguimiento de Pedidos de Importación de Autopartes</h3>
            <p className="text-[11px] text-slate-400">Control logístico integrado con navieras comerciales internacionales de WPC.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchaseOrders.filter(p => p.trackingNumber).map(po => (
              <div key={po.id} className="p-4 rounded-xl border border-indigo-100 bg-slate-50 flex flex-col gap-3 shadow-xs">
                <div className="flex justify-between items-center pb-2 border-b">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-indigo-600 animate-bounce" />
                    <span className="text-xs font-bold text-indigo-950 font-mono">{po.id}</span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">VÍA MARÍTIMA</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Naviera / Carrier</p>
                    <p className="font-semibold text-slate-700">{po.carrier}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Booking / Tracking</p>
                    <p className="font-mono font-bold text-indigo-700">{po.trackingNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Origen</p>
                    <p className="font-semibold text-slate-700">Puerto de Trieste, Italia</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Fecha Est. Llegada (ETA)</p>
                    <p className="font-bold text-slate-800 font-mono text-emerald-600">{po.etaDate}</p>
                  </div>
                </div>

                {/* Logistics Steps */}
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Progreso de Despacho Aduanero</p>
                  
                  {/* Progress Line */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-indigo-600 rounded-full animate-pulse" />
                  </div>

                  <div className="grid grid-cols-4 text-[9px] font-bold text-center text-slate-400">
                    <span className="text-emerald-600">Salida Italia</span>
                    <span className="text-emerald-600">En Alta Mar</span>
                    <span className="text-indigo-600 animate-pulse">Cartagena (Aduana)</span>
                    <span>Bogotá Bodega</span>
                  </div>
                </div>
              </div>
            ))}

            {purchaseOrders.filter(p => p.trackingNumber).length === 0 && (
              <div className="col-span-2 text-center p-8 bg-slate-50 text-slate-400 rounded-xl">
                No hay órdenes de importación marítima en tránsito actualmente.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
