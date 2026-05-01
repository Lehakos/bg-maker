import { test } from "@playwright/test";
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
