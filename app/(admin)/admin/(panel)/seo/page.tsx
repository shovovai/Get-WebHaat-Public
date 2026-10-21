import type { Metadata } from "next";
import AdminSeoSettings from "@/components/admin/AdminSeoSettings";

export const metadata: Metadata = { title: "SEO & Branding - Admin Panel" };

export default function AdminSeoPage() {
  return <AdminSeoSettings />;
}
