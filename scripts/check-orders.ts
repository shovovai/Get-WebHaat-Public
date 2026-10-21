import { formatPrice } from "@/lib/storeConfig";
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "../sanity/env";

// Standalone client (the app's clients are server-only and can't load in a plain script)
const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
});

async function checkOrders() {
  try {
    console.log("Checking orders in Sanity...\n");

    // Get total count
    const totalCount = await client.fetch(`count(*[_type == "order"])`);
    console.log(`Total orders in database: ${totalCount}\n`);

    if (totalCount > 0) {
      // Get all orders
      const orders = await client.fetch(`
        *[_type == "order"] | order(_createdAt desc) [0...10] {
          _id,
          orderNumber,
          customerName,
          email,
          status,
          totalPrice,
          orderDate,
          _createdAt
        }
      `);

      orders.forEach((order: any, index: number) => {
        console.log(`\n${index + 1}. Order #${order.orderNumber}`);
        console.log(`   Customer: ${order.customerName} (${order.email})`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Total: ${formatPrice(order.totalPrice)}`);
        console.log(
          `   Created: ${new Date(order._createdAt).toLocaleString()}`
        );
      });

      // Get status breakdown
      const statusBreakdown = await client.fetch(`
        {
          "pending": count(*[_type == "order" && status == "pending"]),
          "address_confirmed": count(*[_type == "order" && status == "address_confirmed"]),
          "order_confirmed": count(*[_type == "order" && status == "order_confirmed"]),
          "packed": count(*[_type == "order" && status == "packed"]),
          "ready_for_delivery": count(*[_type == "order" && status == "ready_for_delivery"]),
          "out_for_delivery": count(*[_type == "order" && status == "out_for_delivery"]),
          "delivered": count(*[_type == "order" && status == "delivered"]),
          "completed": count(*[_type == "order" && status == "completed"]),
          "cancelled": count(*[_type == "order" && status == "cancelled"]),
          "rescheduled": count(*[_type == "order" && status == "rescheduled"]),
          "failed_delivery": count(*[_type == "order" && status == "failed_delivery"])
        }
      `);

      console.log("\n\nStatus Breakdown:");
      Object.entries(statusBreakdown).forEach(([status, count]) => {
        if ((count as number) > 0) {
          console.log(`  ${status}: ${count}`);
        }
      });
    } else {
      console.log("No orders found in the database.");
    }
  } catch (error) {
    console.error("Error checking orders:", error);
  }
}

checkOrders();
