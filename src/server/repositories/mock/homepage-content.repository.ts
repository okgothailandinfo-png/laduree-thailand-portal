import type { HomepageContent } from "@/src/server/models/homepage";
import type { HomepageContentRepository } from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";

function rejectAdmin(): never {
  throw new AppError(
    "CONFIG_ERROR",
    "Admin homepage content operations require DATA_SOURCE=prisma and DATABASE_URL.",
  );
}

export class MockHomepageContentRepository
  implements HomepageContentRepository
{
  async adminList(): Promise<HomepageContent[]> {
    rejectAdmin();
  }

  async findById(): Promise<HomepageContent | null> {
    return null;
  }

  async findByKey(): Promise<HomepageContent | null> {
    return null;
  }

  async create(): Promise<HomepageContent> {
    rejectAdmin();
  }

  async update(): Promise<HomepageContent> {
    rejectAdmin();
  }

  async remove(): Promise<void> {
    rejectAdmin();
  }

  async listActiveForStorefront(): Promise<HomepageContent[]> {
    return [];
  }
}
