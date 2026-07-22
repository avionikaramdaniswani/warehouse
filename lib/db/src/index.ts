import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Supabase transaction pooler requires SSL and no prepared statements.
// When DATABASE_URL contains "pooler.supabase.com", apply those settings.
const isSupabasePooler = process.env.DATABASE_URL.includes(
  "pooler.supabase.com",
);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isSupabasePooler && {
    ssl: { rejectUnauthorized: false },
    // Transaction pooler (port 6543) does not support prepared statements
    max: 10,
  }),
});

// Disable prepared statements for pgbouncer-compatible poolers
export const db = drizzle(pool, {
  schema,
  ...(isSupabasePooler && { logger: false }),
});

export * from "./schema";
