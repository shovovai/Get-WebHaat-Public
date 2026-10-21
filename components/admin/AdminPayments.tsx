"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import AdminPaymentVerifications from "./AdminPaymentVerifications";
import AdminPaymentGateways from "./AdminPaymentGateways";

export default function AdminPayments() {
  const [tab, setTab] = useState<"verify" | "gateways">("verify");
  const [awaiting, setAwaiting] = useState<number | null>(null);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Payments</h2>
        <p className="text-sm text-gray-500">
          Verify manual payments and configure bKash, Nagad, SSLCommerz, Stripe and cash on delivery.
        </p>
      </div>
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {[
          { id: "verify" as const, label: "Verifications", count: awaiting },
          { id: "gateways" as const, label: "Gateways & methods", count: null },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium",
              tab === t.id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            {t.label}
            {!!t.count && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">{t.count}</span>
            )}
          </button>
        ))}
      </div>
      {tab === "verify" ? <AdminPaymentVerifications onCountChange={setAwaiting} /> : <AdminPaymentGateways />}
    </div>
  );
}
