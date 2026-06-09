# Tel Gudang

Sistem manajemen gudang dengan autentikasi dan kontrol akses berbasis peran (RBAC).

## Run & Operate

- `pnpm run dev` — jalankan frontend + backend sekaligus (satu workflow)
- `pnpm run typecheck` — full typecheck semua package
- `pnpm run build` — typecheck + build semua package
- `pnpm --filter @workspace/db run push` — push perubahan skema DB (dev only)
- Required env: `DATABASE_URL`, `JWT_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS (port 8080)
- API: Express 5 (port 8081)
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken) + bcryptjs
- Validation: Zod + drizzle-zod
- Build: esbuild

## Where things live

- `artifacts/tel-gudang/` — frontend React/Vite
- `artifacts/api-server/` — backend Express API
- `lib/db/src/schema/users.ts` — skema DB (users + activity_logs)
- `artifacts/api-server/src/routes/` — API routes
- `artifacts/api-server/src/middlewares/` — auth & RBAC middleware
- `artifacts/api-server/src/lib/auth.ts` — JWT + bcrypt helpers

## RBAC — Role Definitions

| Role | Akses |
|------|-------|
| `admin` | Full access: kelola pengguna, barang, semua fitur |
| `operator` | Kelola barang/inventori (tidak bisa kelola pengguna) |
| `viewer` | Hanya lihat laporan (read-only) |

## Architecture decisions

- Single workflow (`pnpm run dev`) pakai `concurrently` jalankan frontend + backend
- Vite proxy `/api/*` → `http://localhost:8081` (tidak perlu CORS di dev)
- JWT disimpan di localStorage di client, dikirim via `Authorization: Bearer`
- Password di-hash dengan bcrypt (salt 12)
- Semua aksi penting dicatat ke tabel `activity_logs`
- Manajemen pengguna hanya bisa dilakukan oleh `admin`

## User preferences

- 1 service / 1 workflow saja (frontend + backend digabung)
- Bahasa Indonesia untuk UI dan pesan error API
- Database PostgreSQL (Replit built-in), nanti bisa diganti local PostgreSQL

## Gotchas

- Jangan pakai `zod/v4` di `api-server` — esbuild tidak bisa resolve subpath, pakai `zod` saja
- Jalankan `pnpm --filter @workspace/db run push` setiap ada perubahan skema DB

## Default Admin Account

- Email: `admin@telgudang.com`
- Password: `Admin@12345`
- NIK: `ADM001`
