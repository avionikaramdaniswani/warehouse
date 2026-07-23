import { Router } from "express";
import { db } from "@workspace/db";
import { activityLogsTable, usersTable } from "@workspace/db/schema";
import { desc, eq, and, gte, lte, ilike, or } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";

const router = Router();

router.get("/activity", authenticate, authorize("admin"), async (req, res) => {
  const { from, to, userId, aksi, search, limit: limitQ } = req.query as Record<string, string>;

  const conditions = [];

  if (from) {
    conditions.push(gte(activityLogsTable.createdAt, new Date(from)));
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(activityLogsTable.createdAt, toDate));
  }
  if (userId && userId !== "Semua") {
    conditions.push(eq(activityLogsTable.userId, Number(userId)));
  }
  if (aksi && aksi !== "Semua") {
    conditions.push(eq(activityLogsTable.aksi, aksi));
  }
  if (search) {
    conditions.push(
      or(
        ilike(activityLogsTable.aksi, `%${search}%`),
        ilike(activityLogsTable.detail, `%${search}%`),
        ilike(usersTable.namaLengkap, `%${search}%`),
        ilike(usersTable.nik, `%${search}%`),
      ),
    );
  }

  const maxLimit = Math.min(5000, Math.max(1, parseInt(limitQ) || 2000));

  const logs = await db
    .select({
      id: activityLogsTable.id,
      aksi: activityLogsTable.aksi,
      detail: activityLogsTable.detail,
      metadata: activityLogsTable.metadata,
      ipAddress: activityLogsTable.ipAddress,
      userAgent: activityLogsTable.userAgent,
      createdAt: activityLogsTable.createdAt,
      userId: activityLogsTable.userId,
      namaLengkap: usersTable.namaLengkap,
      nik: usersTable.nik,
      role: usersTable.role,
    })
    .from(activityLogsTable)
    .leftJoin(usersTable, eq(activityLogsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(maxLimit);

  res.json(logs);
});

export default router;
