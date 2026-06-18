import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Package, MapPin } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  onSelectMode: (mode: 'item' | 'bin') => void;
}

export function PrintModeDialog({ open, onClose, selectedCount, onSelectMode }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base">Pilih Mode Cetak Label</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedCount} barang dipilih
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          {/* Mode Item */}
          <button
            onClick={() => { onClose(); onSelectMode('item'); }}
            className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-[#1B3A2D] hover:bg-green-50/50 transition-all text-left group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#1B3A2D]/10 flex items-center justify-center transition-colors">
              <Package className="w-6 h-6 text-slate-500 group-hover:text-[#1B3A2D]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-800 mb-0.5">Mode Item</p>
              <p className="text-[11px] text-slate-500 leading-snug">
                1 label per barang — QR berisi TS Code. Cocok untuk label kemasan.
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-2 py-0.5 mt-auto">
              {selectedCount} label
            </span>
          </button>

          {/* Mode BIN LOC */}
          <button
            onClick={() => { onClose(); onSelectMode('bin'); }}
            className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-[#1B3A2D] hover:bg-green-50/50 transition-all text-left group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#1B3A2D]/10 flex items-center justify-center transition-colors">
              <MapPin className="w-6 h-6 text-slate-500 group-hover:text-[#1B3A2D]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-800 mb-0.5">Mode BIN LOC</p>
              <p className="text-[11px] text-slate-500 leading-snug">
                1 label per slot rak — QR buka daftar semua item di slot. Ditempel di tepi rak.
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-2 py-0.5 mt-auto">
              per slot unik
            </span>
          </button>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
