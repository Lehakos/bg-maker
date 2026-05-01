import { expect, type Locator, type Page, type Route } from "@playwright/test";
import { dragLocator, dragLocatorTo } from "../support/ui-helpers";

export class ProjectDetailPage {
  readonly collectionsHeading: Locator;
  readonly componentsHeading: Locator;
  readonly componentForm: ComponentFormObject;
  readonly runtimeSessions: RuntimeSessionsObject;
  readonly templatesHeading: Locator;

  constructor(private readonly page: Page) {
    this.collectionsHeading = page.getByRole("heading", { name: "Collections" });
    this.componentsHeading = page.getByRole("heading", { name: "Component catalog" });
    this.componentForm = new ComponentFormObject(page);
    this.runtimeSessions = new RuntimeSessionsObject(page);
    this.templatesHeading = page.getByRole("heading", { name: "Templates" });
  }

  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}`);
  }

  async openComponents() {
    await this.openCatalogTable("Component catalog");
  }

  async openLayout() {
    await this.page.getByRole("tab", { name: "Layout" }).click();
    await expect(
      this.page.getByRole("heading", { exact: true, name: "Table layout" })
    ).toBeVisible();
  }

  async openSessions() {
    await this.page.getByRole("tab", { name: "Sessions" }).click();
    await expect(this.page.getByRole("heading", { exact: true, name: "Sessions" })).toBeVisible();
    return this.runtimeSessions;
  }

  async openNewComponent(type = "Card") {
    await this.openCatalogTable("Component catalog");
    await this.openCreateMenuItem("New component", `${type} component`);
  }

  async openNewComponentForm(type = "Card") {
    await this.openNewComponent(type);
    return this.componentForm;
  }

  async openNewCardTemplateForm() {
    await this.openCatalogTable("Templates");
    await this.openCreateMenuItem("New template", "Card template");
    return this.componentForm;
  }

  async openNewPieceTemplateForm() {
    await this.openCatalogTable("Templates");
    await this.openCreateMenuItem("New template", "Piece template");
    return this.componentForm;
  }

  async openNewTileTemplateForm() {
    await this.openCatalogTable("Templates");
    await this.openCreateMenuItem("New template", "Tile template");
    return this.componentForm;
  }

  async openNewCollectionForm() {
    await this.openCatalogTable("Collections");
    await this.page.getByRole("button", { name: "New collection" }).click();
    return this.componentForm;
  }

  async filterCollectionsByType(type: "All collections" | "Bags" | "Custom" | "Decks") {
    await this.openCatalogTable("Collections");
    await this.page.getByRole("combobox", { name: "Filter collections by type" }).click();
    await this.page.getByRole("option", { exact: true, name: type }).click();
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
    await this.openCatalogTable("Component catalog");
    const row = this.componentRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Duplicate ${name}` }).click({ force: true });
  }

  async openComponentEditor(name: string) {
    await this.openCatalogTable("Component catalog");
    const row = this.componentRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Edit ${name}` }).click({ force: true });
    return this.componentForm;
  }

  async openCardTemplateEditor(name: string) {
    await this.openCatalogTable("Templates");
    const row = this.cardTemplateRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Edit card template ${name}` }).click({ force: true });
    return this.componentForm;
  }

  async openPieceTemplateEditor(name: string) {
    await this.openCatalogTable("Templates");
    const row = this.pieceTemplateRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Edit piece template ${name}` }).click({ force: true });
    return this.componentForm;
  }

  async openCollectionEditor(name: string) {
    await this.openCatalogTable("Collections");
    const row = this.collectionRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Edit collection ${name}` }).click({ force: true });
    return this.componentForm;
  }

  async deleteComponent(name: string) {
    await this.openCatalogTable("Component catalog");
    const row = this.componentRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Delete ${name}` }).click({ force: true });
  }

  async deleteCardTemplate(name: string) {
    await this.openCatalogTable("Templates");
    const row = this.cardTemplateRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Delete card template ${name}` }).click({ force: true });
  }

  async deletePieceTemplate(name: string) {
    await this.openCatalogTable("Templates");
    const row = this.pieceTemplateRow(name);
    await row.hover();
    await row.getByRole("button", { name: `Delete piece template ${name}` }).click({ force: true });
  }

  async deleteCollection(name: string) {
    await this.openCatalogTable("Collections");
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

  private async openCatalogTable(table: "Collections" | "Component catalog" | "Templates") {
    await this.page.getByRole("tab", { name: "Components" }).click();
    await this.page.getByRole("button", { name: `Show ${table} table` }).click();
    await expect(this.getCatalogTableHeading(table)).toBeVisible();
  }

  private getCatalogTableHeading(table: "Collections" | "Component catalog" | "Templates") {
    switch (table) {
      case "Collections":
        return this.collectionsHeading;
      case "Templates":
        return this.templatesHeading;
      case "Component catalog":
        return this.componentsHeading;
    }
  }
}

class RuntimeSessionsObject {
  constructor(private readonly page: Page) {}

  get tableSurface() {
    return this.page.getByLabel("Runtime table surface");
  }

  action(message: RegExp | string) {
    return this.page.getByText(message);
  }

  zone(name: string) {
    return this.page.getByLabel(`Runtime zone ${name}`, { exact: true });
  }

  runtimeItem(name: string) {
    return this.tableSurface.getByLabel(`Runtime item ${name}`, { exact: true }).first();
  }

  async createSession() {
    await this.page.getByRole("button", { name: "New session" }).first().click();
    await expect(this.tableSurface).toBeVisible();
  }

  async expectZonesVisible(names: string[]) {
    for (const name of names) {
      await expect(this.zone(name)).toBeVisible();
    }
  }

  async expectActionVisible(message: RegExp | string) {
    await expect(this.action(message)).toBeVisible();
  }

  async expectNoAction(message: RegExp | string) {
    await expect(this.action(message)).toHaveCount(0);
  }

  async expectZoneItemCount(
    name: string,
    count: number,
    options: {
      timeout?: number;
    } = {}
  ) {
    await expect(this.zone(name).getByLabel(/Runtime item/)).toHaveCount(count, options);
  }

  async expectZoneCollectionCount(name: string, count: number) {
    const countBadge = this.zone(name).locator(".runtime-zone-label .runtime-collection-count");

    await expect(countBadge).toHaveText(String(count));
    await expect(countBadge.locator("span")).toBeVisible();
  }

  async expectZoneLabelOutsideFrame(name: string) {
    await expect
      .poll(async () => {
        const zoneBox = await this.zone(name).boundingBox();
        const labelBox = await this.zone(name).locator(".runtime-zone-label").boundingBox();

        if (!zoneBox || !labelBox) {
          return Number.POSITIVE_INFINITY;
        }

        return labelBox.y + labelBox.height - zoneBox.y;
      })
      .toBeLessThan(1.5);
  }

  async expectZoneTypeBadge(name: string, typeLabel: string) {
    await expect(this.zone(name).locator(".runtime-zone-label")).toContainText(typeLabel);
  }

  async expectContainerZoneRenderedWithoutChrome(name: string) {
    await expect(this.zone(name)).toBeAttached();
    await expect(this.zone(name)).toHaveAttribute("data-visual-hidden", "true");
    await expect(this.zone(name).locator(".runtime-zone-label")).toHaveCount(0);
  }

  async expectRuntimeItemSize(
    name: string,
    size: { heightMm: number; widthMm: number },
    table: { heightMm: number; widthMm: number },
    options: { tolerancePx?: number } = {}
  ) {
    const tolerancePx = options.tolerancePx ?? 1.5;

    await expect
      .poll(async () => {
        const surfaceBox = await this.tableSurface.boundingBox();
        const itemBox = await this.runtimeItem(name).boundingBox();

        if (!surfaceBox || !itemBox) {
          return Number.POSITIVE_INFINITY;
        }

        const expectedWidth = (size.widthMm / table.widthMm) * surfaceBox.width;
        const expectedHeight = (size.heightMm / table.heightMm) * surfaceBox.height;

        return Math.max(
          Math.abs(itemBox.width - expectedWidth),
          Math.abs(itemBox.height - expectedHeight)
        );
      })
      .toBeLessThan(tolerancePx);
  }

  async expectRuntimeItemRenderedDownRightOf(name: string, referenceName: string) {
    await expect
      .poll(async () => {
        const itemPoint = await runtimeItemStylePoint(this.runtimeItem(name));
        const referencePoint = await runtimeItemStylePoint(this.runtimeItem(referenceName));

        if (!itemPoint || !referencePoint) {
          return false;
        }

        return itemPoint.left > referencePoint.left && itemPoint.top > referencePoint.top;
      })
      .toBe(true);
  }

  async expectRuntimeVisualFillsItem(
    name: string,
    visualSelector: string,
    options: { tolerancePx?: number } = {}
  ) {
    const tolerancePx = options.tolerancePx ?? 1.5;

    await expect
      .poll(async () => {
        const item = this.runtimeItem(name);
        const itemBox = await item.boundingBox();
        const visualBox = await item.locator(visualSelector).first().boundingBox();

        if (!itemBox || !visualBox) {
          return Number.POSITIVE_INFINITY;
        }

        return Math.max(
          Math.abs(itemBox.width - visualBox.width),
          Math.abs(itemBox.height - visualBox.height)
        );
      })
      .toBeLessThan(tolerancePx);
  }

  async expectRuntimeElementInsideItem(
    name: string,
    elementSelector: string,
    options: { tolerancePx?: number } = {}
  ) {
    const tolerancePx = options.tolerancePx ?? 1.5;

    await expect
      .poll(async () => {
        const item = this.runtimeItem(name);
        const itemBox = await item.boundingBox();
        const elementBox = await item.locator(elementSelector).first().boundingBox();

        if (!itemBox || !elementBox) {
          return Number.POSITIVE_INFINITY;
        }

        return Math.max(
          itemBox.x - elementBox.x,
          itemBox.y - elementBox.y,
          elementBox.x + elementBox.width - (itemBox.x + itemBox.width),
          elementBox.y + elementBox.height - (itemBox.y + itemBox.height)
        );
      })
      .toBeLessThan(tolerancePx);
  }

  async expectRuntimeElementBelowItem(
    name: string,
    elementSelector: string,
    options: { tolerancePx?: number } = {}
  ) {
    const tolerancePx = options.tolerancePx ?? 1.5;

    await expect
      .poll(async () => {
        const item = this.runtimeItem(name);
        const itemBox = await item.boundingBox();
        const elementBox = await item.locator(elementSelector).first().boundingBox();

        if (!itemBox || !elementBox) {
          return Number.NEGATIVE_INFINITY;
        }

        return elementBox.y - (itemBox.y + itemBox.height);
      })
      .toBeGreaterThanOrEqual(-tolerancePx);
  }

  async expectRuntimeElementAbsent(name: string, elementSelector: string) {
    await expect(this.runtimeItem(name).locator(elementSelector)).toHaveCount(0);
  }

  async expectRuntimeTextFontSizeLessThan(name: string, maxSizePx: number) {
    await expect
      .poll(async () => {
        const text = this.runtimeItem(name).locator(".card-preview-text").first();

        return text.evaluate((element) =>
          Number.parseFloat(window.getComputedStyle(element).fontSize)
        );
      })
      .toBeLessThan(maxSizePx);
  }

  async holdNextMoveAction() {
    let release: () => void = () => undefined;
    let moveActionHeld = false;
    const releasePromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    const url = "**/api/projects/*/sessions/*/actions";
    const handler = async (route: Route) => {
      const action = route.request().postDataJSON() as { type?: string };

      if (action.type !== "MOVE_INSTANCE" || moveActionHeld) {
        await route.continue();
        return;
      }

      moveActionHeld = true;
      await releasePromise;
      await route.continue();
    };

    await this.page.route(url, handler);

    return async () => {
      release();
    };
  }

  async moveTopZoneItem(sourceZone: string, targetZone: string) {
    await dragLocatorTo(
      this.page,
      this.zone(sourceZone)
        .getByLabel(/Runtime item/)
        .first(),
      this.zone(targetZone),
      {
        targetPosition: { x: 48, y: 56 }
      }
    );
  }

  async reloadOpenSession() {
    await this.page.reload();
    await expect(this.page.getByRole("heading", { exact: true, name: "Sessions" })).toBeVisible();
  }

  async rollDie(name: string) {
    await this.page.getByRole("button", { name: `Roll ${name}` }).click();
  }

  async shuffleStack(name: string) {
    await this.page.getByRole("button", { name: `Shuffle ${name}` }).click();
  }
}

async function runtimeItemStylePoint(locator: Locator) {
  try {
    return await locator.evaluate((element) => {
      const htmlElement = element as HTMLElement;

      return {
        left: Number.parseFloat(htmlElement.style.left),
        top: Number.parseFloat(htmlElement.style.top)
      };
    });
  } catch {
    return null;
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

  async fillCommon(values: { description?: string; name?: string; tags?: string }) {
    if (values.name !== undefined) {
      await this.dialog
        .getByRole("textbox", { name: /^(Name|Template name|Collection name)$/ })
        .fill(values.name);
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

  async fillCard(values: { backText?: string; frontText?: string; name?: string; tags?: string }) {
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
    await dragLocator(
      this.page,
      this.previewZone(name),
      deltaX,
      deltaY,
      "Could not locate draggable preview zone"
    );
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
    return Number.parseFloat(
      await this.dialog
        .getByRole("textbox", { exact: true, name: toCurrentZoneNumberLabel(label) })
        .inputValue()
    );
  }

  selectedZoneOption(name: string) {
    return this.dialog.getByRole("option", { name });
  }

  async selectZoneContentType(type: "Text" | "Visual") {
    await this.openZonesTab();
    const contentType = this.contentTypeSelect();

    if ((await contentType.count()) === 0) {
      await this.dialog.getByRole("button", { name: "Add zone" }).click();
      await this.page.getByRole("menuitem", { name: type === "Text" ? "Text" : "Image" }).click();
    }

    await this.contentTypeSelect().click();
    await this.page
      .getByRole("option", { exact: true, name: type === "Text" ? "Text" : "Image" })
      .click();
  }

  async selectVisualType(type: "Icon" | "Image") {
    await this.openZonesTab();
    await this.contentTypeSelect().click();
    await this.page.getByRole("option", { exact: true, name: type }).click();
  }

  private contentTypeSelect() {
    return this.dialog.getByLabel("Content type");
  }

  async selectVisualHorizontalPosition(position: "Center" | "Left" | "Right") {
    await this.openZonesTab();
    await this.dialog.getByLabel("Horizontal position").click();
    await this.page.getByRole("option", { exact: true, name: position }).click();
  }

  async selectVisualVerticalPosition(position: "Bottom" | "Center" | "Top") {
    await this.openZonesTab();
    await this.dialog.getByLabel("Vertical position").click();
    await this.page.getByRole("option", { exact: true, name: position }).click();
  }

  private previewZone(name: string) {
    return this.dialog.locator(`.card-preview-zone[data-zone-name="${name}"]`);
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
          await this.page.getByRole("menuitem", { name: "Text" }).click();
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

  async selectCollectionType(type: "Bag" | "Custom" | "Deck") {
    await this.dialog.getByLabel("Collection type").click();
    await this.page.getByRole("option", { name: type }).click();
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

function toCurrentZoneNumberLabel(label: string) {
  switch (label) {
    case "Zone X":
      return "Left";
    case "Zone Y":
      return "Top";
    case "Zone width":
      return "Width";
    case "Zone height":
      return "Height";
    default:
      return label;
  }
}
