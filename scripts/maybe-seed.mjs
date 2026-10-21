// Runs before the build (package.json "prebuild"). The demo seed runs ONLY when SEED_DEMO is set,
// so normal builds are untouched. The Sanity token comes from the host's SANITY_API_TOKEN env var,
// never from the code. A failing seed never fails the build.
//
// To seed on the next deploy: set SEED_DEMO=1 (and SANITY_API_TOKEN) in the host's env, redeploy,
// then REMOVE SEED_DEMO so later deploys don't re-seed and wipe banners you add by hand.
import { spawnSync } from "node:child_process";

const on = process.env.SEED_DEMO === "1" || process.env.SEED_DEMO === "true";
if (!on) {
  console.log("[seed] skipped (set SEED_DEMO=1 to run the demo seed on this build)");
  process.exit(0);
}
if (!process.env.SANITY_API_TOKEN) {
  console.warn("[seed] SEED_DEMO is set but SANITY_API_TOKEN is missing — skipping, build continues");
  process.exit(0);
}

console.log("[seed] SEED_DEMO set — seeding the demo shop…");
const r = spawnSync("npx", ["tsx", "scripts/seed-demo.ts", "--reset"], { stdio: "inherit", env: process.env });
if (r.status !== 0) console.warn("[seed] demo seed failed — continuing the build anyway");
process.exit(0);
