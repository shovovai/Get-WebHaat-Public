import "server-only";
import { backendClient } from "@/sanity/lib/backendClient";
import { privateId } from "@/lib/privateId";

// Append-only audit trail for money and status changes made by admins, staff and
// the system. Documents use a private (dotted) id so the public dataset never
// exposes them. The logger never throws: a failed log line must not undo or
// block the business action it describes.

export interface AuditEntry {
  /** Clerk user id of whoever made the change ("system" for automated jobs) */
  actorClerkId?: string | null;
  actorEmail?: string | null;
  /** admin, incharge, accounts, deliveryman, customer, system… */
  actorRole?: string | null;
  /** Short machine name, e.g. "order.update", "order.cancel.approve", "withdrawal.approve" */
  action: string;
  targetId?: string | null;
  /** Sanity document type of the target, e.g. "order" or "user" */
  targetType?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  note?: string | null;
}

const json = (v: unknown) => {
  if (v === undefined || v === null) return undefined;
  try {
    return JSON.stringify(v).slice(0, 20_000);
  } catch {
    return undefined;
  }
};

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await backendClient.create({
      _id: privateId("auditLog"),
      _type: "auditLog",
      action: String(entry.action).slice(0, 100),
      actorClerkId: entry.actorClerkId || undefined,
      actorEmail: entry.actorEmail || undefined,
      actorRole: entry.actorRole || undefined,
      targetId: entry.targetId || undefined,
      targetType: entry.targetType || undefined,
      before: json(entry.before),
      after: json(entry.after),
      note: entry.note ? String(entry.note).slice(0, 1000) : undefined,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Audit log write failed:", entry.action, entry.targetId, error);
  }
}
