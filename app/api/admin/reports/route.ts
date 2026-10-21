import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getStoreSettings } from "@/lib/storeSettings";
import { backendClient } from "@/sanity/lib/backendClient";

export const dynamic = "force-dynamic";

interface ReportOrder {
  _id: string;
  orderNumber?: string;
  customerName?: string;
  email?: string;
  totalPrice?: number;
  status?: string;
  paymentMethod?: string;
  orderDate?: string;
  city?: string;
  products?: {
    quantity?: number;
    productId?: string;
    name?: string;
    price?: number;
  }[];
}

const EXCLUDED_STATUSES = new Set(["cancelled", "failed_delivery"]);

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// GET /api/admin/reports?range=30|90|365|all
// Customer insights computed from orders stored in Sanity.
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const range = request.nextUrl.searchParams.get("range") || "365";
    const days = range === "all" ? null : Math.max(1, Number(range) || 365);
    const since = days
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      : null;

    const allOrders = await backendClient.fetch<ReportOrder[]>(
      `*[_type == "order"] | order(orderDate asc) {
        _id,
        orderNumber,
        customerName,
        email,
        totalPrice,
        status,
        paymentMethod,
        orderDate,
        "city": address.city,
        products[]{
          quantity,
          "productId": product->_id,
          "name": product->name,
          "price": product->price
        }
      }`
    );

    // First order date per customer across ALL time (to detect "new" customers)
    const firstOrderAt = new Map<string, Date>();
    for (const o of allOrders) {
      if (!o.email || !o.orderDate) continue;
      const key = o.email.toLowerCase();
      const d = new Date(o.orderDate);
      const prev = firstOrderAt.get(key);
      if (!prev || d < prev) firstOrderAt.set(key, d);
    }

    const orders = allOrders.filter(
      (o) => !since || (o.orderDate && new Date(o.orderDate) >= since)
    );
    const revenueOrders = orders.filter(
      (o) => !EXCLUDED_STATUSES.has(o.status || "")
    );

    // ---- Customers ----
    const customers = new Map<
      string,
      { name: string; email: string; orders: number; spent: number; lastOrder: string }
    >();
    for (const o of revenueOrders) {
      if (!o.email) continue;
      const key = o.email.toLowerCase();
      const c = customers.get(key) || {
        name: o.customerName || o.email,
        email: o.email,
        orders: 0,
        spent: 0,
        lastOrder: o.orderDate || "",
      };
      c.orders += 1;
      c.spent += o.totalPrice || 0;
      if ((o.orderDate || "") > c.lastOrder) c.lastOrder = o.orderDate || "";
      customers.set(key, c);
    }

    const customerList = [...customers.values()];
    const totalRevenue = revenueOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const uniqueCustomers = customerList.length;
    const repeatCustomers = customerList.filter((c) => c.orders > 1).length;

    const segments = {
      oneTime: customerList.filter((c) => c.orders === 1).length,
      returning: customerList.filter((c) => c.orders >= 2 && c.orders <= 4).length,
      loyal: customerList.filter((c) => c.orders >= 5).length,
    };

    const topCustomers = customerList
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 10)
      .map((c) => ({ ...c, spent: Math.round(c.spent * 100) / 100 }));

    // ---- Monthly trend (last 12 months, independent of range) ----
    const monthly: Record<
      string,
      { month: string; revenue: number; orders: number; newCustomers: number }
    > = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      monthly[key] = {
        month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
        revenue: 0,
        orders: 0,
        newCustomers: 0,
      };
    }
    for (const o of allOrders) {
      if (!o.orderDate || EXCLUDED_STATUSES.has(o.status || "")) continue;
      const bucket = monthly[monthKey(new Date(o.orderDate))];
      if (!bucket) continue;
      bucket.revenue += o.totalPrice || 0;
      bucket.orders += 1;
    }
    for (const d of firstOrderAt.values()) {
      const bucket = monthly[monthKey(d)];
      if (bucket) bucket.newCustomers += 1;
    }

    // ---- Products ----
    const products = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const o of revenueOrders) {
      for (const p of o.products || []) {
        if (!p.productId) continue;
        const entry = products.get(p.productId) || {
          name: p.name || "Unknown product",
          quantity: 0,
          revenue: 0,
        };
        const qty = p.quantity || 1;
        entry.quantity += qty;
        entry.revenue += (p.price || 0) * qty;
        products.set(p.productId, entry);
      }
    }
    const topProducts = [...products.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // ---- Breakdowns ----
    const count = (key: (o: ReportOrder) => string | undefined) => {
      const map: Record<string, number> = {};
      for (const o of orders) {
        const k = key(o) || "unknown";
        map[k] = (map[k] || 0) + 1;
      }
      return Object.entries(map)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    };

    return NextResponse.json({
      success: true,
      currencySymbol: (await getStoreSettings()).currencySymbol,
      range,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders: orders.length,
        completedOrders: revenueOrders.length,
        uniqueCustomers,
        repeatCustomers,
        repeatRate: uniqueCustomers ? (repeatCustomers / uniqueCustomers) * 100 : 0,
        avgOrderValue: revenueOrders.length ? totalRevenue / revenueOrders.length : 0,
        avgCustomerValue: uniqueCustomers ? totalRevenue / uniqueCustomers : 0,
        newCustomers: since
          ? [...firstOrderAt.values()].filter((d) => d >= since).length
          : firstOrderAt.size,
      },
      segments,
      topCustomers,
      topProducts,
      monthly: Object.values(monthly),
      statusBreakdown: count((o) => o.status),
      paymentBreakdown: count((o) => o.paymentMethod),
      topCities: count((o) => o.city).slice(0, 8),
    });
  } catch (error) {
    console.error("Error building reports:", error);
    return NextResponse.json(
      { success: false, error: "Failed to build reports" },
      { status: 500 }
    );
  }
}
