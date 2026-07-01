import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface Item {
  id?: number;
  itemCode: string;
  tsCode: string;
  msCode: string;
  nama: string;
  kategori: string;
  binLoc: string;
  uom: string;
  stok: number;
  safetyStok: number;
  status: string;
}

export interface UserPermissions {
  transaksi_masuk?: boolean;
  transaksi_keluar?: boolean;
}

export interface CurrentUser {
  id: number;
  nik: string;
  namaLengkap: string;
  email: string;
  role: 'admin' | 'kepala_gudang' | 'petugas';
  noHp: string | null;
  departemen: string | null;
  jabatan: string | null;
  seksi: string | null;
  status: string;
  tanggalGabung: string | null;
  loginTerakhir: string | null;
  permissions: UserPermissions;
}

interface AppContextType {
  currentUser: CurrentUser | null;
  token: string | null;
  setAuth: (user: CurrentUser, token: string) => void;
  clearAuth: () => void;
  items: Item[];
  setItems: (items: Item[]) => void;
  refreshItems: () => Promise<void>;
  itemsLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const TOKEN_KEY = 'tel_gudang_token';
const USER_KEY = 'tel_gudang_user';

function mapRow(row: Record<string, unknown>): Item {
  return {
    id: row.id as number,
    itemCode: (row.itemCode ?? row.item_code) as string,
    tsCode: ((row.tsCode ?? row.ts_code) as string) ?? '',
    msCode: ((row.msCode ?? row.ms_code) as string) ?? '',
    nama: row.nama as string,
    kategori: (row.kategori as string) ?? '',
    binLoc: ((row.binLoc ?? row.bin_loc) as string) ?? '',
    uom: (row.uom as string) ?? 'EA',
    stok: row.stok as number,
    safetyStok: ((row.safetyStok ?? row.safety_stok) as number) ?? 5,
    status: (row.status as string) ?? 'Normal',
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    const u = JSON.parse(stored);
    return { ...u, permissions: u.permissions ?? {} };
  });
  const [items, setItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const refreshItems = useCallback(async (authToken?: string) => {
    const t = authToken ?? token;
    if (!t) return;
    setItemsLoading(true);
    try {
      const res = await fetch('/api/items', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data: Record<string, unknown>[] = await res.json();
        setItems(data.map(mapRow));
      }
    } catch {
      // silent — items stay as-is
    } finally {
      setItemsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshItems(token);
    } else {
      setItems([]);
    }
  }, [token]);

  const setAuth = (user: CurrentUser, newToken: string) => {
    setCurrentUser(user);
    setToken(newToken);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    refreshItems(newToken);
  };

  const clearAuth = () => {
    setCurrentUser(null);
    setToken(null);
    setItems([]);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AppContext.Provider value={{
      currentUser, token, setAuth, clearAuth,
      items, setItems, refreshItems, itemsLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
