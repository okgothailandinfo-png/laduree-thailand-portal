import type { Order, OrderStatus } from "@/src/server/models/order";
import type { OrderRepository } from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";

const ordersById = new Map<string, Order>();
const ordersByNumber = new Map<string, Order>();

export class MockOrderRepository implements OrderRepository {
  async create(order: Order): Promise<Order> {
    ordersById.set(order.id, order);
    ordersByNumber.set(order.orderNumber, order);
    return order;
  }

  async findById(id: string): Promise<Order | null> {
    return ordersById.get(id) ?? null;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return ordersByNumber.get(orderNumber) ?? null;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const existing = ordersById.get(id);
    if (!existing) {
      throw new AppError("NOT_FOUND", `Order not found: ${id}`);
    }
    const next: Order = { ...existing, status };
    ordersById.set(id, next);
    ordersByNumber.set(next.orderNumber, next);
    return next;
  }
}
