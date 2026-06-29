-- Migration: update enum role (operator → kepala_gudang, viewer → petugas)
-- Jalankan jika DB lokal masih pakai nama role lama
--
-- PENTING: ALTER TYPE ADD VALUE tidak bisa dipakai dalam transaksi yang sama
-- dengan UPDATE. Jalankan dalam DUA LANGKAH TERPISAH di pgAdmin:
--
-- === LANGKAH 1: jalankan dulu, tunggu sampai selesai ===
ALTER TYPE role ADD VALUE IF NOT EXISTS 'kepala_gudang';
ALTER TYPE role ADD VALUE IF NOT EXISTS 'petugas';

-- === LANGKAH 2: jalankan SETELAH langkah 1 commit ===
-- UPDATE users SET role = 'kepala_gudang' WHERE role = 'operator';
-- UPDATE users SET role = 'petugas'       WHERE role = 'viewer';
--
-- (UPDATE di-comment karena harus dijalankan terpisah via pgAdmin atau psql)
