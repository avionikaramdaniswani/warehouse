import { pgTable, text, serial, integer, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const kategoriTable = pgTable("kategori", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull().unique(),
  keterangan: text("keterangan"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const itemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  tsCode: text("ts_code").notNull().unique(),
  msCode: text("ms_code"),
  nama: text("nama").notNull(),
  kategori: text("kategori").notNull().default(""),
  binLoc: text("bin_loc"),
  uom: text("uom").notNull().default("EA"),
  stok: integer("stok").notNull().default(0),
  safetyStok: integer("safety_stok").notNull().default(5),
  status: text("status").notNull().default("Normal"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transaksiMasukTable = pgTable("transaksi_masuk", {
  id: serial("id").primaryKey(),
  nomor: text("nomor").notNull().unique(),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  jumlah: integer("jumlah").notNull(),
  tanggal: date("tanggal").notNull(),
  noPo: text("no_po"),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transaksiKeluarTable = pgTable("transaksi_keluar", {
  id: serial("id").primaryKey(),
  nomor: text("nomor").notNull().unique(),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  jumlah: integer("jumlah").notNull(),
  keperluan: text("keperluan").notNull().default("Perbaikan"),
  tujuan: text("tujuan"),
  tanggal: date("tanggal").notNull(),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
