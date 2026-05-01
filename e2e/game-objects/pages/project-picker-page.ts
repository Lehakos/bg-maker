import { expect, type Page } from "@playwright/test";
import { CreateProjectDialog } from "../fragments/create-project-dialog";
import { GameObject } from "../game-object";
import { ProjectWorkspacePage } from "./project-workspace-page";

type CreateProjectPayload = {
  name: string;
  description?: string;
};

export class ProjectPickerPage extends GameObject {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/");
    await this.expectReady();
  }

  async expectReady() {
    await expect(this.getByRole("heading", { name: "BG Maker" })).toBeVisible();
    await expect(this.getByRole("heading", { name: "Проекты" })).toBeVisible();
  }

  async createProject(payload: CreateProjectPayload) {
    await this.openCreateProjectDialog();
    await new CreateProjectDialog(this.page).createProject(payload);

    return new ProjectWorkspacePage(this.page);
  }

  async expectProjectVisible(projectName: string) {
    await expect(this.getByRole("heading", { name: projectName })).toBeVisible();
  }

  private async openCreateProjectDialog() {
    await this.getByRole("button", { name: "Создать проект" }).first().click();
  }
}
