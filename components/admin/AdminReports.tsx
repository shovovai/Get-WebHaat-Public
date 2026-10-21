"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Repeat,
  ShoppingBag,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportData {
  currencySymbol: string;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    uniqueCustomers: number;
    repeatCustomers: number;
    repeatRate: number;
    avgOrderValue: number;
    avgCustomerValue: number;
    newCustomers: number;
  };
  segments: { oneTime: number; returning: number; loyal: number };
  topCustomers: { name: string; email: string; orders: number; spent: number; lastOrder: string }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  monthly: { month: string; revenue: number; orders: number; newCustomers: number }[];
  statusBreakdown: { name: string; value: number }[];
  paymentBreakdown: { name: string; value: number }[];
  topCities: { name: string; value: number }[];
}

const EXPORT_TYPES = [
  { type: "orders", label: "Orders", hint: "All orders with items, totals & address", dated: true },
  { type: "customers", label: "Customers", hint: "Registered users, spend & points", dated: true },
  { type: "products", label: "Products", hint: "Catalog with price, stock & rating", dated: false },
  { type: "subscribers", label: "Newsletter Subscribers", hint: "Emails, status & source", dated: true },
  { type: "reviews", label: "Reviews", hint: "Product reviews & moderation status", dated: true },
];

const ACCENT = "#0a0a0a";

const pretty = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function BreakdownList({ title, items }: { title: string; items: { name: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <h3 className="mb-4 font-semibold text-gray-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No data</p>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-700">{pretty(i.name)}</span>
                <span className="font-medium tabular-nums text-gray-900">{i.value}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${(i.value / max) * 100}%`, background: ACCENT }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminReports() {
  const [range, setRange] = useState("365");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?range=${range}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      setData(json);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const money = (n: number) =>
    `${data?.currencySymbol ?? "$"}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportUrl = (type: string, dated: boolean) => {
    const params = new URLSearchParams({ type });
    if (dated && from) params.set("from", from);
    if (dated && to) params.set("to", to);
    return `/api/admin/export?${params}`;
  };

  const s = data?.summary;
  const kpis = s
    ? [
        { label: "Revenue", value: money(s.totalRevenue), sub: `${s.completedOrders} valid orders`, icon: Wallet },
        { label: "Customers", value: s.uniqueCustomers.toLocaleString(), sub: `${s.newCustomers} new in period`, icon: Users },
        { label: "Repeat rate", value: `${s.repeatRate.toFixed(1)}%`, sub: `${s.repeatCustomers} returning customers`, icon: Repeat },
        { label: "Avg order value", value: money(s.avgOrderValue), sub: `${s.totalOrders} total orders`, icon: ShoppingBag },
        { label: "Avg customer value", value: money(s.avgCustomerValue), sub: "Revenue per customer", icon: UserPlus },
      ]
    : [];

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Customer Insights & Reports</h2>
          <p className="text-sm text-gray-500">
            Built from your order history. Cancelled and failed deliveries are excluded from revenue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Building report…
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-gray-200 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                  <k.icon className="h-4 w-4" /> {k.label}
                </div>
                <p className="text-2xl font-bold tabular-nums text-gray-900">{k.value}</p>
                <p className="mt-1 text-xs text-gray-500">{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-5">
              <h3 className="mb-4 font-semibold text-gray-900">Revenue — last 12 months</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthly} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={false} width={60} />
                    <Tooltip formatter={(v) => money(Number(v))} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke={ACCENT} fill={ACCENT} fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-5">
              <h3 className="mb-4 font-semibold text-gray-900">New customers per month</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={false} width={40} />
                    <Tooltip />
                    <Bar dataKey="newCustomers" name="New customers" fill={ACCENT} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <BreakdownList
              title="Customer segments"
              items={[
                { name: "One-time (1 order)", value: data.segments.oneTime },
                { name: "Returning (2–4 orders)", value: data.segments.returning },
                { name: "Loyal (5+ orders)", value: data.segments.loyal },
              ]}
            />
            <BreakdownList title="Orders by status" items={data.statusBreakdown} />
            <BreakdownList title="Top cities" items={data.topCities} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <h3 className="border-b border-gray-200 p-4 font-semibold text-gray-900">Top customers</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Customer</th>
                      <th className="px-4 py-2 text-right font-medium">Orders</th>
                      <th className="px-4 py-2 text-right font-medium">Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCustomers.map((c) => (
                      <tr key={c.email} className="border-t border-gray-100">
                        <td className="px-4 py-2">
                          <p className="font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.email}</p>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{c.orders}</td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums">{money(c.spent)}</td>
                      </tr>
                    ))}
                    {data.topCustomers.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No orders in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <h3 className="border-b border-gray-200 p-4 font-semibold text-gray-900">Top products</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Product</th>
                      <th className="px-4 py-2 text-right font-medium">Units</th>
                      <th className="px-4 py-2 text-right font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p) => (
                      <tr key={p.name} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{p.quantity}</td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums">{money(p.revenue)}</td>
                      </tr>
                    ))}
                    {data.topProducts.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No sales in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Export */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <FileSpreadsheet className="h-5 w-5" /> Export data (Excel / CSV)
            </h3>
            <p className="text-sm text-gray-500">
              Files open directly in Excel, Google Sheets or Numbers. Date filter applies where relevant.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="exp-from" className="text-xs">From</Label>
              <Input id="exp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="exp-to" className="text-xs">To</Label>
              <Input id="exp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {EXPORT_TYPES.map((e) => (
            <a
              key={e.type}
              href={exportUrl(e.type, e.dated)}
              className="group rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-gray-900">{e.label}</span>
                <Download className="h-4 w-4 text-gray-400 group-hover:text-gray-700" />
              </div>
              <p className="text-xs text-gray-500">{e.hint}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
