import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';

interface ParsedRow {
  rowNum: number;
  tsCode: string;
  msCode?: string;
  nama: string;
  kategori: string;
  binLoc?: string;
  uom: string;
  stok: number;
  safetyStok: number;
  errors: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  token: string | null;
  onImported: () => void;
}

const REQUIRED_COLS = ['TS Code', 'Nama Barang', 'Kategori'];
const ALL_COLS = ['TS Code', 'MS Code', 'Nama Barang', 'Kategori', 'BIN LOC', 'UOM', 'Stok', 'Safety Stok'];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findCol(headers: string[], target: string): number {
  const t = normalizeHeader(target);
  return headers.findIndex((h) => normalizeHeader(h) === t);
}

function cellStr(row: Record<string, unknown>, idx: number): string {
  const keys = Object.keys(row);
  const key = keys[idx];
  if (key === undefined) return '';
  const val = row[key];
  return val == null ? '' : String(val).trim();
}

function parseRows(sheet: XLSX.WorkSheet): ParsedRow[] {
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
  if (json.length < 2) return [];

  const headerRow = (json[0] as string[]).map(String);
  const colIdx: Record<string, number> = {};
  for (const col of ALL_COLS) {
    colIdx[col] = findCol(headerRow, col);
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < json.length; i++) {
    const raw = json[i] as Record<string, unknown>;
    if (!raw || Object.values(raw).every((v) => v == null || String(v).trim() === '')) continue;

    const get = (col: string) => {
      const idx = colIdx[col];
      if (idx < 0 || idx === undefined) return '';
      const arr = raw as unknown[];
      const val = arr[idx];
      return val == null ? '' : String(val).trim();
    };

    const getNum = (col: string, def: number) => {
      const v = get(col);
      if (v === '') return def;
      const n = Number(v);
      return isNaN(n) ? NaN : Math.floor(n);
    };

    const errors: string[] = [];
    const tsCode = get('TS Code');
    const nama = get('Nama Barang');
    const kategori = get('Kategori');
    const stok = getNum('Stok', 0);
    const safetyStok = getNum('Safety Stok', 5);

    if (!tsCode) errors.push('TS Code kosong');
    if (!nama) errors.push('Nama Barang kosong');
    if (!kategori) errors.push('Kategori kosong');
    if (isNaN(stok)) errors.push('Stok harus angka');
    if (isNaN(safetyStok)) errors.push('Safety Stok harus angka');

    rows.push({
      rowNum: i + 1,
      tsCode,
      msCode: get('MS Code') || undefined,
      nama,
      kategori,
      binLoc: get('BIN LOC') || undefined,
      uom: get('UOM') || 'EA',
      stok: isNaN(stok) ? 0 : stok,
      safetyStok: isNaN(safetyStok) ? 5 : safetyStok,
      errors,
    });
  }
  return rows;
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ALL_COLS,
    ['10001', '123456', 'Baut M10 x 30mm', 'Mechanical Material', 'A-01-01', 'PCS', 100, 20],
    ['10002', '123457', 'Oli Mesin SAE 40', 'Consumables', 'B-02-03', 'LTR', 50, 10],
  ]);
  ws['!cols'] = ALL_COLS.map((_, i) => ({ wch: i === 2 ? 35 : 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template_import_barang.xlsx');
}

export function ImportExcelModal({ open, onClose, token, onImported }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors: { tsCode: string; reason: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setFileName('');
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv');
      return;
    }
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed = parseRows(ws);
        if (parsed.length === 0) {
          toast.error('File kosong atau format kolom tidak sesuai template');
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

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidCount = rows.length - validRows.length;

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/items/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: validRows.map((r) => ({
            tsCode: r.tsCode,
            msCode: r.msCode,
            nama: r.nama,
            kategori: r.kategori,
            binLoc: r.binLoc,
            uom: r.uom,
            stok: r.stok,
            safetyStok: r.safetyStok,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal import'); return; }
      setResult(data);
      if (data.inserted > 0) onImported();
    } catch {
      toast.error('Terjadi kesalahan saat import');
    } finally {
      setImporting(false);
    }
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
              <p className="text-sm text-green-700">✅ {result.inserted} barang berhasil ditambahkan</p>
              {result.skipped > 0 && <p className="text-sm text-amber-700">⏭ {result.skipped} dilewati (TS Code sudah ada)</p>}
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
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-700">Preview Data</p>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertCircle className="w-3 h-3" /> {invalidCount} baris bermasalah
                  </Badge>
                )}
              </div>
              <div className="rounded-md border overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">#</th>
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
                    {rows.map((r) => (
                      <tr key={r.rowNum} className={r.errors.length > 0 ? 'bg-red-50' : ''}>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.rowNum}</td>
                        <td className="px-2 py-1.5 font-mono font-medium">{r.tsCode || <span className="text-red-500 italic">kosong</span>}</td>
                        <td className="px-2 py-1.5 max-w-[220px] truncate">{r.nama || <span className="text-red-500 italic">kosong</span>}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.kategori || <span className="text-red-500 italic">kosong</span>}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap font-mono">{r.binLoc ?? '—'}</td>
                        <td className="px-2 py-1.5">{r.uom}</td>
                        <td className="px-2 py-1.5 text-right">{r.stok}</td>
                        <td className="px-2 py-1.5 text-right">{r.safetyStok}</td>
                        <td className="px-2 py-1.5">
                          {r.errors.length > 0 ? (
                            <span className="text-red-600 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {r.errors[0]}
                            </span>
                          ) : (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {invalidCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Baris yang bermasalah akan dilewati. Hanya <strong>{validRows.length} baris valid</strong> yang akan diimport.
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
