import { expect, type Page } from "@playwright/test";
import { GameObject } from "../game-object";

export class ProjectWorkspacePage extends GameObject {
  constructor(page: Page) {
    super(page);
  }

  async expectProjectOpen(projectName: string) {
    await expect(this.page).toHaveURL(/\/projects\/[^/]+$/);
    await expect(this.getByRole("heading", { name: projectName })).toBeVisible();
    await expect(this.getByRole("heading", { name: "Table Setups" })).toBeVisible();
  }

  async goToProjects() {
    await this.getByRole("button", { name: "К проектам" }).click();
  }
}
