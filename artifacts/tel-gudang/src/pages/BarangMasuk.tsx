import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Search, Save, Camera, QrCode, Package, Clock, User } from 'lucide-react';
import { useAppContext, Item } from '@/context/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function BarangMasuk() {
  const { items, setItems, transaksiMasuk, setTransaksiMasuk, currentUser } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
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
  ).slice(0, 5);

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
      petugas: currentUser?.nama || 'Admin',
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
        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/80 border-b border-border pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Save className="h-5 w-5 text-primary" />
                Input Data Penerimaan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="manual" className="data-[state=active]:bg-primary data-[state=active]:text-white">Cari Manual</TabsTrigger>
                  <TabsTrigger value="qr" className="data-[state=active]:bg-primary data-[state=active]:text-white"><QrCode className="w-4 h-4 mr-2" />Scan QR</TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual" className="space-y-6">
                  <div className="relative">
                    <Label htmlFor="search">Pencarian Barang</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="search" placeholder="Ketik nama barang atau TS Code..." className="pl-10" value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)} />
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                        <ul className="py-1">
                          {suggestions.map((item) => (
                            <li key={item.tsCode} className="px-4 py-2 hover:bg-slate-100 cursor-pointer flex justify-between items-center border-b last:border-0" onClick={() => handleSelectItem(item)}>
                              <div><p className="font-medium text-sm text-slate-800">{item.nama}</p><p className="text-xs font-mono text-muted-foreground">{item.tsCode} • {item.kategori}</p></div>
                              <div className="text-xs bg-slate-100 px-2 py-1 rounded font-semibold">Stok: {item.stok}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {selectedItem && (
                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg flex flex-col gap-1">
                      <p className="text-xs font-bold text-blue-600 uppercase">Barang Terpilih</p>
                      <p className="font-semibold text-lg">{selectedItem.nama}</p>
                      <div className="flex flex-wrap gap-2 text-sm mt-2 font-mono">
                        <span className="bg-white px-2 py-1 border rounded shadow-sm">TS: {selectedItem.tsCode}</span>
                        <span className="bg-white px-2 py-1 border rounded shadow-sm">Kategori: {selectedItem.kategori}</span>
                        <span className="bg-white px-2 py-1 border rounded shadow-sm">Stok: {selectedItem.stok} {selectedItem.uom}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jumlah">Jumlah Masuk <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-2">
                        <Input id="jumlah" type="number" min="1" placeholder="0" value={formData.jumlah} onChange={(e) => setFormData({...formData, jumlah: e.target.value})} className="font-bold text-lg" />
                        <span className="text-sm font-medium text-muted-foreground w-12">{selectedItem?.uom || '-'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Kondisi Barang</Label>
                      <Select value={formData.kondisi} onValueChange={(val) => setFormData({...formData, kondisi: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Baik Baru">Baik (Baru)</SelectItem>
                          <SelectItem value="Baik Bekas">Baik (Bekas)</SelectItem>
                          <SelectItem value="Rusak">Rusak</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tanggal">Tanggal Terima</Label>
                      <Input id="tanggal" type="date" value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="noPo">No. PO / Referensi</Label>
                      <Input id="noPo" placeholder="Contoh: PO-2025-001" value={formData.noPo} onChange={(e) => setFormData({...formData, noPo: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keterangan">Keterangan Tambahan</Label>
                    <Textarea id="keterangan" placeholder="Catatan..." value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} className="resize-none h-20" />
                  </div>

                  <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-base" onClick={handleSimpan} disabled={!selectedItem || !formData.jumlah}>
                    Simpan Penerimaan
                  </Button>
                </TabsContent>

                <TabsContent value="qr">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center p-12 h-64 text-center">
                    <div className="w-20 h-20 bg-white border shadow-sm rounded-full flex items-center justify-center mb-4">
                      <QrCode className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-lg text-slate-700">Arahkan QR Code ke Kamera</h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-xs">Pindai label QR pada barang atau rak untuk mengisi data otomatis.</p>
                    <Button onClick={() => toast.info('Fitur kamera segera hadir')} variant="outline" className="border-primary text-primary hover:bg-primary/5">
                      <Camera className="w-4 h-4 mr-2" /> Aktifkan Kamera
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Riwayat Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="bg-slate-50/80 border-b pb-4">
              <CardTitle className="text-lg">Riwayat Hari Ini</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {transaksiMasuk.length > 0 ? (
                <div className="divide-y">
                  {transaksiMasuk.slice(0, 5).map((trx, idx) => (
                    <div key={idx} className="p-4 hover:bg-slate-50">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-slate-800 line-clamp-1">{trx.nama}</span>
                        <span className="font-mono text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">+{trx.jumlah}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>{trx.tsCode}</span>
                        <span>{trx.waktu.split(' ')[1]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <Package className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm">Belum ada penerimaan hari ini.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Riwayat Tabel */}
      <Card className="mt-6 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Daftar Penerimaan Terakhir</CardTitle>
        </CardHeader>

        {/* MOBILE: Card View */}
        <div className="md:hidden divide-y">
          {transaksiMasuk.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Tidak ada data transaksi masuk.</div>
          ) : transaksiMasuk.map((trx, idx) => (
            <div key={idx} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-sm text-slate-800 leading-tight">{trx.nama}</p>
                <span className="font-mono text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded shrink-0">+{trx.jumlah}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground mb-2">{trx.tsCode}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{trx.waktu}</span>
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{trx.petugas}</span>
                {trx.noPo && <span>PO: {trx.noPo}</span>}
                <span>{trx.kondisi}</span>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP: Table View */}
        <div className="overflow-x-auto hidden md:block">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>TS Code</TableHead>
                <TableHead>Nama Barang</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>No. PO</TableHead>
                <TableHead>Petugas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaksiMasuk.length > 0 ? (
                transaksiMasuk.map((trx, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="whitespace-nowrap">{trx.waktu}</TableCell>
                    <TableCell className="font-mono text-sm">{trx.tsCode}</TableCell>
                    <TableCell className="font-medium">{trx.nama}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">+{trx.jumlah}</TableCell>
                    <TableCell>{trx.kondisi}</TableCell>
                    <TableCell className="font-mono text-sm">{trx.noPo || '-'}</TableCell>
                    <TableCell>{trx.petugas}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Tidak ada data transaksi masuk.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </Layout>
  );
}
