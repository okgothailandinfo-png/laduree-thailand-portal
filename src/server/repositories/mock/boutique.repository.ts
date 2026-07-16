import type { Boutique } from "@/src/server/models/boutique";
import type { BoutiqueRepository } from "@/src/server/repositories/interfaces";
import { MOCK_BOUTIQUES } from "@/src/server/repositories/mock/data";

export class MockBoutiqueRepository implements BoutiqueRepository {
  async list(): Promise<Boutique[]> {
    return [...MOCK_BOUTIQUES];
  }

  async findById(id: string): Promise<Boutique | null> {
    return MOCK_BOUTIQUES.find((boutique) => boutique.id === id) ?? null;
  }

  async findByCode(code: string): Promise<Boutique | null> {
    return MOCK_BOUTIQUES.find((boutique) => boutique.code === code) ?? null;
  }
}
