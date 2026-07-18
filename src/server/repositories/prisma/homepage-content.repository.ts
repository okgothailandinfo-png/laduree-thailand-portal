import type {
  AdminCreateHomepageContentInput,
  AdminUpdateHomepageContentInput,
} from "@/src/server/admin/dto";
import type { HomepageContent } from "@/src/server/models/homepage";
import type { HomepageContentRepository } from "@/src/server/repositories/interfaces";
import { toDomainHomepageContent } from "@/src/server/repositories/prisma/mappers";
import { prisma } from "@/src/server/database/prisma";
import { AppError } from "@/src/server/utils/errors";

export class PrismaHomepageContentRepository
  implements HomepageContentRepository
{
  async adminList(): Promise<HomepageContent[]> {
    const rows = await prisma.homepageContent.findMany({
      orderBy: [{ key: "asc" }],
    });
    return rows.map(toDomainHomepageContent);
  }

  async findById(id: string): Promise<HomepageContent | null> {
    const row = await prisma.homepageContent.findUnique({ where: { id } });
    return row ? toDomainHomepageContent(row) : null;
  }

  async findByKey(key: string): Promise<HomepageContent | null> {
    const row = await prisma.homepageContent.findUnique({ where: { key } });
    return row ? toDomainHomepageContent(row) : null;
  }

  async create(
    input: AdminCreateHomepageContentInput,
  ): Promise<HomepageContent> {
    try {
      const row = await prisma.homepageContent.create({
        data: {
          key: input.key,
          value: input.value,
          contentType: input.contentType,
          isActive: input.isActive,
        },
      });
      return toDomainHomepageContent(row);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        throw new AppError(
          "CONFLICT",
          `Homepage content key already exists: ${input.key}`,
          { details: { field: "key" } },
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: AdminUpdateHomepageContentInput,
  ): Promise<HomepageContent> {
    try {
      const row = await prisma.homepageContent.update({
        where: { id },
        data: {
          ...(input.key !== undefined ? { key: input.key } : {}),
          ...(input.value !== undefined ? { value: input.value } : {}),
          ...(input.contentType !== undefined
            ? { contentType: input.contentType }
            : {}),
          ...(input.isActive !== undefined
            ? { isActive: input.isActive }
            : {}),
        },
      });
      return toDomainHomepageContent(row);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2025"
      ) {
        throw new AppError("NOT_FOUND", `Homepage content not found: ${id}`);
      }
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        throw new AppError(
          "CONFLICT",
          `Homepage content key already exists: ${input.key}`,
          { details: { field: "key" } },
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await prisma.homepageContent.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2025"
      ) {
        throw new AppError("NOT_FOUND", `Homepage content not found: ${id}`);
      }
      throw error;
    }
  }

  async listActiveForStorefront(): Promise<HomepageContent[]> {
    const rows = await prisma.homepageContent.findMany({
      where: { isActive: true },
      orderBy: [{ key: "asc" }],
    });
    return rows.map(toDomainHomepageContent);
  }
}
