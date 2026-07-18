/**
 * Non-database smoke for local storage + image validation.
 * Run: npx tsx src/server/storage/smoke/run-storage-smoke.ts
 */

import { access, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { LocalStorageProvider } from "@/src/server/storage/providers/local-storage";
import { StorageService } from "@/src/server/storage/storage-service";
import {
  generateStorageFileName,
  resolveMaxFileSizeBytes,
  sanitizeOriginalFileName,
  validateImageUpload,
} from "@/src/server/storage/validation";
import { AppError } from "@/src/server/utils/errors";

function assert(name: string, cond: boolean, detail = "") {
  console.log(
    `${cond ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`,
  );
  if (!cond) process.exitCode = 1;
}

async function main() {
  const tmp = path.resolve("public/uploads/_smoke");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const provider = new LocalStorageProvider(tmp, "/uploads");
  const storage = new StorageService(provider);

  const jpeg = Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z",
    "base64",
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const webp = Buffer.alloc(30);
  webp.write("RIFF", 0);
  webp.writeUInt32LE(22, 4);
  webp.write("WEBP", 8);
  webp.write("VP8X", 12);
  webp.writeUInt32LE(10, 16);

  try {
    const j = await storage.uploadImage({
      buffer: jpeg,
      declaredMimeType: "image/jpeg",
      originalFileName: "a.jpg",
    });
    assert(
      "JPEG upload succeeds",
      j.mimeType === "image/jpeg" && j.publicUrl.startsWith("/uploads/"),
    );
    const p = await storage.uploadImage({
      buffer: png,
      declaredMimeType: "image/png",
      originalFileName: "b.png",
    });
    assert("PNG upload succeeds", p.mimeType === "image/png");
    const w = await storage.uploadImage({
      buffer: webp,
      declaredMimeType: "image/webp",
      originalFileName: "c.webp",
    });
    assert("WebP upload succeeds", w.mimeType === "image/webp");
  } catch (e) {
    assert(
      "JPEG/PNG/WebP upload",
      false,
      e instanceof Error ? e.message : String(e),
    );
  }

  try {
    validateImageUpload({
      buffer: jpeg,
      declaredMimeType: "image/gif",
      originalFileName: "x.gif",
      maxBytes: 10_000_000,
    });
    assert("Invalid MIME rejected", false);
  } catch (e) {
    assert(
      "Invalid MIME rejected",
      e instanceof AppError && e.code === "VALIDATION_ERROR",
    );
  }

  try {
    validateImageUpload({
      buffer: Buffer.from("not-an-image"),
      declaredMimeType: "image/jpeg",
      originalFileName: "x.jpg",
      maxBytes: 10_000_000,
    });
    assert("Invalid signature rejected", false);
  } catch (e) {
    assert("Invalid signature rejected", e instanceof AppError);
  }

  try {
    validateImageUpload({
      buffer: jpeg,
      declaredMimeType: "image/jpeg",
      originalFileName: "x.jpg",
      maxBytes: 10,
    });
    assert("Oversized rejected", false);
  } catch (e) {
    assert("Oversized rejected", e instanceof AppError);
  }

  try {
    validateImageUpload({
      buffer: Buffer.alloc(0),
      declaredMimeType: "image/jpeg",
      originalFileName: "x.jpg",
      maxBytes: 10_000_000,
    });
    assert("Empty rejected", false);
  } catch (e) {
    assert("Empty rejected", e instanceof AppError);
  }

  const safe = sanitizeOriginalFileName("../../etc/passwd<script>.jpg");
  assert(
    "Unsafe filename sanitized",
    !safe.includes("..") && !safe.includes("/") && !safe.includes("<"),
  );

  const key = "fixed-key.jpg";
  await provider.upload({ key, data: jpeg, mimeType: "image/jpeg" });
  try {
    await provider.upload({ key, data: jpeg, mimeType: "image/jpeg" });
    assert("Duplicate key does not overwrite", false);
  } catch (e) {
    assert(
      "Duplicate key does not overwrite",
      e instanceof AppError && e.code === "CONFLICT",
    );
  }

  await provider.delete(key);
  try {
    await access(path.join(tmp, key));
    assert("Stored file removed", false);
  } catch {
    assert("Stored file removed", true);
  }

  assert(
    "Max size default configurable",
    resolveMaxFileSizeBytes("10") === 10 * 1024 * 1024,
  );
  assert(
    "Unique filenames",
    generateStorageFileName("image/png") !==
      generateStorageFileName("image/png"),
  );
  assert(
    "Public URL has no FS path",
    !provider.getPublicUrl("a.jpg").includes(process.cwd()),
  );

  await rm(tmp, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
