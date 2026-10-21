// Test file to verify points calculation logic
// This can be used to manually test the points system

// Test file to verify points calculation logic
// This can be used to manually test the points system

import {
  calculateRewardPoints,
  calculateLoyaltyPoints,
  calculatePointsUpdate,
} from "../lib/pointsCalculation.js";

// Test data
const testOrders = [
  { totalAmount: 2500, status: "completed" }, // Below threshold
  { totalAmount: 3500, status: "completed" }, // Above threshold - should get 70 points
  { totalAmount: 5000, status: "completed" }, // Above threshold - should get 100 points
  { totalAmount: 1500, status: "pending" }, // Below threshold, not completed
];

const testUser = {
  totalSpent: 8000,
  completedOrders: 12, // Should get loyalty points for reaching 5, 10 orders
  rewardPoints: 50,
  loyaltyPoints: 200,
};

console.log("Testing Points Calculation System\n");

// Test 1: Reward Points Calculation
console.log("1. Testing Reward Points:");
testOrders.forEach((order, index) => {
  const points = calculateRewardPoints(order.totalAmount);
  console.log(
    `   Order ${index + 1}: $${order.totalAmount} → ${points} reward points`
  );
});

// Test 2: Loyalty Points Calculation
console.log("\n2. Testing Loyalty Points:");
for (let orders = 1; orders <= 15; orders++) {
  const points = calculateLoyaltyPoints(orders);
  if (points > 0) {
    console.log(`   ${orders} completed orders → ${points} loyalty points`);
  }
}

// Test 3: Complete Points Update
console.log("\n3. Testing Complete Points Update:");
const newOrder = { totalAmount: 4000, status: "completed" };
const pointsUpdate = calculatePointsUpdate(
  newOrder.totalAmount,
  testUser.completedOrders + 1
);
console.log(`   New order: $${newOrder.totalAmount}`);
console.log(`   Completed orders: ${testUser.completedOrders + 1}`);
console.log(`   Reward points earned: ${pointsUpdate.rewardPoints}`);
console.log(`   Loyalty points earned: ${pointsUpdate.loyaltyPoints}`);

console.log("\n✅ Points calculation tests completed!");
