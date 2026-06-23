import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { Package, AlertTriangle, XCircle, CheckCircle2, MapPin, ArrowLeft } from 'lucide-react';

interface BinItem {
  tsCode: string;
  msCode: string | null;
  nama: string;
  kategori: string;
  uom: string;
  stok: number;
  safetyStok: number;
  status: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'Critical') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
      <XCircle className="w-3 h-3" /> Critical
    </span>
  );
  if (status === 'Warning') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
      <AlertTriangle className="w-3 h-3" /> Warning
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
      <CheckCircle2 className="w-3 h-3" /> Normal
    </span>
  );
}

export default function BinPage() {
  const params = useParams<{ binLoc: string }>();
  const binLoc = decodeURIComponent(params.binLoc ?? '');

  const [items, setItems] = useState<BinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    if (!binLoc) return;
    setLoading(true);
    fetch(`/api/bin/${encodeURIComponent(binLoc)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setItems(data.items);
        setLastUpdated(new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [binLoc]);

  const normal = items.filter(i => i.status === 'Normal').length;
  const menipis = items.filter(i => i.status === 'Warning').length;
  const habis = items.filter(i => i.status === 'Critical').length;

  return (
    <div className="min-h-screen bg-[#0f2419] flex flex-col">
      {/* Header */}
      <div className="bg-[#1B3A2D] px-4 py-3 shadow-md">
        <p className="text-[10px] font-bold tracking-widest text-white/50 uppercase mb-0.5">PT Tanjungenim Lestari Pulp &amp; Paper</p>
        <p className="text-xs font-semibold text-white/70 tracking-wide">Townsite Warehouse — Materials Management</p>
      </div>

      <div className="flex-1 px-4 py-5 space-y-4 max-w-lg mx-auto w-full">

        {/* BIN LOC Badge */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#1B3A2D] to-[#244d3b] px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Lokasi Bin</p>
              <p className="text-2xl font-bold font-mono text-white tracking-wider">{binLoc || '—'}</p>
            </div>
          </div>

          {!loading && !error && (
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
              <div className="py-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Normal</p>
                <p className="text-xl font-bold text-green-600">{normal}</p>
              </div>
              <div className="py-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Warning</p>
                <p className="text-xl font-bold text-amber-500">{menipis}</p>
              </div>
              <div className="py-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Critical</p>
                <p className="text-xl font-bold text-red-500">{habis}</p>
              </div>
            </div>
          )}
        </div>

        {/* Item list */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-1/4 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-white rounded-xl p-6 text-center">
            <XCircle className="w-10 h-10 text-red-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">Gagal memuat data</p>
            <p className="text-xs text-slate-400 mt-1">Periksa koneksi jaringan</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-500">Tidak ada item di lokasi ini</p>
            <p className="text-xs text-slate-400 mt-1">BIN LOC: {binLoc}</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <p className="text-xs text-white/50 font-medium uppercase tracking-wider px-1">
              {items.length} item tersimpan
            </p>
            <div className="space-y-2.5">
              {items.map(item => (
                <div
                  key={item.tsCode}
                  className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                    item.status === 'Critical' ? 'border-red-400' :
                    item.status === 'Warning' ? 'border-amber-400' :
                    'border-green-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-mono text-xs font-bold text-[#1B3A2D]">{item.tsCode}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 leading-snug mb-2">{item.nama}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="bg-slate-100 rounded px-1.5 py-0.5 font-medium">{item.kategori}</span>
                    <span>
                      Stok:{' '}
                      <span className={`font-bold ${
                        item.stok === 0 ? 'text-red-600' :
                        item.stok <= item.safetyStok ? 'text-amber-600' :
                        'text-green-700'
                      }`}>
                        {item.stok}
                      </span>
                      {' '}{item.uom}
                    </span>
                    {item.msCode && <span className="text-slate-400 truncate">MS: {item.msCode}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {lastUpdated && (
          <p className="text-center text-[10px] text-white/30 pt-2 pb-4">
            Data per {lastUpdated}
          </p>
        )}
      </div>
    </div>
  );
}
