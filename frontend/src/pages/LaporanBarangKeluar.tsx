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
import { Search, FileDown, PackageX, Layers, Hash, TrendingDown, FileX, ChevronLeft, ChevronRight, MoreHorizontal, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { PeriodePicker } from '@/components/PeriodePicker';

interface TransaksiKeluar {
  id: number;
  nomor: string;
  jumlah: number;
  keperluan: string;
  tujuan: string | null;
  tanggal: string;
  keterangan: string | null;
  maintenanceOrder: string | null;
  functionalLocation: string | null;
  equipment: string | null;
  movementType: string | null;
  orderType: string | null;
  activityType: string | null;
  createdAt: string;
  itemCode: string;
  tsCode: string | null;
  msCode: string | null;
  namaBarang: string;
  kategori: string;
  uom: string;
  binLoc: string | null;
  petugas: string;
}

interface PrintPayload {
  nomor: string;
  tanggal: string;
  itemCode: string;
  namaBarang: string;
  uom: string;
  binLoc?: string | null;
  qtyOnHand: number;
  qtyIssued: number;
  keperluan: string;
  tujuan?: string;
  keterangan?: string;
  petugasNama: string;
  maintenanceOrder?: string;
  functionalLocation?: string;
  equipment?: string;
  movementType?: string;
  orderType?: string;
  activityType?: string;
}

function printReservationList(d: PrintPayload) {
  const tglCetak = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const jamCetak = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const tglDoc = new Date(d.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const row = (label: string, value: string) =>
    `<div class="info-row"><span class="lbl">${label}</span><span class="colon">:</span><span class="val">${value || '—'}</span></div>`;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Reservation List — ${d.nomor}</title>
<style>
  @page { size: A4 landscape; margin: 8mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #111; }
  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #1B3A2D; padding-bottom: 5px; margin-bottom: 7px; }
  .co-name { font-size: 9.5pt; font-weight: 700; color: #1B3A2D; }
  .co-sub  { font-size: 7.5pt; color: #555; margin-top: 1px; }
  .doc-title { text-align: center; }
  .doc-title h1 { font-size: 13pt; font-weight: 700; color: #1B3A2D; letter-spacing: .5px; }
  .doc-title p  { font-size: 7.5pt; color: #666; margin-top: 2px; }
  .doc-meta  { text-align: right; font-size: 7.5pt; line-height: 1.55; }
  .doc-meta strong { color: #1B3A2D; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 24px; border: 1px solid #c8d5cc; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; background: #f9fcfa; }
  .info-row  { display: flex; gap: 0; font-size: 8pt; line-height: 1.6; }
  .lbl  { min-width: 138px; font-weight: 600; color: #333; }
  .colon{ margin: 0 4px; color: #666; }
  .val  { color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 7.8pt; }
  thead tr { background: #1B3A2D; color: #fff; }
  th { padding: 4px 5px; border: 1px solid #1B3A2D; text-align: center; font-weight: 600; white-space: nowrap; }
  td { padding: 4px 5px; border: 1px solid #b0bfb8; vertical-align: middle; }
  tbody tr:nth-child(even) td { background: #f4f8f5; }
  .center { text-align: center; }
  .mono { font-family: Courier New, monospace; }
  .sigs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 4px; }
  .sig  { border: 1px solid #b0bfb8; border-radius: 4px; padding: 6px 10px; }
  .sig-title { font-weight: 700; font-size: 8pt; color: #1B3A2D; margin-bottom: 38px; }
  .sig-line  { border-top: 1px solid #333; padding-top: 3px; font-size: 7.5pt; color: #444; }
  .footer { margin-top: 8px; font-size: 7pt; color: #888; border-top: 1px solid #ddd; padding-top: 3px; display:flex; justify-content:space-between; }
</style>
</head>
<body>
<div class="doc-header">
  <div>
    <div class="co-name">PT TANJUNGENIM LESTARI PULP AND PAPER</div>
    <div class="co-sub">Townsite Warehouse — Materials Management System</div>
  </div>
  <div class="doc-title">
    <h1>GOODS ISSUE / RESERVATION LIST</h1>
    <p>Surat Pengeluaran Barang Gudang</p>
  </div>
  <div class="doc-meta">
    <strong>Reservation No</strong>: ${d.nomor}<br>
    <strong>Tgl. Cetak</strong>: ${tglCetak} ${jamCetak}<br>
    <strong>Halaman</strong>: 1 / 1
  </div>
</div>
<div class="info-grid">
  ${row('Reservation No', d.nomor)}
  ${row('Movement Type', d.movementType || '')}
  ${row('Requested Date', tglDoc)}
  ${row('Order Type', d.orderType || '')}
  ${row('Requested By', d.petugasNama)}
  ${row('Maint. Activity Type', d.activityType || '')}
  ${row('Maintenance Order', d.maintenanceOrder || '')}
  ${row('Functional Location', d.functionalLocation || '')}
  ${row('Keperluan', d.keperluan)}
  ${row('Equipment', d.equipment || '')}
  ${row('Department / Tujuan', d.tujuan || '')}
  ${row('Keterangan', d.keterangan || '')}
</div>
<table>
  <thead>
    <tr>
      <th style="width:24px">No</th>
      <th style="width:68px">Item Code</th>
      <th>Nama Barang / Description</th>
      <th style="width:34px">UOM</th>
      <th style="width:56px">Qty<br>On Hand</th>
      <th style="width:56px">Qty<br>Reserved</th>
      <th style="width:56px">Qty<br>Issued</th>
      <th style="width:74px">Location<br>(BIN LOC)</th>
      <th style="width:62px">Valuation<br>Type</th>
      <th style="width:54px">Stock<br>Indicator</th>
      <th style="width:64px">Serial<br>Number</th>
      <th style="width:74px">Department</th>
      <th style="width:70px">Last Issue /<br>Quantity</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="center">1</td>
      <td class="center mono">${d.itemCode}</td>
      <td>${d.namaBarang}</td>
      <td class="center">${d.uom}</td>
      <td class="center">${d.qtyOnHand}</td>
      <td class="center">${d.qtyIssued}</td>
      <td class="center">${d.qtyIssued}</td>
      <td class="center mono">${d.binLoc || '—'}</td>
      <td></td>
      <td></td>
      <td></td>
      <td>${d.tujuan || ''}</td>
      <td></td>
    </tr>
    <tr>
      <td colspan="13" style="height:18px; border-color:#e5e7eb; background:#fff;"></td>
    </tr>
  </tbody>
</table>
<div class="sigs">
  <div class="sig">
    <div class="sig-title">Requested By / Dibuat Oleh</div>
    <div class="sig-line">( Nama &amp; Jabatan )</div>
  </div>
  <div class="sig">
    <div class="sig-title">Approved By / Disetujui Oleh</div>
    <div class="sig-line">( Nama &amp; Jabatan )</div>
  </div>
  <div class="sig">
    <div class="sig-title">Received By / Diterima Oleh</div>
    <div class="sig-line">( Nama &amp; Jabatan )</div>
  </div>
</div>
<div class="footer">
  <span>* Dokumen ini dicetak dari sistem Tel Gudang — Townsite Warehouse Materials Management System</span>
  <span>Dicetak: ${tglCetak} ${jamCetak} &nbsp;|&nbsp; Petugas: ${d.petugasNama}</span>
</div>
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=1100,height=780');
  if (!w) { alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak.'); return; }
  w.document.write(html);
  w.document.close();
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

export default function LaporanBarangKeluar() {
  const { token } = useAppContext();
  const [data, setData] = useState<TransaksiKeluar[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [keperluanFilter, setKeperluanFilter] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch('/api/transaksi-keluar', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setData)
      .catch(() => toast.error('Gagal memuat data transaksi keluar'))
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => { setCurrentPage(1); }, [search, dateFrom, dateTo, keperluanFilter, pageSize]);

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
        row.itemCode.toLowerCase().includes(q) ||
        (row.tsCode ?? '').toLowerCase().includes(q) ||
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startEntry = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endEntry = Math.min(safePage * pageSize, filtered.length);

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
      'Tanggal': fmtTglHari(r.tanggal),
      'Waktu Pencatatan': fmtWaktu(r.createdAt),
      'Item Code': r.itemCode,
      'TS Code': r.tsCode ?? '',
      'MS Code': r.msCode ?? '',
      'Nama Barang': r.namaBarang,
      'Kategori': r.kategori,
      'Satuan (UOM)': r.uom,
      'Bin Location': r.binLoc ?? '',
      'Jumlah Keluar': r.jumlah,
      'Keperluan': r.keperluan,
      'Tujuan': r.tujuan ?? '',
      'Keterangan': r.keterangan ?? '',
      'Petugas': r.petugas,
    }));
    const tgl = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    exportStyledExcel({
      rows,
      colWidths: [4, 22, 24, 14, 12, 12, 14, 45, 18, 10, 14, 10, 16, 22, 30, 22],
      sheetName: 'Barang Keluar',
      fileName: `Laporan_Barang_Keluar_${tgl}.xlsx`,
    });
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex gap-2 items-center flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nomor, Item Code, nama, tujuan..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" onClick={handleExportExcel} className="sm:hidden shrink-0 h-9 w-9 text-green-700 border-green-200 hover:bg-green-50" title="Export Excel">
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <Select value={keperluanFilter} onValueChange={setKeperluanFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Keperluan</SelectItem>
                {keperluanOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            <PeriodePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
            />
          </div>
          <Button variant="outline" onClick={handleExportExcel} className="hidden sm:flex text-green-700 border-green-200 hover:bg-green-50 shrink-0">
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

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-8 text-center text-xs">#</TableHead>
                  <TableHead className="whitespace-nowrap">Nomor Transaksi</TableHead>
                  <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead className="min-w-[260px]">Nama Barang</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Keperluan</TableHead>
                  <TableHead>Tujuan</TableHead>
                  <TableHead className="min-w-[160px]">Keterangan</TableHead>
                  <TableHead>Petugas</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 11 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-48 text-center">
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
                    <TableCell className="font-mono text-sm text-slate-600 whitespace-nowrap">{row.itemCode}</TableCell>
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
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        title="Cetak Reservation List"
                        onClick={() => printReservationList({
                          nomor: row.nomor,
                          tanggal: row.tanggal,
                          itemCode: row.itemCode,
                          namaBarang: row.namaBarang,
                          uom: row.uom,
                          binLoc: row.binLoc,
                          qtyOnHand: 0,
                          qtyIssued: row.jumlah,
                          keperluan: row.keperluan,
                          tujuan: row.tujuan ?? undefined,
                          keterangan: row.keterangan ?? undefined,
                          petugasNama: row.petugas,
                          maintenanceOrder: row.maintenanceOrder ?? undefined,
                          functionalLocation: row.functionalLocation ?? undefined,
                          equipment: row.equipment ?? undefined,
                          movementType: row.movementType ?? undefined,
                          orderType: row.orderType ?? undefined,
                          activityType: row.activityType ?? undefined,
                        })}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
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
