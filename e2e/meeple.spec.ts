import { expect, test } from "@playwright/test";
import { BgMakerGame } from "./game-objects/bg-maker-game";
import { ProjectWorkspacePage } from "./game-objects/pages/project-workspace-page";
import {
  createObjectFileFromFileTree,
  findFileNode,
  getProject,
  getProjectIdFromUrl,
  getRootObject,
  openFileNode
} from "./support/project-helpers";

test("creates a meeple object file and persists its visual variant", async ({ page }) => {
  const game = new BgMakerGame(page);
  await game.projects.goto();

  const workspace = await game.projects.createProject({
    name: `Meeple Visual ${Date.now()}`,
    description: "Meeple visual variants should persist"
  });

  await workspace.expectProjectOpen(/Meeple Visual/);

  const meepleFileName = `Meeple ${Date.now()}`;
  await createObjectFileFromFileTree(page, {
    name: meepleFileName,
    parentName: "Objects",
    rootType: "Meeple"
  });

  await expect(page.getByRole("button", { name: "Meeple", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByRole("button", { name: "Standee", exact: true }).click();

  const projectId = getProjectIdFromUrl(page);

  await expect
    .poll(
      async () =>
        (await getRootObject(page, projectId, meepleFileName))?.components?.meeple?.visualVariant
    )
    .toBe("standee");

  await page.reload();
  await new ProjectWorkspacePage(page).expectProjectOpen(/Meeple Visual/);
  await openFileNode(page, meepleFileName);
  await expect(page.getByRole("button", { name: "Standee", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("adds token and meeple object files to a bag", async ({ page }) => {
  const game = new BgMakerGame(page);
  await game.projects.goto();

  const workspace = await game.projects.createProject({
    name: `Meeple Bag ${Date.now()}`,
    description: "Bags should accept flat tokens and meeple pieces"
  });

  await workspace.expectProjectOpen(/Meeple Bag/);

  const tokenFileName = `Token ${Date.now()}`;
  const meepleFileName = `Bag Meeple ${Date.now()}`;
  const bagFileName = `Piece Bag ${Date.now()}`;

  await createObjectFileFromFileTree(page, {
    name: tokenFileName,
    parentName: "Objects",
    rootType: "Token"
  });
  await createObjectFileFromFileTree(page, {
    name: meepleFileName,
    parentName: "Objects",
    rootType: "Meeple"
  });
  await createObjectFileFromFileTree(page, {
    name: bagFileName,
    parentName: "Objects",
    rootType: "Bag"
  });

  await page.getByRole("button", { name: "Add object" }).click();
  await page.getByLabel("Object").last().selectOption({ label: tokenFileName });
  await page.getByRole("button", { name: "Add object" }).click();
  await page.getByLabel("Object").last().selectOption({ label: meepleFileName });

  const projectId = getProjectIdFromUrl(page);

  await expect
    .poll(async () => {
      const project = await getProject(page, projectId);
      const bag = findFileNode(project.fileTree, (node) => node.name === bagFileName)
        ?.objectTree?.[0];

      return bag?.components?.container?.entries
        .map(
          (entry) =>
            findFileNode(project.fileTree, (node) => node.id === entry.objectFileNodeId)?.name
        )
        .sort();
    })
    .toEqual([meepleFileName, tokenFileName].sort());
});
