"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/storeConfig";

interface PaymentRow {
  _id: string;
  orderNumber: string;
  customerName?: string;
  email?: string;
  totalPrice: number;
  paymentStatus: string;
  orderDate: string;
  manualPayment: {
    provider?: string;
    accountLabel?: string;
    accountNumber?: string;
    senderNumber?: string;
    transactionId?: string;
    submittedAt?: string;
    verifiedBy?: string;
    verifiedAt?: string;
    rejectionReason?: string;
  };
}

const STATUS_STYLE: Record<string, string> = {
  awaiting_verification: "bg-amber-50 text-amber-800",
  paid: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
};

export default function AdminPaymentVerifications({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [filter, setFilter] = useState<"awaiting" | "all">("awaiting");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/verifications?status=${filter}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.payments);
      onCountChange?.(data.awaitingCount);
    } catch {
      toast.error("Could not load payments");
    } finally {
      setLoading(false);
    }
  }, [filter, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (row: PaymentRow, action: "approve" | "reject") => {
    let reason = "";
    if (action === "reject") {
      const input = window.prompt(
        `Reject payment for ${row.orderNumber}? Tell the customer why (optional):`,
        "Transaction ID not found"
      );
      if (input === null) return;
      reason = input;
    } else if (
      !window.confirm(
        `Approve ${formatPrice(row.totalPrice)} from ${row.manualPayment.senderNumber} (TrxID ${row.manualPayment.transactionId})?\n\nOnly approve after you see this transaction in your ${row.manualPayment.accountLabel} account.`
      )
    ) {
      return;
    }
    setBusyId(row._id);
    try {
      const res = await fetch("/api/admin/payments/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: row._id, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === "approve" ? "Payment approved — customer notified" : "Payment rejected — customer notified");
      load();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-gray-200 p-1 text-sm">
          {(["awaiting", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 font-medium ${filter === f ? "bg-gray-900 text-white" : "text-gray-600"}`}
            >
              {f === "awaiting" ? "Awaiting verification" : "All manual payments"}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-14 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
          <p className="font-medium text-gray-900">
            {filter === "awaiting" ? "No payments waiting — all caught up" : "No manual payments yet"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Paid to</th>
                <th className="px-4 py-3 font-medium">Sender</th>
                <th className="px-4 py-3 font-medium">TrxID</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3">
                    <Link href="/admin/orders" className="font-semibold text-gray-900 hover:underline">
                      {r.orderNumber}
                    </Link>
                    <p className="text-xs text-gray-500">{r.customerName || r.email}</p>
                    <p className="text-xs text-gray-400">
                      {r.manualPayment.submittedAt && new Date(r.manualPayment.submittedAt).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{formatPrice(r.totalPrice)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.manualPayment.accountLabel}</p>
                    <p className="font-mono text-xs text-gray-500">{r.manualPayment.accountNumber}</p>
                  </td>
                  <td className="px-4 py-3 font-mono">{r.manualPayment.senderNumber}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(r.manualPayment.transactionId || "").catch(() => {});
                        toast.success("TrxID copied");
                      }}
                      className="inline-flex items-center gap-1 font-mono font-semibold hover:text-gray-600"
                    >
                      {r.manualPayment.transactionId} <Copy className="h-3 w-3" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[r.paymentStatus] || "bg-gray-100 text-gray-700"}`}>
                      {r.paymentStatus === "awaiting_verification" ? "Awaiting" : r.paymentStatus === "failed" ? "Rejected" : r.paymentStatus}
                    </span>
                    {r.manualPayment.verifiedBy && (
                      <p className="mt-1 text-xs text-gray-400">by {r.manualPayment.verifiedBy}</p>
                    )}
                    {r.manualPayment.rejectionReason && r.paymentStatus === "failed" && (
                      <p className="mt-1 text-xs text-red-600">{r.manualPayment.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.paymentStatus === "awaiting_verification" && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => review(r, "approve")} disabled={busyId === r._id}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => review(r, "reject")} disabled={busyId === r._id}>
                          <XCircle className="mr-1 h-4 w-4 text-red-600" /> Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-gray-500">
        Tip: check each TrxID and amount in your bKash / Nagad / bank app before approving. A transaction ID can only be used for one order.
      </p>
    </div>
  );
}
