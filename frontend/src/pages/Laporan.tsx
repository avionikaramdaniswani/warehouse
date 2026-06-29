import { useState, useEffect, useMemo, useRef } from 'react';
import { exportStyledExcelAOA } from '@/lib/excel-export';
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
  noPo: string | null; keterangan: string | null; createdAt: string;
  tsCode: string; msCode: string | null; namaBarang: string;
  kategori: string; uom: string; binLoc: string | null; petugas: string;
}
interface TrxKeluar {
  id: number; nomor: string; jumlah: number; tanggal: string;
  keperluan: string; tujuan: string | null; keterangan: string | null; createdAt: string;
  tsCode: string; msCode: string | null; namaBarang: string;
  kategori: string; uom: string; binLoc: string | null; petugas: string;
}
interface CombinedRow {
  key: string; nomor: string; tanggal: string; createdAt: string;
  tsCode: string; msCode: string | null; namaBarang: string;
  kategori: string; uom: string; binLoc: string | null;
  jenis: 'Masuk' | 'Keluar';
  jumlah: number; ref: string; keterangan: string | null; petugas: string;
}

const PAGE_SIZE_OPTIONS_LAPORAN = [10, 25, 50, 100, 150, 200, 300];

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const HARI_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const fmt = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtWithDay = (d: string) => {
  const dt = new Date(d + 'T00:00:00');
  const day = HARI_FULL[dt.getDay()];
  return `${day}, ${dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

const fmtShort = (d: string) => {
  const dt = new Date(d + 'T00:00:00');
  const day = HARI[dt.getDay()];
  return `${day} ${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

const nextDay = (d: string): string => {
  const dt = new Date(d + 'T12:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
};

const daysBetween = (from: string, to: string): number =>
  Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86_400_000);

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = today.slice(0, 7) + '-01';

export default function Laporan() {
  const { token } = useAppContext();

  // Filter inputs (UI state)
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [jenisFilter, setJenisFilter] = useState('Semua');
  const [kategoriFilter, setKategoriFilter] = useState('Semua');

  // Applied filters — only update on Tampilkan click
  const [applied, setApplied] = useState({
    from: firstOfMonth, to: today, jenis: 'Semua', kategori: 'Semua',
  });

  // Raw data
  const [trxMasuk, setTrxMasuk] = useState<TrxMasuk[]>([]);
  const [trxKeluar, setTrxKeluar] = useState<TrxKeluar[]>([]);
  const [kategoriList, setKategoriList] = useState<string[]>([]);
  const [kategoriMap, setKategoriMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Table UI state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  // Fetch all data once
  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setIsLoading(true);

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/transaksi-masuk', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/transaksi-keluar', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/kategori', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/items', { headers }).then(r => r.ok ? r.json() : []),
    ])
      .then(([masuk, keluar, katList, itemList]) => {
        if (!mounted) return;
        setTrxMasuk(masuk);
        setTrxKeluar(keluar);
        setKategoriList((katList as { nama: string }[]).map(k => k.nama));
        const map: Record<string, string> = {};
        (itemList as { tsCode: string; kategori: string }[]).forEach(it => { map[it.tsCode] = it.kategori; });
        setKategoriMap(map);
      })
      .catch(() => { if (mounted) toast.error('Gagal memuat data'); })
      .finally(() => { if (mounted) setIsLoading(false); });

    return () => { mounted = false; };
  }, [token]);

  // Combined + filtered rows
  const combinedRows = useMemo<CombinedRow[]>(() => {
    const rows: CombinedRow[] = [];

    if (applied.jenis !== 'Keluar') {
      for (const t of trxMasuk) {
        if (t.tanggal < applied.from || t.tanggal > applied.to) continue;
        if (applied.kategori !== 'Semua' && t.kategori !== applied.kategori) continue;
        rows.push({
          key: `M${t.id}`, nomor: t.nomor, tanggal: t.tanggal, createdAt: t.createdAt,
          tsCode: t.tsCode, msCode: t.msCode, namaBarang: t.namaBarang,
          kategori: t.kategori || '—', uom: t.uom, binLoc: t.binLoc,
          jenis: 'Masuk', jumlah: t.jumlah,
          ref: t.noPo ?? '—', keterangan: t.keterangan, petugas: t.petugas,
        });
      }
    }

    if (applied.jenis !== 'Masuk') {
      for (const t of trxKeluar) {
        if (t.tanggal < applied.from || t.tanggal > applied.to) continue;
        if (applied.kategori !== 'Semua' && t.kategori !== applied.kategori) continue;
        rows.push({
          key: `K${t.id}`, nomor: t.nomor, tanggal: t.tanggal, createdAt: t.createdAt,
          tsCode: t.tsCode, msCode: t.msCode, namaBarang: t.namaBarang,
          kategori: t.kategori || '—', uom: t.uom, binLoc: t.binLoc,
          jenis: 'Keluar', jumlah: t.jumlah,
          ref: t.tujuan ? `${t.keperluan} · ${t.tujuan}` : t.keperluan,
          keterangan: t.keterangan, petugas: t.petugas,
        });
      }
    }

    return rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [trxMasuk, trxKeluar, applied]);

  // Summary stats (all computed from combinedRows in one pass)
  const stats = useMemo(() => {
    let masukUnit = 0, keluarUnit = 0;
    const freq: Record<string, { nama: string; count: number }> = {};
    for (const r of combinedRows) {
      if (r.jenis === 'Masuk') masukUnit += r.jumlah;
      else {
        keluarUnit += r.jumlah;
        if (!freq[r.tsCode]) freq[r.tsCode] = { nama: r.namaBarang, count: 0 };
        freq[r.tsCode].count++;
      }
    }
    const topKeluar = Object.entries(freq).sort((a, b) => b[1].count - a[1].count)[0];
    return {
      masukUnit, keluarUnit,
      totalTrx: combinedRows.length,
      masukCount: combinedRows.filter(r => r.jenis === 'Masuk').length,
      keluarCount: combinedRows.filter(r => r.jenis === 'Keluar').length,
      itemSeringKeluar: topKeluar ? { ...topKeluar[1], tsCode: topKeluar[0] } : null,
    };
  }, [combinedRows]);

  // Chart data
  const chartData = useMemo(() => {
    const span = daysBetween(applied.from, applied.to);
    if (span > 60) {
      // Group by month
      const months: Record<string, { masuk: number; keluar: number }> = {};
      for (const r of combinedRows) {
        const key = r.tanggal.slice(0, 7);
        if (!months[key]) months[key] = { masuk: 0, keluar: 0 };
        if (r.jenis === 'Masuk') months[key].masuk += r.jumlah;
        else months[key].keluar += r.jumlah;
      }
      return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => {
          const [yr, mo] = k.split('-');
          const label = new Date(Number(yr), Number(mo) - 1)
            .toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
          return { label, ...v };
        });
    }
    // Group by day — use object aggregation from rows (skip empty days for performance)
    const byDay: Record<string, { masuk: number; keluar: number }> = {};
    for (const r of combinedRows) {
      if (!byDay[r.tanggal]) byDay[r.tanggal] = { masuk: 0, keluar: 0 };
      if (r.jenis === 'Masuk') byDay[r.tanggal].masuk += r.jumlah;
      else byDay[r.tanggal].keluar += r.jumlah;
    }
    // Fill all days in range (max 60)
    const result: { label: string; masuk: number; keluar: number }[] = [];
    let cur = applied.from;
    while (cur <= applied.to) {
      const v = byDay[cur] ?? { masuk: 0, keluar: 0 };
      result.push({ label: fmtShort(cur), ...v });
      cur = nextDay(cur);
    }
    return result;
  }, [combinedRows, applied]);

  const chartHasData = useMemo(() => chartData.some(d => d.masuk > 0 || d.keluar > 0), [chartData]);

  // Search + pagination (search is purely UI, no useMemo needed for small datasets)
  const searchedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return combinedRows;
    return combinedRows.filter(r =>
      r.namaBarang.toLowerCase().includes(q) ||
      r.tsCode.toLowerCase().includes(q) ||
      r.nomor.toLowerCase().includes(q) ||
      r.petugas.toLowerCase().includes(q) ||
      r.ref.toLowerCase().includes(q)
    );
  }, [combinedRows, search]);

  const totalPages = Math.max(1, Math.ceil(searchedRows.length / pageSize));
  const safePageRef = useRef(page);
  const safePage = Math.min(page, totalPages);
  if (safePageRef.current !== safePage) safePageRef.current = safePage;
  const pageRows = searchedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const labelPeriode = applied.from === applied.to
    ? fmt(applied.from)
    : `${fmt(applied.from)} – ${fmt(applied.to)}`;

  const handleTampilkan = () => {
    if (dateFrom > dateTo) {
      toast.error('Periode tidak valid: tanggal mulai harus sebelum tanggal akhir');
      return;
    }
    setApplied({ from: dateFrom, to: dateTo, jenis: jenisFilter, kategori: kategoriFilter });
    setPage(1);
    setSearch('');
  };

  const handleExcel = () => {
    if (searchedRows.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }
    const wsData = [
      [
        'No.', 'Nomor Transaksi', 'Tanggal', 'Waktu Pencatatan',
        'TS Code', 'MS Code', 'Nama Barang', 'Kategori', 'Satuan (UOM)', 'Bin Location',
        'Jenis', 'Jumlah', 'Referensi / Keperluan', 'Keterangan', 'Petugas',
      ],
      ...searchedRows.map((r, i) => [
        i + 1,
        r.nomor,
        fmtWithDay(r.tanggal),
        fmtTime(r.createdAt),
        r.tsCode,
        r.msCode ?? '',
        r.namaBarang,
        r.kategori,
        r.uom,
        r.binLoc ?? '',
        r.jenis,
        r.jumlah,
        r.ref,
        r.keterangan ?? '',
        r.petugas,
      ]),
    ];
    exportStyledExcelAOA({
      data: wsData,
      colWidths: [4, 22, 24, 14, 12, 14, 45, 18, 10, 14, 8, 8, 28, 30, 22],
      sheetName: 'Laporan Transaksi',
      fileName: `Laporan_${applied.from}_${applied.to}.xlsx`,
    });
    toast.success(`Berhasil mengekspor ${searchedRows.length} baris ke Excel`);
  };

  // Pagination buttons helper
  const pageButtons = useMemo(() => {
    const pages: number[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (safePage <= 3) {
      pages.push(1, 2, 3, 4, 5);
    } else if (safePage >= totalPages - 2) {
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      for (let i = safePage - 2; i <= safePage + 2; i++) pages.push(i);
    }
    return pages;
  }, [totalPages, safePage]);

  return (
    <Layout title="Laporan & Rekapitulasi">
      <div className="flex flex-col gap-6">

        {/* Filter Bar */}
        <Card className="shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex flex-wrap gap-4 w-full">
              <div className="space-y-1.5 flex-1 min-w-[130px]">
                <label className="text-xs font-medium text-slate-500 uppercase">Periode Dari</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="pr-2 [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-[130px]">
                <label className="text-xs font-medium text-slate-500 uppercase">Sampai</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="pr-2 [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-[130px]">
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
              <div className="space-y-1.5 flex-1 min-w-[130px]">
                <label className="text-xs font-medium text-slate-500 uppercase">Kategori</label>
                <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua">Semua Kategori</SelectItem>
                    {kategoriList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto shrink-0">
              <Button className="flex-1 md:flex-none bg-green-700 hover:bg-green-800 text-white" onClick={handleTampilkan} disabled={isLoading}>
                <Filter className="w-4 h-4 mr-2" /> Tampilkan
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none text-green-700 border-green-200 hover:bg-green-50" onClick={handleExcel} disabled={isLoading}>
                <FileDown className="w-4 h-4 mr-2" /> Excel
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none text-slate-600 border-slate-200 hover:bg-slate-50" onClick={() => window.print()} disabled={isLoading}>
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-green-100 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2 text-green-600">
                <ArrowDownRight className="w-5 h-5" />
                <h3 className="font-semibold text-sm uppercase">Total Masuk</h3>
              </div>
              {isLoading ? <Skeleton className="h-9 w-24 mb-1" /> : <p className="text-3xl font-bold font-mono">{stats.masukUnit.toLocaleString('id-ID')}</p>}
              <p className="text-xs text-muted-foreground mt-1">{labelPeriode}</p>
            </CardContent>
          </Card>
          <Card className="border-orange-100 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2 text-orange-600">
                <ArrowUpRight className="w-5 h-5" />
                <h3 className="font-semibold text-sm uppercase">Total Keluar</h3>
              </div>
              {isLoading ? <Skeleton className="h-9 w-24 mb-1" /> : <p className="text-3xl font-bold font-mono">{stats.keluarUnit.toLocaleString('id-ID')}</p>}
              <p className="text-xs text-muted-foreground mt-1">{labelPeriode}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-semibold text-sm uppercase text-slate-500 mb-2">Item Sering Keluar</h3>
              {isLoading ? (
                <><Skeleton className="h-5 w-full mb-1" /><Skeleton className="h-3 w-20" /></>
              ) : stats.itemSeringKeluar ? (
                <>
                  <p className="text-sm font-bold line-clamp-2 leading-tight">{stats.itemSeringKeluar.nama}</p>
                  <p className="text-xs text-primary font-medium mt-1.5">{stats.itemSeringKeluar.count}× keluar</p>
                  <p className="text-xs text-muted-foreground">{labelPeriode}</p>
                </>
              ) : <p className="text-sm text-muted-foreground">Belum ada data</p>}
            </CardContent>
          </Card>
          <Card className="shadow-sm bg-slate-900 text-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2 text-slate-300">
                <Activity className="w-5 h-5" />
                <h3 className="font-semibold text-sm uppercase">Total Transaksi</h3>
              </div>
              {isLoading ? <Skeleton className="h-9 w-20 mb-1 bg-slate-700" /> : <p className="text-3xl font-bold font-mono">{stats.totalTrx}</p>}
              <p className="text-xs text-slate-400 mt-1">{isLoading ? '—' : `${stats.masukCount} masuk · ${stats.keluarCount} keluar`}</p>
              <p className="text-xs text-slate-500">{labelPeriode}</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Tren Masuk vs Keluar</CardTitle>
            <p className="text-xs text-muted-foreground">{labelPeriode} · unit barang</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">Memuat data...</div>
            ) : !chartHasData ? (
              <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Package className="h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium">Belum ada transaksi di periode ini</p>
                <p className="text-xs">Atur periode lalu klik Tampilkan.</p>
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 16, left: -12, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(v: number, name: string) => [v.toLocaleString('id-ID'), name]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 12, fontSize: 12 }} />
                    <Line type="monotone" dataKey="masuk" name="Barang Masuk" stroke="#22c55e" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="keluar" name="Barang Keluar" stroke="#f97316" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
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
              <CardTitle className="text-base font-semibold">Detail Transaksi</CardTitle>
              {!isLoading && <p className="text-xs text-muted-foreground mt-0.5">{searchedRows.length.toLocaleString('id-ID')} baris ditemukan</p>}
            </div>
            <div className="relative w-full sm:w-60">
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
            <CardContent className="pt-0 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[105px]">Tanggal</TableHead>
                      <TableHead>TS Code</TableHead>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-center w-[76px]">Jenis</TableHead>
                      <TableHead className="text-right w-[72px]">Jumlah</TableHead>
                      <TableHead>Referensi</TableHead>
                      <TableHead>Petugas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map(row => (
                      <TableRow key={row.key}>
                        <TableCell className="text-sm whitespace-nowrap">{fmtWithDay(row.tanggal)}</TableCell>
                        <TableCell className="font-mono text-sm">{row.tsCode}</TableCell>
                        <TableCell className="font-medium max-w-[180px] truncate" title={row.namaBarang}>{row.namaBarang}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.kategori}</TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.jenis === 'Masuk' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{row.jenis}</span>
                        </TableCell>
                        <TableCell className={`text-right font-bold font-mono ${row.jenis === 'Masuk' ? 'text-green-600' : 'text-orange-600'}`}>
                          {row.jenis === 'Masuk' ? '+' : '-'}{row.jumlah}
                        </TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate" title={row.ref}>{row.ref}</TableCell>
                        <TableCell className="text-sm">{row.petugas}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <span>
                    {searchedRows.length === 0 ? '0' : Math.min((safePage - 1) * pageSize + 1, searchedRows.length)}–{Math.min(safePage * pageSize, searchedRows.length)} dari {searchedRows.length.toLocaleString('id-ID')} baris
                  </span>
                  <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="text-sm border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    {PAGE_SIZE_OPTIONS_LAPORAN.map(n => <option key={n} value={n}>{n} / hal</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {pageButtons.map(p => (
                    <Button
                      key={p} variant="outline" size="sm"
                      className={safePage === p ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-800 hover:text-white' : ''}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}>
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
