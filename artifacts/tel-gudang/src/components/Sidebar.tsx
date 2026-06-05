import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Package, PackageCheck, PackageX, BarChart3, Users, Settings, LogOut } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { TeLLogo } from '@/components/TeLLogo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function Sidebar({ className }: { className?: string }) {
  const [location, setLocation] = useLocation();
  const { currentUser, setCurrentUser } = useAppContext();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/barang', label: 'Master Barang', icon: Package },
    { href: '/barang-masuk', label: 'Barang Masuk', icon: PackageCheck },
    { href: '/barang-keluar', label: 'Barang Keluar', icon: PackageX },
    { href: '/laporan', label: 'Laporan', icon: BarChart3 },
    ...(currentUser?.role === 'Admin' ? [{ href: '/users', label: 'Pengguna', icon: Users }] : []),
    { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  const handleLogout = () => {
    setCurrentUser(null);
    setLocation('/login');
  };

  return (
    <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground w-60 shrink-0", className)}>
      <div className="px-4 py-4 flex flex-col items-center gap-2 border-b border-sidebar-border">
        <div className="bg-white rounded-md px-2 py-1.5 inline-flex items-center justify-center">
          <TeLLogo size="sm" />
        </div>
        <div className="text-center leading-tight">
          <p className="font-bold text-sm tracking-tight">Townsite Warehouse</p>
          <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Materials Management System</p>
        </div>
      </div>

      <div className="flex-1 py-6 overflow-y-auto">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10 border border-sidebar-border">
            <AvatarFallback className="bg-primary/20 text-primary">
              {currentUser?.nama.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{currentUser?.nama}</span>
            <span className="text-xs text-sidebar-foreground/60 truncate">{currentUser?.role}</span>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </div>
  );
}