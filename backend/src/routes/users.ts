import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, activityLogsTable, insertUserSchema, updateUserSchema } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { hashPassword } from "../lib/auth.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const creator = alias(usersTable, "creator");

const publicUserFields = {
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
  dibuatOlehNama: creator.namaLengkap,
  tanggalGabung: usersTable.tanggalGabung,
  loginTerakhir: usersTable.loginTerakhir,
  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
};

router.get("/users", authenticate, authorize("admin"), async (_req, res) => {
  const users = await db
    .select(publicUserFields)
    .from(usersTable)
    .leftJoin(creator, eq(usersTable.dibuatOleh, creator.id))
    .orderBy(desc(usersTable.createdAt));
  res.json(users);
});

router.get("/users/:id", authenticate, authorize("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: "ID tidak valid" });
    return;
  }

  const [user] = await db
    .select(publicUserFields)
    .from(usersTable)
    .leftJoin(creator, eq(usersTable.dibuatOleh, creator.id))
    .where(eq(usersTable.id, id))
    .limit(1);

  if (!user) {
    res.status(404).json({ message: "Pengguna tidak ditemukan" });
    return;
  }

  res.json(user);
});

router.post("/users", authenticate, authorize("admin"), async (req, res) => {
  const parsed = insertUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Data tidak valid", errors: parsed.error.issues });
    return;
  }

  const data = parsed.data;
  const hashedPassword = await hashPassword(data.password);

  const { tanggalGabung: tanggalGabungStr, ...restData } = data;
  const tanggalGabung = tanggalGabungStr ? new Date(tanggalGabungStr) : undefined;

  const [inserted] = await db
    .insert(usersTable)
    .values({ ...restData, password: hashedPassword, dibuatOleh: req.user!.userId, permissions: {}, ...(tanggalGabung ? { tanggalGabung } : {}) })
    .returning({ id: usersTable.id });

  const [newUser] = await db
    .select(publicUserFields)
    .from(usersTable)
    .leftJoin(creator, eq(usersTable.dibuatOleh, creator.id))
    .where(eq(usersTable.id, inserted.id))
    .limit(1);

  await logActivity(
    req.user!.userId,
    "CREATE_USER",
    `Membuat pengguna baru: ${newUser.namaLengkap} (${newUser.nik})`,
    req,
    { nik: newUser.nik, namaLengkap: newUser.namaLengkap, email: newUser.email,
      role: newUser.role, departemen: newUser.departemen, jabatan: newUser.jabatan, seksi: newUser.seksi },
  );

  res.status(201).json(newUser);
});

router.put("/users/:id", authenticate, authorize("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: "ID tidak valid" });
    return;
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Data tidak valid", errors: parsed.error.issues });
    return;
  }

  const { tanggalGabung: tanggalGabungStr, ...restUpdate } = parsed.data;
  const tanggalGabung = tanggalGabungStr ? new Date(tanggalGabungStr) : undefined;

  await db
    .update(usersTable)
    .set({ ...restUpdate, ...(tanggalGabung ? { tanggalGabung } : {}), updatedAt: new Date() })
    .where(eq(usersTable.id, id));

  const [updated] = await db
    .select(publicUserFields)
    .from(usersTable)
    .leftJoin(creator, eq(usersTable.dibuatOleh, creator.id))
    .where(eq(usersTable.id, id))
    .limit(1);

  if (!updated) {
    res.status(404).json({ message: "Pengguna tidak ditemukan" });
    return;
  }

  await logActivity(
    req.user!.userId,
    "UPDATE_USER",
    `Memperbarui pengguna: ${updated.namaLengkap} (${updated.nik})`,
    req,
    { targetId: id, nik: updated.nik, namaLengkap: updated.namaLengkap,
      role: updated.role, departemen: updated.departemen, jabatan: updated.jabatan,
      seksi: updated.seksi, status: updated.status },
  );

  res.json(updated);
});

const changePasswordSchema = z.object({
  passwordBaru: z.string().min(8, "Password minimal 8 karakter"),
});

router.patch("/users/:id/password", authenticate, authorize("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: "ID tidak valid" });
    return;
  }

  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Data tidak valid", errors: parsed.error.issues });
    return;
  }

  const hashedPassword = await hashPassword(parsed.data.passwordBaru);

  const [updated] = await db
    .update(usersTable)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, nik: usersTable.nik });

  if (!updated) {
    res.status(404).json({ message: "Pengguna tidak ditemukan" });
    return;
  }

  await logActivity(
    req.user!.userId,
    "CHANGE_PASSWORD",
    `Mengubah password pengguna NIK: ${updated.nik}`,
    req,
    { targetId: id, targetNik: updated.nik, changedBy: req.user!.userId },
  );

  res.json({ message: "Password berhasil diubah" });
});

const updatePermissionsSchema = z.object({
  transaksi_masuk: z.boolean(),
  transaksi_keluar: z.boolean(),
});

router.patch("/users/:id/permissions", authenticate, authorize("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ message: "ID tidak valid" }); return; }

  const parsed = updatePermissionsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Data tidak valid" }); return; }

  const [user] = await db.select({ id: usersTable.id, role: usersTable.role, nik: usersTable.nik }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ message: "Pengguna tidak ditemukan" }); return; }
  if (user.role !== "petugas") { res.status(400).json({ message: "Custom akses hanya berlaku untuk petugas" }); return; }

  await db.update(usersTable).set({ permissions: parsed.data, updatedAt: new Date() }).where(eq(usersTable.id, id));

  await logActivity(req.user!.userId, "UPDATE_PERMISSIONS", `Ubah akses petugas NIK: ${user.nik} → masuk:${parsed.data.transaksi_masuk} keluar:${parsed.data.transaksi_keluar}`, req,
    { targetId: id, targetNik: user.nik, sesudah: { transaksi_masuk: parsed.data.transaksi_masuk, transaksi_keluar: parsed.data.transaksi_keluar } });

  res.json({ message: "Akses berhasil diperbarui", permissions: parsed.data });
});

router.delete("/users/:id", authenticate, authorize("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: "ID tidak valid" });
    return;
  }

  if (id === req.user!.userId) {
    res.status(400).json({ message: "Tidak dapat menghapus akun sendiri" });
    return;
  }

  const [deleted] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, namaLengkap: usersTable.namaLengkap, nik: usersTable.nik });

  if (!deleted) {
    res.status(404).json({ message: "Pengguna tidak ditemukan" });
    return;
  }

  await logActivity(
    req.user!.userId,
    "DELETE_USER",
    `Menghapus pengguna: ${deleted.namaLengkap} (${deleted.nik})`,
    req,
    { targetId: id, nik: deleted.nik, namaLengkap: deleted.namaLengkap },
  );

  res.json({ message: "Pengguna berhasil dihapus" });
});

router.get("/users/:id/activity", authenticate, authorize("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: "ID tidak valid" });
    return;
  }

  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.userId, id))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(100);

  res.json(logs);
});

export default router;
