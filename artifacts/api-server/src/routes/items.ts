import { Router } from "express";
import { db } from "@workspace/db";
import { itemsTable } from "@workspace/db/schema";
import { eq, asc, and, inArray, ilike, or, lte, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

function computeStatus(stok: number, safetyStok: number): string {
  if (stok === 0) return "Habis";
  if (stok <= safetyStok) return "Menipis";
  return "Normal";
}

const itemSchema = z.object({
  tsCode: z.string().min(1, "TS Code tidak boleh kosong").max(50),
  msCode: z.string().optional(),
  nama: z.string().min(1, "Nama barang tidak boleh kosong").max(255),
  kategori: z.string().min(1, "Kategori tidak boleh kosong"),
  binLoc: z.string().optional(),
  uom: z.string().min(1).max(20).default("EA"),
  stok: z.number().int().min(0).default(0),
  safetyStok: z.number().int().min(0).default(5),
});

const updateItemSchema = itemSchema.omit({ tsCode: true }).partial();

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
    if (statusQ === "Habis") {
      conditions.push(eq(itemsTable.stok, 0) as ReturnType<typeof eq>);
    } else if (statusQ === "Menipis") {
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

router.post("/items", authenticate, authorize("admin", "operator"), async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const existing = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.tsCode, parsed.data.tsCode))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ message: "TS Code sudah terdaftar" });
    return;
  }

  const { stok, safetyStok } = parsed.data;
  const [row] = await db
    .insert(itemsTable)
    .values({
      tsCode: parsed.data.tsCode,
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

  await logActivity(req.user!.userId, "CREATE_ITEM", `Tambah barang: ${row.tsCode} - ${row.nama}`, req);
  res.status(201).json(row);
});

router.put("/items/:tsCode", authenticate, authorize("admin", "operator"), async (req, res) => {
  const { tsCode } = req.params;

  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const [existing] = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.tsCode, tsCode), eq(itemsTable.isActive, true)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ message: "Barang tidak ditemukan" });
    return;
  }

  const newStok = parsed.data.stok ?? existing.stok;
  const newSafetyStok = parsed.data.safetyStok ?? existing.safetyStok;

  const [updated] = await db
    .update(itemsTable)
    .set({ ...parsed.data, status: computeStatus(newStok, newSafetyStok), updatedAt: new Date() })
    .where(eq(itemsTable.tsCode, tsCode))
    .returning();

  await logActivity(req.user!.userId, "UPDATE_ITEM", `Edit barang: ${updated.tsCode}`, req);
  res.json(updated);
});

router.patch("/items/:tsCode/stok", authenticate, authorize("admin", "operator"), async (req, res) => {
  const { tsCode } = req.params;
  const parsed = z.object({ delta: z.number().int() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "delta harus berupa bilangan bulat" });
    return;
  }

  const [existing] = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.tsCode, tsCode), eq(itemsTable.isActive, true)))
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
    .where(eq(itemsTable.tsCode, tsCode))
    .returning();

  res.json(updated);
});

router.post("/items/import", authenticate, authorize("admin", "operator"), async (req, res) => {
  const rowSchema = z.object({
    tsCode: z.string().min(1).max(50),
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
  const errors: { tsCode: string; reason: string }[] = [];

  // 1. Satu query untuk ambil semua TS Code yang sudah ada
  const allTsCodes = items.map((i) => i.tsCode);
  const existingRows = await db
    .select({ tsCode: itemsTable.tsCode })
    .from(itemsTable)
    .where(inArray(itemsTable.tsCode, allTsCodes));
  const existingSet = new Set(existingRows.map((r) => r.tsCode));

  // 2. Pisahkan item baru vs duplikat
  const newItems = items.filter((i) => !existingSet.has(i.tsCode));
  const skipped = items.length - newItems.length;

  // 3. Satu INSERT bulk untuk semua item baru (dalam chunk 200)
  let inserted = 0;
  const CHUNK = 200;
  for (let i = 0; i < newItems.length; i += CHUNK) {
    const chunk = newItems.slice(i, i + CHUNK);
    try {
      await db.insert(itemsTable).values(
        chunk.map((item) => ({
          tsCode: item.tsCode,
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
      chunk.forEach((item) => errors.push({ tsCode: item.tsCode, reason: "Gagal disimpan" }));
    }
  }

  if (inserted > 0) {
    await logActivity(
      req.user!.userId,
      "IMPORT_ITEMS",
      `Import barang: ${inserted} ditambahkan, ${skipped} dilewati`,
      req
    );
  }

  res.json({ inserted, skipped, errors });
});

router.delete("/items/:tsCode", authenticate, authorize("admin"), async (req, res) => {
  const { tsCode } = req.params;

  const [existing] = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.tsCode, tsCode), eq(itemsTable.isActive, true)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ message: "Barang tidak ditemukan" });
    return;
  }

  await db
    .update(itemsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(itemsTable.tsCode, tsCode));

  await logActivity(req.user!.userId, "DELETE_ITEM", `Hapus barang: ${existing.tsCode} - ${existing.nama}`, req);
  res.json({ message: "Barang berhasil dihapus" });
});

export default router;
