import type { StructureResolver } from "sanity/structure";

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title("WebHaat Content")
    .items([
      S.listItem()
        .title("Store Settings")
        .id("storeSettings")
        .child(
          S.document().schemaType("storeSettings").documentId("storeSettings")
        ),
      S.divider(),
      S.documentTypeListItem("category").title("Categories"),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) =>
          item.getId() && !["category", "storeSettings", "paymentSettings"].includes(item.getId()!)
      ),
    ]);
