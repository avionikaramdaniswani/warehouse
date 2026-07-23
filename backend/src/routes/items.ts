import { Router } from "express";
import { db } from "@workspace/db";
import { itemsTable, transaksiMasukTable, transaksiKeluarTable, usersTable } from "@workspace/db/schema";
import { eq, asc, and, inArray, ilike, or, lte, gt, sql, desc } from "drizzle-orm";
import { z } from "zod";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

function computeStatus(stok: number, safetyStok: number): string {
  if (stok === 0) return "Critical";
  if (stok <= safetyStok) return "Warning";
  return "Normal";
}

const itemSchema = z.object({
  itemCode: z.string().min(1, "Item Code tidak boleh kosong").max(50),
  tsCode: z.string().optional(),
  msCode: z.string().optional(),
  nama: z.string().min(1, "Nama barang tidak boleh kosong").max(255),
  kategori: z.string().min(1, "Kategori tidak boleh kosong"),
  binLoc: z.string().optional(),
  uom: z.string().min(1).max(20).default("EA"),
  stok: z.number().int().min(0).default(0),
  safetyStok: z.number().int().min(0).default(5),
});

const updateItemSchema = itemSchema.omit({ itemCode: true }).partial();

router.get("/items", authenticate, async (req, res) => {
  const pageParam = req.query.page as string | undefined;

  // — Paginated mode (saat page param ada) —
  if (pageParam !== undefined) {
    const page = Math.max(1, parseInt(pageParam) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));
    const search = ((req.query.search as string) ?? "").trim();
    const kategori = (req.query.kategori as string) ?? "";
    const statusQ = (req.query.status as string) ?? "";

    const conditions: ReturnType<typeof eq>[] = [eq(itemsTable.isActive, true) as ReturnType<typeof eq>];
    if (search) {
      conditions.push(
        or(
          ilike(itemsTable.nama, `%${search}%`),
          ilike(itemsTable.itemCode, `%${search}%`),
          ilike(itemsTable.tsCode, `%${search}%`),
          ilike(itemsTable.msCode, `%${search}%`),
          ilike(itemsTable.binLoc, `%${search}%`),
          ilike(itemsTable.kategori, `%${search}%`)
        ) as ReturnType<typeof eq>
      );
    }
    if (kategori && kategori !== "Semua") {
      conditions.push(eq(itemsTable.kategori, kategori) as ReturnType<typeof eq>);
    }
    if (statusQ === "Critical") {
      conditions.push(eq(itemsTable.stok, 0) as ReturnType<typeof eq>);
    } else if (statusQ === "Warning") {
      conditions.push(and(gt(itemsTable.stok, 0), lte(itemsTable.stok, itemsTable.safetyStok)) as ReturnType<typeof eq>);
    } else if (statusQ === "Normal") {
      conditions.push(gt(itemsTable.stok, itemsTable.safetyStok) as ReturnType<typeof eq>);
    }

    const where = and(...conditions);
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(itemsTable)
      .where(where);

    const rows = await db
      .select()
      .from(itemsTable)
      .where(where)
      .orderBy(asc(itemsTable.nama))
      .limit(limit)
      .offset((page - 1) * limit);

    const data = rows.map((r) => ({ ...r, status: computeStatus(r.stok, r.safetyStok) }));
    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
    return;
  }

  // — Full list mode (backward-compat untuk AppContext) —
  const rows = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.isActive, true))
    .orderBy(asc(itemsTable.nama));
  const normalized = rows.map((r) => ({ ...r, status: computeStatus(r.stok, r.safetyStok) }));
  res.json(normalized);
});

router.post("/items", authenticate, authorize("admin", "kepala_gudang"), async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const existingCode = await db
    .select()
    .from(itemsTable)
    .where(sql`lower(${itemsTable.itemCode}) = lower(${parsed.data.itemCode})`)
    .limit(1);
  if (existingCode.length > 0) {
    res.status(409).json({ message: "Item Code sudah terdaftar" });
    return;
  }

  if (parsed.data.tsCode) {
    const existingTs = await db
      .select()
      .from(itemsTable)
      .where(sql`lower(${itemsTable.tsCode}) = lower(${parsed.data.tsCode})`)
      .limit(1);
    if (existingTs.length > 0) {
      res.status(409).json({ message: "TS Code sudah terdaftar" });
      return;
    }
  }

  if (parsed.data.msCode) {
    const existingMs = await db
      .select()
      .from(itemsTable)
      .where(sql`lower(${itemsTable.msCode}) = lower(${parsed.data.msCode})`)
      .limit(1);
    if (existingMs.length > 0) {
      res.status(409).json({ message: "MS Code sudah terdaftar" });
      return;
    }
  }

  const { stok, safetyStok } = parsed.data;
  const [row] = await db
    .insert(itemsTable)
    .values({
      itemCode: parsed.data.itemCode,
      tsCode: parsed.data.tsCode ?? null,
      msCode: parsed.data.msCode ?? null,
      nama: parsed.data.nama,
      kategori: parsed.data.kategori,
      binLoc: parsed.data.binLoc ?? null,
      uom: parsed.data.uom,
      stok,
      safetyStok,
      status: computeStatus(stok, safetyStok),
    })
    .returning();

  await logActivity(req.user!.userId, "CREATE_ITEM", `Tambah barang: ${row.itemCode} - ${row.nama}`, req, {
    itemCode: row.itemCode, tsCode: row.tsCode, msCode: row.msCode,
    nama: row.nama, kategori: row.kategori, binLoc: row.binLoc,
    uom: row.uom, stok: row.stok, safetyStok: row.safetyStok,
  });
  res.status(201).json(row);
});

router.put("/items/:itemCode", authenticate, authorize("admin", "kepala_gudang"), async (req, res) => {
  const itemCode = req.params.itemCode as string;

  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const [existing] = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.itemCode, itemCode), eq(itemsTable.isActive, true)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ message: "Barang tidak ditemukan" });
    return;
  }

  if (parsed.data.tsCode) {
    const existingTs = await db
      .select()
      .from(itemsTable)
      .where(
        and(
          sql`lower(${itemsTable.tsCode}) = lower(${parsed.data.tsCode})`,
          sql`lower(${itemsTable.itemCode}) != lower(${itemCode})`
        )
      )
      .limit(1);
    if (existingTs.length > 0) {
      res.status(409).json({ message: "TS Code sudah dipakai barang lain" });
      return;
    }
  }

  if (parsed.data.msCode) {
    const existingMs = await db
      .select()
      .from(itemsTable)
      .where(
        and(
          sql`lower(${itemsTable.msCode}) = lower(${parsed.data.msCode})`,
          sql`lower(${itemsTable.itemCode}) != lower(${itemCode})`
        )
      )
      .limit(1);
    if (existingMs.length > 0) {
      res.status(409).json({ message: "MS Code sudah dipakai barang lain" });
      return;
    }
  }

  const newStok = parsed.data.stok ?? existing.stok;
  const newSafetyStok = parsed.data.safetyStok ?? existing.safetyStok;

  const [updated] = await db
    .update(itemsTable)
    .set({ ...parsed.data, status: computeStatus(newStok, newSafetyStok), updatedAt: new Date() })
    .where(eq(itemsTable.itemCode, itemCode))
    .returning();

  // Hitung field apa saja yang berubah
  const changedFields: Record<string, { sebelum: unknown; sesudah: unknown }> = {};
  const watchFields = ["nama","kategori","binLoc","uom","stok","safetyStok","tsCode","msCode"] as const;
  for (const f of watchFields) {
    const before = existing[f] ?? null;
    const after = (updated as Record<string, unknown>)[f] ?? null;
    if (String(before) !== String(after)) changedFields[f] = { sebelum: before, sesudah: after };
  }
  await logActivity(req.user!.userId, "UPDATE_ITEM", `Edit barang: ${updated.itemCode} - ${updated.nama}`, req, {
    itemCode: updated.itemCode, nama: updated.nama, perubahanField: changedFields,
  });
  res.json(updated);
});

router.patch("/items/:itemCode/stok", authenticate, authorize("admin", "kepala_gudang"), async (req, res) => {
  const itemCode = req.params.itemCode as string;
  const parsed = z.object({ delta: z.number().int() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "delta harus berupa bilangan bulat" });
    return;
  }

  const [existing] = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.itemCode, itemCode), eq(itemsTable.isActive, true)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ message: "Barang tidak ditemukan" });
    return;
  }

  const newStok = existing.stok + parsed.data.delta;
  if (newStok < 0) {
    res.status(400).json({ message: `Stok tidak mencukupi. Tersedia: ${existing.stok}` });
    return;
  }

  const [updated] = await db
    .update(itemsTable)
    .set({ stok: newStok, status: computeStatus(newStok, existing.safetyStok), updatedAt: new Date() })
    .where(eq(itemsTable.itemCode, itemCode))
    .returning();

  await logActivity(req.user!.userId, "UPDATE_STOK", `Update stok manual: ${existing.itemCode} - ${existing.nama} (${existing.stok > newStok ? '-' : '+'}${Math.abs(parsed.data.delta)})`, req, {
    itemCode: existing.itemCode, nama: existing.nama, uom: existing.uom,
    stokSebelum: existing.stok, stokSesudah: newStok, delta: parsed.data.delta,
  });
  res.json(updated);
});

router.post("/items/diff", authenticate, authorize("admin", "kepala_gudang"), async (req, res) => {
  const rowSchema = z.object({
    itemCode: z.string().min(1).max(50),
    tsCode: z.string().optional(),
    msCode: z.string().optional(),
    nama: z.string().min(1).max(255),
    kategori: z.string().min(1),
    binLoc: z.string().optional(),
    uom: z.string().min(1).max(20).default("EA"),
    stok: z.number().int().min(0).default(0),
    safetyStok: z.number().int().min(0).default(5),
  });

  const bodySchema = z.object({ items: z.array(rowSchema).min(1).max(1000) });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const { items } = parsed.data;
  const allItemCodes = items.map((i) => i.itemCode);

  const existingRows = await db
    .select({
      itemCode: itemsTable.itemCode,
      tsCode: itemsTable.tsCode,
      msCode: itemsTable.msCode,
      nama: itemsTable.nama,
      kategori: itemsTable.kategori,
      binLoc: itemsTable.binLoc,
      uom: itemsTable.uom,
      stok: itemsTable.stok,
      safetyStok: itemsTable.safetyStok,
    })
    .from(itemsTable)
    .where(inArray(itemsTable.itemCode, allItemCodes));

  const existingMap = new Map(existingRows.map((r) => [r.itemCode, r]));

  const FIELD_LABELS: Record<string, string> = {
    nama: "Nama", kategori: "Kategori", uom: "UOM",
    stok: "Stok", safetyStok: "Safety Stok", tsCode: "TS Code", msCode: "MS Code", binLoc: "BIN LOC",
  };

  const result = items.map((item) => {
    const existing = existingMap.get(item.itemCode);
    if (!existing) return { itemCode: item.itemCode, status: "new" as const, changedFields: [] };

    const changedFields: string[] = [];
    if (item.nama !== existing.nama) changedFields.push(FIELD_LABELS.nama);
    if (item.kategori !== existing.kategori) changedFields.push(FIELD_LABELS.kategori);
    if (item.uom !== existing.uom) changedFields.push(FIELD_LABELS.uom);
    if (item.stok !== existing.stok) changedFields.push(FIELD_LABELS.stok);
    if (item.safetyStok !== existing.safetyStok) changedFields.push(FIELD_LABELS.safetyStok);
    if (item.tsCode != null && item.tsCode !== (existing.tsCode ?? "")) changedFields.push(FIELD_LABELS.tsCode);
    if (item.msCode != null && item.msCode !== (existing.msCode ?? "")) changedFields.push(FIELD_LABELS.msCode);
    if (item.binLoc != null && item.binLoc !== (existing.binLoc ?? "")) changedFields.push(FIELD_LABELS.binLoc);

    return {
      itemCode: item.itemCode,
      status: changedFields.length > 0 ? ("updated" as const) : ("unchanged" as const),
      changedFields,
    };
  });

  res.json({ diff: result });
});

router.post("/items/import", authenticate, authorize("admin", "kepala_gudang"), async (req, res) => {
  const rowSchema = z.object({
    itemCode: z.string().min(1).max(50),
    tsCode: z.string().optional(),
    msCode: z.string().optional(),
    nama: z.string().min(1).max(255),
    kategori: z.string().min(1),
    binLoc: z.string().optional(),
    uom: z.string().min(1).max(20).default("EA"),
    stok: z.number().int().min(0).default(0),
    safetyStok: z.number().int().min(0).default(5),
  });

  const bodySchema = z.object({ items: z.array(rowSchema).min(1).max(1000) });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const { items } = parsed.data;
  const errors: { itemCode: string; reason: string }[] = [];

  // 1. Ambil semua field item yang sudah ada di DB untuk perbandingan lengkap
  const allItemCodes = items.map((i) => i.itemCode);
  const existingRows = await db
    .select({
      itemCode: itemsTable.itemCode,
      tsCode: itemsTable.tsCode,
      msCode: itemsTable.msCode,
      nama: itemsTable.nama,
      kategori: itemsTable.kategori,
      binLoc: itemsTable.binLoc,
      uom: itemsTable.uom,
      stok: itemsTable.stok,
      safetyStok: itemsTable.safetyStok,
    })
    .from(itemsTable)
    .where(inArray(itemsTable.itemCode, allItemCodes));
  const existingMap = new Map(existingRows.map((r) => [r.itemCode, r]));

  // 2. Pisahkan item baru vs yang sudah ada
  const newItems = items.filter((i) => !existingMap.has(i.itemCode));
  const existingItems = items.filter((i) => existingMap.has(i.itemCode));

  // 3. Smart diff: hanya update jika ada field yang benar-benar berubah
  //    Field optional kosong di Excel → pertahankan nilai di DB (tidak dianggap perubahan)
  function hasChanged(incoming: typeof items[0], existing: typeof existingRows[0]): boolean {
    return (
      incoming.nama !== existing.nama ||
      incoming.kategori !== existing.kategori ||
      incoming.uom !== existing.uom ||
      incoming.stok !== existing.stok ||
      incoming.safetyStok !== existing.safetyStok ||
      (incoming.tsCode != null && incoming.tsCode !== (existing.tsCode ?? "")) ||
      (incoming.msCode != null && incoming.msCode !== (existing.msCode ?? "")) ||
      (incoming.binLoc != null && incoming.binLoc !== (existing.binLoc ?? ""))
    );
  }

  const itemsToUpdate = existingItems.filter((i) => hasChanged(i, existingMap.get(i.itemCode)!));
  const unchanged = existingItems.length - itemsToUpdate.length;

  const CHUNK = 200;
  let inserted = 0;
  let updated = 0;

  // 4. INSERT bulk untuk item baru
  for (let i = 0; i < newItems.length; i += CHUNK) {
    const chunk = newItems.slice(i, i + CHUNK);
    try {
      await db.insert(itemsTable).values(
        chunk.map((item) => ({
          itemCode: item.itemCode,
          tsCode: item.tsCode ?? null,
          msCode: item.msCode ?? null,
          nama: item.nama,
          kategori: item.kategori,
          binLoc: item.binLoc ?? null,
          uom: item.uom,
          stok: item.stok,
          safetyStok: item.safetyStok,
          status: computeStatus(item.stok, item.safetyStok),
        }))
      );
      inserted += chunk.length;
    } catch {
      chunk.forEach((item) => errors.push({ itemCode: item.itemCode, reason: "Gagal disimpan" }));
    }
  }

  // 5. UPDATE hanya item yang benar-benar berubah
  for (const item of itemsToUpdate) {
    try {
      await db
        .update(itemsTable)
        .set({
          nama: item.nama,
          kategori: item.kategori,
          uom: item.uom,
          stok: item.stok,
          safetyStok: item.safetyStok,
          status: computeStatus(item.stok, item.safetyStok),
          updatedAt: new Date(),
          ...(item.tsCode ? { tsCode: item.tsCode } : {}),
          ...(item.msCode ? { msCode: item.msCode } : {}),
          ...(item.binLoc ? { binLoc: item.binLoc } : {}),
        })
        .where(eq(itemsTable.itemCode, item.itemCode));
      updated++;
    } catch {
      errors.push({ itemCode: item.itemCode, reason: "Gagal diupdate" });
    }
  }

  if (inserted > 0 || updated > 0) {
    await logActivity(
      req.user!.userId,
      "IMPORT_ITEMS",
      `Import barang: ${inserted} ditambahkan, ${updated} diperbarui, ${unchanged} tidak berubah, ${errors.length} gagal`,
      req,
      { inserted, updated, unchanged, gagal: errors.length, totalDiproses: items.length },
    );
  }

  res.json({ inserted, updated, unchanged, errors });
});

router.delete("/items/:itemCode", authenticate, authorize("admin"), async (req, res) => {
  const itemCode = req.params.itemCode as string;

  const [existing] = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.itemCode, itemCode), eq(itemsTable.isActive, true)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ message: "Barang tidak ditemukan" });
    return;
  }

  await db
    .update(itemsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(itemsTable.itemCode, itemCode));

  await logActivity(req.user!.userId, "DELETE_ITEM", `Hapus barang: ${existing.itemCode} - ${existing.nama}`, req, {
    itemCode: existing.itemCode, nama: existing.nama, kategori: existing.kategori,
    stokTerakhir: existing.stok, uom: existing.uom, binLoc: existing.binLoc,
  });
  res.json({ message: "Barang berhasil dihapus" });
});

router.get("/items/:id/riwayat", authenticate, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID tidak valid" }); return; }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 15));
  const type = (req.query.type as string) || "all";

  const [item] = await db.select({ id: itemsTable.id })
    .from(itemsTable).where(eq(itemsTable.id, id)).limit(1);
  if (!item) { res.status(404).json({ message: "Barang tidak ditemukan" }); return; }

  const combined: Array<{
    id: number; nomor: string; jumlah: number; tanggal: string;
    createdAt: Date; jenis: "Masuk" | "Keluar"; petugas: string;
    keterangan: string | null; noPo: string | null;
    keperluan: string | null; tujuan: string | null;
  }> = [];

  if (type !== "keluar") {
    const masuk = await db.select({
      id: transaksiMasukTable.id,
      nomor: transaksiMasukTable.nomor,
      jumlah: transaksiMasukTable.jumlah,
      tanggal: transaksiMasukTable.tanggal,
      createdAt: transaksiMasukTable.createdAt,
      petugas: usersTable.namaLengkap,
      keterangan: transaksiMasukTable.keterangan,
      noPo: transaksiMasukTable.noPo,
    })
      .from(transaksiMasukTable)
      .innerJoin(usersTable, eq(transaksiMasukTable.userId, usersTable.id))
      .where(eq(transaksiMasukTable.itemId, id));
    combined.push(...masuk.map(r => ({ ...r, jenis: "Masuk" as const, keperluan: null, tujuan: null })));
  }

  if (type !== "masuk") {
    const keluar = await db.select({
      id: transaksiKeluarTable.id,
      nomor: transaksiKeluarTable.nomor,
      jumlah: transaksiKeluarTable.jumlah,
      tanggal: transaksiKeluarTable.tanggal,
      createdAt: transaksiKeluarTable.createdAt,
      petugas: usersTable.namaLengkap,
      keterangan: transaksiKeluarTable.keterangan,
      keperluan: transaksiKeluarTable.keperluan,
      tujuan: transaksiKeluarTable.tujuan,
    })
      .from(transaksiKeluarTable)
      .innerJoin(usersTable, eq(transaksiKeluarTable.userId, usersTable.id))
      .where(eq(transaksiKeluarTable.itemId, id));
    combined.push(...keluar.map(r => ({ ...r, jenis: "Keluar" as const, noPo: null })));
  }

  combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = combined.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const data = combined.slice((page - 1) * limit, page * limit);

  res.json({ data, total, page, limit, totalPages });
});

export default router;
