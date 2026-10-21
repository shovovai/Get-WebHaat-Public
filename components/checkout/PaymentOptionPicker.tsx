"use client";

import { useState } from "react";
import { Banknote, Check, Copy, CreditCard, Landmark, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { PaymentOption } from "@/lib/paymentConfig";
import { formatPrice } from "@/lib/storeConfig";
import { cn } from "@/lib/utils";

export interface ManualInput {
  senderNumber: string;
  transactionId: string;
}

const PROVIDER_STYLE: Record<string, { bg: string; text: string; name: string }> = {
  bkash: { bg: "bg-[#e2136e]", text: "text-white", name: "bKash" },
  nagad: { bg: "bg-[#f6921e]", text: "text-white", name: "Nagad" },
  rocket: { bg: "bg-[#8c3494]", text: "text-white", name: "Rocket" },
  upay: { bg: "bg-[#0a5eb0]", text: "text-white", name: "Upay" },
};

function OptionIcon({ option, active }: { option: PaymentOption; active: boolean }) {
  const provider = option.kind === "manual" ? option.provider : option.method;
  const brandStyle = provider ? PROVIDER_STYLE[provider] : undefined;
  if (brandStyle) {
    return (
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold", brandStyle.bg, brandStyle.text)}>
        {brandStyle.name}
      </span>
    );
  }
  const Icon =
    option.method === "cash_on_delivery"
      ? Banknote
      : option.method === "stripe"
        ? CreditCard
        : option.provider === "bank"
          ? Landmark
          : option.kind === "manual"
            ? Wallet
            : Smartphone;
  return (
    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", active ? "bg-clay text-white" : "bg-sand text-ink")}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

interface Props {
  options: PaymentOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Amount the customer must send for manual payments */
  amount?: number;
  manual: ManualInput;
  onManualChange: (value: ManualInput) => void;
}

export default function PaymentOptionPicker({ options, selectedId, onSelect, amount, manual, onManualChange }: Props) {
  const [copied, setCopied] = useState(false);
  const selected = options.find((o) => o.id === selectedId);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Number copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (options.length === 0) {
    return <p className="rounded-2xl bg-sand p-4 text-sm text-light-color">No payment methods are available right now.</p>;
  }

  return (
    <div className="grid gap-3">
      {options.map((o) => {
        const active = o.id === selectedId;
        return (
          <div key={o.id} className={cn("rounded-2xl border-2 transition-colors", active ? "border-clay bg-clay/5" : "border-border hover:border-ink/30")}>
            <button type="button" onClick={() => onSelect(o.id)} className="flex w-full items-center gap-4 p-4 text-left">
              <OptionIcon option={o} active={active} />
              <span className="flex-1">
                <span className="block font-semibold text-ink">
                  {o.label}
                </span>
                <span className="block text-sm text-light-color">{o.description}</span>
              </span>
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2", active ? "border-clay" : "border-border")}>
                {active && <span className="h-2.5 w-2.5 rounded-full bg-clay" />}
              </span>
            </button>

            {active && o.kind === "manual" && (
              <div className="space-y-4 border-t border-clay/20 px-4 pb-4 pt-4">
                <ol className="space-y-2 text-sm text-ink">
                  <li>
                    1. Open your {PROVIDER_STYLE[o.provider || ""]?.name || "payment"} app and choose{" "}
                    <b>{o.accountType === "merchant" ? "Payment" : o.accountType === "agent" ? "Cash Out" : o.provider === "bank" ? "Transfer" : "Send Money"}</b>.
                  </li>
                  <li className="flex flex-wrap items-center gap-2">
                    2. Send
                    {amount !== undefined && (
                      <b className="rounded-md bg-marigold/25 px-2 py-0.5 tabular-nums">{formatPrice(amount)}</b>
                    )}
                    to
                    <button
                      type="button"
                      onClick={() => copy(o.accountNumber || "")}
                      className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 font-mono font-bold text-ink ring-1 ring-border hover:ring-clay"
                    >
                      {o.accountNumber}
                      {copied ? <Check className="h-3.5 w-3.5 text-sage" /> : <Copy className="h-3.5 w-3.5 text-light-color" />}
                    </button>
                  </li>
                  <li>3. Enter the number you paid from and the Transaction ID (TrxID) below.</li>
                </ol>
                {o.instructions && (
                  <p className="whitespace-pre-line rounded-xl bg-white p-3 text-xs text-light-color ring-1 ring-border">{o.instructions}</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-ink">
                      {o.provider === "bank" || o.provider === "other" ? "Your account / reference" : "Your number"}
                    </span>
                    <input
                      value={manual.senderNumber}
                      onChange={(e) => onManualChange({ ...manual, senderNumber: e.target.value })}
                      inputMode={o.provider === "bank" || o.provider === "other" ? "text" : "tel"}
                      placeholder={o.provider === "bank" || o.provider === "other" ? "Account name or number" : "01XXXXXXXXX"}
                      className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus:border-clay"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-ink">Transaction ID</span>
                    <input
                      value={manual.transactionId}
                      onChange={(e) => onManualChange({ ...manual, transactionId: e.target.value.toUpperCase() })}
                      placeholder="e.g. 9BC4D7XK2P"
                      className="h-11 w-full rounded-xl border border-border bg-white px-3 font-mono uppercase outline-none focus:border-clay"
                    />
                  </label>
                </div>
                <p className="text-xs text-light-color">
                  We&apos;ll confirm your payment shortly and notify you. Your order is saved as soon as you submit.
                </p>
              </div>
            )}
          </div>
        );
      })}
      {selected?.kind === "gateway" && (
        <p className="text-xs text-light-color">You&apos;ll be taken to {selected.label} to complete the payment securely.</p>
      )}
    </div>
  );
}
