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
  UserPlus, ShieldAlert, CheckCircle, Search,
  Loader2, Eye, ClipboardList, Building2,
  Phone, Mail, CreditCard, CalendarDays, Clock, Shield, User as UserIcon, Trash2, Save, ToggleLeft, ToggleRight,
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
  role: 'admin' | 'kepala_gudang' | 'petugas';
  noHp: string | null;
  departemen: string | null;
  jabatan: string | null;
  seksi: string | null;
  status: 'active' | 'inactive' | 'suspended';
  permissions: { transaksi_masuk?: boolean; transaksi_keluar?: boolean } | null;
  dibuatOleh: number | null;
  dibuatOlehNama: string | null;
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
  role: 'admin' | 'kepala_gudang' | 'petugas';
  noHp: string;
  departemen: string;
  jabatan: string;
  seksi: string;
  status: 'active' | 'inactive' | 'suspended';
}

const emptyForm: FormData = {
  nik: '', namaLengkap: '', email: '', password: '',
  role: 'petugas', noHp: '', departemen: '', jabatan: '', seksi: '', status: 'active',
};

const roleBadge = (role: string) => ({ admin: 'Admin', kepala_gudang: 'Kepala Gudang', petugas: 'Petugas' }[role] ?? role);
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
  const [activityOpen, setActivityOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<ApiUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [profileRole, setProfileRole] = useState<'admin' | 'kepala_gudang' | 'petugas' | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityTypeFilter, setActivityTypeFilter] = useState('semua');
  const [activityTimeFilter, setActivityTimeFilter] = useState('semua');

  const [permissionsMap, setPermissionsMap] = useState<Record<number, { transaksi_masuk: boolean; transaksi_keluar: boolean }>>({});
  const [savingPermIds, setSavingPermIds] = useState<Set<number>>(new Set());

  if (currentUser?.role !== 'admin') return <Redirect to="/dashboard" />;

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const getEffectivePerms = (user: ApiUser) =>
    permissionsMap[user.id] ?? {
      transaksi_masuk: user.permissions?.transaksi_masuk ?? false,
      transaksi_keluar: user.permissions?.transaksi_keluar ?? false,
    };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: authHeaders });
      if (res.ok) {
        const data: ApiUser[] = await res.json();
        setUsers(data);
        const map: Record<number, { transaksi_masuk: boolean; transaksi_keluar: boolean }> = {};
        for (const u of data) {
          if (u.role === 'petugas') {
            map[u.id] = {
              transaksi_masuk: u.permissions?.transaksi_masuk ?? false,
              transaksi_keluar: u.permissions?.transaksi_keluar ?? false,
            };
          }
        }
        setPermissionsMap(map);
      }
    } catch {
      toast.error('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePermissions = async (user: ApiUser) => {
    const perms = getEffectivePerms(user);
    setSavingPermIds((s) => new Set(s).add(user.id));
    try {
      const res = await fetch(`/api/users/${user.id}/permissions`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify(perms),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal menyimpan akses'); return; }
      toast.success(`Akses ${user.namaLengkap} berhasil diperbarui`);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, permissions: perms } : u));
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setSavingPermIds((s) => { const n = new Set(s); n.delete(user.id); return n; });
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
    setProfileRole(user.role);
    setProfileOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nik || !formData.namaLengkap || !formData.email) {
      toast.error('NIK, nama, dan email wajib diisi'); return;
    }
    if (!formData.password) {
      toast.error('Password wajib diisi'); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          nik: formData.nik, namaLengkap: formData.namaLengkap, email: formData.email,
          password: formData.password, role: formData.role, status: formData.status,
          noHp: formData.noHp, departemen: formData.departemen,
          jabatan: formData.jabatan, seksi: formData.seksi,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal menyimpan'); return; }
      toast.success('Pengguna baru berhasil ditambahkan');
      setEditOpen(false);
      fetchUsers();
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setSaving(false);
    }
  };

  /* ── GANTI ROLE (dari panel profil) ── */
  const handleSaveRole = async () => {
    if (!selectedUser || profileRole === selectedUser.role) return;
    setSavingRole(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ role: profileRole }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal mengubah role'); return; }
      toast.success(`Role ${selectedUser.namaLengkap} diubah ke ${roleBadge(profileRole!)}`);
      setSelectedUser({ ...selectedUser, role: profileRole! });
      fetchUsers();
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setSavingRole(false);
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

  /* ── HAPUS AKUN ── */
  const handleOpenDelete = (user: ApiUser) => {
    setDeleteUser(user);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Gagal menghapus akun'); return; }
      toast.success(`Akun ${deleteUser.namaLengkap} berhasil dihapus`);
      setDeleteOpen(false);
      fetchUsers();
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setDeleting(false);
    }
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

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-slate-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleOpenDelete(user)}
            disabled={user.id === currentUser?.id}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Hapus Akun</TooltipContent>
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
          ) : (() => {
            const filteredStaff = filtered.filter(u => u.role === 'admin' || u.role === 'kepala_gudang');
            const filteredPetugas = filtered.filter(u => u.role === 'petugas');

            const UserCard = ({ user, children }: { user: ApiUser; children?: React.ReactNode }) => (
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
                  {children}
                </CardContent>
              </Card>
            );

            const UserTableRows = ({ list, colSpan = 8 }: { list: ApiUser[]; colSpan?: number }) =>
              list.length > 0 ? (
                <>
                  {list.map((user) => (
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
                  ))}
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-20 text-center text-muted-foreground text-sm">Tidak ada pengguna.</TableCell>
                </TableRow>
              );

            const tableHeader = (
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
            );

            return (
              <>
                {/* ── TABEL ── */}
                <div className="flex flex-col gap-5">
                  {/* Tabel Admin & Kepala Gudang */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-slate-700">Admin & Kepala Gudang</h3>
                      <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">{filteredStaff.length} pengguna</span>
                    </div>
                    <Card className="shadow-sm border-border overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          {tableHeader}
                          <TableBody><UserTableRows list={filteredStaff} /></TableBody>
                        </Table>
                      </div>
                    </Card>
                  </div>

                  {/* Tabel Petugas */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <UserIcon className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-700">Petugas</h3>
                      <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">{filteredPetugas.length} pengguna</span>
                      <span className="text-xs text-slate-400 ml-1">— atur hak akses tambahan per petugas</span>
                    </div>
                    <Card className="shadow-sm border-border overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-100">
                            <TableRow>
                              <TableHead>NIK</TableHead>
                              <TableHead>Nama Lengkap</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Departemen</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Login Terakhir</TableHead>
                              <TableHead className="text-center">Barang Masuk</TableHead>
                              <TableHead className="text-center">Barang Keluar</TableHead>
                              <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPetugas.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="h-20 text-center text-muted-foreground text-sm">Tidak ada petugas.</TableCell>
                              </TableRow>
                            ) : filteredPetugas.map((user) => {
                              const perms = getEffectivePerms(user);
                              const isSaving = savingPermIds.has(user.id);
                              const origPerms = {
                                transaksi_masuk: user.permissions?.transaksi_masuk ?? false,
                                transaksi_keluar: user.permissions?.transaksi_keluar ?? false,
                              };
                              const isDirty = perms.transaksi_masuk !== origPerms.transaksi_masuk || perms.transaksi_keluar !== origPerms.transaksi_keluar;

                              const PermToggle = ({ field, label }: { field: 'transaksi_masuk' | 'transaksi_keluar'; label: string }) => {
                                const on = perms[field];
                                return (
                                  <button
                                    onClick={() => setPermissionsMap((m) => ({ ...m, [user.id]: { ...perms, [field]: !on } }))}
                                    className={`flex flex-col items-center gap-1 rounded px-2 py-1 transition-colors ${on ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-50'}`}
                                    title={`${label}: ${on ? 'Aktif' : 'Nonaktif'}`}
                                  >
                                    {on
                                      ? <ToggleRight className="h-5 w-5" />
                                      : <ToggleLeft className="h-5 w-5" />}
                                    <span className={`text-[10px] font-medium ${on ? 'text-green-600' : 'text-slate-400'}`}>{on ? 'Aktif' : 'Off'}</span>
                                  </button>
                                );
                              };

                              return (
                                <TableRow key={user.id} className={user.status !== 'active' ? 'opacity-60' : ''}>
                                  <TableCell className="font-mono text-sm">{user.nik}</TableCell>
                                  <TableCell className="font-semibold text-slate-800">{user.namaLengkap}</TableCell>
                                  <TableCell className="text-sm text-slate-600">{user.email}</TableCell>
                                  <TableCell className="text-sm text-slate-600">{user.departemen ?? '-'}</TableCell>
                                  <TableCell><StatusBadge status={statusLabel(user.status) as any} /></TableCell>
                                  <TableCell className="text-sm text-slate-500">{fmtDate(user.loginTerakhir)}</TableCell>
                                  <TableCell className="text-center"><PermToggle field="transaksi_masuk" label="Barang Masuk" /></TableCell>
                                  <TableCell className="text-center"><PermToggle field="transaksi_keluar" label="Barang Keluar" /></TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                      {isDirty && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost" size="icon"
                                              className="h-8 w-8 text-primary hover:bg-primary/10"
                                              onClick={() => handleSavePermissions(user)}
                                              disabled={isSaving}
                                            >
                                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Simpan Akses</TooltipContent>
                                        </Tooltip>
                                      )}
                                      <ActionButtons user={user} />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </div>
                </div>
              </>
            );
          })()}
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
                      <ProfileField label="NIK" value={selectedUser.nik} />
                      <ProfileField label="Bergabung" value={fmtDateOnly(selectedUser.tanggalGabung)} />
                      <ProfileField label="Login Terakhir" value={fmtDate(selectedUser.loginTerakhir)} />
                      <ProfileField label="Dibuat Oleh" value={selectedUser.dibuatOlehNama ?? 'Sistem'} />
                    </div>
                  </div>

                  {/* Role */}
                  <div className="px-6 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Role Akses</p>
                    <div className="flex gap-2 items-center">
                      <Select
                        value={profileRole ?? selectedUser.role}
                        onValueChange={(v: any) => setProfileRole(v)}
                        disabled={selectedUser.id === currentUser?.id}
                      >
                        <SelectTrigger className="flex-1 h-9 text-sm bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="kepala_gudang">Kepala Gudang</SelectItem>
                          <SelectItem value="petugas">Petugas</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm" className="h-9 px-3 bg-primary hover:bg-primary/90"
                        onClick={handleSaveRole}
                        disabled={savingRole || profileRole === selectedUser.role || selectedUser.id === currentUser?.id}
                      >
                        {savingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                    </div>
                    {selectedUser.id === currentUser?.id && (
                      <p className="text-[11px] text-muted-foreground mt-1.5">Tidak dapat mengubah role akun sendiri.</p>
                    )}
                  </div>
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
            <DialogHeader><DialogTitle>Tambah Pengguna Baru</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>NIK <span className="text-red-500">*</span></Label>
                  <Input value={formData.nik} onChange={(e) => setFormData({ ...formData, nik: e.target.value })} />
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
              <div className="space-y-1.5">
                <Label>Password <span className="text-red-500">*</span></Label>
                <Input type="password" placeholder="Minimal 8 karakter" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </div>
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
                  <Label>Role Akses <span className="text-red-500">*</span></Label>
                  <Select value={formData.role} onValueChange={(v: any) => setFormData({ ...formData, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="kepala_gudang">Kepala Gudang</SelectItem>
                      <SelectItem value="petugas">Petugas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status <span className="text-red-500">*</span></Label>
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

        {/* ═══════════════════════════════════
            ALERT: HAPUS AKUN
        ═══════════════════════════════════ */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                <Trash2 className="w-5 h-5" /> Hapus Akun Pengguna
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>Anda akan menghapus akun berikut secara permanen dari database:</p>
                  <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 space-y-0.5">
                    <p className="font-semibold text-slate-800">{deleteUser?.namaLengkap}</p>
                    <p className="font-mono text-xs text-slate-500">{deleteUser?.nik} · {deleteUser?.email}</p>
                    <p className="text-xs text-slate-500">{roleBadge(deleteUser?.role ?? '')}</p>
                  </div>
                  <p className="text-red-600 font-medium">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menghapus...</> : <><Trash2 className="w-4 h-4 mr-2" />Ya, Hapus Permanen</>}
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
