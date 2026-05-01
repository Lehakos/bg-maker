import type { GetProjectResponse, ProjectFileNode } from "@bg-maker/shared";
import { expect, test, type Page } from "@playwright/test";
import { BgMakerGame } from "./game-objects/bg-maker-game";

test("creates and opens a project", async ({ page }) => {
  const game = new BgMakerGame(page);
  await game.projects.goto();

  const projectName = `E2E Project ${Date.now()}`;

  const workspace = await game.projects.createProject({
    name: projectName,
    description: "Проверка выбора проекта"
  });

  await workspace.expectProjectOpen(projectName);

  await workspace.goToProjects();
  await game.projects.expectReady();
  await game.projects.expectProjectVisible(projectName);
});

test("moves nested file tree nodes to the root without crashing", async ({ page }) => {
  const game = new BgMakerGame(page);
  await game.projects.goto();

  const workspace = await game.projects.createProject({
    name: `File Tree Drag ${Date.now()}`,
    description: "Проверка перемещения файловой структуры"
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

async function dragTreeItem(
  page: Page,
  sourceName: string,
  targetName: string,
  horizontalOffset: number
) {
  const source = page.getByRole("button", { name: sourceName, exact: true });
  const target = page.getByRole("button", { name: targetName, exact: true });
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error(`Could not drag ${sourceName} to ${targetName}`);
  }

  const sourceX = sourceBox.x + Math.min(20, sourceBox.width / 2);
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + Math.min(20, targetBox.width / 2) + horizontalOffset;
  const targetY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await page.mouse.move(sourceX + horizontalOffset, sourceY, { steps: 6 });
  await page.mouse.move(targetX, targetY, { steps: 12 });
  await page.mouse.up();
}

async function getNodeParentId(page: Page, projectId: string, nodeId: string) {
  const response = await page.request.get(`/api/projects/${projectId}`);
  const { project } = (await response.json()) as GetProjectResponse;

  return findNodeParentId(project.fileTree, nodeId);
}

function findNodeParentId(
  fileTree: ProjectFileNode[],
  nodeId: string,
  parentId: string | null = null
): string | null | undefined {
  for (const node of fileTree) {
    if (node.id === nodeId) {
      return parentId;
    }

    if (node.type === "folder") {
      const childParentId = findNodeParentId(node.children ?? [], nodeId, node.id);

      if (childParentId !== undefined) {
        return childParentId;
      }
    }
  }

  return undefined;
}

function getProjectIdFromUrl(page: Page) {
  const projectId = new URL(page.url()).pathname.split("/").at(-1);

  if (!projectId) {
    throw new Error("Project id was not found in the current URL");
  }

  return projectId;
}
