import { Router } from "express";
import { db } from "@workspace/db";
import { itemsTable } from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";

const router = Router();

function computeStatus(stok: number, safetyStok: number): string {
  if (stok === 0) return "Habis";
  if (stok <= safetyStok) return "Menipis";
  return "Normal";
}

router.get("/bin/:binLoc", async (req, res) => {
  const binLoc = decodeURIComponent(req.params.binLoc);
  const rows = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.binLoc, binLoc), eq(itemsTable.isActive, true)))
    .orderBy(asc(itemsTable.nama));

  const items = rows.map((r) => ({
    tsCode: r.tsCode,
    msCode: r.msCode,
    nama: r.nama,
    kategori: r.kategori,
    binLoc: r.binLoc,
    uom: r.uom,
    stok: r.stok,
    safetyStok: r.safetyStok,
    status: computeStatus(r.stok, r.safetyStok),
  }));

  res.json({ binLoc, items });
});

export default router;
