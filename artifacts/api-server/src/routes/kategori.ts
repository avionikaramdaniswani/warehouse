import { Router } from "express";
import { db } from "@workspace/db";
import { kategorisTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const createSchema = z.object({
  nama: z.string().min(1, "Nama kategori tidak boleh kosong").max(100),
  keterangan: z.string().optional(),
});

const updateSchema = createSchema.partial();

router.get("/kategoris", authenticate, async (_req, res) => {
  const rows = await db
    .select()
    .from(kategorisTable)
    .where(eq(kategorisTable.isActive, true))
    .orderBy(asc(kategorisTable.nama));
  res.json(rows);
});

router.get("/kategoris/all", authenticate, authorize("admin"), async (_req, res) => {
  const rows = await db
    .select()
    .from(kategorisTable)
    .orderBy(asc(kategorisTable.nama));
  res.json(rows);
});

router.post("/kategoris", authenticate, authorize("admin"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const existing = await db
    .select()
    .from(kategorisTable)
    .where(eq(kategorisTable.nama, parsed.data.nama))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ message: "Nama kategori sudah ada" });
    return;
  }

  const [row] = await db
    .insert(kategorisTable)
    .values({
      nama: parsed.data.nama,
      keterangan: parsed.data.keterangan ?? null,
    })
    .returning();

  await logActivity(req.user!.userId, "CREATE_KATEGORI", `Tambah kategori: ${row.nama}`, req);
  res.status(201).json(row);
});

router.put("/kategoris/:id", authenticate, authorize("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: "ID tidak valid" });
    return;
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const [existing] = await db
    .select()
    .from(kategorisTable)
    .where(eq(kategorisTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ message: "Kategori tidak ditemukan" });
    return;
  }

  if (parsed.data.nama && parsed.data.nama !== existing.nama) {
    const dup = await db
      .select()
      .from(kategorisTable)
      .where(eq(kategorisTable.nama, parsed.data.nama))
      .limit(1);
    if (dup.length > 0) {
      res.status(409).json({ message: "Nama kategori sudah ada" });
      return;
    }
  }

  const [updated] = await db
    .update(kategorisTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(kategorisTable.id, id))
    .returning();

  await logActivity(req.user!.userId, "UPDATE_KATEGORI", `Edit kategori: ${updated.nama}`, req);
  res.json(updated);
});

router.delete("/kategoris/:id", authenticate, authorize("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: "ID tidak valid" });
    return;
  }

  const [existing] = await db
    .select()
    .from(kategorisTable)
    .where(eq(kategorisTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ message: "Kategori tidak ditemukan" });
    return;
  }

  await db
    .update(kategorisTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(kategorisTable.id, id));

  await logActivity(req.user!.userId, "DELETE_KATEGORI", `Nonaktifkan kategori: ${existing.nama}`, req);
  res.json({ message: "Kategori berhasil dihapus" });
});

export default router;
