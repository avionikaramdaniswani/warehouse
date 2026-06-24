import { unlinkSync } from "fs";

for (const f of ["package-lock.json", "yarn.lock"]) {
  try { unlinkSync(f); } catch {}
}

const agent = process.env.npm_config_user_agent ?? "";
if (!agent.startsWith("pnpm")) {
  console.error("Use pnpm instead of npm/yarn");
  process.exit(1);
}
