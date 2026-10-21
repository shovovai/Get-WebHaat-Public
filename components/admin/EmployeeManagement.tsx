"use client";

import { useState, useEffect } from "react";
import {
  assignEmployeeRole,
  removeEmployeeRole,
  updateEmployeeStatus,
  getAllUsers,
  getAllEmployees,
} from "@/actions/employeeActions";
import {
  Employee,
  EmployeeRole,
  getRoleDisplayName,
  getRoleBadgeColor,
} from "@/types/employee";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  UserMinus,
  Ban,
  CheckCircle,
  Search,
  Filter,
  Users,
} from "lucide-react";

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmployee: boolean;
  employeeRole?: string;
  employeeStatus?: string;
  createdAt: string;
}

export default function EmployeeManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<EmployeeRole>("callcenter");
  const [suspensionReason, setSuspensionReason] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, employeesData] = await Promise.all([
        getAllUsers(),
        getAllEmployees(),
      ]);
      setUsers(usersData);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;

    const result = await assignEmployeeRole(selectedUser._id, selectedRole);

    if (result.success) {
      toast.success(result.message);
      setShowAssignDialog(false);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const handleRemoveRole = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this employee role?")) return;

    const result = await removeEmployeeRole(userId);

    if (result.success) {
      toast.success(result.message);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;

    const result = await updateEmployeeStatus(
      selectedUser._id,
      "suspended",
      suspensionReason
    );

    if (result.success) {
      toast.success(result.message);
      setShowSuspendDialog(false);
      setSuspensionReason("");
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const handleActivate = async (userId: string) => {
    const result = await updateEmployeeStatus(userId, "active");

    if (result.success) {
      toast.success(result.message);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === "all" || emp.role === filterRole;
    const matchesStatus = filterStatus === "all" || emp.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const nonEmployeeUsers = users.filter((u) => !u.isEmployee);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Employee Management</h1>
        <p className="text-gray-600">Manage employee roles and permissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
            <Users className="h-8 w-8 text-gray-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Call Center</p>
              <p className="text-2xl font-bold">
                {employees.filter((e) => e.role === "callcenter").length}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-gray-100"></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Packers</p>
              <p className="text-2xl font-bold">
                {employees.filter((e) => e.role === "packer").length}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-gray-100"></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delivery</p>
              <p className="text-2xl font-bold">
                {employees.filter((e) => e.role === "deliveryman").length}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-100"></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {employees.filter((e) => e.status === "active").length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="search">Search Employees</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="filterRole">Filter by Role</Label>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger id="filterRole">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="callcenter">Call Center</SelectItem>
                <SelectItem value="packer">Packer</SelectItem>
                <SelectItem value="deliveryman">Delivery Man</SelectItem>
                <SelectItem value="incharge">In-Charge</SelectItem>
                <SelectItem value="accounts">Accounts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filterStatus">Filter by Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="filterStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Current Employees</h2>
          <Button
            onClick={() => {
              setSelectedUser(null);
              setShowAssignDialog(true);
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getRoleBadgeColor(employee.role)}>
                        {getRoleDisplayName(employee.role)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          employee.status === "active"
                            ? "default"
                            : employee.status === "suspended"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {employee.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.performance ? (
                        <div>
                          <div>
                            Processed:{" "}
                            {employee.performance.ordersProcessed || 0}
                          </div>
                          {employee.role === "callcenter" && (
                            <div>
                              Confirmed:{" "}
                              {employee.performance.ordersConfirmed || 0}
                            </div>
                          )}
                          {employee.role === "packer" && (
                            <div>
                              Packed: {employee.performance.ordersPacked || 0}
                            </div>
                          )}
                          {employee.role === "deliveryman" && (
                            <div>
                              Delivered:{" "}
                              {employee.performance.ordersDelivered || 0}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">No data</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>
                          {new Date(employee.assignedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          by {employee.assignedBy}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {employee.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser({
                                _id: employee._id,
                                email: employee.email,
                                firstName: employee.firstName,
                                lastName: employee.lastName,
                                isEmployee: true,
                                employeeRole: employee.role,
                                employeeStatus: employee.status,
                                createdAt: employee.createdAt,
                              });
                              setShowSuspendDialog(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Ban className="h-3 w-3" />
                            Suspend
                          </Button>
                        ) : employee.status === "suspended" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivate(employee._id)}
                            className="flex items-center gap-1 text-green-600"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Activate
                          </Button>
                        ) : null}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveRole(employee._id)}
                          className="flex items-center gap-1"
                        >
                          <UserMinus className="h-3 w-3" />
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Employee Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Employee Role</DialogTitle>
            <DialogDescription>
              Select a user and assign them an employee role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user">Select User</Label>
              <Select
                value={selectedUser?._id}
                onValueChange={(value) => {
                  const user = nonEmployeeUsers.find((u) => u._id === value);
                  setSelectedUser(user || null);
                }}
              >
                <SelectTrigger id="user">
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {nonEmployeeUsers.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="role">Employee Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) =>
                  setSelectedRole(value as EmployeeRole)
                }
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="callcenter">Call Center</SelectItem>
                  <SelectItem value="packer">Packer</SelectItem>
                  <SelectItem value="deliveryman">Delivery Man</SelectItem>
                  <SelectItem value="incharge">In-Charge</SelectItem>
                  <SelectItem value="accounts">Accounts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignRole} disabled={!selectedUser}>
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Employee Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend Employee</DialogTitle>
            <DialogDescription>
              Provide a reason for suspending {selectedUser?.firstName}{" "}
              {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="reason">Suspension Reason</Label>
            <Textarea
              id="reason"
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              placeholder="Enter reason for suspension..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuspendDialog(false);
                setSuspensionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={!suspensionReason.trim()}
            >
              Suspend Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
