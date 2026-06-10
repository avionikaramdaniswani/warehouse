import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/context/AppContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Factory, Shield, Lock, Save, User as UserIcon, Tag, Plus, Pencil, Trash2, X, Check, Phone, Building2, Briefcase, Users2, Calendar, Clock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
      const res = await fetch('/api/kategori/all', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setKategoris(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchKategoris(); }, [token]);
  return { kategoris, loading, refetch: fetchKategoris };
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function roleLabel(role: string) {
  if (role === 'admin') return 'Admin';
  if (role === 'operator') return 'Operator';
  return 'Viewer';
}

export default function Pengaturan() {
  const { currentUser, token, setAuth } = useAppContext();
  const { kategoris, loading: katLoading, refetch } = useKategoris(token);
  const isAdmin = currentUser?.role === 'admin';

  // ── Profil state ─────────────────────────────────────────────────────────
  const [profil, setProfil] = useState({
    namaLengkap: currentUser?.namaLengkap ?? '',
    email: currentUser?.email ?? '',
    noHp: currentUser?.noHp ?? '',
    departemen: currentUser?.departemen ?? '',
    jabatan: currentUser?.jabatan ?? '',
    seksi: currentUser?.seksi ?? '',
  });
  const [savingProfil, setSavingProfil] = useState(false);

  const handleSaveProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfil(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          namaLengkap: profil.namaLengkap.trim() || undefined,
          email: profil.email.trim() || undefined,
          noHp: profil.noHp.trim() || null,
          departemen: profil.departemen.trim() || null,
          jabatan: profil.jabatan.trim() || null,
          seksi: profil.seksi.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal menyimpan profil'); return; }
      const stored = localStorage.getItem('tel_gudang_token');
      if (stored && currentUser) {
        const updated = { ...currentUser, ...data };
        localStorage.setItem('tel_gudang_user', JSON.stringify(updated));
        setAuth(updated, stored);
        setProfil({
          namaLengkap: updated.namaLengkap ?? '',
          email: updated.email ?? '',
          noHp: updated.noHp ?? '',
          departemen: updated.departemen ?? '',
          jabatan: updated.jabatan ?? '',
          seksi: updated.seksi ?? '',
        });
      }
      toast.success('Profil berhasil diperbarui');
    } catch { toast.error('Terjadi kesalahan'); }
    finally { setSavingProfil(false); }
  };

  // ── Password state ────────────────────────────────────────────────────────
  const [pw, setPw] = useState({ passwordLama: '', passwordBaru: '', konfirmasi: '' });
  const [showPw, setShowPw] = useState({ lama: false, baru: false, konfirmasi: false });
  const [savingPw, setSavingPw] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.passwordBaru !== pw.konfirmasi) { toast.error('Konfirmasi password tidak cocok'); return; }
    if (pw.passwordBaru.length < 8) { toast.error('Password baru minimal 8 karakter'); return; }
    setSavingPw(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(pw),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal mengubah password'); return; }
      toast.success('Password berhasil diubah');
      setPw({ passwordLama: '', passwordBaru: '', konfirmasi: '' });
    } catch { toast.error('Terjadi kesalahan'); }
    finally { setSavingPw(false); }
  };

  // ── Kategori state ────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Kategori | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Kategori | null>(null);
  const [form, setForm] = useState({ nama: '', keterangan: '' });
  const [savingKat, setSavingKat] = useState(false);

  const openAdd = () => { setForm({ nama: '', keterangan: '' }); setAddOpen(true); };
  const openEdit = (k: Kategori) => { setForm({ nama: k.nama, keterangan: k.keterangan ?? '' }); setEditTarget(k); };

  const handleSaveAdd = async () => {
    if (!form.nama.trim()) { toast.error('Nama kategori tidak boleh kosong'); return; }
    setSavingKat(true);
    try {
      const res = await fetch('/api/kategori', {
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
    finally { setSavingKat(false); }
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!form.nama.trim()) { toast.error('Nama kategori tidak boleh kosong'); return; }
    setSavingKat(true);
    try {
      const res = await fetch(`/api/kategori/${editTarget.id}`, {
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
    finally { setSavingKat(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSavingKat(true);
    try {
      const res = await fetch(`/api/kategori/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal menghapus'); return; }
      toast.success('Kategori berhasil dihapus');
      setDeleteTarget(null);
      refetch();
    } catch { toast.error('Terjadi kesalahan'); }
    finally { setSavingKat(false); }
  };

  const initials = currentUser?.namaLengkap.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <Layout title="Pengaturan">
      <div className="max-w-3xl mx-auto">

        {/* Header kartu user */}
        <Card className="mb-6 shadow-sm border-border">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-800 truncate">{currentUser?.namaLengkap}</h2>
                <p className="text-sm text-slate-500 font-mono">{currentUser?.nik}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs gap-1 font-medium">
                    {currentUser?.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                    {roleLabel(currentUser?.role ?? '')}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">Aktif</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="profil">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="profil" className="flex-1">Profil</TabsTrigger>
            <TabsTrigger value="keamanan" className="flex-1">Keamanan</TabsTrigger>
            {isAdmin && <TabsTrigger value="sistem" className="flex-1">Sistem</TabsTrigger>}
          </TabsList>

          {/* ── TAB PROFIL ─────────────────────────────────────────────── */}
          <TabsContent value="profil" className="space-y-6">
            <Card className="shadow-sm border-border">
              <CardHeader>
                <CardTitle className="text-base">Informasi Pribadi</CardTitle>
                <CardDescription>Data yang bisa kamu ubah sendiri.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfil} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="namaLengkap">Nama Lengkap <span className="text-red-500">*</span></Label>
                      <Input
                        id="namaLengkap"
                        value={profil.namaLengkap}
                        onChange={(e) => setProfil({ ...profil, namaLengkap: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nik">NIK <span className="text-xs text-muted-foreground">(tidak dapat diubah)</span></Label>
                      <Input id="nik" value={currentUser?.nik ?? ''} disabled className="bg-slate-50 font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        value={profil.email}
                        onChange={(e) => setProfil({ ...profil, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="noHp" className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> No. HP / WhatsApp</Label>
                      <Input
                        id="noHp"
                        placeholder="Contoh: 08123456789"
                        value={profil.noHp}
                        onChange={(e) => setProfil({ ...profil, noHp: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="departemen" className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Departemen</Label>
                      <Input
                        id="departemen"
                        placeholder="Contoh: Maintenance"
                        value={profil.departemen}
                        onChange={(e) => setProfil({ ...profil, departemen: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jabatan" className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> Jabatan</Label>
                      <Input
                        id="jabatan"
                        placeholder="Contoh: Storekeeper"
                        value={profil.jabatan}
                        onChange={(e) => setProfil({ ...profil, jabatan: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seksi" className="flex items-center gap-1"><Users2 className="w-3.5 h-3.5" /> Seksi</Label>
                      <Input
                        id="seksi"
                        placeholder="Contoh: Gudang A"
                        value={profil.seksi}
                        onChange={(e) => setProfil({ ...profil, seksi: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={savingProfil}>
                      <Save className="w-4 h-4 mr-2" />
                      {savingProfil ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Info akun – read only */}
            <Card className="shadow-sm border-border">
              <CardHeader>
                <CardTitle className="text-base">Info Akun</CardTitle>
                <CardDescription>Data sistem yang tidak bisa diubah.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Role</p>
                    <p className="font-medium">{roleLabel(currentUser?.role ?? '')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status Akun</p>
                    <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 font-medium">Aktif</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Tanggal Bergabung</p>
                    <p>{formatDate(currentUser?.tanggalGabung)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Login Terakhir</p>
                    <p>{formatDate(currentUser?.loginTerakhir)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB KEAMANAN ───────────────────────────────────────────── */}
          <TabsContent value="keamanan">
            <Card className="shadow-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="w-4 h-4 text-slate-500" /> Ubah Password
                </CardTitle>
                <CardDescription>Gunakan kombinasi huruf besar, huruf kecil, angka, dan simbol.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  {((['lama', 'baru', 'konfirmasi'] as const)).map((key) => {
                    const labels = { lama: 'Password Saat Ini', baru: 'Password Baru', konfirmasi: 'Konfirmasi Password Baru' };
                    const fields = { lama: 'passwordLama', baru: 'passwordBaru', konfirmasi: 'konfirmasi' } as const;
                    return (
                      <div key={key} className="space-y-2">
                        <Label>{labels[key]}{key !== 'lama' && <span className="text-red-500"> *</span>}</Label>
                        <div className="relative">
                          <Input
                            type={showPw[key] ? 'text' : 'password'}
                            value={pw[fields[key]]}
                            onChange={(e) => setPw({ ...pw, [fields[key]]: e.target.value })}
                            required
                            minLength={key !== 'lama' ? 8 : 1}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700"
                            onClick={() => setShowPw({ ...showPw, [key]: !showPw[key] })}
                          >
                            {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-1">
                    <Button type="submit" variant="secondary" className="bg-slate-800 text-white hover:bg-slate-900" disabled={savingPw}>
                      <Lock className="w-4 h-4 mr-2" />
                      {savingPw ? 'Memproses...' : 'Perbarui Password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB SISTEM (admin only) ────────────────────────────────── */}
          {isAdmin && (
            <TabsContent value="sistem" className="space-y-6">
              <Card className="shadow-sm border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Tag className="w-4 h-4 text-primary" /> Kelola Kategori Barang
                      </CardTitle>
                      <CardDescription className="mt-1">Kategori ini digunakan pada halaman Master Barang.</CardDescription>
                    </div>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 shrink-0" onClick={openAdd}>
                      <Plus className="w-4 h-4 mr-1" /> Tambah
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {katLoading ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Memuat...</p>
                  ) : kategoris.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Belum ada kategori.</p>
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
                              {k.keterangan && <p className="text-xs text-muted-foreground truncate">{k.keterangan}</p>}
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

              <Card className="shadow-sm border-border bg-sidebar text-sidebar-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Factory className="w-4 h-4 text-primary" /> Informasi Sistem
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3 pt-0 text-sidebar-foreground/80">
                  {[
                    ['Versi Aplikasi', 'v1.2.0'],
                    ['Platform', 'PT Tanjungenim Lestari Pulp & Paper'],
                    ['Database', null],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-sidebar-border pb-2 last:border-0 last:pb-0">
                      <span>{label}</span>
                      {label === 'Database' ? (
                        <span className="text-green-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 block" /> Terhubung
                        </span>
                      ) : (
                        <span className="text-white font-mono">{value}</span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Modal Tambah Kategori */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Tambah Kategori Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Kategori <span className="text-red-500">*</span></Label>
              <Input placeholder="Contoh: Electrical" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Keterangan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Input placeholder="Deskripsi singkat" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={savingKat}><X className="w-4 h-4 mr-1" />Batal</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleSaveAdd} disabled={savingKat}>
              <Check className="w-4 h-4 mr-1" />{savingKat ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Kategori */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Kategori</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Kategori <span className="text-red-500">*</span></Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Keterangan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Input placeholder="Deskripsi singkat" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={savingKat}><X className="w-4 h-4 mr-1" />Batal</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleSaveEdit} disabled={savingKat}>
              <Check className="w-4 h-4 mr-1" />{savingKat ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Hapus Kategori</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Yakin ingin menghapus kategori <strong>"{deleteTarget?.nama}"</strong>? Barang yang sudah menggunakan kategori ini tidak akan terpengaruh.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={savingKat}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={savingKat}>
              {savingKat ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
