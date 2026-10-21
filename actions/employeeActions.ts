"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { verifiedPrimaryEmail } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";
import {
  Employee,
  EmployeeRole,
  EmployeeStatus,
  ROLE_PERMISSIONS,
} from "@/types/employee";

// ---- Authorization helpers ----
// Server actions are callable from any client, so every privileged action
// must verify the caller on the server.
async function getCallerEmail(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const clerk = await clerkClient();
  return verifiedPrimaryEmail(await clerk.users.getUser(userId));
}

async function callerIsAdmin(): Promise<boolean> {
  return isUserAdmin(await getCallerEmail());
}

async function callerIsAdminOrEmployee(): Promise<boolean> {
  if (await callerIsAdmin()) return true;
  const { userId } = await auth();
  if (!userId) return false;
  const employee = await backendClient.fetch(
    `*[_type == "user" && clerkUserId == $userId && isEmployee == true && employeeStatus == "active"][0]._id`,
    { userId }
  );
  return Boolean(employee);
}

// Assign employee role to a user
export async function assignEmployeeRole(
  userId: string,
  role: EmployeeRole
): Promise<{ success: boolean; message: string; employee?: Employee }> {
  try {
    if (!(await callerIsAdmin())) {
      return { success: false, message: "Only admins can manage employees" };
    }

    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Get admin user to verify permissions
    const adminUser = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]`,
      { clerkUserId }
    );

    if (!adminUser) {
      return { success: false, message: "Admin user not found" };
    }

    // Get user to assign role to
    const user = await backendClient.fetch(
      `*[_type == "user" && _id == $userId][0]`,
      { userId }
    );

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Update user with employee fields
    const updatedUser = await backendClient
      .patch(userId)
      .set({
        isEmployee: true,
        employeeRole: role,
        employeeStatus: "active",
        employeeAssignedBy: adminUser.email,
        employeeAssignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return {
      success: true,
      message: `Successfully assigned ${role} role to ${user.firstName} ${user.lastName}`,
      employee: {
        _id: updatedUser._id,
        userId: updatedUser._id,
        clerkUserId: updatedUser.clerkUserId,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role,
        status: "active",
        assignedBy: adminUser.email,
        assignedAt: new Date().toISOString(),
        permissions: ROLE_PERMISSIONS[role],
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    };
  } catch (error) {
    console.error("Error assigning employee role:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to assign employee role",
    };
  }
}

// Remove employee role from user
export async function removeEmployeeRole(
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!(await callerIsAdmin())) {
      return { success: false, message: "Only admins can manage employees" };
    }

    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    await backendClient
      .patch(userId)
      .set({
        isEmployee: false,
        employeeRole: undefined,
        employeeStatus: "inactive",
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return { success: true, message: "Employee role removed successfully" };
  } catch (error) {
    console.error("Error removing employee role:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to remove employee role",
    };
  }
}

// Update employee status
export async function updateEmployeeStatus(
  userId: string,
  status: EmployeeStatus,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!(await callerIsAdmin())) {
      return { success: false, message: "Only admins can manage employees" };
    }

    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    const adminUser = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]`,
      { clerkUserId }
    );

    if (!adminUser) {
      return { success: false, message: "Admin user not found" };
    }

    const updateData: any = {
      employeeStatus: status,
      updatedAt: new Date().toISOString(),
    };

    if (status === "suspended") {
      updateData.employeeSuspendedBy = adminUser.email;
      updateData.employeeSuspendedAt = new Date().toISOString();
      if (reason) {
        updateData.employeeSuspensionReason = reason;
      }
    }

    await backendClient.patch(userId).set(updateData).commit();

    return { success: true, message: `Employee status updated to ${status}` };
  } catch (error) {
    console.error("Error updating employee status:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update employee status",
    };
  }
}

// Get all employees
export async function getAllEmployees(): Promise<Employee[]> {
  try {
    if (!(await callerIsAdminOrEmployee())) {
      return [];
    }

    const employees = await backendClient.fetch(
      `*[_type == "user" && isEmployee == true] | order(employeeAssignedAt desc) {
        _id,
        "userId": _id,
        clerkUserId,
        email,
        firstName,
        lastName,
        employeeRole,
        employeeStatus,
        employeeAssignedBy,
        employeeAssignedAt,
        employeeSuspendedBy,
        employeeSuspendedAt,
        employeeSuspensionReason,
        employeePerformance,
        createdAt,
        updatedAt
      }`
    );

    return employees.map((emp: any) => ({
      ...emp,
      role: emp.employeeRole,
      status: emp.employeeStatus,
      assignedBy: emp.employeeAssignedBy,
      assignedAt: emp.employeeAssignedAt,
      suspendedBy: emp.employeeSuspendedBy,
      suspendedAt: emp.employeeSuspendedAt,
      suspensionReason: emp.employeeSuspensionReason,
      permissions: ROLE_PERMISSIONS[emp.employeeRole as EmployeeRole],
      performance: emp.employeePerformance,
    }));
  } catch (error) {
    console.error("Error fetching employees:", error);
    return [];
  }
}

// Get employees by role
export async function getEmployeesByRole(
  role: EmployeeRole
): Promise<Employee[]> {
  try {
    if (!(await callerIsAdminOrEmployee())) {
      return [];
    }

    const employees = await backendClient.fetch(
      `*[_type == "user" && isEmployee == true && employeeRole == $role && employeeStatus == "active"] | order(firstName asc) {
        _id,
        "userId": _id,
        clerkUserId,
        email,
        firstName,
        lastName,
        employeeRole,
        employeeStatus,
        employeeAssignedBy,
        employeeAssignedAt,
        employeePerformance,
        createdAt,
        updatedAt
      }`,
      { role }
    );

    return employees.map((emp: any) => ({
      ...emp,
      role: emp.employeeRole,
      status: emp.employeeStatus,
      assignedBy: emp.employeeAssignedBy,
      assignedAt: emp.employeeAssignedAt,
      permissions: ROLE_PERMISSIONS[emp.employeeRole as EmployeeRole],
      performance: emp.employeePerformance,
    }));
  } catch (error) {
    console.error("Error fetching employees by role:", error);
    return [];
  }
}

// Get current employee info
export async function getCurrentEmployee(): Promise<Employee | null> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return null;
    }

    const user = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true][0] {
        _id,
        "userId": _id,
        clerkUserId,
        email,
        firstName,
        lastName,
        employeeRole,
        employeeStatus,
        employeeAssignedBy,
        employeeAssignedAt,
        employeePerformance,
        createdAt,
        updatedAt
      }`,
      { clerkUserId }
    );

    if (!user || !user.employeeRole) {
      return null;
    }

    return {
      ...user,
      role: user.employeeRole,
      status: user.employeeStatus,
      assignedBy: user.employeeAssignedBy,
      assignedAt: user.employeeAssignedAt,
      permissions: ROLE_PERMISSIONS[user.employeeRole as EmployeeRole],
      performance: user.employeePerformance,
    };
  } catch (error) {
    console.error("Error fetching current employee:", error);
    return null;
  }
}

// Get all users (potential employees)
export async function getAllUsers() {
  try {
    if (!(await callerIsAdmin())) {
      return [];
    }

    const users = await backendClient.fetch(
      `*[_type == "user"] | order(createdAt desc) {
        _id,
        clerkUserId,
        email,
        firstName,
        lastName,
        isEmployee,
        employeeRole,
        employeeStatus,
        isActive,
        createdAt
      }`
    );

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

// Update employee performance
export async function updateEmployeePerformance(
  userId: string,
  performanceData: Partial<{
    ordersProcessed: number;
    ordersConfirmed: number;
    ordersPacked: number;
    ordersAssignedForDelivery: number;
    ordersDelivered: number;
    cashCollected: number;
    paymentsReceived: number;
  }>
): Promise<{ success: boolean; message: string }> {
  try {
    if (!(await callerIsAdminOrEmployee())) {
      return { success: false, message: "Unauthorized" };
    }

    const user = await backendClient.fetch(
      `*[_type == "user" && _id == $userId][0] { employeePerformance }`,
      { userId }
    );

    const currentPerformance = user?.employeePerformance || {};

    await backendClient
      .patch(userId)
      .set({
        employeePerformance: {
          ...currentPerformance,
          ...performanceData,
          lastActiveAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return { success: true, message: "Performance updated successfully" };
  } catch (error) {
    console.error("Error updating employee performance:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update performance",
    };
  }
}
