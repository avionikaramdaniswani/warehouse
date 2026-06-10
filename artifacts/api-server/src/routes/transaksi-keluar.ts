import { Router } from "express";
import { db } from "@workspace/db";
import { transaksiKeluarTable, itemsTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
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

async function generateNomor(): Promise<string> {
  const year = new Date().getFullYear();
  const [{ value }] = await db.select({ value: count() }).from(transaksiKeluarTable);
  const seq = String(Number(value) + 1).padStart(5, "0");
  return `TROUT-${year}-${seq}`;
}

const createSchema = z.object({
  tsCode: z.string().min(1),
  jumlah: z.number().int().positive("Jumlah harus lebih dari 0"),
  keperluan: z.enum(["Perbaikan", "Penggantian", "Proyek Baru", "Peminjaman", "Lainnya"]).default("Perbaikan"),
  tujuan: z.string().optional(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  keterangan: z.string().optional(),
});

router.get("/transaksi-keluar", authenticate, async (req, res) => {
  const { search, keperluan, tanggal } = req.query as Record<string, string>;

  const rows = await db
    .select({
      id: transaksiKeluarTable.id,
      nomor: transaksiKeluarTable.nomor,
      jumlah: transaksiKeluarTable.jumlah,
      keperluan: transaksiKeluarTable.keperluan,
      tujuan: transaksiKeluarTable.tujuan,
      tanggal: transaksiKeluarTable.tanggal,
      keterangan: transaksiKeluarTable.keterangan,
      createdAt: transaksiKeluarTable.createdAt,
      tsCode: itemsTable.tsCode,
      namaBarang: itemsTable.nama,
      petugas: usersTable.namaLengkap,
    })
    .from(transaksiKeluarTable)
    .innerJoin(itemsTable, eq(transaksiKeluarTable.itemId, itemsTable.id))
    .innerJoin(usersTable, eq(transaksiKeluarTable.userId, usersTable.id))
    .orderBy(desc(transaksiKeluarTable.createdAt));

  type Row = typeof rows[number];
  let result: Row[] = rows;
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (r: Row) =>
        r.namaBarang.toLowerCase().includes(q) ||
        r.tsCode.toLowerCase().includes(q) ||
        (r.tujuan ?? "").toLowerCase().includes(q)
    );
  }
  if (keperluan && keperluan !== "Semua") {
    result = result.filter((r: Row) => r.keperluan === keperluan);
  }
  if (tanggal) {
    result = result.filter((r: Row) => r.tanggal === tanggal);
  }

  res.json(result);
});

router.post("/transaksi-keluar", authenticate, authorize("admin", "operator"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const { tsCode, jumlah, keperluan, tujuan, tanggal, keterangan } = parsed.data;

  const [item] = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.tsCode, tsCode), eq(itemsTable.isActive, true)))
    .limit(1);
  if (!item) {
    res.status(404).json({ message: "Barang tidak ditemukan" });
    return;
  }

  if (item.stok < jumlah) {
    res.status(400).json({ message: `Stok tidak mencukupi. Tersedia: ${item.stok} ${item.uom}` });
    return;
  }

  const newStok = item.stok - jumlah;
  const nomor = await generateNomor();

  await db
    .update(itemsTable)
    .set({ stok: newStok, status: computeStatus(newStok, item.safetyStok), updatedAt: new Date() })
    .where(eq(itemsTable.id, item.id));

  const [trx] = await db
    .insert(transaksiKeluarTable)
    .values({
      nomor,
      itemId: item.id,
      userId: req.user!.userId,
      jumlah,
      keperluan,
      tujuan: tujuan || null,
      tanggal,
      keterangan: keterangan || null,
    })
    .returning();

  await logActivity(req.user!.userId, "BARANG_KELUAR", `${nomor}: ${item.tsCode} -${jumlah}`, req);
  res.status(201).json({ ...trx, tsCode: item.tsCode, namaBarang: item.nama, stokBaru: newStok });
});

export default router;
