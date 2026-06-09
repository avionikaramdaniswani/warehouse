import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Camera, X, Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (tsCode: string) => void;
  title?: string;
}

const SCANNER_ID = 'html5-qr-scanner-view';

export function QrScannerDialog({ open, onOpenChange, onScan, title = 'Scan QR Code Barang' }: Props) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'active' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [scannedText, setScannedText] = useState('');
  const instanceRef = useRef<Html5Qrcode | null>(null);

  const stopScanner = useCallback(async () => {
    const inst = instanceRef.current;
    if (!inst) return;
    try {
      if (inst.isScanning) await inst.stop();
      inst.clear();
    } catch { /* ignore cleanup errors */ }
    instanceRef.current = null;
  }, []);

  const startScanner = useCallback(async () => {
    const el = document.getElementById(SCANNER_ID);
    if (!el) return;

    setPhase('loading');
    setErrMsg('');

    try {
      const inst = new Html5Qrcode(SCANNER_ID, { verbose: false });
      instanceRef.current = inst;

      await inst.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          const code = text.trim();
          setScannedText(code);
          setPhase('success');
          stopScanner();
          setTimeout(() => {
            onScan(code);
            onOpenChange(false);
            setPhase('idle');
          }, 600);
        },
        () => { /* per-frame error — ignore */ }
      );
      setPhase('active');
    } catch (e: unknown) {
      setPhase('error');
      const name = (e as { name?: string })?.name ?? '';
      if (name === 'NotAllowedError') {
        setErrMsg('Izin kamera ditolak. Aktifkan akses kamera di pengaturan browser lalu coba lagi.');
      } else if (name === 'NotFoundError') {
        setErrMsg('Tidak ada kamera yang ditemukan pada perangkat ini.');
      } else {
        setErrMsg('Gagal membuka kamera. Pastikan tidak ada aplikasi lain yang sedang menggunakan kamera.');
      }
    }
  }, [onScan, onOpenChange, stopScanner]);

  useEffect(() => {
    if (!open) {
      stopScanner().then(() => setPhase('idle'));
      return;
    }
    const t = setTimeout(startScanner, 200);
    return () => {
      clearTimeout(t);
      stopScanner();
    };
  }, [open]);

  const handleClose = () => {
    stopScanner().then(() => setPhase('idle'));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Camera viewport area */}
        <div className="relative bg-black overflow-hidden">
          {/* html5-qrcode mounts video here */}
          <div
            id={SCANNER_ID}
            className={
              phase === 'active' || phase === 'loading'
                ? 'w-full [&_video]:w-full [&_video]:max-h-72 [&_video]:object-cover [&_img]:hidden [&_button]:hidden [&_select]:hidden'
                : 'hidden'
            }
          />

          {/* Scan frame overlay when active */}
          {phase === 'active' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-52 h-52">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-primary rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-primary rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-primary rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-primary rounded-br" />
                <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-primary/60 animate-pulse" />
              </div>
            </div>
          )}

          {/* Loading state */}
          {phase === 'loading' && (
            <div className="aspect-square max-h-72 flex flex-col items-center justify-center bg-slate-900 gap-3">
              <Loader2 className="h-10 w-10 text-white/70 animate-spin" />
              <p className="text-sm text-white/60">Menghidupkan kamera…</p>
            </div>
          )}

          {/* Idle state */}
          {(phase === 'idle' || phase === 'error') && (
            <div className="aspect-square max-h-72 flex flex-col items-center justify-center gap-4 px-6">
              {phase === 'error' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="text-sm text-red-600 text-center leading-relaxed">{errMsg}</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <QrCode className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="text-sm text-slate-400 text-center">
                    Tekan tombol di bawah untuk membuka kamera
                  </p>
                </>
              )}
            </div>
          )}

          {/* Success flash */}
          {phase === 'success' && (
            <div className="aspect-square max-h-72 flex flex-col items-center justify-center bg-primary/5 gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-primary" />
              </div>
              <p className="text-sm font-semibold text-primary">QR Terdeteksi!</p>
              <p className="text-xs font-mono text-slate-500">{scannedText}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 space-y-2">
          {phase === 'active' && (
            <p className="text-xs text-center text-slate-400 mb-1">
              Posisikan QR Code dalam kotak di atas
            </p>
          )}
          {(phase === 'idle' || phase === 'error') && (
            <Button className="w-full" onClick={startScanner}>
              <Camera className="w-4 h-4 mr-2" />
              {phase === 'error' ? 'Coba Lagi' : 'Aktifkan Kamera'}
            </Button>
          )}
          {(phase === 'active' || phase === 'loading') && (
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Batal
            </Button>
          )}
          {phase === 'success' && (
            <Button variant="outline" className="w-full" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Memproses…
            </Button>
          )}
          <p className="text-xs text-center text-slate-400">
            QR Code terdapat pada label fisik setiap barang
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
