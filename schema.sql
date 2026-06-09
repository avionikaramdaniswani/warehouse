-- =============================================================================
--  TEL GUDANG — Database Schema
--  Sistem Manajemen Gudang PT Tanjungenim Lestari Pulp & Paper
--
--  PostgreSQL >= 14
--
--  Cara pakai (local):
--    1. Buat database dulu:
--         createdb tel_gudang
--    2. Jalankan file ini:
--         psql -d tel_gudang -f schema.sql
--    3. Set DATABASE_URL di .env:
--         DATABASE_URL=postgresql://USER:PASS@localhost:5432/tel_gudang
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. BERSIHKAN (aman dijalankan ulang)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS transaksi_keluar   CASCADE;
DROP TABLE IF EXISTS transaksi_masuk    CASCADE;
DROP TABLE IF EXISTS barang             CASCADE;
DROP TABLE IF EXISTS activity_logs      CASCADE;
DROP TABLE IF EXISTS users              CASCADE;

DROP TYPE IF EXISTS keperluan_keluar;
DROP TYPE IF EXISTS kondisi_barang;
DROP TYPE IF EXISTS status_stok;
DROP TYPE IF EXISTS kategori_barang;
DROP TYPE IF EXISTS user_status;
DROP TYPE IF EXISTS role;

-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------------

-- Role pengguna
CREATE TYPE role AS ENUM ('admin', 'operator', 'viewer');

-- Status akun pengguna
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

-- Kategori barang (sesuai AppContext)
CREATE TYPE kategori_barang AS ENUM (
  'Civil',
  'Electrical',
  'Mechanical',
  'Furniture',
  'Consumables',
  'GH Consumable'
);

-- Status stok barang
CREATE TYPE status_stok AS ENUM ('Normal', 'Menipis', 'Habis');

-- Kondisi barang saat penerimaan
CREATE TYPE kondisi_barang AS ENUM ('Baik Baru', 'Baik Bekas', 'Rusak');

-- Keperluan pengeluaran barang
CREATE TYPE keperluan_keluar AS ENUM (
  'Perbaikan',
  'Penggantian',
  'Proyek Baru',
  'Peminjaman',
  'Lainnya'
);

-- ---------------------------------------------------------------------------
-- 2. TABEL: users
--    Menyimpan data akun pengguna sistem
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id             SERIAL          PRIMARY KEY,

  -- Identitas
  nik            TEXT            NOT NULL UNIQUE,        -- NIK karyawan, e.g. ADM001
  nama_lengkap   TEXT            NOT NULL,
  email          TEXT            NOT NULL UNIQUE,
  password       TEXT            NOT NULL,               -- bcrypt hash (cost 12)

  -- Akses
  role           role            NOT NULL DEFAULT 'viewer',
  status         user_status     NOT NULL DEFAULT 'active',

  -- Info pekerjaan
  no_hp          TEXT,
  departemen     TEXT,
  jabatan        TEXT,
  seksi          TEXT,

  -- Relasi: siapa yang membuat akun ini
  dibuat_oleh    INTEGER         REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  tanggal_gabung TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  login_terakhir TIMESTAMPTZ,
  created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. TABEL: activity_logs
--    Jejak audit setiap aksi penting pengguna
-- ---------------------------------------------------------------------------
CREATE TABLE activity_logs (
  id          SERIAL      PRIMARY KEY,
  user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  aksi        TEXT        NOT NULL,   -- e.g. USER_LOGIN, USER_CREATE, PASSWORD_RESET
  detail      TEXT,                   -- deskripsi ringkas aksi
  ip_address  TEXT,                   -- IPv4/IPv6 klien
  user_agent  TEXT,                   -- browser/OS string

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. TABEL: barang
--    Master data barang / inventaris gudang
-- ---------------------------------------------------------------------------
CREATE TABLE barang (
  id           SERIAL          PRIMARY KEY,

  ts_code      TEXT            NOT NULL UNIQUE,   -- kode internal TS, e.g. TS-001
  ms_code      TEXT,                              -- kode MS (opsional)
  nama         TEXT            NOT NULL,

  kategori     kategori_barang NOT NULL,
  bin_loc      TEXT,                              -- lokasi rak/bin, e.g. TS-D.10
  uom          TEXT            NOT NULL DEFAULT 'EA',  -- unit of measure

  stok         INTEGER         NOT NULL DEFAULT 0 CHECK (stok >= 0),
  safety_stok  INTEGER         NOT NULL DEFAULT 0 CHECK (safety_stok >= 0),
  status       status_stok     NOT NULL DEFAULT 'Normal',

  created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. TABEL: transaksi_masuk
--    Riwayat penerimaan barang masuk ke gudang
-- ---------------------------------------------------------------------------
CREATE TABLE transaksi_masuk (
  id          SERIAL          PRIMARY KEY,

  nomor       TEXT            NOT NULL UNIQUE,   -- e.g. TRIN-2025-00001 (auto via app)
  barang_id   INTEGER         NOT NULL REFERENCES barang(id),
  user_id     INTEGER         NOT NULL REFERENCES users(id),

  jumlah      INTEGER         NOT NULL CHECK (jumlah > 0),
  kondisi     kondisi_barang  NOT NULL DEFAULT 'Baik Baru',

  tanggal     DATE            NOT NULL DEFAULT CURRENT_DATE,
  no_po       TEXT,           -- nomor Purchase Order / referensi
  keterangan  TEXT,

  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6. TABEL: transaksi_keluar
--    Riwayat pengeluaran barang dari gudang
-- ---------------------------------------------------------------------------
CREATE TABLE transaksi_keluar (
  id          SERIAL          PRIMARY KEY,

  nomor       TEXT            NOT NULL UNIQUE,   -- e.g. TROUT-2025-00001
  barang_id   INTEGER         NOT NULL REFERENCES barang(id),
  user_id     INTEGER         NOT NULL REFERENCES users(id),

  jumlah      INTEGER         NOT NULL CHECK (jumlah > 0),
  keperluan   keperluan_keluar NOT NULL DEFAULT 'Perbaikan',
  tujuan      TEXT,           -- nama orang / area / proyek tujuan

  tanggal     DATE            NOT NULL DEFAULT CURRENT_DATE,
  keterangan  TEXT,

  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 7. INDEXES
--    Optimasi query yang paling sering dipakai
-- ---------------------------------------------------------------------------

-- Users
CREATE INDEX idx_users_role         ON users(role);
CREATE INDEX idx_users_status       ON users(status);
CREATE INDEX idx_users_departemen   ON users(departemen);

-- Activity logs
CREATE INDEX idx_activity_user_id   ON activity_logs(user_id);
CREATE INDEX idx_activity_aksi      ON activity_logs(aksi);
CREATE INDEX idx_activity_created   ON activity_logs(created_at DESC);

-- Barang
CREATE INDEX idx_barang_kategori    ON barang(kategori);
CREATE INDEX idx_barang_status      ON barang(status);
CREATE INDEX idx_barang_ts_code     ON barang(ts_code);

-- Transaksi masuk
CREATE INDEX idx_trmasuk_barang     ON transaksi_masuk(barang_id);
CREATE INDEX idx_trmasuk_user       ON transaksi_masuk(user_id);
CREATE INDEX idx_trmasuk_tanggal    ON transaksi_masuk(tanggal DESC);

-- Transaksi keluar
CREATE INDEX idx_trkeluar_barang    ON transaksi_keluar(barang_id);
CREATE INDEX idx_trkeluar_user      ON transaksi_keluar(user_id);
CREATE INDEX idx_trkeluar_tanggal   ON transaksi_keluar(tanggal DESC);

-- ---------------------------------------------------------------------------
-- 8. SEED DATA — Admin
--    Password: Admin@12345  (bcrypt cost 12)
--    Ganti hash jika ingin password berbeda:
--      node -e "const b=require('bcrypt'); b.hash('PASSWORD_BARU',12).then(console.log)"
-- ---------------------------------------------------------------------------
INSERT INTO users (
  nik, nama_lengkap, email, password,
  role, status, departemen, jabatan
) VALUES (
  'ADM001',
  'Administrator',
  'admin@telgudang.com',
  '$2b$12$FeJBxcyviX0k8dPbdune3eRGwtQOwt7jsQGY0bHr6byRdrfzk9W7m',
  'admin',
  'active',
  'IT',
  'System Administrator'
);

-- ---------------------------------------------------------------------------
-- 9. SEED DATA — Master Barang (15 item awal dari AppContext)
-- ---------------------------------------------------------------------------
INSERT INTO barang (ts_code, ms_code, nama, kategori, bin_loc, uom, stok, safety_stok, status) VALUES
  ('TS-001', 'MS-001', 'ACOUSTIC PANEL AURATONE SIZE 600x1200x15MM',       'Civil',         'TS-D.10',       'BOX',  40,   5,  'Normal'),
  ('TS-003', 'MS-003', 'ADHESIVE CYANDACRYLATE AIBON GLUE 700GR',          'Consumables',   'TS-D.10',       'CANS', 26,   5,  'Normal'),
  ('TS-005', 'MS-005', 'AIR CONDITIONER NON INVERTER 1.5PK CS-YN12TKJ',    'Mechanical',    'TS-CONT.E',     'UNIT', 5,    5,  'Menipis'),
  ('TS-006', 'MS-006', 'AIR CONDITIONER NON INVERTER 2PK CS-YN18TKJ',      'Mechanical',    'TS-CONT.E',     'UNIT', 4,    5,  'Menipis'),
  ('TS-008', 'MS-008', 'ALAT PEL @LUSIN=12EA',                             'GH Consumable', 'TS-J.13',       'EA',   0,    2,  'Habis'),
  ('TS-009', 'MS-009', 'ANCHOR PLASTIC SIZE 10-12',                        'Consumables',   'TS-J.17',       'EA',   17,   20, 'Menipis'),
  ('TS-025', 'MS-025', 'BALLAST LAMP TYPE BHL 80L 80W 220V 50Hz',          'Electrical',    'TS-L.23',       'EA',   34,   5,  'Normal'),
  ('TS-044', 'MS-044', 'BATTERY NON RECHARGEABLE TYPE AAA 1.5V',           'Consumables',   'TS-F.13',       'EA',   99,   10, 'Normal'),
  ('TS-047', 'MS-047', 'BAYGON',                                           'GH Consumable', 'TS-J.13',       'CANS', 0,    5,  'Habis'),
  ('TS-059', 'MS-059', 'BED MDL MESSARIA SIZE 120x200CM WOOD',             'Furniture',     'TS-FURNITURE.D','SET',  7,    5,  'Normal'),
  ('TS-063', 'MS-063', 'BED SINGLE TYPE SHUMO FRAME IRON 100x200CM',       'Furniture',     '-',             'UNIT', 58,   2,  'Normal'),
  ('TS-084', 'MS-084', 'BRICK STONE SIZE 100x100x200MM',                   'Civil',         'TS-GD.SAND',    'EA',   4180, 100,'Normal'),
  ('TS-096', 'MS-096', 'BULB LED P-RTG 19W COOL DAYLIGHT',                 'Electrical',    'TS-A.02',       'EA',   110,  30, 'Normal'),
  ('TS-098', 'MS-098', 'BULB LED P-RTG 8W WHITE 6500K',                    'Electrical',    'TS-A.02',       'EA',   285,  20, 'Normal'),
  ('TS-099', 'MS-099', 'BULB TL-LED ECOFIT TUBE 16W 120CM',                'Electrical',    'TS-L.29',       'EA',   0,    20, 'Habis');

-- ---------------------------------------------------------------------------
-- Selesai. Verifikasi:
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
--   SELECT COUNT(*) FROM users;    -- harus 1
--   SELECT COUNT(*) FROM barang;   -- harus 15
-- ---------------------------------------------------------------------------
