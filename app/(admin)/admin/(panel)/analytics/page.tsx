import type { Metadata } from "next";
import AdminAnalytics from "@/components/admin/AdminAnalyticsNew";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics - Admin Panel",
};

export default function AdminAnalyticsPage() {
  return (
    <div>
      <AdminAnalytics />
      <div className="border-t border-gray-100 p-6">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
