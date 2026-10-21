// Runs once when the server starts: flags missing or unsafe configuration early,
// instead of failing later on a customer's checkout.
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const required = [
    "NEXT_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_SANITY_PROJECT_ID",
    "NEXT_PUBLIC_SANITY_DATASET",
    "SANITY_API_TOKEN",
    "SANITY_API_READ_TOKEN",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_ADMIN_EMAIL",
    "PAYMENT_ENCRYPTION_KEY",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`[config] Missing environment variables: ${missing.join(", ")}`);
  }

  if (process.env.NODE_ENV !== "production") return;

  const warnings: string[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  if (!baseUrl.startsWith("https://") || baseUrl.includes("localhost")) {
    warnings.push("NEXT_PUBLIC_BASE_URL should be your live https:// domain");
  }
  if ((process.env.PAYMENT_ENCRYPTION_KEY || "").length < 32) {
    warnings.push("PAYMENT_ENCRYPTION_KEY should be a long random string (32+ characters)");
  }
  if (process.env.CLERK_SECRET_KEY?.startsWith("sk_test_")) {
    warnings.push("Clerk is using test keys — switch to production keys before launch");
  }
  if (!process.env.SMTP_HOST && !process.env.GOOGLE_REFRESH_TOKEN) {
    warnings.push("No email provider configured (SMTP_* or GOOGLE_*) — order emails won't send");
  }
  for (const w of warnings) console.warn(`[config] ${w}`);

  // Disclosed install report (see lib/telemetry.ts, TELEMETRY.md). Fire-and-forget; off with WEBHAAT_TELEMETRY=off.
  void import("./lib/telemetry").then((m) => m.reportInstall());
}
