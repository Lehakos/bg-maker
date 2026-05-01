import { type Page } from "@playwright/test";
import { GameObject } from "./game-object";
import { ProjectPickerPage } from "./pages/project-picker-page";

export class BgMakerGame extends GameObject {
  readonly projects: ProjectPickerPage;

  constructor(page: Page) {
    super(page);
    this.projects = new ProjectPickerPage(page);
  }
}
