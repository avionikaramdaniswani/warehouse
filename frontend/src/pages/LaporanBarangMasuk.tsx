import { useState, useEffect, useMemo } from 'react';
import { exportStyledExcel } from '@/lib/excel-export';
import { Layout } from '@/components/Layout';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, FileDown, PackageCheck, Hash, Layers, CalendarDays, FileX, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PeriodePicker } from '@/components/PeriodePicker';

interface TransaksiMasuk {
  id: number;
  nomor: string;
  jumlah: number;
  tanggal: string;
  noPo: string | null;
  keterangan: string | null;
  createdAt: string;
  tsCode: string;
  msCode: string | null;
  namaBarang: string;
  kategori: string;
  uom: string;
  binLoc: string | null;
  petugas: string;
}

const PAGE_SIZE_OPTIONS = [50, 100, 150, 200, 300, 400, 500];
function getPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

const today = new Date().toISOString().slice(0, 10);
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

const HARI_FULL = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const fmtTgl = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTglHari = (s: string) => {
  const dt = new Date(s + 'T00:00:00');
  return `${HARI_FULL[dt.getDay()]}, ${dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};
const fmtWaktu = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

export default function LaporanBarangMasuk() {
  const { token } = useAppContext();
  const [data, setData] = useState<TransaksiMasuk[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch('/api/transaksi-masuk', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setData)
      .catch(() => toast.error('Gagal memuat data transaksi masuk'))
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => { setCurrentPage(1); }, [search, dateFrom, dateTo, pageSize]);

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
        (row.noPo ?? '').toLowerCase().includes(q);
      return matchDate && matchSearch;
    });
  }, [data, search, dateFrom, dateTo]);

  const totalTransaksi = filtered.length;
  const totalQty = filtered.reduce((s, r) => s + r.jumlah, 0);
  const avgQty = totalTransaksi > 0 ? Math.round(totalQty / totalTransaksi) : 0;
  const denganPo = filtered.filter(r => r.noPo).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startEntry = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endEntry = Math.min(safePage * pageSize, filtered.length);

  const handleExportExcel = () => {
    if (filtered.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }
    const rows = filtered.map((r, idx) => ({
      'No': idx + 1,
      'Nomor Transaksi': r.nomor,
      'Tanggal': fmtTglHari(r.tanggal),
      'Waktu Pencatatan': fmtWaktu(r.createdAt),
      'TS Code': r.tsCode,
      'MS Code': r.msCode ?? '',
      'Nama Barang': r.namaBarang,
      'Kategori': r.kategori,
      'Satuan (UOM)': r.uom,
      'Bin Location': r.binLoc ?? '',
      'Jumlah Masuk': r.jumlah,
      'No. PO': r.noPo ?? '',
      'Keterangan': r.keterangan ?? '',
      'Petugas': r.petugas,
    }));
    const tgl = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    exportStyledExcel({
      rows,
      colWidths: [4, 22, 24, 14, 12, 14, 45, 18, 10, 14, 10, 18, 30, 22],
      sheetName: 'Barang Masuk',
      fileName: `Laporan_Barang_Masuk_${tgl}.xlsx`,
    });
    toast.success(`Berhasil mengekspor ${filtered.length} data`);
  };

  return (
    <Layout title="Laporan Barang Masuk">
      <div className="flex flex-col gap-5">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm border-green-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <PackageCheck className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Total Transaksi</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono text-green-700">{totalTransaksi}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Layers className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Total Qty</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono text-blue-700">{totalQty.toLocaleString('id-ID')}</p>}
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
          <Card className="shadow-sm border-amber-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <CalendarDays className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Dengan No. PO</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono text-amber-600">{denganPo}</p>}
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
              <Input placeholder="Cari nomor, TS Code, nama, petugas..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <PeriodePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
            />
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
              {totalTransaksi > 0 && <span> · Total qty: <span className="font-bold text-foreground">{totalQty.toLocaleString('id-ID')}</span></span>}
            </CardTitle>
          </CardHeader>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-8 text-center text-xs">#</TableHead>
                  <TableHead className="whitespace-nowrap">Nomor Transaksi</TableHead>
                  <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                  <TableHead>TS Code</TableHead>
                  <TableHead className="min-w-[260px]">Nama Barang</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>No. PO</TableHead>
                  <TableHead className="min-w-[180px]">Keterangan</TableHead>
                  <TableHead>Petugas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <FileX className="h-10 w-10 text-slate-300" />
                        <p className="text-slate-500">Tidak ada data untuk periode yang dipilih</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageItems.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-center text-xs text-muted-foreground">{startEntry + idx}</TableCell>
                    <TableCell className="font-mono text-sm font-medium text-slate-700 whitespace-nowrap">{row.nomor}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{fmtTgl(row.tanggal)}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-600 whitespace-nowrap">{row.tsCode}</TableCell>
                    <TableCell className="font-medium text-slate-800">{row.namaBarang}</TableCell>
                    <TableCell className="text-right font-bold text-green-700">+{row.jumlah}</TableCell>
                    <TableCell className="font-mono text-sm text-blue-600">{row.noPo || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.keterangan || '—'}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{row.petugas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Pagination bar */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 order-2 sm:order-1">
              <p className="text-sm text-muted-foreground">
                Menampilkan <span className="font-medium text-foreground">{startEntry}–{endEntry}</span>{' '}
                dari <span className="font-medium text-foreground">{totalTransaksi}</span> transaksi
              </p>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="text-sm border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} / hal</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1 order-1 sm:order-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}><ChevronLeft className="h-4 w-4" /></Button>
              {getPageRange(safePage, totalPages).map((p, idx) => p === 'ellipsis'
                ? <span key={`e${idx}`} className="h-8 w-8 flex items-center justify-center text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></span>
                : <Button key={p} variant={p === safePage ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 tabular-nums" onClick={() => setCurrentPage(p)}>{p}</Button>
              )}
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
