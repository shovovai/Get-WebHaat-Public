import { DocumentTextIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

// Append-only record of admin / staff / system money and status changes.
// Written by lib/auditLog.ts; everything is read-only in Studio.
export const auditLogType = defineType({
  name: "auditLog",
  title: "Audit Log",
  type: "document",
  icon: DocumentTextIcon,
  readOnly: true,
  fields: [
    defineField({ name: "action", title: "Action", type: "string", readOnly: true }),
    defineField({ name: "actorEmail", title: "Actor email", type: "string", readOnly: true }),
    defineField({ name: "actorClerkId", title: "Actor Clerk ID", type: "string", readOnly: true }),
    defineField({ name: "actorRole", title: "Actor role", type: "string", readOnly: true }),
    defineField({ name: "targetType", title: "Target type", type: "string", readOnly: true }),
    defineField({ name: "targetId", title: "Target document ID", type: "string", readOnly: true }),
    defineField({ name: "before", title: "Before (JSON)", type: "text", readOnly: true }),
    defineField({ name: "after", title: "After (JSON)", type: "text", readOnly: true }),
    defineField({ name: "note", title: "Note", type: "text", readOnly: true }),
    defineField({ name: "createdAt", title: "Created at", type: "datetime", readOnly: true }),
  ],
  orderings: [
    { title: "Newest first", name: "createdAtDesc", by: [{ field: "createdAt", direction: "desc" }] },
  ],
  preview: {
    select: { action: "action", actor: "actorEmail", target: "targetId", createdAt: "createdAt" },
    prepare({ action, actor, target, createdAt }) {
      return {
        title: action || "Audit entry",
        subtitle: [actor, target, createdAt && new Date(createdAt).toLocaleString()].filter(Boolean).join(" · "),
      };
    },
  },
});
