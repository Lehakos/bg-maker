import { expect, test } from "./fixtures/projects-test";
import { ProjectDetailPage } from "./page-objects/project-detail-page";
import {
  backgroundImage,
  dragLocator,
  dragLocatorTo,
  horizontalDistance,
  locatorHeight,
  locatorWidth,
  numberInputValue,
  onePixelPngBuffer
} from "./support/ui-helpers";

test.describe("table layout", () => {
  test("creates, validates, and protects table setup API data", async ({
    projectsApi,
    request
  }) => {
    const project = await projectsApi.create({
      name: "Table Setup API Project",
      players: "2",
      status: "draft"
    });
    const otherProject = await projectsApi.create({
      name: "Other Table Setup Project",
      players: "2",
      status: "draft"
    });

    const cardResponse = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "card", name: "Scout", frontText: "Move 1" }
    });
    expect(cardResponse.status()).toBe(201);
    const card = (await cardResponse.json()) as { id: string };

    const directTokenResponse = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "piece", name: "First player marker", labelText: "1st" }
    });
    expect(directTokenResponse.status()).toBe(201);
    const directToken = (await directTokenResponse.json()) as { id: string };

    const foreignCardResponse = await request.post(`/api/projects/${otherProject.id}/components`, {
      data: { type: "card", name: "Foreign scout", frontText: "Nope" }
    });
    expect(foreignCardResponse.status()).toBe(201);
    const foreignCard = (await foreignCardResponse.json()) as { id: string };

    const collectionResponse = await request.post(`/api/projects/${project.id}/collections`, {
      data: {
        type: "deck",
        name: "Scout deck",
        items: [{ componentId: card.id, quantity: 3 }]
      }
    });
    expect(collectionResponse.status()).toBe(201);
    const collection = (await collectionResponse.json()) as { id: string };

    const componentQuantityResponse = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "card", name: "Legacy quantity", quantity: 2, frontText: "Nope" }
    });
    expect(componentQuantityResponse.status()).toBe(400);
    await expect(componentQuantityResponse.json()).resolves.toEqual({
      error: "Component quantity is no longer supported"
    });

    const foreignPlacement = await request.put(`/api/projects/${project.id}/table-setup`, {
      data: {
        placements: [
          {
            id: "foreign-card",
            source: { kind: "component", componentId: foreignCard.id },
            x: 40,
            y: 40,
            rotationDeg: 0,
            face: "front"
          }
        ]
      }
    });
    expect(foreignPlacement.status()).toBe(400);
    await expect(foreignPlacement.json()).resolves.toEqual({
      error: "Table source must reference a component in the same project"
    });

    const setupResponse = await request.put(`/api/projects/${project.id}/table-setup`, {
      data: {
        width: 1400,
        height: 900,
        zones: [
          validTableZone({
            background: { type: "color", color: "#dbeafe" },
            capacity: 5,
            childrenType: "card",
            face: "up",
            gap: 8,
            layout: "row",
            padding: 8,
            source: { kind: "collection", collectionId: collection.id }
          })
        ],
        placements: [
          {
            id: "scout-deck",
            source: { kind: "collection", collectionId: collection.id },
            x: 20,
            y: 40,
            rotationDeg: 15,
            face: "front"
          },
          {
            id: "first-player-marker",
            source: { kind: "component", componentId: directToken.id },
            x: 680,
            y: 420,
            rotationDeg: 0,
            face: "front"
          }
        ]
      }
    });
    expect(setupResponse.status()).toBe(200);
    await expect(setupResponse.json()).resolves.toMatchObject({
      height: 900,
      placements: [
        { id: "scout-deck", source: { kind: "collection", collectionId: collection.id } },
        { id: "first-player-marker", source: { kind: "component", componentId: directToken.id } }
      ],
      width: 1400,
      zones: [
        {
          background: { color: "#dbeafe", type: "color" },
          childrenType: "card",
          id: "market",
          layout: "row",
          name: "Market",
          overflow: "hidden",
          source: { kind: "collection", collectionId: collection.id }
        }
      ]
    });

    const invalidZoneCases = [
      {
        body: { zones: [validTableZone({ layout: "circle" })] },
        error: "Table zone layout is invalid"
      },
      {
        body: { zones: [validTableZone({ sizePolicy: { mode: "fluid" } })] },
        error: 'Table zone field "sizePolicy" is no longer supported'
      },
      {
        body: { zones: [validTableZone({ x: 1200, width: 420 })] },
        error: "Table zone must stay within parent bounds"
      },
      {
        body: {
          zones: [
            validTableZone({ id: "duplicate" }),
            validTableZone({ id: "duplicate", name: "Duplicate" })
          ]
        },
        error: "Table zone ids must be unique"
      },
      {
        body: {
          placements: [
            {
              id: "old-placement",
              componentId: directToken.id,
              x: 40,
              y: 40,
              rotationDeg: 0,
              face: "front"
            }
          ]
        },
        error: 'Table placement field "componentId" is no longer supported'
      },
      {
        body: {
          zones: [
            validTableZone({
              childrenType: "card",
              source: { kind: "component", componentId: directToken.id }
            })
          ]
        },
        error: "Table source component type does not match zone child type"
      }
    ];

    for (const item of invalidZoneCases) {
      const response = await request.put(`/api/projects/${project.id}/table-setup`, {
        data: item.body
      });

      expect(response.status()).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: item.error });
    }

    const persistedSetup = await request.get(`/api/projects/${project.id}/table-setup`);
    expect(persistedSetup.status()).toBe(200);
    await expect(persistedSetup.json()).resolves.toMatchObject({
      placements: [
        { id: "scout-deck", source: { kind: "collection", collectionId: collection.id } },
        { id: "first-player-marker", source: { kind: "component", componentId: directToken.id } }
      ]
    });

    const deleteUsedComponent = await request.delete(
      `/api/projects/${project.id}/components/${directToken.id}`
    );
    expect(deleteUsedComponent.status()).toBe(400);
    await expect(deleteUsedComponent.json()).resolves.toEqual({
      error: "Component is used by table setup"
    });

    const deleteUsedCollection = await request.delete(
      `/api/projects/${project.id}/collections/${collection.id}`
    );
    expect(deleteUsedCollection.status()).toBe(400);
    await expect(deleteUsedCollection.json()).resolves.toEqual({
      error: "Collection is used by table setup"
    });
  });

  test("moves an existing table placement into a compatible source zone", async ({
    page,
    projectsApi,
    request
  }) => {
    const project = await projectsApi.create({
      name: "Placement Drop Zone UI Project",
      players: "2",
      status: "draft"
    });
    const detailPage = new ProjectDetailPage(page);

    const cardResponse = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "card", name: "Scout", frontText: "Move 1" }
    });
    expect(cardResponse.status()).toBe(201);
    const card = (await cardResponse.json()) as { id: string };

    const setupResponse = await request.put(`/api/projects/${project.id}/table-setup`, {
      data: {
        width: 1600,
        height: 1000,
        placements: [],
        zones: [
          validTableZone({
            id: "card-intake",
            name: "Card intake",
            width: 360,
            height: 220,
            x: 560,
            y: 240
          })
        ]
      }
    });
    expect(setupResponse.status()).toBe(200);

    await detailPage.goto(project.id);
    await detailPage.openLayout();

    await page.getByRole("button", { name: "Library item Scout" }).click();
    const placement = page.getByLabel("Placement Scout", { exact: true });
    const zone = page.getByLabel("Table zone Card intake", { exact: true });

    await expect(placement).toBeVisible();
    await expect(zone).toBeVisible();

    await dragLocatorTo(page, placement, zone, {
      beforeDrop: async () => {
        await expect(zone).toHaveAttribute("data-drop-eligible", "true");
        await expect(zone).toHaveAttribute("data-drop-target", "true");
      },
      targetPosition: { x: 36, y: 36 }
    });

    await expect(placement).toHaveCount(0);
    await expect(zone).not.toHaveAttribute("data-drop-target", "true");
    await expect(page.getByRole("combobox", { name: "Source" })).toHaveValue(/Scout/);

    await page.getByRole("button", { name: "Undo table layout change" }).click();
    await expect(placement).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Source" })).toHaveValue("No source");

    await page.getByRole("button", { name: "Redo table layout change" }).click();
    await expect(placement).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Source" })).toHaveValue(/Scout/);

    await page.getByRole("button", { name: "Save layout" }).click();
    await expect(page.getByRole("button", { name: "Save layout" })).toBeDisabled();

    const savedSetupResponse = await request.get(`/api/projects/${project.id}/table-setup`);
    expect(savedSetupResponse.status()).toBe(200);
    await expect(savedSetupResponse.json()).resolves.toMatchObject({
      placements: [],
      zones: [
        {
          id: "card-intake",
          source: { kind: "component", componentId: card.id }
        }
      ]
    });
  });

  test("creates, moves, edits, saves, and reloads a table layout", async ({
    page,
    projectsApi,
    request
  }) => {
    const project = await projectsApi.create({
      name: "Table Layout UI Project",
      players: "2",
      status: "draft"
    });
    const detailPage = new ProjectDetailPage(page);

    const cardResponse = await request.post(`/api/projects/${project.id}/components`, {
      data: { type: "card", name: "Scout", frontText: "Move 1" }
    });
    expect(cardResponse.status()).toBe(201);

    await detailPage.goto(project.id);
    await detailPage.openLayout();
    await expect(page.getByRole("heading", { exact: true, name: "Table layout" })).toBeVisible();

    const viewport = page.getByLabel("Table setup viewport");
    const surface = page.getByLabel("Table setup surface");
    const zoomValue = page.getByLabel("Table zoom", { exact: true });
    await expect(zoomValue).toHaveText("100%");
    const initialSurfaceBox = await surface.boundingBox();
    if (!initialSurfaceBox) {
      throw new Error("Could not locate table setup surface");
    }

    for (let step = 0; step < 6; step += 1) {
      await page.getByRole("button", { name: "Zoom in table" }).click();
    }
    await expect(zoomValue).toHaveText("160%");
    await expect
      .poll(async () => {
        const box = await surface.boundingBox();
        return box?.width ?? 0;
      })
      .toBeGreaterThan(initialSurfaceBox.width);

    await page.getByRole("button", { name: "Reset table zoom" }).click();
    await expect(zoomValue).toHaveText("100%");
    await viewport.evaluate((element) => {
      element.scrollLeft = 0;
      element.scrollTop = 0;
    });

    const scoutLibraryItem = page.getByRole("button", { name: "Library item Scout" });
    await expect.poll(() => locatorHeight(scoutLibraryItem)).toBeLessThanOrEqual(82);
    await scoutLibraryItem.click();
    await expect(page.getByText("1 placements, 0 zones")).toBeVisible();
    const placement = page.getByLabel("Placement Scout", { exact: true });
    await expect(placement).toBeVisible();
    await placement.click();
    await expect(page.getByRole("heading", { exact: true, name: "Placement" })).toBeVisible();

    const placementXInput = page.getByLabel("X", { exact: true });
    const initialX = await numberInputValue(placementXInput);
    await dragLocator(page, placement, 120, 60);
    await expect.poll(() => numberInputValue(placementXInput)).toBeGreaterThan(initialX);

    await page.getByRole("button", { name: "Add zone" }).click();
    await page.getByRole("menuitem", { name: "Card" }).click();
    await expect(page.getByText("1 placements, 1 zones")).toBeVisible();
    await page.getByLabel("Zone name").fill("Market");

    const zone = page.getByLabel("Table zone Market");
    await zone.click({ position: { x: 8, y: 8 } });
    await scoutLibraryItem.dragTo(zone, {
      targetPosition: { x: 24, y: 24 }
    });
    await expect(page.getByRole("combobox", { name: "Source" })).toHaveValue(/Scout/);
    const zoneXInput = page.getByLabel("Zone X", { exact: true });
    const initialZoneX = await numberInputValue(zoneXInput);
    await zoneXInput.fill(String(initialZoneX + 90));
    await placement.click();
    await expect.poll(() => numberInputValue(placementXInput)).toBeGreaterThan(initialX);

    await zone.click({ position: { x: 8, y: 8 } });
    await page.getByRole("combobox", { name: "Layout" }).click();
    await page.getByRole("option", { exact: true, name: "Row" }).click();
    await page.getByText("Auto", { exact: true }).click();
    await expect(page.getByLabel("Zone width", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Zone height", { exact: true })).toHaveCount(0);
    await page.getByLabel("Limit capacity").check();
    await page.getByLabel("Capacity", { exact: true }).fill("5");
    await page.getByLabel("Autofill from source").uncheck();
    await page.getByRole("combobox", { name: "Background" }).click();
    await page.getByRole("option", { exact: true, name: "Image" }).click();
    await page.getByRole("button", { name: "Save layout" }).click();
    await expect(
      page.getByText('Choose a background image for "Market" before saving')
    ).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
      buffer: onePixelPngBuffer(),
      mimeType: "image/png",
      name: "zone-bg.png"
    });
    await expect(
      page.getByText('Choose a background image for "Market" before saving')
    ).toHaveCount(0);
    await page.getByRole("combobox", { name: "Image fit" }).click();
    await page.getByRole("option", { exact: true, name: "Contain" }).click();
    await expect.poll(() => backgroundImage(zone)).toContain("data:image/png");

    await page.getByRole("button", { name: "Save layout" }).click();
    await expect(page.getByRole("button", { name: "Save layout" })).toBeDisabled();
    const savedSetupResponse = await request.get(`/api/projects/${project.id}/table-setup`);
    expect(savedSetupResponse.status()).toBe(200);
    await expect(savedSetupResponse.json()).resolves.toMatchObject({
      zones: [
        {
          autofill: false,
          capacity: 5,
          background: { fileName: "zone-bg.png", fit: "contain", type: "image" },
          height: 104,
          size: "auto",
          width: 363
        }
      ]
    });

    await page.reload();
    await detailPage.openLayout();

    await expect(page.getByLabel("Placement Scout", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Table zone Market")).toBeVisible();
    await page.getByLabel("Table zone Market").dispatchEvent("click");
    await expect(page.getByRole("combobox", { name: "Layout" })).toHaveValue("Row");
    await expect(page.getByText("Auto", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Source" })).toHaveValue(/Scout/);
    await expect(page.getByLabel("Limit capacity")).toBeChecked();
    await expect(page.getByLabel("Autofill from source")).not.toBeChecked();
    await expect(page.getByLabel("Zone width", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Zone height", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Background" })).toHaveValue("Image");
    await expect(page.getByRole("combobox", { name: "Image fit" })).toHaveValue("Contain");
    await expect
      .poll(() => backgroundImage(page.getByLabel("Table zone Market")))
      .toContain("data:image/png");
  });

  test("lays out child zones from the parent container layout", async ({
    page,
    projectsApi,
    request
  }) => {
    const project = await projectsApi.create({
      name: "Container Layout UI Project",
      players: "2",
      status: "draft"
    });

    const setupResponse = await request.put(`/api/projects/${project.id}/table-setup`, {
      data: {
        width: 1200,
        height: 800,
        placements: [],
        zones: [
          validContainerZone({
            children: [
              validTableZone({
                id: "left-child",
                name: "Left child",
                x: 20,
                y: 120,
                width: 120,
                height: 96
              }),
              validTableZone({
                childrenType: "piece",
                face: "up",
                id: "right-child",
                name: "Right child",
                x: 460,
                y: 80,
                width: 100,
                height: 112
              })
            ],
            id: "parent-container",
            name: "Parent container",
            width: 640,
            height: 280,
            x: 120,
            y: 120
          })
        ]
      }
    });
    expect(setupResponse.status()).toBe(200);

    const detailPage = new ProjectDetailPage(page);
    await detailPage.goto(project.id);
    await detailPage.openLayout();

    const container = page.getByLabel("Table zone Parent container", { exact: true });
    const leftChild = page.getByLabel("Table zone Left child", { exact: true });
    const rightChild = page.getByLabel("Table zone Right child", { exact: true });

    await expect(container).toBeVisible();
    await expect(leftChild).toBeVisible();
    await expect(rightChild).toBeVisible();

    const freeDistance = await horizontalDistance(leftChild, rightChild);
    expect(freeDistance).toBeGreaterThan(160);

    await container.click({ position: { x: 8, y: 8 } });
    await expect(page.getByLabel("Limit capacity")).toHaveCount(0);
    await page.getByRole("combobox", { name: "Layout" }).click();
    await page.getByRole("option", { exact: true, name: "Row" }).click();

    await expect
      .poll(() => horizontalDistance(leftChild, rightChild))
      .toBeLessThan(freeDistance * 0.6);
    expect(await horizontalDistance(leftChild, rightChild)).toBeGreaterThan(
      await locatorWidth(leftChild)
    );

    await page.getByText("Auto", { exact: true }).click();
    await expect(page.getByLabel("Zone width", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Zone height", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Save layout" }).click();
    await expect(page.getByRole("button", { name: "Save layout" })).toBeDisabled();

    const savedSetupResponse = await request.get(`/api/projects/${project.id}/table-setup`);
    expect(savedSetupResponse.status()).toBe(200);
    await expect(savedSetupResponse.json()).resolves.toMatchObject({
      zones: [
        {
          height: 128,
          layout: "row",
          size: "auto",
          width: 244
        }
      ]
    });

    await leftChild.click({ position: { x: 12, y: 12 } });
    await expect(page.getByLabel("Zone X", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Zone Y", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Zone width", { exact: true })).toBeVisible();
  });
});

function validContainerZone(overrides: Record<string, unknown> = {}) {
  return {
    id: "container",
    name: "Container",
    description: "",
    x: 100,
    y: 80,
    width: 420,
    height: 180,
    padding: 8,
    size: "fixed",
    overflow: "hidden",
    capacity: null,
    layout: "free",
    visibility: "all",
    background: { type: "none" },
    border: { width: 1, color: "#0e7490" },
    childrenType: "zone",
    children: [],
    ...overrides
  };
}

function validTableZone(overrides: Record<string, unknown> = {}) {
  return {
    id: "market",
    name: "Market",
    description: "",
    x: 100,
    y: 80,
    width: 420,
    height: 180,
    padding: 8,
    size: "fixed",
    overflow: "hidden",
    capacity: null,
    layout: "free",
    visibility: "all",
    background: { type: "none" },
    border: { width: 1, color: "#0e7490" },
    autofill: true,
    childrenType: "card",
    face: "up",
    ...overrides
  };
}
