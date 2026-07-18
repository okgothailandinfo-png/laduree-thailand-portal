import type {
  AdminCreateHomepageContentInput,
  AdminCreateHomepageSectionInput,
  AdminHomepageContentDto,
  AdminHomepageSectionDto,
  AdminUpdateHomepageContentInput,
  AdminUpdateHomepageSectionInput,
  HomepageContentTypeDto,
} from "@/src/server/admin/dto";
import { requirePrismaDataSource } from "@/src/server/admin/auth";
import type {
  HomepageContent,
  HomepageSection,
} from "@/src/server/models/homepage";
import type {
  HomepageContentRepository,
  HomepageSectionRepository,
} from "@/src/server/repositories/interfaces";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";
import {
  optionalString,
  requireBoolean,
  requireObject,
  requireString,
} from "@/src/server/utils/validation";

const CONTENT_TYPES: readonly HomepageContentTypeDto[] = [
  "plain_text",
  "multiline_text",
  "url",
  "boolean",
] as const;

function requireInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new AppError("VALIDATION_ERROR", `${field} must be a valid integer.`, {
      details: { field },
    });
  }
  return value;
}

function requireContentType(
  value: unknown,
  field: string,
): HomepageContentTypeDto {
  const raw = requireString(value, field);
  if (!CONTENT_TYPES.includes(raw as HomepageContentTypeDto)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${field} must be one of: ${CONTENT_TYPES.join(", ")}.`,
      { details: { field } },
    );
  }
  return raw as HomepageContentTypeDto;
}

function requireKey(value: unknown, field: string): string {
  const key = requireString(value, field, { max: 120 });
  if (!/^[a-z][a-z0-9_.-]*$/i.test(key)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${field} must be a stable alphanumeric key (letters, numbers, . _ -).`,
      { details: { field } },
    );
  }
  return key;
}

function validateContentValue(
  value: string,
  contentType: HomepageContentTypeDto,
): string {
  if (contentType === "boolean") {
    if (value !== "true" && value !== "false") {
      throw new AppError(
        "VALIDATION_ERROR",
        "boolean content value must be \"true\" or \"false\".",
        { details: { field: "value" } },
      );
    }
    return value;
  }
  if (contentType === "url") {
    if (value.startsWith("/") && !value.startsWith("//")) return value;
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("invalid");
      }
      return value;
    } catch {
      throw new AppError(
        "VALIDATION_ERROR",
        "url content value must be a valid http(s) URL or internal path.",
        { details: { field: "value" } },
      );
    }
  }
  // No HTML editing in this sprint — reject angle brackets as a safety net.
  if (/[<>]/.test(value)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "HTML is not allowed in homepage content.",
      { details: { field: "value" } },
    );
  }
  return value;
}

function toSectionDto(section: HomepageSection): AdminHomepageSectionDto {
  return {
    id: section.id,
    key: section.key,
    title: section.title,
    subtitle: section.subtitle,
    description: section.description,
    sortOrder: section.sortOrder,
    isActive: section.isActive,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
}

function toContentDto(content: HomepageContent): AdminHomepageContentDto {
  return {
    id: content.id,
    key: content.key,
    value: content.value,
    contentType: content.contentType,
    isActive: content.isActive,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
  };
}

export class AdminHomepageService {
  constructor(
    private readonly sections: HomepageSectionRepository,
    private readonly content: HomepageContentRepository,
  ) {}

  parseCreateSectionBody(raw: unknown): AdminCreateHomepageSectionInput {
    const body = requireObject(raw, "body");
    return {
      key: requireKey(body.key, "key"),
      title: optionalString(body.title, "title") ?? null,
      subtitle: optionalString(body.subtitle, "subtitle") ?? null,
      description: optionalString(body.description, "description") ?? null,
      sortOrder: requireInt(body.sortOrder ?? 0, "sortOrder"),
      isActive: requireBoolean(body.isActive ?? true, "isActive"),
    };
  }

  parseUpdateSectionBody(raw: unknown): AdminUpdateHomepageSectionInput {
    const body = requireObject(raw, "body");
    const input: AdminUpdateHomepageSectionInput = {};
    if (body.key !== undefined) input.key = requireKey(body.key, "key");
    if (body.title !== undefined) {
      input.title = optionalString(body.title, "title") ?? null;
    }
    if (body.subtitle !== undefined) {
      input.subtitle = optionalString(body.subtitle, "subtitle") ?? null;
    }
    if (body.description !== undefined) {
      input.description =
        optionalString(body.description, "description") ?? null;
    }
    if (body.sortOrder !== undefined) {
      input.sortOrder = requireInt(body.sortOrder, "sortOrder");
    }
    if (body.isActive !== undefined) {
      input.isActive = requireBoolean(body.isActive, "isActive");
    }
    return input;
  }

  parseCreateContentBody(raw: unknown): AdminCreateHomepageContentInput {
    const body = requireObject(raw, "body");
    const contentType = requireContentType(body.contentType, "contentType");
    const value = validateContentValue(
      requireString(body.value, "value"),
      contentType,
    );
    return {
      key: requireKey(body.key, "key"),
      value,
      contentType,
      isActive: requireBoolean(body.isActive ?? true, "isActive"),
    };
  }

  parseUpdateContentBody(raw: unknown): AdminUpdateHomepageContentInput {
    const body = requireObject(raw, "body");
    const input: AdminUpdateHomepageContentInput = {};
    if (body.key !== undefined) input.key = requireKey(body.key, "key");
    if (body.contentType !== undefined) {
      input.contentType = requireContentType(body.contentType, "contentType");
    }
    if (body.value !== undefined) {
      const contentType =
        input.contentType ??
        (typeof body.contentType === "string"
          ? requireContentType(body.contentType, "contentType")
          : undefined);
      if (!contentType) {
        // Value-only updates validate as plain text (no HTML).
        input.value = validateContentValue(
          requireString(body.value, "value"),
          "plain_text",
        );
      } else {
        input.value = validateContentValue(
          requireString(body.value, "value"),
          contentType,
        );
      }
    }
    if (body.isActive !== undefined) {
      input.isActive = requireBoolean(body.isActive, "isActive");
    }
    return input;
  }

  async listSections(): Promise<AdminHomepageSectionDto[]> {
    requirePrismaDataSource();
    const items = await this.sections.adminList();
    return items.map(toSectionDto);
  }

  async createSection(
    input: AdminCreateHomepageSectionInput,
  ): Promise<AdminHomepageSectionDto> {
    requirePrismaDataSource();
    const section = await this.sections.create(input);
    logger.info("Homepage section created", {
      sectionId: section.id,
      key: section.key,
    });
    return toSectionDto(section);
  }

  async updateSection(
    id: string,
    input: AdminUpdateHomepageSectionInput,
  ): Promise<AdminHomepageSectionDto> {
    requirePrismaDataSource();
    const existing = await this.sections.findById(requireString(id, "id"));
    if (!existing) {
      throw new AppError("NOT_FOUND", `Homepage section not found: ${id}`);
    }
    const section = await this.sections.update(id, input);
    logger.info("Homepage content updated", {
      kind: "section",
      sectionId: section.id,
      key: section.key,
      isActive: section.isActive,
    });
    return toSectionDto(section);
  }

  async removeSection(id: string): Promise<void> {
    requirePrismaDataSource();
    const existing = await this.sections.findById(requireString(id, "id"));
    if (!existing) {
      throw new AppError("NOT_FOUND", `Homepage section not found: ${id}`);
    }
    await this.sections.remove(id);
    logger.info("Homepage section deleted", {
      sectionId: id,
      key: existing.key,
    });
  }

  async listContent(): Promise<AdminHomepageContentDto[]> {
    requirePrismaDataSource();
    const items = await this.content.adminList();
    return items.map(toContentDto);
  }

  async createContent(
    input: AdminCreateHomepageContentInput,
  ): Promise<AdminHomepageContentDto> {
    requirePrismaDataSource();
    const row = await this.content.create(input);
    logger.info("Homepage content updated", {
      kind: "content",
      contentId: row.id,
      key: row.key,
      action: "created",
    });
    return toContentDto(row);
  }

  async updateContent(
    id: string,
    input: AdminUpdateHomepageContentInput,
  ): Promise<AdminHomepageContentDto> {
    requirePrismaDataSource();
    const existing = await this.content.findById(requireString(id, "id"));
    if (!existing) {
      throw new AppError("NOT_FOUND", `Homepage content not found: ${id}`);
    }
    // Re-validate value against the resolved content type.
    if (input.value !== undefined || input.contentType !== undefined) {
      const contentType = input.contentType ?? existing.contentType;
      const value = input.value ?? existing.value;
      input = {
        ...input,
        contentType,
        value: validateContentValue(value, contentType),
      };
    }
    const row = await this.content.update(id, input);
    logger.info("Homepage content updated", {
      kind: "content",
      contentId: row.id,
      key: row.key,
      isActive: row.isActive,
    });
    return toContentDto(row);
  }

  async removeContent(id: string): Promise<void> {
    requirePrismaDataSource();
    const existing = await this.content.findById(requireString(id, "id"));
    if (!existing) {
      throw new AppError("NOT_FOUND", `Homepage content not found: ${id}`);
    }
    await this.content.remove(id);
    logger.info("Homepage content updated", {
      kind: "content",
      contentId: id,
      key: existing.key,
      action: "deleted",
    });
  }
}
