import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useAppContext } from "@/context/AppContext";

import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import LupaPassword from "@/pages/LupaPassword";
import BinPage from "@/pages/BinPage";
import Dashboard from "@/pages/Dashboard";
import MasterBarang from "@/pages/MasterBarang";
import BarangMasuk from "@/pages/BarangMasuk";
import BarangKeluar from "@/pages/BarangKeluar";
import Laporan from "@/pages/Laporan";
import LaporanBarang from "@/pages/LaporanBarang";
import LaporanBarangMasuk from "@/pages/LaporanBarangMasuk";
import LaporanBarangKeluar from "@/pages/LaporanBarangKeluar";
import LaporanPengguna from "@/pages/LaporanPengguna";
import RiwayatAktivitas from "@/pages/RiwayatAktivitas";
import ManajemenUser from "@/pages/ManajemenUser";
import Pengaturan from "@/pages/Pengaturan";
import ReservationList from "@/pages/ReservationList";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { currentUser } = useAppContext();
  if (!currentUser) return <Redirect to="/login" />;
  return <Component {...rest} />;
}

function AdminOrKepalaRoute({ component: Component, ...rest }: any) {
  const { currentUser } = useAppContext();
  if (!currentUser) return <Redirect to="/login" />;
  if (currentUser.role === 'petugas') return <Redirect to="/dashboard" />;
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/login" />} />
      <Route path="/login" component={Login} />
      <Route path="/lupa-password" component={LupaPassword} />
      <Route path="/bin/:binLoc" component={BinPage} />

      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/barang" component={() => <ProtectedRoute component={MasterBarang} />} />
      <Route path="/barang-masuk" component={() => <ProtectedRoute component={BarangMasuk} />} />
      <Route path="/barang-keluar" component={() => <ProtectedRoute component={BarangKeluar} />} />
      <Route path="/reservation-list" component={() => <ProtectedRoute component={ReservationList} />} />
      <Route path="/laporan" component={() => <AdminOrKepalaRoute component={Laporan} />} />
      <Route path="/laporan/barang" component={() => <AdminOrKepalaRoute component={LaporanBarang} />} />
      <Route path="/laporan/barang-masuk" component={() => <AdminOrKepalaRoute component={LaporanBarangMasuk} />} />
      <Route path="/laporan/barang-keluar" component={() => <AdminOrKepalaRoute component={LaporanBarangKeluar} />} />
      <Route path="/laporan/pengguna" component={() => <AdminOrKepalaRoute component={LaporanPengguna} />} />
      <Route path="/laporan/aktivitas" component={() => <AdminOrKepalaRoute component={RiwayatAktivitas} />} />
      <Route path="/users" component={() => <ProtectedRoute component={ManajemenUser} />} />
      <Route path="/pengaturan" component={() => <ProtectedRoute component={Pengaturan} />} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;