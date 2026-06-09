import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyPassword, signToken } from "../lib/auth.js";
import { authenticate } from "../middlewares/authenticate.js";
import { loginLimiter } from "../middlewares/rateLimiter.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Email dan password wajib diisi" });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    res.status(401).json({ message: "Email atau password salah" });
    return;
  }

  if (user.status !== "active") {
    res.status(403).json({ message: "Akun Anda tidak aktif. Hubungi admin." });
    return;
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    res.status(401).json({ message: "Email atau password salah" });
    return;
  }

  await db
    .update(usersTable)
    .set({ loginTerakhir: new Date() })
    .where(eq(usersTable.id, user.id));

  await logActivity(user.id, "LOGIN", "Login berhasil", req);

  const token = signToken({ userId: user.id, role: user.role, nik: user.nik });

  const { password: _, ...publicUser } = user;
  res.json({ token, user: publicUser });
});

router.post("/auth/logout", authenticate, async (req, res) => {
  await logActivity(req.user!.userId, "LOGOUT", "Logout", req);
  res.json({ message: "Berhasil logout" });
});

router.get("/auth/me", authenticate, async (req, res) => {
  const [user] = await db
    .select({
      id: usersTable.id,
      nik: usersTable.nik,
      namaLengkap: usersTable.namaLengkap,
      email: usersTable.email,
      role: usersTable.role,
      noHp: usersTable.noHp,
      departemen: usersTable.departemen,
      jabatan: usersTable.jabatan,
      seksi: usersTable.seksi,
      status: usersTable.status,
      dibuatOleh: usersTable.dibuatOleh,
      tanggalGabung: usersTable.tanggalGabung,
      loginTerakhir: usersTable.loginTerakhir,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ message: "Pengguna tidak ditemukan" });
    return;
  }

  res.json(user);
});

export default router;
