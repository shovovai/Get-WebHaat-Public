import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ClipboardList, ShieldAlert } from "lucide-react";
import Container from "@/components/Container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmployeeOrderManagement from "@/components/admin/EmployeeOrderManagement";
import EmployeeAnalyticsDashboard from "@/components/admin/EmployeeAnalyticsDashboard";
import { getCurrentEmployee } from "@/actions/employeeActions";
import { getRoleDisplayName } from "@/types/employee";

export const metadata: Metadata = {
  title: "Employee Dashboard",
  robots: { index: false },
};

export default async function EmployeePage() {
  const employee = await getCurrentEmployee();

  if (!employee || employee.status !== "active") {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-amber-500" />
          <h1 className="mb-2 text-xl font-semibold text-gray-900">
            {employee ? `Your employee account is ${employee.status}` : "No employee role assigned"}
          </h1>
          <p className="mb-6 text-sm text-gray-600">
            {employee
              ? "Please contact your store administrator to re-activate your account."
              : "An administrator can assign you a role (Call Center, Packer, Warehouse, Delivery, Accounts or In-charge) from Admin → Employees."}
          </p>
          <Link href="/" className="text-sm font-medium text-shop_dark_green hover:underline">
            ← Back to store
          </Link>
        </div>
      </Container>
    );
  }

  const canSeeAnalytics = employee.role === "incharge" || employee.role === "accounts";

  return (
    <Container className="py-8">
      <div className="mb-6">
        <p className="text-sm text-gray-500">Employee Dashboard</p>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {employee.firstName || employee.email}
        </h1>
        <span className="mt-2 inline-block rounded-full bg-shop_dark_green/10 px-3 py-1 text-xs font-semibold text-shop_dark_green">
          {getRoleDisplayName(employee.role)}
        </span>
      </div>

      {canSeeAnalytics ? (
        <Tabs defaultValue="orders">
          <TabsList className="mb-4">
            <TabsTrigger value="orders">
              <ClipboardList className="mr-2 h-4 w-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-2 h-4 w-4" /> Team Analytics
            </TabsTrigger>
          </TabsList>
          <TabsContent value="orders">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <EmployeeOrderManagement />
            </div>
          </TabsContent>
          <TabsContent value="analytics">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <EmployeeAnalyticsDashboard />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <EmployeeOrderManagement />
        </div>
      )}
    </Container>
  );
}
