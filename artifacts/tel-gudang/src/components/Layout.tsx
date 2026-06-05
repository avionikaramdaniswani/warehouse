import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, X, Bell, Search } from 'lucide-react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';

export function Layout({ children, title }: { children: React.ReactNode, title: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-50 w-60 h-full">
            <Sidebar />
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
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-border flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-foreground p-1 hover:bg-accent rounded-md"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-semibold tracking-tight text-foreground hidden sm:block">{title}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Cari..." 
                className="w-64 pl-9 bg-secondary border-none"
              />
            </div>
            <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          <div className="sm:hidden mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}