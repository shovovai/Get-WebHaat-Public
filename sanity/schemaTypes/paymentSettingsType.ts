import { CreditCardIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

// Singleton (_id "paymentSettings") written by Admin → Payments.
// `config` is JSON with gateway secrets encrypted (see lib/paymentConfig.ts).
// Edit it from the admin panel, not here.
export const paymentSettingsType = defineType({
  name: "paymentSettings",
  title: "Payment Settings",
  type: "document",
  icon: CreditCardIcon,
  readOnly: true,
  fields: [
    defineField({
      name: "config",
      title: "Configuration (encrypted, managed in Admin → Payments)",
      type: "text",
      hidden: true,
    }),
    defineField({ name: "updatedAt", title: "Updated at", type: "datetime" }),
    defineField({ name: "updatedBy", title: "Updated by", type: "string" }),
  ],
  preview: { prepare: () => ({ title: "Payment Settings" }) },
});
