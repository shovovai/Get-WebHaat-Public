import { Metadata } from "next";
import EmployeeManagement from "@/components/admin/EmployeeManagement";

export const metadata: Metadata = {
  title: "Employee Management | Admin",
  description: "Manage employee roles and permissions",
};

export default function EmployeeManagementPage() {
  return <EmployeeManagement />;
}
