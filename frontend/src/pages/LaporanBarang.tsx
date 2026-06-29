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
import { StatusBadge } from '@/components/StatusBadge';
import { Search, FileDown, Package, CheckCircle2, AlertTriangle, XCircle, FileX, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE_OPTIONS = [50, 100, 150, 200, 300, 400, 500];

function getPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

interface KategoriOption { id: number; nama: string; }

export default function LaporanBarang() {
  const { items, token } = useAppContext();
  const [kategoris, setKategoris] = useState<KategoriOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    if (!token) return;
    fetch('/api/kategori', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setKategoris)
      .catch(() => {});
    const t = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(t);
  }, [token]);

  const filtered = useMemo(() => items.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      item.nama.toLowerCase().includes(q) ||
      item.tsCode.toLowerCase().includes(q) ||
      (item.msCode ?? '').toLowerCase().includes(q) ||
      (item.binLoc ?? '').toLowerCase().includes(q) ||
      item.kategori.toLowerCase().includes(q);
    const matchKat = kategoriFilter === 'Semua' || item.kategori === kategoriFilter;
    const matchStatus = statusFilter === 'Semua' || item.status === statusFilter;
    return matchSearch && matchKat && matchStatus;
  }), [items, search, kategoriFilter, statusFilter]);

  // Reset to page 1 whenever filters or page size change
  useEffect(() => { setCurrentPage(1); }, [search, kategoriFilter, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startEntry = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endEntry = Math.min(safePage * pageSize, filtered.length);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const goToPage = (p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  const handlePageSizeChange = (newSize: number) => { setPageSize(newSize); setCurrentPage(1); };

  const total = items.length;
  const normal = items.filter(i => i.status === 'Normal').length;
  const menipis = items.filter(i => i.status === 'Warning').length;
  const habis = items.filter(i => i.status === 'Critical').length;

  const handleExportExcel = () => {
    if (filtered.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }
    const rows = filtered.map((item, idx) => ({
      'No': idx + 1,
      'TS Code': item.tsCode,
      'MS Code': item.msCode ?? '',
      'Nama Barang': item.nama,
      'Kategori': item.kategori,
      'BIN LOC': item.binLoc ?? '',
      'UOM': item.uom,
      'Stok': item.stok,
      'Safety Stok': item.safetyStok,
      'Status': item.status,
    }));
    const tanggal = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' }).replace(/\//g, '-');
    exportStyledExcel({
      rows,
      colWidths: [4, 10, 12, 55, 20, 12, 8, 8, 12, 10],
      sheetName: 'Laporan Barang',
      fileName: `Laporan_Barang_${tanggal}.xlsx`,
    });
    toast.success(`Berhasil mengekspor ${filtered.length} data`);
  };

  const stockColor = (item: typeof items[0]) =>
    item.stok === 0 ? 'text-red-600' : item.stok <= item.safetyStok ? 'text-amber-600' : 'text-green-700';

  return (
    <Layout title="Laporan Barang">
      <div className="flex flex-col gap-5">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Total Item</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono">{total}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-green-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Normal</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono text-green-700">{normal}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-amber-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Warning</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono text-amber-600">{menipis}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-red-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Critical</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold font-mono text-red-600">{habis}</p>}
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
              <Input placeholder="Cari TS Code, nama, BIN LOC, kategori..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" onClick={handleExportExcel} className="sm:hidden shrink-0 h-9 w-9 text-green-700 border-green-200 hover:bg-green-50" title="Export Excel">
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Kategori</SelectItem>
                {kategoris.map(k => <SelectItem key={k.id} value={k.nama}>{k.nama}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Status</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Warning">Warning</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
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
              <span className="font-bold text-foreground">
                {filtered.length === 0 ? 0 : `${startEntry}–${endEntry}`}
              </span>{' '}
              dari <span className="font-bold text-foreground">{filtered.length}</span> item
              {filtered.length !== total && (
                <span className="text-muted-foreground"> (difilter dari {total})</span>
              )}
            </CardTitle>
          </CardHeader>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-8 text-center text-xs">#</TableHead>
                  <TableHead className="whitespace-nowrap">TS Code</TableHead>
                  <TableHead>MS Code</TableHead>
                  <TableHead className="min-w-[260px]">Nama Barang</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>BIN LOC</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Safety Stok</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({length:6}).map((_,i) => (
                  <TableRow key={i}>{Array.from({length:10}).map((_,j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <FileX className="h-10 w-10 text-slate-300" />
                        <p className="text-slate-500">Tidak ada data ditemukan</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageItems.map((item, idx) => (
                  <TableRow key={item.tsCode} className={item.stok === 0 ? 'bg-red-50/40' : item.stok <= item.safetyStok ? 'bg-amber-50/40' : ''}>
                    <TableCell className="text-center text-xs text-muted-foreground">{startEntry + idx}</TableCell>
                    <TableCell className="font-mono font-medium text-slate-600 whitespace-nowrap">{item.tsCode}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{item.msCode || '—'}</TableCell>
                    <TableCell className="font-medium text-slate-800">{item.nama}</TableCell>
                    <TableCell className="text-sm">{item.kategori}</TableCell>
                    <TableCell className="font-mono text-sm">{item.binLoc || '—'}</TableCell>
                    <TableCell className="text-sm">{item.uom}</TableCell>
                    <TableCell className={`text-right font-bold ${stockColor(item)}`}>{item.stok}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.safetyStok}</TableCell>
                    <TableCell className="text-center"><StatusBadge status={item.status} /></TableCell>
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
                Menampilkan{' '}
                <span className="font-medium text-foreground">{startEntry}–{endEntry}</span>{' '}
                dari <span className="font-medium text-foreground">{filtered.length}</span> data
              </p>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="text-sm border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Jumlah data per halaman"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} / hal</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage <= 1}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {getPageRange(safePage, totalPages).map((p, idx) =>
                p === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="h-8 w-8 flex items-center justify-center text-muted-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === safePage ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0 tabular-nums"
                    onClick={() => goToPage(p)}
                  >
                    {p}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
