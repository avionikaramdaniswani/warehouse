import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export function Layout({ children, title }: { children: React.ReactNode, title: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div
        className={[
          'hidden md:block flex-shrink-0 transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-16' : 'w-60',
        ].join(' ')}
      >
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-50 w-60 h-full">
            <Sidebar collapsed={false} />
            <button
              className="absolute top-4 -right-12 p-2 bg-sidebar rounded-full text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-border flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="md:hidden text-foreground p-1 hover:bg-accent rounded-md"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              className="hidden md:flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent p-1.5 rounded-md transition-colors"
              onClick={() => setSidebarCollapsed((v) => !v)}
              title={sidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar'}
            >
              {sidebarCollapsed
                ? <PanelLeftOpen className="h-5 w-5" />
                : <PanelLeftClose className="h-5 w-5" />
              }
            </button>

            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end bg-white px-3 py-1.5 rounded-lg border border-border shadow-sm">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">WAKTU SISTEM</span>
              <span className="text-sm font-bold text-primary font-mono tracking-tight whitespace-nowrap">
                {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}{' '}
                <span className="text-foreground">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}
