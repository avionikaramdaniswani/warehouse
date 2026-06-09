import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Pencil, ShieldAlert, CheckCircle, Search, Clock, Loader2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { toast } from 'sonner';
import { Redirect } from 'wouter';

interface ApiUser {
  id: number;
  nik: string;
  namaLengkap: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  noHp: string | null;
  departemen: string | null;
  jabatan: string | null;
  seksi: string | null;
  status: 'active' | 'inactive' | 'suspended';
  loginTerakhir: string | null;
  tanggalGabung: string;
}

interface FormData {
  nik: string;
  namaLengkap: string;
  email: string;
  password: string;
  role: 'admin' | 'operator' | 'viewer';
  noHp: string;
  departemen: string;
  jabatan: string;
  seksi: string;
  status: 'active' | 'inactive' | 'suspended';
}

const emptyForm: FormData = {
  nik: '', namaLengkap: '', email: '', password: '',
  role: 'viewer', noHp: '', departemen: '', jabatan: '', seksi: '', status: 'active',
};

export default function ManajemenUser() {
  const { currentUser, token } = useAppContext();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  if (currentUser?.role !== 'admin') return <Redirect to="/dashboard" />;

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: authHeaders });
      if (res.ok) setUsers(await res.json());
    } catch {
      toast.error('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u =>
    u.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nik.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (user: ApiUser) => {
    setSelectedUser(user);
    setFormData({
      nik: user.nik, namaLengkap: user.namaLengkap, email: user.email, password: '',
      role: user.role, noHp: user.noHp ?? '', departemen: user.departemen ?? '',
      jabatan: user.jabatan ?? '', seksi: user.seksi ?? '', status: user.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nik || !formData.namaLengkap || !formData.email) {
      toast.error('NIK, nama, dan email wajib diisi');
      return;
    }
    if (!selectedUser && !formData.password) {
      toast.error('Password wajib diisi untuk pengguna baru');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {
        nik: formData.nik, namaLengkap: formData.namaLengkap, email: formData.email,
        role: formData.role, status: formData.status,
        noHp: formData.noHp, departemen: formData.departemen,
        jabatan: formData.jabatan, seksi: formData.seksi,
      };
      if (!selectedUser) body.password = formData.password;

      const url = selectedUser ? `/api/users/${selectedUser.id}` : '/api/users';
      const method = selectedUser ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) { toast.error(data.message ?? 'Gagal menyimpan'); return; }

      toast.success(selectedUser ? 'Pengguna berhasil diperbarui' : 'Pengguna baru berhasil ditambahkan');
      setModalOpen(false);
      fetchUsers();
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (user: ApiUser) => {
    setSelectedUser(user);
    setAlertOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.status === 'active' ? 'inactive' : 'active';
    const res = await fetch(`/api/users/${selectedUser.id}`, {
      method: 'PUT', headers: authHeaders,
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(`Pengguna berhasil di${newStatus === 'active' ? 'aktifkan' : 'nonaktifkan'}`);
      fetchUsers();
    } else {
      toast.error('Gagal mengubah status');
    }
    setAlertOpen(false);
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = { admin: 'Admin', operator: 'Operator', viewer: 'Viewer' };
    return map[role] ?? role;
  };

  const statusLabel = (s: string) => s === 'active' ? 'Aktif' : s === 'inactive' ? 'Nonaktif' : 'Ditangguhkan';

  return (
    <Layout title="Manajemen Pengguna">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama, NIK, atau email..." className="pl-9 bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto" onClick={handleOpenAdd}>
            <UserPlus className="w-4 h-4 mr-2" /> Tambah Pengguna
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuat data...
          </div>
        ) : (
          <>
            {/* MOBILE */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Tidak ada pengguna ditemukan.</div>
              ) : filtered.map((user) => (
                <Card key={user.id} className={user.status !== 'active' ? 'opacity-70' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-slate-800">{user.namaLengkap}</p>
                        <p className="text-xs font-mono text-muted-foreground">{user.nik} · {user.email}</p>
                      </div>
                      <StatusBadge status={statusLabel(user.status) as any} />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5 font-medium">{roleBadge(user.role)}</span>
                      {user.loginTerakhir && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                          <Clock className="h-3 w-3" />{new Date(user.loginTerakhir).toLocaleDateString('id-ID')}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => handleOpenEdit(user)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant={user.status === 'active' ? 'outline' : 'default'}
                        size="sm"
                        className={`flex-1 h-8 ${user.status === 'active' ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200' : 'bg-green-600 hover:bg-green-700'}`}
                        onClick={() => handleToggleStatus(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.status === 'active' ? <><ShieldAlert className="w-3.5 h-3.5 mr-1" />Nonaktifkan</> : <><CheckCircle className="w-3.5 h-3.5 mr-1" />Aktifkan</>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* DESKTOP */}
            <Card className="shadow-sm border-border overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead>NIK</TableHead>
                      <TableHead>Nama Lengkap</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Login Terakhir</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length > 0 ? filtered.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-sm">{user.nik}</TableCell>
                        <TableCell className="font-semibold text-slate-800">{user.namaLengkap}</TableCell>
                        <TableCell className="text-sm text-slate-600">{user.email}</TableCell>
                        <TableCell><span className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5 font-medium">{roleBadge(user.role)}</span></TableCell>
                        <TableCell className="text-sm text-slate-600">{user.departemen ?? '-'}</TableCell>
                        <TableCell><StatusBadge status={statusLabel(user.status) as any} /></TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {user.loginTerakhir ? new Date(user.loginTerakhir).toLocaleString('id-ID') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(user)} className="h-8">
                              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              variant={user.status === 'active' ? 'outline' : 'default'}
                              size="sm"
                              className={`h-8 ${user.status === 'active' ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200' : 'bg-green-600 hover:bg-green-700'}`}
                              onClick={() => handleToggleStatus(user)}
                              disabled={user.id === currentUser?.id}
                            >
                              {user.status === 'active' ? <><ShieldAlert className="w-3.5 h-3.5 mr-1" />Nonaktifkan</> : <><CheckCircle className="w-3.5 h-3.5 mr-1" />Aktifkan</>}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">Tidak ada pengguna ditemukan.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Modal Add/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{selectedUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>NIK <span className="text-red-500">*</span></Label>
                <Input value={formData.nik} onChange={(e) => setFormData({ ...formData, nik: e.target.value })} disabled={!!selectedUser} className={selectedUser ? 'bg-slate-50' : ''} />
              </div>
              <div className="space-y-1.5">
                <Label>Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input value={formData.namaLengkap} onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>No HP</Label>
                <Input value={formData.noHp} onChange={(e) => setFormData({ ...formData, noHp: e.target.value })} />
              </div>
            </div>
            {!selectedUser && (
              <div className="space-y-1.5">
                <Label>Password <span className="text-red-500">*</span></Label>
                <Input type="password" placeholder="Minimal 8 karakter" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Departemen</Label>
                <Input value={formData.departemen} onChange={(e) => setFormData({ ...formData, departemen: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Jabatan</Label>
                <Input value={formData.jabatan} onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Seksi</Label>
                <Input value={formData.seksi} onChange={(e) => setFormData({ ...formData, seksi: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role Akses</Label>
                <Select value={formData.role} onValueChange={(v: any) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                    <SelectItem value="suspended">Ditangguhkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Status */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Perubahan Status</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin {selectedUser?.status === 'active' ? 'menonaktifkan' : 'mengaktifkan'} akun <strong>{selectedUser?.namaLengkap}</strong>?
              {selectedUser?.status === 'active' && ' Pengguna ini tidak akan bisa login ke sistem.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleStatus} className={selectedUser?.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}>
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
