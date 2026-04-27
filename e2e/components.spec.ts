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

    let form = await detailPage.openNewComponentForm();
    await form.fillCommon({ name: "Strike", quantity: "12", tags: "starter, attack" });
    await form.fillCard({ frontText: "Deal 1 damage", backText: "Action" });
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
});
