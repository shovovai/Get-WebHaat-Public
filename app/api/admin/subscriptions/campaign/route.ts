import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";
import { privateId } from "@/lib/privateId";
import { sendMail } from "@/lib/emailService";
import { getStoreSettings } from "@/lib/storeSettings";
import { brand } from "@/config/brand";
import { unsubscribeUrl as signedUnsubscribeUrl } from "@/lib/unsubscribeToken";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_RECIPIENTS = 2000;
const CONCURRENCY = 5;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(opts: {
  storeName: string;
  accent: string;
  heading: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}) {
  const paragraphs = opts.message
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;color:#374151">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const cta =
    opts.ctaText && opts.ctaUrl
      ? `<p style="margin:24px 0"><a href="${escapeHtml(opts.ctaUrl)}" style="background:${opts.accent};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(opts.ctaText)}</a></p>`
      : "";
  return `<!DOCTYPE html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:${opts.accent};padding:24px;text-align:center;color:#fff;font-size:22px;font-weight:bold">${escapeHtml(opts.storeName)}</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 20px;font-size:22px;color:#111827">${escapeHtml(opts.heading)}</h1>
${paragraphs}${cta}
</td></tr>
<tr><td style="padding:20px 32px;background:#f9fafb;font-size:12px;color:#6b7280;text-align:center">
You are receiving this email because you subscribed to the ${escapeHtml(opts.storeName)} newsletter.<br>
<a href="${opts.unsubscribeUrl}" style="color:#6b7280">Unsubscribe</a>
</td></tr></table></td></tr></table></body></html>`;
}

// GET - recent campaign history
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const campaigns = await backendClient.fetch(
    `*[_type == "emailCampaign"] | order(sentAt desc)[0...20]{
      _id, subject, recipients, delivered, failed, sentBy, sentAt
    }`
  );
  return NextResponse.json({ success: true, campaigns });
}

// POST - send a campaign (or a test email to the admin)
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const body = await request.json();
    const subject = String(body.subject || "").trim();
    const heading = String(body.heading || subject).trim();
    const message = String(body.message || "").trim();
    const ctaText = String(body.ctaText || "").trim();
    const ctaUrl = String(body.ctaUrl || "").trim();
    const testOnly = Boolean(body.testOnly);

    if (!subject || !message) {
      return NextResponse.json(
        { success: false, error: "Subject and message are required" },
        { status: 400 }
      );
    }
    if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) {
      return NextResponse.json(
        { success: false, error: "Button URL must start with http:// or https://" },
        { status: 400 }
      );
    }

    const settings = await getStoreSettings();
    const recipients: string[] = testOnly
      ? [admin.email]
      : await backendClient.fetch(
          `*[_type == "subscription" && status == "active"].email`
        );

    const unique = [...new Set(recipients.map((e) => e.toLowerCase()))].slice(
      0,
      MAX_RECIPIENTS
    );
    if (unique.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active subscribers to send to" },
        { status: 400 }
      );
    }

    let delivered = 0;
    let failed = 0;
    const queue = [...unique];
    const worker = async () => {
      while (queue.length) {
        const email = queue.shift()!;
        const unsubscribeUrl = signedUnsubscribeUrl(email);
        const result = await sendMail({
          email,
          subject: testOnly ? `[TEST] ${subject}` : subject,
          text: `${heading}\n\n${message}${ctaUrl ? `\n\n${ctaText || "Learn more"}: ${ctaUrl}` : ""}\n\nUnsubscribe: ${unsubscribeUrl}`,
          html: buildHtml({
            storeName: settings.storeName,
            accent: settings.accentColor,
            heading,
            message,
            ctaText,
            ctaUrl,
            unsubscribeUrl,
          }),
        });
        if (result.success) delivered++;
        else failed++;
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    if (!testOnly) {
      await backendClient.create({
        _id: privateId("emailCampaign"),
        _type: "emailCampaign",
        subject,
        heading,
        message,
        ctaText,
        ctaUrl,
        recipients: unique.length,
        delivered,
        failed,
        sentBy: admin.email,
        sentAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: delivered > 0,
      recipients: unique.length,
      delivered,
      failed,
      ...(delivered === 0 && {
        error: "No emails could be sent. Check the email (Gmail OAuth) settings in .env",
      }),
    });
  } catch (error) {
    console.error("Campaign send failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send campaign" },
      { status: 500 }
    );
  }
}
