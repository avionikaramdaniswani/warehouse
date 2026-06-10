import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileDown, Search, ArrowDownRight, ArrowUpRight, Filter, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAppContext } from '@/context/AppContext';

interface TrxMasuk {
  id: number; nomor: string; jumlah: number; tanggal: string;
  noPo: string | null; keterangan: string | null; tsCode: string;
  namaBarang: string; petugas: string;
}
interface TrxKeluar {
  id: number; nomor: string; jumlah: number; tanggal: string;
  keperluan: string; tujuan: string | null; keterangan: string | null;
  tsCode: string; namaBarang: string; petugas: string;
}

export default function Laporan() {
  const { token } = useAppContext();

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.slice(0, 7) + '-01';
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [jenisFilter, setJenisFilter] = useState('Semua');

  const [trxMasuk, setTrxMasuk] = useState<TrxMasuk[]>([]);
  const [trxKeluar, setTrxKeluar] = useState<TrxKeluar[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([
      fetch('/api/transaksi-masuk', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch('/api/transaksi-keluar', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([masuk, keluar]) => {
      setTrxMasuk(masuk);
      setTrxKeluar(keluar);
    }).catch(() => toast.error('Gagal memuat data transaksi')).finally(() => setIsLoading(false));
  }, [token]);

  const filteredMasuk = trxMasuk.filter(t => t.tanggal >= dateFrom && t.tanggal <= dateTo);
  const filteredKeluar = trxKeluar.filter(t => t.tanggal >= dateFrom && t.tanggal <= dateTo);

  const totalMasuk = filteredMasuk.reduce((s, t) => s + t.jumlah, 0);
  const totalKeluar = filteredKeluar.reduce((s, t) => s + t.jumlah, 0);
  const totalTransaksi = filteredMasuk.length + filteredKeluar.length;

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const labelPeriode = dateFrom === dateTo ? fmt(dateFrom) : `${fmt(dateFrom)} – ${fmt(dateTo)}`;

  const itemSeringKeluar = (() => {
    const freq: Record<string, { nama: string; count: number }> = {};
    filteredKeluar.forEach(t => {
      if (!freq[t.tsCode]) freq[t.tsCode] = { nama: t.namaBarang, count: 0 };
      freq[t.tsCode].count++;
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1].count - a[1].count);
    return sorted[0] ? { ...sorted[0][1], tsCode: sorted[0][0] } : null;
  })();

  const chartData = [
    { tanggal: '1 Jan', masuk: 120, keluar: 80 },
    { tanggal: '5 Jan', masuk: 85, keluar: 90 },
    { tanggal: '10 Jan', masuk: 200, keluar: 150 },
    { tanggal: '15 Jan', masuk: 45, keluar: 120 },
    { tanggal: '20 Jan', masuk: 310, keluar: 200 },
    { tanggal: '25 Jan', masuk: 150, keluar: 280 },
    { tanggal: '30 Jan', masuk: 90, keluar: 60 }
  ];

  const dummyReportData = [
    { tanggal: '2025-01-20 14:30', tsCode: 'TS-001', nama: 'ACOUSTIC PANEL AURATONE', jenis: 'IN', jumlah: 50, uom: 'BOX', ref: 'PO-2025-004', petugas: 'Budi Santoso' },
    { tanggal: '2025-01-20 09:15', tsCode: 'TS-044', nama: 'BATTERY TYPE AAA', jenis: 'OUT', jumlah: 20, uom: 'EA', ref: 'Maint. Area A', petugas: 'Andi Rahman' },
    { tanggal: '2025-01-19 16:45', tsCode: 'TS-096', nama: 'BULB LED P-RTG 19W', jenis: 'OUT', jumlah: 5, uom: 'EA', ref: 'Office LT 2', petugas: 'Siti Rahayu' },
    { tanggal: '2025-01-18 10:20', tsCode: 'TS-084', nama: 'BRICK STONE 100x100x200MM', jenis: 'IN', jumlah: 1000, uom: 'EA', ref: 'PO-2025-003', petugas: 'Budi Santoso' },
    { tanggal: '2025-01-17 13:10', tsCode: 'TS-025', nama: 'BALLAST LAMP BHL 80L', jenis: 'OUT', jumlah: 12, uom: 'EA', ref: 'Area Pabrik', petugas: 'Doni Wijaya' },
    { tanggal: '2025-01-15 08:30', tsCode: 'TS-005', nama: 'AIR COND 1.5PK CS-YN12TKJ', jenis: 'OUT', jumlah: 2, uom: 'UNIT', ref: 'Proyek Mess', petugas: 'Andi Rahman' },
    { tanggal: '2025-01-14 11:00', tsCode: 'TS-009', nama: 'ANCHOR PLASTIC SIZE 10-12', jenis: 'OUT', jumlah: 50, uom: 'EA', ref: 'Perbaikan Pipa', petugas: 'Siti Rahayu' },
    { tanggal: '2025-01-12 15:40', tsCode: 'TS-047', nama: 'BAYGON', jenis: 'IN', jumlah: 24, uom: 'CANS', ref: 'PO-2025-002', petugas: 'Budi Santoso' },
    { tanggal: '2025-01-10 09:20', tsCode: 'TS-059', nama: 'BED MDL MESSARIA 120x200CM', jenis: 'OUT', jumlah: 1, uom: 'SET', ref: 'Mess Karyawan', petugas: 'Andi Rahman' },
    { tanggal: '2025-01-08 14:15', tsCode: 'TS-063', nama: 'BED SINGLE SHUMO', jenis: 'IN', jumlah: 20, uom: 'UNIT', ref: 'PO-2025-001', petugas: 'Budi Santoso' },
  ];

  return (
    <Layout title="Laporan & Rekapitulasi">
      <div className="flex flex-col gap-6">
        
        {/* Filter Bar */}
        <Card className="shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex flex-wrap gap-4 w-full">
              <div className="space-y-1.5 flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-slate-500 uppercase">Periode Dari</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-slate-500 uppercase">Sampai</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-slate-500 uppercase">Jenis Transaksi</label>
                <Select defaultValue="Semua">
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua">Semua Jenis</SelectItem>
                    <SelectItem value="IN">Barang Masuk</SelectItem>
                    <SelectItem value="OUT">Barang Keluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-slate-500 uppercase">Kategori</label>
                <Select defaultValue="Semua">
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua">Semua Kategori</SelectItem>
                    <SelectItem value="Civil">Civil</SelectItem>
                    <SelectItem value="Electrical">Electrical</SelectItem>
                    <SelectItem value="Mechanical">Mechanical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
              <Button className="w-full md:w-auto bg-slate-800 hover:bg-slate-900">
                <Filter className="w-4 h-4 mr-2" /> Tampilkan
              </Button>
              <Button variant="outline" className="w-full md:w-auto text-green-700 border-green-200 hover:bg-green-50" onClick={() => toast.success('Mengekspor ke Excel... Fitur segera hadir')}>
                <FileDown className="w-4 h-4 mr-2" /> Excel
              </Button>
              <Button variant="outline" className="w-full md:w-auto text-red-700 border-red-200 hover:bg-red-50" onClick={() => toast.success('Mengekspor ke PDF... Fitur segera hadir')}>
                <Download className="w-4 h-4 mr-2" /> PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-green-100 shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 text-green-600">
                <ArrowDownRight className="w-5 h-5" />
                <h3 className="font-semibold text-sm uppercase">Total Masuk</h3>
              </div>
              {isLoading ? <Skeleton className="h-9 w-24 mb-1" /> : <p className="text-3xl font-bold font-mono">{totalMasuk.toLocaleString('id-ID')}</p>}
              <p className="text-xs text-muted-foreground mt-1">{labelPeriode}</p>
            </CardContent>
          </Card>
          <Card className="border-orange-100 shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 text-orange-600">
                <ArrowUpRight className="w-5 h-5" />
                <h3 className="font-semibold text-sm uppercase">Total Keluar</h3>
              </div>
              {isLoading ? <Skeleton className="h-9 w-24 mb-1" /> : <p className="text-3xl font-bold font-mono">{totalKeluar.toLocaleString('id-ID')}</p>}
              <p className="text-xs text-muted-foreground mt-1">{labelPeriode}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center">
              <h3 className="font-semibold text-sm uppercase text-slate-500 mb-2">Item Sering Keluar</h3>
              {isLoading ? (
                <><Skeleton className="h-5 w-full mb-1" /><Skeleton className="h-3 w-20" /></>
              ) : itemSeringKeluar ? (
                <>
                  <p className="text-sm font-bold line-clamp-2 leading-tight" title={itemSeringKeluar.nama}>{itemSeringKeluar.nama}</p>
                  <p className="text-xs text-primary font-medium mt-1.5">{itemSeringKeluar.count}× keluar · {labelPeriode}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada data</p>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-sm bg-slate-900 text-white">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 text-slate-300">
                <Activity className="w-5 h-5" />
                <h3 className="font-semibold text-sm uppercase">Total Transaksi</h3>
              </div>
              {isLoading ? <Skeleton className="h-9 w-20 mb-1 bg-slate-700" /> : <p className="text-3xl font-bold font-mono">{totalTransaksi}</p>}
              <p className="text-xs text-slate-400 mt-1">{isLoading ? '—' : `${filteredMasuk.length} masuk · ${filteredKeluar.length} keluar · ${labelPeriode}`}</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Tren Masuk vs Keluar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <RechartsTooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'}} 
                  />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                  <Line type="monotone" dataKey="masuk" name="Barang Masuk" stroke="#22c55e" strokeWidth={3} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="keluar" name="Barang Keluar" stroke="#f97316" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Details Table */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Detail Transaksi</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari dalam laporan..." className="pl-9 h-9" />
            </div>
          </CardHeader>

          {/* MOBILE: Card View */}
          <div className="md:hidden divide-y">
            {dummyReportData.map((row, idx) => (
              <div key={idx} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-semibold text-sm text-slate-800 leading-tight break-words">{row.nama}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.jenis === 'IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {row.jenis === 'IN' ? 'Masuk' : 'Keluar'}
                    </span>
                    <span className={`font-mono text-sm font-bold ${row.jenis === 'IN' ? 'text-green-600' : 'text-orange-600'}`}>
                      {row.jenis === 'IN' ? '+' : '-'}{row.jumlah} {row.uom}
                    </span>
                  </div>
                </div>
                <p className="text-xs font-mono text-muted-foreground mb-2">{row.tsCode}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{row.tanggal}</span>
                  <span>{row.ref}</span>
                  <span>{row.petugas}</span>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: Table View */}
          <div className="overflow-x-auto hidden md:block">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>TS Code</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead className="text-center">Jenis</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Tujuan/Sumber</TableHead>
                  <TableHead>Petugas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dummyReportData.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="whitespace-nowrap text-sm">{row.tanggal}</TableCell>
                    <TableCell className="font-mono text-sm">{row.tsCode}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate" title={row.nama}>{row.nama}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${row.jenis === 'IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {row.jenis}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${row.jenis === 'IN' ? 'text-green-600' : 'text-orange-600'}`}>
                      {row.jenis === 'IN' ? '+' : '-'}{row.jumlah} <span className="text-xs font-normal text-muted-foreground">{row.uom}</span>
                    </TableCell>
                    <TableCell className="text-sm">{row.ref}</TableCell>
                    <TableCell className="text-sm">{row.petugas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-slate-500">
            <span>Menampilkan 1-10 dari 142 baris</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled>Sebelumnya</Button>
              <Button variant="outline" size="sm" className="bg-primary text-white border-primary">1</Button>
              <Button variant="outline" size="sm">2</Button>
              <Button variant="outline" size="sm">3</Button>
              <Button variant="outline" size="sm">Selanjutnya</Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}