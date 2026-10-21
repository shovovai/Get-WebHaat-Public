"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApplicationSuccessNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  type: "premium" | "business";
  userName?: string;
}

export default function ApplicationSuccessNotification({
  isVisible,
  onClose,
  type,
  userName = "User",
}: ApplicationSuccessNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const config = {
      premium: {
      title: "🎉 Premium Application Submitted!",
      subtitle: `Congratulations ${userName}!`,
      description:
        "Your premium account application has been successfully submitted and is now under administrative review.",
      bgColor: "from-amber-500 to-yellow-500",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      benefits: [
        "Exclusive premium features access",
        "Priority customer support",
        "Enhanced rewards program",
      ],
    },
    business: {
      title: "🚀 Business Application Submitted!",
      subtitle: `Excellent choice ${userName}!`,
      description:
        "Your business account application has been submitted and is under review for approval.",
      bgColor: "from-blue-500 to-indigo-500",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      benefits: [
        "2% additional discount on all orders",
        "Priority business support",
        "Bulk order management",
        "Professional invoicing",
      ],
    },
  };

  const currentConfig = config[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`max-w-lg w-full bg-white rounded-2xl shadow-2xl border border-gray-200 transform transition-all duration-500 ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Header with gradient */}
        <div
          className={`p-6 bg-gradient-to-r ${currentConfig.bgColor} text-white rounded-t-2xl relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 opacity-20">
            <Sparkles className="w-24 h-24" />
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className={`${currentConfig.iconBg} p-3 rounded-full`}>
              <CheckCircle className={`w-8 h-8 ${currentConfig.iconColor}`} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{currentConfig.title}</h3>
              <p className="text-white/90">{currentConfig.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">{currentConfig.description}</p>

          {/* Status indicator */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            <span className="text-amber-800 font-medium text-sm">
              Status: Pending Review
            </span>
          </div>

          {/* What's next */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">
              What happens next?
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                • Admin team will review your application within 24-48 hours
              </li>
              <li>
                • You&apos;ll receive an email notification once status changes
              </li>
              <li>• Upon approval, benefits will be activated immediately</li>
            </ul>
          </div>

          {/* Benefits preview */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">
              {type === "premium" ? "Premium" : "Business"} Benefits (Upon
              Approval):
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {currentConfig.benefits.map((benefit, index) => (
                <li key={index}>• {benefit}</li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              className="flex-1 bg-gray-900 hover:bg-gray-800"
            >
              Continue to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
