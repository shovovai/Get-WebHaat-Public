import { NextRequest, NextResponse } from "next/server";
import { saveContactMessage } from "@/sanity/helpers";
import { isValidEmail } from "@/lib/html";
import { clientIp, limitRequest } from "@/lib/rateLimit";
import { honeypotTripped, verifyTurnstile } from "@/lib/turnstile";

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(request: NextRequest) {
  const limited = await limitRequest(request, "contact", { limit: 5, windowMs: 10 * 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const name = text(body.name);
    const email = text(body.email).toLowerCase();
    const subject = text(body.subject);
    const message = text(body.message);

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
    }
    if (name.length > 100 || subject.length > 200 || message.length > 5000) {
      return NextResponse.json({ error: "Message is too long" }, { status: 400 });
    }

    // Bots fill the hidden field: pretend it worked and store nothing
    if (honeypotTripped(body)) {
      return NextResponse.json(
        { message: "Message sent successfully! We'll get back to you soon." },
        { status: 200 }
      );
    }
    if (!(await verifyTurnstile(body.turnstileToken, clientIp(request)))) {
      return NextResponse.json(
        { error: "Please complete the security check and try again." },
        { status: 400 }
      );
    }

    const result = await saveContactMessage({
      name,
      email,
      subject,
      message,
      ipAddress: clientIp(request),
      userAgent: (request.headers.get("user-agent") || "unknown").slice(0, 300),
    });

    if (result.success) {
      return NextResponse.json(
        { message: "Message sent successfully! We'll get back to you soon." },
        { status: 200 }
      );
    }

    console.error("Sanity save failed:", result.error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  } catch (error) {
    console.error("Contact API Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
