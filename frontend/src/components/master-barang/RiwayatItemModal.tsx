import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, FileX } from 'lucide-react';
import { Item } from '@/context/AppContext';

interface RiwayatRow {
  id: number;
  nomor: string;
  jumlah: number;
  tanggal: string;
  createdAt: string;
  jenis: 'Masuk' | 'Keluar';
  petugas: string;
  keterangan: string | null;
  noPo: string | null;
  keperluan: string | null;
  tujuan: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  item: Item | null;
  token: string | null;
}

const LIMIT = 15;

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function RiwayatItemModal({ open, onClose, item, token }: Props) {
  const [data, setData] = useState<RiwayatRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (p: number, type: string) => {
    if (!item || !token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), type });
      const res = await fetch(`/api/items/${item.id}/riwayat?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
        setPage(p);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [item?.id, token]);

  useEffect(() => {
    if (open && item) {
      setPage(1);
      setTypeFilter('all');
      fetchData(1, 'all');
    } else {
      setData([]);
    }
  }, [open, item?.id]);

  function handleTypeChange(val: string) {
    setTypeFilter(val);
    fetchData(1, val);
  }

  const startEntry = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const endEntry = Math.min(page * LIMIT, total);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] flex flex-col gap-3">
        <DialogHeader className="shrink-0 border-b pb-3">
          <DialogTitle className="text-base font-semibold">
            Riwayat Transaksi —{' '}
            <span className="font-mono text-slate-600">{item?.itemCode}</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{item?.nama}</p>
        </DialogHeader>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tampilkan:</span>
            <Select value={typeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-8 w-32 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="masuk">Masuk saja</SelectItem>
                <SelectItem value="keluar">Keluar saja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {total > 0 ? `${startEntry}–${endEntry} dari ${total}` : '0 transaksi'}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto min-h-0 border rounded-md">
          {loading ? (
            <div className="space-y-px">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-3 border-b last:border-0">
                  <Skeleton className="h-4 w-20 shrink-0" />
                  <Skeleton className="h-5 w-14 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-28 shrink-0" />
                  <Skeleton className="h-4 w-10 ml-auto shrink-0" />
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <FileX className="h-10 w-10 mb-2 text-slate-300" />
              <p className="text-sm">Belum ada transaksi untuk barang ini.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b text-xs text-muted-foreground">
                  <th className="text-left py-2.5 px-3 font-medium whitespace-nowrap">Tanggal</th>
                  <th className="text-left py-2.5 px-3 font-medium">Jenis</th>
                  <th className="text-left py-2.5 px-3 font-medium hidden sm:table-cell">Nomor</th>
                  <th className="text-right py-2.5 px-3 font-medium">Jumlah</th>
                  <th className="text-left py-2.5 px-3 font-medium hidden md:table-cell">Detail</th>
                  <th className="text-left py-2.5 px-3 font-medium hidden lg:table-cell">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((row, i) => (
                  <tr key={`${row.jenis}-${row.id}-${i}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap text-xs font-medium text-slate-600">
                      {formatTanggal(row.tanggal)}
                    </td>
                    <td className="py-2.5 px-3">
                      {row.jenis === 'Masuk' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                          <ArrowDownCircle className="h-3 w-3" /> Masuk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                          <ArrowUpCircle className="h-3 w-3" /> Keluar
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 hidden sm:table-cell">
                      <span className="font-mono text-xs text-slate-400">{row.nomor}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-bold text-sm ${row.jenis === 'Masuk' ? 'text-emerald-600' : 'text-orange-500'}`}>
                        {row.jenis === 'Masuk' ? '+' : '−'}{row.jumlah}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 hidden md:table-cell max-w-[200px]">
                      {row.jenis === 'Masuk' ? (
                        <span className="text-xs text-slate-500">
                          {row.noPo
                            ? <><span className="font-medium text-slate-600">PO:</span> {row.noPo}</>
                            : <span className="text-slate-300">—</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {row.keperluan || '—'}
                          {row.tujuan && <span className="text-slate-400"> · {row.tujuan}</span>}
                        </span>
                      )}
                      {row.keterangan && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate" title={row.keterangan}>
                          {row.keterangan}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 hidden lg:table-cell text-xs text-slate-500 whitespace-nowrap">
                      {row.petugas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between shrink-0 pt-1">
            <span className="text-xs text-muted-foreground">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                disabled={page <= 1} onClick={() => fetchData(page - 1, typeFilter)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1
                  : page <= 3 ? i + 1
                  : page >= totalPages - 2 ? totalPages - 4 + i
                  : page - 2 + i;
                return (
                  <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm"
                    className="h-7 w-7 p-0 text-xs"
                    onClick={() => fetchData(p, typeFilter)}>
                    {p}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                disabled={page >= totalPages} onClick={() => fetchData(page + 1, typeFilter)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
