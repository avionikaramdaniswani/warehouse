import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { Package, PackageMinus, Activity, Layers } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Dashboard() {
  const { currentUser, items, transaksiMasuk, transaksiKeluar } = useAppContext();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.stok <= item.safetyStok);
  const totalCategories = new Set(items.map(i => i.kategori)).size;
  const todayTransactions = transaksiMasuk.filter(t => t.waktu.startsWith(new Date().toISOString().split('T')[0])).length + 
                           transaksiKeluar.filter(t => t.waktu.startsWith(new Date().toISOString().split('T')[0])).length;

  const barData = [
    { day: 'Sen', masuk: 15, keluar: 8 },
    { day: 'Sel', masuk: 22, keluar: 14 },
    { day: 'Rab', masuk: 18, keluar: 20 },
    { day: 'Kam', masuk: 30, keluar: 12 },
    { day: 'Jum', masuk: 25, keluar: 18 },
    { day: 'Sab', masuk: 10, keluar: 5 },
    { day: 'Min', masuk: 8, keluar: 3 }
  ];

  const pieData = [
    { name: 'Civil Material', value: 35 },
    { name: 'Electrical', value: 20 },
    { name: 'Mechanical', value: 18 },
    { name: 'Furniture', value: 8 },
    { name: 'Consumables', value: 12 },
    { name: 'GH Consumable', value: 7 }
  ];
  const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#8b5cf6', '#eab308', '#ef4444'];

  return (
    <Layout title="Dashboard">
      <div className="flex flex-row justify-between items-center mb-6 gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
            Selamat Datang, {currentUser?.nama}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 hidden sm:block">
            Berikut adalah ringkasan inventaris gudang saat ini.
          </p>
        </div>
        <div className="bg-white px-3 py-2 rounded-lg border border-border shadow-sm flex flex-col items-end shrink-0">
          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">WAKTU SISTEM</span>
          <span className="text-sm sm:text-base font-bold text-primary font-mono tracking-tight whitespace-nowrap">
            <span className="hidden sm:inline">
              {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}{' '}
            </span>
            <span className="sm:hidden">
              {currentTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}{' '}
            </span>
            <span className="text-foreground">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </span>
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
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Transaksi Hari Ini</p>
              <h3 className="text-2xl sm:text-3xl font-bold">{todayTransactions || 12}</h3>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 text-green-600 rounded-full shrink-0">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Total Kategori</p>
              <h3 className="text-2xl sm:text-3xl font-bold">{totalCategories}</h3>
            </div>
            <div className="p-2 sm:p-3 bg-orange-100 text-orange-600 rounded-full shrink-0">
              <Layers className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Transaksi Barang Masuk & Keluar (7 Hari Terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend iconType="circle" />
                  <Bar dataKey="masuk" name="Masuk" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="keluar" name="Keluar" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
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
            ⚠ Barang Stok Menipis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                  <TableCell className="text-center">
                    <StatusBadge status={item.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
}