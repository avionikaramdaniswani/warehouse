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
  userAgent: string | null;
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

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-700 font-medium text-right truncate">{value || '-'}</span>
    </div>
  );
}

function ProfileFieldGrid({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-slate-400">{label}</span>
      <span className="text-sm text-slate-700 font-medium truncate">{value || '-'}</span>
    </div>
  );
}

const aksiColor = (aksi: string): { dot: string; badge: string } => {
  if (aksi.includes('LOGIN'))    return { dot: 'bg-blue-500 ring-blue-200',   badge: 'bg-blue-50 text-blue-700' };
  if (aksi.includes('LOGOUT'))   return { dot: 'bg-slate-400 ring-slate-200', badge: 'bg-slate-100 text-slate-600' };
  if (aksi.includes('CREATE'))   return { dot: 'bg-green-500 ring-green-200', badge: 'bg-green-50 text-green-700' };
  if (aksi.includes('UPDATE'))   return { dot: 'bg-amber-500 ring-amber-200', badge: 'bg-amber-50 text-amber-700' };
  if (aksi.includes('PASSWORD')) return { dot: 'bg-orange-500 ring-orange-200', badge: 'bg-orange-50 text-orange-700' };
  if (aksi.includes('DELETE'))   return { dot: 'bg-red-500 ring-red-200',     badge: 'bg-red-50 text-red-700' };
  return { dot: 'bg-slate-300 ring-slate-100', badge: 'bg-slate-100 text-slate-600' };
};

const parseUA = (ua: string | null): string => {
  if (!ua) return '';
  let browser = 'Browser';
  if (ua.includes('Edg'))     browser = 'Edge';
  else if (ua.includes('Chrome'))   browser = 'Chrome';
  else if (ua.includes('Firefox'))  browser = 'Firefox';
  else if (ua.includes('Safari'))   browser = 'Safari';
  let os = '';
  if (ua.includes('Windows'))       os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android'))  os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux'))    os = 'Linux';
  return os ? `${browser} · ${os}` : browser;
};

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
  const [activityTypeFilter, setActivityTypeFilter] = useState('semua');
  const [activityTimeFilter, setActivityTimeFilter] = useState('semua');

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
    setActivityTypeFilter('semua');
    setActivityTimeFilter('semua');
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
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-orange-600 hover:bg-orange-50" onClick={() => handleOpenResetPass(user)}>
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
          <SheetContent className="w-full sm:max-w-[400px] flex flex-col p-0 gap-0 [&>button]:text-white/60 [&>button]:hover:text-white [&>button]:hover:opacity-100 [&>button]:top-5 [&>button]:right-5">
            {selectedUser && (
              <>
                {/* ── Header ── */}
                <div className="bg-sidebar px-6 pt-8 pb-6 flex flex-col items-center text-center gap-3">
                  <Avatar className="h-16 w-16 ring-2 ring-white/20">
                    <AvatarFallback className="bg-white/10 text-white text-xl font-bold tracking-wide">
                      {selectedUser.namaLengkap.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-base font-semibold text-white leading-tight">{selectedUser.namaLengkap}</h3>
                    <p className="text-xs text-white/50 font-mono mt-0.5">{selectedUser.nik}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-white/10 text-white/90 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                      {roleBadge(selectedUser.role)}
                    </span>
                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                      selectedUser.status === 'active'
                        ? 'bg-green-400/20 text-green-300'
                        : 'bg-red-400/20 text-red-300'
                    }`}>
                      {statusLabel(selectedUser.status)}
                    </span>
                  </div>
                </div>

                {/* ── Info Sections ── */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">

                  {/* Kontak */}
                  <div className="px-6 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Kontak</p>
                    <div className="space-y-3">
                      <ProfileField label="Email" value={selectedUser.email} />
                      <ProfileField label="No HP" value={selectedUser.noHp ?? '-'} />
                    </div>
                  </div>

                  {/* Pekerjaan */}
                  <div className="px-6 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Pekerjaan</p>
                    <div className="space-y-3">
                      <ProfileField label="Departemen" value={selectedUser.departemen ?? '-'} />
                      <ProfileField label="Jabatan"    value={selectedUser.jabatan ?? '-'} />
                      <ProfileField label="Seksi"      value={selectedUser.seksi ?? '-'} />
                    </div>
                  </div>

                  {/* Akun */}
                  <div className="px-6 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Akun</p>
                    <div className="space-y-3">
                      <ProfileField label="Bergabung" value={fmtDateOnly(selectedUser.tanggalGabung)} />
                      <ProfileField label="Login Terakhir" value={fmtDate(selectedUser.loginTerakhir)} />
                    </div>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div className="px-6 py-4 border-t bg-slate-50 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => { setProfileOpen(false); handleOpenEdit(selectedUser); }}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Data
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => { setProfileOpen(false); handleOpenResetPass(selectedUser); }}>
                    <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Reset Password
                  </Button>
                </div>
              </>
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
                  <Label>Email {!selectedUser && <span className="text-red-500">*</span>}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!selectedUser}
                    className={selectedUser ? 'bg-slate-50 text-slate-400' : ''}
                  />
                  {selectedUser && <p className="text-[11px] text-muted-foreground">Email tidak dapat diubah.</p>}
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
                <KeyRound className="w-5 h-5 text-slate-500" />
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
              <Button className="bg-primary hover:bg-primary/90" onClick={handleResetPassword} disabled={resettingPass}>
                {resettingPass ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mereset...</> : <><KeyRound className="w-4 h-4 mr-2" />Reset Password</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════
            SHEET: RIWAYAT AKTIVITAS
        ═══════════════════════════════════ */}
        <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
          <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b">
              <SheetHeader>
                <SheetTitle className="text-base font-semibold">Riwayat Aktivitas</SheetTitle>
              </SheetHeader>
              {selectedUser && (
                <div className="mt-1 flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {selectedUser.namaLengkap.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-sm font-medium text-slate-800">{selectedUser.namaLengkap}</span>
                    <span className="text-xs text-muted-foreground font-mono ml-2">{selectedUser.nik}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Filter bar */}
            {!loadingActivity && activityLogs.length > 0 && (() => {
              const uniqueTypes = Array.from(new Set(activityLogs.map(l => l.aksi)));
              const now = new Date();
              const filtered = activityLogs.filter(log => {
                const matchType = activityTypeFilter === 'semua' || log.aksi === activityTypeFilter;
                let matchTime = true;
                if (activityTimeFilter === 'hari_ini') {
                  matchTime = new Date(log.createdAt).toDateString() === now.toDateString();
                } else if (activityTimeFilter === '7_hari') {
                  matchTime = (now.getTime() - new Date(log.createdAt).getTime()) <= 7 * 86400000;
                } else if (activityTimeFilter === '30_hari') {
                  matchTime = (now.getTime() - new Date(log.createdAt).getTime()) <= 30 * 86400000;
                }
                return matchType && matchTime;
              });

              return (
                <>
                  <div className="px-6 py-3 border-b bg-slate-50 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                        <SelectTrigger className="h-8 text-xs flex-1 bg-white">
                          <SelectValue placeholder="Semua jenis" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semua">Semua Jenis</SelectItem>
                          {uniqueTypes.map(t => (
                            <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={activityTimeFilter} onValueChange={setActivityTimeFilter}>
                        <SelectTrigger className="h-8 text-xs flex-1 bg-white">
                          <SelectValue placeholder="Semua waktu" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semua">Semua Waktu</SelectItem>
                          <SelectItem value="hari_ini">Hari Ini</SelectItem>
                          <SelectItem value="7_hari">7 Hari Terakhir</SelectItem>
                          <SelectItem value="30_hari">30 Hari Terakhir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Menampilkan <span className="font-semibold text-slate-700">{filtered.length}</span> dari {activityLogs.length} entri
                    </p>
                  </div>

                  {/* Timeline */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <p className="text-sm">Tidak ada aktivitas yang cocok dengan filter.</p>
                        <button className="text-xs text-primary mt-2 underline underline-offset-2" onClick={() => { setActivityTypeFilter('semua'); setActivityTimeFilter('semua'); }}>
                          Reset filter
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                        <div className="space-y-0">
                          {filtered.map((log, i) => (
                            <div key={log.id} className="relative flex gap-4 pb-5 last:pb-0">
                              <div className="relative flex-shrink-0 mt-1">
                                <div className={`w-3.5 h-3.5 rounded-full border-2 border-white ring-1 ${aksiColor(log.aksi).dot}`} />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${aksiColor(log.aksi).badge}`}>
                                    {log.aksi.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                                    {fmtDate(log.createdAt)}
                                  </span>
                                </div>
                                {log.detail && (
                                  <p className="text-sm text-slate-700 leading-snug">{log.detail}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-3 mt-1.5">
                                  {log.ipAddress && (
                                    <span className="text-[11px] text-slate-400 font-mono">IP: {log.ipAddress}</span>
                                  )}
                                  {log.userAgent && (
                                    <span className="text-[11px] text-slate-400">{parseUA(log.userAgent)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {loadingActivity && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Memuat riwayat...</span>
              </div>
            )}

            {!loadingActivity && activityLogs.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-1">
                <ClipboardList className="h-8 w-8 opacity-20" />
                <p className="text-sm">Belum ada aktivitas tercatat.</p>
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
