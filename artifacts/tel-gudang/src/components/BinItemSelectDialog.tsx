import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Package, ArrowRight } from 'lucide-react';
import { Item } from '@/context/AppContext';

interface Props {
  open: boolean;
  binLoc: string;
  items: Item[];
  onSelect: (item: Item) => void;
  onClose: () => void;
}

function statusBadge(item: Item) {
  if (item.stok === 0) return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Critical</Badge>;
  if (item.stok <= item.safetyStok) return <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-500">Warning</Badge>;
  return <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600 hover:bg-emerald-600">Normal</Badge>;
}

export function BinItemSelectDialog({ open, binLoc, items, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');

  const filtered = items.filter((i) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      i.tsCode.toLowerCase().includes(q) ||
      i.nama.toLowerCase().includes(q) ||
      i.msCode.toLowerCase().includes(q)
    );
  });

  const handleSelect = (item: Item) => {
    setSearch('');
    onSelect(item);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setSearch(''); onClose(); } }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-full bg-[#1B3A2D]/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-4 w-4 text-[#1B3A2D]" />
            </div>
            <div>
              <span className="block text-sm font-semibold text-[#1B3A2D]">{binLoc}</span>
              <span className="block text-[11px] font-normal text-slate-500">
                {items.length} item tersimpan — pilih item untuk transaksi
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-3 pb-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              autoFocus
              placeholder="Cari TS Code / nama barang…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Package className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Tidak ada item ditemukan</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <button
                  key={item.tsCode}
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-bold text-[#1B3A2D]">{item.tsCode}</span>
                      {statusBadge(item)}
                    </div>
                    <p className="text-xs text-slate-600 leading-snug line-clamp-2">{item.nama}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Stok: <span className="font-medium">{item.stok} {item.uom}</span>
                      {item.msCode ? <> · MS: {item.msCode}</> : null}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#1B3A2D] flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100">
          <Button variant="ghost" size="sm" className="w-full text-slate-500" onClick={() => { setSearch(''); onClose(); }}>
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
