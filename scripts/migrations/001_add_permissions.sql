-- Migration: tambah kolom permissions untuk custom access petugas
-- Jalankan setelah: pnpm --filter @workspace/db run push
-- Atau jalankan manual: psql "$DATABASE_URL" -f scripts/migrations/001_add_permissions.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}';

-- Catatan:
-- Kolom permissions menyimpan hak akses tambahan untuk role 'petugas'.
-- Format: {"transaksi_masuk": true/false, "transaksi_keluar": true/false}
-- Default '{}' = semua toggle OFF (akses read-only seperti sebelumnya)
-- Contoh aktifkan transaksi masuk untuk user id=5:
--   UPDATE users SET permissions = '{"transaksi_masuk": true}' WHERE id = 5;

