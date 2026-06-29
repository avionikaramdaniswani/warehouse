import { useState, useEffect, useMemo } from 'react';
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
import { Search, FileDown, Activity, CalendarDays, Users, Zap, FileX, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ActivityLog {
  id: number;
  aksi: string;
  detail: string | null;
  ipAddress: string | null;
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

const aksiLabel: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  CREATE_USER: 'Tambah Pengguna',
  UPDATE_USER: 'Edit Pengguna',
  DELETE_USER: 'Hapus Pengguna',
  CHANGE_PASSWORD: 'Ganti Password',
  CREATE_ITEM: 'Tambah Barang',
  UPDATE_ITEM: 'Edit Barang',
  DELETE_ITEM: 'Hapus Barang',
  TRANSAKSI_MASUK: 'Barang Masuk',
  TRANSAKSI_KELUAR: 'Barang Keluar',
  UPDATE_STOK: 'Update Stok',
};

const aksiColor = (aksi: string): string => {
  if (aksi === 'LOGIN' || aksi === 'LOGOUT') return 'bg-slate-100 text-slate-600 border-slate-200';
  if (aksi.startsWith('CREATE') || aksi === 'TRANSAKSI_MASUK') return 'bg-green-100 text-green-700 border-green-200';
  if (aksi.startsWith('DELETE')) return 'bg-red-100 text-red-700 border-red-200';
  if (aksi.startsWith('UPDATE') || aksi === 'CHANGE_PASSWORD') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (aksi === 'TRANSAKSI_KELUAR') return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-purple-100 text-purple-700 border-purple-200';
};

const roleBadge = (role: ActivityLog['role']) => {
  if (!role) return null;
  const map = {
    admin: 'bg-purple-100 text-purple-700 border-purple-200',
    operator: 'bg-blue-100 text-blue-700 border-blue-200',
    viewer: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${map[role]}`}>
      {role}
    </span>
  );
};

export default function RiwayatAktivitas() {
  const { token } = useAppContext();
  const [data, setData] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [userFilter, setUserFilter] = useState('Semua');
  const [aksiFilter, setAksiFilter] = useState('Semua');

  const fetchData = () => {
    if (!token) return;
    setIsLoading(true);
    fetch('/api/activity', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setData)
      .catch(() => toast.error('Gagal memuat riwayat aktivitas'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchData(); }, [token]);

  const userOptions = useMemo(() => {
    const map = new Map<number, string>();
    data.forEach(r => { if (r.userId && r.namaLengkap) map.set(r.userId, r.namaLengkap); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const aksiOptions = useMemo(() => {
    const set = new Set(data.map(r => r.aksi));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    return data.filter(row => {
      const tgl = new Date(row.createdAt);
      const matchDate = (!from || tgl >= from) && (!to || tgl <= to);
      const q = search.toLowerCase();
      const matchSearch = !q ||
        row.aksi.toLowerCase().includes(q) ||
        (row.detail ?? '').toLowerCase().includes(q) ||
        (row.namaLengkap ?? '').toLowerCase().includes(q) ||
        (row.nik ?? '').toLowerCase().includes(q) ||
        (row.ipAddress ?? '').includes(q);
      const matchUser = userFilter === 'Semua' || String(row.userId) === userFilter;
      const matchAksi = aksiFilter === 'Semua' || row.aksi === aksiFilter;
      return matchDate && matchSearch && matchUser && matchAksi;
    });
  }, [data, search, dateFrom, dateTo, userFilter, aksiFilter]);

  const totalLog = filtered.length;

  const hariIni = useMemo(() => {
    const t = new Date().toDateString();
    return data.filter(r => new Date(r.createdAt).toDateString() === t).length;
  }, [data]);

  const uniqueUsers = useMemo(() => new Set(filtered.map(r => r.userId)).size, [filtered]);

  const aksiTerbanyak = useMemo(() => {
    if (filtered.length === 0) return '—';
    const counts: Record<string, number> = {};
    filtered.forEach(r => { counts[r.aksi] = (counts[r.aksi] ?? 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? (aksiLabel[top[0]] ?? top[0]) : '—';
  }, [filtered]);

  const handleExportExcel = () => {
    if (filtered.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }
    const rows = filtered.map((r, idx) => ({
      'No': idx + 1,
      'Waktu': fmtDateTime(r.createdAt),
      'Nama Pengguna': r.namaLengkap ?? '',
      'NIK': r.nik ?? '',
      'Role': r.role ?? '',
      'Aksi': aksiLabel[r.aksi] ?? r.aksi,
      'Detail': r.detail ?? '',
      'IP Address': r.ipAddress ?? '',
    }));
    const tgl = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    exportStyledExcel({
      rows,
      colWidths: [4, 22, 22, 10, 10, 18, 50, 16],
      sheetName: 'Riwayat Aktivitas',
      fileName: `Riwayat_Aktivitas_${tgl}.xlsx`,
    });
    toast.success(`Berhasil mengekspor ${filtered.length} log`);
  };

  return (
    <Layout title="Riwayat Aktivitas">
      <div className="flex flex-col gap-5">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Activity className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Total Log</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono">{totalLog.toLocaleString('id-ID')}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-blue-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <CalendarDays className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Hari Ini</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono text-blue-700">{hariIni}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-green-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Pengguna Aktif</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono text-green-700">{uniqueUsers}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-purple-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Aksi Terbanyak</p>
                  {isLoading ? <Skeleton className="h-7 w-20 mt-1" /> : (
                    <p className="text-sm font-bold text-purple-700 mt-1 leading-tight" title={aksiTerbanyak}>{aksiTerbanyak}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter + Export */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex gap-2 items-center flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari aksi, detail, nama, NIK..."
                className="pl-9 bg-white"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchData} className="shrink-0 h-9 w-9" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExportExcel} className="sm:hidden shrink-0 h-9 w-9 text-green-700 border-green-200 hover:bg-green-50" title="Export Excel">
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
            <PeriodePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
            />
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Pengguna</SelectItem>
                {userOptions.map(([id, nama]) => (
                  <SelectItem key={id} value={String(id)}>{nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={aksiFilter} onValueChange={setAksiFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Aksi</SelectItem>
                {aksiOptions.map(a => (
                  <SelectItem key={a} value={a}>{aksiLabel[a] ?? a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleExportExcel} className="hidden sm:flex text-green-700 border-green-200 hover:bg-green-50 shrink-0">
            <FileDown className="h-4 w-4 mr-2" /> Export Excel
          </Button>
        </div>

        {/* Table */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-5 border-b bg-slate-50/80">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Menampilkan{' '}
              <span className="font-bold text-foreground">{totalLog.toLocaleString('id-ID')}</span>{' '}
              log dari{' '}
              <span className="font-bold text-foreground">{uniqueUsers}</span>{' '}
              pengguna
            </CardTitle>
          </CardHeader>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-8 text-center text-xs">#</TableHead>
                  <TableHead className="whitespace-nowrap">Waktu</TableHead>
                  <TableHead className="min-w-[160px]">Pengguna</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead className="text-center">Role</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                  <TableHead className="min-w-[280px]">Detail</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <FileX className="h-10 w-10 text-slate-300" />
                        <p className="text-slate-500">Tidak ada log untuk periode dan filter yang dipilih</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((row, idx) => (
                  <TableRow key={row.id} className="text-sm">
                    <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                      {fmtDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">{row.namaLengkap ?? '—'}</TableCell>
                    <TableCell className="font-mono text-slate-500">{row.nik ?? '—'}</TableCell>
                    <TableCell className="text-center">{roleBadge(row.role)}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border whitespace-nowrap ${aksiColor(row.aksi)}`}>
                        {aksiLabel[row.aksi] ?? row.aksi}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600 max-w-xs">
                      <span className="line-clamp-2">{row.detail ?? '—'}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {row.ipAddress ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
