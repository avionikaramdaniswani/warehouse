import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { Item } from '@/context/AppContext';

interface TrxRow {
  nomor: string;
  tanggal: string;
  createdAt: string;
  jumlah: number;
  petugas: string;
  jenis: 'Masuk' | 'Keluar';
}

interface Props {
  open: boolean;
  onClose: () => void;
  item: Item | null;
  token: string | null;
  onViewRiwayat?: () => void;
}

function stockColor(item: Item) {
  if (item.stok === 0) return 'text-red-600';
  if (item.stok <= item.safetyStok) return 'text-amber-600';
  return 'text-foreground';
}

export function ItemDetailModal({ open, onClose, item, token, onViewRiwayat }: Props) {
  const [history, setHistory] = useState<TrxRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item || !token) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/transaksi-masuk?itemCode=${encodeURIComponent(item.itemCode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/transaksi-keluar?itemCode=${encodeURIComponent(item.itemCode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([masuk, keluar]) => {
        const combined: TrxRow[] = [
          ...(masuk as any[]).map((r) => ({ ...r, jenis: 'Masuk' as const })),
          ...(keluar as any[]).map((r) => ({ ...r, jenis: 'Keluar' as const })),
        ]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 8);
        setHistory(combined);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [open, item?.itemCode, token]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl border-b pb-4">Detail Barang: {item?.itemCode}</DialogTitle>
        </DialogHeader>
        {item && (
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="col-span-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Nama Barang</h4>
                <p className="font-semibold text-base leading-snug">{item.nama}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Item Code</h4>
                <p className="font-mono font-medium">{item.itemCode}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">TS Code</h4>
                <p className="font-mono font-medium">{item.tsCode || <span className="text-muted-foreground italic">—</span>}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">MS Code</h4>
                <p className="font-mono font-medium">{item.msCode || <span className="text-muted-foreground italic">—</span>}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Kategori</h4>
                <p>{item.kategori || '-'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Satuan (UOM)</h4>
                <p>{item.uom}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lokasi Penyimpanan</h4>
                <p className="font-mono text-sm">{item.binLoc || '-'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Status</h4>
                <StatusBadge status={item.status} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Stok Saat Ini</h4>
                <p className={`text-2xl font-bold ${stockColor(item)}`}>
                  {item.stok} <span className="text-sm font-normal text-muted-foreground">{item.uom}</span>
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Batas Aman (Safety Stok)</h4>
                <p className="text-xl font-semibold text-slate-600">
                  {item.safetyStok} <span className="text-sm font-normal text-muted-foreground">{item.uom}</span>
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Riwayat Transaksi Terakhir
                </h4>
                {onViewRiwayat && (
                  <button
                    onClick={onViewRiwayat}
                    className="text-xs text-violet-600 hover:text-violet-700 hover:underline font-medium"
                  >
                    Lihat semua →
                  </button>
                )}
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-slate-50 rounded-md border">
                  Belum ada transaksi untuk barang ini.
                </p>
              ) : (
                <div className="rounded-md border overflow-hidden divide-y text-sm">
                  {history.map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5">
                      <div>
                        <p className="font-mono text-xs text-slate-500">{r.nomor}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(r.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                        <span className={`text-xs font-semibold ${r.jenis === 'Masuk' ? 'text-green-600' : 'text-orange-500'}`}>
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
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
