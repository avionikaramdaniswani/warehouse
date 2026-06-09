import { Router } from "express";
import { db } from "@workspace/db";
import { itemsTable } from "@workspace/db/schema";
import { eq, asc, and } from "drizzle-orm";
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

router.get("/items", authenticate, async (_req, res) => {
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
