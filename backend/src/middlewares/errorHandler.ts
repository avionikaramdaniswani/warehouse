import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const isProduction = process.env.NODE_ENV === "production";

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ message: "Format JSON tidak valid" });
    return;
  }

  logger.error(
    { err, method: req.method, url: req.url?.split("?")[0] },
    "Unhandled error",
  );

  res.status(500).json({
    message: "Terjadi kesalahan server. Silakan hubungi administrator.",
    ...(isProduction ? {} : { detail: String(err) }),
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Endpoint ${req.method} ${req.path} tidak ditemukan` });
}
