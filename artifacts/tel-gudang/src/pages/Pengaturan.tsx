import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Factory, Shield, Lock, Save, User as UserIcon, Tag, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Kategori {
  id: number;
  nama: string;
  keterangan: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function useKategoris(token: string | null) {
  const [kategoris, setKategoris] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKategoris = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/kategoris/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setKategoris(await res.json());
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKategoris(); }, [token]);
  return { kategoris, loading, refetch: fetchKategoris };
}

export default function Pengaturan() {
  const { currentUser, token } = useAppContext();
  const { kategoris, loading: katLoading, refetch } = useKategoris(token);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Kategori | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Kategori | null>(null);
  const [form, setForm] = useState({ nama: '', keterangan: '' });
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setForm({ nama: '', keterangan: '' }); setAddOpen(true); };
  const openEdit = (k: Kategori) => { setForm({ nama: k.nama, keterangan: k.keterangan ?? '' }); setEditTarget(k); };

  const handleSaveAdd = async () => {
    if (!form.nama.trim()) { toast.error('Nama kategori tidak boleh kosong'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/kategoris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nama: form.nama.trim(), keterangan: form.keterangan.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal menyimpan'); return; }
      toast.success('Kategori berhasil ditambahkan');
      setAddOpen(false);
      refetch();
    } catch { toast.error('Terjadi kesalahan'); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!form.nama.trim()) { toast.error('Nama kategori tidak boleh kosong'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/kategoris/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nama: form.nama.trim(), keterangan: form.keterangan.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal menyimpan'); return; }
      toast.success('Kategori berhasil diperbarui');
      setEditTarget(null);
      refetch();
    } catch { toast.error('Terjadi kesalahan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/kategoris/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal menghapus'); return; }
      toast.success('Kategori berhasil dihapus');
      setDeleteTarget(null);
      refetch();
    } catch { toast.error('Terjadi kesalahan'); }
    finally { setSaving(false); }
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Password berhasil diubah');
    (e.target as HTMLFormElement).reset();
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profil berhasil diperbarui');
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <Layout title="Pengaturan Sistem">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Col */}
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

        {/* Right Col */}
        <div className="space-y-6 md:col-span-2">

          {/* Kelola Kategori — hanya admin */}
          {isAdmin && (
            <Card className="shadow-sm border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-primary" />
                      Kelola Kategori Barang
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Kategori ini digunakan pada halaman Master Barang.
                    </CardDescription>
                  </div>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 shrink-0" onClick={openAdd}>
                    <Plus className="w-4 h-4 mr-1" /> Tambah
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {katLoading ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">Memuat...</div>
                ) : kategoris.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Belum ada kategori. Klik "Tambah" untuk membuat kategori baru.
                  </div>
                ) : (
                  <div className="divide-y">
                    {kategoris.map((k) => (
                      <div key={k.id} className="flex items-center justify-between py-2.5 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant={k.isActive ? 'default' : 'secondary'} className="shrink-0 text-xs">
                            {k.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-slate-800">{k.nama}</p>
                            {k.keterangan && (
                              <p className="text-xs text-muted-foreground truncate">{k.keterangan}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => openEdit(k)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => setDeleteTarget(k)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Profil */}
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

          {/* Ubah Password */}
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

      {/* Modal Tambah Kategori */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Kategori Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Kategori <span className="text-red-500">*</span></Label>
              <Input placeholder="Contoh: Electrical" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Keterangan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Input placeholder="Deskripsi singkat kategori" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}><X className="w-4 h-4 mr-1" />Batal</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleSaveAdd} disabled={saving}>
              <Check className="w-4 h-4 mr-1" />{saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Kategori */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Kategori</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Kategori <span className="text-red-500">*</span></Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Keterangan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Input placeholder="Deskripsi singkat kategori" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}><X className="w-4 h-4 mr-1" />Batal</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleSaveEdit} disabled={saving}>
              <Check className="w-4 h-4 mr-1" />{saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Kategori</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Yakin ingin menghapus kategori <strong>"{deleteTarget?.nama}"</strong>? Kategori yang sedang digunakan pada barang tidak akan terpengaruh.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={saving}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
