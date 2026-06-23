import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Item } from '@/context/AppContext';

interface KategoriOption { id: number; nama: string; }

interface TrxRow {
  nomor: string;
  createdAt: string;
  jumlah: number;
  petugas: string;
  jenis: 'Masuk' | 'Keluar';
}

export type SheetType = 'detail' | 'edit' | 'qr';

interface Props {
  canPrint?: boolean;
  type: SheetType | null;
  item: Item | null;
  token: string | null;
  kategoris: KategoriOption[];
  onClose: () => void;
  onSaveEdit: (data: Partial<Item>) => Promise<void>;
}

function stockColor(item: Item) {
  if (item.stok === 0) return 'text-red-600';
  if (item.stok <= item.safetyStok) return 'text-amber-600';
  return 'text-foreground';
}

export function MobileItemSheet({ type, item, token, kategoris, onClose, canPrint = true, onSaveEdit }: Props) {
  const [formData, setFormData] = useState<Partial<Item>>({});
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<TrxRow[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    if (type === 'edit' && item) setFormData(item);
  }, [type, item]);

  useEffect(() => {
    if (type !== 'detail' || !item || !token) return;
    setHistLoading(true);
    Promise.all([
      fetch(`/api/transaksi-masuk?tsCode=${encodeURIComponent(item.tsCode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/transaksi-keluar?tsCode=${encodeURIComponent(item.tsCode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([masuk, keluar]) => {
        const combined: TrxRow[] = [
          ...(masuk as any[]).map((r) => ({ ...r, jenis: 'Masuk' as const })),
          ...(keluar as any[]).map((r) => ({ ...r, jenis: 'Keluar' as const })),
        ]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6);
        setHistory(combined);
      })
      .catch(() => setHistory([]))
      .finally(() => setHistLoading(false));
  }, [type, item?.tsCode, token]);

  const set = (patch: Partial<Item>) => setFormData((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveEdit(formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!item) return;
    const svgEl = document.getElementById('qr-mobile-box')?.querySelector('svg');
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
<script>window.onload=function(){window.print();setTimeout(function(){window.close();},1500);}<\/script>
</body></html>`);
    win.document.close();
  };

  if (type === null || !item) return null;

  const sheetTitle = type === 'detail' ? 'Detail Barang' : type === 'edit' ? 'Edit Data Barang' : 'Label QR Code';

  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-0 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <div>
            <p className="font-bold text-base text-slate-800 leading-tight">{sheetTitle}</p>
            <p className="text-xs font-mono text-slate-400 mt-0.5">{item.tsCode}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {type === 'detail' && (
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-800 text-sm leading-snug flex-1">{item.nama}</p>
                <StatusBadge status={item.status} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Kategori', value: item.kategori },
                  { label: 'BIN LOC', value: item.binLoc || '-' },
                  { label: 'UOM', value: item.uom },
                  { label: 'MS Code', value: item.msCode || '-' },
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
                  <p className={`text-2xl font-bold ${stockColor(item)}`}>
                    {item.stok} <span className="text-sm font-normal text-slate-400">{item.uom}</span>
                  </p>
                </div>
                <div className="flex-1 bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Batas Aman</p>
                  <p className="text-2xl font-bold text-slate-600">
                    {item.safetyStok} <span className="text-sm font-normal text-slate-400">{item.uom}</span>
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Riwayat Transaksi</p>
                {histLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3 bg-slate-50 rounded-xl border">
                    Belum ada transaksi untuk barang ini.
                  </p>
                ) : (
                  <div className="rounded-xl border border-slate-100 overflow-hidden text-sm divide-y divide-slate-100">
                    {history.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2.5">
                        <div>
                          <p className="text-xs text-slate-500 font-mono">{r.nomor}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(r.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <span className={`text-xs font-semibold mt-0.5 ${r.jenis === 'Masuk' ? 'text-green-600' : 'text-orange-500'}`}>
                            {r.jenis}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${r.jenis === 'Masuk' ? 'text-green-600' : 'text-orange-500'}`}>
                            {r.jenis === 'Masuk' ? '+' : '-'}{r.jumlah}
                          </p>
                          <p className="text-xs text-slate-400">{r.petugas}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="pb-2">
                <Button variant="outline" className="w-full" onClick={onClose}>Tutup</Button>
              </div>
            </div>
          )}

          {type === 'edit' && (
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">TS Code</Label>
                <Input value={formData.tsCode || ''} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">MS Code</Label>
                <Input value={formData.msCode || ''} onChange={(e) => set({ msCode: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Barang <span className="text-red-500">*</span></Label>
                <Input value={formData.nama || ''} onChange={(e) => set({ nama: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Kategori</Label>
                  <Select value={formData.kategori as string} onValueChange={(v) => set({ kategori: v as any })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                    <SelectContent>
                      {kategoris.map((k) => <SelectItem key={k.id} value={k.nama}>{k.nama}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">BIN LOC</Label>
                  <Input value={formData.binLoc || ''} onChange={(e) => set({ binLoc: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">UOM</Label>
                  <Input value={formData.uom || ''} onChange={(e) => set({ uom: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Stok</Label>
                  <Input
                    type="number" min="0"
                    value={formData.stok ?? ''}
                    onChange={(e) => set({ stok: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Min. Stok</Label>
                  <Input
                    type="number" min="0"
                    value={formData.safetyStok ?? ''}
                    onChange={(e) => set({ safetyStok: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2 pb-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </div>
          )}

          {type === 'qr' && (
            <div className="px-5 py-4 flex flex-col items-center gap-4">
              <div
                id="qr-mobile-box"
                className="bg-white border rounded-xl shadow-sm p-6 flex flex-col items-center w-full max-w-[280px]"
              >
                <QRCodeSVG value={item.tsCode} size={180} />
                <div className="mt-5 w-full text-center space-y-1">
                  <p className="font-mono font-bold text-lg tracking-widest">{item.tsCode}</p>
                  <p className="text-sm font-semibold text-slate-700 truncate">{item.nama}</p>
                  <div className="flex justify-between border-t mt-3 pt-3 text-xs text-slate-500">
                    <span>Lokasi:</span>
                    <span className="font-mono font-semibold text-slate-700">{item.binLoc || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Kategori:</span>
                    <span className="font-mono font-semibold text-slate-700">{item.kategori}</span>
                  </div>
                </div>
              </div>
              {canPrint && (
                <p className="text-xs text-slate-400 -mt-2 text-center">
                  Klik "Cetak Label" untuk membuka dialog cetak browser
                </p>
              )}
              <div className="flex gap-2 w-full pb-2">
                <Button variant="outline" className={canPrint ? 'flex-1' : 'w-full'} onClick={onClose}>Tutup</Button>
                {canPrint && (
                  <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handlePrint}>
                    Cetak Label
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
