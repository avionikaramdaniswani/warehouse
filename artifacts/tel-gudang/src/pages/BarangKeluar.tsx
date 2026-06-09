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
import { Search, Send, Camera, QrCode, PackageMinus, Clock, User, CalendarDays, MapPin, AlertTriangle } from 'lucide-react';
import { useAppContext, Item } from '@/context/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function BarangKeluar() {
  const { items, setItems, transaksiKeluar, setTransaksiKeluar, currentUser } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);

  const [formData, setFormData] = useState({
    jumlah: '',
    tujuan: '',
    tanggal: new Date().toISOString().split('T')[0],
    keperluan: 'Perbaikan',
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

  const jumlahInt = parseInt(formData.jumlah) || 0;
  const isOverStok = selectedItem ? jumlahInt > selectedItem.stok : false;

  const handleSimpan = () => {
    if (!selectedItem || !formData.jumlah || jumlahInt <= 0) {
      toast.error('Pilih barang dan masukkan jumlah yang valid');
      return;
    }
    if (jumlahInt > selectedItem.stok) {
      toast.error(`Stok tidak mencukupi! Stok tersedia: ${selectedItem.stok}`);
      return;
    }
    const updatedItems = items.map(item => {
      if (item.tsCode === selectedItem.tsCode) {
        const newStok = item.stok - jumlahInt;
        return { ...item, stok: newStok, status: newStok <= item.safetyStok ? (newStok === 0 ? 'Habis' : 'Menipis') : 'Normal' };
      }
      return item;
    });
    setItems(updatedItems);
    const newTransaction = {
      id: `TROUT-${Date.now()}`,
      waktu: `${formData.tanggal} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      tsCode: selectedItem.tsCode,
      nama: selectedItem.nama,
      jumlah: jumlahInt,
      petugas: currentUser?.namaLengkap || 'Admin',
      tujuan: formData.tujuan,
      keperluan: formData.keperluan
    };
    setTransaksiKeluar([newTransaction, ...transaksiKeluar]);
    toast.success('Pengeluaran barang berhasil disimpan');
    setSelectedItem(null);
    setFormData({ ...formData, jumlah: '', tujuan: '', keterangan: '' });
  };

  return (
    <Layout title="Pengeluaran Barang">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Search barang */}
          <Card className="shadow-sm border-orange-100">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Search className="h-4 w-4 text-orange-500" />
                Cari Barang
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ketik nama barang atau TS Code..."
                    className="pl-10 h-11 focus-visible:ring-orange-400"
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
                        disabled={item.stok === 0}
                        className={`w-full px-4 py-3 flex justify-between items-center border-b last:border-0 text-left transition-colors
                          ${item.stok === 0 ? 'bg-slate-50 opacity-50 cursor-not-allowed' : 'hover:bg-orange-50/50 cursor-pointer'}`}
                        onMouseDown={() => item.stok > 0 && handleSelectItem(item)}
                      >
                        <div>
                          <p className="font-medium text-sm text-slate-800">{item.nama}</p>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">{item.tsCode} · {item.kategori}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold shrink-0 ml-3 ${item.stok === 0 ? 'border-red-200 text-red-600 bg-red-50' : ''}`}
                        >
                          Stok: {item.stok}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedItem && (
                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Barang Terpilih</p>
                  <p className="font-semibold text-slate-800 text-base">{selectedItem.nama}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs font-mono bg-white border border-orange-200 text-orange-800 px-2 py-1 rounded">{selectedItem.tsCode}</span>
                    <span className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded">
                      Stok tersedia: <strong className="text-primary">{selectedItem.stok}</strong> {selectedItem.uom}
                    </span>
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
          <Card className="shadow-sm border-orange-100">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <PackageMinus className="h-4 w-4 text-orange-500" />
                Detail Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="jumlah" className="text-sm font-medium">
                    Jumlah Keluar <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="jumlah"
                      type="number"
                      min="1"
                      max={selectedItem?.stok}
                      placeholder="0"
                      value={formData.jumlah}
                      onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                      className={`font-bold text-lg h-11 ${isOverStok ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                    />
                    <span className="text-sm font-medium text-muted-foreground w-14 shrink-0">
                      {selectedItem?.uom || 'satuan'}
                    </span>
                  </div>
                  {isOverStok && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Melebihi stok tersedia!
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Keperluan</Label>
                  <Select value={formData.keperluan} onValueChange={(val) => setFormData({ ...formData, keperluan: val })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tanggal" className="text-sm font-medium flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> Tanggal Keluar
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
                  <Label htmlFor="tujuan" className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> Tujuan / Peminjam
                  </Label>
                  <Input
                    id="tujuan"
                    placeholder="Nama orang atau area proyek"
                    value={formData.tujuan}
                    onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
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
                className="w-full h-12 text-base font-semibold mt-2 bg-orange-500 hover:bg-orange-600"
                onClick={handleSimpan}
                disabled={!selectedItem || !formData.jumlah || jumlahInt <= 0 || isOverStok}
              >
                <Send className="w-4 h-4 mr-2" />
                Simpan Pengeluaran
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Riwayat */}
        <div className="lg:col-span-1">
          <Card className="h-full shadow-sm border-orange-100">
            <CardHeader className="pb-3 pt-5 px-5 border-b border-orange-100">
              <CardTitle className="text-base font-semibold text-slate-700">Riwayat Hari Ini</CardTitle>
              {transaksiKeluar.length > 0 && (
                <p className="text-xs text-muted-foreground">{transaksiKeluar.length} transaksi</p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {transaksiKeluar.length > 0 ? (
                <div className="divide-y divide-orange-50 max-h-[480px] overflow-y-auto">
                  {transaksiKeluar.slice(0, 8).map((trx, idx) => (
                    <div key={idx} className="px-5 py-3.5 hover:bg-orange-50/30 transition-colors">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-800 line-clamp-1 flex-1">{trx.nama}</span>
                        <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded shrink-0">-{trx.jumlah}</span>
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
                  <PackageMinus className="h-10 w-10 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-500">Belum ada pengeluaran</p>
                  <p className="text-xs text-slate-400 mt-1">Data akan muncul setelah simpan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabel Riwayat */}
      <Card className="mt-6 shadow-sm border-orange-100">
        <CardHeader className="border-b border-orange-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-700">Daftar Pengeluaran</CardTitle>
            {transaksiKeluar.length > 0 && (
              <Badge variant="secondary">{transaksiKeluar.length} data</Badge>
            )}
          </div>
        </CardHeader>

        {/* Mobile */}
        <div className="md:hidden divide-y">
          {transaksiKeluar.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Belum ada data.</div>
          ) : transaksiKeluar.map((trx, idx) => (
            <div key={idx} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-sm text-slate-800 leading-tight">{trx.nama}</p>
                <span className="font-mono text-sm font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded shrink-0">-{trx.jumlah}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground mb-2">{trx.tsCode}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{trx.waktu}</span>
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{trx.petugas}</span>
                {trx.tujuan && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{trx.tujuan}</span>}
                <Badge variant="outline" className="text-xs">{trx.keperluan}</Badge>
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
                <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tujuan</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Keperluan</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Petugas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaksiKeluar.length > 0 ? (
                transaksiKeluar.map((trx, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50/50">
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{trx.waktu}</TableCell>
                    <TableCell className="font-mono text-sm">{trx.tsCode}</TableCell>
                    <TableCell className="font-medium text-sm">{trx.nama}</TableCell>
                    <TableCell className="text-right font-bold text-orange-600">-{trx.jumlah}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{trx.tujuan || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{trx.keperluan}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{trx.petugas}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-muted-foreground text-sm">
                    Belum ada data pengeluaran.
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
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
        title="Scan QR Code"
      >
        <QrCode className="w-6 h-6" />
      </button>

      {/* QR Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-orange-500" />
              Scan QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-full aspect-square max-w-[240px] border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 bg-white border shadow-sm rounded-full flex items-center justify-center">
                <QrCode className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 text-center px-4">
                Arahkan kamera ke QR Code pada barang untuk mengisi data otomatis
              </p>
            </div>
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
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
