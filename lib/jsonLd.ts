/**
 * Serialize structured data for <script type="application/ld+json">.
 * Escapes characters that could close the script tag (e.g. a product named "</script>").
 */
export const jsonLd = (data: unknown): string =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
