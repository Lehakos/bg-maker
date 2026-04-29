import { expect, test } from "./fixtures/projects-test";
import { ProjectDetailPage } from "./page-objects/project-detail-page";

test.describe("project components", () => {
  test("creates cards, pieces, tiles, collections, dice, and duplicates components", async ({
    page,
    projectsApi
  }) => {
    const project = await projectsApi.create({
      name: "Components UI Project",
      players: "2",
      status: "draft"
    });
    const detailPage = new ProjectDetailPage(page);

    await detailPage.goto(project.id);
    await detailPage.openComponents();
    await expect(detailPage.componentsHeading).toBeVisible();

    let form = await detailPage.openNewComponentForm();
    await form.createMissingTemplate("card");
    await form.fillCommon({ name: "Action card template" });
    await form.addTextElement("Deal 1 damage");
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();

    form = await detailPage.openNewComponentForm();
    await form.fillCommon({ name: "Strike", quantity: "12", tags: "starter, attack" });
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();
    await expect(detailPage.componentRow("Strike")).toContainText("Deal 1 damage");
    await expect(detailPage.componentRow("Strike")).toContainText("starter");

    form = await detailPage.openNewPieceTemplateForm();
    await form.fillCommon({ name: "Coin piece template" });
    for (const shape of ["Circle", "Box", "Hex", "Meeple", "Pawn", "Custom"]) {
      await expect(
        form.dialog.getByRole("button", { name: `Select ${shape} shape` })
      ).toBeVisible();
    }
    await form.fillPieceTemplate({ faceText: "1 coin", shape: "Circle" });
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();
    await expect(detailPage.pieceTemplateRow("Coin piece template")).toContainText("Flat Circle");

    form = await detailPage.openNewComponentForm("Piece");
    await form.fillCommon({ name: "Coin", quantity: "20", tags: "resource" });
    await form.selectPieceTemplate("Coin piece template");
    await expect(form.dialog.locator(".piece-preview").getByText("1 coin")).toBeVisible();
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();
    await expect(detailPage.componentRow("Coin")).toContainText("flat circle");

    form = await detailPage.openNewTileTemplateForm();
    await form.fillCommon({ name: "Forest hex template" });
    await form.fillTileTemplate({ shape: "Hex", faceText: "Forest" });
    await form.selectType("Piece template");
    await expect(form.dialog.getByRole("button", { name: "Select Circle shape" })).toBeVisible();
    await form.selectType("Tile template");
    await expect(form.dialog.locator(".tile-preview").getByText("Forest")).toBeVisible();
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();

    form = await detailPage.openNewComponentForm("Tile");
    await form.fillCommon({ name: "Forest hex", quantity: "19" });
    await form.selectTileTemplate("Forest hex template");
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();
    await expect(detailPage.componentRow("Forest hex")).toContainText("hex tile");
    await expect(detailPage.componentRow("Forest hex")).toContainText("Forest");

    form = await detailPage.openNewCollectionForm();
    await form.addCollectionItem("Strike", "12");
    await form.selectCollectionType("Bag");
    await form.addCollectionItem("Coin", "4");
    await form.selectCollectionType("Deck");
    await expect(form.dialog.getByLabel("Component")).toHaveValue(/Strike/);
    await expect(form.dialog.getByLabel("Quantity")).toHaveValue("12");
    await form.fillCommon({ name: "Player deck" });
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();
    await expect(detailPage.collectionRow("Player deck")).toContainText("Strike x12");
    await detailPage.filterCollectionsByType("Bags");
    await expect(page).toHaveURL(/panel=collections/);
    await expect(page).toHaveURL(/collectionType=bag/);
    await expect(detailPage.collectionRow("Player deck")).toHaveCount(0);
    await expect(page.getByText("No collections of this type yet")).toBeVisible();
    await detailPage.filterCollectionsByType("Decks");
    await expect(detailPage.collectionRow("Player deck")).toBeVisible();

    form = await detailPage.openNewComponentForm("Die");
    await expect(form.dialog.getByLabel("Face labels")).toHaveCount(0);
    await form.fillCommon({ name: "Weather die" });
    await form.fillDie({ sides: "8" });
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();
    await expect(detailPage.componentRow("Weather die")).toContainText("8 sides");

    await detailPage.duplicateComponent("Strike");

    await expect(detailPage.componentRow("Copy of Strike")).toBeVisible();
  });

  test("creates, persists, and duplicates advanced card layouts", async ({ page, projectsApi }) => {
    const project = await projectsApi.create({
      name: "Advanced Cards Project",
      players: "2",
      status: "draft"
    });
    const detailPage = new ProjectDetailPage(page);

    await detailPage.goto(project.id);
    await detailPage.openComponents();

    let form = await detailPage.openNewCardTemplateForm();
    await form.fillCommon({ name: "Spell card template" });
    await form.selectCardSize("Tarot (70 x 121 mm)");
    await form.fillCardPadding({ top: "6", right: "5", bottom: "6", left: "5" });
    await form.openCardSide("Back");
    await expect(form.dialog.getByLabel("Padding top")).toHaveValue("0 mm");
    await form.fillCardPadding({ top: "3", right: "3", bottom: "3", left: "3" });
    await form.openCardSide("Front");
    await form.selectZoneTemplate("Split");
    await form.selectPreviewZone("Left");
    await expect(form.selectedZoneOption("Left Text")).toHaveAttribute("aria-selected", "true");

    const initialZoneWidth = await form.zoneNumberValue("Zone width");
    const initialZoneHeight = await form.zoneNumberValue("Zone height");
    await form.resizePreviewZone("Left", 24, 24);
    await expect.poll(() => form.zoneNumberValue("Zone width")).toBeGreaterThan(initialZoneWidth);
    await expect.poll(() => form.zoneNumberValue("Zone height")).toBeGreaterThan(initialZoneHeight);

    const initialZoneX = await form.zoneNumberValue("Zone X");
    const initialZoneY = await form.zoneNumberValue("Zone Y");
    await form.dragPreviewZone("Left", 24, 24);
    await expect.poll(() => form.zoneNumberValue("Zone X")).toBeGreaterThan(initialZoneX);
    await expect.poll(() => form.zoneNumberValue("Zone Y")).toBeGreaterThan(initialZoneY);

    await form.addTextElement("Deal 3 damage");
    await form.selectElementContentSource("Per-component");
    await form.fillFieldKey("rules");

    await form.selectPreviewZone("Right");
    await form.addIconElement("Heart");
    await form.selectVisualHorizontalPosition("Right");
    await form.selectVisualVerticalPosition("Bottom");

    await form.selectPreviewZone("Top");
    await form.addImageElement({
      name: "pixel.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8Y9sAAAAASUVORK5CYII=",
        "base64"
      )
    });
    await form.selectVisualHorizontalPosition("Left");
    await form.selectVisualVerticalPosition("Top");

    await expect(form.dialog.getByText("pixel.png").last()).toBeVisible();
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();

    form = await detailPage.openNewComponentForm();
    await form.fillCommon({ name: "Firebolt", quantity: "8", tags: "spell, attack" });
    await form.selectCardTemplate("Spell card template");
    await form.fillPerCardValue("Rules", "Deal 3 damage");
    await expect(
      form.dialog.locator(".card-final-preview").getByText("Deal 3 damage")
    ).toBeVisible();
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();
    await expect(detailPage.componentRow("Firebolt")).toContainText("70 x 121 mm");
    await expect(detailPage.componentRow("Firebolt")).toContainText("Deal 3 damage");

    const editForm = await detailPage.openComponentEditor("Firebolt");
    await expect(editForm.dialog.getByLabel("Card template")).toHaveValue("Spell card template");
    await expect(editForm.dialog.getByRole("textbox", { name: "Rules" })).toHaveValue(
      "Deal 3 damage"
    );
    await editForm.dialog.getByRole("button", { name: "Cancel" }).click();

    const templateEditForm = await detailPage.openCardTemplateEditor("Spell card template");
    await expect(templateEditForm.dialog.getByLabel("Card size")).toHaveValue(
      "Tarot (70 x 121 mm)"
    );
    await expect(templateEditForm.dialog.getByLabel("Padding top")).toHaveValue("6 mm");
    await expect(templateEditForm.dialog.getByLabel("Padding right")).toHaveValue("5 mm");
    await expect(templateEditForm.dialog.getByLabel("Padding bottom")).toHaveValue("6 mm");
    await expect(templateEditForm.dialog.getByLabel("Padding left")).toHaveValue("5 mm");
    await templateEditForm.openCardSide("Back");
    await expect(templateEditForm.dialog.getByLabel("Padding top")).toHaveValue("3 mm");
    await expect(templateEditForm.dialog.getByLabel("Padding right")).toHaveValue("3 mm");
    await templateEditForm.openCardSide("Front");
    await templateEditForm.selectPreviewZone("Left");
    await expect(templateEditForm.dialog.getByLabel("Content type")).toHaveValue("Text");
    await expect(
      templateEditForm.dialog.getByRole("radio", { name: "Per-component" })
    ).toBeChecked();
    await expect(templateEditForm.dialog.getByLabel("Field key")).toHaveValue("rules");
    await expect(templateEditForm.dialog.getByLabel("Text content")).toHaveValue("Deal 3 damage");
    await templateEditForm.selectPreviewZone("Top");
    await expect(templateEditForm.dialog.getByLabel("Content type")).toHaveValue("Image");
    await expect(templateEditForm.dialog.getByLabel("Horizontal position")).toHaveValue("Left");
    await expect(templateEditForm.dialog.getByLabel("Vertical position")).toHaveValue("Top");
    await expect(templateEditForm.dialog.getByText("pixel.png").last()).toBeVisible();
    await templateEditForm.selectPreviewZone("Right");
    await expect(templateEditForm.dialog.getByLabel("Content type")).toHaveValue("Icon");
    await expect(templateEditForm.dialog.getByRole("combobox", { name: "Icon" })).toHaveValue(
      "Heart"
    );
    await expect(templateEditForm.dialog.getByLabel("Horizontal position")).toHaveValue("Right");
    await expect(templateEditForm.dialog.getByLabel("Vertical position")).toHaveValue("Bottom");
    await templateEditForm.dialog.getByRole("button", { name: "Cancel" }).click();

    await detailPage.duplicateComponent("Firebolt");

    await expect(detailPage.componentRow("Copy of Firebolt")).toContainText("70 x 121 mm");
    await expect(detailPage.componentRow("Copy of Firebolt")).toContainText("Deal 3 damage");

    detailPage.acceptNextDeleteCardTemplateConfirmation("Spell card template");
    await detailPage.deleteCardTemplate("Spell card template");
    await expect(page.getByText("Card template is used by a card")).toBeVisible();
    await expect(detailPage.cardTemplateRow("Spell card template")).toBeVisible();

    form = await detailPage.openNewCardTemplateForm();
    await form.fillCommon({ name: "Unused card template" });
    await form.saveCreate();
    await expect(form.dialog).toBeHidden();
    await expect(detailPage.cardTemplateRow("Unused card template")).toBeVisible();

    detailPage.acceptNextDeleteCardTemplateConfirmation("Unused card template");
    await detailPage.deleteCardTemplate("Unused card template");
    await expect(detailPage.cardTemplateRow("Unused card template")).toHaveCount(0);
  });

  test("creates flat and standee piece templates with visual faces and final previews", async ({
    page,
    projectsApi
  }) => {
    const project = await projectsApi.create({
      name: "Visual Pieces Project",
      players: "2",
      status: "draft"
    });
    const detailPage = new ProjectDetailPage(page);

    await detailPage.goto(project.id);
    await detailPage.openComponents();

    let form = await detailPage.openNewPieceTemplateForm();
    await form.fillCommon({ name: "Artifact token template" });
    await form.fillPieceTemplate({ faceText: "Artifact", shape: "Custom" });
    await expect(form.dialog.getByLabel("Custom shape editor")).toBeVisible();
    await form.selectElementContentSource("Per-component");
    await form.fillFieldKey("label");
    await form.dialog.getByLabel("Two-sided").check();
    await form.openCardSide("Back");
    await form.addImageElement({
      name: "piece.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8Y9sAAAAASUVORK5CYII=",
        "base64"
      )
    });
    await expect(form.dialog.getByText("piece.png").last()).toBeVisible();
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();
    await expect(detailPage.pieceTemplateRow("Artifact token template")).toContainText(
      "Flat Custom"
    );

    form = await detailPage.openNewPieceTemplateForm();
    await form.fillCommon({ name: "Hero standee template" });
    await form.fillPieceTemplate({ faceText: "Hero", formFactor: "Standee", shape: "Pawn" });
    await form.dialog.getByLabel("Two-sided").check();
    await form.openCardSide("Back");
    await form.addIconElement("Star");
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();
    await expect(detailPage.pieceTemplateRow("Hero standee template")).toContainText(
      "Standee Pawn"
    );

    form = await detailPage.openNewComponentForm("Piece");
    await form.fillCommon({ name: "Ancient key", quantity: "1" });
    await form.selectPieceTemplate("Artifact token template");
    await form.fillPerCardValue("Label", "Ancient Key");
    await expect(form.dialog.locator(".piece-preview").getByText("Ancient Key")).toBeVisible();
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();
    await expect(detailPage.componentRow("Ancient key")).toContainText("Ancient Key");
  });

  test("edits, deletes, and blocks deleting components used by collections", async ({
    page,
    projectsApi,
    request
  }) => {
    const project = await projectsApi.create({
      name: "Component Delete Project",
      players: "2",
      status: "testing"
    });
    const cardResponse = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "card", name: "Guard", frontText: "Block 1 damage" }
    });
    expect(cardResponse.status()).toBe(201);
    const card = (await cardResponse.json()) as { id: string };
    const collectionResponse = await request.post(`/api/projects/${project.id}/collections`, {
      data: {
        type: "deck",
        name: "Defense deck",
        items: [{ componentId: card.id, quantity: 3 }]
      }
    });
    expect(collectionResponse.status()).toBe(201);

    const detailPage = new ProjectDetailPage(page);

    await detailPage.goto(project.id);
    await detailPage.openComponents();

    const editForm = await detailPage.openComponentEditor("Guard");
    await editForm.fillCommon({ name: "Shield Guard" });
    await editForm.saveEdit();

    await expect(editForm.dialog).toBeHidden();
    await expect(detailPage.componentRow("Shield Guard")).toBeVisible();

    detailPage.acceptNextDeleteConfirmation("Shield Guard");
    await detailPage.deleteComponent("Shield Guard");

    await expect(page.getByText("Component is used by a collection")).toBeVisible();
    await expect(detailPage.componentRow("Shield Guard")).toBeVisible();

    detailPage.acceptNextDeleteCollectionConfirmation("Defense deck");
    await detailPage.deleteCollection("Defense deck");
    await expect(detailPage.collectionRow("Defense deck")).toHaveCount(0);

    detailPage.acceptNextDeleteConfirmation("Shield Guard");
    await detailPage.deleteComponent("Shield Guard");
    await expect(detailPage.componentRow("Shield Guard")).toHaveCount(0);
  });

  test("rejects invalid component API input", async ({ projectsApi, request }) => {
    const project = await projectsApi.create({
      name: "Invalid Component Project",
      players: "1",
      status: "draft"
    });

    const emptyName = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "card", name: " " }
    });
    expect(emptyName.status()).toBe(400);
    await expect(emptyName.json()).resolves.toEqual({ error: "Component name must not be empty" });

    const invalidType = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "board", name: "Board" }
    });
    expect(invalidType.status()).toBe(400);
    await expect(invalidType.json()).resolves.toEqual({ error: "Component type is invalid" });

    const invalidDie = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "die", name: "Flat die", sides: 1 }
    });
    expect(invalidDie.status()).toBe(400);
    await expect(invalidDie.json()).resolves.toEqual({ error: "Die sides must be at least 2" });

    for (const type of ["deck", "coin", "marker", "token"]) {
      const oldTypeResponse = await request.post(`/api/projects/${project.id}/components`, {
        data: { type, name: `${type} component` }
      });
      expect(oldTypeResponse.status()).toBe(400);
      await expect(oldTypeResponse.json()).resolves.toEqual({
        error: "Component type is invalid"
      });
    }

    const cardResponse = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "card", name: "Valid card", frontText: "Draw 1" }
    });
    expect(cardResponse.status()).toBe(201);
    const card = (await cardResponse.json()) as { id: string };

    const dieResponse = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "die", name: "Valid die", sides: 6 }
    });
    expect(dieResponse.status()).toBe(201);
    const die = (await dieResponse.json()) as { id: string };

    const missingCollectionType = await request.post(`/api/projects/${project.id}/collections`, {
      data: { name: "Untyped collection" }
    });
    expect(missingCollectionType.status()).toBe(400);
    await expect(missingCollectionType.json()).resolves.toEqual({
      error: "Collection type is required"
    });

    const invalidCollectionType = await request.post(`/api/projects/${project.id}/collections`, {
      data: { type: "pile", name: "Invalid collection type" }
    });
    expect(invalidCollectionType.status()).toBe(400);
    await expect(invalidCollectionType.json()).resolves.toEqual({
      error: "Collection type is invalid"
    });

    const invalidDeckItem = await request.post(`/api/projects/${project.id}/collections`, {
      data: {
        type: "deck",
        name: "Bad deck",
        items: [{ componentId: die.id, quantity: 1 }]
      }
    });
    expect(invalidDeckItem.status()).toBe(400);
    await expect(invalidDeckItem.json()).resolves.toEqual({
      error: "Deck collections can only include cards"
    });

    const invalidBagItem = await request.post(`/api/projects/${project.id}/collections`, {
      data: {
        type: "bag",
        name: "Bad bag",
        items: [{ componentId: card.id, quantity: 1 }]
      }
    });
    expect(invalidBagItem.status()).toBe(400);
    await expect(invalidBagItem.json()).resolves.toEqual({
      error: "Bag collections can only include tiles, pieces, or dice"
    });

    const validBagItem = await request.post(`/api/projects/${project.id}/collections`, {
      data: {
        type: "bag",
        name: "Dice bag",
        items: [{ componentId: die.id, quantity: 2 }]
      }
    });
    expect(validBagItem.status()).toBe(201);

    const duplicateCollectionItem = await request.post(`/api/projects/${project.id}/collections`, {
      data: {
        type: "deck",
        name: "Duplicate collection",
        items: [
          { componentId: card.id, quantity: 1 },
          { componentId: card.id, quantity: 2 }
        ]
      }
    });
    expect(duplicateCollectionItem.status()).toBe(400);
    await expect(duplicateCollectionItem.json()).resolves.toEqual({
      error: "Collection cannot include the same component twice"
    });

    const missingCollectionItem = await request.post(`/api/projects/${project.id}/collections`, {
      data: {
        type: "deck",
        name: "Missing item collection",
        items: [{ componentId: "missing-component", quantity: 1 }]
      }
    });
    expect(missingCollectionItem.status()).toBe(400);
    await expect(missingCollectionItem.json()).resolves.toEqual({
      error: "Collection items must reference components in the same project"
    });
  });

  test("creates piece templates for coin, marker, and solid pieces through the API", async ({
    projectsApi,
    request
  }) => {
    const project = await projectsApi.create({
      name: "Piece Template API Project",
      players: "2",
      status: "draft"
    });

    const cases = [
      { name: "Coin template", layout: validPieceLayout("flat", "circle", true, "Heads") },
      { name: "Marker template", layout: validPieceLayout("flat", "hex", false, "Start") },
      { name: "Standee template", layout: validPieceLayout("standee", "pawn", true, "Hero") },
      { name: "Solid template", layout: validPieceLayout("solid", "box", false, "Block") },
      { name: "Custom template", layout: validPieceLayout("flat", "custom", false, "Shard") },
      {
        name: "Icon template",
        layout: withPieceFrontZoneContent(
          validPieceLayout("flat", "circle", false, ""),
          validCardLayout("icon").sides.front.zones[0].content
        )
      },
      {
        name: "Image standee template",
        layout: withPieceFrontZoneContent(
          validPieceLayout("standee", "pawn", true, ""),
          validCardLayout("image").sides.front.zones[0].content
        )
      }
    ];

    for (const item of cases) {
      const templateResponse = await request.post(`/api/projects/${project.id}/piece-templates`, {
        data: item
      });
      expect(templateResponse.status()).toBe(201);
      const template = (await templateResponse.json()) as { id: string; layout: unknown };

      const pieceResponse = await request.post(`/api/projects/${project.id}/components`, {
        data: {
          type: "piece",
          name: item.name.replace("template", "piece"),
          templateId: template.id
        }
      });
      expect(pieceResponse.status()).toBe(201);
      await expect(pieceResponse.json()).resolves.toMatchObject({
        type: "piece",
        templateId: template.id
      });
    }

    const colorTemplateResponse = await request.post(
      `/api/projects/${project.id}/piece-templates`,
      {
        data: {
          name: "Meeple color template",
          layout: validPieceLayout("solid", "meeple", false, "Meeple")
        }
      }
    );
    expect(colorTemplateResponse.status()).toBe(201);
    const colorTemplate = (await colorTemplateResponse.json()) as { id: string };
    const coloredPieceResponse = await request.post(`/api/projects/${project.id}/components`, {
      data: {
        type: "piece",
        name: "Green meeples",
        quantity: 10,
        templateId: colorTemplate.id,
        appearance: {
          fillColor: "#16a34a",
          strokeColor: "#14532d"
        }
      }
    });
    expect(coloredPieceResponse.status()).toBe(201);
    await expect(coloredPieceResponse.json()).resolves.toMatchObject({
      appearance: {
        fillColor: "#16a34a",
        strokeColor: "#14532d"
      },
      layout: {
        appearance: {
          fillColor: "#16a34a",
          strokeColor: "#14532d"
        }
      }
    });

    const referencedPieceResponse = await request.post(`/api/projects/${project.id}/components`, {
      data: {
        type: "piece",
        name: "Player one meeple",
        quantity: 10,
        templateId: colorTemplate.id,
        appearance: {
          fillColor: { source: "project", key: "player_1_color" },
          strokeColor: "#111827"
        }
      }
    });
    expect(referencedPieceResponse.status()).toBe(201);
    await expect(referencedPieceResponse.json()).resolves.toMatchObject({
      appearance: {
        fillColor: { source: "project", key: "player_1_color" },
        strokeColor: "#111827"
      },
      layout: {
        appearance: {
          fillColor: "#dc2626",
          strokeColor: "#111827"
        }
      }
    });

    const updateProjectColor = await request.patch(`/api/projects/${project.id}`, {
      data: {
        parameters: project.parameters.map((parameter) =>
          parameter.key === "player_1_color" ? { ...parameter, value: "#7c3aed" } : parameter
        )
      }
    });
    expect(updateProjectColor.status()).toBe(200);

    const componentsResponse = await request.get(`/api/projects/${project.id}/components`);
    expect(componentsResponse.status()).toBe(200);
    const components = (await componentsResponse.json()) as Array<{
      name: string;
      appearance?: unknown;
      layout?: { appearance?: { fillColor?: string } };
    }>;
    expect(components.find((component) => component.name === "Player one meeple")).toMatchObject({
      appearance: {
        fillColor: { source: "project", key: "player_1_color" }
      },
      layout: {
        appearance: {
          fillColor: "#7c3aed"
        }
      }
    });

    for (const shape of ["disc", "cube", "train", "road"]) {
      const response = await request.post(`/api/projects/${project.id}/piece-templates`, {
        data: {
          name: `Invalid ${shape}`,
          layout: {
            ...validPieceLayout("flat", "circle", false, "Invalid"),
            shape
          }
        }
      });

      expect(response.status()).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Piece shape is invalid" });
    }

    const invalidCustomShape = await request.post(`/api/projects/${project.id}/piece-templates`, {
      data: {
        name: "Invalid custom shape",
        layout: {
          ...validPieceLayout("flat", "custom", false, "Bad"),
          customShape: {
            points: [
              { x: 50, y: 10 },
              { x: 90, y: 90 }
            ]
          }
        }
      }
    });
    expect(invalidCustomShape.status()).toBe(400);
    await expect(invalidCustomShape.json()).resolves.toEqual({
      error: "Piece custom shape must include at least 3 points"
    });
  });

  test("normalizes legacy card API input and validates card layouts", async ({
    projectsApi,
    request
  }) => {
    const project = await projectsApi.create({
      name: "Card Layout API Project",
      players: "1",
      status: "draft"
    });

    const legacyCard = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "card", name: "Legacy Strike", frontText: "Deal 1 damage" }
    });
    expect(legacyCard.status()).toBe(201);
    const legacyCardBody = await legacyCard.json();
    expect(legacyCardBody).toMatchObject({
      type: "card",
      frontText: "Deal 1 damage",
      layout: {
        version: 1,
        size: { preset: "poker", widthMm: 63, heightMm: 88 }
      }
    });
    expect(legacyCardBody.layout.sides.front.paddingMm).toEqual({
      topMm: 4,
      rightMm: 4,
      bottomMm: 4,
      leftMm: 4
    });
    expect(legacyCardBody.layout.sides.back.paddingMm).toEqual({
      topMm: 0,
      rightMm: 0,
      bottomMm: 0,
      leftMm: 0
    });
    expect(legacyCardBody.layout.sides.front.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Body",
          content: expect.objectContaining({ type: "text", text: "Deal 1 damage" })
        })
      ])
    );
    expect(legacyCardBody.layout.sides.back.zones).toEqual([
      expect.objectContaining({
        name: "Art",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        content: expect.objectContaining({ type: "visual", visualType: "image" })
      })
    ]);

    const deleteUsedTemplate = await request.delete(
      `/api/projects/${project.id}/card-templates/${legacyCardBody.templateId}`
    );
    expect(deleteUsedTemplate.status()).toBe(400);
    await expect(deleteUsedTemplate.json()).resolves.toEqual({
      error: "Card template is used by a card"
    });

    const unusedTemplate = await request.post(`/api/projects/${project.id}/card-templates`, {
      data: { name: "Unused template", layout: validCardLayout() }
    });
    expect(unusedTemplate.status()).toBe(201);
    const unusedTemplateBody = (await unusedTemplate.json()) as { id: string };
    const deleteUnusedTemplate = await request.delete(
      `/api/projects/${project.id}/card-templates/${unusedTemplateBody.id}`
    );
    expect(deleteUnusedTemplate.status()).toBe(204);

    const cases = [
      {
        name: "bad field key",
        layout: withFrontZoneContent(validCardLayout(), {
          source: { mode: "field", fieldKey: "bad key" }
        }),
        error: "Card content field key must contain only letters, numbers, and underscores"
      },
      {
        name: "bad custom size",
        layout: { ...validCardLayout(), size: { preset: "custom", widthMm: 10, heightMm: 88 } },
        error: "Card width must be at least 20"
      },
      {
        name: "bad horizontal padding",
        layout: {
          ...validCardLayout(),
          sides: {
            ...validCardLayout().sides,
            front: {
              ...validCardLayout().sides.front,
              paddingMm: { topMm: 4, rightMm: 40, bottomMm: 4, leftMm: 40 }
            }
          }
        },
        error: "Card horizontal padding must leave room for zones"
      },
      {
        name: "bad icon id",
        layout: withFrontZoneContent(validCardLayout("icon"), { iconId: "dragon" }),
        error: "Card icon id is invalid"
      },
      {
        name: "bad visual horizontal position",
        layout: withFrontZoneContent(validCardLayout("icon"), { horizontalAlign: "middle" }),
        error: "Card visual horizontal position is invalid"
      },
      {
        name: "bad image data url",
        layout: withFrontZoneContent(validCardLayout("image"), {
          dataUrl: "data:text/plain;base64,SGk="
        }),
        error: "Card image data URL must be a base64 image data URL"
      },
      {
        name: "oversized image",
        layout: withFrontZoneContent(validCardLayout("image"), {
          dataUrl: `data:image/png;base64,${Buffer.alloc(1024 * 1024 + 1).toString("base64")}`
        }),
        error: "Card image data URL must be 1 MB or smaller"
      }
    ];

    for (const item of cases) {
      const response = await request.post(`/api/projects/${project.id}/components`, {
        data: {
          type: "card",
          name: item.name,
          layout: item.layout
        }
      });

      expect(response.status()).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: item.error });
    }
  });

});

function validCardLayout(elementType: "icon" | "image" | "text" = "text") {
  const content =
    elementType === "icon"
      ? {
          type: "visual",
          source: { mode: "static" },
          visualType: "icon",
          dataUrl: "",
          fileName: "",
          fit: "contain",
          iconId: "star",
          size: 28,
          color: "#0f766e",
          horizontalAlign: "center",
          verticalAlign: "center"
        }
      : elementType === "image"
        ? {
            type: "visual",
            source: { mode: "static" },
            visualType: "image",
            dataUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8Y9sAAAAASUVORK5CYII=",
            fileName: "pixel.png",
            fit: "contain",
            iconId: "star",
            size: 28,
            color: "#0f766e",
            horizontalAlign: "center",
            verticalAlign: "center"
          }
        : {
            type: "text",
            source: { mode: "static" },
            text: "Deal 2 damage",
            fontSize: 14,
            bold: false,
            align: "center",
            color: "#1f2937"
          };

  return {
    version: 1,
    size: { preset: "poker", widthMm: 63, heightMm: 88 },
    sides: {
      front: {
        paddingMm: { topMm: 4, rightMm: 4, bottomMm: 4, leftMm: 4 },
        zones: [
          {
            id: "front-body",
            name: "Body",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            content
          }
        ]
      },
      back: {
        paddingMm: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 },
        zones: [
          {
            id: "back-art",
            name: "Art",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            content: {
              type: "visual",
              source: { mode: "static" },
              visualType: "image",
              dataUrl: "",
              fileName: "",
              fit: "contain",
              iconId: "sword",
              size: 28,
              color: "#0f766e",
              horizontalAlign: "center",
              verticalAlign: "center"
            }
          }
        ]
      }
    }
  };
}

function validPieceLayout(
  formFactor: "flat" | "solid" | "standee",
  shape: "circle" | "box" | "custom" | "hex" | "meeple" | "pawn",
  twoSided: boolean,
  text: string
) {
  const face = (id: string, name: string, faceText: string) => ({
    id,
    name,
    zones: faceText
      ? [
          {
            id: `${id}-label`,
            name: "Label",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            content: {
              type: "text",
              source: { mode: "static" },
              text: faceText,
              fontSize: 14,
              bold: false,
              align: "center",
              color: "#1f2937"
            }
          }
        ]
      : []
  });

  return {
    version: 1,
    formFactor,
    shape,
    sizeMm: {
      widthMm: 20,
      heightMm: 20,
      depthMm: formFactor === "solid" ? 10 : 2
    },
    appearance: {
      fillColor: "#f8fafc",
      strokeColor: "#0f766e"
    },
    customShape:
      shape === "custom"
        ? {
            points: [
              { x: 50, y: 6 },
              { x: 90, y: 35 },
              { x: 74, y: 92 },
              { x: 26, y: 92 },
              { x: 10, y: 35 }
            ]
          }
        : undefined,
    faces: twoSided
      ? [face("front", "Front", text), face("back", "Back", "Tails")]
      : [face("front", "Front", text)]
  };
}

function withFrontZoneContent(
  layout: ReturnType<typeof validCardLayout>,
  patch: Record<string, unknown>
) {
  return {
    ...layout,
    sides: {
      ...layout.sides,
      front: {
        ...layout.sides.front,
        zones: [
          {
            ...layout.sides.front.zones[0],
            content: {
              ...layout.sides.front.zones[0].content,
              ...patch
            }
          }
        ]
      }
    }
  };
}

function withPieceFrontZoneContent(
  layout: ReturnType<typeof validPieceLayout>,
  content: Record<string, unknown>
) {
  return {
    ...layout,
    faces: layout.faces.map((face, faceIndex) =>
      faceIndex === 0
        ? {
            ...face,
            zones: face.zones.map((zone, zoneIndex) =>
              zoneIndex === 0 ? { ...zone, content } : zone
            )
          }
        : face
    )
  };
}
