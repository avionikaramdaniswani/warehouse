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
    const win = window.open('', '_blank', 'width=520,height=620');
    if (!win) { toast.error('Popup diblokir — izinkan popup di browser lalu coba lagi'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>Label ${item.tsCode}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#fff;display:flex;justify-content:center;padding:10mm;font-family:'Courier New',Courier,monospace}
  .label{width:90mm;border:1.5px solid #333;padding:5mm}
  .hdr{text-align:center;border-bottom:1px solid #999;padding-bottom:2.5mm;margin-bottom:2.5mm}
  .co{font-size:6.5pt;font-weight:bold;letter-spacing:.5px}
  .sub{font-size:5.5pt;color:#555;margin-top:.5mm}
  .qr{text-align:center;margin:2.5mm 0}
  .qr svg{width:48mm!important;height:48mm!important;display:inline-block}
  .ts{text-align:center;font-size:15pt;font-weight:bold;letter-spacing:3px;margin:1.5mm 0 1mm}
  .nama{text-align:center;font-size:6.5pt;font-weight:bold;margin:0 3mm 2mm;line-height:1.4;word-wrap:break-word}
  .divider{border-top:1px dashed #bbb;margin:2mm 0}
  .row{display:flex;justify-content:space-between;font-size:6.5pt;padding:.6mm 0}
  .val{font-weight:bold}
  @media print{body{padding:2mm}@page{margin:0}}
</style>
</head><body>
<div class="label">
  <div class="hdr">
    <div class="co">PT TANJUNGENIM LESTARI PULP & PAPER</div>
    <div class="sub">TOWNSITE WAREHOUSE — MATERIALS MANAGEMENT</div>
  </div>
  <div class="qr">${svgHtml}</div>
  <div class="ts">${item.tsCode}</div>
  <div class="nama">${item.nama}</div>
  <div class="divider"></div>
  <div class="row"><span>Kategori</span><span class="val">${item.kategori || '—'}</span></div>
  <div class="row"><span>BIN LOC</span><span class="val">${item.binLoc || '—'}</span></div>
  <div class="row"><span>Satuan (UOM)</span><span class="val">${item.uom || '—'}</span></div>
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
            className="bg-white p-6 border rounded-xl shadow-sm mb-4 flex flex-col items-center w-full max-w-[280px]"
          >
            <QRCodeSVG value={item.tsCode} size={200} />
            <div className="mt-5 w-full text-left space-y-1">
              <p className="font-mono font-bold text-lg text-center tracking-widest">{item.tsCode}</p>
              <p className="text-sm font-semibold truncate text-center" title={item.nama}>{item.nama}</p>
              <div className="flex justify-between border-t mt-3 pt-3 text-sm">
                <span className="text-muted-foreground">Lokasi:</span>
                <span className="font-mono font-medium">{item.binLoc || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kategori:</span>
                <span className="font-mono font-medium">{item.kategori}</span>
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
