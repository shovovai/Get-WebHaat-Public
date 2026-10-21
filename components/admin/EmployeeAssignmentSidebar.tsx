"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  RefreshCw,
  UserCheck,
  Phone,
  Package,
  Truck,
  ShieldCheck,
  Calculator,
  CheckCircle2,
} from "lucide-react";
import {
  EmployeeRole,
  getRoleDisplayName,
  getRoleBadgeColor,
} from "@/types/employee";

interface CombinedUser {
  id: string;
  clerkUserId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  imageUrl: string;
  createdAt: number;
  lastSignInAt?: number;
  emailVerified: boolean;
  banned: boolean;
  locked: boolean;
  // Sanity-specific fields
  isActive: boolean;
  activatedAt?: string;
  activatedBy?: string;
  sanityId?: string;
  inSanity: boolean;
  loyaltyPoints: number;
  totalSpent: number;
  notificationCount: number;
  // Employee fields
  isEmployee?: boolean;
  employeeRole?: string;
  employeeStatus?: string;
}

interface EmployeeAssignmentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: CombinedUser | null;
  onAssignRole: (sanityId: string, role: EmployeeRole) => Promise<void>;
  onRemoveRole: (sanityId: string, userName: string) => Promise<void>;
  isLoading: boolean;
}

const ROLE_ICONS = {
  callcenter: Phone,
  packer: Package,
  warehouse: Truck,
  deliveryman: Truck,
  incharge: ShieldCheck,
  accounts: Calculator,
};

const ROLE_PERMISSIONS = {
  callcenter: ["Confirm customer address", "Confirm orders", "View orders"],
  packer: ["View confirmed orders", "Mark orders as packed"],
  warehouse: [
    "View packed orders",
    "Assign orders to deliverymen",
    "Manage warehouse",
  ],
  deliveryman: [
    "View assigned deliveries",
    "Mark orders as delivered",
    "Collect cash payments",
  ],
  incharge: ["Monitor all orders", "Assign deliverymen", "View analytics"],
  accounts: [
    "Receive payments from deliverymen",
    "View financial analytics",
    "Monitor all orders",
  ],
};

export const EmployeeAssignmentSidebar: React.FC<
  EmployeeAssignmentSidebarProps
> = ({ isOpen, onClose, user, onAssignRole, onRemoveRole, isLoading }) => {
  const [selectedRole, setSelectedRole] = useState<EmployeeRole>("callcenter");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  // Initialize selected role when user changes or sidebar opens
  React.useEffect(() => {
    if (user?.isEmployee && user.employeeRole) {
      setSelectedRole(user.employeeRole as EmployeeRole);
    } else {
      setSelectedRole("callcenter");
    }
    // Reset confirmation dialog when user changes
    setShowConfirmRemove(false);
  }, [user]);

  if (!user) return null;

  const handleAssignRole = async () => {
    if (!user.sanityId) {
      return;
    }

    setActionLoading("assign");
    try {
      await onAssignRole(user.sanityId, selectedRole);
    } catch (error) {
      console.error("Error assigning role:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async () => {
    if (!user.sanityId) {
      return;
    }

    setActionLoading("update");
    try {
      await onAssignRole(user.sanityId, selectedRole);
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveRole = async () => {
    if (!user.sanityId) {
      return;
    }

    setActionLoading("remove");
    setShowConfirmRemove(false);
    try {
      await onRemoveRole(user.sanityId, user.fullName);
      // onClose is now called from parent after data refresh
    } catch (error) {
      console.error("Error removing role:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRemove = () => {
    setShowConfirmRemove(false);
  };

  const RoleIcon = ROLE_ICONS[selectedRole];
  const hasRoleChanged = user.isEmployee && user.employeeRole !== selectedRole;
  const isAnyActionLoading = actionLoading !== null || isLoading;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isAnyActionLoading) {
          onClose();
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employee Role Assignment
          </SheetTitle>
          <SheetDescription>
            Manage employee role for {user.fullName}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 p-4">
          {/* User Info Card */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <img
                src={user.imageUrl}
                alt={user.fullName}
                className="w-12 h-12 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{user.fullName}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              {user.isEmployee && user.employeeRole && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Role:</span>
                  <Badge variant="secondary">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {getRoleDisplayName(user.employeeRole as EmployeeRole)}
                  </Badge>
                </div>
              )}
            </div>
          </Card>

          {/* Role Selection - Show for both new and existing employees */}
          <div className="space-y-3">
            <Label htmlFor="role-select" className="text-base font-semibold">
              {user.isEmployee
                ? "Update Employee Role"
                : "Select Employee Role"}
            </Label>

            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as EmployeeRole)}
            >
              <SelectTrigger id="role-select" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "callcenter",
                    "packer",
                    "warehouse",
                    "deliveryman",
                    "incharge",
                    "accounts",
                  ] as EmployeeRole[]
                ).map((role) => {
                  const Icon = ROLE_ICONS[role];
                  return (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{getRoleDisplayName(role)}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Role Permissions */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <RoleIcon className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">
                {getRoleDisplayName(selectedRole)} Permissions
              </h4>
            </div>
            <ul className="space-y-2">
              {ROLE_PERMISSIONS[selectedRole].map((permission, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{permission}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            {!user.sanityId ? (
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  User must be in Sanity database before assigning an employee
                  role.
                </p>
              </div>
            ) : (
              <>
                {user.isEmployee ? (
                  <>
                    {showConfirmRemove ? (
                      <>
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <p className="text-sm font-medium text-destructive mb-2">
                            Confirm Removal
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Are you sure you want to remove the employee role
                            from {user.fullName}?
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={handleCancelRemove}
                            disabled={isAnyActionLoading}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleRemoveRole}
                            disabled={isAnyActionLoading}
                            className="flex-1"
                          >
                            {actionLoading === "remove" ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Briefcase className="h-4 w-4 mr-2" />
                            )}
                            Remove
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {hasRoleChanged && (
                          <Button
                            onClick={handleUpdateRole}
                            disabled={isAnyActionLoading}
                            className="w-full"
                          >
                            {actionLoading === "update" || isLoading ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <UserCheck className="h-4 w-4 mr-2" />
                            )}
                            {actionLoading === "update" || isLoading
                              ? "Updating..."
                              : `Update to ${getRoleDisplayName(
                                  selectedRole
                                )} Role`}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          onClick={() => setShowConfirmRemove(true)}
                          disabled={isAnyActionLoading}
                          className="w-full"
                        >
                          <Briefcase className="h-4 w-4 mr-2" />
                          Remove Employee Role
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <Button
                    onClick={handleAssignRole}
                    disabled={isAnyActionLoading}
                    className="w-full"
                  >
                    {actionLoading === "assign" || isLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-2" />
                    )}
                    {actionLoading === "assign" || isLoading
                      ? "Assigning..."
                      : `Assign ${getRoleDisplayName(selectedRole)} Role`}
                  </Button>
                )}
              </>
            )}

            {!showConfirmRemove && (
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isAnyActionLoading}
                className="w-full"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
