---
name: Petugas custom permissions
description: How the petugas role's custom access toggles (transaksi_masuk, transaksi_keluar) are implemented end-to-end.
---

## The rule
Petugas always have read-only access by default. They can be granted write access to Barang Masuk and/or Barang Keluar individually via admin toggles. Admin and kepala_gudang are never affected by this system.

**Why:** Business requirement — petugas role is read-only but some petugas may need to record transactions.

**How to apply:** Only applies when role === "petugas". For other roles, the permission check middleware is a no-op.

## Design
- `permissions` JSONB column on `users` table, `NOT NULL DEFAULT '{}'`
- Format: `{ transaksi_masuk?: boolean, transaksi_keluar?: boolean }`
- Empty `{}` = all OFF (fully read-only, like before)
- Migration file: `scripts/migrations/001_add_permissions.sql`

## Backend enforcement
- `backend/src/middlewares/checkPermission.ts` — `requirePermission(key)` middleware
  - If user role is NOT petugas → passes through (no-op)
  - If petugas → fetches permissions from DB, rejects with 403 if key is not `true`
- POST `/api/transaksi-masuk` uses `authorize("admin","kepala_gudang","petugas"), requirePermission("transaksi_masuk")`
- POST `/api/transaksi-keluar` uses `authorize("admin","kepala_gudang","petugas"), requirePermission("transaksi_keluar")`
- `PATCH /api/users/:id/permissions` (admin only) — validates body is `{transaksi_masuk: bool, transaksi_keluar: bool}`; only works for petugas role; logs activity

## Login / auth/me
- Login uses `SELECT *` → permissions always included in response
- `/auth/me` has explicit select list — `permissions` must be listed there (already done)
- Both endpoints spread `permissions: user.permissions ?? {}` to handle DB nulls

## Frontend
- `CurrentUser` in AppContext has `permissions: UserPermissions` (required)
- On app init from localStorage: normalize with `permissions: u.permissions ?? {}`
- Sidebar: petugas only sees Barang Masuk/Keluar menu items if corresponding permission is true
- ManajemenUser: separate petugas table with toggle columns (Barang Masuk / Barang Keluar)
  - Toggle state: `permissionsMap` (Record<userId, perms>) initialized from fetched users
  - Save button appears only when isDirty (local state differs from saved state)
  - On save: calls PATCH endpoint, updates users state in-place
  - Mobile card: permission toggles shown in extra section per petugas card
