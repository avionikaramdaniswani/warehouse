import { Router } from "express";
import { db } from "@workspace/db";
import { activityLogsTable, usersTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";

const router = Router();

router.get("/activity", authenticate, authorize("admin"), async (_req, res) => {
  const logs = await db
    .select({
      id: activityLogsTable.id,
      aksi: activityLogsTable.aksi,
      detail: activityLogsTable.detail,
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
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(2000);

  res.json(logs);
});

export default router;
