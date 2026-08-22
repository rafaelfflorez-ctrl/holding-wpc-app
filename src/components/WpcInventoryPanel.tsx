import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { WENDY_LEGAL_INFO } from "../assets/wendySignatureData";
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

  // History tracking
  const [history, setHistory] = useState<InventoryHistoryEntry[]>([]);

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

  const handleReceivePO = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    // Update PO Status
    setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: "RECIBIDO" } : p));

    // Increase stock for each item in the purchase order
    po.items.forEach(poItem => {
      const invItem = inventory.find(i => i.code === poItem.code);
      if (invItem) {
        const updatedQty = invItem.quantity + poItem.quantity;
        let newStatus: "SUFICIENTE" | "STOCK_BAJO" | "CRITICO" = "SUFICIENTE";
        if (updatedQty <= 5) newStatus = "CRITICO";
        else if (updatedQty <= 15) newStatus = "STOCK_BAJO";

        setInventory(prev => prev.map(i => i.id === invItem.id ? {
          ...i,
          quantity: updatedQty,
          status: newStatus,
          lastUpdated: new Date().toISOString()
        } : i));

        // Add to history
        setHistory(prev => [
          {
            id: `H-PO-${poId}-${Date.now()}`,
            itemId: invItem.id,
            itemCode: invItem.code,
            itemName: invItem.name,
            date: new Date().toISOString(),
            type: "ENTRADA_COMPRA",
            quantity: poItem.quantity,
            user: currentUser.name,
            description: `Recibido por Orden de Compra ${poId}`,
            companyId: "WPC"
          },
          ...prev
        ]);
      }
    });

    // Post to actual ledger
    onAddTransaction({
      type: "COMPRA",
      amount: po.total,
      customerSupplier: po.supplier,
      description: `Compra importación de autopartes Brembo según OC recibida ${poId}`,
      category: "Importación Recibida",
      status: "CONTABILIZADO",
      account: "143501 - Mercancías de Importación - WPC Autopartes",
      companyId: "WPC"
    });

    alert(`✓ Orden de Compra ${poId} marcada como RECIBIDA. Se incrementó el inventario y se generó el asiento de compra.`);
  };

  const handleAcceptEstimate = (cotId: string) => {
    const cot = estimates.find(c => c.id === cotId);
    if (!cot) return;

    setEstimates(prev => prev.map(c => c.id === cotId ? { ...c, status: "ACEPTADO" } : c));

    // Deduct stock
    let stockError = false;
    cot.items.forEach(cotItem => {
      const invItem = inventory.find(i => i.code === cotItem.code);
      if (invItem && invItem.quantity < cotItem.quantity) {
        stockError = true;
      }
    });

    if (stockError) {
      alert("⚠️ Advertencia: Algunos productos de la cotización no cuentan con suficiente stock en bodega. El estado de la cotización cambió, pero deberá abastecer el inventario primero.");
    }

    // Deduct if stock is okay
    cot.items.forEach(cotItem => {
      const invItem = inventory.find(i => i.code === cotItem.code);
      if (invItem) {
        const updatedQty = Math.max(0, invItem.quantity - cotItem.quantity);
        let newStatus: "SUFICIENTE" | "STOCK_BAJO" | "CRITICO" = "SUFICIENTE";
        if (updatedQty <= 5) newStatus = "CRITICO";
        else if (updatedQty <= 15) newStatus = "STOCK_BAJO";

        setInventory(prev => prev.map(i => i.id === invItem.id ? {
          ...i,
          quantity: updatedQty,
          status: newStatus,
          lastUpdated: new Date().toISOString()
        } : i));

        // Add to history
        setHistory(prev => [
          {
            id: `H-COT-${cotId}-${Date.now()}`,
            itemId: invItem.id,
            itemCode: invItem.code,
            itemName: invItem.name,
            date: new Date().toISOString(),
            type: "SALIDA_VENTA",
            quantity: cotItem.quantity,
            user: currentUser.name,
            description: `Venta despachada por Cotización Aceptada ${cotId}`,
            companyId: "WPC"
          },
          ...prev
        ]);
      }
    });

    // Post sale to main accounting
    onAddTransaction({
      type: "VENTA",
      amount: cot.total,
      customerSupplier: cot.customer,
      description: `Venta comercial despachada por Cotización autorizada ${cotId}`,
      category: "Venta Mayorista Autopartes",
      status: "CONTABILIZADO",
      account: "413505 - Ingresos Venta Autopartes WPC",
      companyId: "WPC"
    });

    alert(`✓ Cotización ${cotId} marcada como ACEPTADA. Se despachó el inventario y se generó el asiento de venta.`);
  };

  const handleExportCotizacion = (cot: Estimate) => {
    const esc = (v: any) => {
      const s = String(v ?? "");
      return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    let content = "data:text/csv;charset=utf-8,\uFEFF";
    content += `COTIZACION,${esc(cot.id)},FECHA,${esc(cot.date)}\r\n`;
    content += `CLIENTE,${esc(cot.customer)},VENCIMIENTO,${esc(cot.validUntil)}\r\n\r\n`;
    content += "CODIGO,DESCRIPCION,CANTIDAD,PRECIO_UNITARIO,TOTAL\r\n";
    
    cot.items.forEach(item => {
      content += `${esc(item.code)},${esc(item.description)},${item.quantity},${item.unitPrice},${item.total}\r\n`;
    });

    content += `\r\nSUBTOTAL,,,${cot.subtotal}\r\n`;
    content += `IVA (19%),,,${cot.taxAmount}\r\n`;
    content += `TOTAL,,,${cot.total}\r\n`;

    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cotizacion_${cot.id}_WPC.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePDF = (cot: Estimate) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Default commercial values for holding companies
    let brandColor = [79, 70, 229]; // Indigo
    let brandHex = "#4F46E5";
    let companyName = "WORLD PARTS COMPANY S.A.S.";
    let companyNit = "NIT: 901.341.558-1";
    let companyAddress = "Alto Bosque, Transversal 49 # 21B-55, Cartagena - Colombia";
    let companyPhone = "+57 3235294526";
    let companyEmail = "logisticawpc@gmail.com";
    let companyMoto = "Suministros e importaciones de productos";

    if (cot.companyId === "FUNDACION") {
      brandColor = [219, 39, 119]; // Magenta
      brandHex = "#DB2777";
      companyName = "FUNDACIÓN SHE MAKER";
      companyNit = "NIT: 901.837.241-9";
      companyAddress = "Calle 45 # 13-10, Bogotá D.C., Colombia";
      companyPhone = "Tel: +57 (601) 321-7492";
      companyEmail = "contacto@shemaker.org";
      companyMoto = "Empoderando mujeres mediante la tecnología, hardware y código";
    } else if (cot.companyId === "RAEZ") {
      brandColor = [217, 119, 6]; // Amber
      brandHex = "#D97706";
      companyName = "RAEZ INGENIERÍA S.A.S.";
      companyNit = "NIT: 901.214.568-1";
      companyAddress = "Zona Industrial Puente Aranda, Bogotá D.C., Colombia";
      companyPhone = "Tel: +57 (601) 752-1920";
      companyEmail = "proyectos@raez.co";
      companyMoto = "Ingeniería de precisión, mecanizados de alta tolerancia y soldadura";
    } else if (cot.companyId === "HELENAMAR") {
      brandColor = [5, 150, 105]; // Emerald
      brandHex = "#059669";
      companyName = "HELENAMAR TURISMO E INMOBILIARIA";
      companyNit = "NIT: 900.564.123-7";
      companyAddress = "Av. Rodadero, Edificio Alamar, Santa Marta, Colombia";
      companyPhone = "Tel: +57 (605) 421-9876";
      companyEmail = "reservas@helenamar.com";
      companyMoto = "Alquiler vacacional de lujo, corretaje inmobiliario y turismo en el Caribe";
    }

    // Top background color bar
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(0, 0, 210, 4, "F");

    // Geometric badge logo
    const logoX = 15;
    const logoY = 15;
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.roundedRect(logoX, logoY, 14, 14, 2, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const letter = cot.companyId === "FUNDACION" ? "F" : cot.companyId === "RAEZ" ? "R" : cot.companyId === "HELENAMAR" ? "H" : "W";
    doc.text(letter, logoX + 5, logoY + 9.5);

    // Brand details beside logo
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(companyName, logoX + 18, logoY + 5);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // Slate-50
    doc.text(companyMoto, logoX + 18, logoY + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(companyNit, logoX + 18, logoY + 13);

    // Right aligned company details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(companyAddress, 195, logoY + 4, { align: "right" });
    doc.text(companyPhone, 195, logoY + 8, { align: "right" });
    doc.text(companyEmail, 195, logoY + 12, { align: "right" });

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(15, 34, 195, 34);

    // --- Title block ---
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 38, 180, 16, 1.5, 1.5, "F");

    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("COTIZACIÓN COMERCIAL", 20, 48);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`REF: ${cot.id}`, 190, 45, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha Emisión: ${cot.date}   |   Válido Hasta: ${cot.validUntil}`, 190, 50, { align: "right" });

    // --- Client Metadata ---
    const clientY = 58;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, clientY, 180, 28, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text("INFORMACIÓN DESTINATARIO (CLIENTE)", 20, clientY + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("Nombre / Cliente:", 20, clientY + 13);
    doc.text("NIT / Cédula:", 20, clientY + 19);
    doc.text("Dirección:", 20, clientY + 25);

    doc.setFont("helvetica", "normal");
    doc.text(cot.customer, 48, clientY + 13);
    doc.text(cot.customerNit || "N/A", 48, clientY + 19);
    doc.text(cot.customerAddress || "No registrada", 48, clientY + 25);

    doc.setFont("helvetica", "bold");
    doc.text("Teléfono:", 115, clientY + 13);
    doc.text("Correo Elec.:", 115, clientY + 19);
    
    doc.setFont("helvetica", "normal");
    doc.text(cot.customerPhone || "N/A", 135, clientY + 13);
    doc.text(cot.customerEmail || "N/A", 135, clientY + 19);

    // --- Table ---
    const tableHeaderY = 92;
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(15, tableHeaderY, 180, 7.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("CÓDIGO", 18, tableHeaderY + 5);
    doc.text("DESCRIPCIÓN DEL ARTÍCULO / SERVICIO", 42, tableHeaderY + 5);
    doc.text("CANT.", 130, tableHeaderY + 5, { align: "right" });
    doc.text("VALOR UNIT. (COP)", 160, tableHeaderY + 5, { align: "right" });
    doc.text("TOTAL (COP)", 192, tableHeaderY + 5, { align: "right" });

    let currentY = tableHeaderY + 7.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    cot.items.forEach((item, index) => {
      const splitDesc = doc.splitTextToSize(item.description, 83);
      const rowHeight = Math.max(8, splitDesc.length * 4 + 3);

      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(15, currentY, 180, rowHeight, "F");

      doc.setDrawColor(241, 245, 249);
      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);

      doc.setFont("helvetica", "bold");
      doc.text(item.code || "N/A", 18, currentY + 5);
      
      doc.setFont("helvetica", "normal");
      doc.text(splitDesc, 42, currentY + 5);
      
      doc.text(String(item.quantity), 130, currentY + 5, { align: "right" });
      doc.text(formatCOP(item.unitPrice), 160, currentY + 5, { align: "right" });
      
      doc.setFont("helvetica", "bold");
      doc.text(formatCOP(item.quantity * item.unitPrice), 192, currentY + 5, { align: "right" });

      currentY += rowHeight;
    });

    const totalsY = currentY + 4;
    const boxWidth = 70;
    const boxX = 195 - boxWidth;

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(boxX, totalsY, 195, totalsY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("SUBTOTAL:", boxX + 2, totalsY + 6);
    doc.text("IVA REPERCUTIDO (19%):", boxX + 2, totalsY + 11);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(formatCOP(cot.subtotal), 192, totalsY + 6, { align: "right" });
    doc.text(formatCOP(cot.taxAmount), 192, totalsY + 11, { align: "right" });

    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.roundedRect(boxX, totalsY + 14, boxWidth, 8, 0.8, 0.8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL NETO:", boxX + 4, totalsY + 19.5);
    doc.text(formatCOP(cot.total), 192, totalsY + 19.5, { align: "right" });

    const footerY = totalsY + 30;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, footerY, 180, 22, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Notas y Condiciones Comerciales:", 18, footerY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const notesText = cot.notes || "Validez de la oferta por 30 días calendario a partir de la fecha de emisión. Los precios incluyen el impuesto al valor agregado (IVA). Despacho sujeto a disponibilidad de stock en el inventario real del holding.";
    const splitNotes = doc.splitTextToSize(notesText, 174);
    doc.text(splitNotes, 18, footerY + 10);

    const sigY = footerY + 30;
    if (sigY < 280) {
      try {
        doc.addImage(WENDY_LEGAL_INFO.signatureImg, "JPEG", 20, sigY - 7, 50, 16);
      } catch (e) {
        console.warn("Signature img load warn", e);
      }

      doc.setDrawColor(203, 213, 225);
      doc.line(15, sigY + 10, 75, sigY + 10);
      doc.line(135, sigY + 10, 195, sigY + 10);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text("WENDY COLPAS FERNÁNDEZ", 45, sigY + 14, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("C.C. 1.143.374.671 de Barranquilla", 45, sigY + 17.5, { align: "center" });
      doc.text("Representante Legal & Dir. Administrativa", 45, sigY + 21, { align: "center" });
      doc.text("World Parts Company S.A.S.", 45, sigY + 24.5, { align: "center" });

      doc.text("Firma de Aceptación Cliente", 165, sigY + 14, { align: "center" });
      doc.text("C.C. / NIT Cliente", 165, sigY + 18, { align: "center" });
    }

    doc.save(`Cotizacion_${cot.id}_Formal.pdf`);
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
