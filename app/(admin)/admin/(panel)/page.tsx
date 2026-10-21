import type { Metadata } from "next";
import AdminDashboardOverview from "@/components/admin/AdminDashboardOverview";

export const metadata: Metadata = {
  title: "Dashboard - Admin Panel",
};

export default function AdminPage() {
  return <AdminDashboardOverview />;
}
