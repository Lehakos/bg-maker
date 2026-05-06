import { expect, test, type Locator, type Page } from "@playwright/test";
import type { ProjectFileNode, ProjectTableSetupItem } from "@bg-maker/shared";
import {
  createProjectWithFileTree,
  dragBy,
  findFileNode,
  getProject,
  objectFile,
  objectNode,
  objectsFolder,
  openFileNode,
  openProject
} from "./support/project-helpers";

test("runs a manual playtest without changing the source table setup", async ({ page }) => {
  const tableName = `Playtest Table ${Date.now()}`;
  const project = await createProjectWithFileTree(page, `Playtest ${Date.now()}`, [
    objectsFolder([
      objectFile("card-file", "Playtest Card", objectNode("card-root", "Card", "card")),
      objectFile(
        "deck-file",
        "Playtest Deck",
        objectNode("deck-root", "Deck", "deck", {
          container: { entries: [{ objectFileNodeId: "card-file", quantity: 2 }] }
        })
      ),
      objectFile("die-file", "Playtest Die", objectNode("die-root", "Die", "die")),
      objectFile(
        "counter-file",
        "Playtest Counter",
        objectNode("counter-root", "Counter", "counter")
      )
    ]),
    tableSetupFolder([
      tableSetupFile(tableName, [
        linkedItem("deck-item", "Deck", "deck-file", -180, 0),
        linkedItem("die-item", "Die", "die-file", 0, 0),
        linkedItem("counter-item", "Counter", "counter-file", 180, 0)
      ])
    ])
  ]);
  await openProject(page, project);
  await openFileNode(page, tableName);
  await expect.poll(async () => getTableSetupItemCount(page, project.id, tableName)).toBe(3);

  await page.getByRole("button", { name: "Start playtest" }).click();
  await expect(page.getByText("Playtest", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Workspace tools" })).toHaveCount(0);
  const playtestCanvas = page.getByRole("region", { name: "Playtest canvas" });
  const actionHistory = page.getByRole("region", { name: "Playtest action history" });
  const historyBoxBefore = await actionHistory.boundingBox();

  expect(historyBoxBefore).toBeTruthy();
  await page.mouse.move(historyBoxBefore!.x + 48, historyBoxBefore!.y + 18);
  await page.mouse.down();
  await page.mouse.move(historyBoxBefore!.x + 148, historyBoxBefore!.y + 86);
  await page.mouse.up();
  await expect
    .poll(async () => {
      const historyBoxAfter = await actionHistory.boundingBox();

      return historyBoxAfter ? historyBoxAfter.x - historyBoxBefore!.x : 0;
    })
    .toBeGreaterThan(80);

  await playtestCanvas.getByRole("button", { name: "Deck", exact: true }).click();
  await page.getByRole("button", { name: "Draw", exact: true }).click();
  await expect(playtestCanvas.getByRole("button", { name: "Card", exact: true })).toBeVisible();

  await playtestCanvas.getByRole("button", { name: "Die", exact: true }).click();
  await page.getByRole("button", { name: "Roll", exact: true }).click();
  await expect(page.getByText(/^Roll Die/)).toBeVisible();

  await playtestCanvas.getByRole("button", { name: "Counter", exact: true }).click();
  await expect(page.getByRole("button", { name: "Roll", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Draw", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Increase", exact: true }).click();
  await expect(page.getByText("Value 1")).toBeVisible();

  await playtestCanvas.getByRole("button", { name: "Card", exact: true }).click();
  await page.getByRole("button", { name: "Hide", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reveal", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Stop playtest" }).click();
  await expect(page.getByRole("button", { name: "Start playtest" })).toBeVisible();
  await expect.poll(async () => getTableSetupItemCount(page, project.id, tableName)).toBe(3);
});

test("keeps zone contents above and moves them with the zone in playtest", async ({ page }) => {
  const tableName = `Zone Playtest Table ${Date.now()}`;
  const project = await createProjectWithFileTree(page, `Zone Playtest ${Date.now()}`, [
    objectsFolder([
      objectFile(
        "card-file",
        "Hero",
        objectNode("card-root", "Hero", "card", {
          rectTransform: rectTransform({ height: 156, width: 112 })
        })
      ),
      objectFile(
        "zone-file",
        "Zone",
        objectNode("zone-root", "Zone", "zone", {
          rectTransform: rectTransform({ height: 300, width: 520 }),
          zone: { mode: "free", sizeReferenceObjectFileId: "", slots: 1 }
        })
      )
    ]),
    tableSetupFolder([
      tableSetupFile(tableName, [
        linkedItem("card-item", "Hero", "card-file", -300, 0),
        {
          behavior: {
            zone: {
              acceptedKinds: [],
              allowRemove: true,
              sideOnEnter: "preserve",
              slotOccupancy: "single"
            }
          },
          id: "zone-item",
          name: "Zone",
          sourceObjectFileNodeId: "zone-file",
          transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
          type: "linkedObject",
          values: {},
          visible: true
        }
      ])
    ])
  ]);

  await openProject(page, project);
  await openFileNode(page, tableName);
  await page.getByRole("button", { name: "Start playtest" }).click();

  const playtestCanvas = page.getByRole("region", { name: "Playtest canvas" });
  const card = playtestCanvas.getByRole("button", { name: "Hero", exact: true });
  const zone = playtestCanvas.getByRole("button", { name: "Zone", exact: true });
  await expect(card).toBeVisible();
  await expect(zone).toBeVisible();

  await dragBy(card, 300, 0);
  await expect.poll(async () => getTopPlaytestItemNameAtCenter(page, card)).toBe("Hero");

  const cardBoxBeforeZoneMove = await card.boundingBox();
  expect(cardBoxBeforeZoneMove).toBeTruthy();

  await dragBy(zone, 40, 30);
  await expect
    .poll(async () => {
      const cardBoxAfterZoneMove = await card.boundingBox();

      return cardBoxAfterZoneMove && cardBoxBeforeZoneMove
        ? Math.round(cardBoxAfterZoneMove.x - cardBoxBeforeZoneMove.x)
        : 0;
    })
    .toBe(40);
  await expect
    .poll(async () => {
      const cardBoxAfterZoneMove = await card.boundingBox();

      return cardBoxAfterZoneMove && cardBoxBeforeZoneMove
        ? Math.round(cardBoxAfterZoneMove.y - cardBoxBeforeZoneMove.y)
        : 0;
    })
    .toBe(30);
});

function tableSetupFolder(children: ProjectFileNode[] = []): ProjectFileNode {
  return {
    id: "table-setups",
    name: "Table setups",
    type: "folder",
    children
  };
}

function tableSetupFile(name: string, items: ProjectTableSetupItem[]): ProjectFileNode {
  return {
    id: "playtest-table-file",
    kind: "tableSetup",
    name,
    tableSetup: {
      backgroundColor: "#6f8b70",
      grid: { size: 50, snap: false, visible: true },
      height: 600,
      items,
      width: 900
    },
    type: "file"
  };
}

function linkedItem(
  id: string,
  name: string,
  sourceObjectFileNodeId: string,
  x: number,
  y: number
): ProjectTableSetupItem {
  return {
    id,
    name,
    sourceObjectFileNodeId,
    transform: { rotation: 0, scaleX: 1, scaleY: 1, x, y },
    type: "linkedObject",
    values: {},
    visible: true
  };
}

function rectTransform({ height, width }: { height: number; width: number }) {
  return {
    height,
    pivotX: 0.5,
    pivotY: 0.5,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    width,
    x: 0,
    y: 0
  };
}

async function getTopPlaytestItemNameAtCenter(page: Page, locator: Locator) {
  const box = await locator.boundingBox();

  if (!box) {
    return null;
  }

  return page.evaluate(
    ({ x, y }) => {
      const frame = document
        .elementsFromPoint(x, y)
        .map((element) => element.closest("[data-playtest-item-id]"))
        .find(Boolean);

      return frame?.getAttribute("aria-label") ?? null;
    },
    {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    }
  );
}

async function getTableSetupItemCount(page: Page, projectId: string, tableName: string) {
  const project = await getProject(page, projectId);
  const tableSetup = findFileNode(project.fileTree, (node) => node.name === tableName)?.tableSetup;

  return tableSetup?.items.length ?? 0;
}
