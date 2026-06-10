import { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, Search, ArrowDownRight, ArrowUpRight, Filter, Activity, Package, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAppContext } from '@/context/AppContext';

interface TrxMasuk {
  id: number; nomor: string; jumlah: number; tanggal: string;
  noPo: string | null; keterangan: string | null; tsCode: string;
  namaBarang: string; petugas: string;
}
interface TrxKeluar {
  id: number; nomor: string; jumlah: number; tanggal: string;
  keperluan: string; tujuan: string | null; keterangan: string | null;
  tsCode: string; namaBarang: string; petugas: string;
}
interface CombinedRow {
  key: string; nomor: string; tanggal: string; tsCode: string;
  namaBarang: string; kategori: string; jenis: 'Masuk' | 'Keluar';
  jumlah: number; ref: string; keterangan: string | null; petugas: string;
}

const PAGE_SIZE = 10;

const fmt = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtShort = (d: string) => {
  const dt = new Date(d + 'T00:00:00');
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000);
}

export default function Laporan() {
  const { token, items } = useAppContext();

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.slice(0, 7) + '-01';

  // Filter inputs
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [jenisFilter, setJenisFilter] = useState('Semua');
  const [kategoriFilter, setKategoriFilter] = useState('Semua');

  // Applied filters (set on Tampilkan)
  const [applied, setApplied] = useState({ from: firstOfMonth, to: today, jenis: 'Semua', kategori: 'Semua' });

  const [trxMasuk, setTrxMasuk] = useState<TrxMasuk[]>([]);
  const [trxKeluar, setTrxKeluar] = useState<TrxKeluar[]>([]);
  const [kategoriList, setKategoriList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Build kategori lookup from AppContext items
  const kategoriMap = useMemo(() => {
    const m: Record<string, string> = {};
    items.forEach(it => { m[it.tsCode] = it.kategori; });
    return m;
  }, [items]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch('/api/transaksi-masuk', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/transaksi-keluar', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/kategori', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [masuk, keluar, katList] = await Promise.all([
        r1.ok ? r1.json() : [],
        r2.ok ? r2.json() : [],
        r3.ok ? r3.json() : [],
      ]);
      setTrxMasuk(masuk);
      setTrxKeluar(keluar);
      setKategoriList((katList as { nama: string }[]).map(k => k.nama));
    } catch {
      toast.error('Gagal memuat data transaksi');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build combined rows based on applied filters
  const combinedRows = useMemo<CombinedRow[]>(() => {
    const rows: CombinedRow[] = [];
    if (applied.jenis !== 'Keluar') {
      trxMasuk.forEach(t => {
        if (t.tanggal < applied.from || t.tanggal > applied.to) return;
        const kat = kategoriMap[t.tsCode] ?? '—';
        if (applied.kategori !== 'Semua' && kat !== applied.kategori) return;
        rows.push({
          key: `M-${t.id}`, nomor: t.nomor, tanggal: t.tanggal, tsCode: t.tsCode,
          namaBarang: t.namaBarang, kategori: kat, jenis: 'Masuk', jumlah: t.jumlah,
          ref: t.noPo ?? '—', keterangan: t.keterangan, petugas: t.petugas,
        });
      });
    }
    if (applied.jenis !== 'Masuk') {
      trxKeluar.forEach(t => {
        if (t.tanggal < applied.from || t.tanggal > applied.to) return;
        const kat = kategoriMap[t.tsCode] ?? '—';
        if (applied.kategori !== 'Semua' && kat !== applied.kategori) return;
        rows.push({
          key: `K-${t.id}`, nomor: t.nomor, tanggal: t.tanggal, tsCode: t.tsCode,
          namaBarang: t.namaBarang, kategori: kat, jenis: 'Keluar', jumlah: t.jumlah,
          ref: t.tujuan ? `${t.keperluan} · ${t.tujuan}` : t.keperluan,
          keterangan: t.keterangan, petugas: t.petugas,
        });
      });
    }
    return rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [trxMasuk, trxKeluar, applied, kategoriMap]);

  // Summary stats
  const totalMasukUnit = useMemo(() =>
    combinedRows.filter(r => r.jenis === 'Masuk').reduce((s, r) => s + r.jumlah, 0), [combinedRows]);
  const totalKeluarUnit = useMemo(() =>
    combinedRows.filter(r => r.jenis === 'Keluar').reduce((s, r) => s + r.jumlah, 0), [combinedRows]);
  const totalTransaksi = combinedRows.length;

  const itemSeringKeluar = useMemo(() => {
    const freq: Record<string, { nama: string; count: number }> = {};
    combinedRows.filter(r => r.jenis === 'Keluar').forEach(r => {
      if (!freq[r.tsCode]) freq[r.tsCode] = { nama: r.namaBarang, count: 0 };
      freq[r.tsCode].count++;
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1].count - a[1].count);
    return sorted[0] ? { ...sorted[0][1], tsCode: sorted[0][0] } : null;
  }, [combinedRows]);

  // Chart data — group by day (if ≤60 days) or by month
  const chartData = useMemo(() => {
    const span = daysBetween(applied.from, applied.to);
    if (span > 60) {
      // Group by month
      const months: Record<string, { masuk: number; keluar: number }> = {};
      combinedRows.forEach(r => {
        const key = r.tanggal.slice(0, 7); // YYYY-MM
        if (!months[key]) months[key] = { masuk: 0, keluar: 0 };
        if (r.jenis === 'Masuk') months[key].masuk += r.jumlah;
        else months[key].keluar += r.jumlah;
      });
      return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => {
        const [y, m] = k.split('-');
        const bulan = new Date(Number(y), Number(m) - 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        return { label: bulan, masuk: v.masuk, keluar: v.keluar };
      });
    }
    // Group by day
    const byDay: Record<string, { masuk: number; keluar: number }> = {};
    let cur = applied.from;
    while (cur <= applied.to) { byDay[cur] = { masuk: 0, keluar: 0 }; cur = addDays(cur, 1); }
    combinedRows.forEach(r => {
      if (!byDay[r.tanggal]) return;
      if (r.jenis === 'Masuk') byDay[r.tanggal].masuk += r.jumlah;
      else byDay[r.tanggal].keluar += r.jumlah;
    });
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({
      label: fmtShort(k), masuk: v.masuk, keluar: v.keluar,
    }));
  }, [combinedRows, applied]);

  const chartHasData = chartData.some(d => d.masuk > 0 || d.keluar > 0);

  // Search + pagination on table
  const searchedRows = useMemo(() => {
    if (!search.trim()) return combinedRows;
    const q = search.toLowerCase();
    return combinedRows.filter(r =>
      r.namaBarang.toLowerCase().includes(q) ||
      r.tsCode.toLowerCase().includes(q) ||
      r.nomor.toLowerCase().includes(q) ||
      r.petugas.toLowerCase().includes(q) ||
      r.ref.toLowerCase().includes(q)
    );
  }, [combinedRows, search]);

  const totalPages = Math.max(1, Math.ceil(searchedRows.length / PAGE_SIZE));
  const pageRows = searchedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const labelPeriode = applied.from === applied.to
    ? fmt(applied.from)
    : `${fmt(applied.from)} – ${fmt(applied.to)}`;

  const handleTampilkan = () => {
    if (dateFrom > dateTo) { toast.error('Periode tidak valid: tanggal mulai harus sebelum tanggal akhir'); return; }
    setApplied({ from: dateFrom, to: dateTo, jenis: jenisFilter, kategori: kategoriFilter });
    setPage(1);
    setSearch('');
  };

  const handleExcelExport = () => {
    if (searchedRows.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }
    const wsData = [
      ['No.', 'Nomor', 'Tanggal', 'TS Code', 'Nama Barang', 'Kategori', 'Jenis', 'Jumlah', 'Referensi', 'Petugas', 'Keterangan'],
      ...searchedRows.map((r, i) => [
        i + 1, r.nomor, fmt(r.tanggal), r.tsCode, r.namaBarang, r.kategori,
        r.jenis, r.jumlah, r.ref, r.petugas, r.keterangan ?? '',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [4, 18, 14, 12, 30, 16, 8, 8, 24, 18, 20].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Transaksi');
    XLSX.writeFile(wb, `Laporan_Transaksi_${applied.from}_${applied.to}.xlsx`);
    toast.success(`Berhasil mengekspor ${searchedRows.length} baris ke Excel`);
  };

  const handlePrint = () => window.print();

  return (
    <Layout title="Laporan & Rekapitulasi">
      <div className="flex flex-col gap-6">

        {/* Filter Bar */}
        <Card className="shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex flex-wrap gap-4 w-full">
              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-slate-500 uppercase">Periode Dari</label>
                <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); }} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-slate-500 uppercase">Sampai</label>
                <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); }} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-slate-500 uppercase">Jenis Transaksi</label>
                <Select value={jenisFilter} onValueChange={setJenisFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua">Semua Jenis</SelectItem>
                    <SelectItem value="Masuk">Barang Masuk</SelectItem>
                    <SelectItem value="Keluar">Barang Keluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-slate-500 uppercase">Kategori</label>
                <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua">Semua Kategori</SelectItem>
                    {kategoriList.map(k => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto shrink-0">
              <Button className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-900" onClick={handleTampilkan}>
                <Filter className="w-4 h-4 mr-2" /> Tampilkan
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none text-green-700 border-green-200 hover:bg-green-50" onClick={handleExcelExport}>
                <FileDown className="w-4 h-4 mr-2" /> Excel
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none text-red-700 border-red-200 hover:bg-red-50" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" /> PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-green-100 shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 text-green-600">
                <ArrowDownRight className="w-5 h-5" />
                <h3 className="font-semibold text-sm uppercase">Total Masuk</h3>
              </div>
              {isLoading ? <Skeleton className="h-9 w-24 mb-1" /> : (
                <p className="text-3xl font-bold font-mono">{totalMasukUnit.toLocaleString('id-ID')}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{labelPeriode}</p>
            </CardContent>
          </Card>

          <Card className="border-orange-100 shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 text-orange-600">
                <ArrowUpRight className="w-5 h-5" />
                <h3 className="font-semibold text-sm uppercase">Total Keluar</h3>
              </div>
              {isLoading ? <Skeleton className="h-9 w-24 mb-1" /> : (
                <p className="text-3xl font-bold font-mono">{totalKeluarUnit.toLocaleString('id-ID')}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{labelPeriode}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center">
              <h3 className="font-semibold text-sm uppercase text-slate-500 mb-2">Item Sering Keluar</h3>
              {isLoading ? (
                <><Skeleton className="h-5 w-full mb-1" /><Skeleton className="h-3 w-20" /></>
              ) : itemSeringKeluar ? (
                <>
                  <p className="text-sm font-bold line-clamp-2 leading-tight" title={itemSeringKeluar.nama}>
                    {itemSeringKeluar.nama}
                  </p>
                  <p className="text-xs text-primary font-medium mt-1.5">{itemSeringKeluar.count}× keluar</p>
                  <p className="text-xs text-muted-foreground">{labelPeriode}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada data</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-slate-900 text-white">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 text-slate-300">
                <Activity className="w-5 h-5" />
                <h3 className="font-semibold text-sm uppercase">Total Transaksi</h3>
              </div>
              {isLoading ? <Skeleton className="h-9 w-20 mb-1 bg-slate-700" /> : (
                <p className="text-3xl font-bold font-mono">{totalTransaksi}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {isLoading ? '—' : `${combinedRows.filter(r => r.jenis === 'Masuk').length} masuk · ${combinedRows.filter(r => r.jenis === 'Keluar').length} keluar`}
              </p>
              <p className="text-xs text-slate-500">{isLoading ? '' : labelPeriode}</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Tren Masuk vs Keluar</CardTitle>
            <p className="text-xs text-muted-foreground">{labelPeriode} · unit barang</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Memuat...</div>
            ) : !chartHasData ? (
              <div className="h-[300px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Package className="h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium">Belum ada transaksi di periode ini</p>
                <p className="text-xs">Atur periode dan klik Tampilkan.</p>
              </div>
            ) : (
              <div className="h-[300px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(v: number, name: string) => [v.toLocaleString('id-ID'), name]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: 12 }} />
                    <Line type="monotone" dataKey="masuk" name="Barang Masuk" stroke="#22c55e" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="keluar" name="Barang Keluar" stroke="#f97316" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Table */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-lg">Detail Transaksi</CardTitle>
              {!isLoading && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {searchedRows.length.toLocaleString('id-ID')} baris ditemukan
                </p>
              )}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, kode, petugas..."
                className="pl-9 h-9"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </CardHeader>

          {isLoading ? (
            <CardContent className="pt-0">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          ) : searchedRows.length === 0 ? (
            <CardContent className="pt-0">
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <Package className="h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium">Tidak ada data transaksi</p>
                <p className="text-xs">Coba ubah filter atau periode yang dipilih.</p>
              </div>
            </CardContent>
          ) : (
            <>
              {/* MOBILE */}
              <div className="md:hidden divide-y">
                {pageRows.map(row => (
                  <div key={row.key} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm text-slate-800 leading-tight line-clamp-2">{row.namaBarang}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.jenis === 'Masuk' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {row.jenis}
                        </span>
                        <span className={`font-mono text-sm font-bold ${row.jenis === 'Masuk' ? 'text-green-600' : 'text-orange-600'}`}>
                          {row.jenis === 'Masuk' ? '+' : '-'}{row.jumlah}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mb-1.5">{row.tsCode} · {row.kategori}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{fmt(row.tanggal)}</span>
                      <span>{row.ref}</span>
                      <span>{row.petugas}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[110px]">Tanggal</TableHead>
                      <TableHead>TS Code</TableHead>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-center w-[80px]">Jenis</TableHead>
                      <TableHead className="text-right w-[80px]">Jumlah</TableHead>
                      <TableHead>Referensi</TableHead>
                      <TableHead>Petugas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map(row => (
                      <TableRow key={row.key}>
                        <TableCell className="text-sm whitespace-nowrap">{fmt(row.tanggal)}</TableCell>
                        <TableCell className="font-mono text-sm">{row.tsCode}</TableCell>
                        <TableCell className="font-medium max-w-[180px] truncate" title={row.namaBarang}>{row.namaBarang}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.kategori}</TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.jenis === 'Masuk' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {row.jenis}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-bold font-mono ${row.jenis === 'Masuk' ? 'text-green-600' : 'text-orange-600'}`}>
                          {row.jenis === 'Masuk' ? '+' : '-'}{row.jumlah}
                        </TableCell>
                        <TableCell className="text-sm max-w-[160px] truncate" title={row.ref}>{row.ref}</TableCell>
                        <TableCell className="text-sm">{row.petugas}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-slate-500">
                <span>
                  Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, searchedRows.length)}–{Math.min(page * PAGE_SIZE, searchedRows.length)} dari {searchedRows.length.toLocaleString('id-ID')} baris
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                    return (
                      <Button
                        key={p} variant="outline" size="sm"
                        className={page === p ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-800 hover:text-white' : ''}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}
