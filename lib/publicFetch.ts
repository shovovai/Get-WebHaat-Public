// Browser-side helper for read-only catalog data (see app/api/catalog/route.ts).
export type CatalogAction = "featured" | "search" | "shop";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function catalogFetch<T = any>(
  action: CatalogAction,
  params: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch("/api/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data.result as T;
}
