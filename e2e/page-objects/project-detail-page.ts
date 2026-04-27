import { expect, type Locator, type Page } from "@playwright/test";

export class ProjectDetailPage {
  readonly componentsHeading: Locator;
  readonly componentForm: ComponentFormObject;

  constructor(private readonly page: Page) {
    this.componentsHeading = page.getByRole("heading", { name: "Component catalog" });
    this.componentForm = new ComponentFormObject(page);
  }

  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}`);
  }

  async openComponents() {
    await this.page.getByRole("tab", { name: "Components" }).click();
  }

  async openNewComponent() {
    await this.page.getByRole("button", { name: "New component" }).click();
  }

  async openNewComponentForm() {
    await this.openNewComponent();
    return this.componentForm;
  }

  componentRow(name: string) {
    return this.page.getByRole("row", { name: new RegExp(`^${escapeRegExp(name)}\\b`) });
  }

  async duplicateComponent(name: string) {
    await this.componentRow(name).hover();
    await this.page.getByRole("button", { name: `Duplicate ${name}` }).click();
  }

  async openComponentEditor(name: string) {
    await this.componentRow(name).hover();
    await this.page.getByRole("button", { name: `Edit ${name}` }).click();
    return this.componentForm;
  }

  async deleteComponent(name: string) {
    await this.componentRow(name).hover();
    await this.page.getByRole("button", { name: `Delete ${name}` }).click();
  }

  acceptNextDeleteConfirmation(name: string) {
    this.page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(`Delete "${name}"?`);
      await dialog.accept();
    });
  }

  apiError(message: string) {
    return this.page.getByText(message);
  }
}

class ComponentFormObject {
  constructor(private readonly page: Page) {}

  get dialog() {
    return this.page.getByRole("dialog", { name: /^(New|Edit) component$/ });
  }

  async selectType(type: string) {
    await this.dialog.getByLabel("Type").click();
    await this.page.getByRole("option", { name: type }).click();
  }

  async fillCommon(values: {
    description?: string;
    name?: string;
    quantity?: string;
    tags?: string;
  }) {
    if (values.name !== undefined) {
      await this.dialog.getByLabel("Name").fill(values.name);
    }

    if (values.quantity !== undefined) {
      await this.dialog.getByLabel("Quantity").fill(values.quantity);
    }

    if (values.tags !== undefined) {
      await this.dialog.getByLabel("Tags").fill(values.tags);
    }

    if (values.description !== undefined) {
      await this.dialog.getByLabel("Description").fill(values.description);
    }
  }

  async fillCard(values: {
    backText?: string;
    frontText?: string;
    name?: string;
    quantity?: string;
    tags?: string;
  }) {
    await this.fillCommon(values);

    if (values.frontText !== undefined) {
      await this.dialog.getByLabel("Front text").fill(values.frontText);
    }

    if (values.backText !== undefined) {
      await this.dialog.getByLabel("Back text").fill(values.backText);
    }
  }

  async addDeckCard(quantity: string) {
    await this.dialog.getByRole("button", { name: "Add card" }).click();
    await this.dialog.getByLabel("Card quantity").fill(quantity);
  }

  async fillDeck(values: { cardName: string; cardQuantity: string; name: string }) {
    await this.fillCommon({ name: values.name });
    await this.dialog.getByRole("button", { name: "Add card" }).click();
    await this.dialog.getByLabel("Card", { exact: true }).click();
    await this.page.getByRole("option", { name: values.cardName }).click();
    await this.dialog.getByLabel("Card quantity").fill(values.cardQuantity);
  }

  async fillDie(values: { name?: string; sides: string }) {
    await this.fillCommon({ name: values.name });
    await this.dialog.getByLabel("Sides").fill(values.sides);
  }

  async saveCreate() {
    await this.dialog.getByRole("button", { name: "Create component" }).click();
  }

  async saveEdit() {
    await this.dialog.getByRole("button", { name: "Save changes" }).click();
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
