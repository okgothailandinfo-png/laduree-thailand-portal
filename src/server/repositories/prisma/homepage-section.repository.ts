import type {
  AdminCreateHomepageSectionInput,
  AdminUpdateHomepageSectionInput,
} from "@/src/server/admin/dto";
import type { HomepageSection } from "@/src/server/models/homepage";
import type { HomepageSectionRepository } from "@/src/server/repositories/interfaces";
import { toDomainHomepageSection } from "@/src/server/repositories/prisma/mappers";
import { prisma } from "@/src/server/database/prisma";
import { AppError } from "@/src/server/utils/errors";

export class PrismaHomepageSectionRepository
  implements HomepageSectionRepository
{
  async adminList(): Promise<HomepageSection[]> {
    const rows = await prisma.homepageSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toDomainHomepageSection);
  }

  async findById(id: string): Promise<HomepageSection | null> {
    const row = await prisma.homepageSection.findUnique({ where: { id } });
    return row ? toDomainHomepageSection(row) : null;
  }

  async findByKey(key: string): Promise<HomepageSection | null> {
    const row = await prisma.homepageSection.findUnique({ where: { key } });
    return row ? toDomainHomepageSection(row) : null;
  }

  async create(
    input: AdminCreateHomepageSectionInput,
  ): Promise<HomepageSection> {
    try {
      const row = await prisma.homepageSection.create({
        data: {
          key: input.key,
          title: input.title ?? null,
          subtitle: input.subtitle ?? null,
          description: input.description ?? null,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
        },
      });
      return toDomainHomepageSection(row);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        throw new AppError(
          "CONFLICT",
          `Homepage section key already exists: ${input.key}`,
          { details: { field: "key" } },
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: AdminUpdateHomepageSectionInput,
  ): Promise<HomepageSection> {
    try {
      const row = await prisma.homepageSection.update({
        where: { id },
        data: {
          ...(input.key !== undefined ? { key: input.key } : {}),
          ...(input.title !== undefined ? { title: input.title ?? null } : {}),
          ...(input.subtitle !== undefined
            ? { subtitle: input.subtitle ?? null }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description ?? null }
            : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
          ...(input.isActive !== undefined
            ? { isActive: input.isActive }
            : {}),
        },
      });
      return toDomainHomepageSection(row);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2025"
      ) {
        throw new AppError("NOT_FOUND", `Homepage section not found: ${id}`);
      }
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        throw new AppError(
          "CONFLICT",
          `Homepage section key already exists: ${input.key}`,
          { details: { field: "key" } },
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await prisma.homepageSection.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2025"
      ) {
        throw new AppError("NOT_FOUND", `Homepage section not found: ${id}`);
      }
      throw error;
    }
  }

  async listActiveForStorefront(): Promise<HomepageSection[]> {
    const rows = await prisma.homepageSection.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toDomainHomepageSection);
  }
}
