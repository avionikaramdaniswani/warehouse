import { Router } from "express";
import { db } from "@workspace/db";
import { itemsTable } from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

function computeStatus(stok: number, safetyStok: number): string {
  if (stok === 0) return "Critical";
  if (stok <= safetyStok) return "Warning";
  return "Normal";
}

router.get("/bin/:binLoc", authenticate, async (req, res) => {
  const binLoc = decodeURIComponent(req.params.binLoc as string);
  const rows = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.binLoc, binLoc), eq(itemsTable.isActive, true)))
    .orderBy(asc(itemsTable.nama));

  const items = rows.map((r) => ({
    itemCode: r.itemCode,
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
