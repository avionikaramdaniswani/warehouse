import {
  pgTable,
  text,
  serial,
  pgEnum,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "operator", "viewer"]);
export const statusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),

  nik: text("nik").notNull().unique(),
  namaLengkap: text("nama_lengkap").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("viewer"),
  noHp: text("no_hp"),
  departemen: text("departemen"),
  jabatan: text("jabatan"),
  seksi: text("seksi"),
  status: statusEnum("status").notNull().default("active"),

  dibuatOleh: integer("dibuat_oleh"),

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

export const insertUserSchema = createInsertSchema(usersTable)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    loginTerakhir: true,
  })
  .extend({
    password: z.string().min(8, "Password minimal 8 karakter"),
    email: z.string().email("Format email tidak valid"),
    nik: z.string().min(1, "NIK tidak boleh kosong"),
    namaLengkap: z.string().min(1, "Nama lengkap tidak boleh kosong"),
  });

export const updateUserSchema = insertUserSchema
  .partial()
  .omit({ password: true });

export const selectUserSchema = createSelectSchema(usersTable).omit({
  password: true,
});

export const insertActivityLogSchema = createInsertSchema(
  activityLogsTable,
).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type PublicUser = Omit<User, "password">;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
