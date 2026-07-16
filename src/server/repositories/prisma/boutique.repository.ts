import type { Boutique } from "@/src/server/models/boutique";
import type { BoutiqueRepository } from "@/src/server/repositories/interfaces";
import { toDomainBoutique } from "@/src/server/repositories/prisma/mappers";
import { prisma } from "@/src/server/database/prisma";

export class PrismaBoutiqueRepository implements BoutiqueRepository {
  async list(): Promise<Boutique[]> {
    const rows = await prisma.boutique.findMany({
      orderBy: { name: "asc" },
    });
    return rows.map(toDomainBoutique);
  }

  async findById(id: string): Promise<Boutique | null> {
    const row = await prisma.boutique.findUnique({ where: { id } });
    return row ? toDomainBoutique(row) : null;
  }

  async findByCode(code: string): Promise<Boutique | null> {
    const row = await prisma.boutique.findUnique({ where: { code } });
    return row ? toDomainBoutique(row) : null;
  }
}
