import type { Media } from "@/src/server/models/media";
import type {
  AdminMediaListPage,
  MediaRepository,
} from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";

function rejectAdmin(): never {
  throw new AppError(
    "CONFIG_ERROR",
    "Admin media operations require DATA_SOURCE=prisma and DATABASE_URL.",
  );
}

export class MockMediaRepository implements MediaRepository {
  async findById(): Promise<Media | null> {
    return null;
  }

  async findByIds(): Promise<Media[]> {
    return [];
  }

  async adminList(): Promise<AdminMediaListPage> {
    rejectAdmin();
  }

  async create(): Promise<Media> {
    rejectAdmin();
  }

  async update(): Promise<Media> {
    rejectAdmin();
  }

  async remove(): Promise<void> {
    rejectAdmin();
  }

  async countProductLinks(): Promise<number> {
    return 0;
  }
}
