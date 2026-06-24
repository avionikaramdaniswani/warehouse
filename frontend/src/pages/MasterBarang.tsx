import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { Search, Plus, Eye, Pencil, QrCode, FileX, MapPin, Tag, Printer, CheckSquare, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
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
import { PrintModeDialog } from '@/components/master-barang/PrintModeDialog';

const PAGE_SIZE_OPTIONS = [50, 100, 150, 200, 300, 400, 500];

function getPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

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
  const { token, currentUser, refreshItems, items } = useAppContext();
  const kategoris = useKategoris(token);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');

  const [pageItems, setPageItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
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
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'operator';

  const [printModeOpen, setPrintModeOpen] = useState(false);

  const selectedBinLocs = useMemo(() => {
    const bins = new Set<string>();
    for (const tsCode of selectedForPrint) {
      const item = pageItems.find((i) => i.tsCode === tsCode);
      if (item?.binLoc) bins.add(item.binLoc);
    }
    return bins;
  }, [selectedForPrint, pageItems]);

  const fetchPage = useCallback(async (
    page: number,
    search: string,
    kategori: string,
    status: string,
    limit = 50,
  ) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
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
      fetchPage(1, searchTerm, categoryFilter, statusFilter, pageSize);
    }, searchTerm ? 300 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm, categoryFilter, statusFilter, fetchPage]);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === currentPage) return;
    setSelectedForPrint(new Set());
    fetchPage(p, searchTerm, categoryFilter, statusFilter, pageSize);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setTotalPages(1);
    setSelectedForPrint(new Set());
    fetchPage(1, searchTerm, categoryFilter, statusFilter, newSize);
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

  const fetchLogoBase64 = async (): Promise<string> => {
    try {
      const res = await fetch(`${window.location.origin}/tel-logo-official.png`);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

  const handleBatchPrint = async () => {
    // Use full items list — not pageItems — so selections from other pages/filters are included
    const selected = items.filter((i) => selectedForPrint.has(i.tsCode));
    if (selected.length === 0) return;
    const logoDataUri = await fetchLogoBase64();
    const logoTag = logoDataUri ? `<img src="${logoDataUri}" class="logo" alt="TEL">` : '';
    const labelHtmls = selected.map((item) => {
      const nama = item.nama.length > 80 ? item.nama.slice(0, 80) + '…' : item.nama;
      const safeId = item.tsCode.replace(/[^a-zA-Z0-9]/g, '_');
      return `<div class="label">
  <div class="hdr">${logoTag}<div class="hdr-text"><div class="co">PT TANJUNGENIM LESTARI PULP &amp; PAPER</div><div class="sub">TOWNSITE WAREHOUSE — MATERIALS MANAGEMENT</div></div></div>
  <div class="body">
    <div class="qr" id="qr-${safeId}" data-qr="${item.tsCode}"></div>
    <div class="info">
      <div class="ts">${item.tsCode}</div>
      <div class="nama">${nama}</div>
      <div class="divider"></div>
      <div class="row"><span class="lbl">MS Code</span><span class="val">${item.msCode || '—'}</span></div>
      <div class="row"><span class="lbl">BIN LOC</span><span class="val">${item.binLoc || '—'}</span></div>
    </div>
  </div>
</div>`;
    });
    const win = window.open('', '_blank', 'width=860,height=960');
    if (!win) { toast.error('Popup diblokir — izinkan popup di browser lalu coba lagi'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"><title>Label Batch — ${selected.length} Barang</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{size:A4 portrait;margin:0}
  body{padding:6mm;display:grid;grid-template-columns:1fr 1fr;gap:3mm;font-family:'Courier New',Courier,monospace;background:#fff;align-content:start}
  .label{border:1.5px solid #1B3A2D;padding:2mm 3mm;overflow:hidden;page-break-inside:avoid;break-inside:avoid;border-radius:1mm}
  .hdr{display:flex;align-items:center;gap:2mm;background:#1B3A2D !important;margin:-2mm -3mm 1.5mm;padding:1.5mm 3mm 1mm;border-radius:1mm 1mm 0 0}
  .logo{height:7mm;width:auto;flex-shrink:0;display:block}
  .hdr-text{flex:1;text-align:center}
  .co{font-size:7pt;font-weight:bold;letter-spacing:.3px;color:#fff !important}.sub{font-size:5pt;color:rgba(255,255,255,.75) !important;margin-top:.3mm}
  .body{display:flex;gap:2.5mm;align-items:center}
  .qr{flex-shrink:0;width:26mm;height:26mm}.qr img,.qr canvas{width:26mm!important;height:26mm!important;display:block}
  .info{flex:1;min-width:0}
  .ts{font-size:13pt;font-weight:bold;letter-spacing:1px;color:#000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.1}
  .nama{font-size:5.5pt;color:#333;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:.8mm;margin-bottom:1.5mm}
  .divider{border-top:1px solid #ddd;margin-bottom:1.5mm}
  .row{display:flex;justify-content:space-between;align-items:baseline;padding:.3mm 0;gap:2mm}
  .lbl{font-size:5.5pt;color:#777;flex-shrink:0}.val{font-size:7pt;font-weight:bold;color:#000;text-align:right;word-break:break-all}
</style>
</head><body>${labelHtmls.join('\n')}
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script>
window.onload=function(){
  document.querySelectorAll('[data-qr]').forEach(function(el){
    new QRCode(el,{text:el.getAttribute('data-qr'),width:98,height:98,correctLevel:QRCode.CorrectLevel.M});
  });
  setTimeout(function(){window.print();setTimeout(function(){window.close();},1500);},800);
};
<\/script>
</body></html>`);
    win.document.close();
  };

  const handleBinPrint = async () => {
    // Collect unique BIN LOCs from selected items
    const uniqueBins = new Set<string>();
    for (const tsCode of selectedForPrint) {
      const item = pageItems.find((i) => i.tsCode === tsCode) ?? items.find((i) => i.tsCode === tsCode);
      if (item?.binLoc) uniqueBins.add(item.binLoc);
    }

    // Build map with ALL items per bin (from full items list, not just selected)
    const binMap = new Map<string, Item[]>();
    for (const binLoc of uniqueBins) {
      const binItems = items.filter((i) => i.binLoc === binLoc);
      if (binItems.length > 0) binMap.set(binLoc, binItems);
    }

    if (binMap.size === 0) {
      toast.error('Item yang dipilih tidak memiliki BIN LOC');
      return;
    }
    const logoDataUri = await fetchLogoBase64();
    const logoTag = logoDataUri ? `<img src="${logoDataUri}" class="logo" alt="TEL">` : '';
    const labelHtmls = Array.from(binMap.entries()).map(([binLoc, binItems]) => {
      const safeId = binLoc.replace(/[^a-zA-Z0-9]/g, '_');
      const binUrl = `${window.location.origin}/bin/${encodeURIComponent(binLoc)}`;
      const itemRows = binItems.slice(0, 16).map(i =>
        `<div class="item-row"><span class="item-ts">${i.tsCode}</span><span class="item-ms">${i.msCode || '—'}</span></div>`
      ).join('');
      const more = binItems.length > 16 ? `<div class="item-more">+${binItems.length - 16} lainnya</div>` : '';
      return `<div class="label">
  <div class="hdr">${logoTag}<div class="hdr-text"><div class="co">PT TANJUNGENIM LESTARI PULP &amp; PAPER</div><div class="sub">TOWNSITE WAREHOUSE — MATERIALS MANAGEMENT</div></div></div>
  <div class="body">
    <div class="col-qr"><div class="qr" id="qr-${safeId}" data-qr="${binUrl}"></div></div>
    <div class="col-info">
      <div class="bin-name">${binLoc}</div>
      <div class="divider"></div>
      <div class="items">${itemRows}${more}</div>
    </div>
  </div>
</div>`;
    });
    const win = window.open('', '_blank', 'width=600,height=800');
    if (!win) { toast.error('Popup diblokir — izinkan popup di browser lalu coba lagi'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"><title>Label BIN LOC — ${binMap.size} slot</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{size:A4 portrait;margin:0}
  body{padding:6mm;display:grid;grid-template-columns:1fr 1fr;gap:3mm;font-family:'Courier New',Courier,monospace;background:#fff;align-content:start}
  .label{border:2px solid #1B3A2D;overflow:hidden;page-break-inside:avoid;break-inside:avoid;border-radius:2mm}
  .hdr{display:flex;align-items:center;gap:2mm;background:#1B3A2D !important;padding:1.5mm 3mm 1mm}
  .logo{height:7mm;width:auto;flex-shrink:0;display:block}
  .hdr-text{flex:1;text-align:center}
  .co{font-size:7pt;font-weight:bold;letter-spacing:.3px;color:#fff !important}.sub{font-size:5pt;color:rgba(255,255,255,.75) !important;margin-top:.3mm}
  .body{padding:2mm 3mm 3mm;display:flex;gap:3mm;align-items:flex-start}
  .col-qr{flex-shrink:0;display:flex;align-items:center;justify-content:center}
  .qr{width:32mm;height:32mm}.qr img,.qr canvas{width:32mm!important;height:32mm!important;display:block}
  .col-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1.5mm}
  .bin-name{font-size:16pt;font-weight:bold;letter-spacing:2px;color:#1B3A2D;line-height:1.1}
  .divider{border-top:1.5px solid #ddd;width:100%}
  .items{display:flex;flex-direction:column;gap:.8mm}
  .item-row{display:flex;gap:2mm;align-items:baseline}
  .item-ts{font-size:6.5pt;font-weight:bold;color:#1B3A2D;white-space:nowrap}
  .item-ms{font-size:5.5pt;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .item-more{font-size:5pt;color:#999;font-style:italic}
</style>
</head><body>${labelHtmls.join('\n')}
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script>
window.onload=function(){
  document.querySelectorAll('[data-qr]').forEach(function(el){
    new QRCode(el,{text:el.getAttribute('data-qr'),width:113,height:113,correctLevel:QRCode.CorrectLevel.M});
  });
  setTimeout(function(){window.print();setTimeout(function(){window.close();},1500);},800);
};
<\/script>
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
    fetchPage(currentPage, searchTerm, categoryFilter, statusFilter, pageSize);
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
    fetchPage(1, searchTerm, categoryFilter, statusFilter, pageSize);
    refreshItems();
  };

  const handleImported = async () => {
    fetchPage(1, searchTerm, categoryFilter, statusFilter, pageSize);
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
      fetchPage(newPage, searchTerm, categoryFilter, statusFilter, pageSize);
      refreshItems();
    } catch {
      toast.error('Gagal terhubung ke server');
    } finally {
      setDeleting(false);
    }
  };

  const startEntry = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, total);

  return (
    <Layout title="Daftar Barang">
      {/* Hidden QR codes for batch print */}
      <div className="sr-only" aria-hidden>
        {Array.from(selectedForPrint).map((tsCode) => (
          <div key={tsCode} id={`qr-batch-${tsCode}`}>
            <QRCodeSVG value={tsCode} size={160} />
          </div>
        ))}
        {Array.from(selectedBinLocs).map((binLoc) => (
          <div key={`bin-${binLoc}`} id={`qr-bin-${binLoc.replace(/[^a-zA-Z0-9]/g, '_')}`}>
            <QRCodeSVG value={`${window.location.origin}/bin/${encodeURIComponent(binLoc)}`} size={240} />
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
                placeholder="Cari nama, TS Code, BIN LOC, kategori..."
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
                <SelectItem value="Warning">Warning</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0 flex-wrap">
            {!isSelectMode && canEdit && (
              <Button variant="outline" onClick={() => setIsSelectMode(true)} className="w-full sm:w-auto">
                <CheckSquare className="mr-2 h-4 w-4" /> Pilih Item
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" onClick={() => setImportOpen(true)} className="w-full sm:w-auto border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Tambah Barang
              </Button>
            )}
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
              onClick={() => setPrintModeOpen(true)}
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
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                        onClick={() => { setSelectedItem(item); setSheetType('edit'); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
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
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                            onClick={() => { setSelectedItem(item); setEditOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
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
            <div className="flex items-center gap-2 order-2 sm:order-1">
              <p className="text-sm text-muted-foreground">
                Menampilkan{' '}
                <span className="font-medium text-foreground">{startEntry}–{endEntry}</span>{' '}
                dari <span className="font-medium text-foreground">{total}</span> data
              </p>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="text-sm border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Jumlah data per halaman"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} / hal</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 order-1 sm:order-2">
              {/* Prev */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page numbers */}
              {getPageRange(currentPage, totalPages).map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="h-8 w-8 flex items-center justify-center text-muted-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={item === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0 tabular-nums"
                    onClick={() => goToPage(item)}
                  >
                    {item}
                  </Button>
                )
              )}

              {/* Next */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      <PrintModeDialog
        open={printModeOpen}
        onClose={() => setPrintModeOpen(false)}
        selectedCount={selectedForPrint.size}
        onSelectMode={(mode) => {
          if (mode === 'item') handleBatchPrint();
          else handleBinPrint();
        }}
      />
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
        canPrint={canEdit}
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
        canPrint={canEdit}
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
