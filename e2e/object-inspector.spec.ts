import { expect, test } from "@playwright/test";
import { ProjectWorkspacePage } from "./game-objects/pages/project-workspace-page";
import {
  createProjectWithFileTree,
  getRootObject,
  objectFile,
  objectNode,
  objectsFolder,
  openFileNode,
  openProject
} from "./support/project-helpers";

test("edits a label object through the inspector and persists after reload", async ({ page }) => {
  const fileName = `Rules Label File ${Date.now()}`;
  const project = await createProjectWithFileTree(page, `Inspector ${Date.now()}`, [
    objectsFolder([
      objectFile(
        "rules-label-file",
        fileName,
        objectNode("rules-label", "Rules Label", "label", {
          text: {
            color: "#0f172a",
            content: "Rules Label",
            fontSize: 16,
            fontStyle: "normal",
            fontWeight: 400,
            lineHeight: 1.2,
            textAlign: "center",
            verticalAlign: "middle"
          }
        })
      )
    ])
  ]);

  await openProject(page, project);
  await openFileNode(page, fileName);

  await page.getByLabel("Name").fill("Rules Headline");
  await page.keyboard.press("Enter");
  await page.getByLabel("Content").fill("Draw 2 cards, then discard 1.");
  await expect(page.getByRole("button", { name: "Bold" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  await page.getByRole("button", { name: "Bold" }).click();

  await expect
    .poll(async () => (await getRootObject(page, project.id, fileName))?.name)
    .toBe("Rules Headline");
  await expect
    .poll(
      async () => (await getRootObject(page, project.id, fileName))?.components?.text?.content
    )
    .toBe("Draw 2 cards, then discard 1.");
  await expect
    .poll(
      async () => (await getRootObject(page, project.id, fileName))?.components?.text?.fontWeight
    )
    .toBe(700);

  await page.reload();
  await new ProjectWorkspacePage(page).expectProjectOpen(project.name);
  await openFileNode(page, fileName);

  await expect(page.getByLabel("Name")).toHaveValue("Rules Headline");
  await expect(page.getByLabel("Content")).toHaveValue("Draw 2 cards, then discard 1.");
  await expect(page.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
});
