import { NextRequest, NextResponse } from "next/server";
import { subscribeToNewsletter } from "@/lib/newsletter";
import { getCurrentUserEmail } from "@/lib/adminAuth";
import { honeypotTripped, verifyTurnstile } from "@/lib/turnstile";
import { sendMail } from "@/lib/emailService";
import { escapeHtml, isValidEmail } from "@/lib/html";
import { limitRequest, clientIp } from "@/lib/rateLimit";
import { unsubscribeUrl } from "@/lib/unsubscribeToken";
import { getStoreSettings } from "@/lib/storeSettings";
import { brand } from "@/config/brand";

export async function POST(request: NextRequest) {
  // Stops bots from using the form to send welcome emails to strangers
  const limited = await limitRequest(request, "newsletter", { limit: 5, windowMs: 10 * 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    // Bots fill the hidden field: pretend it worked, store nothing, send nothing
    if (honeypotTripped(body)) {
      return NextResponse.json({ message: "Thank you for subscribing!" }, { status: 200 });
    }

    // Signed-in users subscribing their own verified address skip the bot check
    const ownEmail = await getCurrentUserEmail().catch(() => null);
    if (ownEmail !== email && !(await verifyTurnstile(body.turnstileToken, clientIp(request)))) {
      return NextResponse.json(
        { error: "Please complete the security check and try again." },
        { status: 400 }
      );
    }

    const result = await subscribeToNewsletter({
      email,
      source: "footer",
      ipAddress: clientIp(request),
      userAgent: (request.headers.get("user-agent") || "unknown").slice(0, 300),
    });

    // If subscription failed or already subscribed
    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message,
          alreadySubscribed: result.alreadySubscribed || false,
        },
        { status: result.alreadySubscribed ? 200 : 400 }
      );
    }

    const settings = await getStoreSettings();
    const emailResult = await sendMail({
      email,
      subject: `Welcome to the ${settings.storeName} newsletter`,
      text: `Thanks for subscribing to ${settings.storeName}! You'll hear about new arrivals and members-only deals.\n\nShop: ${brand.url}\nUnsubscribe: ${unsubscribeUrl(email)}`,
      html: welcomeEmailHtml({
        email,
        storeName: settings.storeName,
        supportEmail: settings.supportEmail || brand.emails.support,
      }),
    });

    if (!emailResult.success) {
      // Subscription still counts even if the welcome email fails
      console.error("Failed to send welcome email:", emailResult.error);
    }

    return NextResponse.json(
      { message: result.message },
      { status: 200 }
    );
  } catch (error) {
    console.error("Newsletter subscription API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}

function welcomeEmailHtml({
  email,
  storeName,
  supportEmail,
}: {
  email: string;
  storeName: string;
  supportEmail: string;
}): string {
  const name = escapeHtml(storeName);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to ${name}</title></head>
<body style="margin:0;background:#f5f5f7;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0a0a0a">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#0a0a0a;border-radius:12px 12px 0 0;padding:32px 28px;color:#ffffff">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a1a1a6">The ${name} letter</p>
      <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25">You're on the list.</h1>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:28px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Thanks for subscribing! Expect new arrivals, members-only deals and the occasional store update — never spam.</p>
      <a href="${escapeHtml(brand.url)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:6px">Start shopping</a>
      <p style="margin:24px 0 0;font-size:13px;color:#6b625b">Questions? Reply to this email or write to <a href="mailto:${escapeHtml(supportEmail)}" style="color:#0a0a0a">${escapeHtml(supportEmail)}</a>.</p>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#8a817a;text-align:center">
      You're receiving this because ${escapeHtml(email)} subscribed at ${name}.<br>
      <a href="${escapeHtml(unsubscribeUrl(email))}" style="color:#8a817a">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;
}
