export type Media = {
  id: string;
  url: string;
  altText: string | null;
  title: string | null;
  isActive: boolean;
  originalFileName: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  storageProvider: string | null;
  createdAt: string;
  updatedAt: string;
};
