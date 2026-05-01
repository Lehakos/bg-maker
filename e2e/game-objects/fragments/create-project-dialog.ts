import { type Page } from "@playwright/test";
import { GameObject } from "../game-object";

type CreateProjectPayload = {
  name: string;
  description?: string;
};

export class CreateProjectDialog extends GameObject {
  constructor(page: Page) {
    super(page, page.getByRole("dialog", { name: "New project" }));
  }

  async createProject(payload: CreateProjectPayload) {
    await this.getByLabel("Name").fill(payload.name);

    if (payload.description !== undefined) {
      await this.getByLabel("Description").fill(payload.description);
    }

    await this.getByRole("button", { name: "Create", exact: true }).click();
  }
}
