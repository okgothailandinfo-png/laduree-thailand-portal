import type { AllowedImageMimeType } from "@/src/server/storage/validation";

export type ImageDimensions = {
  width: number;
  height: number;
};

/**
 * Best-effort dimension parse from image headers (no external deps).
 * Returns null when dimensions cannot be determined safely.
 */
export function readImageDimensions(
  buffer: Buffer,
  mimeType: AllowedImageMimeType,
): ImageDimensions | null {
  try {
    if (mimeType === "image/png") return readPng(buffer);
    if (mimeType === "image/jpeg") return readJpeg(buffer);
    if (mimeType === "image/webp") return readWebp(buffer);
  } catch {
    return null;
  }
  return null;
}

function readPng(buffer: Buffer): ImageDimensions | null {
  // IHDR starts at byte 16 after 8-byte signature + 8-byte chunk header.
  if (buffer.length < 24) return null;
  if (buffer.toString("ascii", 12, 16) !== "IHDR") return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!width || !height) return null;
  return { width, height };
}

function readJpeg(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4) return null;
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === undefined) return null;
    // Soften / restart / padding
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // SOI / EOI / RSTn / TEM — no length
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0x01
    ) {
      offset += 2;
      continue;
    }
    if (offset + 4 > buffer.length) return null;
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    // SOF0–SOF3, SOF5–SOF7, SOF9–SOF11, SOF13–SOF15
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      if (offset + 9 > buffer.length) return null;
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      if (!width || !height) return null;
      return { width, height };
    }
    offset += 2 + length;
  }
  return null;
}

function readWebp(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 30) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8X" && buffer.length >= 30) {
    const width =
      1 + buffer[24]! + (buffer[25]! << 8) + (buffer[26]! << 16);
    const height =
      1 + buffer[27]! + (buffer[28]! << 8) + (buffer[29]! << 16);
    if (!width || !height) return null;
    return { width, height };
  }

  if (chunk === "VP8 " && buffer.length >= 30) {
    // Lossy bitstream: frame tag at 20, dimensions at 26–29 (14-bit each).
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    if (!width || !height) return null;
    return { width, height };
  }

  if (chunk === "VP8L" && buffer.length >= 25) {
    // Lossless signature 0x2f at byte 20; dims packed in next 4 bytes.
    if (buffer[20] !== 0x2f) return null;
    const bits = buffer.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    if (!width || !height) return null;
    return { width, height };
  }

  return null;
}
