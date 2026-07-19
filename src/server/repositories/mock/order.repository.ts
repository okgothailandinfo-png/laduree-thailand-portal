import type {
  AdminKitchenOrderListQuery,
  AdminOrderListQuery,
} from "@/src/server/admin/dto";
import type { Order, OrderStatus } from "@/src/server/models/order";
import type {
  AdminKitchenOrderPage,
  AdminOrderDetailRecord,
  AdminOrderListPage,
  CustomerOrderCompletionRecord,
  OrderPaymentUpdateOptions,
  OrderRepository,
  OrderStatusUpdateOptions,
} from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";

const ordersById = new Map<string, Order>();
const ordersByNumber = new Map<string, Order>();

function rejectAdmin(): never {
  throw new AppError(
    "CONFIG_ERROR",
    "Admin order operations require DATA_SOURCE=prisma and DATABASE_URL.",
  );
}

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

  async updateStatus(
    id: string,
    status: OrderStatus,
    options?: OrderStatusUpdateOptions,
  ): Promise<Order> {
    void options;
    const existing = ordersById.get(id);
    if (!existing) {
      throw new AppError("NOT_FOUND", `Order not found: ${id}`);
    }
    const next: Order = { ...existing, status };
    ordersById.set(id, next);
    ordersByNumber.set(next.orderNumber, next);
    return next;
  }

  async updatePaymentStatus(
    orderId: string,
    status: "pending" | "mock_accepted" | "failed",
    options?: OrderPaymentUpdateOptions,
  ): Promise<AdminOrderDetailRecord> {
    void orderId;
    void status;
    void options;
    rejectAdmin();
  }

  async adminList(query: AdminOrderListQuery): Promise<AdminOrderListPage> {
    void query;
    rejectAdmin();
  }

  async adminKitchenList(
    query: AdminKitchenOrderListQuery,
  ): Promise<AdminKitchenOrderPage> {
    void query;
    rejectAdmin();
  }

  async adminFindById(id: string): Promise<AdminOrderDetailRecord | null> {
    void id;
    rejectAdmin();
  }

  async findCustomerCompletion(
    id: string,
  ): Promise<CustomerOrderCompletionRecord | null> {
    const order = ordersById.get(id);
    if (!order) return null;
    return {
      order,
      paymentStatus: order.payment
        ? order.payment.status === "mock_accepted"
          ? "mock_accepted"
          : "pending"
        : "none",
      history: [],
      verifiedAt: order.status === "completed" ? order.createdAt : null,
    };
  }

  async findCustomerHistoryByIds(
    ids: string[],
  ): Promise<CustomerOrderCompletionRecord[]> {
    const results: CustomerOrderCompletionRecord[] = [];
    for (const id of ids) {
      const record = await this.findCustomerCompletion(id);
      if (record) results.push(record);
    }
    return results;
  }
}
