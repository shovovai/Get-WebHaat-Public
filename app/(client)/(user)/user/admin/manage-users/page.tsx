"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Crown, Building2 } from "lucide-react";

export default function AdminUserManagement() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetPremium = async (setPremium: boolean) => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/manage-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          setPremium,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setEmail(""); // Clear the input
      } else {
        toast.error(data.error || "Failed to manage user");
      }
    } catch (error) {
      console.error("Error managing user:", error);
      toast.error("Error managing user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin User Management
        </h1>
        <p className="text-gray-600">
          Manage user premium status and account settings
        </p>
      </div>

      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Premium Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => handleSetPremium(true)}
                disabled={loading}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                {loading ? "Processing..." : "Set as Premium User"}
              </Button>

              <Button
                onClick={() => handleSetPremium(false)}
                disabled={loading}
                variant="outline"
              >
                <User className="w-4 h-4 mr-2" />
                {loading ? "Processing..." : "Set as Standard User"}
              </Button>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Premium User:</strong> isActive = true, gets premium
                features
              </p>
              <p>
                <strong>Standard User:</strong> isActive = false, basic features
                only
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
