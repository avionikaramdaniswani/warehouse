# Tel Gudang

Sistem manajemen gudang (WMS) PT Tanjungenim Lestari Pulp & Paper dengan autentikasi dan kontrol akses berbasis peran (RBAC).

## Run & Operate

- `pnpm run dev` — jalankan frontend + backend sekaligus (satu workflow)
- `pnpm run typecheck` — full typecheck semua package
- `pnpm run build` — typecheck + build semua package
- `pnpm --filter @workspace/db run push` — apply perubahan skema DB (dev only)
- `psql $DATABASE_URL -f scripts/seed.sql` — isi data awal (admin + kategori + 15 item)
- Required env: `DATABASE_URL` (secret), `JWT_SECRET` (shared env var)

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind CSS 4 (port 5000)
- API: Express 5 (port 8082)
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken) + bcryptjs
- Validation: Zod (v3 — bukan zod/v4) + drizzle-zod
- Build: esbuild

## Where things live

- `artifacts/tel-gudang/` — frontend React/Vite
- `artifacts/api-server/` — backend Express API
- `lib/db/src/schema/users.ts` — skema tabel users & activity_logs
- `lib/db/src/schema/items.ts` — skema tabel items & kategori
- `artifacts/api-server/src/routes/` — API routes
- `artifacts/api-server/src/middlewares/` — auth & RBAC middleware
- `artifacts/api-server/src/lib/auth.ts` — JWT + bcrypt helpers
- `scripts/seed.sql` — seed data awal (idempotent, aman dijalankan ulang)
- `schema.sql` — referensi dokumentasi schema lengkap

## RBAC — Role Definitions

| Role | Akses |
|------|-------|
| `admin` | Full access: kelola pengguna, barang, semua fitur |
| `operator` | Kelola barang/inventori (tidak bisa kelola pengguna) |
| `viewer` | Hanya lihat laporan (read-only) |

## Kategori Barang

Kategori disimpan di tabel `kategori` (bukan ENUM), sehingga bisa ditambah tanpa migrasi.
Data awal (dari Materials_2026.xlsx):
- Civil
- Civil Material
- Consumables
- Mechanical Material
- GH Consumable

## Architecture decisions

- Single workflow (`pnpm run dev`) pakai `concurrently` jalankan frontend (port 5000) + backend (port 8082)
- Vite proxy `/api/*` → `http://localhost:8082`
- JWT disimpan di localStorage di client, dikirim via `Authorization: Bearer`
- Password di-hash dengan bcrypt (salt 12)
- Semua aksi penting dicatat ke tabel `activity_logs`
- Manajemen pengguna hanya bisa dilakukan oleh `admin`
- `schema.sql` hanya dokumentasi — schema dikelola Drizzle ORM via `db push`
- MS Code disimpan sebagai teks angka saja (tanpa prefix), sesuai format asli sistem

## User preferences

- 1 service / 1 workflow saja (frontend + backend digabung)
- Bahasa Indonesia untuk UI dan pesan error API
- Database PostgreSQL (Replit built-in)

## Gotchas

- Jangan pakai `zod/v4` di mana pun — esbuild tidak bisa resolve subpath, dan `z.email()` (v4 API) tidak ada di zod v3; pakai `z.string().email()`
- Jalankan `pnpm --filter @workspace/db run push` setiap ada perubahan skema DB
- Vite dev server jalan di port 5000 (bukan 8080 seperti di replit.md lama)
- API server jalan di port 8082 (bukan 8081)

## Default Admin Account

- Email: `admin@telgudang.com`
- Password: `Admin@12345`
- NIK: `ADM001`
- Hash bcrypt: `$2b$12$/6maOn3DACYzodRZ5tmsxOsrNHbfAq72pUZJhBX45WpLqXk.6WIgW`
