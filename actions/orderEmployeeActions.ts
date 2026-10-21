"use server";
import { formatPrice } from "@/lib/storeConfig";

import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { backendClient } from "@/sanity/lib/backendClient";
import { EmployeeRole } from "@/types/employee";
import { sendOrderStatusNotification } from "@/lib/notificationService";
import { invalidateOrder } from "@/lib/cache";
import { writeAuditLog } from "@/lib/auditLog";
import {
  cashAmountError,
  isRevisionConflict,
  transitionError,
  type EmployeeAction,
} from "@/lib/orderGuards";

type Result = { success: boolean; message: string };

// ---------------------------------------------------------------- helpers
// (not exported: in a "use server" file every exported function is callable
// from the browser)

interface EmployeeDoc {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  employeeRole: EmployeeRole;
}

/** The signed-in, active employee if their role is one of `roles` */
async function getEmployee(roles: EmployeeRole[]): Promise<EmployeeDoc | null> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;
  return backendClient.fetch<EmployeeDoc | null>(
    `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && !(employeeStatus in ["inactive", "suspended"]) && employeeRole in $roles][0]{ _id, email, firstName, lastName, employeeRole }`,
    { clerkUserId, roles }
  );
}

async function callerClerkId(): Promise<string | null> {
  return (await auth()).userId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrderDoc = Record<string, any> & { _id: string; _rev: string };

/** Employees may only change real order documents */
async function loadOrder(orderId: string): Promise<OrderDoc | null> {
  if (typeof orderId !== "string" || !orderId) return null;
  return backendClient.fetch<OrderDoc | null>(`*[_type == "order" && _id == $orderId][0]`, { orderId });
}

class StaleOrderError extends Error {
  constructor() {
    super("This order was just updated by someone else. Refresh and try again.");
  }
}

/**
 * Writes the change only if the order is still exactly as we read it (ifRevisionId),
 * so two staff members (or a double click) cannot both act on the same state.
 */
async function guardedPatch(order: OrderDoc, set: Record<string, unknown>, unset: string[] = []) {
  try {
    let patch = backendClient.patch(order._id).ifRevisionId(order._rev).set(set);
    if (unset.length) patch = patch.unset(unset);
    await patch.commit();
  } catch (error) {
    if (isRevisionConflict(error)) throw new StaleOrderError();
    throw error;
  }
}

/** Atomically appends a status history entry */
async function addStatusHistory(
  orderId: string,
  status: string,
  employeeEmail: string,
  role: EmployeeRole | "admin" | "system",
  notes?: string
) {
  await backendClient
    .patch(orderId)
    .setIfMissing({ statusHistory: [] })
    .append("statusHistory", [
      {
        _key: randomUUID(),
        status,
        changedBy: employeeEmail,
        changedByRole: role,
        changedAt: new Date().toISOString(),
        notes: notes ? String(notes).slice(0, 1000) : undefined,
      },
    ])
    .commit();
}

type PerformanceKey =
  | "ordersProcessed"
  | "ordersConfirmed"
  | "ordersPacked"
  | "ordersAssignedForDelivery"
  | "ordersDelivered"
  | "cashCollected"
  | "paymentsReceived";

/** Atomic increments of the acting employee's own performance counters */
async function bumpPerformance(employeeId: string, increments: Partial<Record<PerformanceKey, number>>) {
  try {
    const paths = Object.fromEntries(
      Object.entries(increments).map(([k, v]) => [`employeePerformance.${k}`, v as number])
    );
    const zeros = Object.fromEntries(Object.keys(paths).map((k) => [k, 0]));
    await backendClient
      .patch(employeeId)
      .setIfMissing({ employeePerformance: {} })
      .setIfMissing(zeros)
      .inc(paths)
      .set({ "employeePerformance.lastActiveAt": new Date().toISOString(), updatedAt: new Date().toISOString() })
      .commit();
  } catch (error) {
    console.error("Failed to update employee performance:", error);
  }
}

async function audit(
  employee: EmployeeDoc,
  action: string,
  order: OrderDoc,
  after: Record<string, unknown>,
  note?: string
) {
  const before: Record<string, unknown> = {};
  for (const key of Object.keys(after)) before[key] = order[key] ?? null;
  await writeAuditLog({
    actorClerkId: await callerClerkId(),
    actorEmail: employee.email,
    actorRole: employee.employeeRole,
    action,
    targetId: order._id,
    targetType: "order",
    before,
    after,
    note,
  });
}

const isOverride = (employee: EmployeeDoc) => employee.employeeRole === "incharge";

/** Delivery actions: only the assigned deliveryman (or an incharge) */
function assignmentError(employee: EmployeeDoc, order: OrderDoc): string | null {
  if (isOverride(employee)) return null;
  return order.assignedDeliverymanId === employee._id ? null : "This order is not assigned to you";
}

const fail = (error: unknown, fallback: string): Result => {
  if (!(error instanceof StaleOrderError)) console.error(fallback, error);
  return {
    success: false,
    message: error instanceof StaleOrderError || error instanceof Error ? error.message : fallback,
  };
};

async function notify(order: OrderDoc, status: string) {
  try {
    await sendOrderStatusNotification({
      clerkUserId: order.clerkUserId,
      orderNumber: order.orderNumber,
      orderId: order._id,
      status,
    });
  } catch (notificationError) {
    console.error(`Failed to send ${status} notification:`, notificationError);
  }
}

/** Loads the order and checks the workflow allows `action` from its current status */
async function loadForAction(
  orderId: string,
  action: EmployeeAction
): Promise<{ order: OrderDoc; error?: undefined } | { order?: undefined; error: string }> {
  const order = await loadOrder(orderId);
  // OrderDoc is a loose Sanity document (Record<string, any>); transitionError reads only status
  // and cancellationRequested, so narrow to those fields for the weak-type check.
  const error = transitionError(action, order as { status?: string; cancellationRequested?: boolean } | null);
  if (error || !order) return { error: error || "Order not found" };
  return { order };
}

// ---------------------------------------------------------------- call center

// Call Center: Confirm address
export async function confirmAddress(orderId: string, notes?: string): Promise<Result> {
  try {
    const employee = await getEmployee(["callcenter"]);
    if (!employee) {
      return { success: false, message: "Only call center employees can confirm addresses" };
    }

    const { order, error } = await loadForAction(orderId, "confirmAddress");
    if (!order) return { success: false, message: error };

    const changes = {
      addressConfirmedBy: employee.email,
      addressConfirmedAt: new Date().toISOString(),
      status: "address_confirmed",
    };
    await guardedPatch(order, changes);
    await addStatusHistory(order._id, "Address Confirmed", employee.email, "callcenter", notes);
    await audit(employee, "order.address_confirm", order, changes, notes);

    return { success: true, message: "Address confirmed successfully" };
  } catch (error) {
    return fail(error, "Failed to confirm address");
  }
}

// Call Center: Update shipping address (before confirmation)
export async function updateShippingAddress(
  orderId: string,
  shippingAddress: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  }
): Promise<Result> {
  try {
    const employee = await getEmployee(["callcenter"]);
    if (!employee) {
      return { success: false, message: "Only call center employees can update shipping address" };
    }

    const { order, error } = await loadForAction(orderId, "updateShippingAddress");
    if (!order) return { success: false, message: error };
    if (order.addressConfirmedBy) {
      return { success: false, message: "Cannot update address after it has been confirmed" };
    }

    const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const clean = {
      fullName: str(shippingAddress?.fullName, 100),
      address: str(shippingAddress?.address, 300),
      city: str(shippingAddress?.city, 100),
      state: str(shippingAddress?.state, 100),
      postalCode: str(shippingAddress?.postalCode, 20),
      country: str(shippingAddress?.country, 100),
      phone: str(shippingAddress?.phone, 30),
    };
    await guardedPatch(order, { shippingAddress: clean });
    await addStatusHistory(
      order._id,
      "Shipping Address Updated",
      employee.email,
      "callcenter",
      "Address details were corrected/updated"
    );
    await audit(employee, "order.address_update", order, { shippingAddress: clean });

    return { success: true, message: "Shipping address updated successfully" };
  } catch (error) {
    return fail(error, "Failed to update shipping address");
  }
}

// Call Center: Confirm order
export async function confirmOrder(orderId: string, notes?: string): Promise<Result> {
  try {
    const employee = await getEmployee(["callcenter", "incharge"]);
    if (!employee) {
      return { success: false, message: "Only call center employees can confirm orders" };
    }

    const { order, error } = await loadForAction(orderId, "confirmOrder");
    if (!order) return { success: false, message: error };
    if (!order.addressConfirmedBy) {
      return { success: false, message: "Please confirm the address first" };
    }

    const changes = {
      orderConfirmedBy: employee.email,
      orderConfirmedAt: new Date().toISOString(),
      status: "order_confirmed",
    };
    await guardedPatch(order, changes);
    await addStatusHistory(order._id, "Order Confirmed", employee.email, employee.employeeRole, notes);
    await audit(employee, "order.confirm", order, changes, notes);
    await notify(order, "order_confirmed");
    await bumpPerformance(employee._id, { ordersProcessed: 1, ordersConfirmed: 1 });

    return { success: true, message: "Order confirmed successfully" };
  } catch (error) {
    return fail(error, "Failed to confirm order");
  }
}

// ---------------------------------------------------------------- packing / warehouse

// Packer: Mark order as packed
export async function markAsPacked(orderId: string, notes?: string): Promise<Result> {
  try {
    const employee = await getEmployee(["packer", "incharge"]);
    if (!employee) {
      return { success: false, message: "Only packers can mark orders as packed" };
    }

    const { order, error } = await loadForAction(orderId, "markAsPacked");
    if (!order) return { success: false, message: error };
    if (!order.orderConfirmedBy) {
      return { success: false, message: "Order must be confirmed before packing" };
    }

    const changes = {
      packedBy: employee.email,
      packedAt: new Date().toISOString(),
      packingNotes: notes,
      status: "packed",
    };
    await guardedPatch(order, changes);
    await addStatusHistory(order._id, "Packed", employee.email, employee.employeeRole, notes);
    await audit(employee, "order.pack", order, changes, notes);
    await notify(order, "packed");
    await bumpPerformance(employee._id, { ordersProcessed: 1, ordersPacked: 1 });

    // Invalidate caches for instant updates
    await invalidateOrder(order._id, order.clerkUserId);

    return { success: true, message: "Order marked as packed successfully" };
  } catch (error) {
    return fail(error, "Failed to mark as packed");
  }
}

// Warehouse: Assign deliveryman to packed order
export async function assignDeliveryman(
  orderId: string,
  deliverymanId: string,
  notes?: string
): Promise<Result> {
  try {
    const employee = await getEmployee(["warehouse", "incharge"]);
    if (!employee) {
      return { success: false, message: "Only warehouse employees can assign deliverymen" };
    }

    const { order, error } = await loadForAction(orderId, "assignDeliveryman");
    if (!order) return { success: false, message: error };
    if (!order.packedBy) {
      return { success: false, message: "Order must be packed before assigning to deliveryman" };
    }
    if (order.cashCollected) {
      return { success: false, message: "Cash was already collected for this order; it cannot be reassigned" };
    }

    const deliveryman = await backendClient.fetch(
      `*[_type == "user" && _id == $deliverymanId && isEmployee == true && !(employeeStatus in ["inactive", "suspended"]) && employeeRole == "deliveryman"][0]`,
      { deliverymanId }
    );
    if (!deliveryman) {
      return { success: false, message: "Deliveryman not found" };
    }

    const name = `${deliveryman.firstName} ${deliveryman.lastName}`;
    const changes = {
      assignedDeliverymanId: deliverymanId,
      assignedDeliverymanName: name,
      dispatchedBy: employee.email,
      dispatchedAt: new Date().toISOString(),
      status: "ready_for_delivery",
    };
    await guardedPatch(order, changes);
    await addStatusHistory(
      order._id,
      "Assigned for Delivery",
      employee.email,
      employee.employeeRole,
      notes || `Assigned to ${name}`
    );
    await audit(employee, "order.assign_deliveryman", order, changes, notes);
    await bumpPerformance(employee._id, { ordersProcessed: 1, ordersAssignedForDelivery: 1 });

    return { success: true, message: `Order assigned to ${name}` };
  } catch (error) {
    return fail(error, "Failed to assign deliveryman");
  }
}

// ---------------------------------------------------------------- delivery

// Deliveryman: Mark as delivered (with cash collection check)
export async function markAsDelivered(orderId: string, notes?: string): Promise<Result> {
  try {
    const employee = await getEmployee(["deliveryman", "incharge"]);
    if (!employee) {
      return { success: false, message: "Only deliverymen can mark orders as delivered" };
    }

    const { order, error } = await loadForAction(orderId, "markAsDelivered");
    if (!order) return { success: false, message: error };
    const notAssigned = assignmentError(employee, order);
    if (notAssigned) return { success: false, message: notAssigned };

    // Payment must be settled before hand-over
    const isCOD = order.paymentMethod === "cash_on_delivery";
    if (isCOD && !order.cashCollected) {
      return { success: false, message: "Cash must be collected from customer before marking as delivered" };
    }
    if (!isCOD && order.paymentStatus !== "paid") {
      return { success: false, message: "This order has not been paid yet" };
    }

    const changes = {
      deliveredBy: employee.email,
      deliveredAt: new Date().toISOString(),
      deliveryNotes: notes,
      status: "delivered",
    };
    await guardedPatch(order, changes);
    await addStatusHistory(order._id, "Delivered", employee.email, employee.employeeRole, notes);
    await audit(employee, "order.deliver", order, changes, notes);
    await notify(order, "delivered");
    await bumpPerformance(employee._id, { ordersProcessed: 1, ordersDelivered: 1 });

    // Invalidate caches for instant updates
    await invalidateOrder(order._id, order.clerkUserId);

    return { success: true, message: "Order delivered successfully" };
  } catch (error) {
    return fail(error, "Failed to mark as delivered");
  }
}

// Deliveryman: Collect cash from customer (separate from delivery)
export async function collectCash(orderId: string, cashAmount: number): Promise<Result> {
  try {
    const employee = await getEmployee(["deliveryman", "incharge"]);
    if (!employee) {
      return { success: false, message: "Only deliverymen can collect cash" };
    }

    const { order, error } = await loadForAction(orderId, "collectCash");
    if (!order) return { success: false, message: error };
    const notAssigned = assignmentError(employee, order);
    if (notAssigned) return { success: false, message: notAssigned };

    if (order.paymentMethod !== "cash_on_delivery") {
      return { success: false, message: "Cash can only be collected for cash on delivery orders" };
    }
    if (order.cashCollected || order.paymentStatus === "paid") {
      return { success: false, message: "Cash has already been collected for this order" };
    }
    const amountError = cashAmountError(cashAmount, order.totalPrice);
    if (amountError) return { success: false, message: amountError };

    const amount = Number(order.totalPrice);
    const changes = {
      cashCollected: true,
      cashCollectedAmount: amount,
      cashCollectedAt: new Date().toISOString(),
      paymentStatus: "paid",
      amountPaid: amount,
    };
    await guardedPatch(order, changes);
    await addStatusHistory(
      order._id,
      "Cash Collected",
      employee.email,
      employee.employeeRole,
      `Cash collected: ${formatPrice(amount)}`
    );
    await audit(employee, "order.cash_collect", order, changes);
    await bumpPerformance(employee._id, { cashCollected: amount });

    return { success: true, message: `Cash collected: ${formatPrice(amount)}` };
  } catch (error) {
    return fail(error, "Failed to collect cash");
  }
}

// Deliveryman: Start delivery (out for delivery)
export async function startDelivery(orderId: string, notes?: string): Promise<Result> {
  try {
    const employee = await getEmployee(["deliveryman", "incharge"]);
    if (!employee) {
      return { success: false, message: "Only deliverymen can start delivery" };
    }

    const { order, error } = await loadForAction(orderId, "startDelivery");
    if (!order) return { success: false, message: error };
    const notAssigned = assignmentError(employee, order);
    if (notAssigned) return { success: false, message: notAssigned };

    const changes = {
      status: "out_for_delivery",
      deliveryAttempts: (order.deliveryAttempts || 0) + 1,
    };
    await guardedPatch(order, changes);
    await addStatusHistory(order._id, "Out for Delivery", employee.email, employee.employeeRole, notes);
    await audit(employee, "order.start_delivery", order, changes, notes);
    await notify(order, "out_for_delivery");

    return { success: true, message: "Delivery started successfully" };
  } catch (error) {
    return fail(error, "Failed to start delivery");
  }
}

// Deliveryman: Reschedule delivery
export async function rescheduleDelivery(orderId: string, newDate: string, reason: string): Promise<Result> {
  try {
    const employee = await getEmployee(["deliveryman", "incharge"]);
    if (!employee) {
      return { success: false, message: "Only deliverymen can reschedule deliveries" };
    }

    const { order, error } = await loadForAction(orderId, "rescheduleDelivery");
    if (!order) return { success: false, message: error };
    const notAssigned = assignmentError(employee, order);
    if (notAssigned) return { success: false, message: notAssigned };
    if (Number.isNaN(new Date(newDate).getTime())) {
      return { success: false, message: "Please choose a valid date" };
    }

    const changes = {
      status: "rescheduled",
      rescheduledDate: newDate,
      rescheduledReason: String(reason || "").slice(0, 500),
    };
    await guardedPatch(order, changes);
    await addStatusHistory(
      order._id,
      "Rescheduled",
      employee.email,
      employee.employeeRole,
      `Rescheduled to ${new Date(newDate).toLocaleDateString()}: ${changes.rescheduledReason}`
    );
    await audit(employee, "order.reschedule", order, changes);

    return { success: true, message: "Delivery rescheduled successfully" };
  } catch (error) {
    return fail(error, "Failed to reschedule delivery");
  }
}

// Deliveryman: Mark delivery as failed
export async function markDeliveryFailed(orderId: string, reason: string): Promise<Result> {
  try {
    const employee = await getEmployee(["deliveryman", "incharge"]);
    if (!employee) {
      return { success: false, message: "Only deliverymen can mark delivery as failed" };
    }

    const { order, error } = await loadForAction(orderId, "markDeliveryFailed");
    if (!order) return { success: false, message: error };
    const notAssigned = assignmentError(employee, order);
    if (notAssigned) return { success: false, message: notAssigned };

    const attempts = (order.deliveryAttempts || 0) + 1;
    const changes = { status: "failed_delivery", deliveryAttempts: attempts };
    await guardedPatch(order, changes);
    await addStatusHistory(
      order._id,
      "Failed Delivery",
      employee.email,
      employee.employeeRole,
      `Delivery attempt ${attempts} failed: ${String(reason || "").slice(0, 500)}`
    );
    await audit(employee, "order.delivery_failed", order, changes, reason);

    return { success: true, message: "Delivery marked as failed" };
  } catch (error) {
    return fail(error, "Failed to mark delivery as failed");
  }
}

// ---------------------------------------------------------------- cash hand-over

// Accounts: Receive payment from deliveryman
export async function receivePaymentFromDeliveryman(orderId: string, notes?: string): Promise<Result> {
  try {
    const employee = await getEmployee(["accounts", "incharge"]);
    if (!employee) {
      return { success: false, message: "Only accounts employees can receive payments" };
    }

    const { order, error } = await loadForAction(orderId, "receivePayment");
    if (!order) return { success: false, message: error };

    if (order.paymentMethod !== "cash_on_delivery") {
      return { success: false, message: "Only cash on delivery orders are settled here" };
    }
    if (!order.cashCollected) {
      return { success: false, message: "Cash has not been collected for this order" };
    }
    if (!order.cashSubmittedToAccounts || order.cashSubmissionStatus !== "pending") {
      return { success: false, message: "Deliveryman has not submitted the cash yet" };
    }
    if (!isOverride(employee) && order.assignedAccountsEmployeeId !== employee._id) {
      return { success: false, message: "This cash submission was sent to another accounts employee" };
    }

    const amount = Number(order.cashCollectedAmount || order.totalPrice || 0);
    const changes = {
      cashSubmissionStatus: "confirmed",
      paymentReceivedBy: employee.email,
      paymentReceivedAt: new Date().toISOString(),
      paymentStatus: "paid",
      status: "completed",
    };
    await guardedPatch(order, changes);
    await addStatusHistory(
      order._id,
      "Payment Received & Order Completed",
      employee.email,
      employee.employeeRole,
      notes || `Cash payment received: ${formatPrice(amount)}`
    );
    await audit(employee, "order.cash_receive", order, changes, notes);
    await bumpPerformance(employee._id, { paymentsReceived: amount });

    return { success: true, message: "Payment received successfully" };
  } catch (error) {
    return fail(error, "Failed to receive payment");
  }
}

// Deliveryman: Submit collected cash to accounts
export async function submitCashToAccounts(
  orderId: string,
  accountsEmployeeId: string,
  notes?: string
): Promise<Result> {
  try {
    const employee = await getEmployee(["deliveryman", "incharge"]);
    if (!employee) {
      return { success: false, message: "Only deliverymen can submit cash to accounts" };
    }

    // Verify the selected accounts employee exists and is active
    const accountsEmployee = await backendClient.fetch(
      `*[_type == "user" && _id == $accountsEmployeeId && isEmployee == true && (employeeRole == "accounts" || employeeRole == "incharge") && employeeStatus == "active"][0]`,
      { accountsEmployeeId }
    );
    if (!accountsEmployee) {
      return { success: false, message: "Please select a valid accounts employee" };
    }

    const { order, error } = await loadForAction(orderId, "submitCashToAccounts");
    if (!order) return { success: false, message: error };
    const notAssigned = assignmentError(employee, order);
    if (notAssigned) return { success: false, message: notAssigned };

    if (!order.cashCollected) {
      return { success: false, message: "Cash has not been collected for this order" };
    }
    if (order.cashSubmittedToAccounts && order.cashSubmissionStatus === "pending") {
      return { success: false, message: "Cash submission is pending review by accounts team" };
    }
    if (order.cashSubmissionStatus === "confirmed") {
      return { success: false, message: "Cash has already been confirmed by accounts" };
    }

    const amount = Number(order.cashCollectedAmount || order.totalPrice || 0);
    const accountsName = `${accountsEmployee.firstName} ${accountsEmployee.lastName}`;
    const changes = {
      cashSubmittedToAccounts: true,
      cashSubmissionStatus: "pending",
      cashSubmittedBy: employee.email,
      cashSubmittedAt: new Date().toISOString(),
      cashSubmissionNotes: notes,
      assignedAccountsEmployeeId: accountsEmployeeId,
      assignedAccountsEmployeeName: accountsName,
    };
    await guardedPatch(order, changes);
    await addStatusHistory(
      order._id,
      "Cash Submitted to Accounts",
      employee.email,
      employee.employeeRole,
      notes || `Cash submitted to ${accountsName}: ${formatPrice(amount)}`
    );
    await audit(employee, "order.cash_submit", order, changes, notes);

    return { success: true, message: `Cash submitted to ${accountsName}: ${formatPrice(amount)}` };
  } catch (error) {
    return fail(error, "Failed to submit cash to accounts");
  }
}

// Accounts: Reject cash submission from deliveryman
export async function rejectCashSubmission(orderId: string, rejectionReason: string): Promise<Result> {
  try {
    const employee = await getEmployee(["accounts", "incharge"]);
    if (!employee) {
      return { success: false, message: "Only accounts employees can reject cash submissions" };
    }

    const { order, error } = await loadForAction(orderId, "rejectCashSubmission");
    if (!order) return { success: false, message: error };

    if (!order.cashSubmittedToAccounts) {
      return { success: false, message: "No cash submission found for this order" };
    }
    if (order.cashSubmissionStatus === "confirmed") {
      return { success: false, message: "Cannot reject a confirmed cash submission" };
    }
    if (!isOverride(employee) && order.assignedAccountsEmployeeId !== employee._id) {
      return { success: false, message: "This cash submission was sent to another accounts employee" };
    }
    if (!rejectionReason || rejectionReason.trim() === "") {
      return { success: false, message: "Please provide a reason for rejection" };
    }

    const reason = rejectionReason.trim().slice(0, 1000);
    const changes = {
      cashSubmissionStatus: "rejected",
      cashSubmissionRejectionReason: reason,
      cashSubmittedToAccounts: false,
    };
    await guardedPatch(order, changes, ["assignedAccountsEmployeeId", "assignedAccountsEmployeeName"]);
    await addStatusHistory(
      order._id,
      "Cash Submission Rejected",
      employee.email,
      employee.employeeRole,
      `Rejected by ${employee.firstName} ${employee.lastName}: ${reason}`
    );
    await audit(
      employee,
      "order.cash_reject",
      order,
      { ...changes, assignedAccountsEmployeeId: null },
      reason
    );

    return { success: true, message: "Cash submission rejected. Deliveryman can resubmit." };
  } catch (error) {
    return fail(error, "Failed to reject cash submission");
  }
}

// Get orders for employee role
export async function getOrdersForEmployee() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return [];
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && !(employeeStatus in ["inactive", "suspended"])][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return [];
    }

    let filter = "";

    switch (employee.employeeRole) {
      case "callcenter":
        // Show all orders that callcenter works with (pending, address confirmed, and order confirmed)
        filter = `*[_type == "order" && status in ["pending", "address_confirmed", "order_confirmed"]] | order(orderDate desc)`;
        break;
      case "packer":
        // Show all confirmed orders (both packed and unpacked)
        filter = `*[_type == "order" && defined(orderConfirmedBy) && status in ["order_confirmed", "packed"]] | order(orderConfirmedAt desc)`;
        break;
      case "warehouse":
        // Show packed orders ready for delivery assignment
        filter = `*[_type == "order" && status in ["packed", "ready_for_delivery"]] | order(packedAt desc)`;
        break;
      case "deliveryman":
        // Show orders assigned to this deliveryman
        filter = `*[_type == "order" && assignedDeliverymanId == $employeeId && status in ["ready_for_delivery", "out_for_delivery", "delivered", "rescheduled", "failed_delivery"]] | order(dispatchedAt desc)`;
        break;
      case "incharge":
      case "accounts":
        // Show all orders
        filter = `*[_type == "order"] | order(orderDate desc)`;
        break;
      default:
        return [];
    }

    const orders = await backendClient.fetch(
      `${filter} {
        _id,
        orderNumber,
        customerName,
        email,
        phone,
        clerkUserId,
        totalPrice,
        currency,
        status,
        paymentStatus,
        paymentMethod,
        orderDate,
        "shippingAddress": address,
        products[] {
          _key,
          quantity,
          product-> {
            _id,
            name,
            price,
            "image": image.asset->url
          }
        },
        addressConfirmedBy,
        addressConfirmedAt,
        orderConfirmedBy,
        orderConfirmedAt,
        packedBy,
        packedAt,
        packingNotes,
        assignedWarehouseBy,
        assignedWarehouseAt,
        dispatchedBy,
        dispatchedAt,
        assignedDeliverymanId,
        assignedDeliverymanName,
        deliveredBy,
        deliveredAt,
        deliveryNotes,
        deliveryAttempts,
        rescheduledDate,
        rescheduledReason,
        cashCollected,
        cashCollectedAmount,
        cashCollectedAt,
        paymentReceivedBy,
        paymentReceivedAt,
        stripePaymentIntentId,
        stripeCheckoutSessionId,
        paymentCompletedAt,
        statusHistory
      }`,
      { employeeId: employee._id }
    );

    return orders;
  } catch (error) {
    console.error("Error fetching employee orders:", error);
    return [];
  }
}

// Get orders for accounts department
export async function getOrdersForAccounts() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return [];
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && !(employeeStatus in ["inactive", "suspended"])][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return [];
    }

    // Only accounts and incharge can access
    if (!["accounts", "incharge"].includes(employee.employeeRole)) {
      return [];
    }

    // Get orders with cash submitted to accounts, already received, or paid online via Stripe
    const orders = await backendClient.fetch(
      `*[_type == "order" && (cashSubmittedToAccounts == true || paymentReceivedBy != null || stripePaymentIntentId != null)] | order(coalesce(cashSubmittedAt, paymentCompletedAt, orderDate) desc) {
        _id,
        orderNumber,
        customerName,
        email,
        phone,
        clerkUserId,
        totalPrice,
        currency,
        status,
        paymentStatus,
        paymentMethod,
        orderDate,
        "shippingAddress": address,
        products[] {
          _key,
          quantity,
          product-> {
            _id,
            name,
            price,
            "image": image.asset->url
          }
        },
        deliveredAt,
        cashCollected,
        cashCollectedAmount,
        cashCollectedAt,
        cashSubmittedToAccounts,
        cashSubmittedBy,
        cashSubmittedAt,
        cashSubmissionNotes,
        paymentReceivedBy,
        paymentReceivedAt,
        stripePaymentIntentId,
        stripeCheckoutSessionId,
        paymentCompletedAt,
        statusHistory
      }`
    );

    return orders;
  } catch (error) {
    console.error("Error fetching accounts orders:", error);
    return [];
  }
}

// Get payment statistics for accounts
export async function getAccountsPaymentStats() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return null;
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && !(employeeStatus in ["inactive", "suspended"])][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return null;
    }

    // Only accounts and incharge can access
    if (!["accounts", "incharge"].includes(employee.employeeRole)) {
      return null;
    }

    // Get payment statistics
    const stats = await backendClient.fetch(
      `{
        "totalCodRevenue": *[_type == "order" && paymentMethod == "cash_on_delivery" && defined(totalPrice)].totalPrice,
        "codPaidRevenue": *[_type == "order" && paymentMethod == "cash_on_delivery" && paymentStatus == "paid" && defined(totalPrice)].totalPrice,
        "codPendingRevenue": *[_type == "order" && paymentMethod == "cash_on_delivery" && paymentStatus == "pending" && defined(totalPrice)].totalPrice,
        "cardRevenue": *[_type == "order" && (paymentMethod == "card" || paymentMethod == "stripe") && paymentStatus == "paid" && defined(totalPrice)].totalPrice,
        "totalCodOrders": count(*[_type == "order" && paymentMethod == "cash_on_delivery"]),
        "codPaidOrders": count(*[_type == "order" && paymentMethod == "cash_on_delivery" && paymentStatus == "paid"]),
        "codPendingOrders": count(*[_type == "order" && paymentMethod == "cash_on_delivery" && paymentStatus == "pending"]),
        "cardOrders": count(*[_type == "order" && (paymentMethod == "card" || paymentMethod == "stripe") && paymentStatus == "paid"])
      }`
    );

    // Calculate sums from arrays
    const totalCodRevenue = Array.isArray(stats.totalCodRevenue)
      ? stats.totalCodRevenue.reduce(
          (sum: number, price: number) => sum + (price || 0),
          0
        )
      : 0;

    const codPaidRevenue = Array.isArray(stats.codPaidRevenue)
      ? stats.codPaidRevenue.reduce(
          (sum: number, price: number) => sum + (price || 0),
          0
        )
      : 0;

    const codPendingRevenue = Array.isArray(stats.codPendingRevenue)
      ? stats.codPendingRevenue.reduce(
          (sum: number, price: number) => sum + (price || 0),
          0
        )
      : 0;

    const cardRevenue = Array.isArray(stats.cardRevenue)
      ? stats.cardRevenue.reduce(
          (sum: number, price: number) => sum + (price || 0),
          0
        )
      : 0;

    return {
      totalCodRevenue,
      codPaidRevenue,
      codPendingRevenue,
      cardRevenue,
      totalCodOrders: stats.totalCodOrders || 0,
      codPaidOrders: stats.codPaidOrders || 0,
      codPendingOrders: stats.codPendingOrders || 0,
      cardOrders: stats.cardOrders || 0,
    };
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    return null;
  }
}

// Get active accounts employees for selection
export async function getActiveAccountsEmployees() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return [];
    }

    const employee = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && !(employeeStatus in ["inactive", "suspended"])][0]`,
      { clerkUserId }
    );

    if (!employee) {
      return [];
    }

    // Get all active accounts employees
    const accountsEmployees = await backendClient.fetch(
      `*[_type == "user" && isEmployee == true && !(employeeStatus in ["inactive", "suspended"]) && (employeeRole == "accounts" || employeeRole == "incharge") && employeeStatus == "active"] | order(firstName asc) {
        _id,
        firstName,
        lastName,
        email,
        employeeRole
      }`
    );

    return accountsEmployees;
  } catch (error) {
    console.error("Error fetching accounts employees:", error);
    return [];
  }
}
