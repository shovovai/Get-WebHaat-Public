import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Building2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface AccountRequestsOverviewProps {
  stats: {
    totalPremiumRequests: number;
    totalBusinessRequests: number;
    pendingPremiumRequests: number;
    pendingBusinessRequests: number;
    approvedPremiumRequests: number;
    approvedBusinessRequests: number;
    rejectedPremiumRequests: number;
    rejectedBusinessRequests: number;
  };
}

export default function AccountRequestsOverview({
  stats,
}: AccountRequestsOverviewProps) {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Premium Requests Overview */}
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-amber-800">
            Premium Requests
          </CardTitle>
          <Crown className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold text-amber-900">
            {stats.totalPremiumRequests}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-700">Pending:</span>
              <Badge
                variant="secondary"
                className="bg-amber-200 text-amber-800 text-xs"
              >
                <Clock className="w-3 h-3 mr-1" />
                {stats.pendingPremiumRequests}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-700">Approved:</span>
              <Badge className="bg-green-100 text-green-800 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                {stats.approvedPremiumRequests}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-700">Rejected:</span>
              <Badge
                variant="destructive"
                className="bg-red-100 text-red-800 text-xs"
              >
                <XCircle className="w-3 h-3 mr-1" />
                {stats.rejectedPremiumRequests}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Requests Overview */}
      <Card className="border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-gray-900">
            Business Requests
          </CardTitle>
          <Building2 className="h-4 w-4 text-gray-900" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalBusinessRequests}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-900">Pending:</span>
              <Badge
                variant="secondary"
                className="bg-gray-200 text-gray-900 text-xs"
              >
                <Clock className="w-3 h-3 mr-1" />
                {stats.pendingBusinessRequests}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-900">Approved:</span>
              <Badge className="bg-green-100 text-green-800 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                {stats.approvedBusinessRequests}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-900">Rejected:</span>
              <Badge
                variant="destructive"
                className="bg-red-100 text-red-800 text-xs"
              >
                <XCircle className="w-3 h-3 mr-1" />
                {stats.rejectedBusinessRequests}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Benefits Info */}
      <Card className="border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 sm:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Account Types & Benefits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-gray-900 text-sm">
                  Premium Account
                </span>
              </div>
              <ul className="text-xs text-gray-900 space-y-1 pl-1">
                <li>• Exclusive product access</li>
                <li>• Priority customer support</li>
                <li>• Early sale notifications</li>
                <li>• Enhanced reward points</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-900" />
                <span className="font-medium text-gray-900 text-sm">
                  Business Account
                </span>
              </div>
              <ul className="text-xs text-gray-900 space-y-1 pl-1">
                <li>• All Premium benefits</li>
                <li>• 2% additional discount</li>
                <li>• Bulk order capabilities</li>
                <li>• Dedicated account manager</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
