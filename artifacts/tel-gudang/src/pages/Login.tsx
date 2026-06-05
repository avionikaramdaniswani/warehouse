import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/AppContext';
import { TeLLogo } from '@/components/TeLLogo';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function Login() {
  const [, setLocation] = useLocation();
  const { setCurrentUser } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy login - just set user and navigate
    setCurrentUser({
      nama: 'Budi Santoso',
      username: username || 'budi.s',
      role: username === 'admin' ? 'Admin' : 'Staff Gudang',
      status: 'Aktif'
    });
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-sidebar">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8ed7c83a7f?q=80&w=2070')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
      
      <Card className="w-full max-w-md shadow-2xl border-none z-10 mx-4">
        <CardHeader className="space-y-4 pb-8 pt-8 items-center text-center">
          <TeLLogo size="lg" className="mb-2" />
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">Townsite Warehouse</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Materials Townsite Warehouse System<br/>
              <span className="font-semibold text-foreground/70">PT Tanjungenim Lestari Pulp &amp; Paper</span>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                placeholder="Masukkan username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold">
              Masuk
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center pb-8">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PT Tanjungenim Lestari Pulp &amp; Paper
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}