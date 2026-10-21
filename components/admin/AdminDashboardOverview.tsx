"use client";
import { formatPrice } from "@/lib/storeConfig";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  RefreshCw,
  UserCheck,
  Crown,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardOverviewSkeleton } from "@/components/admin/SkeletonLoaders";
import Link from "next/link";

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  revenueChange: number;
  ordersChange: number;
  usersChange: number;
  productsChange: number;
}

interface AccountRequestsSummary {
  pendingPremiumCount: number;
  pendingBusinessCount: number;
  totalPendingRequests: number;
  recentRequests: number;
}

const AdminDashboardOverview = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [accountRequests, setAccountRequests] =
    useState<AccountRequestsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);

      // Fetch both dashboard stats and account requests summary
      const [statsResponse, requestsResponse] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/account-requests-summary"),
      ]);

      if (!statsResponse.ok || !requestsResponse.ok) {
        throw new Error(
          `HTTP error! stats: ${statsResponse.status}, requests: ${requestsResponse.status}`
        );
      }

      const [statsData, requestsData] = await Promise.all([
        statsResponse.json(),
        requestsResponse.json(),
      ]);

      if (statsData.error || requestsData.error) {
        throw new Error(statsData.error || requestsData.error);
      }

      setStats(statsData);
      setAccountRequests(requestsData);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch stats"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Revenue",
      value: stats?.totalRevenue || 0,
      change: stats?.revenueChange || 0,
      icon: DollarSign,
      format: "currency",
      color: "from-green-500 to-emerald-600",
      href: "/admin/analytics",
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      change: stats?.ordersChange || 0,
      icon: ShoppingCart,
      format: "number",
      color: "from-gray-900 to-gray-900",
      href: "/admin/orders",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      change: stats?.usersChange || 0,
      icon: Users,
      format: "number",
      color: "from-gray-900 to-gray-900",
      href: "/admin/users",
    },
    {
      title: "Total Products",
      value: stats?.totalProducts || 0,
      change: stats?.productsChange || 0,
      icon: Package,
      format: "number",
      color: "from-orange-500 to-red-600",
      href: "/admin/products",
    },
  ];

  const quickActions = [
    {
      title: "View Analytics",
      description: "Detailed business insights",
      icon: TrendingUp,
      href: "/admin/analytics",
      color: "from-shop_light_green to-shop_dark_green",
    },
    {
      title: "Account Requests",
      description: `${
        accountRequests?.totalPendingRequests || 0
      } pending requests`,
      icon: UserCheck,
      href: "/admin/account-requests",
      color: "from-amber-500 to-orange-600",
      badge: accountRequests?.totalPendingRequests || 0,
    },
    {
      title: "Manage Orders",
      description: "Process and track orders",
      icon: ShoppingCart,
      href: "/admin/orders",
      color: "from-shop_light_blue to-shop_dark_blue",
    },
    {
      title: "User Management",
      description: "View and manage customers",
      icon: Users,
      href: "/admin/users",
      color: "from-shop_orange to-shop_light_orange",
    },
    {
      title: "Product Catalog",
      description: "Manage inventory",
      icon: Package,
      href: "/admin/products",
      color: "from-shop_light_pink to-shop_orange",
    },
  ];

  const formatValue = (value: number, format: string) => {
    if (format === "currency") {
      return `${formatPrice(value)}`;
    }
    return value.toLocaleString();
  };

  if (loading) {
    return <DashboardOverviewSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-500">{error}</p>
            <Button
              onClick={fetchStats}
              className="bg-red-600 hover:bg-red-700"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <h1 className="md:text-3xl font-bold text-dark-color flex items-center gap-3">
            <Activity className="w-8 h-8 text-shop_light_green" />
            Dashboard Overview
          </h1>
          <Button
            onClick={fetchStats}
            variant="outline"
            size="sm"
            className="ml-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        <p className="text-light-color text-sm md:text-lg">
          Monitor your business performance at a glance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change >= 0;

          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Link href={stat.href}>
                <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-shop_light_green/20 hover:border-shop_light_green/40 overflow-hidden">
                  <div className={`h-1 bg-gradient-to-r ${stat.color}`}></div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-light-color flex items-center justify-between">
                      {stat.title}
                      <Icon className="w-4 h-4" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold text-dark-color">
                      {formatValue(stat.value, stat.format)}
                    </div>
                    <div className="flex items-center gap-2">
                      {isPositive ? (
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                      )}
                      <Badge
                        variant={isPositive ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {isPositive ? "+" : ""}
                        {stat.change}%
                      </Badge>
                      <span className="text-xs text-light-color">
                        vs last month
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Account Requests Summary */}
      {accountRequests && accountRequests.totalPendingRequests > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-dark-color mb-2">
              Pending Account Requests
            </h2>
            <p className="text-light-color">
              Review and approve user account applications
            </p>
          </div>

          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-amber-900 mb-1">
                    {accountRequests.pendingPremiumCount}
                  </div>
                  <p className="text-sm text-amber-700">Premium Requests</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-900 to-gray-900 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {accountRequests.pendingBusinessCount}
                  </div>
                  <p className="text-sm text-gray-900">Business Requests</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-900 mb-1">
                    {accountRequests.recentRequests}
                  </div>
                  <p className="text-sm text-green-700">This Week</p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link href="/admin/account-requests">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                    <UserCheck className="w-4 h-4 mr-2" />
                    Review Requests
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark-color mb-2">
            Quick Actions
          </h2>
          <p className="text-light-color">Navigate to key admin sections</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;

            return (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link href={action.href}>
                  <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-shop_light_green/20 hover:border-shop_light_green/40 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                          >
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          {action.badge && action.badge > 0 && (
                            <Badge variant="destructive" className="bg-red-500">
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-dark-color group-hover:text-shop_dark_green transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-sm text-light-color">
                            {action.description}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start p-0 h-auto text-shop_light_green hover:text-shop_dark_green"
                        >
                          Access →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <Card className="border-shop_light_green/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-shop_light_green" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-light-color">
            <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Recent business activities will appear here</p>
            <p className="text-sm">
              Check individual sections for detailed information
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardOverview;
