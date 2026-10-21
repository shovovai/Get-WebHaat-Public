import "server-only";
import { backendClient } from "@/sanity/lib/backendClient";
import { v4 as uuidv4 } from "uuid";
import { hasCreditForOrder, withRevisionRetry } from "@/lib/orderGuards";

// Server-only helper. Deliberately NOT a server action ("use server"),
// so it cannot be invoked directly from the browser.

interface WalletTransaction {
  id: string;
  type: "credit_refund" | "credit_manual" | "debit_order" | "debit_withdrawal";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  orderId?: string;
  processedBy?: string;
  createdAt: string;
  status: "completed" | "pending" | "failed" | "cancelled";
}

/**
 * Add credit to user wallet (used for refunds when an order is cancelled).
 *
 * Race-safe and idempotent:
 *  - the user document is patched with `ifRevisionId`, retried on conflict, so two
 *    concurrent credits/withdrawals can never overwrite each other's balance;
 *  - when `orderId` is given, a credit for that order is written at most once: if the
 *    wallet history already holds a refund for the order, nothing is added again
 *    (`alreadyCredited: true`).
 */
export async function addWalletCredit(
  userId: string,
  amount: number,
  description: string,
  orderId?: string,
  processedBy?: string
): Promise<{ success: boolean; message: string; newBalance?: number; alreadyCredited?: boolean }> {
  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return { success: false, message: "Invalid refund amount" };
  }
  try {
    return await withRevisionRetry(async () => {
      const user = await backendClient.fetch<{
        _id: string;
        _rev: string;
        walletBalance?: number;
        walletTransactions?: WalletTransaction[];
      } | null>(
        `*[_type == "user" && clerkUserId == $userId][0]{ _id, _rev, walletBalance, walletTransactions }`,
        { userId }
      );

      if (!user) {
        return { success: false, message: "User not found" };
      }

      if (hasCreditForOrder(user.walletTransactions, orderId)) {
        return {
          success: true,
          message: "This order was already refunded to the wallet",
          newBalance: user.walletBalance || 0,
          alreadyCredited: true,
        };
      }

      const currentBalance = Number(user.walletBalance) || 0;
      const newBalance = Math.round((currentBalance + amount) * 100) / 100;

      const transaction: WalletTransaction & { _key: string } = {
        _key: uuidv4(),
        id: uuidv4(),
        type: "credit_refund",
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description,
        orderId,
        processedBy,
        createdAt: new Date().toISOString(),
        status: "completed",
      };

      await backendClient
        .patch(user._id)
        .ifRevisionId(user._rev)
        .set({
          walletBalance: newBalance,
          walletTransactions: [transaction, ...(user.walletTransactions || [])],
        })
        .commit();

      return {
        success: true,
        message: "Credit added successfully",
        newBalance,
      };
    });
  } catch (error) {
    console.error("Error adding wallet credit:", error);
    return {
      success: false,
      message: "Failed to add credit to wallet",
    };
  }
}
