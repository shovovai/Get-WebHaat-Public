// Employee role types and permissions
export type EmployeeRole =
  | "callcenter"
  | "packer"
  | "warehouse"
  | "deliveryman"
  | "incharge"
  | "accounts";

export type EmployeeStatus = "active" | "inactive" | "suspended";

export interface Employee {
  _id: string;
  userId: string; // Reference to user document
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  assignedBy: string; // Admin email who assigned the role
  assignedAt: string;
  suspendedAt?: string;
  suspendedBy?: string;
  suspensionReason?: string;
  activatedAt?: string;
  permissions: EmployeePermissions;
  performance?: EmployeePerformance;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePermissions {
  canViewOrders: boolean;
  canConfirmOrders: boolean;
  canPackOrders: boolean;
  canAssignDelivery: boolean;
  canDeliverOrders: boolean;
  canCollectCash: boolean;
  canReceivePayments: boolean;
  canViewAnalytics: boolean;
  canManageEmployees: boolean;
  canAccessAdmin: boolean;
}

export interface EmployeePerformance {
  ordersProcessed: number;
  ordersConfirmed?: number;
  ordersPacked?: number;
  ordersAssignedForDelivery?: number;
  ordersDelivered?: number;
  cashCollected?: number;
  paymentsReceived?: number;
  lastActiveAt?: string;
  averageProcessingTime?: number; // in minutes
}

// Order tracking fields for employees
export interface OrderEmployeeTracking {
  addressConfirmedBy?: string; // callcenter employee email
  addressConfirmedAt?: string;
  orderConfirmedBy?: string; // callcenter employee email
  orderConfirmedAt?: string;
  packedBy?: string; // packer employee email
  packedAt?: string;
  packingNotes?: string;
  assignedWarehouseBy?: string; // warehouse employee email
  assignedWarehouseAt?: string;
  dispatchedBy?: string; // warehouse employee email
  dispatchedAt?: string;
  assignedDeliverymanId?: string; // deliveryman employee ID
  assignedDeliverymanName?: string;
  deliveredBy?: string; // deliveryman employee email
  deliveredAt?: string;
  deliveryNotes?: string;
  deliveryAttempts?: number;
  rescheduledDate?: string;
  rescheduledReason?: string;
  cashCollected?: boolean;
  cashCollectedAmount?: number;
  cashCollectedAt?: string;
  cashSubmittedToAccounts?: boolean;
  cashSubmittedBy?: string; // deliveryman employee email
  cashSubmittedAt?: string;
  cashSubmissionNotes?: string;
  assignedAccountsEmployeeId?: string; // accounts employee ID
  assignedAccountsEmployeeName?: string; // accounts employee name
  paymentReceivedBy?: string; // accounts employee email
  paymentReceivedAt?: string;
  statusHistory?: OrderStatusHistoryItem[];
}

export interface OrderStatusHistoryItem {
  status: string;
  changedBy: string; // employee email
  changedByRole: EmployeeRole | "admin" | "system";
  changedAt: string;
  notes?: string;
}

// Extended Order type with employee tracking
export interface OrderWithTracking {
  _id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  orderDate: string;
  address: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  products: Array<{
    product: {
      _id: string;
      name: string;
      price: number;
      image?: string;
    };
    quantity: number;
  }>;
  tracking?: OrderEmployeeTracking;
}

// Role-based permissions configuration
export const ROLE_PERMISSIONS: Record<EmployeeRole, EmployeePermissions> = {
  callcenter: {
    canViewOrders: true,
    canConfirmOrders: true,
    canPackOrders: false,
    canAssignDelivery: false,
    canDeliverOrders: false,
    canCollectCash: false,
    canReceivePayments: false,
    canViewAnalytics: false,
    canManageEmployees: false,
    canAccessAdmin: true,
  },
  packer: {
    canViewOrders: true,
    canConfirmOrders: false,
    canPackOrders: true,
    canAssignDelivery: false,
    canDeliverOrders: false,
    canCollectCash: false,
    canReceivePayments: false,
    canViewAnalytics: false,
    canManageEmployees: false,
    canAccessAdmin: true,
  },
  warehouse: {
    canViewOrders: true,
    canConfirmOrders: false,
    canPackOrders: false,
    canAssignDelivery: true,
    canDeliverOrders: false,
    canCollectCash: false,
    canReceivePayments: false,
    canViewAnalytics: true,
    canManageEmployees: false,
    canAccessAdmin: true,
  },
  deliveryman: {
    canViewOrders: true,
    canConfirmOrders: false,
    canPackOrders: false,
    canAssignDelivery: false,
    canDeliverOrders: true,
    canCollectCash: true,
    canReceivePayments: false,
    canViewAnalytics: false,
    canManageEmployees: false,
    canAccessAdmin: true,
  },
  incharge: {
    canViewOrders: true,
    canConfirmOrders: true,
    canPackOrders: true,
    canAssignDelivery: true,
    canDeliverOrders: true,
    canCollectCash: true,
    canReceivePayments: true,
    canViewAnalytics: true,
    canManageEmployees: true,
    canAccessAdmin: true,
  },
  accounts: {
    canViewOrders: true,
    canConfirmOrders: false,
    canPackOrders: false,
    canAssignDelivery: false,
    canDeliverOrders: false,
    canCollectCash: false,
    canReceivePayments: true,
    canViewAnalytics: true,
    canManageEmployees: false,
    canAccessAdmin: true,
  },
};

// Helper function to get role display name
export const getRoleDisplayName = (role: EmployeeRole): string => {
  const roleNames: Record<EmployeeRole, string> = {
    callcenter: "Call Center",
    packer: "Packer",
    warehouse: "Warehouse",
    deliveryman: "Delivery Man",
    incharge: "In-Charge",
    accounts: "Accounts",
  };
  return roleNames[role];
};

// Helper function to get role badge color
export const getRoleBadgeColor = (role: EmployeeRole): string => {
  const colors: Record<EmployeeRole, string> = {
    callcenter: "bg-blue-100 text-blue-800",
    packer: "bg-purple-100 text-purple-800",
    warehouse: "bg-orange-100 text-orange-800",
    deliveryman: "bg-green-100 text-green-800",
    incharge: "bg-red-100 text-red-800",
    accounts: "bg-yellow-100 text-yellow-800",
  };
  return colors[role];
};

// Helper function to check if user has permission
export const hasPermission = (
  role: EmployeeRole,
  permission: keyof EmployeePermissions
): boolean => {
  return ROLE_PERMISSIONS[role][permission];
};
