import { Router } from "express";
import { db } from "@workspace/db";
import { transaksiMasukTable, transaksiKeluarTable, itemsTable } from "@workspace/db/schema";
import { eq, gte, lte, and, count, sum } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

router.get("/dashboard/stats", authenticate, async (_req, res) => {
  const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);

  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d);
  }

  const fromStr = weekDates[0].toISOString().split("T")[0];
  const toStr = weekDates[6].toISOString().split("T")[0];

  const [masukRows, keluarRows, pieRows] = await Promise.all([
    db
      .select({ tanggal: transaksiMasukTable.tanggal, total: count() })
      .from(transaksiMasukTable)
      .where(and(gte(transaksiMasukTable.tanggal, fromStr), lte(transaksiMasukTable.tanggal, toStr)))
      .groupBy(transaksiMasukTable.tanggal),

    db
      .select({ tanggal: transaksiKeluarTable.tanggal, total: count() })
      .from(transaksiKeluarTable)
      .where(and(gte(transaksiKeluarTable.tanggal, fromStr), lte(transaksiKeluarTable.tanggal, toStr)))
      .groupBy(transaksiKeluarTable.tanggal),

    db
      .select({ kategori: itemsTable.kategori, totalStok: sum(itemsTable.stok) })
      .from(itemsTable)
      .where(eq(itemsTable.isActive, true))
      .groupBy(itemsTable.kategori),
  ]);

  const barData = weekDates.map((d) => {
    const dateStr = d.toISOString().split("T")[0];
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return {
      day: DAY_NAMES[d.getDay()],
      date: `${dd}/${mm}`,
      tanggal: dateStr,
      masuk: Number(masukRows.find((r) => r.tanggal === dateStr)?.total ?? 0),
      keluar: Number(keluarRows.find((r) => r.tanggal === dateStr)?.total ?? 0),
      isToday: dateStr === todayStr,
    };
  });

  const pieData = pieRows
    .filter((r) => Number(r.totalStok) > 0)
    .map((r) => ({ name: r.kategori, value: Number(r.totalStok) }));

  res.json({ barData, pieData });
});

export default router;
