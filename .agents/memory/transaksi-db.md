---
name: Transaksi DB tables
description: Schema and API design for transaksi_masuk and transaksi_keluar, including stok update and AppContext changes.
---

## Tables
- `transaksi_masuk`: id, nomor (unique, TRIN-YYYY-XXXXX), item_id FK, user_id FK, jumlah, kondisi, tanggal (date), no_po, keterangan, created_at
- `transaksi_keluar`: id, nomor (unique, TROUT-YYYY-XXXXX), item_id FK, user_id FK, jumlah, keperluan, tujuan, tanggal (date), keterangan, created_at

## API routes
- `GET /api/transaksi-masuk` — list with JOIN to items+users; in-memory filter by search/kondisi/tanggal
- `POST /api/transaksi-masuk` — atomically inserts transaksi + updates items.stok (+delta)
- `GET /api/transaksi-keluar` — same pattern
- `POST /api/transaksi-keluar` — validates stok >= jumlah, then atomically inserts + updates stok (-delta)

## Nomor generation
`count()` existing rows + 1, padded to 5 digits. Simple but sufficient; revisit if concurrent inserts become a concern.

## AppContext
`transaksiMasuk` and `transaksiKeluar` state **removed** from AppContext — local state per page, fetched with `useEffect` on mount and after each save.

## Dashboard
Dashboard fetches today's count from both endpoints using `?tanggal=YYYY-MM-DD` query param. No shared global state needed.

**Why:** Local state per page is simpler and avoids stale cache — each page always shows fresh DB data on load.
