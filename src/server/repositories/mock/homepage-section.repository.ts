import type { HomepageSection } from "@/src/server/models/homepage";
import type { HomepageSectionRepository } from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";

function rejectAdmin(): never {
  throw new AppError(
    "CONFIG_ERROR",
    "Admin homepage section operations require DATA_SOURCE=prisma and DATABASE_URL.",
  );
}

export class MockHomepageSectionRepository
  implements HomepageSectionRepository
{
  async adminList(): Promise<HomepageSection[]> {
    rejectAdmin();
  }

  async findById(): Promise<HomepageSection | null> {
    return null;
  }

  async findByKey(): Promise<HomepageSection | null> {
    return null;
  }

  async create(): Promise<HomepageSection> {
    rejectAdmin();
  }

  async update(): Promise<HomepageSection> {
    rejectAdmin();
  }

  async remove(): Promise<void> {
    rejectAdmin();
  }

  async listActiveForStorefront(): Promise<HomepageSection[]> {
    return [];
  }
}
