import { useState } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { TeLLogo } from "@/components/TeLLogo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const WAREHOUSE_IMG = "/warehouse-bg.jpg";
const YEAR = new Date().getFullYear();

export default function Login() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Login gagal");
        return;
      }

      setAuth(data.user, data.token);
      setLocation("/dashboard");
    } catch {
      setError("Tidak dapat terhubung ke server. Coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* ── LEFT PANEL: brand ── */}
      <div className="hidden lg:flex lg:w-[42%] flex-col items-center justify-between bg-[#1B3A2D] relative overflow-hidden px-12 py-14">
        {/* dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        {/* top fade */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/20 to-transparent" />
        {/* bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/30 to-transparent" />

        {/* top spacer */}
        <div />

        {/* center content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-6">
          <TeLLogo size="xl" />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Townsite Warehouse
            </h1>
            <p className="text-white/65 text-sm leading-relaxed">
              Materials Townsite Warehouse System
            </p>
            <p className="text-white/85 text-sm font-semibold">
              PT Tanjungenim Lestari Pulp and Paper
            </p>
          </div>
          <div className="w-16 h-px bg-white/20 mt-2" />
        </div>

        {/* bottom copyright */}
        <p className="relative z-10 text-white/30 text-xs">
          &copy; {YEAR} PT Tanjungenim Lestari Pulp and Paper
        </p>
      </div>

      {/* ── RIGHT PANEL: image + form ── */}
      <div className="flex-1 relative flex items-center justify-center p-6">
        {/* background warehouse image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${WAREHOUSE_IMG}')` }}
        />
        {/* gradient overlay — dark on edges, lighter in center */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />

        {/* form card */}
        <div className="relative z-10 w-full max-w-sm">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
            {/* mobile-only brand header */}
            <div className="lg:hidden bg-[#1B3A2D] px-8 py-6 flex flex-col items-center text-center gap-3">
              <TeLLogo size="md" />
              <div>
                <p className="text-white font-bold text-lg leading-tight">
                  Townsite Warehouse
                </p>
                <p className="text-white/65 text-xs mt-0.5">
                  PT Tanjungenim Lestari Pulp and Paper
                </p>
              </div>
            </div>

            {/* form body */}
            <div className="px-8 py-8">
              <div className="mb-7">
                <h2 className="text-xl font-bold text-gray-800">
                  Selamat Datang
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Masuk ke akun Anda untuk melanjutkan
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@perusahaan.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 border-gray-200 focus:border-[#1B3A2D] focus:ring-[#1B3A2D]/20"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-gray-700 font-medium"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10 border-gray-200 focus:border-[#1B3A2D] focus:ring-[#1B3A2D]/20"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4.5 h-4.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4.5 h-4.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 mt-0.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold bg-[#1B3A2D] hover:bg-[#244d3b] active:bg-[#152e23] text-white transition-colors mt-1"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Memproses...
                    </span>
                  ) : (
                    "Masuk"
                  )}
                </Button>
              </form>

              <p className="lg:hidden text-center text-xs text-gray-400 mt-6">
                &copy; {YEAR} PT Tanjungenim Lestari Pulp and Paper
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
