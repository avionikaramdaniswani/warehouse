---
name: drizzle-zod v4 incompatibility
description: createInsertSchema from drizzle-zod generates Zod v4 internal schemas; mixing with Zod v3 .extend() causes runtime crash.
---

## Rule
Never use `createInsertSchema`, `createSelectSchema`, or any drizzle-zod helper that returns a schema object. Write all validation schemas manually with `z.object({})` using Zod v3.

**Why:** drizzle-zod (even when installed alongside zod@3.x) generates schemas using Zod v4 core internals (`zod/v4/core/schemas.js`). When you call `.extend()` or `.merge()` on the resulting schema and pass plain Zod v3 field schemas, it throws: `"Invalid element at key \"<field>\": expected a Zod schema"`. This crashes the API route at runtime silently (returns 500).

**How to apply:** In `lib/db/src/schema/*.ts`, replace any `createInsertSchema(table).omit(...).extend(...)` pattern with a plain `z.object({ field: z.string(), ... })`. Drizzle-zod can still be imported for type inference if needed, but never call its factory functions.
