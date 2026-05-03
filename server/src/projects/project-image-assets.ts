import type {
  ProjectFileNode,
  ProjectImageAsset,
  ProjectImageAssetContentType
} from "@bg-maker/shared";
import { projectImageAssetContentTypes } from "@bg-maker/shared";
import sharp from "sharp";
import { ProjectValidationError } from "./project-validation-error.js";

export type CreateProjectImageAssetRequest = {
  contentType: string;
  data: Buffer;
  fileName: string;
};

export type ProjectImageAssetContent = {
  data: Buffer;
  imageAsset: ProjectImageAsset;
};

type OptimizedProjectImageAsset = {
  contentType: ProjectImageAssetContentType;
  data: Buffer;
};

export const maxProjectImageAssetBytes = 10 * 1024 * 1024;

const maxProjectImageAssetDimension = 4096;
const optimizedProjectImageAssetContentType = "image/webp";
const projectImageAssetContentTypeSet = new Set<ProjectImageAssetContentType>(
  projectImageAssetContentTypes
);

export async function optimizeProjectImageAsset(
  request: CreateProjectImageAssetRequest
): Promise<OptimizedProjectImageAsset> {
  const declaredContentType = normalizeProjectImageAssetContentType(request.contentType);

  if (!declaredContentType) {
    throw new ProjectValidationError("Unsupported image content type");
  }

  const metadata = await getProjectImageAssetMetadata(request.data);
  const sourceContentType = getProjectImageAssetContentTypeFromSharpFormat(metadata.format);

  if (!sourceContentType) {
    throw new ProjectValidationError("Unsupported image content type");
  }

  return {
    contentType: optimizedProjectImageAssetContentType,
    data: await encodeProjectImageAsset(request.data)
  };
}

export function normalizeProjectImageAsset(value: unknown): ProjectImageAsset | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const fileName = normalizeProjectImageAssetFileName(
    typeof record.fileName === "string" ? record.fileName : ""
  );
  const contentType = normalizeProjectImageAssetContentType(record.contentType);
  const byteSize =
    typeof record.byteSize === "number" && Number.isFinite(record.byteSize) && record.byteSize > 0
      ? Math.min(Math.round(record.byteSize), maxProjectImageAssetBytes)
      : 0;
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : "";

  if (!isSafeProjectImageAssetId(id) || !contentType || byteSize <= 0 || !createdAt) {
    return undefined;
  }

  return {
    id,
    fileName,
    contentType,
    byteSize,
    createdAt
  };
}

export function normalizeProjectImageAssetFileName(value: string) {
  const trimmedValue = value.trim().replaceAll(/[\\/]/g, "");

  return trimmedValue.slice(0, 180) || "image";
}

export function isSafeProjectImageAssetId(assetId: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(assetId);
}

export function findProjectImageAsset(
  fileTree: ProjectFileNode[],
  assetId: string
): ProjectImageAsset | null {
  for (const node of fileTree) {
    if (node.type === "folder") {
      const imageAsset = findProjectImageAsset(node.children ?? [], assetId);

      if (imageAsset) {
        return imageAsset;
      }
    }

    if (node.type === "file" && node.kind === "image" && node.imageAsset?.id === assetId) {
      return node.imageAsset;
    }
  }

  return null;
}

export function getRemovedProjectImageAssetIds(
  previousFileTree: ProjectFileNode[],
  nextFileTree: ProjectFileNode[]
) {
  const nextAssetIds = collectProjectImageAssetIds(nextFileTree);

  return [...collectProjectImageAssetIds(previousFileTree)].filter(
    (assetId) => !nextAssetIds.has(assetId)
  );
}

async function getProjectImageAssetMetadata(data: Buffer) {
  try {
    return await sharp(data).metadata();
  } catch {
    throw new ProjectValidationError("Invalid image asset data");
  }
}

async function encodeProjectImageAsset(data: Buffer): Promise<Buffer> {
  try {
    const image = sharp(data).rotate().resize({
      fit: "inside",
      height: maxProjectImageAssetDimension,
      width: maxProjectImageAssetDimension,
      withoutEnlargement: true
    });

    return await image.webp({ effort: 4, quality: 82 }).toBuffer();
  } catch {
    throw new ProjectValidationError("Invalid image asset data");
  }
}

function getProjectImageAssetContentTypeFromSharpFormat(
  format: string | undefined
): ProjectImageAssetContentType | null {
  if (format === "jpeg" || format === "jpg") {
    return "image/jpeg";
  }

  if (format === "png") {
    return "image/png";
  }

  if (format === "webp") {
    return "image/webp";
  }

  return null;
}

function normalizeProjectImageAssetContentType(
  value: unknown
): ProjectImageAssetContentType | null {
  if (typeof value !== "string") {
    return null;
  }

  const contentType = value.split(";")[0]?.trim().toLowerCase();

  return projectImageAssetContentTypeSet.has(contentType as ProjectImageAssetContentType)
    ? (contentType as ProjectImageAssetContentType)
    : null;
}

function collectProjectImageAssetIds(fileTree: ProjectFileNode[]) {
  const assetIds = new Set<string>();
  collectProjectImageAssetIdsInNodes(fileTree, assetIds);

  return assetIds;
}

function collectProjectImageAssetIdsInNodes(fileTree: ProjectFileNode[], assetIds: Set<string>) {
  fileTree.forEach((node) => {
    if (node.type === "folder") {
      collectProjectImageAssetIdsInNodes(node.children ?? [], assetIds);
      return;
    }

    if (node.kind === "image" && node.imageAsset) {
      assetIds.add(node.imageAsset.id);
    }
  });
}
