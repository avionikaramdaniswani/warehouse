import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Save, Camera, QrCode, Package, Clock, User, PackagePlus, CalendarDays, FileText } from 'lucide-react';
import { useAppContext, Item } from '@/context/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function BarangMasuk() {
  const { items, setItems, transaksiMasuk, setTransaksiMasuk, currentUser } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);

  const [formData, setFormData] = useState({
    jumlah: '',
    kondisi: 'Baik Baru',
    tanggal: new Date().toISOString().split('T')[0],
    noPo: '',
    keterangan: ''
  });

  const suggestions = items.filter(item =>
    searchTerm.length > 1 &&
    (item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tsCode.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 6);

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const handleSimpan = () => {
    if (!selectedItem || !formData.jumlah || parseInt(formData.jumlah) <= 0) {
      toast.error('Pilih barang dan masukkan jumlah yang valid');
      return;
    }
    const jumlah = parseInt(formData.jumlah);
    const updatedItems = items.map(item => {
      if (item.tsCode === selectedItem.tsCode) {
        const newStok = item.stok + jumlah;
        return { ...item, stok: newStok, status: newStok <= item.safetyStok ? (newStok === 0 ? 'Habis' : 'Menipis') : 'Normal' };
      }
      return item;
    });
    setItems(updatedItems);
    const newTransaction = {
      id: `TRIN-${Date.now()}`,
      waktu: `${formData.tanggal} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      tsCode: selectedItem.tsCode,
      nama: selectedItem.nama,
      jumlah,
      petugas: currentUser?.namaLengkap || 'Admin',
      kondisi: formData.kondisi,
      noPo: formData.noPo
    };
    setTransaksiMasuk([newTransaction, ...transaksiMasuk]);
    toast.success('Penerimaan barang berhasil disimpan');
    setSelectedItem(null);
    setFormData({ ...formData, jumlah: '', noPo: '', keterangan: '' });
  };

  return (
    <Layout title="Penerimaan Barang Masuk">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Search barang */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Cari Barang
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ketik nama barang atau TS Code..."
                    className="pl-10 h-11"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  />
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                    {suggestions.map((item) => (
                      <button
                        key={item.tsCode}
                        className="w-full px-4 py-3 hover:bg-slate-50 flex justify-between items-center border-b last:border-0 text-left transition-colors"
                        onMouseDown={() => handleSelectItem(item)}
                      >
                        <div>
                          <p className="font-medium text-sm text-slate-800">{item.nama}</p>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">{item.tsCode} · {item.kategori}</p>
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold shrink-0 ml-3">
                          Stok: {item.stok}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedItem && (
                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Barang Terpilih</p>
                  <p className="font-semibold text-slate-800 text-base">{selectedItem.nama}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs font-mono bg-white border border-emerald-200 text-emerald-800 px-2 py-1 rounded">{selectedItem.tsCode}</span>
                    <span className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded">{selectedItem.kategori}</span>
                    <span className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded">Stok: {selectedItem.stok} {selectedItem.uom}</span>
                    <button
                      className="text-xs text-slate-400 hover:text-red-500 ml-auto transition-colors"
                      onClick={() => setSelectedItem(null)}
                    >
                      Ganti barang
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Input */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <PackagePlus className="h-4 w-4 text-primary" />
                Detail Penerimaan
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="jumlah" className="text-sm font-medium">
                    Jumlah Masuk <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="jumlah"
                      type="number"
                      min="1"
                      placeholder="0"
                      value={formData.jumlah}
                      onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                      className="font-bold text-lg h-11"
                    />
                    <span className="text-sm font-medium text-muted-foreground w-14 shrink-0">
                      {selectedItem?.uom || 'satuan'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Kondisi Barang</Label>
                  <Select value={formData.kondisi} onValueChange={(val) => setFormData({ ...formData, kondisi: val })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baik Baru">Baik (Baru)</SelectItem>
                      <SelectItem value="Baik Bekas">Baik (Bekas)</SelectItem>
                      <SelectItem value="Rusak">Rusak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tanggal" className="text-sm font-medium flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> Tanggal Terima
                  </Label>
                  <Input
                    id="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="noPo" className="text-sm font-medium flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> No. PO / Referensi
                  </Label>
                  <Input
                    id="noPo"
                    placeholder="PO-2025-001"
                    value={formData.noPo}
                    onChange={(e) => setFormData({ ...formData, noPo: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="keterangan" className="text-sm font-medium">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  placeholder="Catatan tambahan..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="resize-none h-20"
                />
              </div>

              <Button
                className="w-full h-12 text-base font-semibold mt-2"
                onClick={handleSimpan}
                disabled={!selectedItem || !formData.jumlah || parseInt(formData.jumlah) <= 0}
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan Penerimaan
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Riwayat */}
        <div className="lg:col-span-1">
          <Card className="h-full shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <CardTitle className="text-base font-semibold text-slate-700">Riwayat Hari Ini</CardTitle>
              {transaksiMasuk.length > 0 && (
                <p className="text-xs text-muted-foreground">{transaksiMasuk.length} transaksi</p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {transaksiMasuk.length > 0 ? (
                <div className="divide-y max-h-[480px] overflow-y-auto">
                  {transaksiMasuk.slice(0, 8).map((trx, idx) => (
                    <div key={idx} className="px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-800 line-clamp-1 flex-1">{trx.nama}</span>
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">+{trx.jumlah}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="font-mono">{trx.tsCode}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {trx.waktu.split(' ')[1]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center text-muted-foreground flex flex-col items-center">
                  <Package className="h-10 w-10 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-500">Belum ada penerimaan</p>
                  <p className="text-xs text-slate-400 mt-1">Data akan muncul setelah simpan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabel Riwayat */}
      <Card className="mt-6 shadow-sm">
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-700">Daftar Penerimaan</CardTitle>
            {transaksiMasuk.length > 0 && (
              <Badge variant="secondary">{transaksiMasuk.length} data</Badge>
            )}
          </div>
        </CardHeader>

        {/* Mobile */}
        <div className="md:hidden divide-y">
          {transaksiMasuk.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Belum ada data.</div>
          ) : transaksiMasuk.map((trx, idx) => (
            <div key={idx} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-sm text-slate-800 leading-tight">{trx.nama}</p>
                <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">+{trx.jumlah}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground mb-2">{trx.tsCode}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{trx.waktu}</span>
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{trx.petugas}</span>
                {trx.noPo && <span>PO: {trx.noPo}</span>}
                <Badge variant="outline" className="text-xs">{trx.kondisi}</Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="overflow-x-auto hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Waktu</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wide">TS Code</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nama Barang</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wide text-right">Jumlah</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Kondisi</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wide">No. PO</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Petugas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaksiMasuk.length > 0 ? (
                transaksiMasuk.map((trx, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50/50">
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{trx.waktu}</TableCell>
                    <TableCell className="font-mono text-sm">{trx.tsCode}</TableCell>
                    <TableCell className="font-medium text-sm">{trx.nama}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-700">+{trx.jumlah}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{trx.kondisi}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{trx.noPo || '—'}</TableCell>
                    <TableCell className="text-sm">{trx.petugas}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-muted-foreground text-sm">
                    Belum ada data penerimaan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Floating QR Button */}
      <button
        onClick={() => setShowQrDialog(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
        title="Scan QR Code"
      >
        <QrCode className="w-6 h-6" />
      </button>

      {/* QR Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Scan QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-full aspect-square max-w-[240px] border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 bg-white border shadow-sm rounded-full flex items-center justify-center">
                <QrCode className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 text-center px-4">
                Arahkan kamera ke QR Code pada barang atau rak
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => { toast.info('Fitur kamera segera hadir'); setShowQrDialog(false); }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Aktifkan Kamera
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
