import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { exportStyledExcel } from '@/lib/excel-export';
import { Layout } from '@/components/Layout';
import { useAppContext } from '@/context/AppContext';
import { PeriodePicker } from '@/components/PeriodePicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Search, FileDown, Activity, CalendarDays, Users, Zap, FileX, RefreshCw,
  ChevronDown, ChevronRight, LogIn, LogOut, Package, PackagePlus, PackageMinus,
  UserPlus, UserCog, UserMinus, KeyRound, ShieldCheck, FolderPlus, FolderEdit,
  FolderMinus, BarChart2, Upload, ArrowUpDown, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ActivityLog {
  id: number;
  aksi: string;
  detail: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userId: number;
  namaLengkap: string | null;
  nik: string | null;
  role: 'admin' | 'kepala_gudang' | 'petugas' | null;
}

const today = new Date().toISOString().slice(0, 10);
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

// ─── Label & kategori ────────────────────────────────────────────────────────
const AKSI_META: Record<string, { label: string; icon: React.ReactNode; color: string; kategori: string }> = {
  LOGIN:              { label: 'Login',              icon: <LogIn className="h-3 w-3" />,        color: 'bg-slate-100 text-slate-600 border-slate-200',   kategori: 'Auth' },
  LOGOUT:             { label: 'Logout',             icon: <LogOut className="h-3 w-3" />,       color: 'bg-slate-100 text-slate-600 border-slate-200',   kategori: 'Auth' },
  UPDATE_PROFILE:     { label: 'Edit Profil',        icon: <User className="h-3 w-3" />,         color: 'bg-blue-100 text-blue-700 border-blue-200',      kategori: 'Auth' },
  CHANGE_PASSWORD:    { label: 'Ganti Password',     icon: <KeyRound className="h-3 w-3" />,     color: 'bg-yellow-100 text-yellow-700 border-yellow-200', kategori: 'Auth' },
  RESET_PASSWORD:     { label: 'Reset Password',     icon: <KeyRound className="h-3 w-3" />,     color: 'bg-orange-100 text-orange-700 border-orange-200', kategori: 'Auth' },
  CREATE_ITEM:        { label: 'Tambah Barang',      icon: <PackagePlus className="h-3 w-3" />,  color: 'bg-green-100 text-green-700 border-green-200',   kategori: 'Barang' },
  UPDATE_ITEM:        { label: 'Edit Barang',        icon: <Package className="h-3 w-3" />,      color: 'bg-blue-100 text-blue-700 border-blue-200',      kategori: 'Barang' },
  DELETE_ITEM:        { label: 'Hapus Barang',       icon: <PackageMinus className="h-3 w-3" />, color: 'bg-red-100 text-red-700 border-red-200',         kategori: 'Barang' },
  UPDATE_STOK:        { label: 'Update Stok',        icon: <ArrowUpDown className="h-3 w-3" />,  color: 'bg-cyan-100 text-cyan-700 border-cyan-200',      kategori: 'Barang' },
  IMPORT_ITEMS:       { label: 'Import Barang',      icon: <Upload className="h-3 w-3" />,       color: 'bg-purple-100 text-purple-700 border-purple-200', kategori: 'Barang' },
  BARANG_MASUK:       { label: 'Barang Masuk',       icon: <PackagePlus className="h-3 w-3" />,  color: 'bg-emerald-100 text-emerald-700 border-emerald-200', kategori: 'Transaksi' },
  BARANG_KELUAR:      { label: 'Barang Keluar',      icon: <PackageMinus className="h-3 w-3" />, color: 'bg-orange-100 text-orange-700 border-orange-200', kategori: 'Transaksi' },
  CREATE_USER:        { label: 'Tambah Pengguna',    icon: <UserPlus className="h-3 w-3" />,     color: 'bg-green-100 text-green-700 border-green-200',   kategori: 'Pengguna' },
  UPDATE_USER:        { label: 'Edit Pengguna',      icon: <UserCog className="h-3 w-3" />,      color: 'bg-blue-100 text-blue-700 border-blue-200',      kategori: 'Pengguna' },
  DELETE_USER:        { label: 'Hapus Pengguna',     icon: <UserMinus className="h-3 w-3" />,    color: 'bg-red-100 text-red-700 border-red-200',         kategori: 'Pengguna' },
  UPDATE_PERMISSIONS: { label: 'Ubah Akses',         icon: <ShieldCheck className="h-3 w-3" />,  color: 'bg-violet-100 text-violet-700 border-violet-200', kategori: 'Pengguna' },
  CREATE_KATEGORI:    { label: 'Tambah Kategori',    icon: <FolderPlus className="h-3 w-3" />,   color: 'bg-green-100 text-green-700 border-green-200',   kategori: 'Kategori' },
  UPDATE_KATEGORI:    { label: 'Edit Kategori',      icon: <FolderEdit className="h-3 w-3" />,   color: 'bg-blue-100 text-blue-700 border-blue-200',      kategori: 'Kategori' },
  DELETE_KATEGORI:    { label: 'Hapus Kategori',     icon: <FolderMinus className="h-3 w-3" />,  color: 'bg-red-100 text-red-700 border-red-200',         kategori: 'Kategori' },
};

const KATEGORI_OPTIONS = ['Semua', 'Auth', 'Barang', 'Transaksi', 'Pengguna', 'Kategori'];

const getAksiMeta = (aksi: string) => AKSI_META[aksi] ?? {
  label: aksi, icon: <BarChart2 className="h-3 w-3" />,
  color: 'bg-slate-100 text-slate-600 border-slate-200', kategori: 'Lainnya',
};

// ─── Role badge ───────────────────────────────────────────────────────────────
const ROLE_STYLE: Record<string, string> = {
  admin:          'bg-purple-100 text-purple-700 border-purple-200',
  kepala_gudang:  'bg-blue-100 text-blue-700 border-blue-200',
  petugas:        'bg-slate-100 text-slate-600 border-slate-200',
};
const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', kepala_gudang: 'Kepala Gudang', petugas: 'Petugas',
};

// ─── Metadata renderer ────────────────────────────────────────────────────────
function MetadataPanel({ aksi, metadata }: { aksi: string; metadata: Record<string, unknown> }) {
  // Transaksi masuk / keluar
  if (aksi === 'BARANG_MASUK' || aksi === 'BARANG_KELUAR') {
    const isIn = aksi === 'BARANG_MASUK';
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-xs">
        <MetaRow label="No. Transaksi" value={metadata.nomor} mono />
        <MetaRow label="Item Code"     value={metadata.itemCode} mono />
        <MetaRow label="Nama Barang"   value={metadata.namaBarang} />
        <MetaRow label="Kategori"      value={metadata.kategori} />
        <MetaRow label="Bin Lokasi"    value={metadata.binLoc} />
        <MetaRow label="Jumlah"        value={`${metadata.jumlah} ${metadata.uom ?? ''}`} />
        <MetaRow label="Tanggal"       value={metadata.tanggal} />
        {isIn  && <MetaRow label="No. PO"         value={metadata.noPo} />}
        {isIn  && <MetaRow label="Keterangan"     value={metadata.keterangan} />}
        {!isIn && <MetaRow label="Maint. Order"   value={metadata.maintenanceOrder} />}
        {!isIn && <MetaRow label="Func. Location" value={metadata.functionalLocation} />}
        {!isIn && <MetaRow label="Equipment"      value={metadata.equipment} />}
        {!isIn && <MetaRow label="Move Type"      value={metadata.movementType} />}
        <div className="col-span-full border-t border-dashed mt-1 pt-2">
          <StokChange before={metadata.stokSebelum} after={metadata.stokSesudah} uom={metadata.uom} />
        </div>
      </div>
    );
  }

  // Update stok manual
  if (aksi === 'UPDATE_STOK') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-xs">
        <MetaRow label="Item Code" value={metadata.itemCode} mono />
        <MetaRow label="Nama"      value={metadata.nama} />
        <MetaRow label="UOM"       value={metadata.uom} />
        <div className="col-span-full border-t border-dashed mt-1 pt-2">
          <StokChange before={metadata.stokSebelum} after={metadata.stokSesudah} uom={metadata.uom} delta={metadata.delta} />
        </div>
      </div>
    );
  }

  // Tambah/edit/hapus barang
  if (aksi === 'CREATE_ITEM') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-xs">
        <MetaRow label="Item Code"   value={metadata.itemCode} mono />
        <MetaRow label="TS Code"     value={metadata.tsCode} mono />
        <MetaRow label="MS Code"     value={metadata.msCode} mono />
        <MetaRow label="Nama"        value={metadata.nama} />
        <MetaRow label="Kategori"    value={metadata.kategori} />
        <MetaRow label="Bin Lokasi"  value={metadata.binLoc} />
        <MetaRow label="UOM"         value={metadata.uom} />
        <MetaRow label="Stok Awal"   value={metadata.stok} />
        <MetaRow label="Safety Stok" value={metadata.safetyStok} />
      </div>
    );
  }

  if (aksi === 'UPDATE_ITEM') {
    const changes = (metadata.perubahanField ?? {}) as Record<string, { sebelum: unknown; sesudah: unknown }>;
    const fields = Object.keys(changes);
    return (
      <div className="text-xs space-y-2">
        <MetaRow label="Item Code" value={metadata.itemCode} mono />
        {fields.length === 0 ? (
          <p className="text-muted-foreground italic">Tidak ada perubahan terdeteksi</p>
        ) : (
          <div className="overflow-hidden rounded border border-slate-100">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium w-32">Field</th>
                  <th className="px-3 py-1.5 text-left font-medium">Sebelum</th>
                  <th className="px-3 py-1.5 text-left font-medium">Sesudah</th>
                </tr>
              </thead>
              <tbody>
                {fields.map(f => (
                  <tr key={f} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-semibold text-slate-600 capitalize">{f}</td>
                    <td className="px-3 py-1.5 line-through text-red-500">{String(changes[f].sebelum ?? '—')}</td>
                    <td className="px-3 py-1.5 font-medium text-green-700">{String(changes[f].sesudah ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (aksi === 'DELETE_ITEM') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-xs">
        <MetaRow label="Item Code"    value={metadata.itemCode} mono />
        <MetaRow label="Nama"         value={metadata.nama} />
        <MetaRow label="Kategori"     value={metadata.kategori} />
        <MetaRow label="Stok Terakhir" value={`${metadata.stokTerakhir} ${metadata.uom ?? ''}`} />
        <MetaRow label="Bin Lokasi"   value={metadata.binLoc} />
      </div>
    );
  }

  if (aksi === 'IMPORT_ITEMS') {
    return (
      <div className="flex flex-wrap gap-4 text-xs">
        <StatChip label="Total Diproses"  value={metadata.totalDiproses} color="slate" />
        <StatChip label="Ditambahkan"     value={metadata.inserted}      color="green" />
        <StatChip label="Diperbarui"      value={metadata.updated}       color="blue" />
        <StatChip label="Tidak Berubah"   value={metadata.unchanged}     color="slate" />
        <StatChip label="Gagal"           value={metadata.gagal}         color="red" />
      </div>
    );
  }

  // Pengguna
  if (aksi === 'CREATE_USER') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-xs">
        <MetaRow label="NIK"        value={metadata.nik} mono />
        <MetaRow label="Nama"       value={metadata.namaLengkap} />
        <MetaRow label="Email"      value={metadata.email} />
        <MetaRow label="Role"       value={metadata.role} />
        <MetaRow label="Departemen" value={metadata.departemen} />
        <MetaRow label="Jabatan"    value={metadata.jabatan} />
        <MetaRow label="Seksi"      value={metadata.seksi} />
      </div>
    );
  }

  if (aksi === 'UPDATE_USER') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-xs">
        <MetaRow label="NIK"        value={metadata.nik} mono />
        <MetaRow label="Nama"       value={metadata.namaLengkap} />
        <MetaRow label="Role"       value={metadata.role} />
        <MetaRow label="Status"     value={metadata.status} />
        <MetaRow label="Departemen" value={metadata.departemen} />
        <MetaRow label="Jabatan"    value={metadata.jabatan} />
        <MetaRow label="Seksi"      value={metadata.seksi} />
      </div>
    );
  }

  if (aksi === 'UPDATE_PERMISSIONS') {
    const sesudah = (metadata.sesudah ?? {}) as Record<string, boolean>;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-xs">
        <MetaRow label="Target NIK" value={metadata.targetNik} mono />
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground w-28 shrink-0">Transaksi Masuk</span>
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold border',
            sesudah.transaksi_masuk ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-600 border-red-200')}>
            {sesudah.transaksi_masuk ? 'Diizinkan' : 'Ditolak'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground w-28 shrink-0">Transaksi Keluar</span>
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold border',
            sesudah.transaksi_keluar ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-600 border-red-200')}>
            {sesudah.transaksi_keluar ? 'Diizinkan' : 'Ditolak'}
          </span>
        </div>
      </div>
    );
  }

  if (aksi === 'DELETE_USER') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-xs">
        <MetaRow label="NIK"  value={metadata.nik} mono />
        <MetaRow label="Nama" value={metadata.namaLengkap} />
      </div>
    );
  }

  if (aksi === 'UPDATE_PROFILE') {
    const sesudah = (metadata.sesudah ?? {}) as Record<string, unknown>;
    const changed = (metadata.fieldDiubah as string[] | undefined) ?? [];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-xs">
        <div className="col-span-full text-muted-foreground">Field diubah: <span className="font-semibold text-foreground">{changed.join(', ') || '—'}</span></div>
        {changed.includes('namaLengkap') && <MetaRow label="Nama Baru"  value={sesudah.namaLengkap} />}
        {changed.includes('email')       && <MetaRow label="Email Baru" value={sesudah.email} />}
        {changed.includes('noHp')        && <MetaRow label="No. HP"     value={sesudah.noHp} />}
        {changed.includes('departemen')  && <MetaRow label="Departemen" value={sesudah.departemen} />}
        {changed.includes('jabatan')     && <MetaRow label="Jabatan"    value={sesudah.jabatan} />}
        {changed.includes('seksi')       && <MetaRow label="Seksi"      value={sesudah.seksi} />}
      </div>
    );
  }

  if (aksi === 'LOGIN') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-xs">
        <MetaRow label="Email" value={metadata.email} />
        <MetaRow label="Nama"  value={metadata.namaLengkap} />
        <MetaRow label="Role"  value={metadata.role} />
      </div>
    );
  }

  // Kategori
  if (aksi === 'CREATE_KATEGORI') {
    return (
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
        <MetaRow label="Nama"       value={metadata.nama} />
        <MetaRow label="Keterangan" value={metadata.keterangan} />
      </div>
    );
  }

  if (aksi === 'UPDATE_KATEGORI') {
    const before = (metadata.sebelum ?? {}) as Record<string, unknown>;
    const after  = (metadata.sesudah ?? {}) as Record<string, unknown>;
    return (
      <div className="overflow-hidden rounded border border-slate-100 text-xs">
        <table className="w-full">
          <thead className="bg-slate-50 text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium w-24">Field</th>
              <th className="px-3 py-1.5 text-left font-medium">Sebelum</th>
              <th className="px-3 py-1.5 text-left font-medium">Sesudah</th>
            </tr>
          </thead>
          <tbody>
            {['nama','keterangan'].map(f => (
              <tr key={f} className="border-t border-slate-100">
                <td className="px-3 py-1.5 font-semibold text-slate-600 capitalize">{f}</td>
                <td className="px-3 py-1.5 text-red-500 line-through">{String(before[f] ?? '—')}</td>
                <td className="px-3 py-1.5 font-medium text-green-700">{String(after[f] ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (aksi === 'DELETE_KATEGORI') {
    return (
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
        <MetaRow label="Nama"       value={metadata.nama} />
        <MetaRow label="Keterangan" value={metadata.keterangan} />
      </div>
    );
  }

  // fallback: dump semua key-value
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-xs">
      {Object.entries(metadata).map(([k, v]) => (
        <MetaRow key={k} label={k} value={v} />
      ))}
    </div>
  );
}

// ─── Helper sub-komponen ─────────────────────────────────────────────────────
function MetaRow({ label, value, mono }: { label: string; value: unknown; mono?: boolean }) {
  const display = value == null || value === '' ? '—' : String(value);
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
      <span className={cn('text-slate-800 truncate', mono && 'font-mono text-[11px]')}>{display}</span>
    </div>
  );
}

function StokChange({ before, after, uom, delta }: { before: unknown; after: unknown; uom?: unknown; delta?: unknown }) {
  const diff = Number(after) - Number(before);
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground uppercase tracking-wide text-[10px] font-medium">Perubahan Stok</span>
      <span className="font-mono font-semibold text-slate-700">{Number(before)} {String(uom ?? '')}</span>
      <span className="text-muted-foreground">→</span>
      <span className="font-mono font-semibold text-slate-700">{Number(after)} {String(uom ?? '')}</span>
      {delta !== undefined ? (
        <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded', diff >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
          {diff >= 0 ? '+' : ''}{Number(delta)}
        </span>
      ) : (
        <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded', diff >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
          {diff >= 0 ? '+' : ''}{diff}
        </span>
      )}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: unknown; color: string }) {
  const cls: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue:  'bg-blue-50 text-blue-700 border-blue-200',
    red:   'bg-red-50 text-red-600 border-red-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <div className={cn('flex flex-col items-center rounded-lg border px-4 py-2 min-w-[80px]', cls[color] ?? cls.slate)}>
      <span className="text-xl font-bold font-mono">{String(value ?? 0)}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RiwayatAktivitas() {
  const { token } = useAppContext();
  const [data, setData] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [userFilter, setUserFilter] = useState('Semua');
  const [kategoriFilter, setKategoriFilter] = useState('Semua');
  const [aksiFilter, setAksiFilter] = useState('Semua');

  const fetchData = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo)   params.set('to', dateTo);
    fetch(`/api/activity?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setData)
      .catch(() => toast.error('Gagal memuat riwayat aktivitas'))
      .finally(() => setIsLoading(false));
  }, [token, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset filter aksi kalau ganti kategori
  useEffect(() => { setAksiFilter('Semua'); }, [kategoriFilter]);

  const userOptions = useMemo(() => {
    const map = new Map<number, string>();
    data.forEach(r => { if (r.userId && r.namaLengkap) map.set(r.userId, r.namaLengkap); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const aksiOptionsByKategori = useMemo(() => {
    const set = new Set(data.map(r => r.aksi));
    return Array.from(set).filter(a =>
      kategoriFilter === 'Semua' || (AKSI_META[a]?.kategori ?? 'Lainnya') === kategoriFilter
    ).sort();
  }, [data, kategoriFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter(row => {
      const meta = getAksiMeta(row.aksi);
      const matchKategori = kategoriFilter === 'Semua' || meta.kategori === kategoriFilter;
      const matchAksi     = aksiFilter === 'Semua' || row.aksi === aksiFilter;
      const matchUser     = userFilter === 'Semua' || String(row.userId) === userFilter;
      const matchSearch   = !q ||
        row.aksi.toLowerCase().includes(q) ||
        (row.detail ?? '').toLowerCase().includes(q) ||
        (row.namaLengkap ?? '').toLowerCase().includes(q) ||
        (row.nik ?? '').toLowerCase().includes(q) ||
        (row.ipAddress ?? '').includes(q);
      return matchKategori && matchAksi && matchUser && matchSearch;
    });
  }, [data, search, userFilter, kategoriFilter, aksiFilter]);

  const totalLog     = filtered.length;
  const uniqueUsers  = useMemo(() => new Set(filtered.map(r => r.userId)).size, [filtered]);
  const hariIni      = useMemo(() => {
    const t = new Date().toDateString();
    return data.filter(r => new Date(r.createdAt).toDateString() === t).length;
  }, [data]);
  const aksiTerbanyak = useMemo(() => {
    if (!filtered.length) return '—';
    const counts: Record<string, number> = {};
    filtered.forEach(r => { counts[r.aksi] = (counts[r.aksi] ?? 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? (getAksiMeta(top[0]).label) : '—';
  }, [filtered]);

  const handleExportExcel = () => {
    if (!filtered.length) { toast.error('Tidak ada data untuk diekspor'); return; }
    const rows = filtered.map((r, idx) => ({
      'No': idx + 1,
      'Waktu': fmtDateTime(r.createdAt),
      'Nama Pengguna': r.namaLengkap ?? '',
      'NIK': r.nik ?? '',
      'Role': r.role ?? '',
      'Kategori': getAksiMeta(r.aksi).kategori,
      'Aksi': getAksiMeta(r.aksi).label,
      'Detail': r.detail ?? '',
      'IP Address': r.ipAddress ?? '',
    }));
    const tgl = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    exportStyledExcel({
      rows,
      colWidths: [4, 22, 22, 10, 12, 12, 18, 55, 16],
      sheetName: 'Riwayat Aktivitas',
      fileName: `Riwayat_Aktivitas_${tgl}.xlsx`,
    });
    toast.success(`Berhasil mengekspor ${filtered.length} log`);
  };

  const toggleExpand = (id: number) => setExpandedId(prev => prev === id ? null : id);

  return (
    <Layout title="Riwayat Aktivitas">
      <div className="flex flex-col gap-5">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Activity className="h-5 w-5 text-slate-500" />, bg: 'bg-slate-100', label: 'Total Log', value: totalLog, color: '' },
            { icon: <CalendarDays className="h-5 w-5 text-blue-500" />, bg: 'bg-blue-50', label: 'Hari Ini', value: hariIni, color: 'text-blue-700', border: 'border-blue-100' },
            { icon: <Users className="h-5 w-5 text-green-500" />, bg: 'bg-green-50', label: 'Pengguna Aktif', value: uniqueUsers, color: 'text-green-700', border: 'border-green-100' },
            { icon: <Zap className="h-5 w-5 text-purple-500" />, bg: 'bg-purple-50', label: 'Aksi Terbanyak', value: aksiTerbanyak, color: 'text-purple-700', border: 'border-purple-100', text: true },
          ].map((c, i) => (
            <Card key={i} className={cn('shadow-sm', c.border)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', c.bg)}>{c.icon}</div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium uppercase">{c.label}</p>
                    {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : c.text
                      ? <p className={cn('text-sm font-bold mt-1 leading-tight truncate', c.color)} title={String(c.value)}>{c.value}</p>
                      : <p className={cn('text-2xl font-bold font-mono', c.color)}>{Number(c.value).toLocaleString('id-ID')}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap sm:gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari detail, nama, NIK..."
              className="pl-9 bg-white"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <PeriodePicker dateFrom={dateFrom} dateTo={dateTo}
            onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white"><SelectValue placeholder="Pengguna" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua Pengguna</SelectItem>
              {userOptions.map(([id, nama]) => <SelectItem key={id} value={String(id)}>{nama}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white"><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
              {KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k === 'Semua' ? 'Semua Kategori' : k}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={aksiFilter} onValueChange={setAksiFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white"><SelectValue placeholder="Aksi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua Aksi</SelectItem>
              {aksiOptionsByKategori.map(a => <SelectItem key={a} value={a}>{getAksiMeta(a).label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="icon" onClick={fetchData} className="h-9 w-9" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleExportExcel} className="text-green-700 border-green-200 hover:bg-green-50 gap-2">
              <FileDown className="h-4 w-4" /> Export Excel
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-5 border-b bg-slate-50/80">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Menampilkan <span className="font-bold text-foreground">{totalLog.toLocaleString('id-ID')}</span> log
              dari <span className="font-bold text-foreground">{uniqueUsers}</span> pengguna
              {expandedId && <span className="ml-3 text-xs text-blue-500">• klik baris untuk lihat / sembunyikan detail</span>}
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-6" />
                  <TableHead className="w-6 text-center text-xs">#</TableHead>
                  <TableHead className="whitespace-nowrap">Waktu</TableHead>
                  <TableHead className="min-w-[160px]">Pengguna</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead className="text-center">Role</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                  <TableHead className="min-w-[240px]">Detail</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <FileX className="h-10 w-10 text-slate-300" />
                        <p className="text-slate-500">Tidak ada log untuk periode dan filter yang dipilih</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((row, idx) => {
                  const meta  = getAksiMeta(row.aksi);
                  const isExp = expandedId === row.id;
                  const hasDetail = row.metadata != null;
                  return (
                    <Fragment key={row.id}>
                      <TableRow
                        key={row.id}
                        className={cn('text-sm transition-colors', hasDetail && 'cursor-pointer hover:bg-slate-50/80', isExp && 'bg-blue-50/40')}
                        onClick={() => hasDetail && toggleExpand(row.id)}
                      >
                        <TableCell className="w-6 pr-0 pl-3">
                          {hasDetail
                            ? isExp
                              ? <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
                              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            : null}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">{fmtDateTime(row.createdAt)}</TableCell>
                        <TableCell className="font-semibold text-slate-800">{row.namaLengkap ?? '—'}</TableCell>
                        <TableCell className="font-mono text-slate-500 text-xs">{row.nik ?? '—'}</TableCell>
                        <TableCell className="text-center">
                          {row.role && (
                            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold border', ROLE_STYLE[row.role])}>
                              {ROLE_LABEL[row.role] ?? row.role}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border whitespace-nowrap', meta.color)}>
                            {meta.icon} {meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600 max-w-xs">
                          <span className="line-clamp-1 text-xs">{row.detail ?? '—'}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">{row.ipAddress ?? '—'}</TableCell>
                      </TableRow>

                      {/* Expanded detail row */}
                      {isExp && row.metadata && (
                        <TableRow key={`${row.id}-detail`} className="bg-blue-50/30 hover:bg-blue-50/30">
                          <TableCell colSpan={9} className="px-8 py-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn('gap-1', meta.color)}>
                                  {meta.icon} {meta.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {fmtDateTime(row.createdAt)} · {row.namaLengkap} ({row.nik}) · {row.ipAddress ?? 'IP tidak tercatat'}
                                </span>
                              </div>
                              <div className="rounded-lg border border-blue-100 bg-white px-5 py-4">
                                <MetadataPanel aksi={row.aksi} metadata={row.metadata} />
                              </div>
                              {row.userAgent && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-2xl">
                                  <span className="font-medium">User-Agent:</span> {row.userAgent}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

      </div>
    </Layout>
  );
}
