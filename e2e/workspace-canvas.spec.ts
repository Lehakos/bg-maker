import { expect, test } from "@playwright/test";
import {
  createProjectWithFileTree,
  dragBy,
  getRootRectTransform,
  objectFile,
  objectNode,
  objectsFolder,
  openFileNode,
  openProject
} from "./support/project-helpers";

test("moves an object on the canvas and supports undo and redo", async ({ page }) => {
  const fileName = `Mover File ${Date.now()}`;
  const objectName = "Mover Token";
  const project = await createProjectWithFileTree(page, `Canvas Move ${Date.now()}`, [
    objectsFolder([
      objectFile("mover-file", fileName, objectNode("mover-token", objectName, "token"))
    ])
  ]);

  await openProject(page, project);
  await openFileNode(page, fileName);

  await page
    .getByRole("navigation", { name: "Workspace tools" })
    .getByRole("button", { name: "Move", exact: true })
    .click();
  await dragBy(
    page
      .getByRole("region", { name: "Workspace canvas" })
      .getByRole("button", { name: objectName, exact: true }),
    50,
    30
  );

  await expect
    .poll(async () => getRootRectTransform(page, project.id, fileName))
    .toMatchObject({ x: 25, y: 15 });

  await page.getByRole("button", { name: "Undo" }).click();
  await expect
    .poll(async () => getRootRectTransform(page, project.id, fileName))
    .toMatchObject({ x: 0, y: 0 });

  await page.getByRole("button", { name: "Redo" }).click();
  await expect
    .poll(async () => getRootRectTransform(page, project.id, fileName))
    .toMatchObject({ x: 25, y: 15 });
});
