import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer,
} from 'recharts';
import { Package, PackageMinus, PackagePlus, TrendingDown, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#8b5cf6', '#eab308', '#ef4444'];

function StatSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
      <div className="h-8 w-12 bg-slate-200 rounded" />
    </div>
  );
}

export default function Dashboard() {
  const { currentUser, items, token, itemsLoading, refreshItems } = useAppContext();

  const [todayMasuk, setTodayMasuk] = useState(0);
  const [todayKeluar, setTodayKeluar] = useState(0);
  const [barData, setBarData] = useState<{ day: string; date: string; tanggal: string; masuk: number; keluar: number; isToday: boolean }[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setStatsError(false);
    const today = new Date().toISOString().split('T')[0];
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [r1, r2, r3] = await Promise.all([
        fetch(`/api/transaksi-masuk?tanggal=${today}`, { headers }),
        fetch(`/api/transaksi-keluar?tanggal=${today}`, { headers }),
        fetch(`/api/dashboard/stats`, { headers }),
      ]);

      if (!r1.ok || !r2.ok || !r3.ok) throw new Error('Gagal memuat data');

      const [m, k, stats] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      setTodayMasuk(Array.isArray(m) ? m.length : 0);
      setTodayKeluar(Array.isArray(k) ? k.length : 0);
      if (stats?.barData) setBarData(stats.barData);
      if (stats?.pieData) setPieData(stats.pieData);
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setStatsLoading(true);
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), refreshItems()]);
    setRefreshing(false);
  };

  const isLoading = itemsLoading || statsLoading;
  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.stok <= item.safetyStok);
  const barHasData = barData.some(d => d.masuk > 0 || d.keluar > 0);

  return (
    <Layout title="Dashboard">
      {/* Header */}
      <div className="flex flex-row justify-between items-center mb-6 gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
            Selamat Datang, {currentUser?.namaLengkap}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 hidden sm:block">
            Berikut adalah ringkasan inventaris gudang saat ini.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Perbarui</span>
        </button>
      </div>

      {/* Error Banner */}
      {statsError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Gagal memuat data statistik. Coba klik <button onClick={handleRefresh} className="font-semibold underline">Perbarui</button>.</span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-2">
            <div>
              {isLoading ? <StatSkeleton /> : (
                <>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Total Item</p>
                  <h3 className="text-2xl sm:text-3xl font-bold">{totalItems}</h3>
                </>
              )}
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 text-blue-600 rounded-full shrink-0">
              <Package className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500" />
          <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-2">
            <div>
              {isLoading ? <StatSkeleton /> : (
                <>
                  <p className="text-xs sm:text-sm font-medium text-red-600 mb-1">Warning Stock</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-red-700">{lowStockItems.length}</h3>
                </>
              )}
            </div>
            <div className="p-2 sm:p-3 bg-red-100 text-red-600 rounded-full shrink-0">
              <PackageMinus className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-2">
            <div>
              {isLoading ? <StatSkeleton /> : (
                <>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Masuk Hari Ini</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-emerald-700">{todayMasuk}</h3>
                </>
              )}
            </div>
            <div className="p-2 sm:p-3 bg-emerald-100 text-emerald-600 rounded-full shrink-0">
              <PackagePlus className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-2">
            <div>
              {isLoading ? <StatSkeleton /> : (
                <>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Keluar Hari Ini</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-orange-600">{todayKeluar}</h3>
                </>
              )}
            </div>
            <div className="p-2 sm:p-3 bg-orange-100 text-orange-600 rounded-full shrink-0">
              <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Bar Chart */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Transaksi Barang Masuk &amp; Keluar</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Minggu ini · Senin — Minggu</p>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Memuat data...</span>
                </div>
              </div>
            ) : !barHasData ? (
              <div className="h-[300px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Package className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium">Belum ada transaksi minggu ini</p>
                <p className="text-xs">Data akan muncul setelah ada transaksi masuk atau keluar.</p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={(props) => {
                        const { x, y, payload, index } = props;
                        const entry = barData[index];
                        const isToday = entry?.isToday;
                        return (
                          <g transform={`translate(${x},${y})`}>
                            {isToday && (
                              <rect x={-20} y={2} width={40} height={32} rx={6} fill="#f0fdf4" />
                            )}
                            <text x={0} y={0} dy={16} textAnchor="middle"
                              fill={isToday ? '#16a34a' : '#374151'}
                              fontSize={12} fontWeight={isToday ? 700 : 500}>
                              {payload.value}
                            </text>
                            <text x={0} y={0} dy={30} textAnchor="middle"
                              fill={isToday ? '#16a34a' : '#9ca3af'}
                              fontSize={10} fontWeight={isToday ? 600 : 400}>
                              {entry?.date}
                            </text>
                          </g>
                        );
                      }}
                      height={48}
                    />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={28} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip
                      cursor={{ fill: '#f3f4f6' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 13 }}
                      formatter={(value: number, name: string) => [value, name]}
                      labelFormatter={(label, payload) => {
                        const entry = payload?.[0]?.payload;
                        return entry ? `${label}, ${entry.date}` : label;
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                    <Bar dataKey="masuk" name="Masuk" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={entry.isToday ? '#16a34a' : '#86efac'} />
                      ))}
                    </Bar>
                    <Bar dataKey="keluar" name="Keluar" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={entry.isToday ? '#ea580c' : '#fdba74'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Distribusi Stok per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-[220px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Memuat data...</span>
                </div>
              </div>
            ) : pieData.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Package className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium">Belum ada data stok</p>
              </div>
            ) : (
              <>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={88}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number, name: string) => {
                          const total = pieData.reduce((s, d) => s + d.value, 0);
                          const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                          return [`${value.toLocaleString('id-ID')} (${pct}%)`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2 px-2">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-xs text-slate-600 truncate">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Table */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50/50 border-b border-red-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <PackageMinus className="h-5 w-5" />
              Warning Stock
              {!isLoading && lowStockItems.length > 0 && (
                <span className="ml-1 text-xs font-normal bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  {lowStockItems.length} item
                </span>
              )}
            </CardTitle>
            {lowStockItems.length > 5 && (
              <Link
                href="/barang"
                className="text-xs text-red-600 hover:text-red-800 font-medium underline underline-offset-2"
              >
                Lihat semua ({lowStockItems.length})
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Memuat data...</span>
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-emerald-700">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="font-semibold text-sm">Semua stok dalam kondisi aman</p>
              <p className="text-xs text-muted-foreground">Tidak ada barang yang stoknya di bawah batas minimum.</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold">TS Code</TableHead>
                      <TableHead className="font-semibold">Nama Barang</TableHead>
                      <TableHead className="font-semibold">Kategori</TableHead>
                      <TableHead className="text-right font-semibold">Stok Saat Ini</TableHead>
                      <TableHead className="text-right font-semibold">Safety Stok</TableHead>
                      <TableHead className="text-center font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.slice(0, 5).map((item) => (
                      <TableRow key={item.tsCode}>
                        <TableCell className="font-mono text-sm">{item.tsCode}</TableCell>
                        <TableCell className="font-medium">{item.nama}</TableCell>
                        <TableCell>{item.kategori}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{item.stok}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.safetyStok}</TableCell>
                        <TableCell className="text-center"><StatusBadge status={item.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {lowStockItems.length > 5 && (
                <div className="border-t px-4 py-3 text-center">
                  <Link
                    href="/barang"
                    className="text-sm text-red-600 hover:text-red-800 font-medium cursor-pointer"
                  >
                    + {lowStockItems.length - 5} item lainnya · Lihat semua di halaman Daftar Barang
                  </Link>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
