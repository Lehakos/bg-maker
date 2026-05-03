import type { ProjectFileNode } from "@bg-maker/shared";
import { expect, test } from "@playwright/test";
import { BgMakerGame } from "./game-objects/bg-maker-game";
import {
  dragTreeItem,
  getNodeParentId,
  getProjectIdFromUrl
} from "./support/project-helpers";

test("moves nested file tree nodes to the root without crashing", async ({ page }) => {
  const game = new BgMakerGame(page);
  await game.projects.goto();

  const workspace = await game.projects.createProject({
    name: `File Tree Drag ${Date.now()}`,
    description: "File tree drag smoke test"
  });

  await workspace.expectProjectOpen(/File Tree Drag/);

  const projectId = getProjectIdFromUrl(page);
  const fileTree: ProjectFileNode[] = [
    {
      id: "table-setups",
      name: "Table setups",
      type: "folder",
      children: [
        {
          id: "objects-folder",
          name: "Objects",
          type: "folder",
          children: []
        },
        {
          id: "image-file",
          name: "Image",
          type: "folder",
          children: []
        }
      ]
    },
    {
      id: "loose-folder",
      name: "Loose folder",
      type: "folder",
      children: []
    }
  ];
  const updateResponse = await page.request.patch(`/api/projects/${projectId}/file-tree`, {
    data: { fileTree }
  });

  expect(updateResponse.ok()).toBe(true);

  await page.reload();
  await workspace.expectProjectOpen(/File Tree Drag/);

  await dragTreeItem(page, "Image", "Loose folder", -56);

  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  await expect
    .poll(async () => getNodeParentId(page, projectId, "image-file"), { timeout: 5_000 })
    .toBe(null);
});
