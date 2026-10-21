"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Mail, Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { checkSubscriptionStatus } from "@/actions/subscriptionActions";

export default function NewsletterSubscription() {
  const { user } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();

  useEffect(() => {
    const checkStatus = async () => {
      if (!userEmail) {
        setIsLoading(false);
        return;
      }

      try {
        const status = await checkSubscriptionStatus();
        setIsSubscribed(status.subscribed);
      } catch (error) {
        console.error("Error checking subscription status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [userEmail]);

  const handleSubscribe = async () => {
    if (!userEmail) {
      toast.error("Email not found");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubscribed(true);
        toast.success(data.message || "Successfully subscribed to newsletter!");
      } else {
        if (data.alreadySubscribed) {
          setIsSubscribed(true);
          toast.info(data.error || "You're already subscribed!");
        } else {
          toast.error(data.error || "Failed to subscribe");
        }
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!userEmail) {
      toast.error("Email not found");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubscribed(false);
        toast.success(
          data.message || "Successfully unsubscribed from newsletter"
        );
      } else {
        toast.error(data.error || "Failed to unsubscribe");
      }
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Newsletter Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="mr-2 h-5 w-5" />
          Newsletter Subscription
        </CardTitle>
        <CardDescription>
          Manage your newsletter subscription preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50">
          <div className="flex items-center space-x-3">
            {isSubscribed ? (
              <>
                <div className="shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Subscribed to Newsletter
                  </p>
                  <p className="text-sm text-gray-600">{userEmail}</p>
                </div>
              </>
            ) : (
              <>
                <div className="shrink-0">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Not Subscribed</p>
                  <p className="text-sm text-gray-600">{userEmail}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Benefits Section */}
        {!isSubscribed && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 text-sm mb-3">
              Newsletter Benefits:
            </h4>
            <ul className="space-y-2 text-sm text-gray-900">
              <li className="flex items-start">
                <span className="mr-2">🎁</span>
                <span>Exclusive deals & discounts up to 50% off</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🚀</span>
                <span>Early access to new products</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">📦</span>
                <span>Free shipping offers</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">💡</span>
                <span>Shopping tips & trends</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🎂</span>
                <span>Birthday surprises</span>
              </li>
            </ul>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {isSubscribed ? (
            <Button
              variant="outline"
              onClick={handleUnsubscribe}
              disabled={isProcessing}
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unsubscribing...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Unsubscribe from Newsletter
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full bg-gray-900 hover:bg-gray-900"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subscribing...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Subscribe to Newsletter
                </>
              )}
            </Button>
          )}
        </div>

        {/* Info Text */}
        <p className="text-xs text-gray-500 text-center">
          {isSubscribed
            ? "You can resubscribe at any time"
            : "Join 50,000+ subscribers and never miss a deal"}
        </p>
      </CardContent>
    </Card>
  );
}
