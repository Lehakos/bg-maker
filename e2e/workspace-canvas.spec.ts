import { expect, test, type Page } from "@playwright/test";
import type { ProjectFileNode, ProjectTableSetupItem } from "@bg-maker/shared";
import {
  createProjectWithFileTree,
  dragBy,
  findFileNode,
  getProject,
  getRootRectTransform,
  objectFile,
  objectNode,
  objectsFolder,
  openFileNode,
  openProject
} from "./support/project-helpers";

test("moves an object on the canvas and supports keyboard undo and redo", async ({ page }) => {
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

  await page.keyboard.press("Control+Z");
  await expect
    .poll(async () => getRootRectTransform(page, project.id, fileName))
    .toMatchObject({ x: 0, y: 0 });

  await page.keyboard.press("Control+Shift+Z");
  await expect
    .poll(async () => getRootRectTransform(page, project.id, fileName))
    .toMatchObject({ x: 25, y: 15 });
});

test("switches primary workspace tools from keyboard shortcuts", async ({ page }) => {
  const fileName = `Tool Shortcut File ${Date.now()}`;
  const project = await createProjectWithFileTree(page, `Tool Shortcuts ${Date.now()}`, [
    objectsFolder([
      objectFile(
        "tool-shortcut-file",
        fileName,
        objectNode("tool-shortcut-token", "Tool Token", "token")
      )
    ])
  ]);
  const tools = page.getByRole("navigation", { name: "Workspace tools" });

  await openProject(page, project);
  await openFileNode(page, fileName);

  await page.keyboard.press("m");
  await expect(tools.getByRole("button", { name: "Move", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await page.keyboard.press("4");
  await expect(tools.getByRole("button", { name: "Rotate", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await page.keyboard.press("s");
  await expect(tools.getByRole("button", { name: "Resize", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await page.keyboard.press("2");
  await expect(tools.getByRole("button", { name: "Pan", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await page.keyboard.press("v");
  await expect(tools.getByRole("button", { name: "Select", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("temporarily pans the workspace canvas with Space drag", async ({ page }) => {
  const tableName = `Space Pan Table ${Date.now()}`;
  const project = await createProjectWithFileTree(page, `Space Pan ${Date.now()}`, [
    tableSetupFolder([
      tableSetupFile("space-pan-table-file", tableName, [], { height: 1200, width: 1600 })
    ])
  ]);
  const canvas = page.getByRole("region", { name: "Workspace canvas" });
  const tools = page.getByRole("navigation", { name: "Workspace tools" });

  await openProject(page, project);
  await openFileNode(page, tableName);
  await page.keyboard.press("m");
  await expect(tools.getByRole("button", { name: "Move", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await canvas.evaluate((element) => {
    element.scrollLeft = 100;
    element.scrollTop = 100;
  });

  const beforeScroll = await canvas.evaluate((element) => ({
    left: element.scrollLeft,
    top: element.scrollTop
  }));
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Could not pan because the workspace canvas was not visible");
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await canvas.focus();
  await page.keyboard.down("Space");
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 90, startY - 70, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.up("Space");

  const afterScroll = await canvas.evaluate((element) => ({
    left: element.scrollLeft,
    top: element.scrollTop
  }));

  expect(afterScroll.left).toBeGreaterThan(beforeScroll.left + 40);
  expect(afterScroll.top).toBeGreaterThan(beforeScroll.top + 30);
  await expect(tools.getByRole("button", { name: "Move", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("keeps object proportions when resizing with Shift", async ({ page }) => {
  const fileName = `Resize File ${Date.now()}`;
  const objectName = "Resize Token";
  const project = await createProjectWithFileTree(page, `Canvas Resize ${Date.now()}`, [
    objectsFolder([
      objectFile(
        "resize-file",
        fileName,
        objectNode("resize-token", objectName, "token", {
          rectTransform: {
            height: 50,
            pivotX: 0.5,
            pivotY: 0.5,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            width: 100,
            x: 0,
            y: 0
          }
        })
      )
    ])
  ]);

  await openProject(page, project);
  await openFileNode(page, fileName);

  const canvas = page.getByRole("region", { name: "Workspace canvas" });
  await canvas.getByRole("button", { name: objectName, exact: true }).click();
  await page
    .getByRole("navigation", { name: "Workspace tools" })
    .getByRole("button", { name: "Resize", exact: true })
    .click();
  await page.keyboard.down("Shift");
  await dragBy(canvas.getByRole("button", { name: "Resize se", exact: true }), 100, 20);
  await page.keyboard.up("Shift");

  await expect
    .poll(async () => getRootRectTransform(page, project.id, fileName))
    .toMatchObject({ height: 75, width: 150 });
});

test("adds table items to the selection with Shift-click", async ({ page }) => {
  const firstObjectName = "Shift Item One";
  const secondObjectName = "Shift Item Two";
  const tableName = `Shortcut Table ${Date.now()}`;
  const project = await createProjectWithFileTree(page, `Canvas Selection ${Date.now()}`, [
    objectsFolder([
      objectFile(
        "shift-object-one-file",
        "Shift Object One",
        objectNode("shift-one", firstObjectName, "token")
      ),
      objectFile(
        "shift-object-two-file",
        "Shift Object Two",
        objectNode("shift-two", secondObjectName, "token")
      )
    ]),
    tableSetupFolder([
      tableSetupFile("shift-table-file", tableName, [
        {
          id: "shift-item-one",
          name: firstObjectName,
          sourceObjectFileNodeId: "shift-object-one-file",
          transform: { rotation: 0, scaleX: 1, scaleY: 1, x: -60, y: 0 },
          type: "linkedObject",
          values: {},
          visible: true
        },
        {
          id: "shift-item-two",
          name: secondObjectName,
          sourceObjectFileNodeId: "shift-object-two-file",
          transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 60, y: 0 },
          type: "linkedObject",
          values: {},
          visible: true
        }
      ])
    ])
  ]);
  const canvas = page.getByRole("region", { name: "Workspace canvas" });

  await openProject(page, project);
  await openFileNode(page, tableName);

  await canvas.getByRole("button", { name: firstObjectName, exact: true }).click();
  await canvas.getByRole("button", { name: secondObjectName, exact: true }).click({
    modifiers: ["Shift"]
  });
  await page.keyboard.press("Control+D");

  await expect.poll(async () => getTableSetupItemCount(page, project.id, tableName)).toBe(4);
});

function tableSetupFolder(children: ProjectFileNode[] = []): ProjectFileNode {
  return {
    id: "table-setups",
    name: "Table setups",
    type: "folder",
    children
  };
}

function tableSetupFile(
  id: string,
  name: string,
  items: ProjectTableSetupItem[],
  size: { height: number; width: number } = { height: 600, width: 900 }
): ProjectFileNode {
  return {
    id,
    kind: "tableSetup",
    name,
    tableSetup: {
      backgroundColor: "#6f8b70",
      grid: { size: 50, snap: false, visible: true },
      height: size.height,
      items,
      width: size.width
    },
    type: "file"
  };
}

async function getTableSetupItemCount(page: Page, projectId: string, tableName: string) {
  const project = await getProject(page, projectId);
  const tableSetup = findFileNode(project.fileTree, (node) => node.name === tableName)?.tableSetup;

  return tableSetup?.items.length ?? 0;
}
