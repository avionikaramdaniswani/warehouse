-- Migration 003: Tambah item_code ke items & kolom baru ke transaksi_keluar
-- Jalankan jika DB lokal belum punya kolom-kolom ini
--
-- Cara jalankan:
--   psql postgresql://postgres:postgres@localhost:5432/telgudang -f scripts/migrations/003_add_item_code_and_transaksi_columns.sql
-- ============================================================

-- 1. Tambah item_code ke tabel items (nullable dulu)
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_code TEXT;

-- 2. Isi item_code dari ts_code yang sudah ada
UPDATE items
SET item_code = ts_code
WHERE item_code IS NULL
  AND ts_code IS NOT NULL
  AND ts_code <> '';

-- 3. Fallback: generate dari id untuk baris yang masih kosong
UPDATE items
SET item_code = 'TS-' || LPAD(id::TEXT, 3, '0')
WHERE item_code IS NULL OR item_code = '';

-- 4. Set NOT NULL setelah semua baris terisi
ALTER TABLE items ALTER COLUMN item_code SET NOT NULL;

-- 5. Tambah UNIQUE constraint (dengan cek manual agar tidak error jika sudah ada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'items_item_code_unique'
  ) THEN
    ALTER TABLE items ADD CONSTRAINT items_item_code_unique UNIQUE (item_code);
  END IF;
END$$;

-- 6. Tambah kolom-kolom baru ke transaksi_keluar
ALTER TABLE transaksi_keluar ADD COLUMN IF NOT EXISTS group_id            TEXT;
ALTER TABLE transaksi_keluar ADD COLUMN IF NOT EXISTS maintenance_order   TEXT;
ALTER TABLE transaksi_keluar ADD COLUMN IF NOT EXISTS functional_location TEXT;
ALTER TABLE transaksi_keluar ADD COLUMN IF NOT EXISTS equipment           TEXT;
ALTER TABLE transaksi_keluar ADD COLUMN IF NOT EXISTS movement_type       TEXT;
ALTER TABLE transaksi_keluar ADD COLUMN IF NOT EXISTS order_type          TEXT;
ALTER TABLE transaksi_keluar ADD COLUMN IF NOT EXISTS activity_type       TEXT;

-- 7. Verifikasi — harus muncul 8 baris
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('items', 'transaksi_keluar')
  AND column_name IN (
    'item_code', 'group_id', 'maintenance_order',
    'functional_location', 'equipment',
    'movement_type', 'order_type', 'activity_type'
  )
ORDER BY table_name, column_name;
