import { expect, type Locator, type Page } from "@playwright/test";

type ProjectRow = {
  name: string;
  players?: string;
  status?: string;
};

type ProjectFormValues = {
  name?: string;
  description?: string;
};

export class ProjectsPage {
  readonly form: ProjectFormModalObject;
  readonly recentProjectsHeading: Locator;

  constructor(private readonly page: Page) {
    this.form = new ProjectFormModalObject(page);
    this.recentProjectsHeading = page.getByRole("heading", { name: "Recent projects" });
  }

  async goto() {
    await this.page.goto("/");
  }

  projectRow(project: ProjectRow) {
    return this.page.getByRole("row", { name: projectRowPattern(project) });
  }

  projectActions(projectId: string) {
    return this.page.getByTestId(`project-actions-${projectId}`);
  }

  async hoverProject(project: ProjectRow) {
    await this.projectRow(project).hover();
  }

  async openProjectEditor(projectName: string) {
    await this.page.getByRole("button", { name: `Edit ${projectName}` }).click();
  }

  async deleteProject(projectName: string) {
    await this.page.getByRole("button", { name: `Delete ${projectName}` }).click();
  }

  acceptNextDeleteConfirmation(projectName: string) {
    this.page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(`Delete "${projectName}"?`);
      await dialog.accept();
    });
  }
}

export class ProjectFormModalObject {
  readonly dialog: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole("dialog", { name: "Edit project" });
  }

  get nameInput() {
    return this.dialog.getByLabel("Name");
  }

  async fill(values: ProjectFormValues) {
    if (values.name !== undefined) {
      await this.nameInput.fill(values.name);
    }

    if (values.description !== undefined) {
      await this.dialog.getByLabel("Description").fill(values.description);
    }
  }

  async saveChanges() {
    await this.dialog.getByRole("button", { name: "Save changes" }).click();
  }
}

function projectRowPattern({ name, players, status }: ProjectRow) {
  const parts = [name, players, status].filter((part): part is string => part !== undefined);
  return new RegExp(`^${parts.map(escapeRegExp).join("\\s+")}`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
