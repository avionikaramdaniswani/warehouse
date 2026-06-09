import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  UserPlus, Pencil, ShieldAlert, CheckCircle, Search,
  Loader2, Eye, KeyRound, ClipboardList, Building2,
  Phone, Mail, CreditCard, CalendarDays, Clock, Shield, User as UserIcon,
} from 'lucide-react';
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

interface ActivityLog {
  id: number;
  aksi: string;
  detail: string | null;
  ipAddress: string | null;
  createdAt: string;
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

const roleBadge = (role: string) => ({ admin: 'Admin', operator: 'Operator', viewer: 'Viewer' }[role] ?? role);
const statusLabel = (s: string) => ({ active: 'Aktif', inactive: 'Nonaktif', suspended: 'Ditangguhkan' }[s] ?? s);
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
const fmtDateOnly = (d: string) => new Date(d).toLocaleDateString('id-ID', { dateStyle: 'long' });

export default function ManajemenUser() {
  const { currentUser, token } = useAppContext();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [resetPassOpen, setResetPassOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPass, setResettingPass] = useState(false);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

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

  /* ── LIHAT PROFIL ── */
  const handleOpenProfile = (user: ApiUser) => {
    setSelectedUser(user);
    setProfileOpen(true);
  };

  /* ── EDIT ── */
  const handleOpenEdit = (user: ApiUser) => {
    setSelectedUser(user);
    setFormData({
      nik: user.nik, namaLengkap: user.namaLengkap, email: user.email, password: '',
      role: user.role, noHp: user.noHp ?? '', departemen: user.departemen ?? '',
      jabatan: user.jabatan ?? '', seksi: user.seksi ?? '', status: user.status,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nik || !formData.namaLengkap || !formData.email) {
      toast.error('NIK, nama, dan email wajib diisi'); return;
    }
    if (!selectedUser && !formData.password) {
      toast.error('Password wajib diisi untuk pengguna baru'); return;
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
      setEditOpen(false);
      fetchUsers();
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setSaving(false);
    }
  };

  /* ── RESET PASSWORD ── */
  const handleOpenResetPass = (user: ApiUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setResetPassOpen(true);
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password minimal 8 karakter'); return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok'); return;
    }
    setResettingPass(true);
    try {
      const res = await fetch(`/api/users/${selectedUser!.id}/password`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ passwordBaru: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal mereset password'); return; }
      toast.success(`Password ${selectedUser!.namaLengkap} berhasil direset`);
      setResetPassOpen(false);
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setResettingPass(false);
    }
  };

  /* ── RIWAYAT AKTIVITAS ── */
  const handleOpenActivity = async (user: ApiUser) => {
    setSelectedUser(user);
    setActivityLogs([]);
    setActivityOpen(true);
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/users/${user.id}/activity`, { headers: authHeaders });
      if (res.ok) setActivityLogs(await res.json());
      else toast.error('Gagal memuat riwayat');
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setLoadingActivity(false);
    }
  };

  /* ── TOGGLE STATUS ── */
  const handleToggleStatus = (user: ApiUser) => {
    setSelectedUser(user);
    setAlertOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.status === 'active' ? 'inactive' : 'active';
    const res = await fetch(`/api/users/${selectedUser.id}`, {
      method: 'PUT', headers: authHeaders, body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(`Pengguna berhasil di${newStatus === 'active' ? 'aktifkan' : 'nonaktifkan'}`);
      fetchUsers();
    } else {
      toast.error('Gagal mengubah status');
    }
    setAlertOpen(false);
  };

  /* ── TAMBAH ── */
  const handleOpenAdd = () => {
    setSelectedUser(null);
    setFormData(emptyForm);
    setEditOpen(true);
  };

  const ActionButtons = ({ user }: { user: ApiUser }) => (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleOpenProfile(user)}>
            <Eye className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Lihat Profil</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50" onClick={() => handleOpenEdit(user)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit Data</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-violet-600 hover:bg-violet-50" onClick={() => handleOpenResetPass(user)}>
            <KeyRound className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reset Password</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-teal-600 hover:bg-teal-50" onClick={() => handleOpenActivity(user)}>
            <ClipboardList className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Riwayat Aktivitas</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost" size="icon"
            className={`h-8 w-8 ${user.status === 'active' ? 'text-slate-500 hover:text-red-600 hover:bg-red-50' : 'text-slate-500 hover:text-green-600 hover:bg-green-50'}`}
            onClick={() => handleToggleStatus(user)}
            disabled={user.id === currentUser?.id}
          >
            {user.status === 'active' ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{user.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <TooltipProvider>
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
                      <div className="flex gap-1 justify-end border-t pt-3">
                        <ActionButtons user={user} />
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
                        <TableRow key={user.id} className={user.status !== 'active' ? 'opacity-60' : ''}>
                          <TableCell className="font-mono text-sm">{user.nik}</TableCell>
                          <TableCell className="font-semibold text-slate-800">{user.namaLengkap}</TableCell>
                          <TableCell className="text-sm text-slate-600">{user.email}</TableCell>
                          <TableCell>
                            <span className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5 font-medium">{roleBadge(user.role)}</span>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{user.departemen ?? '-'}</TableCell>
                          <TableCell><StatusBadge status={statusLabel(user.status) as any} /></TableCell>
                          <TableCell className="text-sm text-slate-500">{fmtDate(user.loginTerakhir)}</TableCell>
                          <TableCell><ActionButtons user={user} /></TableCell>
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

        {/* ═══════════════════════════════════
            SHEET: LIHAT PROFIL
        ═══════════════════════════════════ */}
        <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>Profil Pengguna</SheetTitle>
            </SheetHeader>
            {selectedUser && (
              <div className="space-y-6">
                {/* Avatar + Name */}
                <div className="flex flex-col items-center text-center gap-3 pb-6 border-b">
                  <Avatar className="h-20 w-20 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                      {selectedUser.namaLengkap.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{selectedUser.namaLengkap}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{selectedUser.nik}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                        {selectedUser.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <UserIcon className="w-3 h-3 mr-1" />}
                        {roleBadge(selectedUser.role)}
                      </Badge>
                      <StatusBadge status={statusLabel(selectedUser.status) as any} />
                    </div>
                  </div>
                </div>

                {/* Info rows */}
                <div className="space-y-4">
                  <InfoRow icon={<Mail className="h-4 w-4 text-blue-500" />} label="Email" value={selectedUser.email} />
                  <InfoRow icon={<Phone className="h-4 w-4 text-green-500" />} label="No HP" value={selectedUser.noHp ?? '-'} />
                  <InfoRow icon={<Building2 className="h-4 w-4 text-orange-500" />} label="Departemen" value={selectedUser.departemen ?? '-'} />
                  <InfoRow icon={<CreditCard className="h-4 w-4 text-violet-500" />} label="Jabatan" value={selectedUser.jabatan ?? '-'} />
                  <InfoRow icon={<CreditCard className="h-4 w-4 text-teal-500" />} label="Seksi" value={selectedUser.seksi ?? '-'} />
                  <div className="border-t pt-4 space-y-4">
                    <InfoRow icon={<CalendarDays className="h-4 w-4 text-slate-400" />} label="Tanggal Bergabung" value={fmtDateOnly(selectedUser.tanggalGabung)} />
                    <InfoRow icon={<Clock className="h-4 w-4 text-slate-400" />} label="Login Terakhir" value={fmtDate(selectedUser.loginTerakhir)} />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setProfileOpen(false); handleOpenEdit(selectedUser); }}>
                    <Pencil className="w-4 h-4 mr-2" /> Edit Data
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { setProfileOpen(false); handleOpenResetPass(selectedUser); }}>
                    <KeyRound className="w-4 h-4 mr-2" /> Reset Pass
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* ═══════════════════════════════════
            DIALOG: EDIT / TAMBAH
        ═══════════════════════════════════ */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
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
              <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════
            DIALOG: RESET PASSWORD
        ═══════════════════════════════════ */}
        <Dialog open={resetPassOpen} onOpenChange={setResetPassOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-violet-600" />
                Reset Password
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-1 text-sm text-muted-foreground bg-slate-50 rounded-lg px-3 py-2 mb-2">
              <p>Pengguna: <span className="font-semibold text-slate-700">{selectedUser?.namaLengkap}</span></p>
              <p>NIK: <span className="font-mono text-slate-700">{selectedUser?.nik}</span></p>
            </div>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Password Baru <span className="text-red-500">*</span></Label>
                <Input type="password" placeholder="Minimal 8 karakter" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Konfirmasi Password <span className="text-red-500">*</span></Label>
                <Input
                  type="password"
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={confirmPassword && newPassword !== confirmPassword ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Password tidak cocok</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetPassOpen(false)}>Batal</Button>
              <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleResetPassword} disabled={resettingPass}>
                {resettingPass ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mereset...</> : <><KeyRound className="w-4 h-4 mr-2" />Reset Password</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════
            SHEET: RIWAYAT AKTIVITAS
        ═══════════════════════════════════ */}
        <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-teal-600" />
                Riwayat Aktivitas
              </SheetTitle>
              {selectedUser && (
                <p className="text-sm text-muted-foreground">
                  {selectedUser.namaLengkap} · <span className="font-mono">{selectedUser.nik}</span>
                </p>
              )}
            </SheetHeader>

            {loadingActivity ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuat riwayat...
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                <ClipboardList className="h-10 w-10 opacity-30" />
                <p className="text-sm">Belum ada aktivitas tercatat.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 pb-3 border-b last:border-0">
                    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                      <ClipboardList className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{log.aksi.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-slate-700 mt-0.5">{log.detail ?? '-'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {fmtDate(log.createdAt)}
                        </span>
                        {log.ipAddress && (
                          <span className="text-xs text-muted-foreground font-mono">{log.ipAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* ═══════════════════════════════════
            ALERT: TOGGLE STATUS
        ═══════════════════════════════════ */}
        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Perubahan Status</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin {selectedUser?.status === 'active' ? 'menonaktifkan' : 'mengaktifkan'} akun{' '}
                <strong>{selectedUser?.namaLengkap}</strong>?
                {selectedUser?.status === 'active' && ' Pengguna ini tidak akan bisa login ke sistem.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmToggleStatus}
                className={selectedUser?.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
              >
                Ya, Lanjutkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </TooltipProvider>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}
