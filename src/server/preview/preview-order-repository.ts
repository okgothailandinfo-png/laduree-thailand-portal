import type {
  AdminKitchenOrderListQuery,
  AdminOrderListQuery,
} from "@/src/server/admin/dto";
import type { Order } from "@/src/server/models/order";
import type {
  AdminKitchenOrderPage,
  AdminOrderDetailRecord,
  AdminOrderListPage,
  CustomerOrderCompletionRecord,
  OrderPaymentUpdateOptions,
  OrderRepository,
  OrderStatusUpdateOptions,
} from "@/src/server/repositories/interfaces";
import type { OrderStatus } from "@/src/server/models/order";
import {
  readPreviewCommerceSnapshot,
  writePreviewOrderCookie,
} from "@/src/server/preview/preview-commerce-cookie";

/**
 * Restores the preview PICKUP order when the in-memory mock isolate is empty.
 */
export class PreviewCookieOrderRepository implements OrderRepository {
  constructor(private readonly inner: OrderRepository) {}

  private async restore(id?: string): Promise<Order | null> {
    const snapshot = await readPreviewCommerceSnapshot();
    const order = snapshot?.order ?? null;
    if (!order) return null;
    if (id && order.id !== id) return null;
    return this.inner.create(order);
  }

  async create(order: Order): Promise<Order> {
    const saved = await this.inner.create(order);
    await writePreviewOrderCookie(saved);
    return saved;
  }

  async findById(id: string): Promise<Order | null> {
    const existing = await this.inner.findById(id);
    if (existing) return existing;
    const restored = await this.restore(id);
    return restored;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const existing = await this.inner.findByOrderNumber(orderNumber);
    if (existing) return existing;
    const snapshot = await readPreviewCommerceSnapshot();
    if (!snapshot?.order || snapshot.order.orderNumber !== orderNumber) {
      return null;
    }
    return this.inner.create(snapshot.order);
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    options?: OrderStatusUpdateOptions,
  ): Promise<Order> {
    if (!(await this.inner.findById(id))) {
      await this.restore(id);
    }
    const saved = await this.inner.updateStatus(id, status, options);
    await writePreviewOrderCookie(saved);
    return saved;
  }

  async updateOrderNumber(id: string, orderNumber: string): Promise<Order> {
    if (!(await this.inner.findById(id))) {
      await this.restore(id);
    }
    const saved = await this.inner.updateOrderNumber(id, orderNumber);
    await writePreviewOrderCookie(saved);
    return saved;
  }

  async attachPayment(
    orderId: string,
    payment: NonNullable<Order["payment"]>,
  ): Promise<Order> {
    if (!(await this.inner.findById(orderId))) {
      await this.restore(orderId);
    }
    const saved = await this.inner.attachPayment(orderId, payment);
    await writePreviewOrderCookie(saved);
    return saved;
  }

  async updatePaymentStatus(
    orderId: string,
    status: "pending" | "mock_accepted" | "failed",
    options?: OrderPaymentUpdateOptions,
  ): Promise<AdminOrderDetailRecord> {
    return this.inner.updatePaymentStatus(orderId, status, options);
  }

  async adminList(query: AdminOrderListQuery): Promise<AdminOrderListPage> {
    return this.inner.adminList(query);
  }

  async adminKitchenList(
    query: AdminKitchenOrderListQuery,
  ): Promise<AdminKitchenOrderPage> {
    return this.inner.adminKitchenList(query);
  }

  async adminFindById(id: string): Promise<AdminOrderDetailRecord | null> {
    return this.inner.adminFindById(id);
  }

  async findCustomerCompletion(
    id: string,
  ): Promise<CustomerOrderCompletionRecord | null> {
    if (!(await this.inner.findById(id))) {
      await this.restore(id);
    }
    return this.inner.findCustomerCompletion(id);
  }

  async findCustomerHistoryByIds(
    ids: string[],
  ): Promise<CustomerOrderCompletionRecord[]> {
    for (const id of ids) {
      if (!(await this.inner.findById(id))) {
        await this.restore(id);
      }
    }
    return this.inner.findCustomerHistoryByIds(ids);
  }
}
