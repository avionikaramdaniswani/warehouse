import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Item } from '@/context/AppContext';
import { MapPin } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  item: Item | null;
  canPrint?: boolean;
}

export function ItemQRModal({ open, onClose, item, canPrint = true }: Props) {
  const handlePrintBin = () => {
    if (!item?.binLoc) {
      toast.error('Item ini tidak memiliki BIN LOC');
      return;
    }
    const binLoc = item.binLoc;
    const svgEl = document.getElementById('qr-single-bin-preview')?.querySelector('svg');
    let svgHtml = '';
    if (svgEl) {
      const clone = svgEl.cloneNode(true) as SVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', '50mm');
      clone.setAttribute('height', '50mm');
      svgHtml = clone.outerHTML;
    }
    const win = window.open('', '_blank', 'width=420,height=520,scrollbars=no,resizable=no');
    if (!win) { toast.error('Popup diblokir — izinkan popup di browser lalu coba lagi'); return; }
    const binUrl = `${window.location.origin}/bin/${encodeURIComponent(binLoc)}`;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Label BIN ${binLoc}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; font-family: 'Courier New', Courier, monospace; }
    body { display: flex; justify-content: center; align-items: flex-start; padding: 8mm; }
    .label { width: 90mm; border: 2px solid #1B3A2D; border-radius: 2mm; overflow: hidden; }
    .hdr { background: #1B3A2D; text-align: center; padding: 3mm 5mm 2.5mm; }
    .co { font-size: 7pt; font-weight: bold; letter-spacing: .5px; color: #fff; }
    .sub { font-size: 5.5pt; color: rgba(255,255,255,.65); margin-top: .6mm; letter-spacing: .3px; }
    .body { padding: 4mm 5mm 5mm; display: flex; flex-direction: column; align-items: center; }
    .qr { text-align: center; margin-bottom: 3mm; line-height: 0; }
    .qr svg { width: 50mm !important; height: 50mm !important; }
    .bin { font-size: 20pt; font-weight: bold; letter-spacing: 3px; color: #1B3A2D; margin-bottom: 1.5mm; text-align: center; }
    .hint { font-size: 5.5pt; letter-spacing: 1px; color: #888; text-align: center; margin-bottom: 3mm; }
    .divider { border-top: 1.5px solid #ddd; width: 100%; margin-bottom: 3mm; }
    .url { font-size: 5pt; color: #aaa; text-align: center; word-break: break-all; }
    @media print { body { padding: 4mm; } @page { margin: 0; size: 105mm 148mm; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="hdr">
      <div class="co">PT TANJUNGENIM LESTARI PULP &amp; PAPER</div>
      <div class="sub">TOWNSITE WAREHOUSE — MATERIALS MANAGEMENT</div>
    </div>
    <div class="body">
      <div class="qr">${svgHtml}</div>
      <div class="bin">${binLoc}</div>
      <div class="hint">SCAN QR UNTUK MELIHAT ISI SLOT</div>
      <div class="divider"></div>
      <div class="url">${binUrl}</div>
    </div>
  </div>
</body>
</html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); setTimeout(() => win.close(), 2000); }, 400);
  };

  const handlePrint = () => {
    if (!item) return;

    const svgEl = document.getElementById('qr-single-preview')?.querySelector('svg');
    let svgHtml = '';
    if (svgEl) {
      const clone = svgEl.cloneNode(true) as SVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', '50mm');
      clone.setAttribute('height', '50mm');
      svgHtml = clone.outerHTML;
    }

    const win = window.open('', '_blank', 'width=420,height=520,scrollbars=no,resizable=no');
    if (!win) {
      toast.error('Popup diblokir — izinkan popup di browser lalu coba lagi');
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Label ${item.tsCode}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: #fff;
      font-family: 'Courier New', Courier, monospace;
    }
    body {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 8mm;
    }
    .label {
      width: 90mm;
      border: 1.5px solid #444;
      border-radius: 2mm;
      overflow: hidden;
    }
    .hdr {
      background: #1B3A2D;
      text-align: center;
      padding: 3mm 5mm 2.5mm;
    }
    .co {
      font-size: 7pt;
      font-weight: bold;
      letter-spacing: .5px;
      color: #fff;
    }
    .sub {
      font-size: 5.5pt;
      color: rgba(255,255,255,.65);
      margin-top: .6mm;
      letter-spacing: .3px;
    }
    .body {
      padding: 4mm 5mm 5mm;
    }
    .qr {
      text-align: center;
      margin-bottom: 3mm;
      line-height: 0;
    }
    .qr svg {
      width: 50mm !important;
      height: 50mm !important;
    }
    .ts {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 3px;
      color: #000;
      margin-bottom: 1.5mm;
    }
    .nama {
      text-align: center;
      font-size: 6.5pt;
      font-weight: bold;
      color: #222;
      line-height: 1.4;
      word-wrap: break-word;
      margin: 0 2mm 3mm;
    }
    .divider {
      border-top: 1.5px solid #ddd;
      margin-bottom: 3mm;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 7pt;
      padding: .8mm 0;
      gap: 4mm;
    }
    .lbl { color: #666; }
    .val { font-weight: bold; color: #000; text-align: right; }
    @media print {
      body { padding: 4mm; }
      @page { margin: 0; size: 105mm 148mm; }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="hdr">
      <div class="co">PT TANJUNGENIM LESTARI PULP &amp; PAPER</div>
      <div class="sub">TOWNSITE WAREHOUSE — MATERIALS MANAGEMENT</div>
    </div>
    <div class="body">
      <div class="qr">${svgHtml}</div>
      <div class="ts">${item.tsCode}</div>
      <div class="nama">${item.nama}</div>
      <div class="divider"></div>
      <div class="row">
        <span class="lbl">MS Code</span>
        <span class="val">${item.msCode || '—'}</span>
      </div>
      <div class="row">
        <span class="lbl">BIN LOC</span>
        <span class="val">${item.binLoc || '—'}</span>
      </div>
    </div>
  </div>
</body>
</html>`);

    win.document.close();

    setTimeout(() => {
      win.focus();
      win.print();
      setTimeout(() => win.close(), 2000);
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[340px] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-1">
          <DialogTitle className="text-base">Label QR Code</DialogTitle>
        </DialogHeader>

        {/* Hidden BIN QR for print */}
        {item?.binLoc && (
          <div className="sr-only" aria-hidden id="qr-single-bin-preview">
            <QRCodeSVG
              value={`${window.location.origin}/bin/${encodeURIComponent(item.binLoc)}`}
              size={200}
            />
          </div>
        )}

        {item && (
          <div className="px-5 py-2 flex justify-center">
            <div
              id="qr-single-preview"
              className="w-full border border-slate-200 rounded-lg overflow-hidden shadow-sm"
            >
              {/* Header hijau */}
              <div className="bg-[#1B3A2D] px-3 py-1.5 text-center">
                <p className="font-mono font-bold text-[7.5px] tracking-wide text-white leading-tight">
                  PT TANJUNGENIM LESTARI PULP &amp; PAPER
                </p>
                <p className="text-[6.5px] text-white/60 mt-0.5 tracking-wide">
                  TOWNSITE WAREHOUSE — MATERIALS MANAGEMENT
                </p>
              </div>

              {/* QR + info */}
              <div className="bg-white px-4 py-3 flex flex-col items-center">
                <QRCodeSVG value={item.tsCode} size={120} level="M" />

                <p className="font-mono font-bold text-lg tracking-[0.2em] mt-2 mb-0.5 text-black">
                  {item.tsCode}
                </p>
                <p className="text-[9.5px] font-semibold text-slate-600 text-center leading-snug mb-2.5 px-1">
                  {item.nama}
                </p>

                <div className="w-full border-t border-slate-200 pt-2 space-y-1">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-slate-500">MS Code</span>
                    <span className="font-mono font-bold text-slate-900">{item.msCode || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-slate-500">BIN LOC</span>
                    <span className="font-mono font-bold text-slate-900">{item.binLoc || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {canPrint && (
          <p className="text-center text-[10px] text-slate-400 px-5 pb-1">
            Klik "Cetak Label" untuk membuka dialog cetak browser
          </p>
        )}

        <DialogFooter className="px-5 pb-4 pt-1 flex-col gap-2 sm:flex-col">
          {canPrint && (
            <>
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  className="bg-[#1B3A2D] hover:bg-[#244d3b] text-white flex-1"
                  onClick={handlePrint}
                >
                  Label Item
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#1B3A2D] text-[#1B3A2D] hover:bg-green-50 flex-1"
                  onClick={handlePrintBin}
                  disabled={!item?.binLoc}
                  title={!item?.binLoc ? 'Item tidak memiliki BIN LOC' : `Cetak label untuk slot ${item.binLoc}`}
                >
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  Label BIN
                </Button>
              </div>
              <p className="text-center text-[10px] text-slate-400">
                <strong>Label Item</strong> = QR TS Code · <strong>Label BIN</strong> = QR slot rak
              </p>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="w-full text-slate-500">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
