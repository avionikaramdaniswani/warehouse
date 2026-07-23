import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { verifyPassword, hashPassword, signToken, signResetToken, verifyResetToken } from "../lib/auth.js";
import { authenticate } from "../middlewares/authenticate.js";
import { loginLimiter, forgotPasswordLimiter } from "../middlewares/rateLimiter.js";
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

  await logActivity(user.id, "LOGIN", "Login berhasil", req, {
    email: user.email, namaLengkap: user.namaLengkap, role: user.role,
  });

  const token = signToken({ userId: user.id, role: user.role, nik: user.nik });

  const { password: _, ...publicUser } = user;
  res.json({ token, user: publicUser });
});

router.post("/auth/logout", authenticate, async (req, res) => {
  await logActivity(req.user!.userId, "LOGOUT", "Logout", req);
  res.json({ message: "Berhasil logout" });
});

const updateProfileSchema = z.object({
  namaLengkap: z.string().min(1, "Nama lengkap tidak boleh kosong").max(150).optional(),
  email: z.string().email("Format email tidak valid").optional(),
  noHp: z.string().max(20).optional().nullable(),
  departemen: z.string().max(100).optional().nullable(),
  jabatan: z.string().max(100).optional().nullable(),
  seksi: z.string().max(100).optional().nullable(),
});

router.patch("/auth/profile", authenticate, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const userId = req.user!.userId;

  if (parsed.data.email) {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, parsed.data.email))
      .limit(1);
    if (existing && existing.id !== userId) {
      res.status(409).json({ message: "Email sudah digunakan oleh akun lain" });
      return;
    }
  }

  const [updated] = await db
    .update(usersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning({
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
      tanggalGabung: usersTable.tanggalGabung,
      loginTerakhir: usersTable.loginTerakhir,
    });

  await logActivity(userId, "UPDATE_PROFILE", "Perbarui profil", req, {
    fieldDiubah: Object.keys(parsed.data),
    sesudah: { namaLengkap: updated.namaLengkap, email: updated.email,
      noHp: updated.noHp, departemen: updated.departemen, jabatan: updated.jabatan, seksi: updated.seksi },
  });
  res.json(updated);
});

const changePasswordSchema = z.object({
  passwordLama: z.string().min(1, "Password lama wajib diisi"),
  passwordBaru: z.string().min(8, "Password baru minimal 8 karakter"),
  konfirmasi: z.string().min(1, "Konfirmasi password wajib diisi"),
});

router.post("/auth/change-password", authenticate, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const { passwordLama, passwordBaru, konfirmasi } = parsed.data;

  if (passwordBaru !== konfirmasi) {
    res.status(400).json({ message: "Konfirmasi password tidak cocok" });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, password: usersTable.password })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ message: "Pengguna tidak ditemukan" });
    return;
  }

  const valid = await verifyPassword(passwordLama, user.password);
  if (!valid) {
    res.status(400).json({ message: "Password lama tidak sesuai" });
    return;
  }

  const hashed = await hashPassword(passwordBaru);
  await db
    .update(usersTable)
    .set({ password: hashed, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  await logActivity(user.id, "CHANGE_PASSWORD", "Ubah password sendiri", req, { changedBy: "self" });
  res.json({ message: "Password berhasil diubah" });
});

const forgotPasswordSchema = z.object({
  nik: z.string().min(1, "NIK wajib diisi"),
  email: z.string().email("Format email tidak valid"),
});

router.post("/auth/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const { nik, email } = parsed.data;

  const [user] = await db
    .select({ id: usersTable.id, status: usersTable.status })
    .from(usersTable)
    .where(and(eq(usersTable.nik, nik), eq(usersTable.email, email)))
    .limit(1);

  if (!user) {
    res.status(400).json({ message: "NIK dan email tidak cocok. Periksa kembali data Anda." });
    return;
  }

  if (user.status !== "active") {
    res.status(403).json({ message: "Akun tidak aktif. Hubungi admin." });
    return;
  }

  const { signResetToken } = await import("../lib/auth.js");
  const resetToken = signResetToken(user.id);

  res.json({ resetToken });
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Token tidak valid"),
  passwordBaru: z.string().min(8, "Password baru minimal 8 karakter"),
  konfirmasi: z.string().min(1, "Konfirmasi password wajib diisi"),
});

router.post("/auth/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Data tidak valid" });
    return;
  }

  const { resetToken, passwordBaru, konfirmasi } = parsed.data;

  if (passwordBaru !== konfirmasi) {
    res.status(400).json({ message: "Konfirmasi password tidak cocok" });
    return;
  }

  let userId: number;
  try {
    const { verifyResetToken } = await import("../lib/auth.js");
    const payload = verifyResetToken(resetToken);
    userId = payload.userId;
  } catch {
    res.status(400).json({ message: "Token tidak valid atau sudah kedaluwarsa. Ulangi proses dari awal." });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, status: usersTable.status })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user || user.status !== "active") {
    res.status(403).json({ message: "Akun tidak ditemukan atau tidak aktif." });
    return;
  }

  const hashed = await hashPassword(passwordBaru);
  await db
    .update(usersTable)
    .set({ password: hashed, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  await logActivity(userId, "RESET_PASSWORD", "Reset password via lupa password", req, { changedBy: "self", method: "forgot_password" });
  res.json({ message: "Password berhasil direset. Silakan login dengan password baru." });
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
      permissions: usersTable.permissions,
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

  res.json({ ...user, permissions: user.permissions ?? {} });
});

export default router;
