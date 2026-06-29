-- Migration: update enum role (operator → kepala_gudang, viewer → petugas)
-- Jalankan jika DB lokal masih pakai nama role lama
-- psql "$DATABASE_URL" -f scripts/migrations/002_update_role_enum.sql

-- Langkah 1: tambah nilai enum baru
ALTER TYPE role ADD VALUE IF NOT EXISTS 'kepala_gudang';
ALTER TYPE role ADD VALUE IF NOT EXISTS 'petugas';

-- Langkah 2: update data pengguna yang masih pakai role lama
-- (harus dijalankan di transaksi terpisah setelah ALTER TYPE commit)
UPDATE users SET role = 'kepala_gudang' WHERE role = 'operator';
UPDATE users SET role = 'petugas'       WHERE role = 'viewer';
