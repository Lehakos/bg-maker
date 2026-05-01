import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apiPaths, type UploadProjectImageAssetResponse } from "@bg-maker/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { maxProjectImageAssetBytes, ProjectService } from "../services/project-service.js";

let testDirectory: string;
let projectService: ProjectService;
let app: Awaited<ReturnType<typeof buildApp>>;

beforeEach(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), "bg-maker-projects-controller-"));
  projectService = new ProjectService(join(testDirectory, "projects.json"));
  app = await buildApp({ projectService });
});

afterEach(async () => {
  await app.close();
  await rm(testDirectory, { force: true, recursive: true });
});

describe("projects controller image assets", () => {
  it("uploads supported images and serves only assets present in the file tree", async () => {
    const project = await projectService.createProject({ name: "Images" });
    const uploadResponse = await app.inject({
      method: "POST",
      url: apiPaths.projectImageAssets(project.id),
      headers: {
        "content-type": "image/png",
        "x-file-name": "token.png"
      },
      payload: Buffer.from("image-data")
    });
    const uploadPayload = uploadResponse.json<UploadProjectImageAssetResponse>();

    expect(uploadResponse.statusCode).toBe(201);
    expect(uploadPayload.imageAsset).toMatchObject({
      byteSize: 10,
      contentType: "image/png",
      fileName: "token.png"
    });

    await expectGetImageAssetStatus(project.id, uploadPayload.imageAsset.id, 404);

    await projectService.updateProjectFileTree(project.id, [
      {
        children: [
          {
            id: "image-file",
            imageAsset: uploadPayload.imageAsset,
            kind: "image",
            name: "Token",
            type: "file"
          }
        ],
        id: "images",
        name: "Images",
        type: "folder"
      }
    ]);

    const getResponse = await app.inject({
      method: "GET",
      url: apiPaths.projectImageAsset(project.id, uploadPayload.imageAsset.id)
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.headers["content-type"]).toContain("image/png");
    expect(getResponse.rawPayload.toString()).toBe("image-data");

    await projectService.updateProjectFileTree(project.id, [
      { children: [], id: "images", name: "Images", type: "folder" }
    ]);

    await expectGetImageAssetStatus(project.id, uploadPayload.imageAsset.id, 404);
  });

  it("rejects unsupported or oversized image uploads", async () => {
    const project = await projectService.createProject({ name: "Images" });
    const unsupportedResponse = await app.inject({
      method: "POST",
      url: apiPaths.projectImageAssets(project.id),
      headers: {
        "content-type": "image/svg+xml",
        "x-file-name": "bad.svg"
      },
      payload: Buffer.from("<svg />")
    });
    const oversizedResponse = await app.inject({
      method: "POST",
      url: apiPaths.projectImageAssets(project.id),
      headers: {
        "content-type": "image/png",
        "x-file-name": "huge.png"
      },
      payload: Buffer.alloc(maxProjectImageAssetBytes + 1)
    });

    expect(unsupportedResponse.statusCode).toBe(415);
    expect(oversizedResponse.statusCode).toBe(413);
  });
});

async function expectGetImageAssetStatus(projectId: string, assetId: string, statusCode: number) {
  const response = await app.inject({
    method: "GET",
    url: apiPaths.projectImageAsset(projectId, assetId)
  });

  expect(response.statusCode).toBe(statusCode);
}
