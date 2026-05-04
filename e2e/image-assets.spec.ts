import type { Project, ProjectFileNode } from "@bg-maker/shared";
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

test("bulk uploads and replaces an asset without changing object references", async ({ page }) => {
  const fileName = `Asset Browser Image ${Date.now()}`;
  const project = await createProjectWithFileTree(page, `Asset Browser ${Date.now()}`, [
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
  const assetId = await getRootImageAssetId(page, project.id, fileName);

  await page
    .getByRole("complementary")
    .first()
    .getByRole("button", { name: "Assets", exact: true })
    .first()
    .click();
  await page.getByLabel("Upload images").setInputFiles([
    {
      buffer: pngPixelBuffer,
      mimeType: "image/png",
      name: "bulk-a.png"
    },
    {
      buffer: pngPixelBuffer,
      mimeType: "image/png",
      name: "bulk-b.png"
    }
  ]);

  await expect
    .poll(async () => getImageAssetFileNames(await getProject(page, project.id)))
    .toEqual(expect.arrayContaining(["bulk-a.png", "bulk-b.png", "pixel.png"]));

  await page.getByLabel("Replace pixel.png").setInputFiles({
    buffer: pngPixelBuffer,
    mimeType: "image/png",
    name: "pixel-replaced.png"
  });

  await expect.poll(async () => getRootImageAssetId(page, project.id, fileName)).toBe(assetId);
  await expect
    .poll(async () => getImageAssetMetadataFileName(await getProject(page, project.id), assetId))
    .toBe("pixel-replaced.png");
});

test("drags a reusable object from Object Library into a table setup", async ({ page }) => {
  const tableName = `Main Table ${Date.now()}`;
  const objectName = `Library Card ${Date.now()}`;
  const project = await createProjectWithFileTree(page, `Object Library ${Date.now()}`, [
    {
      id: "table-setups",
      name: "Table setups",
      type: "folder",
      children: [tableSetupFile("table-file", tableName)]
    },
    objectsFolder([
      objectFile("card-file", objectName, objectNode("card-root", objectName, "card"))
    ])
  ]);

  await openProject(page, project);
  await openFileNode(page, tableName);
  await page
    .getByRole("complementary")
    .first()
    .getByRole("button", { name: "Objects", exact: true })
    .first()
    .click();

  const source = page.getByRole("button", { name: new RegExp(objectName) });
  const target = page.getByLabel(tableName, { exact: true });
  const targetBox = await target.boundingBox();

  if (!targetBox) {
    throw new Error("Table setup drop target was not visible");
  }

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

  await source.dispatchEvent("dragstart", { dataTransfer });
  await target.dispatchEvent("drop", {
    clientX: targetBox.x + targetBox.width / 2 + 146,
    clientY: targetBox.y + targetBox.height / 2 - 250,
    dataTransfer
  });
  await dataTransfer.dispose();

  await expect
    .poll(async () => getTableSetupItems(await getProject(page, project.id), tableName))
    .toMatchObject([
      {
        sourceObjectFileNodeId: "card-file",
        transform: { x: 70, y: -120 },
        type: "linkedObject"
      }
    ]);
});

function tableSetupFile(id: string, name: string): ProjectFileNode {
  return {
    id,
    kind: "tableSetup",
    name,
    tableSetup: {
      backgroundColor: "#166534",
      grid: {
        size: 10,
        snap: true,
        visible: true
      },
      height: 600,
      items: [],
      width: 900
    },
    type: "file"
  };
}

function getImageAssetFileNames(project: Project) {
  return collectImageAssetNodes(project.fileTree).map((node) => node.name);
}

function getImageAssetMetadataFileName(project: Project, assetId: string) {
  return collectImageAssetNodes(project.fileTree).find((node) => node.imageAsset?.id === assetId)
    ?.imageAsset?.fileName;
}

function getTableSetupItems(project: Project, tableName: string) {
  return project.fileTree
    .flatMap((node) => (node.type === "folder" ? (node.children ?? []) : [node]))
    .find((node) => node.kind === "tableSetup" && node.name === tableName)?.tableSetup?.items;
}

function collectImageAssetNodes(fileTree: ProjectFileNode[]): ProjectFileNode[] {
  return fileTree.flatMap((node) => {
    if (node.type === "folder") {
      return collectImageAssetNodes(node.children ?? []);
    }

    return node.kind === "image" && node.imageAsset ? [node] : [];
  });
}
