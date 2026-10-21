import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";
import { parseProductInput } from "@/lib/productInput";
import { invalidateProduct } from "@/lib/cache";

type Ctx = { params: Promise<{ id: string }> };

// GET — editable product data (reference ids + image asset ids/urls)
export async function GET(_req: NextRequest, { params }: Ctx) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const product = await backendClient.fetch(
    `*[_type == "product" && _id == $id][0]{
      _id, name, "slug": slug.current, description, price, discount, stock,
      status, variant, isFeatured,
      "categoryIds": categories[]._ref,
      "brandId": brand._ref,
      "images": images[]{ "assetId": asset._ref, "url": asset->url }
    }`,
    { id }
  );
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ success: true, product });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;
    const { id } = await params;

    const parsed = parseProductInput(await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const slug = (parsed.doc.slug as { current: string }).current;
    const clash = await backendClient.fetch<number>(
      `count(*[_type == "product" && slug.current == $slug && _id != $id])`,
      { slug, id }
    );
    if (clash) {
      return NextResponse.json({ error: "Another product already uses this slug" }, { status: 409 });
    }

    const { brand, status, variant, ...rest } = parsed.doc;
    const set: Record<string, unknown> = { ...rest };
    const unset: string[] = [];
    for (const [k, v] of Object.entries({ brand, status, variant })) {
      if (v) set[k] = v;
      else unset.push(k);
    }

    let patch = backendClient.patch(id).set(set);
    if (unset.length) patch = patch.unset(unset);
    const product = await patch.commit();

    await invalidateProduct(id, slug);
    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Update product failed:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;
    const { id } = await params;

    const inOrders = await backendClient.fetch<number>(
      `count(*[_type == "order" && references($id)])`,
      { id }
    );
    if (inOrders > 0) {
      // Keep order history intact: hide the product instead of deleting it
      await backendClient.patch(id).set({ stock: 0, isFeatured: false }).commit();
      await invalidateProduct(id);
      return NextResponse.json({
        success: true,
        archived: true,
        message: "This product appears in past orders, so it was set to out of stock instead of deleted.",
      });
    }

    await backendClient.delete(id);
    await invalidateProduct(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product failed:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
