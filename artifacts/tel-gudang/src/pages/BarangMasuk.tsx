import { useState } from 'react';
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
  Search, Plus, QrCode, Camera, PackagePlus, FileX,
  CalendarDays, FileText, TrendingUp, Clock
} from 'lucide-react';
import { useAppContext, Item } from '@/context/AppContext';
import { toast } from 'sonner';

const KONDISI_OPTIONS = ['Semua', 'Baik Baru', 'Baik Bekas', 'Rusak'];

const kondisiBadge: Record<string, string> = {
  'Baik Baru': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Baik Bekas': 'bg-sky-50 text-sky-700 border-sky-200',
  'Rusak': 'bg-red-50 text-red-700 border-red-200',
};

export default function BarangMasuk() {
  const { items, setItems, transaksiMasuk, setTransaksiMasuk, currentUser } = useAppContext();

  const [search, setSearch] = useState('');
  const [filterKondisi, setFilterKondisi] = useState('Semua');
  const [filterTanggal, setFilterTanggal] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const [searchItem, setSearchItem] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    jumlah: '',
    kondisi: 'Baik Baru',
    tanggal: new Date().toISOString().split('T')[0],
    noPo: '',
    keterangan: '',
  });

  const suggestions = items.filter(
    (item) =>
      searchItem.length > 1 &&
      (item.nama.toLowerCase().includes(searchItem.toLowerCase()) ||
        item.tsCode.toLowerCase().includes(searchItem.toLowerCase()))
  ).slice(0, 6);

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setSearchItem('');
    setShowSuggestions(false);
  };

  const resetForm = () => {
    setSelectedItem(null);
    setSearchItem('');
    setFormData({ jumlah: '', kondisi: 'Baik Baru', tanggal: new Date().toISOString().split('T')[0], noPo: '', keterangan: '' });
  };

  const handleSimpan = () => {
    if (!selectedItem || !formData.jumlah || parseInt(formData.jumlah) <= 0) {
      toast.error('Pilih barang dan masukkan jumlah yang valid');
      return;
    }
    const jumlah = parseInt(formData.jumlah);
    const updatedItems = items.map((item) => {
      if (item.tsCode === selectedItem.tsCode) {
        const newStok = item.stok + jumlah;
        return { ...item, stok: newStok, status: newStok <= item.safetyStok ? (newStok === 0 ? 'Habis' : 'Menipis') : 'Normal' };
      }
      return item;
    });
    setItems(updatedItems);
    setTransaksiMasuk([
      {
        id: `TRIN-${Date.now()}`,
        waktu: `${formData.tanggal} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
        tsCode: selectedItem.tsCode,
        nama: selectedItem.nama,
        jumlah,
        petugas: currentUser?.namaLengkap || 'Admin',
        kondisi: formData.kondisi,
        noPo: formData.noPo,
      },
      ...transaksiMasuk,
    ]);
    toast.success('Penerimaan barang berhasil disimpan');
    setFormOpen(false);
    resetForm();
  };

  const filtered = transaksiMasuk.filter((trx) => {
    const matchSearch =
      search.length === 0 ||
      trx.nama.toLowerCase().includes(search.toLowerCase()) ||
      trx.tsCode.toLowerCase().includes(search.toLowerCase()) ||
      (trx.noPo || '').toLowerCase().includes(search.toLowerCase());
    const matchKondisi = filterKondisi === 'Semua' || trx.kondisi === filterKondisi;
    const matchTanggal = !filterTanggal || trx.waktu.startsWith(filterTanggal);
    return matchSearch && matchKondisi && matchTanggal;
  });

  const totalHariIni = transaksiMasuk.filter((t) =>
    t.waktu.startsWith(new Date().toISOString().split('T')[0])
  ).length;

  return (
    <Layout title="Penerimaan Barang Masuk">
      <div className="flex flex-col gap-5">

        {/* Stat strip */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            <span>{totalHariIni} penerimaan hari ini</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-4 py-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            <span>{transaksiMasuk.length} total transaksi</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2.5 flex-1 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, TS Code, No. PO..."
                className="pl-9 bg-white h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Filter Kondisi */}
            <Select value={filterKondisi} onValueChange={setFilterKondisi}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KONDISI_OPTIONS.map((k) => (
                  <SelectItem key={k} value={k}>{k === 'Semua' ? 'Semua Kondisi' : k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Filter Tanggal */}
            <div className="relative w-full sm:w-auto">
              <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                className="pl-9 bg-white h-9 text-sm w-full sm:w-[160px]"
                value={filterTanggal}
                onChange={(e) => setFilterTanggal(e.target.value)}
              />
            </div>
            {/* Reset filter */}
            {(search || filterKondisi !== 'Semua' || filterTanggal) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground hover:text-slate-800 shrink-0"
                onClick={() => { setSearch(''); setFilterKondisi('Semua'); setFilterTanggal(''); }}
              >
                Reset
              </Button>
            )}
          </div>
          {/* Action buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              className="flex-1 sm:flex-none h-9"
              onClick={() => { resetForm(); setFormOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Input Penerimaan
            </Button>
          </div>
        </div>

        {/* Result count */}
        {(search || filterKondisi !== 'Semua' || filterTanggal) && (
          <p className="text-sm text-muted-foreground -mt-2">
            Menampilkan <strong>{filtered.length}</strong> dari {transaksiMasuk.length} transaksi
          </p>
        )}

        {/* Table — Mobile card */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FileX className="h-12 w-12 mb-3 text-slate-200" />
              <p className="font-medium text-slate-500">Tidak ada data</p>
              <p className="text-sm text-slate-400">Coba sesuaikan filter atau tambah penerimaan baru</p>
            </div>
          ) : filtered.map((trx, idx) => (
            <Card key={idx} className="p-4 border-slate-100 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="font-semibold text-sm text-slate-800 leading-snug flex-1">{trx.nama}</p>
                <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">+{trx.jumlah}</span>
              </div>
              <p className="text-xs font-mono text-slate-400 mb-2">{trx.tsCode}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{trx.waktu}</span>
                <span>·</span>
                <span>{trx.petugas}</span>
                {trx.noPo && <><span>·</span><span className="font-mono">{trx.noPo}</span></>}
                <Badge variant="outline" className={`text-xs px-1.5 py-0 ${kondisiBadge[trx.kondisi] || ''}`}>{trx.kondisi}</Badge>
              </div>
            </Card>
          ))}
        </div>

        {/* Table — Desktop */}
        <Card className="hidden md:block overflow-hidden border-slate-100 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-100">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-36">Waktu</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-28">TS Code</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Barang</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 text-right w-24">Jumlah</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-28">Kondisi</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-32">No. PO</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-32">Petugas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((trx, idx) => (
                    <TableRow key={idx} className="hover:bg-emerald-50/30 transition-colors border-b border-slate-50">
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{trx.waktu}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-600">{trx.tsCode}</TableCell>
                      <TableCell className="font-medium text-sm text-slate-800">{trx.nama}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-sm font-mono">+{trx.jumlah}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${kondisiBadge[trx.kondisi] || ''}`}>{trx.kondisi}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{trx.noPo || '—'}</TableCell>
                      <TableCell className="text-sm">{trx.petugas}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-56 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileX className="h-10 w-10 mb-2 text-slate-200" />
                        <p className="font-medium text-slate-500">Tidak ada data penerimaan</p>
                        <p className="text-sm text-slate-400">Klik "Input Penerimaan" untuk menambah data</p>
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
              <PackagePlus className="h-5 w-5 text-emerald-600" />
              Input Penerimaan Barang
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Cari barang */}
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
                        <button key={item.tsCode} className="w-full px-4 py-2.5 hover:bg-slate-50 flex justify-between items-center border-b last:border-0 text-left"
                          onMouseDown={() => handleSelectItem(item)}>
                          <div>
                            <p className="font-medium text-sm">{item.nama}</p>
                            <p className="text-xs font-mono text-slate-400">{item.tsCode} · {item.kategori}</p>
                          </div>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-semibold shrink-0 ml-3">Stok: {item.stok}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{selectedItem.nama}</p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{selectedItem.tsCode} · Stok: {selectedItem.stok} {selectedItem.uom}</p>
                  </div>
                  <button className="text-xs text-slate-400 hover:text-red-500 shrink-0 transition-colors" onClick={() => setSelectedItem(null)}>Ganti</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Jumlah Masuk <span className="text-red-500">*</span></Label>
                <div className="flex gap-2 items-center">
                  <Input type="number" min="1" placeholder="0" value={formData.jumlah}
                    onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                    className="font-bold text-base" />
                  <span className="text-sm text-muted-foreground shrink-0 w-12">{selectedItem?.uom || '—'}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Kondisi</Label>
                <Select value={formData.kondisi} onValueChange={(v) => setFormData({ ...formData, kondisi: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baik Baru">Baik (Baru)</SelectItem>
                    <SelectItem value="Baik Bekas">Baik (Bekas)</SelectItem>
                    <SelectItem value="Rusak">Rusak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />Tanggal Terima
                </Label>
                <Input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />No. PO / Referensi
                </Label>
                <Input placeholder="PO-2025-001" value={formData.noPo} onChange={(e) => setFormData({ ...formData, noPo: e.target.value })} />
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
            <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>Batal</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSimpan}
              disabled={!selectedItem || !formData.jumlah || parseInt(formData.jumlah) <= 0}>
              Simpan Penerimaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-600" />Scan QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-3">
            <div className="w-full aspect-square max-w-[220px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center gap-3">
              <QrCode className="h-12 w-12 text-slate-300" />
              <p className="text-xs text-slate-400 text-center px-4">Arahkan kamera ke QR Code pada barang</p>
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { toast.info('Fitur kamera segera hadir'); setQrOpen(false); }}>
              <Camera className="w-4 h-4 mr-2" />Aktifkan Kamera
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating QR */}
      <button onClick={() => setQrOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-13 h-13 w-[52px] h-[52px] bg-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        title="Scan QR">
        <QrCode className="w-5 h-5" />
      </button>
    </Layout>
  );
}
