import { expect, test } from "@playwright/test";
import {
  createProjectWithFileTree,
  findImageAssetFileName,
  getProject,
  getRootImageAssetId,
  objectFile,
  objectNode,
  objectsFolder,
  openFileNode,
  openProject,
  pngPixelBuffer
} from "./support/project-helpers";

test("uploads an image asset and connects it to an image object", async ({ page }) => {
  const fileName = `Image Object ${Date.now()}`;
  const project = await createProjectWithFileTree(page, `Image Upload ${Date.now()}`, [
    objectsFolder([
      objectFile("image-object-file", fileName, objectNode("image-object", "Image Object", "image"))
    ])
  ]);

  await openProject(page, project);
  await openFileNode(page, fileName);

  await page.getByLabel("Upload image").setInputFiles({
    buffer: pngPixelBuffer,
    mimeType: "image/png",
    name: "pixel.png"
  });

  await expect.poll(async () => getRootImageAssetId(page, project.id, fileName)).not.toBe("");
  await expect.poll(async () => findImageAssetFileName(await getProject(page, project.id))).toBe(
    "pixel.png"
  );
  await expect(page.getByRole("button", { name: "pixel.png", exact: true })).toBeVisible();
});
