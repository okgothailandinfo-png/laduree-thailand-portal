/**
 * Mock member order history — no backend required.
 * Guest history continues to use localStorage order ids + /api/orders/history.
 */

import type { MockOrderHistoryEntry } from "./types";

const MOCK_MEMBER_ORDERS: MockOrderHistoryEntry[] = [
  {
    orderId: "mock-order-pickup-001",
    orderNumber: "LD-TH-100241",
    date: "2026-07-28",
    status: "completed",
    serviceType: "PICKUP",
    totalThb: 1290,
    boutiqueName: "Ladurée Thailand",
    detailPath: "/order-history",
  },
  {
    orderId: "mock-order-delivery-002",
    orderNumber: "LD-TH-100318",
    date: "2026-08-01",
    status: "out_for_delivery",
    serviceType: "DELIVERY",
    totalThb: 2450,
    boutiqueName: "Ladurée Thailand",
    detailPath: "/order-history",
  },
  {
    orderId: "mock-order-pickup-003",
    orderNumber: "LD-TH-100402",
    date: "2026-08-03",
    status: "preparing",
    serviceType: "PICKUP",
    totalThb: 890,
    boutiqueName: "Ladurée Thailand",
    detailPath: "/order-history",
  },
];

export function listMockMemberOrders(
  email: string | null | undefined,
): MockOrderHistoryEntry[] {
  if (!email?.trim()) return [];
  return MOCK_MEMBER_ORDERS.map((order) => ({ ...order }));
}

export function formatMockOrderStatus(
  status: MockOrderHistoryEntry["status"],
): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready";
    case "cancelled":
      return "Cancelled";
    case "out_for_delivery":
      return "Out for delivery";
    default:
      return status;
  }
}

export function formatMockServiceType(
  serviceType: MockOrderHistoryEntry["serviceType"],
): string {
  return serviceType === "DELIVERY" ? "Delivery" : "Pick-up";
}
