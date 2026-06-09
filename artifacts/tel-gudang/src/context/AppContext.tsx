import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Status = 'Normal' | 'Menipis' | 'Habis';
export type Kategori = 'Civil' | 'Electrical' | 'Mechanical' | 'Furniture' | 'Consumables' | 'GH Consumable';

export interface Item {
  tsCode: string;
  msCode: string;
  nama: string;
  kategori: Kategori;
  binLoc: string;
  uom: string;
  stok: number;
  safetyStok: number;
  status: Status;
}

export interface CurrentUser {
  id: number;
  nik: string;
  namaLengkap: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  departemen: string | null;
  jabatan: string | null;
  seksi: string | null;
}

export interface Transaksi {
  id: string;
  waktu: string;
  tsCode: string;
  nama: string;
  jumlah: number;
  petugas: string;
  kondisi?: string;
  noPo?: string;
  tujuan?: string;
  keperluan?: string;
}

interface AppContextType {
  currentUser: CurrentUser | null;
  token: string | null;
  setAuth: (user: CurrentUser, token: string) => void;
  clearAuth: () => void;
  items: Item[];
  setItems: (items: Item[]) => void;
  transaksiMasuk: Transaksi[];
  setTransaksiMasuk: (t: Transaksi[]) => void;
  transaksiKeluar: Transaksi[];
  setTransaksiKeluar: (t: Transaksi[]) => void;
}

const ITEM_DATA: Item[] = [
  { tsCode: 'TS-001', msCode: 'MS-001', nama: 'ACOUSTIC PANEL AURATONE SIZE 600x1200x15MM', kategori: 'Civil', binLoc: 'TS-D.10', uom: 'BOX', stok: 40, safetyStok: 5, status: 'Normal' },
  { tsCode: 'TS-003', msCode: 'MS-003', nama: 'ADHESIVE CYANDACRYLATE AIBON GLUE 700GR', kategori: 'Consumables', binLoc: 'TS-D.10', uom: 'CANS', stok: 26, safetyStok: 5, status: 'Normal' },
  { tsCode: 'TS-005', msCode: 'MS-005', nama: 'AIR CONDITIONER NON INVERTER 1.5PK CS-YN12TKJ', kategori: 'Mechanical', binLoc: 'TS-CONT.E', uom: 'UNIT', stok: 5, safetyStok: 5, status: 'Menipis' },
  { tsCode: 'TS-006', msCode: 'MS-006', nama: 'AIR CONDITIONER NON INVERTER 2PK CS-YN18TKJ', kategori: 'Mechanical', binLoc: 'TS-CONT.E', uom: 'UNIT', stok: 4, safetyStok: 5, status: 'Menipis' },
  { tsCode: 'TS-008', msCode: 'MS-008', nama: 'ALAT PEL @LUSIN=12EA', kategori: 'GH Consumable', binLoc: 'TS-J.13', uom: 'EA', stok: 0, safetyStok: 2, status: 'Habis' },
  { tsCode: 'TS-009', msCode: 'MS-009', nama: 'ANCHOR PLASTIC SIZE 10-12', kategori: 'Consumables', binLoc: 'TS-J.17', uom: 'EA', stok: 17, safetyStok: 20, status: 'Menipis' },
  { tsCode: 'TS-025', msCode: 'MS-025', nama: 'BALLAST LAMP TYPE BHL 80L 80W 220V 50Hz', kategori: 'Electrical', binLoc: 'TS-L.23', uom: 'EA', stok: 34, safetyStok: 5, status: 'Normal' },
  { tsCode: 'TS-044', msCode: 'MS-044', nama: 'BATTERY NON RECHARGEABLE TYPE AAA 1.5V', kategori: 'Consumables', binLoc: 'TS-F.13', uom: 'EA', stok: 99, safetyStok: 10, status: 'Normal' },
  { tsCode: 'TS-047', msCode: 'MS-047', nama: 'BAYGON', kategori: 'GH Consumable', binLoc: 'TS-J.13', uom: 'CANS', stok: 0, safetyStok: 5, status: 'Habis' },
  { tsCode: 'TS-059', msCode: 'MS-059', nama: 'BED MDL MESSARIA SIZE 120x200CM WOOD', kategori: 'Furniture', binLoc: 'TS-FURNITURE.D', uom: 'SET', stok: 7, safetyStok: 5, status: 'Normal' },
  { tsCode: 'TS-063', msCode: 'MS-063', nama: 'BED SINGLE TYPE SHUMO FRAME IRON 100x200CM', kategori: 'Furniture', binLoc: '-', uom: 'UNIT', stok: 58, safetyStok: 2, status: 'Normal' },
  { tsCode: 'TS-084', msCode: 'MS-084', nama: 'BRICK STONE SIZE 100x100x200MM', kategori: 'Civil', binLoc: 'TS-GD.SAND', uom: 'EA', stok: 4180, safetyStok: 100, status: 'Normal' },
  { tsCode: 'TS-096', msCode: 'MS-096', nama: 'BULB LED P-RTG 19W COOL DAYLIGHT', kategori: 'Electrical', binLoc: 'TS-A.02', uom: 'EA', stok: 110, safetyStok: 30, status: 'Normal' },
  { tsCode: 'TS-098', msCode: 'MS-098', nama: 'BULB LED P-RTG 8W WHITE 6500K', kategori: 'Electrical', binLoc: 'TS-A.02', uom: 'EA', stok: 285, safetyStok: 20, status: 'Normal' },
  { tsCode: 'TS-099', msCode: 'MS-099', nama: 'BULB TL-LED ECOFIT TUBE 16W 120CM', kategori: 'Electrical', binLoc: 'TS-L.29', uom: 'EA', stok: 0, safetyStok: 20, status: 'Habis' },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

const TOKEN_KEY = 'tel_gudang_token';
const USER_KEY = 'tel_gudang_user';

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [items, setItems] = useState<Item[]>(ITEM_DATA);
  const [transaksiMasuk, setTransaksiMasuk] = useState<Transaksi[]>([]);
  const [transaksiKeluar, setTransaksiKeluar] = useState<Transaksi[]>([]);

  const setAuth = (user: CurrentUser, newToken: string) => {
    setCurrentUser(user);
    setToken(newToken);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  const clearAuth = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AppContext.Provider value={{
      currentUser, token, setAuth, clearAuth,
      items, setItems,
      transaksiMasuk, setTransaksiMasuk,
      transaksiKeluar, setTransaksiKeluar,
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
