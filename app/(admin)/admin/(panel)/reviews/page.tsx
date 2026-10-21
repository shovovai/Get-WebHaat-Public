import type { Metadata } from "next";
import AdminReviews from "@/components/admin/AdminReviews";

export const metadata: Metadata = {
  title: "Review Management - Admin Panel",
};

export default function AdminReviewsPage() {
  return <AdminReviews />;
}
