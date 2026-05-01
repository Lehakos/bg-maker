import { expect, type Page } from "@playwright/test";
import { GameObject } from "../game-object";

export class ProjectWorkspacePage extends GameObject {
  constructor(page: Page) {
    super(page);
  }

  async expectProjectOpen(projectName: RegExp | string) {
    await expect(this.page).toHaveURL(/\/projects\/[^/]+$/);
    await expect(this.getByRole("heading", { name: projectName })).toBeVisible();
    await expect(this.getByRole("heading", { name: "File tree", exact: true })).toBeVisible();
    await expect(this.getByRole("button", { name: "Table setups", exact: true })).toBeVisible();
  }

  async goToProjects() {
    await this.getByRole("button", { name: "Back to projects" }).click();
  }
}
