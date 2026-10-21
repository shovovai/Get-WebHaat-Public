import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Install report. The first time a live WebHaat store starts on a domain, it tells the maintainer's
 * portal (get.webhaat.org) which domain and version is running, so the maintainer knows where the
 * software is in use and can offer setup and care.
 *
 * This is disclosed: it is described in TELEMETRY.md, in the README and on the store's privacy page,
 * and it is the only call WebHaat makes to the maintainer. It sends ONLY the public site URL and the
 * version string — never customer, order, product or payment data, and nothing that isn't already
 * public on the site itself. Turn it off any time with the environment variable WEBHAAT_TELEMETRY=off.
 *
 * Removing or hiding the "Powered by WebHaat" link or this report is governed by LICENSE and
 * NOTICE.md. Keep this file and its call in instrumentation.ts unless your licence permits otherwise.
 */
let reportedThisProcess = false;

const DEFAULT_ENDPOINT = "https://get.webhaat.org/api/installations";

function currentVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function reportInstall(): Promise<void> {
  // Once per running process; the portal keeps one row per domain, so restarts don't pile up.
  if (reportedThisProcess) return;
  reportedThisProcess = true;

  if (process.env.WEBHAAT_TELEMETRY === "off") return;

  const site = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  // Only a real, live site: skip local development and anything not on https.
  if (!site.startsWith("https://") || site.includes("localhost") || site.includes("127.0.0.1")) return;

  const endpoint = process.env.WEBHAAT_TELEMETRY_URL || DEFAULT_ENDPOINT;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ site, version: currentVersion() }),
      // Never slow down or break startup if the portal is unreachable.
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    /* offline or portal down: the next cold start tries again */
  }
}
