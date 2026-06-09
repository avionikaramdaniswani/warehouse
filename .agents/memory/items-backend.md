---
name: Items backend
description: Items are now stored in PostgreSQL, not hardcoded in the frontend.
---

Items were previously hardcoded as ITEM_DATA in AppContext.tsx.

**What was built:**
- `lib/db/src/schema/items.ts` — added `itemsTable` (id, tsCode, msCode, nama, kategori, binLoc, uom, stok, safetyStok, status, isActive, timestamps)
- `artifacts/api-server/src/routes/items.ts` — GET/POST/PUT/DELETE /api/items, plus PATCH /api/items/:tsCode/stok (delta-based stok update)
- AppContext now fetches items from /api/items on login; no ITEM_DATA hardcode
- MasterBarang add/edit persists to API
- BarangMasuk/BarangKeluar call PATCH stok on each transaction

**Why:** User wanted item data from Master Barang to be usable in penerimaan/pengeluaran forms — same DB-backed source.

**Seeded:** 15 default items inserted via executeSql (ON CONFLICT DO NOTHING).

**Note:** `Kategori` type in Item interface is now `string` (was fixed union). zod/v4 must NOT be used in api-server routes — use `zod` directly (esbuild subpath issue).
