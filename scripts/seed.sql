-- =============================================================================
--  TEL GUDANG — Seed Data
--  Jalankan SETELAH schema sudah ada (drizzle-kit push).
--  Aman dijalankan berulang: semua INSERT pakai ON CONFLICT DO NOTHING.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Admin default
-- Password: Admin@12345  (bcrypt cost 12)
-- ---------------------------------------------------------------------------
INSERT INTO users (nik, nama_lengkap, email, password, role, status, departemen, jabatan, tanggal_gabung, created_at, updated_at)
VALUES (
  'ADM001', 'Administrator', 'admin@telgudang.com',
  '$2b$12$/6maOn3DACYzodRZ5tmsxOsrNHbfAq72pUZJhBX45WpLqXk.6WIgW',
  'admin', 'active', 'IT', 'System Administrator',
  NOW(), NOW(), NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Kategori barang (sesuai data real Excel)
-- ---------------------------------------------------------------------------
INSERT INTO kategori (nama, keterangan, is_active, created_at, updated_at) VALUES
  ('Civil',                'Material sipil & bangunan',              true, NOW(), NOW()),
  ('Civil Material',       'Material konstruksi sipil',              true, NOW(), NOW()),
  ('Consumables',          'Material habis pakai operasional',       true, NOW(), NOW()),
  ('Mechanical Material',  'Material mekanikal & peralatan',         true, NOW(), NOW()),
  ('GH Consumable',        'Consumable untuk guest house/fasilitas', true, NOW(), NOW()),
  ('Electrical Material',  'Material elektrikal & instrumentasi',    true, NOW(), NOW()),
  ('Furniture Material',   'Material furnitur & inventaris kantor',  true, NOW(), NOW()),
  ('Asset Tool',           'Alat & aset tools operasional',          true, NOW(), NOW())
ON CONFLICT (nama) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 15 Item awal (data real dari Materials_2026.xlsx, Base sheet baris 1-15)
--   Kolom: item_code | ts_code | ms_code | nama | kategori | bin_loc | uom | stok | safety_stok | status
--   Status: Habis (stok=0), Menipis (stok <= safety_stok), Normal (stok > safety_stok)
-- ---------------------------------------------------------------------------
INSERT INTO items (item_code, ts_code, ms_code, nama, kategori, bin_loc, uom, stok, safety_stok, status, is_active, created_at, updated_at) VALUES
  ('TS-001','TS-001','140407',   'ACCOUSTIC PANEL,AURATONE,PATTERN RADAR,SIZE 600 X 1200 X 15MM,1 BOX @ 8 SHT,FOR CEILING',             'Civil',               NULL,        'BOX',  40,  5, 'Normal',  true, NOW(), NOW()),
  ('TS-002','TS-002','529594',   'ACRYLIC,SIZE WIDTH=100CM,LENGTH=200CM,THK=3MM,COLOUR CLEAR',                                           'Civil Material',      NULL,        'EA',    0,  2, 'Habis',   true, NOW(), NOW()),
  ('TS-003','TS-003','527552',   'ADHESIVE,CYANDACRYLATE,(AIBON GLUE),700GR/CAN',                                                        'Consumables',         'TS-D.10',   'CANS', 26,  5, 'Normal',  true, NOW(), NOW()),
  ('TS-004','TS-004','531484',   'AIR CONDITIONER WATER DRAIN PUMP,V-RTG 220-240V,FREQ 50/60HZ,DUMPING HEIGHT(MAX) 3M,POWER (MAX) 18W', 'Mechanical Material', 'TS-E.06',   'EA',   10,  0, 'Normal',  true, NOW(), NOW()),
  ('TS-005','TS-005','527703',   'AIR CONDITIONER,NON INVERTER,MDL CS-YN12TKJ,1.5PK,220V/1PHASE/50HZ,REFRIGERANT R32',                  'Mechanical Material', 'TS-CONT.E', 'UNIT',  5,  5, 'Menipis', true, NOW(), NOW()),
  ('TS-006','TS-006','527698',   'AIR CONDITIONER,NON INVERTER,MDL CS-YN18TKJ,2PK,220V/1PHASE/50HZ,REFRIGERANT R32',                    'Mechanical Material', 'TS-CONT.E', 'UNIT',  4,  5, 'Menipis', true, NOW(), NOW()),
  ('TS-007','TS-007','528760',   'AIR CONDITIONER,SPLIT SYSTEM,TYPE STANDAR,POWER SUPPLY 780W,COOLING CAPACITY 1PK,REFRIGERANT R32',    'Mechanical Material', 'TS-CONT-E', 'UNIT',  3,  3, 'Normal',  true, NOW(), NOW()),
  ('TS-008','TS-008','41600480', 'ALAT PEL,@LUSIN=12EA',                                                                                 'GH Consumable',       'TS-J.13',   'EA',    0,  2, 'Habis',   true, NOW(), NOW()),
  ('TS-009','TS-009','127997',   'ANCHOR,PLASTIC,SIZE 10-12',                                                                             'Consumables',         'TS-J.17',   'EA',   17, 20, 'Menipis', true, NOW(), NOW()),
  ('TS-010','TS-010','116437',   'ANCHORS,DYNABOLT SLEEVE ANCHORS,BOLT DIA=M10,DH=12MM,LE=100MM,MATL GALV',                              'Consumables',         'TS-J.09',   'EA',    0, 10, 'Habis',   true, NOW(), NOW()),
  ('TS-011','TS-011','131629',   'ANCHORS,DYNABOLT SLEEVE ANCHORS,BOLT DIA=M10,DH=12MM,LE=125MM,MATL GALV',                              'Consumables',         'TS-L.04',   'EA',   34, 10, 'Normal',  true, NOW(), NOW()),
  ('TS-012','TS-012','140192',   'ANCHORS,DYNABOLT SLEEVE ANCHORS,BOLT DIA=M10,DH=M12,LE=160MM,MATL GALV',                               'Consumables',         'TS-L.05',   'EA',   41, 10, 'Normal',  true, NOW(), NOW()),
  ('TS-013','TS-013','150876',   'ANCHORS,DYNABOLT SLEEVE ANCHORS,BOLT DIA=M10,DIA HOLE=12MM,LE=70MM,MATL SS316',                        'Consumables',         'TS-J.09',   'EA',   20,  0, 'Normal',  true, NOW(), NOW()),
  ('TS-014','TS-014','141943',   'ANCHORS,DYNABOLT SLEEVE ANCHORS,BOLT DIA=M10,DIA HOLE=M12,LE=60MM,MATL GALV',                          'Consumables',         'TS-J.09',   'EA',    0,  0, 'Normal',  true, NOW(), NOW()),
  ('TS-015','TS-015','116438',   'ANCHORS,DYNABOLT SLEEVE ANCHORS,BOLT DIA=M12,DH=16MM,LE=110MM,MATL GALV',                              'Consumables',         'TS-L.06',   'EA',   54, 10, 'Normal',  true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;
