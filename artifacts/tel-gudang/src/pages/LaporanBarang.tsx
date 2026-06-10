import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Construction } from 'lucide-react';

export default function LaporanBarang() {
  return (
    <Layout title="Laporan Barang">
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-700">Laporan Barang</p>
            <p className="text-sm text-muted-foreground mt-1">Halaman ini sedang dalam pengembangan.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            <Construction className="h-4 w-4 shrink-0" />
            <span>Akan menampilkan rekapitulasi stok per barang dan kategori.</span>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}
