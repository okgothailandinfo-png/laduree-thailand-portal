import type { HomepageBannerWithMedia } from "@/src/server/models/homepage";
import type {
  AdminBannerListPage,
  HomepageBannerRepository,
} from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";

function rejectAdmin(): never {
  throw new AppError(
    "CONFIG_ERROR",
    "Admin homepage banner operations require DATA_SOURCE=prisma and DATABASE_URL.",
  );
}

export class MockHomepageBannerRepository implements HomepageBannerRepository {
  async adminList(): Promise<AdminBannerListPage> {
    rejectAdmin();
  }

  async findById(): Promise<HomepageBannerWithMedia | null> {
    return null;
  }

  async create(): Promise<HomepageBannerWithMedia> {
    rejectAdmin();
  }

  async update(): Promise<HomepageBannerWithMedia> {
    rejectAdmin();
  }

  async remove(): Promise<void> {
    rejectAdmin();
  }

  async listActiveForStorefront(): Promise<HomepageBannerWithMedia[]> {
    return [];
  }
}
