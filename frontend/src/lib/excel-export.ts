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

function applyPrintSettings(ws: ReturnType<typeof XLSXStyle.utils.json_to_sheet>) {
  ws['!pageSetup'] = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
  ws['!pageMargins'] = {
    left: 0.4,
    right: 0.4,
    top: 0.6,
    bottom: 0.6,
    header: 0.3,
    footer: 0.3,
  };
}

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
  applyPrintSettings(ws);
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
  ws['!autofilter'] = { ref: `A1:${XLSXStyle.utils.encode_cell({ r: 0, c: numCols - 1 })}` };
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
  XLSXStyle.writeFile(wb, fileName);
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
  applyPrintSettings(ws);
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
  ws['!autofilter'] = { ref: `A1:${XLSXStyle.utils.encode_cell({ r: 0, c: numCols - 1 })}` };
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
  XLSXStyle.writeFile(wb, fileName);
}
