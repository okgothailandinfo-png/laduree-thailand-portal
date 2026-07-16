import type { Boutique } from "@/src/server/models/boutique";
import type { Category } from "@/src/server/models/category";
import type { Order } from "@/src/server/models/order";
import type { PickupAvailability } from "@/src/server/models/pickup";
import type { Product } from "@/src/server/models/product";

export interface ProductRepository {
  list(): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
  findById(id: string): Promise<Product | null>;
}

export interface CategoryRepository {
  list(): Promise<Category[]>;
}

export interface BoutiqueRepository {
  list(): Promise<Boutique[]>;
  findById(id: string): Promise<Boutique | null>;
}

export interface PickupRepository {
  getAvailability(params: {
    boutiqueId: string;
    dateKey: string;
  }): Promise<PickupAvailability | null>;
  listSlots(): Promise<PickupAvailability["slots"]>;
}

export interface OrderRepository {
  create(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
}
