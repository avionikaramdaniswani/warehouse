import { useState, useEffect, useMemo } from 'react';
import { exportStyledExcel } from '@/lib/excel-export';
import { Layout } from '@/components/Layout';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, FileDown, Users, ShieldCheck, Wrench, Eye, FileX } from 'lucide-react';
import { toast } from 'sonner';

interface UserData {
  id: number;
  nik: string;
  namaLengkap: string;
  email: string;
  role: 'admin' | 'kepala_gudang' | 'petugas';
  noHp: string | null;
  departemen: string | null;
  jabatan: string | null;
  seksi: string | null;
  status: 'active' | 'inactive' | 'suspended';
  tanggalGabung: string;
  loginTerakhir: string | null;
}

const roleBadge = (role: UserData['role']) => {
  const map = {
    admin: 'bg-purple-100 text-purple-700 border-purple-200',
    kepala_gudang: 'bg-blue-100 text-blue-700 border-blue-200',
    petugas: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const label = { admin: 'Admin', kepala_gudang: 'Kepala Gudang', petugas: 'Petugas' };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${map[role]}`}>{label[role]}</span>;
};

const statusBadge = (status: UserData['status']) => {
  const map = {
    active: 'bg-green-100 text-green-700 border-green-200',
    inactive: 'bg-slate-100 text-slate-500 border-slate-200',
    suspended: 'bg-red-100 text-red-700 border-red-200',
  };
  const label = { active: 'Aktif', inactive: 'Nonaktif', suspended: 'Ditangguhkan' };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${map[status]}`}>{label[status]}</span>;
};

const fmtDate = (s: string | null) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtDateTime = (s: string | null) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function LaporanPengguna() {
  const { token } = useAppContext();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setUsers)
      .catch(() => toast.error('Gagal memuat data pengguna'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const filtered = useMemo(() => users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.namaLengkap.toLowerCase().includes(q) ||
      u.nik.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.departemen ?? '').toLowerCase().includes(q);
    const matchRole = roleFilter === 'Semua' || u.role === roleFilter;
    const matchStatus = statusFilter === 'Semua' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  }), [users, search, roleFilter, statusFilter]);

  const totalUsers = users.length;
  const totalAdmin = users.filter(u => u.role === 'admin').length;
  const totalOperator = users.filter(u => u.role === 'kepala_gudang').length;
  const totalViewer = users.filter(u => u.role === 'petugas').length;

  const handleExportExcel = () => {
    if (filtered.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }
    const rows = filtered.map((u, idx) => ({
      'No': idx + 1,
      'NIK': u.nik,
      'Nama Lengkap': u.namaLengkap,
      'Email': u.email,
      'Role': u.role,
      'Departemen': u.departemen ?? '',
      'Jabatan': u.jabatan ?? '',
      'Seksi': u.seksi ?? '',
      'No. HP': u.noHp ?? '',
      'Status': u.status === 'active' ? 'Aktif' : u.status === 'inactive' ? 'Nonaktif' : 'Ditangguhkan',
      'Tanggal Gabung': fmtDate(u.tanggalGabung),
      'Login Terakhir': fmtDateTime(u.loginTerakhir),
    }));
    const tanggal = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' }).replace(/\//g, '-');
    exportStyledExcel({
      rows,
      colWidths: [4, 10, 22, 28, 10, 18, 20, 14, 14, 12, 18, 22],
      sheetName: 'Laporan Pengguna',
      fileName: `Laporan_Pengguna_${tanggal}.xlsx`,
    });
    toast.success(`Berhasil mengekspor ${filtered.length} data`);
  };

  return (
    <Layout title="Laporan Pengguna">
      <div className="flex flex-col gap-5">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Total Pengguna</p>
                  {isLoading ? <Skeleton className="h-7 w-10 mt-1" /> : <p className="text-2xl font-bold font-mono">{totalUsers}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-purple-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Admin</p>
                  {isLoading ? <Skeleton className="h-7 w-10 mt-1" /> : <p className="text-2xl font-bold font-mono text-purple-700">{totalAdmin}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-blue-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Wrench className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Kepala Gudang</p>
                  {isLoading ? <Skeleton className="h-7 w-10 mt-1" /> : <p className="text-2xl font-bold font-mono text-blue-700">{totalOperator}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Eye className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Petugas</p>
                  {isLoading ? <Skeleton className="h-7 w-10 mt-1" /> : <p className="text-2xl font-bold font-mono text-slate-600">{totalViewer}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter + Export */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari NIK, nama, atau email..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Role</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="kepala_gudang">Kepala Gudang</SelectItem>
                <SelectItem value="petugas">Petugas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
                <SelectItem value="suspended">Ditangguhkan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="text-green-700 border-green-200 hover:bg-green-50 w-full sm:w-auto shrink-0" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4 mr-2" /> Export Excel
          </Button>
        </div>

        {/* Table */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-5 border-b bg-slate-50/80">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Menampilkan <span className="font-bold text-foreground">{filtered.length}</span> dari {totalUsers} pengguna
            </CardTitle>
          </CardHeader>

          {/* MOBILE */}
          <div className="md:hidden divide-y">
            {isLoading ? Array.from({length:3}).map((_,i) => (
              <div key={i} className="p-4 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /></div>
            )) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <FileX className="h-10 w-10 text-slate-300" />
                <p className="font-medium text-slate-500">Tidak ada data</p>
              </div>
            ) : filtered.map(u => (
              <div key={u.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{u.namaLengkap}</p>
                    <p className="text-xs font-mono text-muted-foreground">{u.nik}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {roleBadge(u.role)}
                    {statusBadge(u.status)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1.5">
                  {u.departemen && <span>{u.departemen}</span>}
                  <span>Gabung: {fmtDate(u.tanggalGabung)}</span>
                  <span>Login: {fmtDateTime(u.loginTerakhir)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-8 text-center text-xs">#</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead className="min-w-[180px]">Nama Lengkap</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="text-center">Role</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Tgl. Gabung</TableHead>
                  <TableHead className="whitespace-nowrap">Login Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({length:4}).map((_,i) => (
                  <TableRow key={i}>{Array.from({length:10}).map((_,j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <FileX className="h-10 w-10 text-slate-300" />
                        <p className="text-slate-500">Tidak ada data ditemukan</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((u, idx) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono font-medium text-slate-600">{u.nik}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{u.namaLengkap}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-center">{roleBadge(u.role)}</TableCell>
                    <TableCell className="text-sm">{u.departemen || '—'}</TableCell>
                    <TableCell className="text-sm">{u.jabatan || '—'}</TableCell>
                    <TableCell className="text-center">{statusBadge(u.status)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{fmtDate(u.tanggalGabung)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{fmtDateTime(u.loginTerakhir)}</TableCell>
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
