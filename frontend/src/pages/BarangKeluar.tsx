import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Search, Plus, QrCode, PackageMinus, FileX,
  CalendarDays, MapPin, TrendingDown, Clock, AlertTriangle, Loader2,
  Printer, Wrench, Settings2,
} from 'lucide-react';
import { useAppContext, Item } from '@/context/AppContext';
import { toast } from 'sonner';
import { QrScannerDialog } from '@/components/QrScannerDialog';
import { BinItemSelectDialog } from '@/components/BinItemSelectDialog';

interface TransaksiKeluar {
  id: number;
  nomor: string;
  jumlah: number;
  keperluan: string | null;
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
  namaBarang: string;
  uom: string;
  binLoc: string | null;
  petugas: string;
}

const KEPERLUAN_OPTIONS = ['Semua', 'Perbaikan', 'Penggantian', 'Proyek Baru', 'Peminjaman', 'Lainnya'];

const keperluanBadge: Record<string, string> = {
  'Perbaikan':   'bg-amber-50 text-amber-700 border-amber-200',
  'Penggantian': 'bg-sky-50 text-sky-700 border-sky-200',
  'Proyek Baru': 'bg-blue-50 text-blue-700 border-blue-200',
  'Peminjaman':  'bg-purple-50 text-purple-700 border-purple-200',
  'Lainnya':     'bg-slate-50 text-slate-600 border-slate-200',
};

function formatWaktu(iso: string): string {
  const d = new Date(iso);
  const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${tgl} ${jam}`;
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

  /* ── Header ── */
  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #1B3A2D; padding-bottom: 5px; margin-bottom: 7px; }
  .co-name { font-size: 9.5pt; font-weight: 700; color: #1B3A2D; }
  .co-sub  { font-size: 7.5pt; color: #555; margin-top: 1px; }
  .doc-title { text-align: center; }
  .doc-title h1 { font-size: 13pt; font-weight: 700; color: #1B3A2D; letter-spacing: .5px; }
  .doc-title p  { font-size: 7.5pt; color: #666; margin-top: 2px; }
  .doc-meta  { text-align: right; font-size: 7.5pt; line-height: 1.55; }
  .doc-meta strong { color: #1B3A2D; }

  /* ── Info grid ── */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 24px; border: 1px solid #c8d5cc; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; background: #f9fcfa; }
  .info-row  { display: flex; gap: 0; font-size: 8pt; line-height: 1.6; }
  .lbl  { min-width: 138px; font-weight: 600; color: #333; }
  .colon{ margin: 0 4px; color: #666; }
  .val  { color: #111; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 7.8pt; }
  thead tr { background: #1B3A2D; color: #fff; }
  th { padding: 4px 5px; border: 1px solid #1B3A2D; text-align: center; font-weight: 600; white-space: nowrap; }
  td { padding: 4px 5px; border: 1px solid #b0bfb8; vertical-align: middle; }
  tbody tr:nth-child(even) td { background: #f4f8f5; }
  .center { text-align: center; }
  .mono { font-family: Courier New, monospace; }

  /* ── Signatures ── */
  .sigs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 4px; }
  .sig  { border: 1px solid #b0bfb8; border-radius: 4px; padding: 6px 10px; }
  .sig-title { font-weight: 700; font-size: 8pt; color: #1B3A2D; margin-bottom: 38px; }
  .sig-line  { border-top: 1px solid #333; padding-top: 3px; font-size: 7.5pt; color: #444; }

  /* ── Footer ── */
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

export default function BarangKeluar() {
  const { items, setItems, token, currentUser } = useAppContext();
  const canEdit = currentUser?.role !== 'petugas';

  const [transaksi, setTransaksi] = useState<TransaksiKeluar[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [filterKeperluan, setFilterKeperluan] = useState('Semua');
  const [filterTanggal, setFilterTanggal] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [binSelectOpen, setBinSelectOpen] = useState(false);
  const [binSelectLoc, setBinSelectLoc] = useState('');
  const [binSelectItems, setBinSelectItems] = useState<Item[]>([]);

  const [searchItem, setSearchItem] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [printData, setPrintData] = useState<PrintPayload | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    jumlah: '',
    tujuan: '',
    tanggal: new Date().toISOString().split('T')[0],
    keperluan: 'Perbaikan',
    keterangan: '',
    maintenanceOrder: '',
    functionalLocation: '',
    equipment: '',
    movementType: '261',
    orderType: 'PM01',
    activityType: 'Corrective',
  });

  const jumlahInt = parseInt(formData.jumlah) || 0;
  const isOverStok = selectedItem ? jumlahInt > selectedItem.stok : false;

  const fetchTransaksi = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/transaksi-keluar', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: TransaksiKeluar[] = await res.json();
        setTransaksi(data);
      }
    } catch {
      toast.error('Gagal memuat data transaksi');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTransaksi();
  }, [fetchTransaksi]);

  const suggestions = items.filter(
    (item) => {
      if (searchItem.length < 2) return false;
      const q = searchItem.toLowerCase();
      return (
        item.nama.toLowerCase().includes(q) ||
        item.itemCode.toLowerCase().includes(q) ||
        (item.tsCode ?? '').toLowerCase().includes(q) ||
        (item.binLoc ?? '').toLowerCase().includes(q) ||
        item.kategori.toLowerCase().includes(q)
      );
    }
  ).slice(0, 8);

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setSearchItem('');
    setShowSuggestions(false);
  };

  const resetForm = () => {
    setSelectedItem(null);
    setSearchItem('');
    setFormData({
      jumlah: '', tujuan: '', tanggal: new Date().toISOString().split('T')[0],
      keperluan: 'Perbaikan', keterangan: '',
      maintenanceOrder: '', functionalLocation: '', equipment: '',
      movementType: '261', orderType: 'PM01', activityType: 'Corrective',
    });
  };

  const handleQrScan = (scanned: string) => {
    // Deteksi QR BIN LOC (URL seperti https://…/bin/TS-B.03)
    if (scanned.includes('/bin/')) {
      try {
        const pathPart = scanned.includes('://') ? new URL(scanned).pathname : scanned;
        const binLoc = decodeURIComponent(pathPart.split('/bin/')[1] ?? '').trim();
        if (binLoc) {
          const binItems = items.filter((i) => i.binLoc === binLoc);
          if (binItems.length === 0) {
            toast.error(`Tidak ada barang di BIN LOC "${binLoc}"`);
            return;
          }
          if (binItems.length === 1) {
            setSelectedItem(binItems[0]);
            setSearchItem('');
            setShowSuggestions(false);
            if (!formOpen) setFormOpen(true);
            toast.success(`Barang terdeteksi dari BIN ${binLoc}: ${binItems[0].nama}`);
            return;
          }
          setBinSelectLoc(binLoc);
          setBinSelectItems(binItems);
          setBinSelectOpen(true);
          return;
        }
      } catch { /* tidak valid sebagai URL — lanjut ke pencarian Item Code */ }
    }
    // Fallback: cari berdasarkan Item Code
    const found = items.find((i) => i.itemCode === scanned);
    if (!found) {
      toast.error(`Barang dengan kode "${scanned}" tidak ditemukan`);
      return;
    }
    setSelectedItem(found);
    setSearchItem('');
    setShowSuggestions(false);
    if (!formOpen) setFormOpen(true);
    toast.success(`Barang terdeteksi: ${found.nama}`);
  };

  const handleBinItemSelect = (item: Item) => {
    setSelectedItem(item);
    setSearchItem('');
    setShowSuggestions(false);
    if (!formOpen) setFormOpen(true);
    toast.success(`Dipilih dari BIN ${binSelectLoc}: ${item.nama}`);
  };

  const handleSimpan = async () => {
    if (!selectedItem || !formData.jumlah || jumlahInt <= 0) {
      toast.error('Pilih barang dan masukkan jumlah yang valid');
      return;
    }
    if (isOverStok) {
      toast.error(`Stok tidak mencukupi! Tersedia: ${selectedItem.stok}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/transaksi-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          itemCode: selectedItem.itemCode,
          jumlah: jumlahInt,
          keperluan: formData.keperluan,
          tujuan: formData.tujuan || undefined,
          tanggal: formData.tanggal,
          keterangan: formData.keterangan || undefined,
          maintenanceOrder: formData.maintenanceOrder || undefined,
          functionalLocation: formData.functionalLocation || undefined,
          equipment: formData.equipment || undefined,
          movementType: formData.movementType || undefined,
          orderType: formData.orderType || undefined,
          activityType: formData.activityType || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message ?? 'Gagal menyimpan pengeluaran');
        return;
      }
      const result = await res.json();
      const snapItem = { ...selectedItem };
      const snapForm = { ...formData };
      const snapJumlah = jumlahInt;
      setItems(items.map((item) =>
        item.itemCode === selectedItem.itemCode
          ? { ...item, stok: result.stokBaru, status: result.status ?? item.status }
          : item
      ));
      setPrintData({
        nomor: result.nomor,
        tanggal: snapForm.tanggal,
        itemCode: snapItem.itemCode,
        namaBarang: snapItem.nama,
        uom: snapItem.uom,
        binLoc: snapItem.binLoc,
        qtyOnHand: result.stokBaru + snapJumlah,
        qtyIssued: snapJumlah,
        keperluan: snapForm.keperluan,
        tujuan: snapForm.tujuan || undefined,
        keterangan: snapForm.keterangan || undefined,
        petugasNama: currentUser?.namaLengkap ?? currentUser?.email ?? '',
        maintenanceOrder: snapForm.maintenanceOrder || undefined,
        functionalLocation: snapForm.functionalLocation || undefined,
        equipment: snapForm.equipment || undefined,
        movementType: snapForm.movementType || undefined,
        orderType: snapForm.orderType || undefined,
        activityType: snapForm.activityType || undefined,
      });
      setFormOpen(false);
      resetForm();
      setPrintDialogOpen(true);
      await fetchTransaksi();
    } catch {
      toast.error('Gagal terhubung ke server');
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const filtered = transaksi.filter((trx) => {
    const matchSearch =
      search.length === 0 ||
      trx.namaBarang.toLowerCase().includes(search.toLowerCase()) ||
      trx.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      (trx.tujuan ?? '').toLowerCase().includes(search.toLowerCase()) ||
      trx.nomor.toLowerCase().includes(search.toLowerCase());
    const matchKeperluan = filterKeperluan === 'Semua' || trx.keperluan === filterKeperluan;
    const matchTanggal = !filterTanggal || trx.tanggal === filterTanggal;
    return matchSearch && matchKeperluan && matchTanggal;
  });

  const totalHariIni = transaksi.filter((t) => t.tanggal === today).length;

  return (
    <Layout title="Pengeluaran Barang">
      <div className="flex flex-col gap-5">

        {/* Stat strip */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 text-primary rounded-lg px-4 py-2 text-sm font-medium">
            <TrendingDown className="h-4 w-4" />
            <span>{totalHariIni} pengeluaran hari ini</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-4 py-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            <span>{transaksi.length} total transaksi</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2.5 flex-1 w-full sm:w-auto">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, TS Code, tujuan, nomor..."
                className="pl-9 bg-white h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-2.5">
              <Select value={filterKeperluan} onValueChange={setFilterKeperluan}>
                <SelectTrigger className="w-full sm:w-[170px] bg-white h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KEPERLUAN_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>{k === 'Semua' ? 'Semua Keperluan' : k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                className="bg-white h-9 text-sm w-full sm:w-[160px]"
                value={filterTanggal}
                onChange={(e) => setFilterTanggal(e.target.value)}
              />
            </div>
            {(search || filterKeperluan !== 'Semua' || filterTanggal) && (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-slate-800 shrink-0"
                onClick={() => { setSearch(''); setFilterKeperluan('Semua'); setFilterTanggal(''); }}>
                Reset
              </Button>
            )}
          </div>
          {canEdit && (
            <Button
              className="w-full sm:w-auto h-9"
              onClick={() => { resetForm(); setFormOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Input Pengeluaran
            </Button>
          )}
        </div>

        {(search || filterKeperluan !== 'Semua' || filterTanggal) && (
          <p className="text-sm text-muted-foreground -mt-2">
            Menampilkan <strong>{filtered.length}</strong> dari {transaksi.length} transaksi
          </p>
        )}

        {/* Table */}
        <Card className="overflow-hidden border-slate-100 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-100">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-32">Nomor</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-36">Waktu</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-28">Item Code</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Barang</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 text-right w-24">Jumlah</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-36">Tujuan</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-32">Keperluan</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-32">Petugas</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-40 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" /><span>Memuat data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length > 0 ? (
                  filtered.map((trx) => (
                    <TableRow key={trx.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50">
                      <TableCell className="font-mono text-xs text-slate-500">{trx.nomor}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatWaktu(trx.createdAt)}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-600">{trx.itemCode}</TableCell>
                      <TableCell className="font-medium text-sm text-slate-800">{trx.namaBarang}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded text-sm font-mono">-{trx.jumlah}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{trx.tujuan || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${keperluanBadge[trx.keperluan ?? ''] || ''}`}>{trx.keperluan}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{trx.petugas}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                          title="Cetak Reservation List"
                          onClick={() => {
                            const item = items.find(i => i.itemCode === trx.itemCode);
                            printReservationList({
                              nomor: trx.nomor,
                              tanggal: trx.tanggal,
                              itemCode: trx.itemCode,
                              namaBarang: trx.namaBarang,
                              uom: trx.uom || item?.uom || '',
                              binLoc: trx.binLoc ?? item?.binLoc,
                              qtyOnHand: item?.stok ?? 0,
                              qtyIssued: trx.jumlah,
                              keperluan: trx.keperluan ?? '',
                              tujuan: trx.tujuan ?? undefined,
                              keterangan: trx.keterangan ?? undefined,
                              petugasNama: trx.petugas,
                              maintenanceOrder: trx.maintenanceOrder ?? undefined,
                              functionalLocation: trx.functionalLocation ?? undefined,
                              equipment: trx.equipment ?? undefined,
                              movementType: trx.movementType ?? undefined,
                              orderType: trx.orderType ?? undefined,
                              activityType: trx.activityType ?? undefined,
                            });
                          }}>
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-56 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileX className="h-10 w-10 mb-2 text-slate-200" />
                        <p className="font-medium text-slate-500">Tidak ada data pengeluaran</p>
                        <p className="text-sm text-slate-400">Klik "Input Pengeluaran" untuk menambah data</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <PackageMinus className="h-5 w-5 text-primary" />
              Input Pengeluaran Barang
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Cari Barang <span className="text-red-500">*</span></Label>
              {!selectedItem ? (
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nama barang atau Item Code..."
                    className="pl-9"
                    value={searchItem}
                    onChange={(e) => { setSearchItem(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    autoFocus
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                      {suggestions.map((item) => (
                        <button key={item.itemCode}
                          disabled={item.stok === 0}
                          className={`w-full px-4 py-2.5 flex justify-between items-center border-b last:border-0 text-left transition-colors
                            ${item.stok === 0 ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-slate-50'}`}
                          onMouseDown={() => item.stok > 0 && handleSelectItem(item)}>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{item.nama}</p>
                            <p className="text-xs font-mono text-slate-400">{item.itemCode} · {item.kategori}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {item.binLoc && (
                              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-mono">{item.binLoc}</span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${item.stok === 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100'}`}>
                              Stok: {item.stok}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-800 break-words">{selectedItem.nama}</p>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">{selectedItem.itemCode} · {selectedItem.kategori}</p>
                    </div>
                    <button className="text-xs text-slate-400 hover:text-red-500 shrink-0 transition-colors pt-0.5" onClick={() => setSelectedItem(null)}>Ganti</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    <span className="inline-flex items-center gap-1 text-xs bg-white border border-primary/20 rounded px-2 py-1 font-medium text-primary">
                      Stok tersedia: <strong>{selectedItem.stok} {selectedItem.uom}</strong>
                    </span>
                    {selectedItem.binLoc ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1 font-mono font-semibold text-blue-700">
                        📍 BIN LOC: {selectedItem.binLoc}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-400 italic">
                        BIN LOC belum diset
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Jumlah Keluar <span className="text-red-500">*</span></Label>
                <div className="flex gap-2 items-center">
                  <Input type="number" min="1" max={selectedItem?.stok} placeholder="0"
                    value={formData.jumlah}
                    onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                    className={`font-bold text-base ${isOverStok ? 'border-red-400 focus-visible:ring-red-300' : ''}`} />
                  <span className="text-sm text-muted-foreground shrink-0 w-12">{selectedItem?.uom || '—'}</span>
                </div>
                {isOverStok && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />Melebihi stok!
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Keperluan <span className="text-red-500">*</span></Label>
                <Select value={formData.keperluan} onValueChange={(v) => setFormData({ ...formData, keperluan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Perbaikan">Perbaikan Maint.</SelectItem>
                    <SelectItem value="Penggantian">Penggantian Rutin</SelectItem>
                    <SelectItem value="Proyek Baru">Proyek Baru</SelectItem>
                    <SelectItem value="Peminjaman">Peminjaman</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />Tanggal Keluar <span className="text-red-500">*</span>
                </Label>
                <Input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />Tujuan / Peminjam
                </Label>
                <Input placeholder="Nama atau area" value={formData.tujuan} onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Keterangan</Label>
              <Textarea placeholder="Catatan tambahan..." value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                className="resize-none h-16 text-sm" />
            </div>

            {/* SAP / Maintenance Fields */}
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" />Info SAP / Maintenance <span className="font-normal normal-case">(opsional, untuk Reservation List)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Movement Type</Label>
                  <Select value={formData.movementType} onValueChange={(v) => setFormData({ ...formData, movementType: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="261">261 — GI for Order</SelectItem>
                      <SelectItem value="281">281 — GI for Network</SelectItem>
                      <SelectItem value="201">201 — GI for Cost Center</SelectItem>
                      <SelectItem value="291">291 — GI for Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Order Type</Label>
                  <Select value={formData.orderType} onValueChange={(v) => setFormData({ ...formData, orderType: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PM01">PM01 — Corrective Maint.</SelectItem>
                      <SelectItem value="PM02">PM02 — Preventive Maint.</SelectItem>
                      <SelectItem value="PM03">PM03 — Inspection</SelectItem>
                      <SelectItem value="PM04">PM04 — Rebuild/Refurb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Maint. Activity Type</Label>
                  <Select value={formData.activityType} onValueChange={(v) => setFormData({ ...formData, activityType: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Corrective">Corrective</SelectItem>
                      <SelectItem value="Preventive">Preventive</SelectItem>
                      <SelectItem value="Predictive">Predictive</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Settings2 className="h-3 w-3" />Maintenance Order No</Label>
                  <Input className="h-8 text-sm" placeholder="cth. MO-2026-001"
                    value={formData.maintenanceOrder}
                    onChange={(e) => setFormData({ ...formData, maintenanceOrder: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Functional Location</Label>
                  <Input className="h-8 text-sm" placeholder="cth. TL-AREA-C"
                    value={formData.functionalLocation}
                    onChange={(e) => setFormData({ ...formData, functionalLocation: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Equipment No</Label>
                  <Input className="h-8 text-sm" placeholder="cth. EQ-001"
                    value={formData.equipment}
                    onChange={(e) => setFormData({ ...formData, equipment: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }} disabled={saving}>Batal</Button>
            <Button onClick={handleSimpan}
              disabled={!selectedItem || !formData.jumlah || jumlahInt <= 0 || isOverStok || saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Menyimpan...</> : 'Simpan Pengeluaran'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-save: Cetak Reservation List */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Pengeluaran Berhasil Disimpan
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            {printData && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nomor</span>
                  <span className="font-mono font-semibold">{printData.nomor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Barang</span>
                  <span className="font-medium text-right max-w-[60%] truncate">{printData.namaBarang}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jumlah Keluar</span>
                  <span className="font-bold text-primary">{printData.qtyIssued} {printData.uom}</span>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Cetak <strong>Goods Issue / Reservation List</strong> (landscape A4) untuk dokumen serah terima?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>Lewati</Button>
            <Button onClick={() => { if (printData) { printReservationList(printData); } setPrintDialogOpen(false); }}
              className="gap-1.5">
              <Printer className="h-4 w-4" />Cetak Reservation List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QrScannerDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        onScan={handleQrScan}
        title="Scan QR Code — Barang Keluar"
      />

      <BinItemSelectDialog
        open={binSelectOpen}
        binLoc={binSelectLoc}
        items={binSelectItems}
        onSelect={handleBinItemSelect}
        onClose={() => setBinSelectOpen(false)}
      />

      <button onClick={() => setQrOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-[52px] h-[52px] bg-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        title="Scan QR">
        <QrCode className="w-5 h-5" />
      </button>
    </Layout>
  );
}
