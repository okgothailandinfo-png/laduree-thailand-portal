import { apiGet } from "@/lib/api/client";
import type { HomepagePayload } from "@/lib/api/types";

export function fetchHomepage(options?: {
  signal?: AbortSignal;
}): Promise<HomepagePayload> {
  return apiGet<HomepagePayload>("/api/homepage", {
    signal: options?.signal,
  });
}

/** Look up a content value by stable key. */
export function contentByKey(
  content: HomepagePayload["content"],
  key: string,
): string | null {
  const item = content.find((entry) => entry.key === key);
  return item?.value ?? null;
}

/** Look up a section by stable key. */
export function sectionByKey(
  sections: HomepagePayload["sections"],
  key: string,
) {
  return sections.find((section) => section.key === key) ?? null;
}
