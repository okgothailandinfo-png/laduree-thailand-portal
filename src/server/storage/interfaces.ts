export type StorageProviderName = "local";

export type UploadObjectInput = {
  /** Relative storage key (no leading slash), e.g. "folder/uuid.webp". */
  key: string;
  data: Buffer;
  mimeType: string;
};

export type UploadObjectResult = {
  key: string;
  /** Public URL path (never a filesystem path), e.g. "/uploads/uuid.webp". */
  publicUrl: string;
  sizeBytes: number;
};

export interface StorageProvider {
  readonly name: StorageProviderName;
  upload(input: UploadObjectInput): Promise<UploadObjectResult>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
  exists(key: string): Promise<boolean>;
}
