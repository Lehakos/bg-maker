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

  async openNewComponent(type = "Card") {
    await this.openCreateMenuItem("New component", `${type} component`);
  }

  async openNewComponentForm(type = "Card") {
    await this.openNewComponent(type);
    return this.componentForm;
  }

  async openNewCardTemplateForm() {
    await this.openCreateMenuItem("New template", "Card template");
    return this.componentForm;
  }

  async openNewPieceTemplateForm() {
    await this.openCreateMenuItem("New template", "Piece template");
    return this.componentForm;
  }

  async openNewTileTemplateForm() {
    await this.openCreateMenuItem("New template", "Tile template");
    return this.componentForm;
  }

  async openNewCollectionForm() {
    await this.page.getByRole("button", { name: "New collection" }).click();
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

  pieceTemplateRow(name: string) {
    return this.page
      .getByRole("row")
      .filter({ has: this.page.getByRole("cell", { name, exact: true }) })
      .filter({ has: this.page.getByRole("button", { name: `Edit piece template ${name}` }) });
  }

  collectionRow(name: string) {
    return this.page
      .getByRole("row")
      .filter({ has: this.page.getByRole("cell", { name, exact: true }) })
      .filter({ has: this.page.getByRole("button", { name: `Edit collection ${name}` }) });
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
    await row.getByRole("button", { name: `Edit card template ${name}` }).click({ force: true });
    return this.componentForm;
  }

  async openPieceTemplateEditor(name: string) {
    const row = this.pieceTemplateRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Edit piece template ${name}` }).click({ force: true });
    return this.componentForm;
  }

  async openCollectionEditor(name: string) {
    const row = this.collectionRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Edit collection ${name}` }).click({ force: true });
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
    await row.getByRole("button", { name: `Delete card template ${name}` }).click({ force: true });
  }

  async deletePieceTemplate(name: string) {
    const row = this.pieceTemplateRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Delete piece template ${name}` }).click({ force: true });
  }

  async deleteCollection(name: string) {
    const row = this.collectionRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Delete collection ${name}` }).click({ force: true });
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

  acceptNextDeletePieceTemplateConfirmation(name: string) {
    this.page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(`Delete piece template "${name}"?`);
      await dialog.accept();
    });
  }

  acceptNextDeleteCollectionConfirmation(name: string) {
    this.page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(`Delete collection "${name}"?`);
      await dialog.accept();
    });
  }

  apiError(message: string) {
    return this.page.getByText(message);
  }

  private async openCreateMenuItem(buttonName: string, itemName: string) {
    await this.page.getByRole("button", { name: buttonName }).click();
    await this.page.getByRole("menuitem", { name: itemName }).click();
  }
}

class ComponentFormObject {
  constructor(private readonly page: Page) {}

  get dialog() {
    return this.page.getByRole("dialog", {
      name: /^(New component|Edit component|New template|New card template|Edit card template|New tile template|Edit tile template|New piece template|Edit piece template|New collection|Edit collection)$/
    });
  }

  async selectType(type: string) {
    await this.dialog.getByLabel("Type", { exact: true }).click();
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
        .getByRole("textbox", { name: /^(Name|Template name|Collection name)$/ })
        .fill(values.name);
    }

    if (values.quantity !== undefined) {
      await this.dialog.getByLabel("Quantity", { exact: true }).fill(values.quantity);
    }

    if (values.tags !== undefined) {
      const tagsInput = this.dialog.getByRole("combobox", { name: "Tags" });
      await tagsInput.click();
      const existing = await this.dialog.locator(".mantine-Pill-root").count();
      for (let index = 0; index < existing; index += 1) {
        await tagsInput.press("Backspace");
      }
      const tags = values.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      for (const tag of tags) {
        await tagsInput.fill(tag);
        await tagsInput.press("Enter");
      }
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

  async fillCardPadding(values: { bottom?: string; left?: string; right?: string; top?: string }) {
    if (values.top !== undefined) {
      await this.dialog.getByLabel("Padding top").fill(values.top);
    }

    if (values.right !== undefined) {
      await this.dialog.getByLabel("Padding right").fill(values.right);
    }

    if (values.bottom !== undefined) {
      await this.dialog.getByLabel("Padding bottom").fill(values.bottom);
    }

    if (values.left !== undefined) {
      await this.dialog.getByLabel("Padding left").fill(values.left);
    }
  }

  async openZonesTab() {
    const tab = this.dialog.getByRole("tab", { name: /^(Zones|Label)$/ });
    if ((await tab.count()) > 0) {
      await tab.first().click();
    }
  }

  async openPhysicalTab() {
    const tab = this.dialog.getByRole("tab", { name: "Physical" });
    if ((await tab.count()) > 0) {
      await tab.click();
    }
  }

  async selectZoneTemplate(template: string) {
    await this.openZonesTab();
    await this.dialog.getByLabel("Zone template").click();
    await this.page.getByRole("option", { name: template }).click();
  }

  async openCardSide(side: "Back" | "Front") {
    await this.dialog.getByRole("tab", { name: side }).click();
  }

  async addTextElement(text: string) {
    await this.openZonesTab();
    await this.selectZoneContentType("Text");
    await this.dialog.getByLabel("Text content").fill(text);
  }

  async addIconElement(icon: string) {
    await this.openZonesTab();
    await this.selectZoneContentType("Visual");
    await this.selectVisualType("Icon");
    await this.dialog.getByRole("combobox", { name: "Icon" }).click();
    await this.page.getByRole("option", { name: icon }).click();
  }

  async addImageElement(file: { buffer: Buffer; mimeType: string; name: string }) {
    await this.openZonesTab();
    await this.selectZoneContentType("Visual");
    await this.selectVisualType("Image");

    const fileChooserPromise = this.page.waitForEvent("filechooser");
    await this.dialog.getByLabel("Image file").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles(file);
  }

  async selectElementContentSource(source: "Fixed" | "Per-component") {
    await this.openZonesTab();
    await this.dialog.locator("label").filter({ hasText: source }).click();
  }

  async fillFieldKey(fieldKey: string) {
    await this.openZonesTab();
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
    await this.openZonesTab();
    return Number.parseFloat(await this.dialog.getByLabel(label).inputValue());
  }

  selectedZoneInput() {
    return this.dialog.getByRole("combobox", { name: "Selected zone" });
  }

  async selectZoneContentType(type: "Text" | "Visual") {
    await this.openZonesTab();
    if ((await this.dialog.getByLabel("Content type").count()) === 0) {
      await this.dialog.getByRole("button", { name: "Add zone" }).click();
    }
    await this.dialog.getByLabel("Content type").click();
    await this.page.getByRole("option", { name: type }).click();
  }

  async selectVisualType(type: "Icon" | "Image") {
    await this.openZonesTab();
    await this.dialog.getByLabel("Visual type").click();
    await this.page.getByRole("option", { name: type }).click();
  }

  async selectVisualHorizontalPosition(position: "Center" | "Left" | "Right") {
    await this.openZonesTab();
    await this.dialog.getByLabel("Horizontal position").click();
    await this.page.getByRole("option", { name: position }).click();
  }

  async selectVisualVerticalPosition(position: "Bottom" | "Center" | "Top") {
    await this.openZonesTab();
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

  async selectPieceTemplate(name: string) {
    await this.dialog.getByLabel("Piece template").click();
    await this.page.getByRole("option", { name }).click();
  }

  async createMissingTemplate(type: "card" | "piece" | "tile") {
    await this.dialog.getByRole("button", { name: `Create ${type} template` }).click();
  }

  async selectTileTemplate(name: string) {
    await this.dialog.getByLabel("Tile template").click();
    await this.page.getByRole("option", { name }).click();
  }

  async fillPieceTemplate(values: {
    faceText?: string;
    formFactor?: "Flat" | "Solid" | "Standee";
    shape?: string;
  }) {
    if (values.formFactor !== undefined) {
      await this.openPhysicalTab();
      await this.dialog.getByLabel("Form factor").click();
      await this.page.getByRole("option", { name: values.formFactor }).click();
    }

    if (values.shape !== undefined) {
      await this.openPhysicalTab();
      await this.dialog.getByRole("button", { name: `Select ${values.shape} shape` }).click();
    }

    if (values.faceText !== undefined) {
      await this.openZonesTab();
      const faceTextInput = this.dialog.getByRole("textbox", { name: "Face text" });

      if ((await faceTextInput.count()) > 0) {
        await faceTextInput.fill(values.faceText);
      } else {
        if ((await this.dialog.getByLabel("Text content").count()) === 0) {
          await this.dialog.getByRole("button", { name: "Add zone" }).click();
        }
        await this.dialog.getByLabel("Text content").fill(values.faceText);
      }
    }

    if (values.shape === "Custom") {
      await this.openPhysicalTab();
    }
  }

  async fillTileTemplate(values: { faceText?: string; shape?: string }) {
    if (values.shape !== undefined) {
      await this.openPhysicalTab();
      await this.dialog.getByRole("button", { name: `Select ${values.shape} shape` }).click();
    }

    if (values.faceText !== undefined) {
      await this.addTextElement(values.faceText);
    }
  }

  async fillTile(values: { edgeLabels?: string; faceLabel?: string; shape?: "Box" | "Hex" }) {
    if (values.shape !== undefined) {
      await this.dialog.getByLabel("Shape").click();
      await this.page.getByRole("option", { name: values.shape }).click();
    }

    if (values.faceLabel !== undefined) {
      await this.dialog.getByRole("textbox", { name: "Face label" }).fill(values.faceLabel);
    }

    if (values.edgeLabels !== undefined) {
      await this.dialog.getByRole("textbox", { name: "Edge labels" }).fill(values.edgeLabels);
    }
  }

  async addCollectionItem(componentName: string, quantity: string) {
    await this.dialog.getByRole("button", { name: "Add item" }).click();
    await expect(this.dialog.getByLabel("Component")).toHaveValue(new RegExp(componentName));
    await this.dialog.getByLabel("Quantity").fill(quantity);
  }

  async fillCollection(values: { componentName: string; name: string; quantity: string }) {
    await this.addCollectionItem(values.componentName, values.quantity);
    await this.fillCommon({ name: values.name });
  }

  async fillDie(values: { name?: string; sides: string }) {
    await this.fillCommon({ name: values.name });
    await this.dialog.getByLabel("Sides").fill(values.sides);
  }

  async saveCreate() {
    await this.dialog
      .getByRole("button", { name: /Create (collection|component|template)/ })
      .click();
  }

  async saveEdit() {
    await this.dialog.getByRole("button", { name: "Save changes" }).click();
  }
}
