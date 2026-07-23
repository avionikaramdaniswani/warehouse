import { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';

interface ParsedRow {
  rowNum: number;
  itemCode: string;
  tsCode?: string;
  msCode?: string;
  nama: string;
  kategori: string;
  binLoc?: string;
  uom: string;
  stok: number;
  safetyStok: number;
  errors: string[];
}

type DiffStatus = 'new' | 'updated' | 'unchanged';

interface DiffEntry {
  itemCode: string;
  status: DiffStatus;
  changedFields: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  token: string | null;
  onImported: () => void;
}

const COL_ALIASES: Record<string, string[]> = {
  // msCode juga menangkap kolom 'item code' — karena item_code = ms_code
  msCode:     ['ms code', 'ms-code', 'mscode', 'ms no', 'material no', 'material number', 'material',
               'item code', 'item-code', 'itemcode', 'kode item', 'kode barang', 'kode'],
  tsCode:     ['ts code', 'ts-code', 'tscode', 'kode ts'],
  nama:       ['nama barang', 'item', 'description', 'deskripsi', 'nama material', 'nama item', 'nama', 'item name', 'uraian', 'keterangan barang'],
  kategori:   ['kategori', 'category', 'grup', 'group', 'kat', 'material group'],
  binLoc:     ['bin loc', 'binloc', 'bin location', 'lokasi', 'bin', 'location', 'storage loc'],
  uom:        ['uom', 'satuan', 'unit', 'unit of measure', 'base unit'],
  stok:       ['stok', 'stock', 'qty', 'quantity', 'jumlah', 'unrestricted', 'soh'],
  safetyStok: ['safety stok', 'safety stock', 'safety', 'min stok', 'minimum stock', 'min stock', 'min qty'],
};

// Item Code = MS Code (nilai sama, satu kolom cukup)
const ALL_COLS = ['MS Code', 'TS Code', 'Nama Barang', 'Kategori', 'Bin Loc', 'UOM', 'Stok', 'Safety Stok'];

const KATEGORI_NORMALIZE: Record<string, string> = {
  'civil': 'Civil',
  'civil material': 'Civil Material',
  'civilmaterial': 'Civil Material',
  'consumables': 'Consumables',
  'consumable': 'Consumables',
  'mechanical material': 'Mechanical Material',
  'gh consumable': 'GH Consumable',
  'electrical material': 'Electrical Material',
  'furniture material': 'Furniture Material',
  'furniture materials': 'Furniture Material',
  'asset tool': 'Asset Tool',
  'asset tools': 'Asset Tool',
};

function normalizeKategori(raw: string): string {
  const key = raw.trim().toLowerCase();
  return KATEGORI_NORMALIZE[key] ?? raw.trim();
}

function norm(s: string): string {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i] as unknown[];
    const nonEmpty = row.filter((c) => c != null && String(c).trim() !== '');
    if (nonEmpty.length >= 3) return i;
  }
  return 0;
}

function buildColMap(headers: unknown[]): Record<string, number[]> {
  const map: Record<string, number[]> = {};

  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    map[field] = [];
    for (let idx = 0; idx < headers.length; idx++) {
      const h = norm(String(headers[idx] ?? ''));
      if (aliases.includes(h)) {
        map[field].push(idx);
      }
    }
  }
  return map;
}

function parseRows(sheet: XLSX.WorkSheet): { rows: ParsedRow[]; detectedHeaders: string[] } {
  const raw2d = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  if (raw2d.length < 2) return { rows: [], detectedHeaders: [] };

  const headerRowIdx = findHeaderRow(raw2d);
  const headerRow = raw2d[headerRowIdx] as unknown[];
  const colMap = buildColMap(headerRow);
  const detectedHeaders = headerRow.map((h) => String(h ?? '').trim()).filter(Boolean);

  const getStr = (dataRow: unknown[], field: string): string => {
    const indices = colMap[field] ?? [];
    for (const idx of indices) {
      const v = dataRow[idx];
      const s = v == null ? '' : String(v).trim();
      if (s !== '') return s;
    }
    return '';
  };

  const getNum = (dataRow: unknown[], field: string, def: number): number => {
    const v = getStr(dataRow, field);
    if (v === '') return def;
    const n = Number(v);
    return isNaN(n) ? NaN : Math.floor(n);
  };

  const rows: ParsedRow[] = [];
  for (let i = headerRowIdx + 1; i < raw2d.length; i++) {
    const row = raw2d[i] as unknown[];
    if (!row || row.every((c) => c == null || String(c).trim() === '')) continue;

    const errors: string[] = [];
    // item_code = ms_code: MS Code kolom utama, dipakai sebagai item_code sekaligus
    const msRaw  = getStr(row, 'msCode');
    const itemCode = msRaw; // item_code selalu sama dengan ms_code
    const tsRaw  = getStr(row, 'tsCode');
    const nama     = getStr(row, 'nama');
    const kategori = normalizeKategori(getStr(row, 'kategori'));
    const stok     = getNum(row, 'stok', 0);
    const safetyStok = getNum(row, 'safetyStok', 5);

    if (!itemCode) errors.push('MS Code kosong');
    if (!nama)     errors.push('Nama Barang kosong');
    if (!kategori) errors.push('Kategori kosong');
    if (isNaN(stok))      errors.push('Stok harus angka');
    if (isNaN(safetyStok)) errors.push('Safety Stok harus angka');

    rows.push({
      rowNum: i + 1,
      itemCode,
      tsCode: tsRaw || undefined,
      msCode: msRaw || undefined, // same value as itemCode
      nama,
      kategori,
      binLoc: getStr(row, 'binLoc') || undefined,
      uom: getStr(row, 'uom') || 'EA',
      stok: isNaN(stok) ? 0 : stok,
      safetyStok: isNaN(safetyStok) ? 5 : safetyStok,
      errors,
    });
  }
  return { rows, detectedHeaders };
}

function downloadTemplate() {
  // MS Code = Item Code (nilai sama), TS Code opsional
  const ws = XLSX.utils.aoa_to_sheet([
    ALL_COLS,
    ['123456', '10001', 'Baut M10 x 30mm', 'Mechanical Material', 'A-01-01', 'PCS', 100, 20],
    ['123457', '10002', 'Oli Mesin SAE 40', 'Consumables', 'B-02-03', 'LTR', 50, 10],
  ]);
  ws['!cols'] = ALL_COLS.map((_, i) => ({ wch: i === 3 ? 35 : 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template_import_barang.xlsx');
}

export function ImportExcelModal({ open, onClose, token, onImported }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number; unchanged: number; errors: { itemCode: string; reason: string }[] } | null>(null);
  const [diffMap, setDiffMap] = useState<Map<string, DiffEntry>>(new Map());
  const [diffLoading, setDiffLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidCount = rows.length - validRows.length;

  // Auto-fetch diff setiap kali valid rows berubah
  useEffect(() => {
    if (validRows.length === 0 || result) { setDiffMap(new Map()); return; }
    let cancelled = false;
    setDiffLoading(true);
    fetch('/api/items/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        items: validRows.map((r) => ({
          itemCode: r.itemCode, tsCode: r.tsCode, msCode: r.msCode, nama: r.nama,
          kategori: r.kategori, binLoc: r.binLoc, uom: r.uom,
          stok: r.stok, safetyStok: r.safetyStok,
        })),
      }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const map = new Map<string, DiffEntry>();
        for (const entry of data.diff as DiffEntry[]) map.set(entry.itemCode, entry);
        setDiffMap(map);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDiffLoading(false); });
    return () => { cancelled = true; };
  }, [validRows.length, fileName, result]);

  const reset = () => {
    setRows([]);
    setFileName('');
    setResult(null);
    setDiffMap(new Map());
  };

  const handleClose = () => { reset(); onClose(); };

  const processFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv');
      return;
    }
    setFileName(file.name);
    setResult(null);
    setDiffMap(new Map());
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const { rows: parsed } = parseRows(ws);
        if (parsed.length === 0) {
          toast.error('File kosong atau kolom tidak dikenali. Coba download Template terlebih dahulu.');
          setFileName('');
          return;
        }
        setRows(parsed);
      } catch {
        toast.error('Gagal membaca file. Pastikan file tidak rusak.');
        setFileName('');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/items/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: validRows.map((r) => ({
            itemCode: r.itemCode, tsCode: r.tsCode, msCode: r.msCode, nama: r.nama,
            kategori: r.kategori, binLoc: r.binLoc, uom: r.uom,
            stok: r.stok, safetyStok: r.safetyStok,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal import'); return; }
      setResult(data);
      if ((data.inserted ?? 0) > 0 || (data.updated ?? 0) > 0) onImported();
    } catch {
      toast.error('Terjadi kesalahan saat import');
    } finally {
      setImporting(false);
    }
  };

  // Diff summary counts (only valid rows)
  const diffCounts = { new: 0, updated: 0, unchanged: 0 };
  if (diffMap.size > 0) {
    for (const r of validRows) {
      const d = diffMap.get(r.itemCode);
      if (d) diffCounts[d.status]++;
    }
  }

  const DiffBadge = ({ itemCode, hasError }: { itemCode: string; hasError: boolean }) => {
    if (hasError) return (
      <span className="text-red-600 font-medium flex items-center gap-1">
        <AlertCircle className="w-3 h-3 shrink-0" />Error
      </span>
    );
    if (diffLoading) return <span className="text-slate-400 text-xs">...</span>;
    const d = diffMap.get(itemCode);
    if (!d) return <span className="text-slate-400 text-xs">—</span>;
    if (d.status === 'new') return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium whitespace-nowrap">
        ✦ Baru
      </span>
    );
    if (d.status === 'updated') return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium whitespace-nowrap cursor-help"
        title={`Berubah: ${d.changedFields.join(', ')}`}
      >
        🔄 Diperbarui
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-xs font-medium whitespace-nowrap">
        — Sama
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Import Barang dari Excel
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">

          {/* Result summary */}
          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-1">
              <p className="font-semibold text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Import selesai
              </p>
              {result.inserted > 0 && <p className="text-sm text-green-700">✅ {result.inserted} barang baru ditambahkan</p>}
              {result.updated > 0 && <p className="text-sm text-blue-700">🔄 {result.updated} barang diperbarui</p>}
              {result.unchanged > 0 && <p className="text-sm text-slate-500">— {result.unchanged} barang tidak ada perubahan</p>}
              {result.inserted === 0 && result.updated === 0 && result.unchanged > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">Semua data sudah sinkron, tidak ada yang perlu diubah.</p>
              )}
              {result.errors.length > 0 && <p className="text-sm text-red-700">❌ {result.errors.length} gagal disimpan</p>}
            </div>
          )}

          {/* Template download */}
          <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Belum punya template?</p>
              <p className="text-xs text-muted-foreground">Download lalu isi sesuai format, kemudian upload kembali.</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="shrink-0 gap-1.5">
              <Download className="w-3.5 h-3.5" /> Template
            </Button>
          </div>

          {/* Drop zone */}
          {!fileName ? (
            <div
              className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-slate-400" />
              <div className="text-center">
                <p className="font-medium text-slate-700">Klik atau seret file ke sini</p>
                <p className="text-xs text-muted-foreground mt-0.5">Format: .xlsx, .xls, .csv — Maks. 1.000 baris</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {rows.length} baris terbaca &middot;
                    <span className="text-green-700"> {validRows.length} valid</span>
                    {invalidCount > 0 && <span className="text-red-600"> &middot; {invalidCount} error</span>}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-500" onClick={reset}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-700">Preview Data</p>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertCircle className="w-3 h-3" /> {invalidCount} baris bermasalah
                  </Badge>
                )}
                {diffLoading && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Mengecek perubahan...
                  </span>
                )}
                {!diffLoading && diffMap.size > 0 && !result && (
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    {diffCounts.new > 0 && <span className="text-green-700 font-medium">✦ {diffCounts.new} baru</span>}
                    {diffCounts.updated > 0 && <span className="text-blue-700 font-medium">🔄 {diffCounts.updated} berubah</span>}
                    {diffCounts.unchanged > 0 && <span className="text-slate-400">— {diffCounts.unchanged} sama</span>}
                  </span>
                )}
              </div>
              <div className="rounded-md border overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">#</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">MS Code</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">TS Code</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap min-w-[180px]">Nama Barang</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">Kategori</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">BIN LOC</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">UOM</th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-600 whitespace-nowrap">Stok</th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-600 whitespace-nowrap">Safety</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.filter((r) => {
                      if (diffMap.size === 0 || diffLoading) return true;
                      const d = diffMap.get(r.itemCode);
                      return r.errors.length > 0 || !d || d.status !== 'unchanged';
                    }).map((r) => {
                      const diff = diffMap.get(r.itemCode);
                      const rowBg = r.errors.length > 0
                        ? 'bg-red-50'
                        : diff?.status === 'new' ? 'bg-green-50/40'
                        : diff?.status === 'updated' ? 'bg-blue-50/40'
                        : '';
                      return (
                        <tr key={r.rowNum} className={rowBg}>
                          <td className="px-2 py-1.5 text-muted-foreground">{r.rowNum}</td>
                          <td className="px-2 py-1.5 font-mono font-medium">{r.itemCode || <span className="text-red-500 italic">kosong</span>}</td>
                          <td className="px-2 py-1.5 font-mono">{r.tsCode ?? '—'}</td>
                          <td className="px-2 py-1.5 max-w-[220px] truncate">{r.nama || <span className="text-red-500 italic">kosong</span>}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{r.kategori || <span className="text-red-500 italic">kosong</span>}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap font-mono">{r.binLoc ?? '—'}</td>
                          <td className="px-2 py-1.5">{r.uom}</td>
                          <td className={`px-2 py-1.5 text-right ${diff?.changedFields.includes('Stok') ? 'text-blue-700 font-semibold' : ''}`}>{r.stok}</td>
                          <td className={`px-2 py-1.5 text-right ${diff?.changedFields.includes('Safety Stok') ? 'text-blue-700 font-semibold' : ''}`}>{r.safetyStok}</td>
                          <td className="px-2 py-1.5">
                            <DiffBadge itemCode={r.itemCode} hasError={r.errors.length > 0} />
                            {r.errors.length > 0 && (
                              <span className="block text-red-500 text-xs mt-0.5">{r.errors[0]}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!diffLoading && diffMap.size > 0 && diffCounts.new === 0 && diffCounts.updated === 0 && invalidCount === 0 && (
                <p className="text-xs text-slate-400 text-center py-1">
                  Semua data sudah sinkron — tidak ada yang perlu diperbarui.
                </p>
              )}
              {invalidCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Baris yang bermasalah akan dilewati. Hanya <strong>{validRows.length} baris valid</strong> yang akan diimport.
                </p>
              )}
              {!diffLoading && diffMap.size > 0 && diffCounts.updated > 0 && (
                <p className="text-xs text-muted-foreground">
                  💡 Hover badge <strong>🔄 Diperbarui</strong> untuk melihat field mana yang berubah.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t gap-2">
          <Button variant="outline" onClick={handleClose} disabled={importing}>Tutup</Button>
          {!result && validRows.length > 0 && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengimport...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Import {validRows.length} Barang</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
