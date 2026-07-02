import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { useAppContext, Item } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, Plus, Printer, FileX, CalendarDays,
  Loader2, AlertTriangle, Wrench, Settings2, ClipboardList,
  ArrowLeft, Trash2, PackagePlus, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { QrScannerDialog } from '@/components/QrScannerDialog';
import { BinItemSelectDialog } from '@/components/BinItemSelectDialog';

/* ─── Types ─── */
interface TransaksiKeluar {
  id: number;
  nomor: string;
  groupId: string | null;
  jumlah: number;
  tanggal: string;
  maintenanceOrder: string | null;
  functionalLocation: string | null;
  equipment: string | null;
  movementType: string | null;
  orderType: string | null;
  activityType: string | null;
  createdAt: string;
  itemCode: string;
  namaBarang: string;
  uom: string;
  binLoc: string | null;
  petugas: string;
  petugasNik: string;
}

interface ReservationGroup {
  groupId: string;
  nomor: string;
  tanggal: string;
  maintenanceOrder: string | null;
  functionalLocation: string | null;
  equipment: string | null;
  movementType: string | null;
  orderType: string | null;
  activityType: string | null;
  petugas: string;
  petugasNik: string;
  items: TransaksiKeluar[];
}

interface LineItem {
  id: string;
  selectedItem: Item | null;
  jumlah: string;
  searchText: string;
  showSuggestions: boolean;
}

interface PrintLineItem {
  no: number;
  itemCode: string;
  namaBarang: string;
  uom: string;
  binLoc?: string | null;
  qtyOnHand: number;
  qtyIssued: number;
}

interface PrintPayload {
  reservationNo: string;
  tanggal: string;
  petugasNama: string;
  petugasNik: string;
  maintenanceOrder?: string;
  functionalLocation?: string;
  equipment?: string;
  movementType?: string;
  orderType?: string;
  activityType?: string;
  lineItems: PrintLineItem[];
  logoUrl: string;
}

/* ─── UUID generator ─── */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ─── Group flat rows by groupId ─── */
function groupTransaksi(rows: TransaksiKeluar[]): ReservationGroup[] {
  const map = new Map<string, ReservationGroup>();
  for (const row of rows) {
    const key = row.groupId ?? row.nomor;
    if (!map.has(key)) {
      map.set(key, {
        groupId: key,
        nomor: row.nomor,
        tanggal: row.tanggal,
        maintenanceOrder: row.maintenanceOrder,
        functionalLocation: row.functionalLocation,
        equipment: row.equipment,
        movementType: row.movementType,
        orderType: row.orderType,
        activityType: row.activityType,
        petugas: row.petugas,
        petugasNik: row.petugasNik,
        items: [],
      });
    }
    map.get(key)!.items.push(row);
  }
  return Array.from(map.values());
}

/* ─── PDF printer ─── */
function printReservationList(d: PrintPayload) {
  const tglCetak = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const jamCetak = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const tglDoc = new Date(d.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const infoRow = (label: string, value: string) =>
    `<div class="info-row"><span class="lbl">${label}</span><span class="colon">:</span><span class="val">${value || '—'}</span></div>`;

  const tableRows = d.lineItems.map((item) => `
    <tr>
      <td class="center">${item.no}</td>
      <td class="center mono">${item.itemCode}</td>
      <td>${item.namaBarang}</td>
      <td class="center">${item.uom}</td>
      <td class="center">${item.qtyOnHand}</td>
      <td class="center">${item.qtyIssued}</td>
      <td class="center">${item.qtyIssued}</td>
      <td class="center mono">${item.binLoc || '—'}</td>
      <td></td><td></td><td></td>
      <td></td>
      <td></td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Reservation List — ${d.reservationNo}</title>
<style>
  @page { size: A4 landscape; margin: 8mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #111; }
  .doc-body  { border: 1px solid #999; border-radius: 4px; padding: 0; margin-bottom: 6px; overflow: hidden; }
  .doc-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #999; padding: 7px 10px; }
  .co-block { display: flex; align-items: center; gap: 8px; }
  .co-logo  { height: 32px; width: auto; display: block; }
  .co-name  { font-size: 9.5pt; font-weight: 700; color: #1B3A2D; }
  .doc-body-title { font-size: 13pt; font-weight: 700; color: #1B3A2D; text-align: center; text-transform: uppercase; letter-spacing: .5px; }
  .doc-inner { padding: 8px 10px; }
  .doc-footer-row { border-top: 1px solid #999; padding: 4px 10px; font-size: 7pt; color: #888; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 24px; margin-bottom: 8px; }
  .info-row  { display: flex; gap: 0; font-size: 8pt; line-height: 1.6; }
  .lbl  { min-width: 138px; font-weight: 600; color: #333; }
  .colon{ margin: 0 4px; color: #666; }
  .val  { color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 7.8pt; }
  thead tr { background: #1B3A2D; color: #fff; }
  th { padding: 4px 5px; border: 1px solid #999; text-align: center; font-weight: 600; white-space: nowrap; }
  td { padding: 4px 5px; border: 1px solid #999; vertical-align: middle; }
  tbody tr:nth-child(even) td { background: #f4f8f5; }
  .center { text-align: center; }
  .mono { font-family: Courier New, monospace; }
  .sigs { display: grid; grid-template-columns: 1fr 1fr 1fr; margin-top: 16px; gap: 0; }
  .sig  { padding: 4px 12px 4px 0; display: flex; flex-direction: column; }
  .sig-title { font-size: 8pt; font-weight: 700; color: #111; margin-bottom: 2px; }
  .sig-space { min-height: 58px; }
  .sig-area  { display: none; }
  .sig-info  { font-size: 7.8pt; color: #111; line-height: 2.1; }
  .sig-info .sig-row { display: flex; gap: 0; align-items: baseline; }
  .sig-info .sig-lbl { min-width: 40px; color: #111; }
  .sig-info .sig-colon { margin: 0 3px; }
  .sig-info .sig-val { border-bottom: 1px solid #555; flex: 1; min-height: 11px; padding-left: 2px; }
  .footer { display: none; }
</style>
</head>
<body>
<div class="doc-body">
<div class="doc-header">
  <div class="co-block">
    <img class="co-logo" src="${d.logoUrl}" alt="TeL Logo" onerror="this.style.display='none'" />
    <div class="co-name">PT TANJUNGENIM LESTARI PULP AND PAPER</div>
  </div>
  <div class="doc-body-title">Reservation List</div>
  <div style="min-width:180px"></div>
</div>
<div class="doc-inner">
<div class="info-grid">
  ${infoRow('Reservation No', d.reservationNo)}
  ${infoRow('Movement Type', d.movementType || '')}
  ${infoRow('Date', tglDoc)}
  ${infoRow('Order Type', d.orderType || '')}
  ${infoRow('Maintenance Order', d.maintenanceOrder || '')}
  ${infoRow('Activity Type', d.activityType || '')}
  ${infoRow('Functional Location', d.functionalLocation || '')}
  ${infoRow('Equipment', d.equipment || '')}
</div>

<table>
  <thead>
    <tr>
      <th style="width:24px">No</th>
      <th style="width:68px">Item Code</th>
      <th>Nama Barang / Description</th>
      <th style="width:34px">UOM</th>
      <th style="width:52px">Qty<br>On Hand</th>
      <th style="width:52px">Qty<br>Reserved</th>
      <th style="width:52px">Qty<br>Issued</th>
      <th style="width:74px">Location<br>(BIN LOC)</th>
      <th style="width:60px">Valuation<br>Type</th>
      <th style="width:50px">Stock<br>Indicator</th>
      <th style="width:60px">Serial<br>Number</th>
      <th style="width:72px">Department</th>
      <th style="width:68px">Last Issue /<br>Quantity</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
    <tr><td colspan="13" style="height:16px; border-color:#e5e7eb; background:#fff;"></td></tr>
  </tbody>
</table>

<div class="sigs">
  <div class="sig">
    <div class="sig-title">Requested by:</div>
    <div class="sig-space"></div>
    <div class="sig-area"></div>
    <div class="sig-info">
      <div class="sig-row"><span class="sig-lbl">Name</span><span class="sig-colon">:</span><span class="sig-val">${d.petugasNama}</span></div>
      <div class="sig-row"><span class="sig-lbl">NIK</span><span class="sig-colon">:</span><span class="sig-val">${d.petugasNik}</span></div>
      <div class="sig-row"><span class="sig-lbl">Date</span><span class="sig-colon">:</span><span class="sig-val">${tglDoc}</span></div>
    </div>
  </div>
  <div class="sig">
    <div class="sig-title">Approved by:</div>
    <div class="sig-space"></div>
    <div class="sig-area"></div>
    <div class="sig-info">
      <div class="sig-row"><span class="sig-lbl">Name</span><span class="sig-colon">:</span><span class="sig-val"></span></div>
      <div class="sig-row"><span class="sig-lbl">NIK</span><span class="sig-colon">:</span><span class="sig-val"></span></div>
      <div class="sig-row"><span class="sig-lbl">Date</span><span class="sig-colon">:</span><span class="sig-val"></span></div>
    </div>
  </div>
  <div class="sig">
    <div class="sig-title">Received by:</div>
    <div class="sig-space"></div>
    <div class="sig-area"></div>
    <div class="sig-info">
      <div class="sig-row"><span class="sig-lbl">Name</span><span class="sig-colon">:</span><span class="sig-val"></span></div>
      <div class="sig-row"><span class="sig-lbl">NIK</span><span class="sig-colon">:</span><span class="sig-val"></span></div>
      <div class="sig-row"><span class="sig-lbl">Date</span><span class="sig-colon">:</span><span class="sig-val"></span></div>
    </div>
  </div>
</div>
</div>
</div>
<div class="doc-footer-row">Dicetak: ${tglCetak} ${jamCetak} &nbsp;|&nbsp; Petugas: ${d.petugasNama}</div>
</div>

<div class="footer"></div>

<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=1100,height=780');
  if (!w) { alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak.'); return; }
  w.document.write(html);
  w.document.close();
}

/* ─── Constants ─── */

function formatTgl(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const newLineItem = (): LineItem => ({
  id: Math.random().toString(36).slice(2),
  selectedItem: null,
  jumlah: '',
  searchText: '',
  showSuggestions: false,
});

const defaultShared = () => ({
  tanggal: new Date().toISOString().split('T')[0],
  maintenanceOrder: '',
  functionalLocation: '',
  equipment: '',
  movementType: '261',
  orderType: 'PM01',
  activityType: 'Corrective',
});

/* ─── Item Row Component ─── */
function ItemRow({
  line, index, allItems, onUpdate, onRemove, canRemove, onQrScan,
}: {
  line: LineItem; index: number; allItems: Item[];
  onUpdate: (patch: Partial<LineItem>) => void;
  onRemove: () => void; canRemove: boolean; onQrScan: () => void;
}) {
  const suggestions = allItems.filter((item) => {
    if (line.searchText.length < 2) return false;
    const q = line.searchText.toLowerCase();
    return (
      item.nama.toLowerCase().includes(q) ||
      item.itemCode.toLowerCase().includes(q) ||
      (item.tsCode ?? '').toLowerCase().includes(q) ||
      (item.binLoc ?? '').toLowerCase().includes(q)
    );
  }).slice(0, 8);

  const jumlahInt = parseInt(line.jumlah) || 0;
  const isOver = line.selectedItem ? jumlahInt > line.selectedItem.stok : false;

  return (
    <div className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
      <span className="text-xs font-bold text-muted-foreground bg-white border border-slate-200 rounded w-6 h-6 flex items-center justify-center shrink-0 mt-1.5">
        {index + 1}
      </span>

      <div className="flex-1 flex flex-col gap-2">
        {!line.selectedItem ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau Item Code..."
                className="pl-8 h-9 text-sm"
                value={line.searchText}
                onChange={(e) => onUpdate({ searchText: e.target.value, showSuggestions: true })}
                onFocus={() => onUpdate({ showSuggestions: true })}
                onBlur={() => setTimeout(() => onUpdate({ showSuggestions: false }), 150)}
              />
              {line.showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-0.5 bg-white border rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                  {suggestions.map((item) => (
                    <button key={item.itemCode}
                      disabled={item.stok === 0}
                      className={`w-full px-3 py-2 flex justify-between items-center border-b last:border-0 text-left text-sm transition-colors ${item.stok === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                      onMouseDown={() => {
                        if (item.stok > 0) onUpdate({ selectedItem: item, searchText: '', showSuggestions: false });
                      }}>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.nama}</p>
                        <p className="text-xs font-mono text-slate-400">{item.itemCode}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {item.binLoc && <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">{item.binLoc}</span>}
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${item.stok === 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100'}`}>{item.stok}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Scan QR" onClick={onQrScan}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h3v-3M17 17v3"/>
              </svg>
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <div className="flex-1 bg-white border border-primary/20 rounded-md px-3 py-1.5 min-h-9 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-xs truncate">{line.selectedItem.nama}</p>
                <p className="text-[10px] font-mono text-slate-400">
                  {line.selectedItem.itemCode} · Stok: {line.selectedItem.stok} {line.selectedItem.uom}
                </p>
              </div>
              <button className="text-[10px] text-slate-300 hover:text-red-400 transition-colors shrink-0"
                onClick={() => onUpdate({ selectedItem: null })} title="Ganti barang">✕</button>
            </div>
            <div className="flex flex-col gap-0.5 shrink-0">
              <Input
                type="number" min="1"
                placeholder="Qty"
                className={`w-24 h-9 text-sm font-bold text-center ${isOver ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                value={line.jumlah}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '');
                  onUpdate({ jumlah: v });
                }}
              />
              {isOver && (
                <p className="text-[10px] text-red-500 flex items-center gap-0.5 whitespace-nowrap">
                  <AlertTriangle className="h-2.5 w-2.5" />Maks {line.selectedItem?.stok}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground w-8 shrink-0">{line.selectedItem?.uom || '—'}</span>
          </div>
        )}
      </div>

      {canRemove ? (
        <button onClick={onRemove} className="text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-2" title="Hapus baris">
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <div className="w-4 shrink-0" />
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function ReservationList() {
  const { items, setItems, token, currentUser } = useAppContext();
  const canEdit = currentUser?.role !== 'petugas';

  const [data, setData] = useState<TransaksiKeluar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'form'>('list');

  const [shared, setShared] = useState(defaultShared());
  const [lineItems, setLineItems] = useState<LineItem[]>([newLineItem()]);

  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [binSelectOpen, setBinSelectOpen] = useState(false);
  const [binSelectLoc, setBinSelectLoc] = useState('');
  const [binSelectItems, setBinSelectItems] = useState<Item[]>([]);

  const logoUrl = `${window.location.origin}/tel-logo.png`;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/transaksi-keluar', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setData(await res.json());
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateLine = (id: string, patch: Partial<LineItem>) =>
    setLineItems((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
  const addLine = () => setLineItems((prev) => [...prev, newLineItem()]);
  const removeLine = (id: string) => setLineItems((prev) => prev.filter((l) => l.id !== id));

  const resetForm = () => { setShared(defaultShared()); setLineItems([newLineItem()]); };
  const openForm = () => { resetForm(); setView('form'); };
  const cancelForm = () => { resetForm(); setView('list'); };

  const handleQrScan = (scanned: string) => {
    let resolvedItem: Item | null = null;
    let resolvedBinLoc: string | null = null;
    if (scanned.includes('/bin/')) {
      try {
        const pathPart = scanned.includes('://') ? new URL(scanned).pathname : scanned;
        const binLoc = decodeURIComponent(pathPart.split('/bin/')[1] ?? '').trim();
        if (binLoc) {
          const binItems = items.filter((i) => i.binLoc === binLoc);
          if (binItems.length === 0) { toast.error(`Tidak ada barang di BIN LOC "${binLoc}"`); return; }
          if (binItems.length === 1) { resolvedItem = binItems[0]; }
          else { resolvedBinLoc = binLoc; setBinSelectLoc(binLoc); setBinSelectItems(binItems); setBinSelectOpen(true); return; }
        }
      } catch { /* lanjut */ }
    }
    if (!resolvedItem) {
      resolvedItem = items.find((i) => i.itemCode === scanned) ?? null;
      if (!resolvedItem) { toast.error(`Barang "${scanned}" tidak ditemukan`); return; }
    }
    setQrOpen(false);
    if (activeLineId) {
      updateLine(activeLineId, { selectedItem: resolvedItem, searchText: '', showSuggestions: false });
      toast.success(`Terdeteksi: ${resolvedItem.nama}`);
    }
  };

  const handleBinSelect = (item: Item) => {
    if (activeLineId) {
      updateLine(activeLineId, { selectedItem: item, searchText: '', showSuggestions: false });
      toast.success(`Dipilih dari BIN ${binSelectLoc}: ${item.nama}`);
    }
    setBinSelectOpen(false);
  };

  const handleSimpan = async () => {
    const validLines = lineItems.filter((l) => l.selectedItem && parseInt(l.jumlah) > 0);
    if (validLines.length === 0) { toast.error('Tambahkan minimal 1 item dengan jumlah yang valid'); return; }
    const overStok = validLines.find((l) => parseInt(l.jumlah) > (l.selectedItem?.stok ?? 0));
    if (overStok) { toast.error(`Stok ${overStok.selectedItem?.nama} tidak mencukupi`); return; }

    setSaving(true);
    const groupId = generateUUID();

    try {
      const results: { nomor: string; stokBaru: number; itemCode: string; status: string }[] = [];

      for (const line of validLines) {
        const res = await fetch('/api/transaksi-keluar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            itemCode: line.selectedItem!.itemCode,
            jumlah: parseInt(line.jumlah),
            tanggal: shared.tanggal,
            maintenanceOrder: shared.maintenanceOrder || undefined,
            functionalLocation: shared.functionalLocation || undefined,
            equipment: shared.equipment || undefined,
            movementType: shared.movementType || undefined,
            orderType: shared.orderType || undefined,
            activityType: shared.activityType || undefined,
            groupId,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(`${line.selectedItem?.nama}: ${err.message ?? 'Gagal menyimpan'}`);
          setSaving(false);
          return;
        }
        results.push(await res.json());
      }

      // Update stok di context
      const updatedItems = [...items];
      for (let i = 0; i < validLines.length; i++) {
        const idx = updatedItems.findIndex((it) => it.itemCode === validLines[i].selectedItem!.itemCode);
        if (idx >= 0) updatedItems[idx] = { ...updatedItems[idx], stok: results[i].stokBaru };
      }
      setItems(updatedItems);

      // Cetak PDF
      printReservationList({
        reservationNo: results[0].nomor,
        tanggal: shared.tanggal,
        petugasNama: currentUser?.namaLengkap ?? currentUser?.email ?? '',
        petugasNik: currentUser?.nik ?? '',
        maintenanceOrder: shared.maintenanceOrder || undefined,
        functionalLocation: shared.functionalLocation || undefined,
        equipment: shared.equipment || undefined,
        movementType: shared.movementType || undefined,
        orderType: shared.orderType || undefined,
        activityType: shared.activityType || undefined,
        logoUrl,
        lineItems: validLines.map((line, i) => ({
          no: i + 1,
          itemCode: line.selectedItem!.itemCode,
          namaBarang: line.selectedItem!.nama,
          uom: line.selectedItem!.uom,
          binLoc: line.selectedItem!.binLoc,
          qtyOnHand: results[i].stokBaru + parseInt(line.jumlah),
          qtyIssued: parseInt(line.jumlah),
        })),
      });

      resetForm();
      setView('list');
      await fetchData();
      toast.success(`${validLines.length} item disimpan & dicetak`);
    } catch {
      toast.error('Gagal terhubung ke server');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Grouping & filtering ─── */
  const groups = groupTransaksi(data);
  const filtered = groups.filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.nomor.toLowerCase().includes(q) ||
      g.items.some((i) => i.namaBarang.toLowerCase().includes(q) || i.itemCode.toLowerCase().includes(q)) ||
      (g.maintenanceOrder ?? '').toLowerCase().includes(q)
    );
  });

  const printGroup = (g: ReservationGroup) => {
    printReservationList({
      reservationNo: g.nomor,
      tanggal: g.tanggal,
      petugasNama: g.petugas,
      petugasNik: g.petugasNik,
      maintenanceOrder: g.maintenanceOrder ?? undefined,
      functionalLocation: g.functionalLocation ?? undefined,
      equipment: g.equipment ?? undefined,
      movementType: g.movementType ?? undefined,
      orderType: g.orderType ?? undefined,
      activityType: g.activityType ?? undefined,
      logoUrl,
      lineItems: g.items.map((item, i) => ({
        no: i + 1,
        itemCode: item.itemCode,
        namaBarang: item.namaBarang,
        uom: item.uom,
        binLoc: item.binLoc,
        qtyOnHand: 0,
        qtyIssued: item.jumlah,
      })),
    });
  };

  /* ─── FORM VIEW ─── */
  if (view === 'form') {
    return (
      <Layout title="Reservation List">
        <div className="flex flex-col gap-5">
          {/* Header baris */}
          <div className="flex items-center justify-between">
            <button onClick={cancelForm}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-800 transition-colors">
              <ArrowLeft className="h-4 w-4" />Kembali ke daftar
            </button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={cancelForm} disabled={saving}>Batal</Button>
              <Button onClick={handleSimpan} disabled={saving}>
                {saving
                  ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Menyimpan...</>
                  : <><Printer className="h-4 w-4 mr-1.5" />Simpan &amp; Cetak PDF</>}
              </Button>
            </div>
          </div>

          {/* Judul */}
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />Buat Reservation List Baru
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Isi data di bawah lalu simpan — PDF akan dicetak otomatis</p>
          </div>

          {/* Info Umum + SAP dalam satu card grid 2 kolom */}
          <Card className="border-slate-100 shadow-sm">
            <CardContent className="pt-5 space-y-5">
              {/* Baris 1: Tanggal */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />Tanggal <span className="text-red-500">*</span>
                  </Label>
                  <Input type="date" value={shared.tanggal} onChange={(e) => setShared({ ...shared, tanggal: e.target.value })} />
                </div>
              </div>

              {/* SAP Fields */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5" />Info SAP / Maintenance
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Movement Type</Label>
                    <Select value={shared.movementType} onValueChange={(v) => setShared({ ...shared, movementType: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="261">261 — GI for Order</SelectItem>
                        <SelectItem value="281">281 — GI for Network</SelectItem>
                        <SelectItem value="201">201 — GI for Cost Center</SelectItem>
                        <SelectItem value="291">291 — GI for Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Order Type</Label>
                    <Select value={shared.orderType} onValueChange={(v) => setShared({ ...shared, orderType: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PM01">PM01 — Corrective Maint.</SelectItem>
                        <SelectItem value="PM02">PM02 — Preventive Maint.</SelectItem>
                        <SelectItem value="PM03">PM03 — Inspection</SelectItem>
                        <SelectItem value="PM04">PM04 — Rebuild/Refurb</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Activity Type</Label>
                    <Select value={shared.activityType} onValueChange={(v) => setShared({ ...shared, activityType: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Corrective">Corrective</SelectItem>
                        <SelectItem value="Preventive">Preventive</SelectItem>
                        <SelectItem value="Predictive">Predictive</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Settings2 className="h-3 w-3" />Maintenance Order No
                    </Label>
                    <Input className="h-8 text-sm" placeholder="MO-2026-001"
                      value={shared.maintenanceOrder} onChange={(e) => setShared({ ...shared, maintenanceOrder: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Functional Location</Label>
                    <Input className="h-8 text-sm" placeholder="TL-AREA-C"
                      value={shared.functionalLocation} onChange={(e) => setShared({ ...shared, functionalLocation: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Equipment No</Label>
                    <Input className="h-8 text-sm" placeholder="EQ-001"
                      value={shared.equipment} onChange={(e) => setShared({ ...shared, equipment: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <PackagePlus className="h-3.5 w-3.5" />Daftar Barang
                  <span className="font-normal normal-case text-slate-400">({lineItems.length} item)</span>
                </p>
                <div className="space-y-2">
                  {lineItems.map((line, index) => (
                    <ItemRow
                      key={line.id} line={line} index={index} allItems={items}
                      onUpdate={(patch) => updateLine(line.id, patch)}
                      onRemove={() => removeLine(line.id)}
                      canRemove={lineItems.length > 1}
                      onQrScan={() => { setActiveLineId(line.id); setQrOpen(true); }}
                    />
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm"
                  className="w-full border-dashed text-muted-foreground h-9" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Tambah Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer tombol */}
          <div className="flex gap-3 justify-end pb-6">
            <Button variant="outline" onClick={cancelForm} disabled={saving}>Batal</Button>
            <Button onClick={handleSimpan} disabled={saving}>
              {saving
                ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Menyimpan...</>
                : <><Printer className="h-4 w-4 mr-1.5" />Simpan &amp; Cetak PDF</>}
            </Button>
          </div>
        </div>

        <QrScannerDialog open={qrOpen} onOpenChange={setQrOpen} onScan={handleQrScan} title="Scan QR" />
        <BinItemSelectDialog
          open={binSelectOpen} binLoc={binSelectLoc} items={binSelectItems}
          onSelect={handleBinSelect} onClose={() => setBinSelectOpen(false)} />
      </Layout>
    );
  }

  /* ─── LIST VIEW ─── */
  return (
    <Layout title="Reservation List">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nomor, barang, MO..."
              className="pl-9 bg-white h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canEdit && (
            <Button className="w-full sm:w-auto h-9" onClick={openForm}>
              <Plus className="h-4 w-4 mr-1.5" />Buat Reservation List
            </Button>
          )}
        </div>

        <Card className="overflow-hidden border-slate-100 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-100">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-36">Nomor</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-28">Tanggal</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">Barang</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-24">Qty Total</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-32">MO No.</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-28">Order Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-28">Petugas</TableHead>
                  <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Cetak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-56 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <FileX className="h-10 w-10 text-slate-200" />
                        <p className="font-medium text-slate-500">Belum ada Reservation List</p>
                        <p className="text-sm text-slate-400">Klik "Buat Reservation List" untuk membuat dokumen pertama</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((group) => (
                    <TableRow key={group.groupId} className="hover:bg-slate-50 border-b border-slate-50">
                      <TableCell className="font-mono text-xs text-slate-600">{group.nomor}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatTgl(group.tanggal)}</TableCell>
                      <TableCell>
                        {group.items.length === 1 ? (
                          <div>
                            <p className="font-medium text-sm text-slate-800 truncate max-w-xs">{group.items[0].namaBarang}</p>
                            <p className="text-xs font-mono text-slate-400">{group.items[0].itemCode}</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {group.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-2">
                                <Package className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-700 truncate max-w-[220px]">{item.namaBarang}</span>
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">{item.jumlah} {item.uom}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {group.items.length === 1 ? (
                          <span className="font-bold text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded text-sm font-mono">
                            {group.items[0].jumlah} {group.items[0].uom}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                            {group.items.length} item
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{group.maintenanceOrder || '—'}</TableCell>
                      <TableCell>
                        {group.orderType
                          ? <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">{group.orderType}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{group.petugas}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5"
                          title="Cetak Reservation List"
                          onClick={() => printGroup(group)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
