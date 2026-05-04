export const projectObjectFileDragMimeType = "application/x-bg-maker-object-file";
export const projectImageAssetDragMimeType = "application/x-bg-maker-image-asset";

export type ProjectObjectFileDragPayload = {
  fileNodeId: string;
  type: "projectObjectFile";
};

export type ProjectImageAssetDragPayload = {
  assetId: string;
  type: "projectImageAsset";
};

export function serializeProjectObjectFileDragPayload(fileNodeId: string) {
  return JSON.stringify({
    fileNodeId,
    type: "projectObjectFile"
  } satisfies ProjectObjectFileDragPayload);
}

export function serializeProjectImageAssetDragPayload(assetId: string) {
  return JSON.stringify({
    assetId,
    type: "projectImageAsset"
  } satisfies ProjectImageAssetDragPayload);
}

export function parseProjectObjectFileDragPayload(
  value: string
): ProjectObjectFileDragPayload | null {
  const payload = parseDragPayload(value);

  return payload?.type === "projectObjectFile" && typeof payload.fileNodeId === "string"
    ? { fileNodeId: payload.fileNodeId, type: "projectObjectFile" }
    : null;
}

export function parseProjectImageAssetDragPayload(
  value: string
): ProjectImageAssetDragPayload | null {
  const payload = parseDragPayload(value);

  return payload?.type === "projectImageAsset" && typeof payload.assetId === "string"
    ? { assetId: payload.assetId, type: "projectImageAsset" }
    : null;
}

export function hasProjectImageAssetDragData(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes(projectImageAssetDragMimeType);
}

export function getProjectImageAssetDragPayload(dataTransfer: DataTransfer) {
  return parseProjectImageAssetDragPayload(dataTransfer.getData(projectImageAssetDragMimeType));
}

function parseDragPayload(value: string) {
  try {
    const payload = JSON.parse(value) as unknown;

    return payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
