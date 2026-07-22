import { unlinkSync } from "fs";

for (const f of ["package-lock.json", "yarn.lock"]) {
  try { unlinkSync(f); } catch {}
}

// DYNO is set by Heroku — corepack handles package manager routing there
const isHeroku = !!process.env.DYNO;
const agent = process.env.npm_config_user_agent ?? "";
if (!isHeroku && !agent.startsWith("pnpm")) {
  console.error("Use pnpm instead of npm/yarn");
  process.exit(1);
}
