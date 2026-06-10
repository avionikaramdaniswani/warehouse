import { Link } from "wouter";
import { TeLLogo } from "@/components/TeLLogo";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1b3a2d] px-4">
      <div className="flex flex-col items-center text-center max-w-sm w-full">
        <TeLLogo size="md" className="mb-8 opacity-90" />

        <div className="relative mb-6 select-none">
          <span className="text-[120px] sm:text-[160px] font-black leading-none text-white/10 tracking-tighter">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[44px] sm:text-[56px] font-black leading-none text-white/80 tracking-tight">
              404
            </span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-sm text-white/50 mb-8 leading-relaxed">
          Halaman yang kamu cari tidak ada atau sudah dipindahkan.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 bg-white text-[#1b3a2d] font-semibold text-sm rounded-lg px-5 py-2.5 hover:bg-white/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            Ke Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-medium text-sm rounded-lg px-5 py-2.5 hover:bg-white/15 transition-colors border border-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
        </div>

        <p className="mt-10 text-xs text-white/25">
          Townsite Warehouse · PT Tanjungenim Lestari Pulp &amp; Paper
        </p>
      </div>
    </div>
  );
}
