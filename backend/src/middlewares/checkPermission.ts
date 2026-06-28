import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

type PermissionKey = "transaksi_masuk" | "transaksi_keluar";

export function requirePermission(key: PermissionKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Tidak terautentikasi" });
      return;
    }

    if (req.user.role !== "petugas") {
      next();
      return;
    }

    const [user] = await db
      .select({ permissions: usersTable.permissions })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.userId))
      .limit(1);

    if (!user) {
      res.status(403).json({ message: "Akses ditolak" });
      return;
    }

    const allowed = (user.permissions as Record<string, boolean> | null)?.[key] === true;
    if (!allowed) {
      res.status(403).json({ message: "Akses ditolak. Anda tidak memiliki izin untuk aksi ini." });
      return;
    }

    next();
  };
}
