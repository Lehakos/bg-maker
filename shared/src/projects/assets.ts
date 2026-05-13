export const projectAssetsFolderId = "assets";
export const projectAssetsFolderName = "Assets";

export const projectImageAssetContentTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export type ProjectImageAssetContentType = (typeof projectImageAssetContentTypes)[number];

export type ProjectImageAsset = {
  id: string;
  fileName: string;
  contentType: ProjectImageAssetContentType;
  byteSize: number;
  createdAt: string;
};
