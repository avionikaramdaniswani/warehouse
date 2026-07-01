import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Item } from '@/context/AppContext';

interface KategoriOption { id: number; nama: string; }

interface Props {
  mode: 'add' | 'edit';
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Item>) => Promise<void>;
  initialData?: Partial<Item>;
  kategoris: KategoriOption[];
}

const emptyForm = (): Partial<Item> => ({
  itemCode: '', tsCode: '', msCode: '', nama: '', kategori: '' as any,
  binLoc: '', uom: 'EA', stok: 0, safetyStok: 5, status: 'Normal',
});

export function ItemFormModal({ mode, open, onClose, onSave, initialData, kategoris }: Props) {
  const [form, setForm] = useState<Partial<Item>>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        setForm(initialData);
      } else {
        setForm({ ...emptyForm(), kategori: (kategoris[0]?.nama ?? '') as any });
      }
    }
  }, [open, mode, initialData, kategoris]);

  const set = (patch: Partial<Item>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Data Barang' : 'Tambah Barang Baru'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="itemCode">Item Code <span className="text-red-500">*</span></Label>
            <Input
              id="itemCode"
              value={form.itemCode || ''}
              onChange={(e) => set({ itemCode: e.target.value })}
              disabled={mode === 'edit'}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tsCode">TS Code</Label>
              <Input
                id="tsCode"
                value={form.tsCode || ''}
                onChange={(e) => set({ tsCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msCode">MS Code</Label>
              <Input
                id="msCode"
                value={form.msCode || ''}
                onChange={(e) => set({ msCode: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nama">Nama Barang <span className="text-red-500">*</span></Label>
            <Input
              id="nama"
              value={form.nama || ''}
              onChange={(e) => set({ nama: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategori <span className="text-red-500">*</span></Label>
              <Select value={form.kategori as string} onValueChange={(v) => set({ kategori: v as any })}>
                <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                <SelectContent>
                  {kategoris.length === 0
                    ? <SelectItem value="__none__" disabled>Belum ada kategori</SelectItem>
                    : kategoris.map((k) => <SelectItem key={k.id} value={k.nama}>{k.nama}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="binLoc">BIN LOC (Lokasi)</Label>
              <Input
                id="binLoc"
                value={form.binLoc || ''}
                onChange={(e) => set({ binLoc: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="uom">Satuan (UOM) <span className="text-red-500">*</span></Label>
              <Input
                id="uom"
                value={form.uom || ''}
                onChange={(e) => set({ uom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stok">Stok Awal <span className="text-red-500">*</span></Label>
              <Input
                id="stok"
                type="number"
                min="0"
                value={form.stok !== undefined ? form.stok : ''}
                onChange={(e) => set({ stok: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="safetyStok">Safety Stok <span className="text-red-500">*</span></Label>
              <Input
                id="safetyStok"
                type="number"
                min="0"
                value={form.safetyStok !== undefined ? form.safetyStok : ''}
                onChange={(e) => set({ safetyStok: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Menyimpan...' : 'Simpan Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
