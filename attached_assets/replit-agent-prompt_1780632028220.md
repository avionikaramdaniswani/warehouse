# Replit Agent Prompt — Mockup Sistem Manajemen Gudang PT TeL

---

## COPY PASTE PROMPT INI KE REPLIT AGENT:

---

Build a **full UI mockup** (frontend only, no backend needed) for a **Warehouse Inventory Management System** for PT Tanjungenim Lestari Pulp and Paper (PT TeL), a large pulp & paper manufacturing company in South Sumatra, Indonesia. This system will replace their current manual Excel-based process.

---

## TECH STACK
- React.js + Tailwind CSS
- React Router (for navigation between pages)
- Recharts (for dashboard charts)
- html5-qrcode (for QR scan simulation)
- qrcode.react (for QR code generation)
- lucide-react (for icons)
- All data should use dummy/mock data (no backend, no API calls)

---

## DESIGN DIRECTION
- Clean, modern, **industrial/professional** aesthetic — suitable for a large manufacturing company
- Color scheme: **Dark navy sidebar** (#1e2a3b) with **white main content area**, accent color **orange** (#f97316) for primary actions
- Typography: Use **'Plus Jakarta Sans'** from Google Fonts
- Responsive: works on both desktop and mobile (HP)
- Language: **Bahasa Indonesia** for all UI text/labels
- Feel: Professional enterprise software, not generic admin template

---

## PAGES TO BUILD (use React Router)

### 1. LOGIN PAGE (`/login`)
- Logo placeholder "🏭 TeL Gudang" top center
- Form: Username + Password input
- Button: "Masuk" (login)
- Subtitle: "Sistem Manajemen Gudang — PT Tanjungenim Lestari"
- After click login → redirect to Dashboard

---

### 2. DASHBOARD (`/dashboard`)
**Header:** 
- Greeting "Selamat Datang, [Nama User]"
- Current date & time

**Stats Cards (top row, 4 cards):**
- Total Item: 532 item
- Stok Menipis: 24 item (red/warning color)
- Transaksi Hari Ini: 12
- Total Kategori: 6

**Chart 1 — Bar Chart:**
- Title: "Transaksi Barang Masuk & Keluar (7 Hari Terakhir)"
- Show IN (green) vs OUT (orange) bars per day
- Use dummy data for 7 days

**Chart 2 — Pie/Donut Chart:**
- Title: "Distribusi Stok per Kategori"
- Categories: Civil Material, Electrical Material, Mechanical Material, Furniture Material, Consumables, GH Consumable
- Show percentage each

**Table — Stok Menipis (bottom):**
- Title: "⚠️ Barang Stok Menipis" 
- Columns: TS Code, Nama Barang, Kategori, Stok Saat Ini, Safety Stok, Status
- Show 5 rows dummy data with red badge "Habis" or yellow badge "Menipis"
- Items below safety stock highlighted in red/yellow

---

### 3. MASTER BARANG (`/barang`)
**Header:** "Master Data Barang" + button "➕ Tambah Barang Baru"

**Filter/Search bar:**
- Search input: "Cari nama barang atau TS Code..."
- Dropdown filter: Semua Kategori | Civil | Electrical | Mechanical | Furniture | Consumables | GH Consumable
- Dropdown filter: Semua Status | Stok Normal | Stok Menipis | Stok Habis

**Data Table:**
Columns: TS Code | Nama Barang | Kategori | BIN LOC | UOM | Stok | Safety Stok | Status | Aksi

Use this dummy data (at least 15 rows):
```
TS-001 | ACOUSTIC PANEL AURATONE SIZE 600x1200x15MM | Civil | TS-D.10 | BOX | 40 | 5 | Normal
TS-003 | ADHESIVE CYANDACRYLATE AIBON GLUE 700GR | Consumables | TS-D.10 | CANS | 26 | 5 | Normal
TS-005 | AIR CONDITIONER NON INVERTER 1.5PK CS-YN12TKJ | Mechanical | TS-CONT.E | UNIT | 5 | 5 | Menipis
TS-006 | AIR CONDITIONER NON INVERTER 2PK CS-YN18TKJ | Mechanical | TS-CONT.E | UNIT | 4 | 5 | Menipis
TS-008 | ALAT PEL @LUSIN=12EA | GH Consumable | TS-J.13 | EA | 0 | 2 | Habis
TS-009 | ANCHOR PLASTIC SIZE 10-12 | Consumables | TS-J.17 | EA | 17 | 20 | Menipis
TS-025 | BALLAST LAMP TYPE BHL 80L 80W 220V 50Hz | Electrical | TS-L.23 | EA | 34 | 5 | Normal
TS-044 | BATTERY NON RECHARGEABLE TYPE AAA 1.5V | Consumables | TS-F.13 | EA | 99 | 10 | Normal
TS-047 | BAYGON | GH Consumable | TS-J.13 | CANS | 0 | 5 | Habis
TS-059 | BED MDL MESSARIA SIZE 120x200CM WOOD | Furniture | TS-FURNITURE.D | SET | 7 | 5 | Normal
TS-063 | BED SINGLE TYPE SHUMO FRAME IRON 100x200CM | Furniture | - | UNIT | 58 | 2 | Normal
TS-084 | BRICK STONE SIZE 100x100x200MM | Civil | TS-GD.SAND | EA | 4180 | 100 | Normal
TS-096 | BULB LED P-RTG 19W COOL DAYLIGHT | Electrical | TS-A.02 | EA | 110 | 30 | Normal
TS-098 | BULB LED P-RTG 8W WHITE 6500K | Electrical | TS-A.02 | EA | 285 | 20 | Normal
TS-099 | BULB TL-LED ECOFIT TUBE 16W 120CM | Electrical | TS-L.29 | EA | 0 | 20 | Habis
```

**Status badge colors:**
- Normal → green badge
- Menipis → yellow/orange badge  
- Habis → red badge

**Aksi buttons per row:** 👁️ Detail | ✏️ Edit | 🏷️ QR Code

**Modal — Detail Barang** (when clicking Detail):
Show full info: TS Code, MS Code, Nama Lengkap, Kategori, BIN LOC, UOM, Stok, Safety Stok, Status, Histori Transaksi terakhir (3 rows dummy)

**Modal — Generate QR Code** (when clicking QR Code button):
- Show QR Code generated from TS Code using qrcode.react
- Info barang di bawah QR: TS Code, Nama, Lokasi, Stok
- Button: "🖨️ Cetak Label"
- QR should actually render (use qrcode.react library)

---

### 4. BARANG MASUK (`/barang-masuk`)
**Header:** "📥 Penerimaan Barang Masuk"

**Two ways to input — Tab switcher:**

**Tab 1: "🔍 Cari Manual"**
- Search autocomplete input: "Cari TS Code atau nama barang..."
- When item selected, show form:
  - Nama Barang (auto-filled, disabled)
  - TS Code (auto-filled, disabled)  
  - Kategori (auto-filled, disabled)
  - Stok Saat Ini (auto-filled, disabled)
  - Jumlah Masuk* (number input)
  - Kondisi Barang* (dropdown: Baik Baru / Baik Bekas / Rusak)
  - Tanggal Terima* (date picker, default today)
  - No. PO / Referensi (text input)
  - Keterangan (textarea)
  - Button: "💾 Simpan Penerimaan"

**Tab 2: "📷 Scan QR Code"**
- Big scan area / camera placeholder with dashed border
- Text: "Arahkan kamera ke QR Code barang"
- Button: "📷 Aktifkan Kamera" 
- Below: show last 3 scanned items as quick history
- After scan → auto fill form same as Tab 1

**Table Riwayat Barang Masuk (bottom of page):**
- Title: "Riwayat Penerimaan Hari Ini"
- Columns: Waktu | TS Code | Nama Barang | Jumlah | Kondisi | No. PO | Petugas
- Show 5 dummy rows

---

### 5. BARANG KELUAR (`/barang-keluar`)
**Header:** "📤 Pengeluaran Barang"

**Two ways — Tab switcher same as Barang Masuk:**

**Tab 1: "🔍 Cari Manual"**
Form fields:
- Nama Barang (search & select)
- TS Code (auto-filled)
- Stok Tersedia (auto-filled, shows current stock)
- Jumlah Keluar* (number input, max = stok tersedia)
- Tujuan / Peminjam* (text input: nama orang/divisi/no rumah)
- Keperluan* (dropdown: Perbaikan / Penggantian / Proyek Baru / Peminjaman / Lainnya)
- Tanggal Keluar* (date, default today)
- Keterangan (textarea)
- Button: "💾 Simpan Pengeluaran"

**Tab 2: "📷 Scan QR Code"**
- Same scan UI as Barang Masuk tab
- After scan → auto fill form

**Table Riwayat Pengeluaran Hari Ini (bottom):**
- Columns: Waktu | TS Code | Nama Barang | Jumlah | Tujuan | Keperluan | Petugas

---

### 6. LAPORAN (`/laporan`)
**Header:** "📊 Laporan & Rekap"

**Filter bar:**
- Date range picker: Dari tanggal — Sampai tanggal
- Dropdown: Semua Jenis | Barang Masuk | Barang Keluar
- Dropdown: Semua Kategori | (list kategori)
- Button: "🔍 Tampilkan" | "📥 Export Excel" | "📄 Export PDF"

**Summary cards (4 cards):**
- Total Masuk periode ini
- Total Keluar periode ini
- Item Paling Sering Keluar
- Nilai Transaksi periode ini

**Chart — Line chart:**
- Tren IN vs OUT per hari dalam periode

**Detail Table:**
- Columns: Tanggal | TS Code | Nama Barang | Jenis (IN/OUT) | Jumlah | UOM | Tujuan/Sumber | Petugas
- Show 10 dummy rows
- IN rows: green left border
- OUT rows: orange left border
- Pagination: show 10 per page

---

### 7. MANAJEMEN USER (`/users`) — Admin only
**Header:** "👥 Manajemen Pengguna" + button "➕ Tambah User"

**Table:**
- Columns: Nama | Username | Role | Status | Terakhir Login | Aksi
- Roles: Admin (red badge) | Staff Gudang (blue badge)
- Status: Aktif (green) | Nonaktif (gray)
- Aksi: Edit | Nonaktifkan

**Modal Tambah/Edit User:**
- Nama Lengkap
- Username
- Password
- Role (Admin / Staff Gudang)
- Status (Aktif / Nonaktif)

---

### 8. SIDEBAR / NAVIGATION
Fixed left sidebar (desktop) / bottom nav or hamburger (mobile):

Menu items:
- 🏠 Dashboard
- 📦 Master Barang
- 📥 Barang Masuk
- 📤 Barang Keluar
- 📊 Laporan
- 👥 Manajemen User (only show if role = Admin)
- ⚙️ Pengaturan

Bottom of sidebar:
- Avatar + Nama User + Role
- 🚪 Keluar (logout)

Active menu item highlighted with orange accent.

---

## DUMMY DATA & STATE

Use React useState for:
- Current logged in user: `{ nama: "Budi Santoso", role: "Admin" }`
- Items list (use the data above)
- Transactions list (dummy IN/OUT history)

Simulate interactions:
- Login form → redirect to dashboard
- Search filtering on Master Barang table actually works
- Status badges update based on stok vs safety_stok comparison
- QR Code modal actually renders QR using qrcode.react
- Charts show real dummy data using Recharts

---

## ADDITIONAL DETAILS

- Show **toast notification** after saving (success/error)
- Loading skeleton on tables
- Empty state illustration when no data found after filter
- Confirm dialog before any delete action
- Mobile responsive — sidebar collapses to hamburger on small screen
- Smooth page transitions between routes
- Highlight rows in red if stok = 0, yellow if stok <= safety_stok

---

Build all pages completely. Make it look like a real production system, not a wireframe. Use proper spacing, shadows, and professional styling throughout.
