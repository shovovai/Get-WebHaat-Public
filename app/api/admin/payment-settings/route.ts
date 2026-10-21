import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import { getPaymentConfig, maskConfig, savePaymentConfig } from "@/lib/paymentConfig";
import { hasEncryptionKey } from "@/lib/secretBox";
import { brand } from "@/config/brand";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const config = await getPaymentConfig({ fresh: true });
  return NextResponse.json({
    success: true,
    config: maskConfig(config),
    encryptionReady: hasEncryptionKey(),
    callbacks: {
      bkash: `${brand.url}/api/payments/bkash/callback`,
      nagad: `${brand.url}/api/payments/nagad/callback`,
      sslcommerzIpn: `${brand.url}/api/payments/sslcommerz/ipn`,
      stripeWebhook: `${brand.url}/api/webhook`,
    },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;
    if (!hasEncryptionKey()) {
      return NextResponse.json(
        {
          error:
            "Set PAYMENT_ENCRYPTION_KEY in .env (a long random string) before saving payment credentials.",
        },
        { status: 400 }
      );
    }

    const result = await savePaymentConfig(await request.json(), admin.email);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    revalidateTag("paymentSettings", { expire: 0 });
    return NextResponse.json({ success: true, config: maskConfig(result.config) });
  } catch (error) {
    console.error("Saving payment settings failed:", error);
    return NextResponse.json({ error: "Could not save payment settings" }, { status: 500 });
  }
}
