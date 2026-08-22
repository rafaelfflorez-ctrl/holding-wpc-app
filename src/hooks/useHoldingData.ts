import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  fetchConfig,
  getSupabaseClient,
  isSupabaseConfigured,
  AppConfig,
} from "../lib/supabase";
import { apiFetch } from "../lib/api";
import {
  UserProfile,
  UserRole,
  Transaction,
  InventoryItem,
  PurchaseOrder,
  Estimate,
  ServiceOrder,
  Property,
  FundacionProgram,
  Donation,
  ThresholdSetting,
  Notification,
} from "../types";
import { INITIAL_USERS, INITIAL_THRESHOLDS } from "../data";

export const APP_DATA_KEYS = [
  "users",
  "transactions",
  "inventory",
  "purchaseOrders",
  "estimates",
  "serviceOrders",
  "properties",
  "programs",
  "donations",
  "thresholds",
  "notifications",
] as const;

export type AppDataKey = (typeof APP_DATA_KEYS)[number];
export type SyncStatus = "idle" | "saving" | "saved" | "error";

interface Setters {
  setUsers: (v: UserProfile[]) => void;
  setTransactions: (v: Transaction[]) => void;
  setInventory: (v: InventoryItem[]) => void;
  setPurchaseOrders: (v: PurchaseOrder[]) => void;
  setEstimates: (v: Estimate[]) => void;
  setServiceOrders: (v: ServiceOrder[]) => void;
  setProperties: (v: Property[]) => void;
  setPrograms: (v: FundacionProgram[]) => void;
  setDonations: (v: Donation[]) => void;
  setThresholds: (v: ThresholdSetting[]) => void;
  setNotifications: (v: Notification[]) => void;
}

async function loadAllData(supabase: SupabaseClient, session: Session, setters: Setters) {
  const { data: rows, error } = await supabase
    .from("app_data")
    .select("key, value");
  if (error) throw error;

  const map: Record<string, any> = {};
  (rows || []).forEach((r: any) => {
    map[r.key] = r.value;
  });

  if (Array.isArray(map.users)) setters.setUsers(map.users);
  if (Array.isArray(map.transactions)) setters.setTransactions(map.transactions);
  if (Array.isArray(map.inventory)) setters.setInventory(map.inventory);
  if (Array.isArray(map.purchaseOrders)) setters.setPurchaseOrders(map.purchaseOrders);
  if (Array.isArray(map.estimates)) setters.setEstimates(map.estimates);
  if (Array.isArray(map.serviceOrders)) setters.setServiceOrders(map.serviceOrders);
  if (Array.isArray(map.properties)) setters.setProperties(map.properties);
  if (Array.isArray(map.programs)) setters.setPrograms(map.programs);
  if (Array.isArray(map.donations)) setters.setDonations(map.donations);
  if (Array.isArray(map.thresholds)) setters.setThresholds(map.thresholds);
  if (Array.isArray(map.notifications)) setters.setNotifications(map.notifications);

  return map.users as UserProfile[] | undefined;
}

function resolveCurrentUser(users: UserProfile[], session: Session): UserProfile {
  const email = session.user?.email?.toLowerCase() || "";
  const found = users.find((u) => u.email?.toLowerCase() === email);
  if (found) return found;
  // Perfil no existe aÃºn -> crear uno por defecto (AUXILIAR_CONTABLE).
  return {
    id: session.user.id,
    name: session.user.user_metadata?.name || session.user.email || "Usuario",
    email: session.user.email || email,
    role: (session.user.user_metadata?.role as UserRole) || UserRole.AUXILIAR_CONTABLE,
    title: session.user.user_metadata?.title || "Auxiliar Contable",
    avatar: "",
    lastLogin: new Date().toISOString(),
    isActive: true,
  };
}

export function useHoldingData() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [programs, setPrograms] = useState<FundacionProgram[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [thresholds, setThresholds] = useState<ThresholdSetting[]>(INITIAL_THRESHOLDS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const clientRef = useRef<SupabaseClient | null>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  // Estado inicial: configuraciÃ³n + restauraciÃ³n de sesiÃ³n + carga de datos.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cfg = await fetchConfig();
        if (!active) return;
        setConfig(cfg);
        if (isSupabaseConfigured(cfg)) {
          const supabase = await getSupabaseClient();
          clientRef.current = supabase;
          const { data } = await supabase.auth.getSession();
          if (!active) return;
          setSession(data.session);
          if (data.session) {
            const profiles = await loadAllData(supabase, data.session, {
              setUsers,
              setTransactions,
              setInventory,
              setPurchaseOrders,
              setEstimates,
              setServiceOrders,
              setProperties,
              setPrograms,
              setDonations,
              setThresholds,
              setNotifications,
            });
            setCurrentUser(resolveCurrentUser(profiles || [], data.session));
          }
        }
      } catch (e: any) {
        if (active) setConfigError(e?.message || String(e));
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = clientRef.current;
    if (!supabase) throw new Error("Supabase no estÃ¡ configurado.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profiles = await loadAllData(supabase, data.session, {
      setUsers,
      setTransactions,
      setInventory,
      setPurchaseOrders,
      setEstimates,
      setServiceOrders,
      setProperties,
      setPrograms,
      setDonations,
      setThresholds,
      setNotifications,
    });
    setSession(data.session);
    setCurrentUser(resolveCurrentUser(profiles || [], data.session));
  }, []);

  const logout = useCallback(async () => {
    try {
      await clientRef.current?.auth.signOut();
    } catch (e) {
      console.warn("Error al cerrar sesiÃ³n", e);
    }
    setSession(null);
    setCurrentUser(null);
  }, []);

  // Persistencia debounced de todas las colecciones.
  const allData = useMemo(
    () => ({
      users,
      transactions,
      inventory,
      purchaseOrders,
      estimates,
      serviceOrders,
      properties,
      programs,
      donations,
      thresholds,
      notifications,
    }),
    [users, transactions, inventory, purchaseOrders, estimates, serviceOrders, properties, programs, donations, thresholds, notifications]
  );
  const dataSnapshot = JSON.stringify(allData);

  useEffect(() => {
    const supabase = clientRef.current;
    if (!supabase || !sessionRef.current) return;
    const t = setTimeout(async () => {
      try {
        setSyncStatus("saving");
        const parsed = JSON.parse(dataSnapshot);
        const rows = Object.keys(parsed).map((key) => ({
          key,
          value: parsed[key],
          updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase.from("app_data").upsert(rows, { onConflict: "key" });
        if (error) throw error;
        setSyncStatus("saved");
        setLastSyncError(null);
      } catch (e: any) {
        console.error("Persistencia fallÃ³:", e);
        setSyncStatus("error");
        setLastSyncError(e?.message || String(e));
      }
    }, 700);
    return () => clearTimeout(t);
  }, [dataSnapshot, session]);

  // Crear usuario desde el panel de administraciÃ³n (requiere SUPABASE_SERVICE_ROLE_KEY).
  const createUserAccount = useCallback(
    async (payload: { email: string; password: string; name: string; role: UserRole; title?: string }) => {
      const res = await apiFetch("/api/auth/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "No se pudo crear el usuario.");
      }
      // Recargar perfiles desde la nube.
      const supabase = clientRef.current;
      if (supabase && sessionRef.current) {
        const profiles = await loadAllData(supabase, sessionRef.current, {
          setUsers,
          setTransactions,
          setInventory,
          setPurchaseOrders,
          setEstimates,
          setServiceOrders,
          setProperties,
          setPrograms,
          setDonations,
          setThresholds,
          setNotifications,
        });
        if (profiles) setUsers(profiles);
      }
      return data;
    },
    []
  );

  const isAuthenticated = Boolean(session && currentUser);

  return {
    config,
    configError,
    ready,
    session,
    currentUser,
    isAuthenticated,
    syncStatus,
    lastSyncError,
    login,
    logout,
    createUserAccount,
    // estado
    users,
    setUsers,
    transactions,
    setTransactions,
    inventory,
    setInventory,
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
  };
}
