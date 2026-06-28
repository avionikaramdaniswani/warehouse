import { Request, Response, NextFunction } from "express";

type Role = "admin" | "kepala_gudang" | "petugas";

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Tidak terautentikasi" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: "Akses ditolak. Anda tidak memiliki izin untuk aksi ini.",
      });
      return;
    }

    next();
  };
}
