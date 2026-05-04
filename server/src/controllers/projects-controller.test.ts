import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apiPaths, type UploadProjectImageAssetResponse } from "@bg-maker/shared";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { maxProjectImageAssetBytes, ProjectService } from "../projects/project-service.js";

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
    const project = await projectService.createProject({ name: "Assets" });
    const uploadData = await createTestPngBuffer();
    const uploadResponse = await app.inject({
      method: "POST",
      url: apiPaths.projectImageAssets(project.id),
      headers: {
        "content-type": "image/png",
        "x-file-name": "token.png"
      },
      payload: uploadData
    });
    const uploadPayload = uploadResponse.json<UploadProjectImageAssetResponse>();

    expect(uploadResponse.statusCode).toBe(201);
    expect(uploadPayload.imageAsset).toMatchObject({
      contentType: "image/webp",
      fileName: "token.png"
    });
    expect(uploadPayload.imageAsset.byteSize).toBeLessThan(uploadData.byteLength);

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
        id: "assets",
        name: "Assets",
        type: "folder"
      }
    ]);

    const getResponse = await app.inject({
      method: "GET",
      url: apiPaths.projectImageAsset(project.id, uploadPayload.imageAsset.id)
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.headers["content-type"]).toContain(uploadPayload.imageAsset.contentType);
    expect(getResponse.rawPayload.byteLength).toBe(uploadPayload.imageAsset.byteSize);
    expect((await sharp(getResponse.rawPayload).metadata()).format).toBe("webp");

    await projectService.updateProjectFileTree(project.id, [
      { children: [], id: "assets", name: "Assets", type: "folder" }
    ]);

    await expectGetImageAssetStatus(project.id, uploadPayload.imageAsset.id, 404);
  });

  it("replaces an existing image asset without changing its id or created timestamp", async () => {
    const project = await projectService.createProject({ name: "Assets" });
    const uploadData = await createTestPngBuffer();
    const uploadResponse = await app.inject({
      method: "POST",
      url: apiPaths.projectImageAssets(project.id),
      headers: {
        "content-type": "image/png",
        "x-file-name": "token.png"
      },
      payload: uploadData
    });
    const uploadPayload = uploadResponse.json<UploadProjectImageAssetResponse>();

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
        id: "assets",
        name: "Assets",
        type: "folder"
      }
    ]);

    const replaceData = await createTestJpegBuffer();
    const replaceResponse = await app.inject({
      method: "PUT",
      url: apiPaths.projectImageAsset(project.id, uploadPayload.imageAsset.id),
      headers: {
        "content-type": "image/jpeg",
        "x-file-name": "token-replaced.jpg"
      },
      payload: replaceData
    });
    const replacePayload = replaceResponse.json<UploadProjectImageAssetResponse>();

    expect(replaceResponse.statusCode).toBe(200);
    expect(replacePayload.imageAsset).toMatchObject({
      id: uploadPayload.imageAsset.id,
      createdAt: uploadPayload.imageAsset.createdAt,
      contentType: "image/webp",
      fileName: "token-replaced.jpg"
    });
    expect(replacePayload.imageAsset.byteSize).not.toBe(uploadPayload.imageAsset.byteSize);

    await projectService.updateProjectFileTree(project.id, [
      {
        children: [
          {
            id: "image-file",
            imageAsset: replacePayload.imageAsset,
            kind: "image",
            name: "Token",
            type: "file"
          }
        ],
        id: "assets",
        name: "Assets",
        type: "folder"
      }
    ]);

    const getResponse = await app.inject({
      method: "GET",
      url: apiPaths.projectImageAsset(project.id, uploadPayload.imageAsset.id)
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.rawPayload.byteLength).toBe(replacePayload.imageAsset.byteSize);
    expect((await sharp(getResponse.rawPayload).metadata()).format).toBe("webp");
  });

  it("rejects unsupported or oversized image uploads", async () => {
    const project = await projectService.createProject({ name: "Assets" });
    const unsupportedResponse = await app.inject({
      method: "POST",
      url: apiPaths.projectImageAssets(project.id),
      headers: {
        "content-type": "image/svg+xml",
        "x-file-name": "bad.svg"
      },
      payload: Buffer.from("<svg />")
    });
    const gifResponse = await app.inject({
      method: "POST",
      url: apiPaths.projectImageAssets(project.id),
      headers: {
        "content-type": "image/gif",
        "x-file-name": "bad.gif"
      },
      payload: Buffer.from("gif")
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
    expect(gifResponse.statusCode).toBe(415);
    expect(oversizedResponse.statusCode).toBe(413);
  });

  it("rejects missing, unsupported, or oversized image replacements", async () => {
    const project = await projectService.createProject({ name: "Assets" });
    const uploadData = await createTestPngBuffer();
    const uploadResponse = await app.inject({
      method: "POST",
      url: apiPaths.projectImageAssets(project.id),
      headers: {
        "content-type": "image/png",
        "x-file-name": "token.png"
      },
      payload: uploadData
    });
    const uploadPayload = uploadResponse.json<UploadProjectImageAssetResponse>();

    const missingProjectResponse = await app.inject({
      method: "PUT",
      url: apiPaths.projectImageAsset("missing-project", uploadPayload.imageAsset.id),
      headers: {
        "content-type": "image/png",
        "x-file-name": "token.png"
      },
      payload: uploadData
    });
    const missingAssetResponse = await app.inject({
      method: "PUT",
      url: apiPaths.projectImageAsset(project.id, uploadPayload.imageAsset.id),
      headers: {
        "content-type": "image/png",
        "x-file-name": "token.png"
      },
      payload: uploadData
    });

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
        id: "assets",
        name: "Assets",
        type: "folder"
      }
    ]);

    const unsupportedResponse = await app.inject({
      method: "PUT",
      url: apiPaths.projectImageAsset(project.id, uploadPayload.imageAsset.id),
      headers: {
        "content-type": "image/svg+xml",
        "x-file-name": "bad.svg"
      },
      payload: Buffer.from("<svg />")
    });
    const oversizedResponse = await app.inject({
      method: "PUT",
      url: apiPaths.projectImageAsset(project.id, uploadPayload.imageAsset.id),
      headers: {
        "content-type": "image/png",
        "x-file-name": "huge.png"
      },
      payload: Buffer.alloc(maxProjectImageAssetBytes + 1)
    });

    expect(missingProjectResponse.statusCode).toBe(404);
    expect(missingAssetResponse.statusCode).toBe(404);
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

async function createTestPngBuffer() {
  return await sharp({
    create: {
      background: { alpha: 1, b: 48, g: 32, r: 224 },
      channels: 4,
      height: 96,
      width: 96
    }
  })
    .png({ compressionLevel: 0 })
    .toBuffer();
}

async function createTestJpegBuffer() {
  return await sharp({
    create: {
      background: { alpha: 1, b: 24, g: 180, r: 12 },
      channels: 4,
      height: 80,
      width: 120
    }
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}
