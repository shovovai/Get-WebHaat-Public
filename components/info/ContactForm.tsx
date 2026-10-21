"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import TurnstileWidget, { TURNSTILE_SITE_KEY } from "@/components/TurnstileWidget";

const field =
  "h-14 w-full rounded-md border border-black/20 bg-white px-4 text-base text-ink outline-none transition-colors placeholder:text-light-color focus:border-ink";

/** Contact form → POST /api/contact */
export default function ContactForm() {
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Hidden honeypot (bots fill it) and the optional Turnstile token
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const ready = form.firstName.trim() && form.email.trim() && form.message.trim().length >= 5;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error("Please complete the security check first.");
      return;
    }
    setSending(true);
    try {
      const name = `${form.firstName} ${form.lastName}`.trim();
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: form.email,
          subject: `Message from ${name}`,
          message: form.phone ? `${form.message}\n\nPhone: ${form.phone}` : form.message,
          website,
          turnstileToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSent(true);
      setForm({ firstName: "", lastName: "", phone: "", email: "", message: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
      // Turnstile tokens are single-use: get a fresh widget for the next attempt
      if (TURNSTILE_SITE_KEY) {
        setTurnstileToken("");
        setTurnstileKey((k) => k + 1);
      }
    }
  };

  if (sent) {
    return (
      <div className="flex h-full flex-col items-start justify-center gap-3 py-10">
        <p className="text-2xl text-ink">Thank you — message sent.</p>
        <p className="text-base text-light-color">We&apos;ll get back to you soon.</p>
        <button onClick={() => setSent(false)} className="mt-2 text-base text-ink underline underline-offset-4">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="relative grid gap-4 sm:grid-cols-2">
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
      />
      <input className={field} placeholder="First name*" aria-label="First name" required maxLength={50} value={form.firstName} onChange={set("firstName")} />
      <input className={field} placeholder="Last name" aria-label="Last name" maxLength={50} value={form.lastName} onChange={set("lastName")} />
      <input className={field} placeholder="Phone number" aria-label="Phone number" type="tel" maxLength={30} value={form.phone} onChange={set("phone")} />
      <input className={field} placeholder="Email*" aria-label="Email" type="email" required maxLength={254} value={form.email} onChange={set("email")} />
      <textarea
        className={`${field} h-32 resize-y py-3 sm:col-span-2`}
        placeholder="Message*"
        aria-label="Message"
        required
        maxLength={4000}
        value={form.message}
        onChange={set("message")}
      />
      <TurnstileWidget key={turnstileKey} onToken={setTurnstileToken} className="sm:col-span-2" />
      <div>
        <button
          type="submit"
          disabled={!ready || sending}
          className="flex h-14 items-center gap-2 rounded-md bg-ink px-8 text-base font-medium text-white transition-colors hover:bg-black disabled:bg-[#d4d4d8] disabled:text-white"
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send message
        </button>
      </div>
    </form>
  );
}
