import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Pencil, ShieldAlert, CheckCircle, Search } from 'lucide-react';
import { useAppContext, User } from '@/context/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { toast } from 'sonner';
import { Redirect } from 'wouter';

export default function ManajemenUser() {
  const { currentUser, users, setUsers } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState<Partial<User>>({
    nama: '',
    username: '',
    role: 'Staff Gudang',
    status: 'Aktif'
  });

  // Role Protection
  if (currentUser?.role !== 'Admin') {
    return <Redirect to="/dashboard" />;
  }

  const filteredUsers = users.filter(user => 
    user.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setSelectedItem(null);
    setFormData({ nama: '', username: '', role: 'Staff Gudang', status: 'Aktif' });
    setModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedItem(user);
    setFormData(user);
    setModalOpen(true);
  };

  const handleToggleStatus = (user: User) => {
    setSelectedItem(user);
    setAlertOpen(true);
  };

  const confirmToggleStatus = () => {
    if (!selectedItem) return;
    
    const newStatus = selectedItem.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    setUsers(users.map(u => u.username === selectedItem.username ? { ...u, status: newStatus } : u));
    
    toast.success(`Pengguna berhasil di-${newStatus.toLowerCase()}`);
    setAlertOpen(false);
  };

  const handleSave = () => {
    if (!formData.nama || !formData.username) {
      toast.error('Nama dan Username wajib diisi');
      return;
    }

    if (selectedItem) {
      // Edit
      setUsers(users.map(u => u.username === selectedItem.username ? formData as User : u));
      toast.success('Data pengguna berhasil diperbarui');
    } else {
      // Add
      if (users.some(u => u.username === formData.username)) {
        toast.error('Username sudah digunakan');
        return;
      }
      const newUser = { ...formData, lastLogin: '-' } as User;
      setUsers([...users, newUser]);
      toast.success('Pengguna baru berhasil ditambahkan');
    }
    setModalOpen(false);
  };

  // Helper variable instead of using state for selectedItem across different handlers
  // to avoid confusion with the selectedItem in context
  const [selectedItem, setSelectedItem] = useState<User | null>(null);

  return (
    <Layout title="Manajemen Pengguna">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama atau username..." 
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="bg-primary hover:bg-primary/90 w-full md:w-auto" onClick={handleOpenAdd}>
            <UserPlus className="w-4 h-4 mr-2" /> Tambah User
          </Button>
        </div>

        <Card className="shadow-sm border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role Akses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Login Terakhir</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.username}>
                      <TableCell className="font-semibold text-slate-800">{user.nama}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-600">{user.username}</TableCell>
                      <TableCell>
                        <StatusBadge status={user.role as any} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={user.status} />
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{user.lastLogin}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(user)} className="h-8">
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button 
                            variant={user.status === 'Aktif' ? 'outline' : 'default'} 
                            size="sm" 
                            className={`h-8 ${user.status === 'Aktif' ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200' : 'bg-green-600 hover:bg-green-700'}`}
                            onClick={() => handleToggleStatus(user)}
                            disabled={user.username === currentUser?.username} // Cannot disable self
                          >
                            {user.status === 'Aktif' ? (
                              <><ShieldAlert className="w-3.5 h-3.5 mr-1" /> Nonaktifkan</>
                            ) : (
                              <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Aktifkan</>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      Tidak ada pengguna ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Modal Add/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap <span className="text-red-500">*</span></Label>
              <Input id="nama" value={formData.nama || ''} onChange={(e) => setFormData({...formData, nama: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username <span className="text-red-500">*</span></Label>
              <Input id="username" value={formData.username || ''} onChange={(e) => setFormData({...formData, username: e.target.value})} disabled={!!selectedItem} className={selectedItem ? "bg-slate-100" : ""} />
            </div>
            {!selectedItem && (
              <div className="space-y-2">
                <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                <Input id="password" type="password" placeholder="Minimal 6 karakter" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role Akses</Label>
                <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Staff Gudang">Staff Gudang</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(val: any) => setFormData({...formData, status: val})}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleSave}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Confirm Status Change */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Perubahan Status</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin meng-{selectedItem?.status === 'Aktif' ? 'nonaktifkan' : 'aktifkan'} akun <strong>{selectedItem?.nama}</strong>?
              {selectedItem?.status === 'Aktif' && ' Pengguna ini tidak akan bisa login ke dalam sistem.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleStatus} className={selectedItem?.status === 'Aktif' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}>
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}