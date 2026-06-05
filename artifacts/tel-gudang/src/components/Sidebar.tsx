import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Package, PackageCheck, PackageX, BarChart3, Users, Settings, LogOut } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { TeLLogo } from '@/components/TeLLogo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
}

export function Sidebar({ className, collapsed = false }: SidebarProps) {
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
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'flex flex-col h-full bg-sidebar text-sidebar-foreground overflow-hidden transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
          className
        )}
      >
        {/* Logo area */}
        <div
          className={cn(
            'flex flex-col items-center border-b border-sidebar-border transition-all duration-300',
            collapsed ? 'py-3 px-2' : 'px-4 py-4 gap-2'
          )}
        >
          <TeLLogo size={collapsed ? 'sm' : 'md'} className={collapsed ? 'w-10 h-10 object-cover rounded' : ''} />
          {!collapsed && (
            <div className="text-center leading-tight">
              <p className="font-bold text-sm tracking-tight">Townsite Warehouse</p>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Materials Management System</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <div className="flex-1 py-4 overflow-y-auto">
          <nav className={cn('space-y-1', collapsed ? 'px-2' : 'px-3')}>
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;

              const linkEl = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-md transition-colors text-sm font-medium',
                    collapsed
                      ? 'justify-center p-2.5'
                      : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && item.label}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkEl;
            })}
          </nav>
        </div>

        {/* User + Logout */}
        <div className={cn('border-t border-sidebar-border mt-auto', collapsed ? 'p-2' : 'p-4')}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-9 w-9 border border-sidebar-border cursor-pointer">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {currentUser?.nama.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{currentUser?.nama}</p>
                  <p className="text-xs opacity-70">{currentUser?.role}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center p-2 w-full text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Keluar</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
