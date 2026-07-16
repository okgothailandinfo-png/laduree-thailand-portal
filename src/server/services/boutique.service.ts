import type { BoutiqueRepository } from "@/src/server/repositories/interfaces";
import type { BoutiqueService } from "@/src/server/services/interfaces";
import { toBoutiqueDto } from "@/src/server/services/mappers";
import type { BoutiqueDto } from "@/src/server/types/dto";

export class DefaultBoutiqueService implements BoutiqueService {
  constructor(private readonly boutiques: BoutiqueRepository) {}

  async listBoutiques(): Promise<BoutiqueDto[]> {
    const items = await this.boutiques.list();
    return items.map(toBoutiqueDto);
  }
}
