import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Item } from '@/context/AppContext';

interface Props {
  open: boolean;
  onClose: () => void;
  item: Item | null;
}

export function ItemQRModal({ open, onClose, item }: Props) {
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
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg">Label QR Code</DialogTitle>
        </DialogHeader>

        {item && (
          <div className="px-6 py-2 flex justify-center">
            <div
              id="qr-single-preview"
              className="w-full max-w-[260px] border border-slate-200 rounded-xl overflow-hidden shadow-sm"
            >
              {/* Header hijau — seragam dengan sidebar & login */}
              <div className="bg-[#1B3A2D] px-4 py-2 text-center">
                <p className="font-mono font-bold text-[8px] tracking-wide text-white leading-tight">
                  PT TANJUNGENIM LESTARI PULP &amp; PAPER
                </p>
                <p className="text-[7px] text-white/60 mt-0.5 tracking-wide">
                  TOWNSITE WAREHOUSE — MATERIALS MANAGEMENT
                </p>
              </div>

              {/* QR + info */}
              <div className="bg-white px-5 py-4 flex flex-col items-center">
                <QRCodeSVG value={item.tsCode} size={148} level="M" />

                <p className="font-mono font-bold text-xl tracking-[0.2em] mt-3 mb-0.5 text-black">
                  {item.tsCode}
                </p>
                <p className="text-[10px] font-semibold text-slate-600 text-center leading-snug mb-3 px-2">
                  {item.nama}
                </p>

                <div className="w-full border-t border-slate-200 pt-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">MS Code</span>
                    <span className="font-mono font-bold text-slate-900">{item.msCode || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">BIN LOC</span>
                    <span className="font-mono font-bold text-slate-900">{item.binLoc || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 px-6 pb-1">
          Klik "Cetak Label" untuk membuka dialog cetak browser
        </p>

        <DialogFooter className="px-6 pb-5 pt-2 flex-row gap-2 justify-center sm:justify-center">
          <Button variant="outline" onClick={onClose} className="min-w-[90px]">Batal</Button>
          <Button className="bg-[#1B3A2D] hover:bg-[#244d3b] text-white min-w-[120px]" onClick={handlePrint}>
            Cetak Label
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
