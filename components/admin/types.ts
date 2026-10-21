// Shared types for admin dashboard components

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  imageUrl: string;
  createdAt: number;
  lastSignInAt: number;
  emailVerified: boolean;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  clerkUserId?: string;
  totalAmount?: number; // Keep for backward compatibility
  totalPrice: number;
  currency?: string;
  status: string;
  paymentMethod: string;
  paymentStatus?: string;
  orderDate: string;
  address?: {
    state: string;
    zip: string;
    city: string;
    address: string;
    name: string;
  };
  products: Array<{
    _key?: string;
    quantity: number;
    product: {
      _id: string;
      name: string;
      price: number;
      image?: string;
    };
  }>;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  amountDiscount?: number;
  // Optional fields for future use
  notes?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  // Employee tracking fields
  addressConfirmedBy?: string;
  addressConfirmedAt?: string;
  orderConfirmedBy?: string;
  orderConfirmedAt?: string;
  packedBy?: string;
  packedAt?: string;
  packingNotes?: string;
  dispatchedBy?: string;
  dispatchedAt?: string;
  assignedWarehouseBy?: string;
  assignedWarehouseAt?: string;
  assignedDeliverymanId?: string;
  assignedDeliverymanName?: string;
  deliveredBy?: string;
  deliveredAt?: string;
  deliveryNotes?: string;
  deliveryAttempts?: number;
  rescheduledDate?: string;
  rescheduledReason?: string;
  // Cash collection
  cashCollected?: boolean;
  cashCollectedAmount?: number;
  cashCollectedAt?: string;
  paymentReceivedBy?: string;
  paymentReceivedAt?: string;
  // Cancellation request fields
  cancellationRequested?: boolean;
  cancellationRequestedAt?: string;
  cancellationRequestReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  refundedToWallet?: boolean;
  refundAmount?: number;
  amountPaid?: number;
}

export interface Product {
  _id: string;
  _type: "product";
  _createdAt: string;
  _updatedAt: string;
  _rev: string;
  name: string;
  slug?: {
    current: string;
    _type: "slug";
  };
  description?: string;
  price: number;
  discount?: number;
  stock: number;
  category?: {
    _id: string;
    name: string;
    title: string;
    slug?: {
      current: string;
    };
  };
  brand?: {
    _id: string;
    name: string;
    title: string;
    slug?: {
      current: string;
    };
  };
  status: "new" | "hot" | "sale";
  variant?: "gadget" | "appliances" | "refrigerators" | "others";
  featured: boolean;
  isFeatured?: boolean;
  images?: Array<{
    asset?: {
      _ref: string;
      _type: "reference";
    };
    _type: "image";
    _key: string;
  }>;
}

export interface Analytics {
  overview: {
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
    totalUsers: number;
  };
  charts: {
    revenueByDay: Array<{ date: string; revenue: number }>;
    ordersByStatus: Array<{ status: string; count: number }>;
    ordersByPaymentMethod: Array<{ method: string; count: number }>;
  };
}

export interface ChartDataPoint {
  month: string;
  date?: string;
  revenue: number;
  orders: number;
  users: number;
}
