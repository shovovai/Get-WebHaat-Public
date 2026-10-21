import { EnvelopeIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

// History of newsletter campaigns sent from /admin/subscriptions
export const emailCampaignType = defineType({
  name: "emailCampaign",
  title: "Email Campaigns",
  type: "document",
  icon: EnvelopeIcon,
  readOnly: true,
  fields: [
    defineField({ name: "subject", title: "Subject", type: "string" }),
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "message", title: "Message", type: "text" }),
    defineField({ name: "ctaText", title: "Button Text", type: "string" }),
    defineField({ name: "ctaUrl", title: "Button URL", type: "string" }),
    defineField({ name: "recipients", title: "Recipients", type: "number" }),
    defineField({ name: "delivered", title: "Delivered", type: "number" }),
    defineField({ name: "failed", title: "Failed", type: "number" }),
    defineField({ name: "sentBy", title: "Sent By", type: "string" }),
    defineField({ name: "sentAt", title: "Sent At", type: "datetime" }),
  ],
  orderings: [
    {
      title: "Newest",
      name: "sentAtDesc",
      by: [{ field: "sentAt", direction: "desc" }],
    },
  ],
  preview: {
    select: { title: "subject", sentAt: "sentAt", delivered: "delivered" },
    prepare: ({ title, sentAt, delivered }) => ({
      title,
      subtitle: `${delivered ?? 0} delivered · ${
        sentAt ? new Date(sentAt).toLocaleString() : ""
      }`,
    }),
  },
});
