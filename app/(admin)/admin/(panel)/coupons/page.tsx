import type { Metadata } from "next";
import AdminCoupons from "@/components/admin/AdminCoupons";

export const metadata: Metadata = { title: "Coupons - Admin Panel" };

export default function AdminCouponsPage() {
  return <AdminCoupons />;
}
