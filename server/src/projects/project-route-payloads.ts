import type { CreateProjectRequest } from "@bg-maker/shared";
import type { CreateProjectImageAssetRequest } from "./project-image-assets.js";
import { ProjectValidationError } from "./project-validation-error.js";

type HeaderValue = string | string[] | undefined;

type ProjectImageAssetUploadHeaders = {
  "content-type"?: HeaderValue;
  "x-file-name"?: HeaderValue;
};

export function toCreateProjectRequest(body: unknown): CreateProjectRequest {
  if (!body || typeof body !== "object") {
    return { name: "" };
  }

  const record = body as Record<string, unknown>;

  return {
    name: typeof record.name === "string" ? record.name : "",
    description: typeof record.description === "string" ? record.description : undefined
  };
}

export function getProjectFileTreePayload(body: unknown): unknown {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const record = body as Record<string, unknown>;

  return record.fileTree;
}

export function getProjectGameConfigPayload(body: unknown): unknown {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const record = body as Record<string, unknown>;

  return record.gameConfig;
}

export function toCreateProjectImageAssetRequest(
  body: unknown,
  headers: ProjectImageAssetUploadHeaders
): CreateProjectImageAssetRequest {
  if (!Buffer.isBuffer(body)) {
    throw new ProjectValidationError("Image asset data is required");
  }

  return {
    contentType: getHeaderValue(headers["content-type"]),
    data: body,
    fileName: getHeaderValue(headers["x-file-name"])
  };
}

function getHeaderValue(value: HeaderValue) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
