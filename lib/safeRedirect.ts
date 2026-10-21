const BASE = "http://x.invalid";

/**
 * Only allow same-site paths like "/cart" — never "https://evil.com", "//evil.com", "/\evil.com"
 * or tricks like "/%09/evil.com" (browsers drop tabs/newlines, turning it into "//evil.com").
 * Returns pathname + search + hash of the resolved same-origin URL, or the fallback.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  let path: string;
  try {
    path = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  // Control characters (tab, newline, NUL, DEL…) and backslashes have no place in a redirect path
  if (/[\u0000-\u001F\u007F\\]/.test(path) || /[\u0000-\u001F\u007F\\]/.test(value)) return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;

  try {
    const url = new URL(path, BASE);
    if (url.origin !== BASE) return fallback;
    const result = `${url.pathname}${url.search}${url.hash}`;
    return result.startsWith("/") && !result.startsWith("//") ? result : fallback;
  } catch {
    return fallback;
  }
}
