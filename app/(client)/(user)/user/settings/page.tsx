"use client";

import { useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Bell, Download, KeyRound, Loader2, Shield, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import NewsletterSubscription from "@/components/profile/NewsletterSubscription";

export default function UserSettingsPage() {
  const { openUserProfile, signOut } = useClerk();
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/user/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.settings) setOrderUpdates(d.settings.orderUpdates);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const changeOrderUpdates = async (value: boolean) => {
    setOrderUpdates(value);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderUpdates: value }),
      });
      if (!response.ok) throw new Error();
      toast.success("Settings saved");
    } catch {
      setOrderUpdates(!value);
      toast.error("Failed to update settings");
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/user/export-data");
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-data.json";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Your data has been downloaded");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Delete your account permanently?\n\nYour login, saved addresses and newsletter subscription will be removed. Past orders are kept for our records. This cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/user/delete-account", { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || "Failed to delete account");
        return;
      }
      toast.success("Your account has been deleted");
      await signOut({ redirectUrl: "/" });
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your notifications, security and data</p>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Choose what we notify you about</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="order-updates">Order status alerts</Label>
              <p className="text-sm text-gray-500">
                Get a notification when your order is confirmed, shipped or delivered
              </p>
            </div>
            <Switch
              id="order-updates"
              checked={orderUpdates}
              disabled={!loaded}
              onCheckedChange={changeOrderUpdates}
            />
          </div>
        </CardContent>
      </Card>

      <NewsletterSubscription />

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Password, two-step verification and signed-in devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Sign-in &amp; security</Label>
              <p className="text-sm text-gray-500">
                Change your password, turn on two-step verification or sign out other devices
              </p>
            </div>
            <Button variant="outline" onClick={() => openUserProfile()}>
              <KeyRound className="mr-2 h-4 w-4" />
              Manage
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="mr-2 h-5 w-5" />
            Your data
          </CardTitle>
          <CardDescription>Download or delete your account data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Export data</Label>
              <p className="text-sm text-gray-500">
                Download your profile, orders, addresses and reviews as a file
              </p>
            </div>
            <Button variant="outline" onClick={handleExportData} disabled={exporting}>
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export
            </Button>
          </div>

          <Separator />

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start space-x-3">
              <Trash2 className="mt-0.5 h-5 w-5 text-red-500" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Delete account</h3>
                <p className="mt-1 text-sm text-red-700">
                  Removes your login, saved addresses and newsletter subscription. Past orders are
                  kept for our records. This cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete account
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
