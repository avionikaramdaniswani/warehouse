import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Factory, Shield, Lock, Save, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function Pengaturan() {
  const { currentUser } = useAppContext();

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Password berhasil diubah');
    (e.target as HTMLFormElement).reset();
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profil berhasil diperbarui');
  };

  return (
    <Layout title="Pengaturan Sistem">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Col: Profile & Info */}
        <div className="space-y-6 md:col-span-1">
          <Card className="shadow-sm border-border">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {currentUser?.namaLengkap.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold text-slate-800">{currentUser?.namaLengkap}</h3>
              <p className="text-slate-500 font-mono text-sm mb-2">{currentUser?.nik}</p>
              <p className="text-slate-400 text-sm mb-2">{currentUser?.email}</p>
              <div className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                {currentUser?.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                {currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'operator' ? 'Operator' : 'Viewer'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-sidebar text-sidebar-foreground shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Factory className="w-5 h-5 text-primary" />
                Informasi Sistem
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3 pt-2 text-sidebar-foreground/80">
              <div className="flex justify-between border-b border-sidebar-border pb-2">
                <span>Versi Aplikasi</span>
                <span className="font-mono text-white">v1.2.0</span>
              </div>
              <div className="flex justify-between border-b border-sidebar-border pb-2">
                <span>Departemen</span>
                <span className="text-white">{currentUser?.departemen ?? '-'}</span>
              </div>
              <div className="flex justify-between border-b border-sidebar-border pb-2">
                <span>Jabatan</span>
                <span className="text-white">{currentUser?.jabatan ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Database</span>
                <span className="text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 block"></span> Connected
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Forms */}
        <div className="space-y-6 md:col-span-2">

          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle>Profil Pengguna</CardTitle>
              <CardDescription>Informasi akun Anda saat ini.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="namaLengkap">Nama Lengkap</Label>
                    <Input id="namaLengkap" defaultValue={currentUser?.namaLengkap} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nik">NIK (Tidak dapat diubah)</Label>
                    <Input id="nik" defaultValue={currentUser?.nik} disabled className="bg-slate-50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={currentUser?.email} />
                </div>
                <div className="pt-2">
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    <Save className="w-4 h-4 mr-2" /> Simpan Profil
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-slate-500" />
                Ubah Password
              </CardTitle>
              <CardDescription>Pastikan password baru Anda menggunakan kombinasi huruf dan angka.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Password Saat Ini</Label>
                  <Input id="current-password" type="password" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Password Baru</Label>
                  <Input id="new-password" type="password" required minLength={8} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
                  <Input id="confirm-password" type="password" required minLength={8} />
                </div>
                <div className="pt-2">
                  <Button type="submit" variant="secondary" className="bg-slate-800 text-white hover:bg-slate-900">
                    Perbarui Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </Layout>
  );
}
