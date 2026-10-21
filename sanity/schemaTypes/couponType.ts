import { TagIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

// Discount codes, managed from /admin/coupons
export const couponType = defineType({
  name: "coupon",
  title: "Coupons",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "code",
      title: "Code",
      type: "string",
      description: "Customers type this at checkout (stored in UPPERCASE)",
      validation: (Rule) => Rule.required().min(3).max(32),
    }),
    defineField({
      name: "description",
      title: "Internal description",
      type: "string",
    }),
    defineField({
      name: "discountType",
      title: "Discount type",
      type: "string",
      options: {
        list: [
          { title: "Percentage", value: "percent" },
          { title: "Fixed amount", value: "fixed" },
        ],
        layout: "radio",
      },
      initialValue: "percent",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "value",
      title: "Value",
      type: "number",
      description: "Percent (e.g. 10) or fixed amount in store currency",
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: "minOrderAmount",
      title: "Minimum order subtotal",
      type: "number",
    }),
    defineField({
      name: "maxDiscountAmount",
      title: "Maximum discount (for percentage coupons)",
      type: "number",
    }),
    defineField({ name: "startsAt", title: "Starts at", type: "datetime" }),
    defineField({ name: "expiresAt", title: "Expires at", type: "datetime" }),
    defineField({
      name: "usageLimit",
      title: "Total usage limit",
      type: "number",
      description: "Leave empty for unlimited",
    }),
    defineField({
      name: "oncePerCustomer",
      title: "Once per customer",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "usedCount",
      title: "Times used",
      type: "number",
      initialValue: 0,
      readOnly: true,
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
  ],
  preview: {
    select: { code: "code", type: "discountType", value: "value", active: "active" },
    prepare: ({ code, type, value, active }) => ({
      title: code,
      subtitle: `${type === "percent" ? `${value}%` : value} off${active ? "" : " · inactive"}`,
    }),
  },
});
