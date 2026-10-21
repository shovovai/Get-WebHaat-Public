"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, Mail, Send, TestTube2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Campaign {
  _id: string;
  subject: string;
  recipients: number;
  delivered: number;
  failed: number;
  sentBy: string;
  sentAt: string;
}

const EMPTY = { subject: "", heading: "", message: "", ctaText: "", ctaUrl: "" };

export default function AdminEmailCampaign() {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState<"test" | "all" | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/subscriptions/campaign", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setCampaigns(data.campaigns);
    } catch {
      // history is optional
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const update = (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const send = async (testOnly: boolean) => {
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    if (
      !testOnly &&
      !window.confirm("Send this campaign to ALL active subscribers now?")
    ) {
      return;
    }
    setSending(testOnly ? "test" : "all");
    try {
      const res = await fetch("/api/admin/subscriptions/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, testOnly }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to send");
        return;
      }
      if (testOnly) {
        toast.success("Test email sent to your admin address");
      } else {
        toast.success(
          `Campaign sent: ${data.delivered} delivered${data.failed ? `, ${data.failed} failed` : ""}`
        );
        setForm(EMPTY);
        loadHistory();
      }
    } catch {
      toast.error("Network error while sending");
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="grid gap-6 p-6 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-ink p-2">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Email Campaign</h2>
            <p className="text-sm text-gray-500">
              Send a newsletter to all active subscribers. Every email includes an
              unsubscribe link.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-subject">Subject *</Label>
            <Input id="c-subject" value={form.subject} onChange={update("subject")} placeholder="Weekend sale: 20% off everything" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-heading">Heading</Label>
            <Input id="c-heading" value={form.heading} onChange={update("heading")} placeholder="Defaults to the subject" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-message">Message *</Label>
          <Textarea
            id="c-message"
            rows={8}
            value={form.message}
            onChange={update("message")}
            placeholder={"Write your message here.\n\nLeave an empty line between paragraphs."}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-cta">Button text</Label>
            <Input id="c-cta" value={form.ctaText} onChange={update("ctaText")} placeholder="Shop now" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-url">Button link</Label>
            <Input id="c-url" value={form.ctaUrl} onChange={update("ctaUrl")} placeholder="https://your-store.com/deal" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => send(true)} disabled={!!sending}>
            {sending === "test" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
            Send test to me
          </Button>
          <Button onClick={() => send(false)} disabled={!!sending}>
            {sending === "all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send to all subscribers
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
          <History className="h-4 w-4" /> Recent campaigns
        </h3>
        {campaigns.length === 0 ? (
          <p className="text-sm text-gray-500">No campaigns sent yet.</p>
        ) : (
          <ul className="space-y-3">
            {campaigns.map((c) => (
              <li key={c._id} className="rounded-lg bg-gray-50 p-3">
                <p className="truncate text-sm font-medium text-gray-900">{c.subject}</p>
                <p className="text-xs text-gray-500">
                  {new Date(c.sentAt).toLocaleString()} · {c.delivered}/{c.recipients} delivered
                  {c.failed ? ` · ${c.failed} failed` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
