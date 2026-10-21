import { ImagesIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

/** "Style Guide" looks on the home page: a photo with shoppable product dots */
export const lookbookType = defineType({
  name: "lookbook",
  title: "Style Guide Look",
  type: "document",
  icon: ImagesIcon,
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required().max(80),
    }),
    defineField({
      name: "description",
      title: "Short description",
      type: "text",
      rows: 2,
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "image",
      title: "Look photo",
      type: "image",
      description: "A wide photo works best (for example 1600 × 1000).",
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "hotspots",
      title: "Products in this look",
      description: "Each product shows as a dot on the photo. X and Y are percentages from the top-left corner.",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "lookHotspot",
          fields: [
            defineField({
              name: "product",
              title: "Product",
              type: "reference",
              to: [{ type: "product" }],
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "x",
              title: "Across (%)",
              type: "number",
              initialValue: 50,
              validation: (Rule) => Rule.required().min(0).max(100),
            }),
            defineField({
              name: "y",
              title: "Down (%)",
              type: "number",
              initialValue: 50,
              validation: (Rule) => Rule.required().min(0).max(100),
            }),
          ],
          preview: {
            select: { title: "product.name", media: "product.images.0", x: "x", y: "y" },
            prepare: ({ title, media, x, y }) => ({ title: title || "Product", subtitle: `${x ?? 0}% · ${y ?? 0}%`, media }),
          },
        }),
      ],
      validation: (Rule) => Rule.max(8),
    }),
    defineField({
      name: "order",
      title: "Display order",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "active",
      title: "Show on home page",
      type: "boolean",
      initialValue: true,
    }),
  ],
  orderings: [{ title: "Display order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "title", media: "image", active: "active", spots: "hotspots" },
    prepare: ({ title, media, active, spots }) => ({
      title,
      media,
      subtitle: `${spots?.length ?? 0} products${active === false ? " · hidden" : ""}`,
    }),
  },
});
