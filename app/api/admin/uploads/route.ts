import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

// POST multipart/form-data { file } → uploads an image asset to Sanity
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WebP, GIF, AVIF, SVG or ICO images are allowed" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be under 8 MB" }, { status: 400 });
    }

    const asset = await backendClient.assets.upload(
      "image",
      Buffer.from(await file.arrayBuffer()),
      { filename: file.name, contentType: file.type }
    );
    return NextResponse.json({ success: true, assetId: asset._id, url: asset.url });
  } catch (error) {
    console.error("Image upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
