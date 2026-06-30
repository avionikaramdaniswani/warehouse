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
  CalendarDays, MapPin, TrendingDown, Clock, AlertTriangle, Loader2
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
  createdAt: string;
  tsCode: string;
  namaBarang: string;
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
  const [formData, setFormData] = useState({
    jumlah: '',
    tujuan: '',
    tanggal: new Date().toISOString().split('T')[0],
    keperluan: 'Perbaikan',
    keterangan: '',
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
        item.tsCode.toLowerCase().includes(q) ||
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
    setFormData({ jumlah: '', tujuan: '', tanggal: new Date().toISOString().split('T')[0], keperluan: 'Perbaikan', keterangan: '' });
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
      } catch { /* tidak valid sebagai URL — lanjut ke pencarian TS Code */ }
    }
    // Fallback: cari berdasarkan TS Code
    const found = items.find((i) => i.tsCode === scanned);
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
          tsCode: selectedItem.tsCode,
          jumlah: jumlahInt,
          keperluan: formData.keperluan,
          tujuan: formData.tujuan || undefined,
          tanggal: formData.tanggal,
          keterangan: formData.keterangan || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message ?? 'Gagal menyimpan pengeluaran');
        return;
      }
      const result = await res.json();
      setItems(items.map((item) =>
        item.tsCode === selectedItem.tsCode
          ? { ...item, stok: result.stokBaru, status: result.status ?? item.status }
          : item
      ));
      toast.success(`Pengeluaran ${result.nomor} berhasil disimpan`);
      setFormOpen(false);
      resetForm();
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
      trx.tsCode.toLowerCase().includes(search.toLowerCase()) ||
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
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-28">TS Code</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Barang</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 text-right w-24">Jumlah</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-36">Tujuan</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-32">Keperluan</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-32">Petugas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center">
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
                      <TableCell className="font-mono text-sm text-slate-600">{trx.tsCode}</TableCell>
                      <TableCell className="font-medium text-sm text-slate-800">{trx.namaBarang}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded text-sm font-mono">-{trx.jumlah}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{trx.tujuan || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${keperluanBadge[trx.keperluan ?? ''] || ''}`}>{trx.keperluan}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{trx.petugas}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-56 text-center">
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
        <DialogContent className="sm:max-w-lg">
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
                    placeholder="Nama barang atau TS Code..."
                    className="pl-9"
                    value={searchItem}
                    onChange={(e) => { setSearchItem(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    autoFocus
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden">
                      {suggestions.map((item) => (
                        <button key={item.tsCode}
                          disabled={item.stok === 0}
                          className={`w-full px-4 py-2.5 flex justify-between items-center border-b last:border-0 text-left transition-colors
                            ${item.stok === 0 ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-slate-50'}`}
                          onMouseDown={() => item.stok > 0 && handleSelectItem(item)}>
                          <div>
                            <p className="font-medium text-sm">{item.nama}</p>
                            <p className="text-xs font-mono text-slate-400">{item.tsCode} · {item.kategori}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold shrink-0 ml-3 ${item.stok === 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100'}`}>
                            Stok: {item.stok}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{selectedItem.nama}</p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      {selectedItem.tsCode} · Stok tersedia: <strong className="text-primary">{selectedItem.stok}</strong> {selectedItem.uom}
                    </p>
                  </div>
                  <button className="text-xs text-slate-400 hover:text-red-500 shrink-0 transition-colors" onClick={() => setSelectedItem(null)}>Ganti</button>
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
