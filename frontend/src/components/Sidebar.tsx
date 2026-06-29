import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Package, PackageCheck, PackageX,
  BarChart3, Users, Settings, LogOut, ChevronDown, History,
} from 'lucide-react';
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
  const { currentUser, clearAuth } = useAppContext();

  const laporanActive = location.startsWith('/laporan');
  const [laporanOpen, setLaporanOpen] = useState(laporanActive);

  const perms = currentUser?.permissions ?? {};
  const isPetugas = currentUser?.role === 'petugas';

  const topNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/barang', label: 'Daftar Barang', icon: Package },
    ...(!isPetugas || perms.transaksi_masuk
      ? [{ href: '/barang-masuk', label: 'Barang Masuk', icon: PackageCheck }]
      : []),
    ...(!isPetugas || perms.transaksi_keluar
      ? [{ href: '/barang-keluar', label: 'Barang Keluar', icon: PackageX }]
      : []),
  ];

  const laporanSubItems = [
    { href: '/laporan', label: 'Ringkasan', icon: BarChart3 },
    { href: '/laporan/barang', label: 'Laporan Barang', icon: Package },
    { href: '/laporan/barang-masuk', label: 'Lap. Barang Masuk', icon: PackageCheck },
    { href: '/laporan/barang-keluar', label: 'Lap. Barang Keluar', icon: PackageX },
    ...(currentUser?.role === 'admin'
      ? [
          { href: '/laporan/pengguna', label: 'Laporan Pengguna', icon: Users },
          { href: '/laporan/aktivitas', label: 'Riwayat Aktivitas', icon: History },
        ]
      : []),
  ];

  const bottomNavItems = [
    ...(currentUser?.role === 'admin' ? [{ href: '/users', label: 'Pengguna', icon: Users }] : []),
    { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  const handleLogout = () => {
    clearAuth();
    setLocation('/login');
  };

  const navLinkClass = (active: boolean) =>
    cn(
      'flex items-center rounded-md transition-colors text-sm font-medium cursor-pointer',
      collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    );

  const renderSimpleItem = (item: { href: string; label: string; icon: React.ElementType }) => {
    const isActive = location === item.href;
    const Icon = item.icon;
    const linkEl = (
      <Link key={item.href} href={item.href} className={navLinkClass(isActive)}>
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && item.label}
      </Link>
    );
    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return linkEl;
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
        {!collapsed && (
          <div className="relative overflow-hidden border-b border-sidebar-border">
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            />
            <div className="relative px-4 pt-5 pb-4 flex flex-col items-center gap-3">
              <TeLLogo size="md" />
              <div className="text-center">
                <p className="font-bold text-[13px] tracking-tight leading-tight">Townsite Warehouse</p>
                <p className="text-[8.5px] text-sidebar-foreground/45 uppercase tracking-[0.15em] mt-0.5">
                  Materials Management System
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nav items */}
        <div className="flex-1 py-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <nav className={cn('space-y-1', collapsed ? 'px-2' : 'px-3')}>
            {/* Top items */}
            {topNavItems.map(renderSimpleItem)}

            {/* Laporan dropdown — disembunyikan untuk petugas */}
            {!isPetugas && (collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/laporan"
                    className={navLinkClass(laporanActive)}
                  >
                    <BarChart3 className="h-5 w-5 shrink-0" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">Laporan</TooltipContent>
              </Tooltip>
            ) : (
              <div>
                <button
                  onClick={() => setLaporanOpen((v) => !v)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium cursor-pointer',
                    laporanActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <BarChart3 className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-left">Laporan</span>
                  <ChevronDown
                    className={cn('h-4 w-4 shrink-0 transition-transform duration-200', laporanOpen && 'rotate-180')}
                  />
                </button>

                {laporanOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l border-sidebar-border space-y-0.5">
                    {laporanSubItems.map((item) => {
                      const isActive = location === item.href;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-sm cursor-pointer',
                            isActive
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Bottom items */}
            {bottomNavItems.map(renderSimpleItem)}
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
                      {currentUser?.namaLengkap.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{currentUser?.namaLengkap}</p>
                  <p className="text-xs opacity-70">{currentUser?.role}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center p-2 w-full text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors cursor-pointer"
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
                    {currentUser?.namaLengkap.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">{currentUser?.namaLengkap}</span>
                  <span className="text-xs text-sidebar-foreground/60 truncate">{currentUser?.role}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors cursor-pointer"
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
