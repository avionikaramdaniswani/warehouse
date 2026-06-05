import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileDown, Search, ArrowDownRight, ArrowUpRight, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function Laporan() {
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo, setDateTo] = useState('2025-01-31');

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
              <p className="text-3xl font-bold font-mono">1,000</p>
              <p className="text-xs text-muted-foreground mt-1">Item dalam periode ini</p>
            </CardContent>
          </Card>
          <Card className="border-orange-100 shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 text-orange-600">
                <ArrowUpRight className="w-5 h-5" />
                <h3 className="font-semibold text-sm uppercase">Total Keluar</h3>
              </div>
              <p className="text-3xl font-bold font-mono">87</p>
              <p className="text-xs text-muted-foreground mt-1">Item dalam periode ini</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5 flex flex-col justify-center">
              <h3 className="font-semibold text-sm uppercase text-slate-500 mb-2">Item Sering Keluar</h3>
              <p className="text-lg font-bold line-clamp-1" title="BATTERY NON RECHARGEABLE TYPE AAA 1.5V">BATTERY NON RE...</p>
              <p className="text-xs text-primary font-medium mt-1">45 pengeluaran</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm bg-slate-900 text-white">
            <CardContent className="p-5 flex flex-col justify-center">
              <h3 className="font-semibold text-sm uppercase text-slate-400 mb-2">Estimasi Nilai Keluar</h3>
              <p className="text-2xl font-bold">Rp 12.5M</p>
              <p className="text-xs text-slate-400 mt-1">Berdasarkan data master</p>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Detail Transaksi</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari dalam laporan..." className="pl-9 h-9" />
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
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
          <div className="p-4 border-t flex justify-between items-center text-sm text-slate-500">
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