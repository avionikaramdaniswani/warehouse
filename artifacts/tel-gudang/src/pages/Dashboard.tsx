import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { Package, PackageMinus, PackagePlus, TrendingDown } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Dashboard() {
  const { currentUser, items, token } = useAppContext();
  const [todayMasuk, setTodayMasuk] = useState(0);
  const [todayKeluar, setTodayKeluar] = useState(0);
  const [barData, setBarData] = useState<{ day: string; date: string; tanggal: string; masuk: number; keluar: number; isToday: boolean }[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!token) return;
    const today = new Date().toISOString().split('T')[0];
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`/api/transaksi-masuk?tanggal=${today}`, { headers }),
      fetch(`/api/transaksi-keluar?tanggal=${today}`, { headers }),
      fetch(`/api/dashboard/stats`, { headers }),
    ]).then(async ([r1, r2, r3]) => {
      const [m, k, stats] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      setTodayMasuk(m?.length ?? 0);
      setTodayKeluar(k?.length ?? 0);
      if (stats?.barData) setBarData(stats.barData);
      if (stats?.pieData) setPieData(stats.pieData);
    }).catch(() => {});
  }, [token]);

  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.stok <= item.safetyStok);

  const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#8b5cf6', '#eab308', '#ef4444'];

  return (
    <Layout title="Dashboard">
      <div className="flex flex-row justify-between items-center mb-6 gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
            Selamat Datang, {currentUser?.namaLengkap}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 hidden sm:block">
            Berikut adalah ringkasan inventaris gudang saat ini.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Total Item</p>
              <h3 className="text-2xl sm:text-3xl font-bold">{totalItems}</h3>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 text-blue-600 rounded-full shrink-0">
              <Package className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500"></div>
          <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm font-medium text-red-600 mb-1">Stok Menipis</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-red-700">{lowStockItems.length}</h3>
            </div>
            <div className="p-2 sm:p-3 bg-red-100 text-red-600 rounded-full shrink-0">
              <PackageMinus className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Masuk Hari Ini</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-emerald-700">{todayMasuk}</h3>
            </div>
            <div className="p-2 sm:p-3 bg-emerald-100 text-emerald-600 rounded-full shrink-0">
              <PackagePlus className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Keluar Hari Ini</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-orange-600">{todayKeluar}</h3>
            </div>
            <div className="p-2 sm:p-3 bg-orange-100 text-orange-600 rounded-full shrink-0">
              <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Transaksi Barang Masuk &amp; Keluar</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Minggu ini · Senin — Minggu</p>
          </CardHeader>
          <CardContent>
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
                          <text
                            x={0} y={0} dy={16}
                            textAnchor="middle"
                            fill={isToday ? '#16a34a' : '#374151'}
                            fontSize={12}
                            fontWeight={isToday ? 700 : 500}
                          >
                            {payload.value}
                          </text>
                          <text
                            x={0} y={0} dy={30}
                            textAnchor="middle"
                            fill={isToday ? '#16a34a' : '#9ca3af'}
                            fontSize={10}
                            fontWeight={isToday ? 600 : 400}
                          >
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
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Distribusi Stok per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-200">
        <CardHeader className="bg-red-50/50 border-b border-red-100">
          <CardTitle className="text-red-700 flex items-center gap-2">
            <PackageMinus className="h-5 w-5" />
            Barang Stok Menipis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* MOBILE: Card View */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100">
            {lowStockItems.slice(0, 5).map((item) => {
              const isHabis = item.stok === 0;
              const numColor = isHabis ? 'text-red-600' : 'text-amber-600';
              const accentBg = isHabis ? 'bg-red-500' : 'bg-amber-400';
              const deficit = item.safetyStok - item.stok;
              return (
                <div key={item.tsCode} className="flex items-center gap-3 px-4 py-3.5">
                  {/* Left accent dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${accentBg}`} />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 leading-snug line-clamp-1">{item.nama}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.tsCode} · {item.kategori}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Min. stok: <span className="font-medium text-slate-600">{item.safetyStok} {item.uom}</span>
                      {!isHabis && (
                        <span className="ml-2 text-red-500 font-medium">−{deficit} kurang</span>
                      )}
                    </p>
                  </div>
                  {/* Right: stock count + badge */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <p className={`text-xl font-bold leading-none ${numColor}`}>
                      {item.stok}
                      <span className="text-xs font-normal text-slate-400 ml-1">{item.uom}</span>
                    </p>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* DESKTOP: Table View */}
          <div className="hidden md:block">
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
        </CardContent>
      </Card>
    </Layout>
  );
}