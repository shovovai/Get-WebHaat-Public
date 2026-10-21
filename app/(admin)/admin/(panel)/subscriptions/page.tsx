import type { Metadata } from "next";
import AdminEmailCampaign from "@/components/admin/AdminEmailCampaign";
import AdminSubscriptions from "@/components/admin/AdminSubscriptions";

export const metadata: Metadata = {
  title: "Email Marketing - Admin Panel",
  description: "Manage newsletter subscribers and send email campaigns",
};

export default function SubscriptionsPage() {
  return (
    <div>
      <AdminEmailCampaign />
      <div className="border-t border-gray-100">
        <AdminSubscriptions />
      </div>
    </div>
  );
}
