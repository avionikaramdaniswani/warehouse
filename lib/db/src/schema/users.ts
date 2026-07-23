import {
  pgTable,
  text,
  serial,
  pgEnum,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

import { z } from "zod";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "kepala_gudang", "petugas"]);
export const statusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),

  nik: text("nik").notNull().unique(),
  namaLengkap: text("nama_lengkap").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("petugas"),
  noHp: text("no_hp"),
  departemen: text("departemen"),
  jabatan: text("jabatan"),
  seksi: text("seksi"),
  status: statusEnum("status").notNull().default("active"),

  dibuatOleh: integer("dibuat_oleh"),

  permissions: jsonb("permissions")
    .$type<{ transaksi_masuk?: boolean; transaksi_keluar?: boolean }>()
    .notNull()
    .default({}),

  tanggalGabung: timestamp("tanggal_gabung", { withTimezone: true }).notNull().defaultNow(),
  loginTerakhir: timestamp("login_terakhir", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  aksi: text("aksi").notNull(),
  detail: text("detail"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  createdBy: one(usersTable, {
    fields: [usersTable.dibuatOleh],
    references: [usersTable.id],
    relationName: "createdByUser",
  }),
  createdUsers: many(usersTable, { relationName: "createdByUser" }),
  activityLogs: many(activityLogsTable),
}));

export const activityLogsRelations = relations(activityLogsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [activityLogsTable.userId],
    references: [usersTable.id],
  }),
}));

export const insertUserSchema = z.object({
  nik: z.string().min(1, "NIK tidak boleh kosong"),
  namaLengkap: z.string().min(1, "Nama lengkap tidak boleh kosong"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(["admin", "kepala_gudang", "petugas"]).default("petugas"),
  noHp: z.string().nullable().optional(),
  departemen: z.string().nullable().optional(),
  jabatan: z.string().nullable().optional(),
  seksi: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  dibuatOleh: z.number().nullable().optional(),
  tanggalGabung: z.string().optional(),
});

export const updateUserSchema = insertUserSchema
  .partial()
  .omit({ password: true });

export const selectUserSchema = z.object({
  id: z.number(),
  nik: z.string(),
  namaLengkap: z.string(),
  email: z.string(),
  role: z.enum(["admin", "kepala_gudang", "petugas"]),
  noHp: z.string().nullable(),
  departemen: z.string().nullable(),
  jabatan: z.string().nullable(),
  seksi: z.string().nullable(),
  status: z.enum(["active", "inactive", "suspended"]),
  dibuatOleh: z.number().nullable(),
  tanggalGabung: z.string(),
  loginTerakhir: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertActivityLogSchema = z.object({
  userId: z.number(),
  aksi: z.string(),
  detail: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type PublicUser = Omit<User, "password">;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
