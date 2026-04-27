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

  async openNewCardTemplateForm() {
    await this.page.getByRole("button", { name: "New card template" }).click();
    return this.componentForm;
  }

  componentRow(name: string) {
    return this.page
      .getByRole("row")
      .filter({ has: this.page.getByRole("cell", { name, exact: true }) });
  }

  cardTemplateRow(name: string) {
    return this.page
      .getByRole("row")
      .filter({ has: this.page.getByRole("cell", { name, exact: true }) })
      .filter({ has: this.page.getByRole("button", { name: `Edit card template ${name}` }) });
  }

  async duplicateComponent(name: string) {
    const row = this.componentRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Duplicate ${name}` }).click({ force: true });
  }

  async openComponentEditor(name: string) {
    const row = this.componentRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Edit ${name}` }).click({ force: true });
    return this.componentForm;
  }

  async openCardTemplateEditor(name: string) {
    const row = this.cardTemplateRow(name);
    await row.hover();
    await row
      .getByRole("button", { name: `Edit card template ${name}` })
      .click({ force: true });
    return this.componentForm;
  }

  async deleteComponent(name: string) {
    const row = this.componentRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Delete ${name}` }).click({ force: true });
  }

  async deleteCardTemplate(name: string) {
    const row = this.cardTemplateRow(name);
    await row.hover();
    await row
      .getByRole("button", { name: `Delete card template ${name}` })
      .click({ force: true });
  }

  acceptNextDeleteConfirmation(name: string) {
    this.page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(`Delete "${name}"?`);
      await dialog.accept();
    });
  }

  acceptNextDeleteCardTemplateConfirmation(name: string) {
    this.page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(`Delete card template "${name}"?`);
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
    return this.page.getByRole("dialog", {
      name: /^(New component|Edit component|New card template|Edit card template)$/
    });
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
      await this.dialog
        .getByRole("textbox", { name: /^(Name|Template name)$/ })
        .fill(values.name);
    }

    if (values.quantity !== undefined) {
      await this.dialog.getByLabel("Quantity", { exact: true }).fill(values.quantity);
    }

    if (values.tags !== undefined) {
      await this.dialog.getByRole("textbox", { name: "Tags" }).fill(values.tags);
    }

    if (values.description !== undefined) {
      await this.dialog.getByRole("textbox", { name: "Description" }).fill(values.description);
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
      await this.addTextElement(values.frontText);
    }

    if (values.backText !== undefined) {
      await this.openCardSide("Back");
      await this.addTextElement(values.backText);
      await this.openCardSide("Front");
    }
  }

  async selectCardSize(size: string) {
    await this.dialog.getByLabel("Card size").click();
    await this.page.getByRole("option", { name: size }).click();
  }

  async selectZoneTemplate(template: string) {
    await this.dialog.getByLabel("Zone template").click();
    await this.page.getByRole("option", { name: template }).click();
  }

  async openCardSide(side: "Back" | "Front") {
    await this.dialog.getByRole("tab", { name: side }).click();
  }

  async addTextElement(text: string) {
    await this.selectZoneContentType("Text");
    await this.dialog.getByLabel("Text content").fill(text);
  }

  async addIconElement(icon: string) {
    await this.selectZoneContentType("Visual");
    await this.selectVisualType("Icon");
    await this.dialog.getByRole("combobox", { name: "Icon" }).click();
    await this.page.getByRole("option", { name: icon }).click();
  }

  async addImageElement(file: { buffer: Buffer; mimeType: string; name: string }) {
    await this.selectZoneContentType("Visual");
    await this.selectVisualType("Image");

    const fileChooserPromise = this.page.waitForEvent("filechooser");
    await this.dialog.getByLabel("Image file").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles(file);
  }

  async selectElementContentSource(source: string) {
    await this.dialog.getByLabel("Content source").click();
    await this.page.getByRole("option", { name: source }).click();
  }

  async fillFieldKey(fieldKey: string) {
    await this.dialog.getByLabel("Field key").fill(fieldKey);
  }

  async selectCardTemplate(name: string) {
    await this.dialog.getByLabel("Card template").click();
    await this.page.getByRole("option", { name }).click();
  }

  async fillPerCardValue(label: string, value: string) {
    await this.dialog.getByRole("textbox", { name: label }).fill(value);
  }

  async selectPreviewZone(name: string) {
    await this.previewZone(name).click();
  }

  async dragPreviewZone(name: string, deltaX: number, deltaY: number) {
    await this.dragLocator(this.previewZone(name), deltaX, deltaY);
  }

  async resizePreviewZone(name: string, deltaX: number, deltaY: number) {
    const zoneBox = await this.previewZone(name).boundingBox();

    if (!zoneBox) {
      throw new Error("Could not locate resizable preview zone");
    }

    const startX = zoneBox.x + zoneBox.width - 16;
    const startY = zoneBox.y + zoneBox.height - 16;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + deltaX, startY + deltaY, { steps: 5 });
    await this.page.mouse.up();
  }

  async zoneNumberValue(label: string) {
    return Number(await this.dialog.getByLabel(label).inputValue());
  }

  selectedZoneInput() {
    return this.dialog.getByRole("combobox", { name: "Selected zone" });
  }

  async selectZoneContentType(type: "Text" | "Visual") {
    await this.dialog.getByLabel("Content type").click();
    await this.page.getByRole("option", { name: type }).click();
  }

  async selectVisualType(type: "Icon" | "Image") {
    await this.dialog.getByLabel("Visual type").click();
    await this.page.getByRole("option", { name: type }).click();
  }

  async selectVisualHorizontalPosition(position: "Center" | "Left" | "Right") {
    await this.dialog.getByLabel("Horizontal position").click();
    await this.page.getByRole("option", { name: position }).click();
  }

  async selectVisualVerticalPosition(position: "Bottom" | "Center" | "Top") {
    await this.dialog.getByLabel("Vertical position").click();
    await this.page.getByRole("option", { name: position }).click();
  }

  private previewZone(name: string) {
    return this.dialog.locator(`.card-preview-zone[data-zone-name="${name}"]`);
  }

  private async dragLocator(locator: Locator, deltaX: number, deltaY: number) {
    const box = await locator.boundingBox();

    if (!box) {
      throw new Error("Could not locate draggable preview zone");
    }

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + deltaX, startY + deltaY, { steps: 5 });
    await this.page.mouse.up();
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
    await this.dialog.getByRole("button", { name: /Create (component|template)/ }).click();
  }

  async saveEdit() {
    await this.dialog.getByRole("button", { name: "Save changes" }).click();
  }
}
