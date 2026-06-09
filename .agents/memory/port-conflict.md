---
name: Port conflict fix
description: Mockup sandbox occupies port 8081 — API server must use 8082.
---

The mockup sandbox component preview server always starts on port 8081.
The "Start application" workflow originally tried PORT=8081 for the API — it would fail with EADDRINUSE every time.

**Fix applied:**
- `package.json` dev script: `PORT=8082 pnpm --filter @workspace/api-server run dev`
- `artifacts/tel-gudang/vite.config.ts` proxy: target `http://localhost:8082`

**Why:** Replit automatically starts the mockup sandbox on 8081. Any workflow that tries to bind 8081 will fail silently.

**How to apply:** If the API ever seems unreachable from the frontend, check that the API port in package.json and the Vite proxy target both use 8082 (or any port ≠ 8081).
