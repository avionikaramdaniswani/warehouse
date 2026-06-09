import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { useAppContext, Item } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Plus, Eye, Pencil, QrCode, FileX, MapPin, Tag, X } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

interface KategoriOption {
  id: number;
  nama: string;
}

function useKategoris(token: string | null) {
  const [kategoris, setKategoris] = useState<KategoriOption[]>([]);
  useEffect(() => {
    if (!token) return;
    fetch('/api/kategori', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setKategoris)
      .catch(() => {});
  }, [token]);
  return kategoris;
}

export default function MasterBarang() {
  const { items, setItems, token } = useAppContext();
  const kategoris = useKategoris(token);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [bottomSheetType, setBottomSheetType] = useState<'detail' | 'edit' | 'qr' | null>(null);
  const [formData, setFormData] = useState<Partial<Item>>({});

  const openMobileSheet = (item: Item, type: 'detail' | 'edit' | 'qr') => {
    setSelectedItem(item);
    if (type === 'edit') setFormData(item);
    setBottomSheetType(type);
  };

  const closeMobileSheet = () => setBottomSheetType(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    const defaultKat = kategoris[0]?.nama ?? '';
    setFormData({ tsCode: '', msCode: '', nama: '', kategori: defaultKat as any, binLoc: '', uom: 'EA', stok: 0, safetyStok: 5, status: 'Normal' });
    setAddModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!formData.tsCode) return;
    try {
      const res = await fetch(`/api/items/${formData.tsCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          msCode: formData.msCode,
          nama: formData.nama,
          kategori: formData.kategori,
          binLoc: formData.binLoc,
          uom: formData.uom,
          stok: formData.stok,
          safetyStok: formData.safetyStok,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message ?? 'Gagal menyimpan perubahan');
        return;
      }
      const updated = await res.json();
      const mapped: Item = {
        id: updated.id,
        tsCode: updated.tsCode ?? updated.ts_code,
        msCode: updated.msCode ?? updated.ms_code ?? '',
        nama: updated.nama,
        kategori: updated.kategori ?? '',
        binLoc: updated.binLoc ?? updated.bin_loc ?? '',
        uom: updated.uom ?? 'EA',
        stok: updated.stok,
        safetyStok: updated.safetyStok ?? updated.safety_stok ?? 5,
        status: updated.status ?? 'Normal',
      };
      setItems(items.map((item) => item.tsCode === mapped.tsCode ? mapped : item));
      setEditModalOpen(false);
      toast.success('Data barang berhasil diperbarui');
    } catch {
      toast.error('Gagal terhubung ke server');
    }
  };

  const handleSaveAdd = async () => {
    if (!formData.tsCode || !formData.nama) {
      toast.error('TS Code dan Nama Barang wajib diisi');
      return;
    }
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tsCode: formData.tsCode,
          msCode: formData.msCode,
          nama: formData.nama,
          kategori: formData.kategori,
          binLoc: formData.binLoc,
          uom: formData.uom ?? 'EA',
          stok: formData.stok ?? 0,
          safetyStok: formData.safetyStok ?? 5,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message ?? 'Gagal menambah barang');
        return;
      }
      const created = await res.json();
      const newItem: Item = {
        id: created.id,
        tsCode: created.tsCode ?? created.ts_code,
        msCode: created.msCode ?? created.ms_code ?? '',
        nama: created.nama,
        kategori: created.kategori ?? '',
        binLoc: created.binLoc ?? created.bin_loc ?? '',
        uom: created.uom ?? 'EA',
        stok: created.stok,
        safetyStok: created.safetyStok ?? created.safety_stok ?? 5,
        status: created.status ?? 'Normal',
      };
      setItems([newItem, ...items]);
      setAddModalOpen(false);
      toast.success('Barang baru berhasil ditambahkan');
    } catch {
      toast.error('Gagal terhubung ke server');
    }
  };

  const handlePrintLabel = (item: Item) => {
    const svgEl =
      (document.getElementById('qr-desktop-box') ?? document.getElementById('qr-mobile-box'))
        ?.querySelector('svg');
    let svgHtml = '';
    if (svgEl) {
      const clone = svgEl.cloneNode(true) as SVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgHtml = clone.outerHTML;
    }
    const win = window.open('', '_blank', 'width=520,height=620');
    if (!win) { toast.error('Popup diblokir — izinkan popup di browser lalu coba lagi'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>Label ${item.tsCode}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#fff;display:flex;justify-content:center;padding:10mm;font-family:'Courier New',Courier,monospace}
  .label{width:90mm;border:1.5px solid #333;padding:5mm}
  .hdr{text-align:center;border-bottom:1px solid #999;padding-bottom:2.5mm;margin-bottom:2.5mm}
  .co{font-size:6.5pt;font-weight:bold;letter-spacing:.5px}
  .sub{font-size:5.5pt;color:#555;margin-top:.5mm}
  .qr{text-align:center;margin:2.5mm 0}
  .qr svg{width:48mm!important;height:48mm!important;display:inline-block}
  .ts{text-align:center;font-size:15pt;font-weight:bold;letter-spacing:3px;margin:1.5mm 0 1mm}
  .nama{text-align:center;font-size:6.5pt;font-weight:bold;margin:0 3mm 2mm;line-height:1.4;word-wrap:break-word}
  .divider{border-top:1px dashed #bbb;margin:2mm 0}
  .row{display:flex;justify-content:space-between;font-size:6.5pt;padding:.6mm 0}
  .val{font-weight:bold}
  @media print{body{padding:2mm}@page{margin:0}}
</style>
</head><body>
<div class="label">
  <div class="hdr">
    <div class="co">PT TANJUNGENIM LESTARI PULP & PAPER</div>
    <div class="sub">TOWNSITE WAREHOUSE — MATERIALS MANAGEMENT</div>
  </div>
  <div class="qr">${svgHtml}</div>
  <div class="ts">${item.tsCode}</div>
  <div class="nama">${item.nama}</div>
  <div class="divider"></div>
  <div class="row"><span>Kategori</span><span class="val">${item.kategori || '—'}</span></div>
  <div class="row"><span>BIN LOC</span><span class="val">${item.binLoc || '—'}</span></div>
  <div class="row"><span>Satuan (UOM)</span><span class="val">${item.uom || '—'}</span></div>
</div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close();},1500);}</script>
</body></html>`);
    win.document.close();
  };

  const stockColor = (item: Item) =>
    item.stok === 0 ? 'text-red-600' : item.stok <= item.safetyStok ? 'text-amber-600' : 'text-foreground';

  const cardBg = (item: Item) =>
    item.stok === 0
      ? 'border-red-200 bg-red-50/40'
      : item.stok <= item.safetyStok
      ? 'border-amber-200 bg-amber-50/40'
      : '';

  const KategoriSelect = ({ value, onValueChange, className }: { value?: string; onValueChange: (v: string) => void; className?: string }) => (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
      <SelectContent>
        {kategoris.length === 0 ? (
          <SelectItem value="__none__" disabled>Belum ada kategori</SelectItem>
        ) : (
          kategoris.map((k) => (
            <SelectItem key={k.id} value={k.nama}>{k.nama}</SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );

  return (
    <Layout title="Master Data Barang">
      <div className="flex flex-col gap-4">

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
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
              <SelectTrigger className="w-full sm:w-[180px] bg-white"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Kategori</SelectItem>
                {kategoris.map((k) => (
                  <SelectItem key={k.id} value={k.nama}>{k.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Status</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Menipis">Menipis</SelectItem>
                <SelectItem value="Habis">Habis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 w-full sm:w-auto shrink-0">
            <Plus className="mr-2 h-4 w-4" /> Tambah Barang Baru
          </Button>
        </div>

        {/* MOBILE: Card View */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-3 w-1/3" /></CardContent></Card>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileX className="h-12 w-12 mb-2 text-slate-300" />
              <p className="font-medium text-slate-500">Tidak ada data ditemukan</p>
              <p className="text-sm">Coba sesuaikan filter pencarian.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <Card key={item.tsCode} className={`border shadow-sm ${cardBg(item)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 leading-tight">{item.nama}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">{item.tsCode}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{item.kategori}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.binLoc || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-sm">
                      <span>Stok: <strong className={stockColor(item)}>{item.stok}</strong> <span className="text-muted-foreground text-xs">{item.uom}</span></span>
                      <span className="text-muted-foreground">Min: {item.safetyStok}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => openMobileSheet(item, 'detail')}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => openMobileSheet(item, 'edit')}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100" onClick={() => openMobileSheet(item, 'qr')}><QrCode className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* DESKTOP: Table View */}
        <Card className="overflow-hidden border-border shadow-sm hidden md:block">
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
                      {Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
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
                      className={item.stok === 0 ? 'bg-red-50/50 hover:bg-red-50' : item.stok <= item.safetyStok ? 'bg-amber-50/50 hover:bg-amber-50' : ''}
                    >
                      <TableCell className="font-mono font-medium text-slate-600">{item.tsCode}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{item.nama}</TableCell>
                      <TableCell>{item.kategori}</TableCell>
                      <TableCell className="font-mono text-sm">{item.binLoc}</TableCell>
                      <TableCell>{item.uom}</TableCell>
                      <TableCell className={`text-right font-bold ${stockColor(item)}`}>{item.stok}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.safetyStok}</TableCell>
                      <TableCell className="text-center"><StatusBadge status={item.status} /></TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => { setSelectedItem(item); setDetailModalOpen(true); }}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => handleOpenEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-100" onClick={() => { setSelectedItem(item); setQrModalOpen(true); }}><QrCode className="h-4 w-4" /></Button>
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

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl border-b pb-4">Detail Barang: {selectedItem?.tsCode}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-5 py-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Nama Barang</h4>
                  <p className="font-semibold text-base leading-snug">{selectedItem.nama}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">TS Code</h4>
                  <p className="font-mono font-medium">{selectedItem.tsCode}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">MS Code</h4>
                  <p className="font-mono font-medium">{selectedItem.msCode || <span className="text-muted-foreground italic">—</span>}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Kategori</h4>
                  <p>{selectedItem.kategori || '-'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Satuan (UOM)</h4>
                  <p>{selectedItem.uom}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lokasi Penyimpanan</h4>
                  <p className="font-mono text-sm">{selectedItem.binLoc || '-'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Status</h4>
                  <StatusBadge status={selectedItem.status} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Stok Saat Ini</h4>
                  <p className="text-2xl font-bold">{selectedItem.stok} <span className="text-sm font-normal text-muted-foreground">{selectedItem.uom}</span></p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Batas Aman (Safety Stok)</h4>
                  <p className="text-xl font-semibold text-slate-600">{selectedItem.safetyStok} <span className="text-sm font-normal text-muted-foreground">{selectedItem.uom}</span></p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2 mb-3">Riwayat Transaksi Terakhir</h4>
                <p className="text-sm text-muted-foreground text-center py-4 bg-slate-50 rounded-md border">Belum ada transaksi untuk barang ini.</p>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDetailModalOpen(false)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md text-center flex flex-col items-center p-8">
          <DialogHeader><DialogTitle className="text-xl mb-4">Label QR Code</DialogTitle></DialogHeader>
          {selectedItem && (
            <div id="qr-desktop-box" className="bg-white p-6 border rounded-xl shadow-sm mb-4 flex flex-col items-center w-full max-w-[280px]">
              <QRCodeSVG value={selectedItem.tsCode} size={200} />
              <div className="mt-5 w-full text-left space-y-1">
                <p className="font-mono font-bold text-lg text-center tracking-widest">{selectedItem.tsCode}</p>
                <p className="text-sm font-semibold truncate text-center" title={selectedItem.nama}>{selectedItem.nama}</p>
                <div className="flex justify-between border-t mt-3 pt-3 text-sm"><span className="text-muted-foreground">Lokasi:</span><span className="font-mono font-medium">{selectedItem.binLoc || '—'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Kategori:</span><span className="font-mono font-medium">{selectedItem.kategori}</span></div>
              </div>
            </div>
          )}
          <p className="text-xs text-slate-400 -mt-2 mb-2 text-center">Klik "Cetak Label" untuk membuka dialog cetak browser</p>
          <DialogFooter className="w-full flex-row gap-2 justify-center sm:justify-center">
            <Button variant="outline" onClick={() => setQrModalOpen(false)}>Batal</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => { if (selectedItem) handlePrintLabel(selectedItem); }}>
              Cetak Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Modal */}
      <Dialog open={addModalOpen || editModalOpen} onOpenChange={(open) => { if (!open) { setAddModalOpen(false); setEditModalOpen(false); } }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>{editModalOpen ? 'Edit Data Barang' : 'Tambah Barang Baru'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="tsCode">TS Code <span className="text-red-500">*</span></Label><Input id="tsCode" value={formData.tsCode || ''} onChange={(e) => setFormData({ ...formData, tsCode: e.target.value })} disabled={editModalOpen} /></div>
              <div className="space-y-2"><Label htmlFor="msCode">MS Code</Label><Input id="msCode" value={formData.msCode || ''} onChange={(e) => setFormData({ ...formData, msCode: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="nama">Nama Barang <span className="text-red-500">*</span></Label><Input id="nama" value={formData.nama || ''} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <KategoriSelect value={formData.kategori as string} onValueChange={(val) => setFormData({ ...formData, kategori: val as any })} />
              </div>
              <div className="space-y-2"><Label htmlFor="binLoc">BIN LOC (Lokasi)</Label><Input id="binLoc" value={formData.binLoc || ''} onChange={(e) => setFormData({ ...formData, binLoc: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label htmlFor="uom">Satuan (UOM)</Label><Input id="uom" value={formData.uom || ''} onChange={(e) => setFormData({ ...formData, uom: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="stok">Stok Awal</Label><Input id="stok" type="number" min="0" value={formData.stok !== undefined ? formData.stok : ''} onChange={(e) => setFormData({ ...formData, stok: parseInt(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label htmlFor="safetyStok">Safety Stok</Label><Input id="safetyStok" type="number" min="0" value={formData.safetyStok !== undefined ? formData.safetyStok : ''} onChange={(e) => setFormData({ ...formData, safetyStok: parseInt(e.target.value) || 0 })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }}>Batal</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={editModalOpen ? handleSaveEdit : handleSaveAdd}>Simpan Data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MOBILE: Bottom Sheets */}
      {bottomSheetType !== null && selectedItem && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeMobileSheet} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-0 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
              <div>
                <p className="font-bold text-base text-slate-800 leading-tight">
                  {bottomSheetType === 'detail' && 'Detail Barang'}
                  {bottomSheetType === 'edit' && 'Edit Data Barang'}
                  {bottomSheetType === 'qr' && 'Label QR Code'}
                </p>
                <p className="text-xs font-mono text-slate-400 mt-0.5">{selectedItem.tsCode}</p>
              </div>
              <button onClick={closeMobileSheet} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* DETAIL */}
              {bottomSheetType === 'detail' && (
                <div className="px-5 py-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-800 text-sm leading-snug flex-1">{selectedItem.nama}</p>
                    <StatusBadge status={selectedItem.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Kategori', value: selectedItem.kategori },
                      { label: 'BIN LOC', value: selectedItem.binLoc || '-' },
                      { label: 'UOM', value: selectedItem.uom },
                      { label: 'MS Code', value: selectedItem.msCode || '-' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                        <p className="text-sm font-semibold text-slate-700 font-mono">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-0.5">Stok Saat Ini</p>
                      <p className={`text-2xl font-bold ${stockColor(selectedItem)}`}>{selectedItem.stok} <span className="text-sm font-normal text-slate-400">{selectedItem.uom}</span></p>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-0.5">Batas Aman</p>
                      <p className="text-2xl font-bold text-slate-600">{selectedItem.safetyStok} <span className="text-sm font-normal text-slate-400">{selectedItem.uom}</span></p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Riwayat Transaksi</p>
                    <div className="rounded-xl border border-slate-100 overflow-hidden text-sm divide-y divide-slate-100">
                      {[
                        { tgl: '14 Jan 2025, 10:30', jenis: 'Masuk', jml: '+20', pet: 'Budi Santoso' },
                        { tgl: '10 Jan 2025, 14:15', jenis: 'Keluar', jml: '-5', pet: 'Andi Rahman' },
                        { tgl: '05 Jan 2025, 09:00', jenis: 'Keluar', jml: '-12', pet: 'Siti Rahayu' },
                      ].map((r, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2.5">
                          <div>
                            <p className="text-xs text-slate-500">{r.tgl}</p>
                            <p className={`text-xs font-semibold mt-0.5 ${r.jenis === 'Masuk' ? 'text-green-600' : 'text-orange-500'}`}>{r.jenis}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${r.jenis === 'Masuk' ? 'text-green-600' : 'text-orange-500'}`}>{r.jml}</p>
                            <p className="text-xs text-slate-400">{r.pet}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pb-2">
                    <Button variant="outline" className="w-full" onClick={closeMobileSheet}>Tutup</Button>
                  </div>
                </div>
              )}

              {/* EDIT */}
              {bottomSheetType === 'edit' && (
                <div className="px-5 py-4 space-y-3">
                  <div className="space-y-1.5"><Label className="text-xs">TS Code</Label><Input value={formData.tsCode || ''} disabled className="bg-slate-50" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">MS Code</Label><Input value={formData.msCode || ''} onChange={(e) => setFormData({ ...formData, msCode: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Nama Barang <span className="text-red-500">*</span></Label><Input value={formData.nama || ''} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Kategori</Label>
                      <KategoriSelect value={formData.kategori as string} onValueChange={(val) => setFormData({ ...formData, kategori: val as any })} className="h-9" />
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">BIN LOC</Label><Input value={formData.binLoc || ''} onChange={(e) => setFormData({ ...formData, binLoc: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">UOM</Label><Input value={formData.uom || ''} onChange={(e) => setFormData({ ...formData, uom: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Stok</Label><Input type="number" min="0" value={formData.stok ?? ''} onChange={(e) => setFormData({ ...formData, stok: parseInt(e.target.value) || 0 })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Min. Stok</Label><Input type="number" min="0" value={formData.safetyStok ?? ''} onChange={(e) => setFormData({ ...formData, safetyStok: parseInt(e.target.value) || 0 })} /></div>
                  </div>
                  <div className="flex gap-2 pt-2 pb-2">
                    <Button variant="outline" className="flex-1" onClick={closeMobileSheet}>Batal</Button>
                    <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => { handleSaveEdit(); closeMobileSheet(); }}>Simpan</Button>
                  </div>
                </div>
              )}

              {/* QR */}
              {bottomSheetType === 'qr' && (
                <div className="px-5 py-4 flex flex-col items-center gap-4">
                  <div id="qr-mobile-box" className="bg-white border rounded-xl shadow-sm p-6 flex flex-col items-center w-full max-w-[280px]">
                    <QRCodeSVG value={selectedItem.tsCode} size={180} />
                    <div className="mt-5 w-full text-center space-y-1">
                      <p className="font-mono font-bold text-lg tracking-widest">{selectedItem.tsCode}</p>
                      <p className="text-sm font-semibold text-slate-700 truncate">{selectedItem.nama}</p>
                      <div className="flex justify-between border-t mt-3 pt-3 text-xs text-slate-500">
                        <span>Lokasi:</span>
                        <span className="font-mono font-semibold text-slate-700">{selectedItem.binLoc || '—'}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Kategori:</span>
                        <span className="font-mono font-semibold text-slate-700">{selectedItem.kategori}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 -mt-2 text-center">
                    Klik "Cetak Label" untuk membuka dialog cetak browser
                  </p>
                  <div className="flex gap-2 w-full pb-2">
                    <Button variant="outline" className="flex-1" onClick={closeMobileSheet}>Batal</Button>
                    <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => handlePrintLabel(selectedItem)}>Cetak Label</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
