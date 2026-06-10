import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Layout } from '@/components/Layout';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, FileDown, PackageX, Layers, Hash, TrendingDown, FileX } from 'lucide-react';
import { toast } from 'sonner';

interface TransaksiKeluar {
  id: number;
  nomor: string;
  jumlah: number;
  keperluan: string;
  tujuan: string | null;
  tanggal: string;
  keterangan: string | null;
  tsCode: string;
  namaBarang: string;
  petugas: string;
}

const today = new Date().toISOString().slice(0, 10);
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

const fmtTgl = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export default function LaporanBarangKeluar() {
  const { token } = useAppContext();
  const [data, setData] = useState<TransaksiKeluar[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [keperluanFilter, setKeperluanFilter] = useState('Semua');

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch('/api/transaksi-keluar', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setData)
      .catch(() => toast.error('Gagal memuat data transaksi keluar'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const keperluanOptions = useMemo(() => {
    const set = new Set(data.map(r => r.keperluan).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    return data.filter(row => {
      const tgl = new Date(row.tanggal);
      const matchDate = (!from || tgl >= from) && (!to || tgl <= to);
      const q = search.toLowerCase();
      const matchSearch = !q ||
        row.nomor.toLowerCase().includes(q) ||
        row.tsCode.toLowerCase().includes(q) ||
        row.namaBarang.toLowerCase().includes(q) ||
        row.petugas.toLowerCase().includes(q) ||
        (row.tujuan ?? '').toLowerCase().includes(q) ||
        row.keperluan.toLowerCase().includes(q);
      const matchKeperluan = keperluanFilter === 'Semua' || row.keperluan === keperluanFilter;
      return matchDate && matchSearch && matchKeperluan;
    });
  }, [data, search, dateFrom, dateTo, keperluanFilter]);

  const totalTransaksi = filtered.length;
  const totalQty = filtered.reduce((s, r) => s + r.jumlah, 0);
  const avgQty = totalTransaksi > 0 ? Math.round(totalQty / totalTransaksi) : 0;

  const keperluanTerbanyak = useMemo(() => {
    if (filtered.length === 0) return '—';
    const counts: Record<string, number> = {};
    filtered.forEach(r => { counts[r.keperluan] = (counts[r.keperluan] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  }, [filtered]);

  const handleExportExcel = () => {
    if (filtered.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }
    const rows = filtered.map((r, idx) => ({
      'No': idx + 1,
      'Nomor Transaksi': r.nomor,
      'Tanggal': fmtTgl(r.tanggal),
      'TS Code': r.tsCode,
      'Nama Barang': r.namaBarang,
      'Jumlah': r.jumlah,
      'Keperluan': r.keperluan,
      'Tujuan': r.tujuan ?? '',
      'Keterangan': r.keterangan ?? '',
      'Petugas': r.petugas,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 4 }, { wch: 20 }, { wch: 16 }, { wch: 10 }, { wch: 50 },
      { wch: 8 }, { wch: 16 }, { wch: 22 }, { wch: 28 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Barang Keluar');
    const tgl = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    XLSX.writeFile(wb, `Laporan_Barang_Keluar_${tgl}.xlsx`);
    toast.success(`Berhasil mengekspor ${filtered.length} data`);
  };

  return (
    <Layout title="Laporan Barang Keluar">
      <div className="flex flex-col gap-5">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm border-orange-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <PackageX className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Total Transaksi</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono text-orange-600">{totalTransaksi}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-red-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Total Qty Keluar</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono text-red-600">{totalQty.toLocaleString('id-ID')}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Hash className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Rata-rata Qty</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono">{avgQty.toLocaleString('id-ID')}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-blue-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Layers className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Keperluan Utama</p>
                  {isLoading ? <Skeleton className="h-7 w-24 mt-1" /> : (
                    <p className="text-base font-bold text-blue-700 leading-tight mt-1 max-w-[120px] truncate" title={keperluanTerbanyak}>
                      {keperluanTerbanyak}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter + Export */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full flex-wrap">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nomor, TS Code, nama, tujuan..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={keperluanFilter} onValueChange={setKeperluanFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Keperluan</SelectItem>
                {keperluanOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Dari</label>
              <Input type="date" className="bg-white w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">s/d</label>
              <Input type="date" className="bg-white w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <Button variant="outline" className="text-green-700 border-green-200 hover:bg-green-50 w-full sm:w-auto shrink-0" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4 mr-2" /> Export Excel
          </Button>
        </div>

        {/* Table */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-5 border-b bg-slate-50/80">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Menampilkan <span className="font-bold text-foreground">{totalTransaksi}</span> transaksi
              {totalTransaksi > 0 && <span> · Total qty keluar: <span className="font-bold text-red-600">{totalQty.toLocaleString('id-ID')}</span></span>}
            </CardTitle>
          </CardHeader>

          {/* MOBILE */}
          <div className="md:hidden divide-y">
            {isLoading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
            )) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <FileX className="h-10 w-10 text-slate-300" />
                <p className="font-medium text-slate-500">Tidak ada data</p>
              </div>
            ) : filtered.map(row => (
              <div key={row.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="font-semibold text-sm text-slate-800 break-words">{row.namaBarang}</p>
                    <p className="text-xs font-mono text-muted-foreground">{row.tsCode}</p>
                  </div>
                  <span className="shrink-0 font-bold text-red-600 text-base">−{row.jumlah}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1.5">
                  <span className="font-mono">{row.nomor}</span>
                  <span>{fmtTgl(row.tanggal)}</span>
                  <span>{row.petugas}</span>
                  <span className="text-orange-600">{row.keperluan}</span>
                  {row.tujuan && <span className="text-blue-600">{row.tujuan}</span>}
                </div>
                {row.keterangan && <p className="text-xs text-muted-foreground mt-1 italic">{row.keterangan}</p>}
              </div>
            ))}
          </div>

          {/* DESKTOP */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-8 text-center text-xs">#</TableHead>
                  <TableHead className="whitespace-nowrap">Nomor Transaksi</TableHead>
                  <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                  <TableHead>TS Code</TableHead>
                  <TableHead className="min-w-[260px]">Nama Barang</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Keperluan</TableHead>
                  <TableHead>Tujuan</TableHead>
                  <TableHead className="min-w-[160px]">Keterangan</TableHead>
                  <TableHead>Petugas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 10 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <FileX className="h-10 w-10 text-slate-300" />
                        <p className="text-slate-500">Tidak ada data untuk periode yang dipilih</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-sm font-medium text-slate-700 whitespace-nowrap">{row.nomor}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{fmtTgl(row.tanggal)}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-600 whitespace-nowrap">{row.tsCode}</TableCell>
                    <TableCell className="font-medium text-slate-800">{row.namaBarang}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">−{row.jumlah}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 text-xs font-medium border border-orange-100 whitespace-nowrap">
                        {row.keperluan}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{row.tujuan || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.keterangan || '—'}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.petugas}</TableCell>
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
