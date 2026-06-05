import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAppContext, Item } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Plus, Eye, Pencil, QrCode, FileX } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

export default function MasterBarang() {
  const { items, setItems } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Form states for Add/Edit
  const [formData, setFormData] = useState<Partial<Item>>({});

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.tsCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Semua' || item.kategori === categoryFilter;
    const matchesStatus = statusFilter === 'Semua' || item.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenEdit = (item: Item) => {
    setSelectedItem(item);
    setFormData(item);
    setEditModalOpen(true);
  };

  const handleOpenAdd = () => {
    setFormData({
      tsCode: '', msCode: '', nama: '', kategori: 'Consumables', binLoc: '', uom: 'EA', stok: 0, safetyStok: 5, status: 'Normal'
    });
    setAddModalOpen(true);
  };

  const handleSaveEdit = () => {
    setItems(items.map(item => item.tsCode === formData.tsCode ? formData as Item : item));
    setEditModalOpen(false);
    toast.success('Data barang berhasil diperbarui');
  };

  const handleSaveAdd = () => {
    if (!formData.tsCode || !formData.nama) {
      toast.error('TS Code dan Nama Barang wajib diisi');
      return;
    }
    const newItem = { ...formData } as Item;
    newItem.status = newItem.stok === 0 ? 'Habis' : (newItem.stok <= newItem.safetyStok ? 'Menipis' : 'Normal');
    setItems([newItem, ...items]);
    setAddModalOpen(false);
    toast.success('Barang baru berhasil ditambahkan');
  };

  return (
    <Layout title="Master Data Barang">
      <div className="flex flex-col gap-6">
        
        {/* Actions & Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari nama barang atau TS Code..." 
                className="pl-9 w-full bg-white" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Kategori</SelectItem>
                <SelectItem value="Civil">Civil</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
                <SelectItem value="Mechanical">Mechanical</SelectItem>
                <SelectItem value="Furniture">Furniture</SelectItem>
                <SelectItem value="Consumables">Consumables</SelectItem>
                <SelectItem value="GH Consumable">GH Consumable</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Status</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Menipis">Menipis</SelectItem>
                <SelectItem value="Habis">Habis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 shrink-0">
            <Plus className="mr-2 h-4 w-4" /> Tambah Barang Baru
          </Button>
        </div>

        {/* Data Table */}
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="w-[100px]">TS Code</TableHead>
                  <TableHead className="min-w-[250px]">Nama Barang</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>BIN LOC</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Safety Stok</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileX className="h-12 w-12 mb-2 text-slate-300" />
                        <p className="text-lg font-medium text-slate-500">Tidak ada data ditemukan</p>
                        <p className="text-sm">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow 
                      key={item.tsCode} 
                      className={item.stok === 0 ? 'bg-red-50/50 hover:bg-red-50' : (item.stok <= item.safetyStok ? 'bg-amber-50/50 hover:bg-amber-50' : '')}
                    >
                      <TableCell className="font-mono font-medium text-slate-600">{item.tsCode}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{item.nama}</TableCell>
                      <TableCell>{item.kategori}</TableCell>
                      <TableCell className="font-mono text-sm">{item.binLoc}</TableCell>
                      <TableCell>{item.uom}</TableCell>
                      <TableCell className={`text-right font-bold ${item.stok === 0 ? 'text-red-600' : (item.stok <= item.safetyStok ? 'text-amber-600' : '')}`}>
                        {item.stok}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.safetyStok}</TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => { setSelectedItem(item); setDetailModalOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => handleOpenEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-100" onClick={() => { setSelectedItem(item); setQrModalOpen(true); }}>
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Modals */}
      {/* 1. Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl border-b pb-4">Detail Barang: {selectedItem?.tsCode}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Nama Barang</h4>
                  <p className="font-medium">{selectedItem.nama}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Status</h4>
                  <StatusBadge status={selectedItem.status} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Kategori</h4>
                  <p>{selectedItem.kategori}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Lokasi Penyimpanan</h4>
                  <p className="font-mono text-sm">{selectedItem.binLoc || '-'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Stok Saat Ini</h4>
                  <p className="text-2xl font-bold">{selectedItem.stok} <span className="text-sm font-normal text-muted-foreground">{selectedItem.uom}</span></p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Batas Aman (Safety Stok)</h4>
                  <p className="text-xl font-semibold text-slate-600">{selectedItem.safetyStok}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-bold border-b pb-2 mb-3">Riwayat Transaksi Terakhir</h4>
                <div className="bg-slate-50 rounded-md border text-sm">
                  <table className="w-full">
                    <thead className="bg-slate-100 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Tanggal</th>
                        <th className="px-3 py-2 text-left font-medium">Jenis</th>
                        <th className="px-3 py-2 text-right font-medium">Jumlah</th>
                        <th className="px-3 py-2 text-left font-medium">Petugas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-3 py-2">2025-01-14 10:30</td>
                        <td className="px-3 py-2 text-green-600 font-medium">Masuk</td>
                        <td className="px-3 py-2 text-right">+20</td>
                        <td className="px-3 py-2">Budi Santoso</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">2025-01-10 14:15</td>
                        <td className="px-3 py-2 text-orange-600 font-medium">Keluar</td>
                        <td className="px-3 py-2 text-right">-5</td>
                        <td className="px-3 py-2">Andi Rahman</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">2025-01-05 09:00</td>
                        <td className="px-3 py-2 text-orange-600 font-medium">Keluar</td>
                        <td className="px-3 py-2 text-right">-12</td>
                        <td className="px-3 py-2">Siti Rahayu</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md text-center flex flex-col items-center p-8">
          <DialogHeader>
            <DialogTitle className="text-xl mb-4">Label QR Code</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="bg-white p-6 border rounded-xl shadow-sm mb-6 flex flex-col items-center w-full max-w-[280px]">
              <QRCodeSVG value={selectedItem.tsCode} size={200} />
              <div className="mt-6 w-full text-left space-y-1">
                <p className="font-mono font-bold text-lg text-center tracking-widest">{selectedItem.tsCode}</p>
                <p className="text-sm font-semibold truncate text-center" title={selectedItem.nama}>{selectedItem.nama}</p>
                <div className="flex justify-between border-t mt-3 pt-3 text-sm">
                  <span className="text-muted-foreground">Lokasi:</span>
                  <span className="font-mono font-medium">{selectedItem.binLoc}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="w-full flex-row gap-2 justify-center sm:justify-center">
            <Button variant="outline" onClick={() => setQrModalOpen(false)}>Batal</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => { toast.success('Mencetak label...'); setQrModalOpen(false); }}>
              Cetak Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Add/Edit Modal */}
      <Dialog open={addModalOpen || editModalOpen} onOpenChange={(open) => {
        if (!open) {
          setAddModalOpen(false);
          setEditModalOpen(false);
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editModalOpen ? 'Edit Data Barang' : 'Tambah Barang Baru'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tsCode">TS Code <span className="text-red-500">*</span></Label>
                <Input id="tsCode" value={formData.tsCode || ''} onChange={(e) => setFormData({...formData, tsCode: e.target.value})} disabled={editModalOpen} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="msCode">MS Code</Label>
                <Input id="msCode" value={formData.msCode || ''} onChange={(e) => setFormData({...formData, msCode: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Barang <span className="text-red-500">*</span></Label>
              <Input id="nama" value={formData.nama || ''} onChange={(e) => setFormData({...formData, nama: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kategori">Kategori</Label>
                <Select value={formData.kategori} onValueChange={(val: any) => setFormData({...formData, kategori: val})}>
                  <SelectTrigger id="kategori">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Civil">Civil</SelectItem>
                    <SelectItem value="Electrical">Electrical</SelectItem>
                    <SelectItem value="Mechanical">Mechanical</SelectItem>
                    <SelectItem value="Furniture">Furniture</SelectItem>
                    <SelectItem value="Consumables">Consumables</SelectItem>
                    <SelectItem value="GH Consumable">GH Consumable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="binLoc">BIN LOC (Lokasi)</Label>
                <Input id="binLoc" value={formData.binLoc || ''} onChange={(e) => setFormData({...formData, binLoc: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="uom">Satuan (UOM)</Label>
                <Input id="uom" value={formData.uom || ''} onChange={(e) => setFormData({...formData, uom: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stok">Stok Awal</Label>
                <Input id="stok" type="number" min="0" value={formData.stok !== undefined ? formData.stok : ''} onChange={(e) => setFormData({...formData, stok: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="safetyStok">Safety Stok</Label>
                <Input id="safetyStok" type="number" min="0" value={formData.safetyStok !== undefined ? formData.safetyStok : ''} onChange={(e) => setFormData({...formData, safetyStok: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }}>Batal</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={editModalOpen ? handleSaveEdit : handleSaveAdd}>
              Simpan Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </Layout>
  );
}