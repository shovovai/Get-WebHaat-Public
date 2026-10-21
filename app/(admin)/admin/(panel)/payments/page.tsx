import type { Metadata } from "next";
import AdminPayments from "@/components/admin/AdminPayments";

export const metadata: Metadata = { title: "Payments - Admin Panel" };

export default function AdminPaymentsPage() {
  return <AdminPayments />;
}
