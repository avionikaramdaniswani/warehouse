import { Router } from "express";
import { db } from "@workspace/db";
import { transaksiMasukTable, transaksiKeluarTable, itemsTable } from "@workspace/db/schema";
import { eq, gte, count, sum } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

router.get("/dashboard/stats", authenticate, async (_req, res) => {
  const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 6);
  const fromStr = fromDate.toISOString().split("T")[0];

  const [masukRows, keluarRows, pieRows] = await Promise.all([
    db
      .select({ tanggal: transaksiMasukTable.tanggal, total: count() })
      .from(transaksiMasukTable)
      .where(gte(transaksiMasukTable.tanggal, fromStr))
      .groupBy(transaksiMasukTable.tanggal),

    db
      .select({ tanggal: transaksiKeluarTable.tanggal, total: count() })
      .from(transaksiKeluarTable)
      .where(gte(transaksiKeluarTable.tanggal, fromStr))
      .groupBy(transaksiKeluarTable.tanggal),

    db
      .select({ kategori: itemsTable.kategori, totalStok: sum(itemsTable.stok) })
      .from(itemsTable)
      .where(eq(itemsTable.isActive, true))
      .groupBy(itemsTable.kategori),
  ]);

  const barData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const masuk = Number(masukRows.find((r) => r.tanggal === dateStr)?.total ?? 0);
    const keluar = Number(keluarRows.find((r) => r.tanggal === dateStr)?.total ?? 0);
    barData.push({ day: DAY_NAMES[d.getDay()], tanggal: dateStr, masuk, keluar });
  }

  const pieData = pieRows
    .filter((r) => Number(r.totalStok) > 0)
    .map((r) => ({ name: r.kategori, value: Number(r.totalStok) }));

  res.json({ barData, pieData });
});

export default router;
