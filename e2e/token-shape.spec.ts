import { expect, test } from "@playwright/test";
import { BgMakerGame } from "./game-objects/bg-maker-game";
import { ProjectWorkspacePage } from "./game-objects/pages/project-workspace-page";
import {
  createObjectFileFromFileTree,
  getProject,
  getProjectIdFromUrl,
  getRootObject,
  getRootObjectFromProject,
  openFileNode
} from "./support/project-helpers";

test("creates a token object file and applies token shape to both sides", async ({ page }) => {
  const game = new BgMakerGame(page);
  await game.projects.goto();

  const workspace = await game.projects.createProject({
    name: `Token Shape ${Date.now()}`,
    description: "Token shape should be shared across sides"
  });

  await workspace.expectProjectOpen(/Token Shape/);

  const tokenFileName = `Shared Token ${Date.now()}`;
  await createObjectFileFromFileTree(page, {
    name: tokenFileName,
    parentName: "Objects",
    rootType: "Token"
  });

  const variantSelect = page.getByLabel("Variant");
  await expect(variantSelect).toHaveValue("ellipse");

  await variantSelect.selectOption("hexagon");
  await page.getByLabel("Token side").getByRole("button", { name: "Back" }).click();
  await expect(variantSelect).toHaveValue("hexagon");

  await variantSelect.selectOption("triangle");
  await page.getByLabel("Token side").getByRole("button", { name: "Front" }).click();
  await expect(variantSelect).toHaveValue("triangle");

  const projectId = getProjectIdFromUrl(page);

  await expect
    .poll(
      async () => (await getRootObject(page, projectId, tokenFileName))?.components?.shape?.variant
    )
    .toBe("triangle");
  const doubleSide = getRootObjectFromProject(await getProject(page, projectId), tokenFileName)
    ?.components?.doubleSide;

  expect(doubleSide?.sideComponents).toBeUndefined();

  await page.reload();
  await new ProjectWorkspacePage(page).expectProjectOpen(/Token Shape/);
  await openFileNode(page, tokenFileName);
  await expect(page.getByLabel("Variant")).toHaveValue("triangle");
});
