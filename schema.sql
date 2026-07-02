-- =============================================================================
--  TEL GUDANG — Database Schema (referensi)
--  Sistem Manajemen Gudang PT Tanjungenim Lestari Pulp & Paper
--
--  PostgreSQL >= 14
--
--  CATATAN: Schema dikelola oleh Drizzle ORM.
--  Untuk apply ke database, gunakan:
--    pnpm --filter @workspace/db run push
--
--  File ini hanya sebagai referensi dokumentasi schema.
--  Untuk seed data awal, jalankan:
--    psql $DATABASE_URL -f scripts/seed.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------
CREATE TYPE role        AS ENUM ('admin', 'kepala_gudang', 'petugas');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

-- ---------------------------------------------------------------------------
-- TABEL: users
--    Akun pengguna sistem dengan RBAC (admin / kepala_gudang / petugas)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id             SERIAL      PRIMARY KEY,
  nik            TEXT        NOT NULL UNIQUE,
  nama_lengkap   TEXT        NOT NULL,
  email          TEXT        NOT NULL UNIQUE,
  password       TEXT        NOT NULL,               -- bcrypt hash (cost 12)
  role           role        NOT NULL DEFAULT 'petugas',
  no_hp          TEXT,
  departemen     TEXT,
  jabatan        TEXT,
  seksi          TEXT,
  status         user_status NOT NULL DEFAULT 'active',
  dibuat_oleh    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  permissions    JSONB       NOT NULL DEFAULT '{}',  -- { transaksi_masuk?: bool, transaksi_keluar?: bool }
  tanggal_gabung TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  login_terakhir TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABEL: activity_logs
--    Jejak audit setiap aksi penting pengguna
-- ---------------------------------------------------------------------------
CREATE TABLE activity_logs (
  id         SERIAL      PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  aksi       TEXT        NOT NULL,
  detail     TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABEL: kategori
--    Kategori master barang (bebas teks, bukan ENUM)
-- ---------------------------------------------------------------------------
CREATE TABLE kategori (
  id         SERIAL      PRIMARY KEY,
  nama       TEXT        NOT NULL UNIQUE,
  keterangan TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kategori default (sesuai data real):
--   Civil, Civil Material, Consumables, Mechanical Material, GH Consumable

-- ---------------------------------------------------------------------------
-- TABEL: items
--    Master data barang / inventaris gudang
-- ---------------------------------------------------------------------------
CREATE TABLE items (
  id           SERIAL      PRIMARY KEY,
  item_code    TEXT        NOT NULL UNIQUE,          -- identifier utama, e.g. TS-001
  ts_code      TEXT,                                 -- kode TS opsional (bisa sama dengan item_code)
  ms_code      TEXT,                                 -- kode MS dari sistem lama (angka, tanpa prefix)
  nama         TEXT        NOT NULL,
  kategori     TEXT        NOT NULL DEFAULT '',
  bin_loc      TEXT,                                 -- lokasi rak/bin, e.g. TS-D.10
  uom          TEXT        NOT NULL DEFAULT 'EA',
  stok         INTEGER     NOT NULL DEFAULT 0,
  safety_stok  INTEGER     NOT NULL DEFAULT 5,
  status       TEXT        NOT NULL DEFAULT 'Normal', -- 'Normal' | 'Warning' | 'Critical'
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABEL: transaksi_masuk
--    Penerimaan barang masuk ke gudang
-- ---------------------------------------------------------------------------
CREATE TABLE transaksi_masuk (
  id         SERIAL      PRIMARY KEY,
  nomor      TEXT        NOT NULL UNIQUE,            -- e.g. TRIN-2026-00001
  item_id    INTEGER     NOT NULL REFERENCES items(id),
  user_id    INTEGER     NOT NULL REFERENCES users(id),
  jumlah     INTEGER     NOT NULL,
  tanggal    DATE        NOT NULL,
  no_po      TEXT,
  keterangan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABEL: transaksi_keluar
--    Pengeluaran barang dari gudang
-- ---------------------------------------------------------------------------
CREATE TABLE transaksi_keluar (
  id                   SERIAL      PRIMARY KEY,
  nomor                TEXT        NOT NULL UNIQUE,  -- e.g. TREK-2026-00001
  group_id             TEXT,                         -- ID grup untuk keluar massal
  item_id              INTEGER     NOT NULL REFERENCES items(id),
  user_id              INTEGER     NOT NULL REFERENCES users(id),
  jumlah               INTEGER     NOT NULL,
  tanggal              DATE        NOT NULL,
  maintenance_order    TEXT,                         -- nomor MO SAP
  functional_location  TEXT,                         -- functional location SAP
  equipment            TEXT,                         -- equipment SAP
  movement_type        TEXT,                         -- movement type SAP
  order_type           TEXT,                         -- order type SAP
  activity_type        TEXT,                         -- activity type SAP
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX idx_users_role         ON users(role);
CREATE INDEX idx_users_status       ON users(status);
CREATE INDEX idx_activity_user      ON activity_logs(user_id);
CREATE INDEX idx_activity_created   ON activity_logs(created_at DESC);
CREATE INDEX idx_items_item_code    ON items(item_code);
CREATE INDEX idx_items_kategori     ON items(kategori);
CREATE INDEX idx_items_status       ON items(status);

-- ---------------------------------------------------------------------------
-- SEED DATA — lihat scripts/seed.sql
-- ---------------------------------------------------------------------------
-- Jalankan: psql $DATABASE_URL -f scripts/seed.sql
--
-- Berisi:
--   - 1 akun admin  (admin@telgudang.com / Admin@12345)
--   - 8 kategori    (Civil, Civil Material, Consumables, Mechanical Material,
--                    GH Consumable, Electrical Material, Furniture Material, Asset Tool)
--   - 15 item awal  (TS-001 s/d TS-015, data real dari Materials_2026.xlsx)
-- ---------------------------------------------------------------------------
