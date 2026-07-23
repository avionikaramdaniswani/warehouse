import { Router } from "express";
import { db } from "@workspace/db";
import { kategoriTable } from "@workspace/db/schema";
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

router.get("/kategori", authenticate, async (_req, res) => {
  const rows = await db
    .select()
    .from(kategoriTable)
    .where(eq(kategoriTable.isActive, true))
    .orderBy(asc(kategoriTable.nama));
  res.json(rows);
});

router.get("/kategori/all", authenticate, authorize("admin"), async (_req, res) => {
  const rows = await db
    .select()
    .from(kategoriTable)
    .orderBy(asc(kategoriTable.nama));
  res.json(rows);
});

router.post("/kategori", authenticate, authorize("admin"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const existing = await db
    .select()
    .from(kategoriTable)
    .where(eq(kategoriTable.nama, parsed.data.nama))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ message: "Nama kategori sudah ada" });
    return;
  }

  const [row] = await db
    .insert(kategoriTable)
    .values({
      nama: parsed.data.nama,
      keterangan: parsed.data.keterangan ?? null,
    })
    .returning();

  await logActivity(req.user!.userId, "CREATE_KATEGORI", `Tambah kategori: ${row.nama}`, req,
    { id: row.id, nama: row.nama, keterangan: row.keterangan });
  res.status(201).json(row);
});

router.put("/kategori/:id", authenticate, authorize("admin"), async (req, res) => {
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
    .from(kategoriTable)
    .where(eq(kategoriTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ message: "Kategori tidak ditemukan" });
    return;
  }

  if (parsed.data.nama && parsed.data.nama !== existing.nama) {
    const dup = await db
      .select()
      .from(kategoriTable)
      .where(eq(kategoriTable.nama, parsed.data.nama))
      .limit(1);
    if (dup.length > 0) {
      res.status(409).json({ message: "Nama kategori sudah ada" });
      return;
    }
  }

  const [updated] = await db
    .update(kategoriTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(kategoriTable.id, id))
    .returning();

  await logActivity(req.user!.userId, "UPDATE_KATEGORI", `Edit kategori: ${existing.nama} → ${updated.nama}`, req,
    { id, sebelum: { nama: existing.nama, keterangan: existing.keterangan }, sesudah: { nama: updated.nama, keterangan: updated.keterangan } });
  res.json(updated);
});

router.delete("/kategori/:id", authenticate, authorize("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: "ID tidak valid" });
    return;
  }

  const [existing] = await db
    .select()
    .from(kategoriTable)
    .where(eq(kategoriTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ message: "Kategori tidak ditemukan" });
    return;
  }

  await db
    .update(kategoriTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(kategoriTable.id, id));

  await logActivity(req.user!.userId, "DELETE_KATEGORI", `Nonaktifkan kategori: ${existing.nama}`, req,
    { id, nama: existing.nama, keterangan: existing.keterangan });
  res.json({ message: "Kategori berhasil dihapus" });
});

export default router;
