import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { useAppContext, Item } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Eye, Pencil, QrCode, FileX, MapPin, Tag, Printer, CheckSquare, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { ItemDetailModal } from '@/components/master-barang/ItemDetailModal';
import { ItemFormModal } from '@/components/master-barang/ItemFormModal';
import { ItemQRModal } from '@/components/master-barang/ItemQRModal';
import { MobileItemSheet, SheetType } from '@/components/master-barang/MobileItemSheet';
import { ImportExcelModal } from '@/components/master-barang/ImportExcelModal';

const PAGE_SIZE = 50;

interface KategoriOption { id: number; nama: string; }

function mapRow(row: Record<string, unknown>): Item {
  return {
    id: row.id as number,
    tsCode: (row.tsCode ?? row.ts_code) as string,
    msCode: ((row.msCode ?? row.ms_code) as string) ?? '',
    nama: row.nama as string,
    kategori: (row.kategori as string) ?? '',
    binLoc: ((row.binLoc ?? row.bin_loc) as string) ?? '',
    uom: (row.uom as string) ?? 'EA',
    stok: row.stok as number,
    safetyStok: ((row.safetyStok ?? row.safety_stok) as number) ?? 5,
    status: (row.status as string) ?? 'Normal',
  };
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

function stockColor(item: Item) {
  if (item.stok === 0) return 'text-red-600';
  if (item.stok <= item.safetyStok) return 'text-amber-600';
  return 'text-foreground';
}

function cardBg(item: Item) {
  if (item.stok === 0) return 'border-red-200 bg-red-50/40';
  if (item.stok <= item.safetyStok) return 'border-amber-200 bg-amber-50/40';
  return '';
}

function rowBg(item: Item) {
  if (item.stok === 0) return 'bg-red-50/50 hover:bg-red-50';
  if (item.stok <= item.safetyStok) return 'bg-amber-50/50 hover:bg-amber-50';
  return '';
}

function stickyBg(item: Item) {
  if (item.stok === 0) return 'bg-red-50/80';
  if (item.stok <= item.safetyStok) return 'bg-amber-50/80';
  return 'bg-white';
}

export default function MasterBarang() {
  const { token, currentUser, refreshItems } = useAppContext();
  const kategoris = useKategoris(token);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');

  const [pageItems, setPageItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const fetchPage = useCallback(async (
    page: number,
    search: string,
    kategori: string,
    status: string,
  ) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (kategori !== 'Semua') params.set('kategori', kategori);
      if (status !== 'Semua') params.set('status', status);

      const res = await fetch(`/api/items?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setPageItems((json.data as Record<string, unknown>[]).map(mapRow));
        setTotal(json.total as number);
        setTotalPages(json.totalPages as number);
        setCurrentPage(page);
      }
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [token]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPage(1, searchTerm, categoryFilter, statusFilter);
    }, searchTerm ? 300 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm, categoryFilter, statusFilter, fetchPage]);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setSelectedForPrint(new Set());
    fetchPage(p, searchTerm, categoryFilter, statusFilter);
  };

  const allPageSelected =
    pageItems.length > 0 && pageItems.every((i) => selectedForPrint.has(i.tsCode));

  const toggleSelect = (tsCode: string) =>
    setSelectedForPrint((prev) => {
      const next = new Set(prev);
      next.has(tsCode) ? next.delete(tsCode) : next.add(tsCode);
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedForPrint((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageItems.forEach((i) => next.delete(i.tsCode));
      else pageItems.forEach((i) => next.add(i.tsCode));
      return next;
    });

  const exitSelectMode = () => { setIsSelectMode(false); setSelectedForPrint(new Set()); };

  const handleBatchPrint = () => {
    const selected = pageItems.filter((i) => selectedForPrint.has(i.tsCode));
    if (selected.length === 0) return;
    const labelHtmls = selected.map((item) => {
      const svgEl = document.getElementById(`qr-batch-${item.tsCode}`)?.querySelector('svg');
      let svgHtml = '';
      if (svgEl) {
        const clone = svgEl.cloneNode(true) as SVGElement;
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgHtml = clone.outerHTML;
      }
      const nama = item.nama.length > 90 ? item.nama.slice(0, 90) + '…' : item.nama;
      return `<div class="label">
  <div class="hdr"><div class="co">PT TANJUNGENIM LESTARI PULP &amp; PAPER</div><div class="sub">TOWNSITE WAREHOUSE — MATERIALS MANAGEMENT</div></div>
  <div class="qr">${svgHtml}</div>
  <div class="ts">${item.tsCode}</div>
  <div class="nama">${nama}</div>
  <div class="divider"></div>
  <div class="row"><span>Kategori</span><span class="val">${item.kategori || '—'}</span></div>
  <div class="row"><span>BIN LOC</span><span class="val">${item.binLoc || '—'}</span></div>
  <div class="row"><span>UOM</span><span class="val">${item.uom}</span></div>
</div>`;
    });
    const win = window.open('', '_blank', 'width=860,height=960');
    if (!win) { toast.error('Popup diblokir — izinkan popup di browser lalu coba lagi'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"><title>Label Batch — ${selected.length} Barang</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4 portrait;margin:0}
  body{padding:8mm;display:grid;grid-template-columns:1fr 1fr;gap:4mm;font-family:'Courier New',Courier,monospace;background:#fff;align-content:start}
  .label{border:1px solid #444;padding:4mm;overflow:hidden;page-break-inside:avoid;break-inside:avoid}
  .hdr{text-align:center;border-bottom:1px solid #999;padding-bottom:2mm;margin-bottom:2mm}
  .co{font-size:5.5pt;font-weight:bold;letter-spacing:.3px}.sub{font-size:4.5pt;color:#555;margin-top:.5mm}
  .qr{text-align:center;margin:1.5mm 0}.qr svg{width:40mm!important;height:40mm!important;display:inline-block}
  .ts{text-align:center;font-size:13pt;font-weight:bold;letter-spacing:2px;margin:1mm 0}
  .nama{text-align:center;font-size:5.5pt;font-weight:bold;margin:0 1mm 1.5mm;line-height:1.4;word-wrap:break-word}
  .divider{border-top:1px dashed #bbb;margin:1.5mm 0}
  .row{display:flex;justify-content:space-between;font-size:5.5pt;padding:.4mm 0}.val{font-weight:bold}
</style>
</head><body>${labelHtmls.join('\n')}
<script>window.onload=function(){window.print();setTimeout(function(){window.close();},1500);}<\/script>
</body></html>`);
    win.document.close();
  };

  const handleSaveEdit = async (data: Partial<Item>) => {
    if (!data.tsCode) return;
    const res = await fetch(`/api/items/${data.tsCode}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        msCode: data.msCode, nama: data.nama, kategori: data.kategori,
        binLoc: data.binLoc, uom: data.uom, stok: data.stok, safetyStok: data.safetyStok,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.message ?? 'Gagal menyimpan perubahan');
      throw new Error('save failed');
    }
    setEditOpen(false);
    toast.success('Data barang berhasil diperbarui');
    fetchPage(currentPage, searchTerm, categoryFilter, statusFilter);
    refreshItems();
  };

  const handleSaveAdd = async (data: Partial<Item>) => {
    if (!data.tsCode || !data.nama) {
      toast.error('TS Code dan Nama Barang wajib diisi');
      throw new Error('validation failed');
    }
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        tsCode: data.tsCode, msCode: data.msCode, nama: data.nama, kategori: data.kategori,
        binLoc: data.binLoc, uom: data.uom ?? 'EA', stok: data.stok ?? 0, safetyStok: data.safetyStok ?? 5,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.message ?? 'Gagal menambah barang');
      throw new Error('save failed');
    }
    setAddOpen(false);
    toast.success('Barang baru berhasil ditambahkan');
    fetchPage(1, searchTerm, categoryFilter, statusFilter);
    refreshItems();
  };

  const handleImported = async () => {
    fetchPage(1, searchTerm, categoryFilter, statusFilter);
    refreshItems();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${deleteTarget.tsCode}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message ?? 'Gagal menghapus barang');
        return;
      }
      toast.success(`Barang "${deleteTarget.nama}" berhasil dihapus`);
      setDeleteTarget(null);
      const newPage = pageItems.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      fetchPage(newPage, searchTerm, categoryFilter, statusFilter);
      refreshItems();
    } catch {
      toast.error('Gagal terhubung ke server');
    } finally {
      setDeleting(false);
    }
  };

  const startEntry = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endEntry = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <Layout title="Master Data Barang">
      {/* Hidden QR codes for batch print */}
      <div className="sr-only" aria-hidden>
        {Array.from(selectedForPrint).map((tsCode) => (
          <div key={tsCode} id={`qr-batch-${tsCode}`}>
            <QRCodeSVG value={tsCode} size={160} />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">

        {/* Filters & Actions */}
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
                {kategoris.map((k) => <SelectItem key={k.id} value={k.nama}>{k.nama}</SelectItem>)}
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
          <div className="flex gap-2 w-full sm:w-auto shrink-0 flex-wrap">
            {!isSelectMode && (
              <Button variant="outline" onClick={() => setIsSelectMode(true)} className="w-full sm:w-auto">
                <CheckSquare className="mr-2 h-4 w-4" /> Pilih Item
              </Button>
            )}
            <Button variant="outline" onClick={() => setImportOpen(true)} className="w-full sm:w-auto border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
            </Button>
            <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Tambah Barang
            </Button>
          </div>
        </div>

        {/* Selection action bar */}
        {isSelectMode && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5 flex-wrap">
            <span className="text-sm font-medium text-primary flex-1">
              {selectedForPrint.size > 0 ? `${selectedForPrint.size} barang dipilih` : 'Pilih barang untuk dicetak labelnya'}
            </span>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exitSelectMode}>Batal</Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90"
              disabled={selectedForPrint.size === 0}
              onClick={handleBatchPrint}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Cetak {selectedForPrint.size > 0 ? `${selectedForPrint.size} ` : ''}Label
            </Button>
          </div>
        )}

        {/* MOBILE: Card View */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-3 w-1/3" /></CardContent></Card>
            ))
          ) : pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileX className="h-12 w-12 mb-2 text-slate-300" />
              <p className="font-medium text-slate-500">Tidak ada data ditemukan</p>
              <p className="text-sm">Coba sesuaikan filter pencarian.</p>
            </div>
          ) : pageItems.map((item) => (
            <Card key={item.tsCode} className={`border shadow-sm ${cardBg(item)}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {isSelectMode && (
                      <Checkbox
                        className="mt-0.5 shrink-0"
                        checked={selectedForPrint.has(item.tsCode)}
                        onCheckedChange={() => toggleSelect(item.tsCode)}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 leading-tight break-words">{item.nama}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">{item.tsCode}</p>
                    </div>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                      onClick={() => { setSelectedItem(item); setSheetType('detail'); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                      onClick={() => { setSelectedItem(item); setSheetType('edit'); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                      onClick={() => { setSelectedItem(item); setSheetType('qr'); }}>
                      <QrCode className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50"
                        onClick={() => setDeleteTarget(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* DESKTOP: Table View */}
        <Card className="overflow-hidden border-border shadow-sm hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="sticky left-0 z-20 bg-slate-100 w-[120px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {isSelectMode && (
                        <Checkbox checked={allPageSelected} onCheckedChange={toggleSelectAll} aria-label="Pilih semua" />
                      )}
                      TS Code
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[220px]">Nama Barang</TableHead>
                  <TableHead className="min-w-[130px]">Kategori</TableHead>
                  <TableHead className="min-w-[90px]">BIN LOC</TableHead>
                  <TableHead className="min-w-[60px]">UOM</TableHead>
                  <TableHead className="text-right min-w-[60px]">Stok</TableHead>
                  <TableHead className="text-right min-w-[90px]">Safety Stok</TableHead>
                  <TableHead className="text-center min-w-[90px]">Status</TableHead>
                  <TableHead className="sticky right-0 z-20 bg-slate-100 text-center shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.12)]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileX className="h-12 w-12 mb-2 text-slate-300" />
                        <p className="text-lg font-medium text-slate-500">Tidak ada data ditemukan</p>
                        <p className="text-sm">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageItems.map((item) => (
                  <TableRow key={item.tsCode} className={rowBg(item)}>
                    <TableCell className={`sticky left-0 z-10 font-mono font-medium text-slate-600 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.10)] ${stickyBg(item)}`}>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {isSelectMode && (
                          <Checkbox
                            checked={selectedForPrint.has(item.tsCode)}
                            onCheckedChange={() => toggleSelect(item.tsCode)}
                          />
                        )}
                        {item.tsCode}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800 max-w-[260px]">
                      <span className="block truncate" title={item.nama}>{item.nama}</span>
                    </TableCell>
                    <TableCell>{item.kategori}</TableCell>
                    <TableCell className="font-mono text-sm">{item.binLoc}</TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell className={`text-right font-bold ${stockColor(item)}`}>{item.stok}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.safetyStok}</TableCell>
                    <TableCell className="text-center"><StatusBadge status={item.status} /></TableCell>
                    <TableCell className={`sticky right-0 z-10 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.10)] ${stickyBg(item)}`}>
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          onClick={() => { setSelectedItem(item); setDetailOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                          onClick={() => { setSelectedItem(item); setEditOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                          onClick={() => { setSelectedItem(item); setQrOpen(true); }}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={() => setDeleteTarget(item)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Pagination bar */}
        {!isLoading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
            <p className="text-sm text-muted-foreground order-2 sm:order-1">
              Menampilkan <span className="font-medium text-foreground">{startEntry}–{endEntry}</span> dari <span className="font-medium text-foreground">{total}</span> data
            </p>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
              </Button>
              <span className="text-sm font-medium px-2 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Berikutnya <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      <ImportExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        token={token}
        onImported={handleImported}
      />
      <ItemDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        item={selectedItem}
        token={token}
      />
      <ItemQRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        item={selectedItem}
      />
      <ItemFormModal
        mode="edit"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveEdit}
        initialData={selectedItem ?? undefined}
        kategoris={kategoris}
      />
      <ItemFormModal
        mode="add"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSaveAdd}
        kategoris={kategoris}
      />

      {/* Mobile Bottom Sheet */}
      <MobileItemSheet
        type={sheetType}
        item={selectedItem}
        token={token}
        kategoris={kategoris}
        onClose={() => setSheetType(null)}
        onSaveEdit={async (data) => {
          await handleSaveEdit(data);
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Barang</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus <strong>{deleteTarget?.nama}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Menghapus…' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
