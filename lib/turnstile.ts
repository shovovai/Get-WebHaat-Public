import "server-only";

/**
 * Optional Cloudflare Turnstile check for public forms (contact, newsletter).
 * Enabled only when BOTH NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET are set;
 * otherwise every request passes (the rate limit and honeypot still apply).
 */
export function turnstileEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() && process.env.TURNSTILE_SECRET?.trim());
}

/** Name of the hidden field bots tend to fill in. Real visitors never see it. */
export const HONEYPOT_FIELD = "website";

/** True when the hidden honeypot field was filled in (i.e. almost certainly a bot). */
export function honeypotTripped(body: Record<string, unknown> | null | undefined): boolean {
  const v = body?.[HONEYPOT_FIELD];
  return typeof v === "string" && v.trim().length > 0;
}

/** Verifies a Turnstile token with Cloudflare. Returns true when Turnstile is disabled. */
export async function verifyTurnstile(token: unknown, ip?: string): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;

  try {
    const form = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET!.trim(), response: token });
    if (ip && ip !== "unknown") form.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}
