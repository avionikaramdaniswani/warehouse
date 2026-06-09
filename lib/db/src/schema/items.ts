import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const kategoriTable = pgTable("kategori", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull().unique(),
  keterangan: text("keterangan"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKategoriSchema = createInsertSchema(kategoriTable)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    nama: z.string().min(1, "Nama kategori tidak boleh kosong").max(100, "Nama kategori maksimal 100 karakter"),
  });

export const updateKategoriSchema = insertKategoriSchema.partial();

export const selectKategoriSchema = createSelectSchema(kategoriTable);

export type InsertKategori = z.infer<typeof insertKategoriSchema>;
export type UpdateKategori = z.infer<typeof updateKategoriSchema>;
export type Kategori = typeof kategoriTable.$inferSelect;
