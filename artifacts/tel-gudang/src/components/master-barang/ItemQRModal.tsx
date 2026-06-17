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
    const svgEl = document.getElementById('qr-desktop-box')?.querySelector('svg');
    let svgHtml = '';
    if (svgEl) {
      const clone = svgEl.cloneNode(true) as SVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgHtml = clone.outerHTML;
    }
    const win = window.open('', '_blank', 'width=520,height=580');
    if (!win) { toast.error('Popup diblokir — izinkan popup di browser lalu coba lagi'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>Label ${item.tsCode}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#fff;display:flex;justify-content:center;padding:10mm;font-family:'Courier New',Courier,monospace}
  .label{width:90mm;border:1.5px solid #333;border-radius:1.5mm;overflow:hidden}
  .hdr{background:#f0f0f0;text-align:center;padding:3mm 5mm 2.5mm;border-bottom:1px solid #ccc}
  .co{font-size:7pt;font-weight:bold;letter-spacing:.4px;color:#111}
  .sub{font-size:5.5pt;color:#555;margin-top:.5mm}
  .body{padding:4mm 5mm 5mm}
  .qr{text-align:center;margin-bottom:3mm}
  .qr svg{width:50mm!important;height:50mm!important;display:inline-block}
  .ts{text-align:center;font-size:16pt;font-weight:bold;letter-spacing:3px;color:#000;margin-bottom:1.5mm}
  .nama{text-align:center;font-size:6.5pt;font-weight:bold;color:#222;line-height:1.4;word-wrap:break-word;margin:0 2mm 3mm}
  .divider{border-top:1.5px solid #ddd;margin-bottom:3mm}
  .row{display:flex;justify-content:space-between;align-items:baseline;font-size:7pt;padding:.7mm 0;gap:4mm}
  .lbl{color:#666}.val{font-weight:bold;color:#000;text-align:right}
  @media print{body{padding:2mm}@page{margin:0}}
</style>
</head><body>
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
    <div class="row"><span class="lbl">MS Code</span><span class="val">${item.msCode || '—'}</span></div>
    <div class="row"><span class="lbl">BIN LOC</span><span class="val">${item.binLoc || '—'}</span></div>
  </div>
</div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close();},1500);}<\/script>
</body></html>`);
    win.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md text-center flex flex-col items-center p-8">
        <DialogHeader>
          <DialogTitle className="text-xl mb-4">Label QR Code</DialogTitle>
        </DialogHeader>
        {item && (
          <div
            id="qr-desktop-box"
            className="bg-white border border-slate-200 rounded-xl shadow-sm mb-4 w-full max-w-[280px] overflow-hidden"
          >
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-center">
              <p className="font-mono font-bold text-[9px] tracking-wide text-slate-700 leading-tight">PT TANJUNGENIM LESTARI PULP & PAPER</p>
              <p className="text-[8px] text-slate-500 mt-0.5">TOWNSITE WAREHOUSE — MATERIALS MANAGEMENT</p>
            </div>
            <div className="px-5 py-4 flex flex-col items-center">
              <QRCodeSVG value={item.tsCode} size={160} />
              <p className="font-mono font-bold text-xl tracking-[0.2em] mt-4 mb-1">{item.tsCode}</p>
              <p className="text-xs font-semibold text-slate-600 text-center leading-snug mb-3" title={item.nama}>{item.nama}</p>
              <div className="w-full border-t border-slate-200 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">MS Code</span>
                  <span className="font-mono font-semibold">{item.msCode || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">BIN LOC</span>
                  <span className="font-mono font-semibold">{item.binLoc || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-400 -mt-2 mb-2 text-center">
          Klik "Cetak Label" untuk membuka dialog cetak browser
        </p>
        <DialogFooter className="w-full flex-row gap-2 justify-center sm:justify-center">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={handlePrint}>
            Cetak Label
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
