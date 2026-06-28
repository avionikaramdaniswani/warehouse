import { useState } from "react";
import { useLocation } from "wouter";
import { TeLLogo } from "@/components/TeLLogo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const WAREHOUSE_IMG = "/warehouse-bg.jpg";
const YEAR = new Date().getFullYear();

type Step = "verifikasi" | "password-baru" | "sukses";

export default function LupaPassword() {
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<Step>("verifikasi");
  const [nik, setNik] = useState("");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [showPasswordBaru, setShowPasswordBaru] = useState(false);
  const [showKonfirmasi, setShowKonfirmasi] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifikasi = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nik: nik.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Verifikasi gagal");
        return;
      }
      setResetToken(data.resetToken);
      setStep("password-baru");
    } catch {
      setError("Tidak dapat terhubung ke server. Coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (passwordBaru !== konfirmasi) {
      setError("Konfirmasi password tidak cocok");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, passwordBaru, konfirmasi }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Reset password gagal");
        return;
      }
      setStep("sukses");
    } catch {
      setError("Tidak dapat terhubung ke server. Coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* ── LEFT PANEL: brand — identik dengan Login ── */}
      <div className="hidden lg:flex lg:w-[42%] flex-col items-center justify-between bg-[#1B3A2D] relative overflow-hidden px-12 py-14">
        {/* dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
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

      {/* ── RIGHT PANEL: image + form — identik dengan Login ── */}
      <div className="flex-1 relative flex items-center justify-center p-6">
        {/* background warehouse image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${WAREHOUSE_IMG}')` }}
        />
        {/* gradient overlay */}
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
              {step === "verifikasi" && (
                <>
                  <div className="mb-7">
                    <h2 className="text-xl font-bold text-gray-800">Lupa Password</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Masukkan NIK dan email akun Anda untuk verifikasi identitas.
                    </p>
                  </div>

                  <form onSubmit={handleVerifikasi} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="nik" className="text-gray-700 font-medium">NIK <span className="text-red-500">*</span></Label>
                      <Input
                        id="nik"
                        type="text"
                        placeholder="Nomor Induk Karyawan"
                        value={nik}
                        onChange={(e) => setNik(e.target.value)}
                        className="h-11 border-gray-200 focus:border-[#1B3A2D] focus:ring-[#1B3A2D]/20"
                        required
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-gray-700 font-medium">Email <span className="text-red-500">*</span></Label>
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

                    {error && <ErrorBox message={error} />}

                    <Button
                      type="submit"
                      className="w-full h-11 text-sm font-semibold bg-[#1B3A2D] hover:bg-[#244d3b] active:bg-[#152e23] text-white transition-colors mt-1"
                      disabled={loading}
                    >
                      {loading ? <Spinner text="Memverifikasi..." /> : "Verifikasi Identitas"}
                    </Button>

                    <div className="text-center mt-1">
                      <button
                        type="button"
                        onClick={() => setLocation("/login")}
                        className="text-sm text-[#1B3A2D]/70 hover:text-[#1B3A2D] transition-colors"
                      >
                        ← Kembali ke Login
                      </button>
                    </div>
                  </form>
                </>
              )}

              {step === "password-baru" && (
                <>
                  <div className="mb-7">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Identitas Terverifikasi</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Buat password baru. Token berlaku <strong>15 menit</strong>.
                    </p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="passwordBaru" className="text-gray-700 font-medium">Password Baru <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Input
                          id="passwordBaru"
                          type={showPasswordBaru ? "text" : "password"}
                          placeholder="Minimal 8 karakter"
                          value={passwordBaru}
                          onChange={(e) => setPasswordBaru(e.target.value)}
                          className="h-11 pr-10 border-gray-200 focus:border-[#1B3A2D] focus:ring-[#1B3A2D]/20"
                          required
                          minLength={8}
                          autoComplete="new-password"
                        />
                        <TogglePasswordBtn show={showPasswordBaru} onToggle={() => setShowPasswordBaru(v => !v)} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="konfirmasi" className="text-gray-700 font-medium">Konfirmasi Password <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Input
                          id="konfirmasi"
                          type={showKonfirmasi ? "text" : "password"}
                          placeholder="Ulangi password baru"
                          value={konfirmasi}
                          onChange={(e) => setKonfirmasi(e.target.value)}
                          className="h-11 pr-10 border-gray-200 focus:border-[#1B3A2D] focus:ring-[#1B3A2D]/20"
                          required
                          autoComplete="new-password"
                        />
                        <TogglePasswordBtn show={showKonfirmasi} onToggle={() => setShowKonfirmasi(v => !v)} />
                      </div>
                    </div>

                    {error && <ErrorBox message={error} />}

                    <Button
                      type="submit"
                      className="w-full h-11 text-sm font-semibold bg-[#1B3A2D] hover:bg-[#244d3b] active:bg-[#152e23] text-white transition-colors mt-1"
                      disabled={loading}
                    >
                      {loading ? <Spinner text="Menyimpan..." /> : "Simpan Password Baru"}
                    </Button>
                  </form>
                </>
              )}

              {step === "sukses" && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Password Berhasil Direset</h2>
                  <p className="text-sm text-gray-500 mb-8">
                    Password Anda telah diperbarui. Silakan login menggunakan password baru.
                  </p>
                  <Button
                    onClick={() => setLocation("/login")}
                    className="w-full h-11 text-sm font-semibold bg-[#1B3A2D] hover:bg-[#244d3b] text-white transition-colors"
                  >
                    Kembali ke Halaman Login
                  </Button>
                </div>
              )}

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

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-2">
      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {text}
    </span>
  );
}

function TogglePasswordBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      tabIndex={-1}
      aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
    >
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
