import { db } from "@workspace/db";
import { activityLogsTable } from "@workspace/db/schema";
import { Request } from "express";

export async function logActivity(
  userId: number,
  aksi: string,
  detail?: string,
  req?: Request,
) {
  try {
    await db.insert(activityLogsTable).values({
      userId,
      aksi,
      detail: detail ?? null,
      ipAddress: req?.ip ?? null,
      userAgent: req?.headers["user-agent"] ?? null,
    });
  } catch (err) {
    console.error("Gagal mencatat aktivitas:", err);
  }
}
