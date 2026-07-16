import type { Order } from "@/src/server/models/order";
import type { OrderRepository } from "@/src/server/repositories/interfaces";

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
}
