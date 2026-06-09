import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, activityLogsTable, insertUserSchema, updateUserSchema } from "@workspace/db/schema";
import { eq, desc, ne } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "../lib/auth.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

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
  dibuatOleh: usersTable.dibuatOleh,
  tanggalGabung: usersTable.tanggalGabung,
  loginTerakhir: usersTable.loginTerakhir,
  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
};

router.get("/users", authenticate, authorize("admin", "operator"), async (_req, res) => {
  const users = await db.select(publicUserFields).from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users);
});

router.get("/users/:id", authenticate, authorize("admin", "operator"), async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ message: "ID tidak valid" });
    return;
  }

  const [user] = await db
    .select(publicUserFields)
    .from(usersTable)
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

  const [newUser] = await db
    .insert(usersTable)
    .values({
      ...data,
      password: hashedPassword,
      dibuatOleh: req.user!.userId,
    })
    .returning(publicUserFields);

  await logActivity(
    req.user!.userId,
    "CREATE_USER",
    `Membuat pengguna baru: ${newUser.namaLengkap} (${newUser.nik})`,
    req,
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

  const [updated] = await db
    .update(usersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning(publicUserFields);

  if (!updated) {
    res.status(404).json({ message: "Pengguna tidak ditemukan" });
    return;
  }

  await logActivity(
    req.user!.userId,
    "UPDATE_USER",
    `Memperbarui pengguna: ${updated.namaLengkap} (${updated.nik})`,
    req,
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
  );

  res.json({ message: "Password berhasil diubah" });
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
  );

  res.json({ message: "Pengguna berhasil dihapus" });
});

router.get("/users/:id/activity", authenticate, authorize("admin", "operator"), async (req, res) => {
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
