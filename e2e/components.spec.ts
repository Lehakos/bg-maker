import { expect, test } from "./fixtures/projects-test";
import { ProjectDetailPage } from "./page-objects/project-detail-page";

test.describe("project components", () => {
  test("creates cards, decks, dice, and duplicates components", async ({ page, projectsApi }) => {
    const project = await projectsApi.create({
      name: "Components UI Project",
      players: "2",
      status: "draft"
    });
    const detailPage = new ProjectDetailPage(page);

    await detailPage.goto(project.id);
    await detailPage.openComponents();
    await expect(detailPage.componentsHeading).toBeVisible();

    let form = await detailPage.openNewCardTemplateForm();
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

    form = await detailPage.openNewComponentForm();
    await form.selectType("Deck");
    await form.fillCommon({ name: "Player deck" });
    await form.addDeckCard("12");
    await form.saveCreate();

    await expect(form.dialog).toBeHidden();
    await expect(detailPage.componentRow("Player deck")).toContainText("Strike x12");

    form = await detailPage.openNewComponentForm();
    await form.selectType("Die");
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
    await form.selectZoneTemplate("Split");
    await form.selectPreviewZone("Left");
    await expect(form.selectedZoneInput()).toHaveValue("Left (Text)");

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
    await form.selectElementContentSource("Per card field");
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
    await templateEditForm.selectPreviewZone("Left");
    await expect(templateEditForm.dialog.getByLabel("Content type")).toHaveValue("Text");
    await expect(templateEditForm.dialog.getByLabel("Content source")).toHaveValue(
      "Per card field"
    );
    await expect(templateEditForm.dialog.getByLabel("Field key")).toHaveValue("rules");
    await expect(templateEditForm.dialog.getByLabel("Text content")).toHaveValue("Deal 3 damage");
    await templateEditForm.selectPreviewZone("Top");
    await expect(templateEditForm.dialog.getByLabel("Content type")).toHaveValue("Visual");
    await expect(templateEditForm.dialog.getByLabel("Visual type")).toHaveValue("Image");
    await expect(templateEditForm.dialog.getByLabel("Horizontal position")).toHaveValue("Left");
    await expect(templateEditForm.dialog.getByLabel("Vertical position")).toHaveValue("Top");
    await expect(templateEditForm.dialog.getByText("pixel.png").last()).toBeVisible();
    await templateEditForm.selectPreviewZone("Right");
    await expect(templateEditForm.dialog.getByLabel("Visual type")).toHaveValue("Icon");
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

  test("edits, deletes, and blocks deleting cards used by decks", async ({
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
    const deckResponse = await request.post(`/api/projects/${project.id}/components`, {
      data: {
        type: "deck",
        name: "Defense deck",
        cards: [{ cardId: card.id, quantity: 3 }]
      }
    });
    expect(deckResponse.status()).toBe(201);

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

    await expect(page.getByText("Card is used by a deck")).toBeVisible();
    await expect(detailPage.componentRow("Shield Guard")).toBeVisible();

    detailPage.acceptNextDeleteConfirmation("Defense deck");
    await detailPage.deleteComponent("Defense deck");
    await expect(detailPage.componentRow("Defense deck")).toHaveCount(0);

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

    const tokenResponse = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "token", name: "Coin token" }
    });
    expect(tokenResponse.status()).toBe(201);
    const token = (await tokenResponse.json()) as { id: string };
    const nonCardDeck = await request.post(`/api/projects/${project.id}/components`, {
      data: {
        type: "deck",
        name: "Bad deck",
        cards: [{ cardId: token.id, quantity: 1 }]
      }
    });
    expect(nonCardDeck.status()).toBe(400);
    await expect(nonCardDeck.json()).resolves.toEqual({
      error: "Deck cards must reference cards in the same project"
    });

    const missingCardDeck = await request.post(`/api/projects/${project.id}/components`, {
      data: {
        type: "deck",
        name: "Missing card deck",
        cards: [{ cardId: "missing-card", quantity: 1 }]
      }
    });
    expect(missingCardDeck.status()).toBe(400);
    await expect(missingCardDeck.json()).resolves.toEqual({
      error: "Deck cards must reference cards in the same project"
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
    expect(legacyCardBody.layout.sides.front.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Body",
          content: expect.objectContaining({ type: "text", text: "Deal 1 damage" })
        })
      ])
    );

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
        zones: [
          {
            id: "front-body",
            name: "Body",
            x: 7,
            y: 7,
            width: 86,
            height: 86,
            content
          }
        ]
      },
      back: {
        zones: [
          {
            id: "back-body",
            name: "Body",
            x: 7,
            y: 7,
            width: 86,
            height: 86,
            content: {
              type: "text",
              source: { mode: "static" },
              text: "",
              fontSize: 14,
              bold: false,
              align: "center",
              color: "#1f2937"
            }
          }
        ]
      }
    }
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
