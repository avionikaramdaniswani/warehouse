---
name: QR label print
description: How QR code label printing works — SVG from DOM, window.open, injected HTML.
---

QR label printing in MasterBarang works by:
1. The QR modal / mobile bottom sheet has a container with `id="qr-desktop-box"` or `id="qr-mobile-box"` wrapping the `<QRCodeSVG>` component.
2. `handlePrintLabel(item)` gets the rendered SVG via `document.getElementById(id)?.querySelector('svg')`.
3. Clones the SVG, sets `xmlns` attribute, then serializes via `.outerHTML`.
4. Opens `window.open('', '_blank')` and writes a full HTML document with the label template.
5. Auto-triggers `window.print()` via `window.onload` script, then closes after 1.5s.

**Why:** Allows clean, styled print dialog without needing extra libraries. Works because the QR modal is open when "Cetak Label" is clicked (so SVG is in DOM).

**QR scanner:** Uses `html5-qrcode` (`Html5Qrcode` low-level class, not `Html5QrcodeScanner`). Component is `QrScannerDialog.tsx`. Scanner must start 200ms after dialog opens to ensure DOM element exists. Always call `inst.stop()` + `inst.clear()` on cleanup. Camera buttons/selects injected by html5-qrcode are hidden via Tailwind class overrides on the container.

**How to apply:** QR codes encode `tsCode` directly. `handleQrScan(tsCode)` in BarangMasuk/Keluar finds item by tsCode, pre-selects it, and opens the input form if not already open.
