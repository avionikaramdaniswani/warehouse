import { Router } from "express";
import { db } from "@workspace/db";
import { transaksiMasukTable, itemsTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
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

async function generateNomor(): Promise<string> {
  const year = new Date().getFullYear();
  const [{ value }] = await db.select({ value: count() }).from(transaksiMasukTable);
  const seq = String(Number(value) + 1).padStart(5, "0");
  return `TRIN-${year}-${seq}`;
}

const createSchema = z.object({
  tsCode: z.string().min(1),
  jumlah: z.number().int().positive("Jumlah harus lebih dari 0"),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  noPo: z.string().optional(),
  keterangan: z.string().optional(),
});

router.get("/transaksi-masuk", authenticate, async (req, res) => {
  const { search, tanggal, tsCode: tsCodeFilter } = req.query as Record<string, string>;

  const rows = await db
    .select({
      id: transaksiMasukTable.id,
      nomor: transaksiMasukTable.nomor,
      jumlah: transaksiMasukTable.jumlah,
      tanggal: transaksiMasukTable.tanggal,
      noPo: transaksiMasukTable.noPo,
      keterangan: transaksiMasukTable.keterangan,
      createdAt: transaksiMasukTable.createdAt,
      tsCode: itemsTable.tsCode,
      msCode: itemsTable.msCode,
      namaBarang: itemsTable.nama,
      kategori: itemsTable.kategori,
      uom: itemsTable.uom,
      binLoc: itemsTable.binLoc,
      petugas: usersTable.namaLengkap,
    })
    .from(transaksiMasukTable)
    .innerJoin(itemsTable, eq(transaksiMasukTable.itemId, itemsTable.id))
    .innerJoin(usersTable, eq(transaksiMasukTable.userId, usersTable.id))
    .orderBy(desc(transaksiMasukTable.createdAt));

  type Row = typeof rows[number];
  let result: Row[] = rows;
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (r: Row) =>
        r.namaBarang.toLowerCase().includes(q) ||
        r.tsCode.toLowerCase().includes(q) ||
        (r.noPo ?? "").toLowerCase().includes(q)
    );
  }
  if (tsCodeFilter) {
    result = result.filter((r: Row) => r.tsCode === tsCodeFilter);
  }
  if (tanggal) {
    result = result.filter((r: Row) => r.tanggal === tanggal);
  }

  res.json(result);
});

router.post("/transaksi-masuk", authenticate, authorize("admin", "operator"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const { tsCode, jumlah, tanggal, noPo, keterangan } = parsed.data;

  const [item] = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.tsCode, tsCode), eq(itemsTable.isActive, true)))
    .limit(1);
  if (!item) {
    res.status(404).json({ message: "Barang tidak ditemukan" });
    return;
  }

  const newStok = item.stok + jumlah;
  const nomor = await generateNomor();

  await db
    .update(itemsTable)
    .set({ stok: newStok, status: computeStatus(newStok, item.safetyStok), updatedAt: new Date() })
    .where(eq(itemsTable.id, item.id));

  const [trx] = await db
    .insert(transaksiMasukTable)
    .values({
      nomor,
      itemId: item.id,
      userId: req.user!.userId,
      jumlah,
      tanggal,
      noPo: noPo || null,
      keterangan: keterangan || null,
    })
    .returning();

  await logActivity(req.user!.userId, "BARANG_MASUK", `${nomor}: ${item.tsCode} +${jumlah}`, req);
  res.status(201).json({ ...trx, tsCode: item.tsCode, namaBarang: item.nama, stokBaru: newStok });
});

export default router;
