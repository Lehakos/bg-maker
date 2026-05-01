import { type Page } from "@playwright/test";
import { GameObject } from "../game-object";

type CreateProjectPayload = {
  name: string;
  description?: string;
};

export class CreateProjectDialog extends GameObject {
  constructor(page: Page) {
    super(page, page.getByRole("dialog", { name: "Новый проект" }));
  }

  async createProject(payload: CreateProjectPayload) {
    await this.getByLabel("Название").fill(payload.name);

    if (payload.description !== undefined) {
      await this.getByLabel("Описание").fill(payload.description);
    }

    await this.getByRole("button", { name: "Создать", exact: true }).click();
  }
}
