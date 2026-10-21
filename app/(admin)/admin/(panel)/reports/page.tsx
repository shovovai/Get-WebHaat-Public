import type { Metadata } from "next";
import AdminReports from "@/components/admin/AdminReports";

export const metadata: Metadata = {
  title: "Reports & Export - Admin Panel",
};

export default function AdminReportsPage() {
  return <AdminReports />;
}
