import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

interface ExportDef {
  query: string;
  columns: { key: string; label: string }[];
  dateField?: string;
}

const EXPORTS: Record<string, ExportDef> = {
  orders: {
    dateField: "orderDate",
    query: `*[_type == "order" $DATE] | order(orderDate desc) {
      orderNumber, customerName, email, status, paymentStatus, paymentMethod,
      subtotal, tax, shipping, amountDiscount, totalPrice, currency, orderDate,
      "itemCount": count(products),
      "items": array::join(products[]{ "s": coalesce(product->name, "?") + " x" + string(coalesce(quantity, 1)) }.s, "; "),
      "address": address.address, "city": address.city, "state": address.state, "zip": address.zip
    }`,
    columns: [
      { key: "orderNumber", label: "Order #" },
      { key: "orderDate", label: "Date" },
      { key: "customerName", label: "Customer" },
      { key: "email", label: "Email" },
      { key: "status", label: "Status" },
      { key: "paymentStatus", label: "Payment Status" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "itemCount", label: "Items" },
      { key: "items", label: "Products" },
      { key: "subtotal", label: "Subtotal" },
      { key: "tax", label: "Tax" },
      { key: "shipping", label: "Shipping" },
      { key: "amountDiscount", label: "Discount" },
      { key: "totalPrice", label: "Total" },
      { key: "currency", label: "Currency" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zip", label: "Zip" },
    ],
  },
  customers: {
    dateField: "createdAt",
    query: `*[_type == "user" $DATE] | order(createdAt desc) {
      firstName, lastName, email, phone, createdAt, membershipType,
      premiumStatus, businessStatus, isBusiness, isEmployee, employeeRole,
      rewardPoints, loyaltyPoints, totalSpent, walletBalance,
      "orders": count(*[_type == "order" && email == ^.email])
    }`,
    columns: [
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "createdAt", label: "Joined" },
      { key: "orders", label: "Orders" },
      { key: "totalSpent", label: "Total Spent" },
      { key: "membershipType", label: "Membership" },
      { key: "premiumStatus", label: "Premium Status" },
      { key: "businessStatus", label: "Business Status" },
      { key: "isEmployee", label: "Employee" },
      { key: "employeeRole", label: "Employee Role" },
      { key: "rewardPoints", label: "Reward Points" },
      { key: "loyaltyPoints", label: "Loyalty Points" },
      { key: "walletBalance", label: "Wallet Balance" },
    ],
  },
  products: {
    query: `*[_type == "product"] | order(name asc) {
      name, "slug": slug.current, price, discount, stock, status, variant,
      isFeatured, averageRating, totalReviews,
      "brand": brand->title,
      "categories": array::join(categories[]->title, "; ")
    }`,
    columns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "price", label: "Price" },
      { key: "discount", label: "Discount %" },
      { key: "stock", label: "Stock" },
      { key: "status", label: "Status" },
      { key: "variant", label: "Variant" },
      { key: "brand", label: "Brand" },
      { key: "categories", label: "Categories" },
      { key: "isFeatured", label: "Featured" },
      { key: "averageRating", label: "Avg Rating" },
      { key: "totalReviews", label: "Reviews" },
    ],
  },
  subscribers: {
    dateField: "subscribedAt",
    query: `*[_type == "subscription" $DATE] | order(subscribedAt desc) {
      email, status, source, subscribedAt, unsubscribedAt
    }`,
    columns: [
      { key: "email", label: "Email" },
      { key: "status", label: "Status" },
      { key: "source", label: "Source" },
      { key: "subscribedAt", label: "Subscribed At" },
      { key: "unsubscribedAt", label: "Unsubscribed At" },
    ],
  },
  reviews: {
    dateField: "createdAt",
    query: `*[_type == "review" $DATE] | order(createdAt desc) {
      "product": product->name, "customer": user->email, rating, title,
      content, status, isVerifiedPurchase, helpful, createdAt
    }`,
    columns: [
      { key: "createdAt", label: "Date" },
      { key: "product", label: "Product" },
      { key: "customer", label: "Customer" },
      { key: "rating", label: "Rating" },
      { key: "title", label: "Title" },
      { key: "content", label: "Review" },
      { key: "status", label: "Status" },
      { key: "isVerifiedPurchase", label: "Verified" },
      { key: "helpful", label: "Helpful Votes" },
    ],
  },
};

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "object" ? JSON.stringify(value) : String(value);
  // Neutralise spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/admin/export?type=orders|customers|products|subscribers|reviews&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const params = request.nextUrl.searchParams;
    const type = params.get("type") || "";
    const def = EXPORTS[type];
    if (!def) {
      return NextResponse.json(
        { error: `Unknown export type. Use one of: ${Object.keys(EXPORTS).join(", ")}` },
        { status: 400 }
      );
    }

    const from = params.get("from");
    const to = params.get("to");
    const queryParams: Record<string, string> = {};
    let dateFilter = "";
    if (def.dateField && (from || to)) {
      if (from) {
        dateFilter += ` && dateTime(${def.dateField}) >= dateTime($from)`;
        queryParams.from = new Date(from).toISOString();
      }
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        dateFilter += ` && dateTime(${def.dateField}) <= dateTime($to)`;
        queryParams.to = end.toISOString();
      }
    }

    const rows = await backendClient.fetch<Row[]>(
      def.query.replace("$DATE", dateFilter),
      queryParams
    );

    const lines = [
      def.columns.map((c) => csvCell(c.label)).join(","),
      ...rows.map((row) => def.columns.map((c) => csvCell(row[c.key])).join(",")),
    ];
    // BOM so Excel opens UTF-8 correctly
    const csv = "﻿" + lines.join("\r\n");
    const filename = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
