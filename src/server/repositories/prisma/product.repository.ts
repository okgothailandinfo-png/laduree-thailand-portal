import type { Product } from "@/src/server/models/product";
import type { ProductRepository } from "@/src/server/repositories/interfaces";
import { toDomainProduct } from "@/src/server/repositories/prisma/mappers";
import { prisma } from "@/src/server/database/prisma";

const productInclude = {
  category: true,
  images: { orderBy: { sortOrder: "asc" as const } },
};

export class PrismaProductRepository implements ProductRepository {
  async list(): Promise<Product[]> {
    const rows = await prisma.product.findMany({
      where: { available: true },
      include: productInclude,
      orderBy: { title: "asc" },
    });
    return rows.map(toDomainProduct);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const row = await prisma.product.findUnique({
      where: { slug },
      include: productInclude,
    });
    return row ? toDomainProduct(row) : null;
  }

  async findById(id: string): Promise<Product | null> {
    const row = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    return row ? toDomainProduct(row) : null;
  }
}
