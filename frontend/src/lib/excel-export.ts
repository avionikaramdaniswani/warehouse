import XLSXStyle from 'xlsx-js-style';

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
  fill: { patternType: 'solid', fgColor: { rgb: '1B3A2D' } },
  border: {
    top:    { style: 'thin', color: { rgb: '888888' } },
    bottom: { style: 'medium', color: { rgb: '555555' } },
    left:   { style: 'thin', color: { rgb: '888888' } },
    right:  { style: 'thin', color: { rgb: '888888' } },
  },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
};

const ROW_STYLE = (even: boolean) => ({
  font: { sz: 10, name: 'Calibri' },
  fill: { patternType: 'solid', fgColor: { rgb: even ? 'EDF5F1' : 'FFFFFF' } },
  border: {
    top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
    bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
    left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
    right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
  },
  alignment: { vertical: 'center', wrapText: false },
});

function applyStyles(ws: ReturnType<typeof XLSXStyle.utils.json_to_sheet>, numCols: number, numDataRows: number) {
  for (let c = 0; c < numCols; c++) {
    const ref = XLSXStyle.utils.encode_cell({ r: 0, c });
    if (ws[ref]) ws[ref].s = HEADER_STYLE;
  }
  for (let r = 1; r <= numDataRows; r++) {
    const s = ROW_STYLE(r % 2 === 0);
    for (let c = 0; c < numCols; c++) {
      const ref = XLSXStyle.utils.encode_cell({ r, c });
      if (ws[ref]) ws[ref].s = s;
    }
  }
  ws['!rows'] = [{ hpt: 22 }];
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
}

// ─── ZIP / pageSetup injection ──────────────────────────────────────────────

const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC32_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function ru16(b: Uint8Array, o: number) { return (b[o] | (b[o + 1] << 8)) >>> 0; }
function ru32(b: Uint8Array, o: number) { return (b[o] | (b[o+1]<<8) | (b[o+2]<<16) | (b[o+3]*0x1000000)) >>> 0; }

interface ZipEntry {
  filename: string;
  data: Uint8Array;
  method: number;
  crc: number;
  time: number;
  date: number;
  externalAttr: number;
}

function parseZip(buf: Uint8Array): ZipEntry[] {
  let eocd = buf.length - 22;
  while (eocd >= 0 && !(buf[eocd]===0x50 && buf[eocd+1]===0x4b && buf[eocd+2]===0x05 && buf[eocd+3]===0x06)) eocd--;
  const cdOffset = ru32(buf, eocd + 16);
  const numEntries = ru16(buf, eocd + 8);
  const entries: ZipEntry[] = [];
  let cdPos = cdOffset;
  const dec = new TextDecoder();
  for (let i = 0; i < numEntries; i++) {
    const method      = ru16(buf, cdPos + 10);
    const time        = ru16(buf, cdPos + 12);
    const date        = ru16(buf, cdPos + 14);
    const crc         = ru32(buf, cdPos + 16);
    const compSize    = ru32(buf, cdPos + 20);
    const fnLen       = ru16(buf, cdPos + 28);
    const extraLen    = ru16(buf, cdPos + 30);
    const commentLen  = ru16(buf, cdPos + 32);
    const extAttr     = ru32(buf, cdPos + 38);
    const localOffset = ru32(buf, cdPos + 42);
    const filename    = dec.decode(buf.slice(cdPos + 46, cdPos + 46 + fnLen));
    const localExLen  = ru16(buf, localOffset + 28);
    const dataStart   = localOffset + 30 + fnLen + localExLen;
    const data        = new Uint8Array(buf.slice(dataStart, dataStart + compSize));
    entries.push({ filename, data, method, crc, time, date, externalAttr: extAttr });
    cdPos += 46 + fnLen + extraLen + commentLen;
  }
  return entries;
}

function buildZip(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let offset = 0;

  for (const entry of entries) {
    offsets.push(offset);
    const fn = enc.encode(entry.filename);
    const lh = new DataView(new ArrayBuffer(30 + fn.length));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0, true);
    lh.setUint16(8, entry.method, true);
    lh.setUint16(10, entry.time, true);
    lh.setUint16(12, entry.date, true);
    lh.setUint32(14, entry.crc, true);
    lh.setUint32(18, entry.data.length, true);
    lh.setUint32(22, entry.data.length, true);
    lh.setUint16(26, fn.length, true);
    lh.setUint16(28, 0, true);
    const lhu8 = new Uint8Array(lh.buffer);
    lhu8.set(fn, 30);
    parts.push(lhu8, entry.data);
    offset += lhu8.length + entry.data.length;
  }

  const cdStart = offset;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const fn = enc.encode(e.filename);
    const cd = new DataView(new ArrayBuffer(46 + fn.length));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0, true);
    cd.setUint16(10, e.method, true);
    cd.setUint16(12, e.time, true);
    cd.setUint16(14, e.date, true);
    cd.setUint32(16, e.crc, true);
    cd.setUint32(20, e.data.length, true);
    cd.setUint32(24, e.data.length, true);
    cd.setUint16(28, fn.length, true);
    cd.setUint16(30, 0, true);
    cd.setUint16(32, 0, true);
    cd.setUint16(34, 0, true);
    cd.setUint16(36, 0, true);
    cd.setUint32(38, e.externalAttr, true);
    cd.setUint32(42, offsets[i], true);
    const cdu8 = new Uint8Array(cd.buffer);
    cdu8.set(fn, 46);
    parts.push(cdu8);
    offset += cdu8.length;
  }

  const cdSize = offset - cdStart;
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(4, 0, true);
  eocd.setUint16(6, 0, true);
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, cdSize, true);
  eocd.setUint32(16, cdStart, true);
  eocd.setUint16(20, 0, true);
  parts.push(new Uint8Array(eocd.buffer));

  const total = parts.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return out;
}

const PRINT_SETUP_XML =
  '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
  '<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>';

function injectPrintSettings(xlsxArray: number[]): Uint8Array {
  const buf = new Uint8Array(xlsxArray);
  const entries = parseZip(buf);

  for (const entry of entries) {
    if (entry.filename === 'xl/worksheets/sheet1.xml') {
      let xml = new TextDecoder().decode(entry.data);
      xml = xml.replace(/<sheetView\b(?![^>]*fitToPage)/g, '<sheetView fitToPage="1"');
      if (!xml.includes('<pageSetup')) {
        xml = xml.replace('</worksheet>', PRINT_SETUP_XML + '</worksheet>');
      }
      const newData = new TextEncoder().encode(xml);
      entry.data = newData;
      entry.crc = crc32(newData);
    }
  }

  return buildZip(entries);
}

function downloadXlsx(data: Uint8Array, fileName: string) {
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── Public export functions ────────────────────────────────────────────────

export function exportStyledExcel({
  rows,
  colWidths,
  sheetName,
  fileName,
}: {
  rows: Record<string, unknown>[];
  colWidths: number[];
  sheetName: string;
  fileName: string;
}) {
  if (rows.length === 0) return;
  const ws = XLSXStyle.utils.json_to_sheet(rows);
  const numCols = Object.keys(rows[0]).length;
  applyStyles(ws, numCols, rows.length);
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
  ws['!autofilter'] = { ref: `A1:${XLSXStyle.utils.encode_cell({ r: 0, c: numCols - 1 })}` };
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
  const raw: number[] = XLSXStyle.write(wb, { type: 'array', bookType: 'xlsx' });
  downloadXlsx(injectPrintSettings(raw), fileName);
}

export function exportStyledExcelAOA({
  data,
  colWidths,
  sheetName,
  fileName,
}: {
  data: unknown[][];
  colWidths: number[];
  sheetName: string;
  fileName: string;
}) {
  if (data.length <= 1) return;
  const ws = XLSXStyle.utils.aoa_to_sheet(data);
  const numCols = (data[0] as unknown[]).length;
  applyStyles(ws, numCols, data.length - 1);
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
  ws['!autofilter'] = { ref: `A1:${XLSXStyle.utils.encode_cell({ r: 0, c: numCols - 1 })}` };
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
  const raw: number[] = XLSXStyle.write(wb, { type: 'array', bookType: 'xlsx' });
  downloadXlsx(injectPrintSettings(raw), fileName);
}
