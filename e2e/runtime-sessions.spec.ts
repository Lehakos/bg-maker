import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "./fixtures/projects-test";
import { ProjectDetailPage } from "./page-objects/project-detail-page";

test.describe("runtime sessions", () => {
  test("creates sessions and applies validated runtime actions through the API", async ({
    projectsApi,
    request
  }) => {
    const project = await projectsApi.create({
      name: "Runtime API Project",
      players: "2",
      status: "testing"
    });
    const { deck, die, guard, scout, visitor, wanderer } = await createRuntimeFixture(
      request,
      project.id
    );

    const sessionResponse = await request.post(`/api/projects/${project.id}/sessions`, {
      data: { name: "API playtest" }
    });
    expect(sessionResponse.status()).toBe(201);
    const session = (await sessionResponse.json()) as RuntimeSessionResponse;
    expect(session.instances).toHaveLength(5);
    expect(stackComponentIds(session, { kind: "zone", zoneId: "deck-zone" })).toEqual([
      scout.id,
      guard.id
    ]);
    expect(stackComponentIds(session, { kind: "zone", zoneId: "play-zone" })).toEqual([]);
    expect(stackComponentIds(session, { kind: "zone", zoneId: "source-locked-zone" })).toEqual([]);
    expect(stackComponentIds(session, { kind: "zone", zoneId: "piece-zone" })).toEqual([]);
    expect(stackComponentIds(session, { kind: "zone", zoneId: "free-zone" })).toEqual([]);
    expect(stackComponentIds(session, { kind: "zone", zoneId: "mixed-zone" })).toEqual([]);

    const shuffleResponse = await request.post(
      `/api/projects/${project.id}/sessions/${session.id}/actions`,
      {
        data: { type: "SHUFFLE_STACK", location: { kind: "zone", zoneId: "deck-zone", index: 0 } }
      }
    );
    expect(shuffleResponse.status()).toBe(200);
    const shuffled = (await shuffleResponse.json()) as RuntimeSessionResponse;
    expect(stackInstanceIds(shuffled, { kind: "zone", zoneId: "deck-zone" })).not.toEqual(
      stackInstanceIds(session, { kind: "zone", zoneId: "deck-zone" })
    );
    expect(shuffled.actionLog.at(-1)?.message).toBe("Shuffled Deck");

    const visitorInstance = shuffled.instances.find(
      (instance) => instance.componentId === visitor.id
    );
    expect(visitorInstance).toBeTruthy();
    const wrongSourceResponse = await request.post(
      `/api/projects/${project.id}/sessions/${session.id}/actions`,
      {
        data: {
          type: "MOVE_INSTANCE",
          instanceId: visitorInstance?.id,
          target: { kind: "zone", zoneId: "source-locked-zone", index: 0 }
        }
      }
    );
    expect(wrongSourceResponse.status()).toBe(400);
    await expect(wrongSourceResponse.json()).resolves.toEqual({
      error: "Runtime target zone source does not include this component"
    });

    const wrongTypeResponse = await request.post(
      `/api/projects/${project.id}/sessions/${session.id}/actions`,
      {
        data: {
          type: "MOVE_INSTANCE",
          instanceId: visitorInstance?.id,
          target: { kind: "zone", zoneId: "piece-zone", index: 0 }
        }
      }
    );
    expect(wrongTypeResponse.status()).toBe(400);
    await expect(wrongTypeResponse.json()).resolves.toEqual({
      error: "Runtime target zone type does not match instance type"
    });

    const freeZoneResponse = await request.post(
      `/api/projects/${project.id}/sessions/${session.id}/actions`,
      {
        data: {
          type: "MOVE_INSTANCE",
          instanceId: visitorInstance?.id,
          target: { kind: "zone", zoneId: "free-zone", index: 0, x: 37, y: 49 }
        }
      }
    );
    expect(freeZoneResponse.status()).toBe(200);
    const freeMoved = (await freeZoneResponse.json()) as RuntimeSessionResponse;
    const freeMovedVisitor = freeMoved.instances.find(
      (instance) => instance.id === visitorInstance?.id
    );
    expect(freeMovedVisitor?.location).toMatchObject({
      kind: "zone",
      zoneId: "free-zone",
      x: 40,
      y: 40
    });

    const wandererInstance = freeMoved.instances.find(
      (instance) => instance.componentId === wanderer.id
    );
    expect(wandererInstance).toBeTruthy();
    const magnetResponse = await request.post(
      `/api/projects/${project.id}/sessions/${session.id}/actions`,
      {
        data: {
          type: "MOVE_INSTANCE",
          instanceId: wandererInstance?.id,
          target: { kind: "zone", zoneId: "free-zone", index: 1, x: 108, y: 44 }
        }
      }
    );
    expect(magnetResponse.status()).toBe(200);
    const magnetMoved = (await magnetResponse.json()) as RuntimeSessionResponse;
    const magnetMovedWanderer = magnetMoved.instances.find(
      (instance) => instance.id === wandererInstance?.id
    );
    expect(magnetMovedWanderer?.location).toMatchObject({
      kind: "zone",
      zoneId: "free-zone",
      x: 103,
      y: 40
    });

    const freeTableResponse = await request.post(
      `/api/projects/${project.id}/sessions/${session.id}/actions`,
      {
        data: {
          type: "MOVE_INSTANCE",
          instanceId: visitorInstance?.id,
          target: { kind: "placement", placementId: "loose-card", index: 0 }
        }
      }
    );
    expect(freeTableResponse.status()).toBe(400);
    await expect(freeTableResponse.json()).resolves.toEqual({
      error: "Runtime move target must be a zone"
    });

    const topDeckInstance = shuffled.instances.find(
      (instance) =>
        instance.location.kind === "zone" &&
        instance.location.zoneId === "deck-zone" &&
        instance.location.index === 0
    );
    expect(topDeckInstance).toBeTruthy();
    const moveResponse = await request.post(
      `/api/projects/${project.id}/sessions/${session.id}/actions`,
      {
        data: {
          type: "MOVE_INSTANCE",
          instanceId: topDeckInstance?.id,
          target: { kind: "zone", zoneId: "play-zone", index: 0 }
        }
      }
    );
    expect(moveResponse.status()).toBe(200);
    const moved = (await moveResponse.json()) as RuntimeSessionResponse;
    expect(stackInstanceIds(moved, { kind: "zone", zoneId: "play-zone" })).toHaveLength(1);

    const nextDeckInstance = moved.instances.find(
      (instance) => instance.location.kind === "zone" && instance.location.zoneId === "deck-zone"
    );
    const fullZoneResponse = await request.post(
      `/api/projects/${project.id}/sessions/${session.id}/actions`,
      {
        data: {
          type: "MOVE_INSTANCE",
          instanceId: nextDeckInstance?.id,
          target: { kind: "zone", zoneId: "play-zone", index: 1 }
        }
      }
    );
    expect(fullZoneResponse.status()).toBe(400);
    await expect(fullZoneResponse.json()).resolves.toEqual({
      error: "Runtime target zone is full"
    });

    const dieInstance = moved.instances.find((instance) => instance.componentId === die.id);
    expect(dieInstance).toBeTruthy();
    const mixedZoneResponse = await request.post(
      `/api/projects/${project.id}/sessions/${session.id}/actions`,
      {
        data: {
          type: "MOVE_INSTANCE",
          instanceId: dieInstance?.id,
          target: { kind: "zone", zoneId: "mixed-zone", index: 0 }
        }
      }
    );
    expect(mixedZoneResponse.status()).toBe(200);
    const mixedMoved = (await mixedZoneResponse.json()) as RuntimeSessionResponse;
    expect(
      mixedMoved.instances.find((instance) => instance.id === dieInstance?.id)?.location
    ).toMatchObject({
      kind: "zone",
      zoneId: "mixed-zone"
    });

    const rollResponse = await request.post(
      `/api/projects/${project.id}/sessions/${session.id}/actions`,
      {
        data: { type: "ROLL_DIE", instanceId: dieInstance?.id }
      }
    );
    expect(rollResponse.status()).toBe(200);
    const rolled = (await rollResponse.json()) as RuntimeSessionResponse;
    const rolledDie = rolled.instances.find((instance) => instance.id === dieInstance?.id);
    expect(rolledDie?.lastRoll?.value).toBeGreaterThanOrEqual(1);
    expect(rolledDie?.lastRoll?.value).toBeLessThanOrEqual(6);
    expect(rolled.actionLog.at(-1)?.message).toContain("Rolled Fate die");

    const setupResponse = await request.get(`/api/projects/${project.id}/table-setup`);
    expect(setupResponse.status()).toBe(200);
    const setup = (await setupResponse.json()) as TableSetupResponse;
    const resetSetupResponse = await request.put(`/api/projects/${project.id}/table-setup`, {
      data: {
        height: setup.height,
        placements: setup.placements,
        width: setup.width,
        zones: setup.zones.map((zone) =>
          zone.id === "deck-zone" ? { ...zone, autofill: false } : zone
        )
      }
    });
    expect(resetSetupResponse.status()).toBe(200);

    const resetResponse = await request.post(
      `/api/projects/${project.id}/sessions/${session.id}/actions`,
      {
        data: { type: "RESET_SESSION" }
      }
    );
    expect(resetResponse.status()).toBe(200);
    const reset = (await resetResponse.json()) as RuntimeSessionResponse;
    expect(stackComponentIds(reset, { kind: "zone", zoneId: "deck-zone" })).toEqual([]);
    expect(reset.instances).toHaveLength(3);
    expect(reset.setupSnapshot.zones.find((zone) => zone.id === "deck-zone")?.autofill).toBe(false);

    const sessionsResponse = await request.get(`/api/projects/${project.id}/sessions`);
    expect(sessionsResponse.status()).toBe(200);
    await expect(sessionsResponse.json()).resolves.toMatchObject([
      { id: session.id, actionCount: 8, instanceCount: 3, name: "API playtest" }
    ]);

    const emptySetupResponse = await request.put(`/api/projects/${project.id}/table-setup`, {
      data: { placements: [], zones: [] }
    });
    expect(emptySetupResponse.status()).toBe(200);
    const deleteRuntimeDieResponse = await request.delete(
      `/api/projects/${project.id}/components/${die.id}`
    );
    expect(deleteRuntimeDieResponse.status()).toBe(400);
    await expect(deleteRuntimeDieResponse.json()).resolves.toEqual({
      error: "Component is used by a runtime session"
    });

    const deleteRuntimeDeckResponse = await request.delete(
      `/api/projects/${project.id}/collections/${deck.id}`
    );
    expect(deleteRuntimeDeckResponse.status()).toBe(400);
    await expect(deleteRuntimeDeckResponse.json()).resolves.toEqual({
      error: "Collection is used by a runtime session"
    });
  });

  test("plays a manual runtime session from the Sessions tab", async ({
    page,
    projectsApi,
    request
  }) => {
    const project = await projectsApi.create({
      name: "Runtime UI Project",
      players: "2",
      status: "testing"
    });
    await createRuntimeFixture(request, project.id);

    const detailPage = new ProjectDetailPage(page);
    await detailPage.goto(project.id);
    const sessions = await detailPage.openSessions();

    await sessions.createSession();
    await sessions.expectZonesVisible(["Deck", "Play area", "Piece lane", "Free map"]);
    await sessions.expectContainerZoneRenderedWithoutChrome("Container shelf");
    await sessions.expectZoneLabelOutsideFrame("Deck");
    await sessions.expectZoneCollectionCount("Deck", 2);
    await sessions.expectRuntimeItemRenderedDownRightOf("Scout", "Guard");
    await sessions.expectRuntimeItemSize(
      "Scout",
      { heightMm: 88, widthMm: 63 },
      { heightMm: 800, widthMm: 1200 }
    );
    await sessions.expectRuntimeVisualFillsItem("Scout", ".card-preview");
    await sessions.expectRuntimeTextFontSizeLessThan("Scout", 10.5);
    await sessions.expectRuntimeItemSize(
      "Visitor",
      { heightMm: 88, widthMm: 63 },
      { heightMm: 800, widthMm: 1200 }
    );
    await sessions.expectRuntimeVisualFillsItem("Visitor", ".card-preview");
    await sessions.expectRuntimeItemSize(
      "Fate die",
      { heightMm: 20, widthMm: 20 },
      { heightMm: 800, widthMm: 1200 }
    );
    await sessions.expectRuntimeVisualFillsItem("Fate die", ".table-setup-die-visual");
    await sessions.expectRuntimeElementInsideItem("Fate die", ".table-setup-die-visual svg");
    await sessions.expectRuntimeElementBelowItem("Fate die", ".table-setup-die-visual p");
    await sessions.expectZoneItemCount("Play area", 0);
    await sessions.expectZoneItemCount("Piece lane", 0);
    await sessions.expectZoneItemCount("Free map", 0);

    await sessions.shuffleStack("Deck");
    await sessions.expectActionVisible("Shuffled Deck");

    await sessions.moveTopZoneItem("Deck", "Piece lane");
    await sessions.expectNoAction(/Moved .* to Piece lane/);

    const releaseMoveAction = await sessions.holdNextMoveAction();
    try {
      await sessions.moveTopZoneItem("Deck", "Play area");
      await sessions.expectZoneItemCount("Play area", 1, { timeout: 500 });
    } finally {
      await releaseMoveAction();
    }
    await sessions.expectActionVisible(/Moved .* to Play area/);

    await sessions.rollDie("Fate die");
    await sessions.expectRuntimeVisualFillsItem("Fate die", ".table-setup-die-visual");
    await sessions.expectRuntimeElementInsideItem("Fate die", ".table-setup-die-visual svg");
    await sessions.expectRuntimeElementAbsent("Fate die", ".runtime-die-roll-visual");
    await sessions.expectActionVisible(/Rolled Fate die/);

    await sessions.reloadOpenSession();
    await sessions.expectActionVisible("Shuffled Deck");
    await sessions.expectActionVisible(/Moved .* to Play area/);
    await sessions.expectActionVisible(/Rolled Fate die/);
  });
});

type RuntimeSessionResponse = {
  id: string;
  actionLog: { message: string }[];
  instances: RuntimeInstanceResponse[];
  setupSnapshot: TableSetupResponse;
};

type RuntimeInstanceResponse = {
  id: string;
  componentId: string;
  lastRoll?: { value: number };
  location:
    | { index: number; kind: "zone"; x?: number; y?: number; zoneId: string }
    | { index: number; kind: "placement"; placementId: string };
};

type RuntimeStackLocation =
  | { kind: "zone"; zoneId: string }
  | { kind: "placement"; placementId: string };

type TableSetupResponse = {
  height: number;
  placements: unknown[];
  width: number;
  zones: Array<Record<string, unknown> & { autofill?: boolean; id: string }>;
};

async function createRuntimeFixture(request: APIRequestContext, projectId: string) {
  const scout = await createComponent(request, projectId, {
    type: "card",
    name: "Scout",
    frontText: "Move 1"
  });
  const guard = await createComponent(request, projectId, {
    type: "card",
    name: "Guard",
    frontText: "Block 1"
  });
  const visitor = await createComponent(request, projectId, {
    type: "card",
    name: "Visitor",
    frontText: "Not in deck"
  });
  const wanderer = await createComponent(request, projectId, {
    type: "card",
    name: "Wanderer",
    frontText: "Loose card"
  });
  const die = await createComponent(request, projectId, {
    type: "die",
    name: "Fate die",
    sides: 6,
    faceLabels: ["One", "Two", "Three", "Four", "Five", "Six"]
  });
  const pawn = await createComponent(request, projectId, {
    type: "piece",
    name: "Pawn",
    labelText: "P"
  });
  const deck = await createCollection(request, projectId, {
    type: "deck",
    name: "Runtime deck",
    items: [
      { componentId: scout.id, quantity: 1 },
      { componentId: guard.id, quantity: 1 }
    ]
  });

  const setupResponse = await request.put(`/api/projects/${projectId}/table-setup`, {
    data: {
      width: 1200,
      height: 800,
      placements: [
        {
          id: "loose-die",
          source: { kind: "component", componentId: die.id },
          x: 980,
          y: 150,
          rotationDeg: 0,
          face: "front"
        },
        {
          id: "loose-card",
          source: { kind: "component", componentId: visitor.id },
          x: 980,
          y: 320,
          rotationDeg: 0,
          face: "front"
        },
        {
          id: "loose-wanderer",
          source: { kind: "component", componentId: wanderer.id },
          x: 1060,
          y: 320,
          rotationDeg: 0,
          face: "front"
        }
      ],
      zones: [
        validRuntimeZone({
          id: "deck-zone",
          name: "Deck",
          x: 80,
          y: 80,
          width: 220,
          height: 180,
          source: { kind: "collection", collectionId: deck.id }
        }),
        validRuntimeZone({
          autofill: false,
          capacity: 1,
          id: "play-zone",
          name: "Play area",
          x: 360,
          y: 80,
          width: 240,
          height: 180,
          source: { kind: "collection", collectionId: deck.id }
        }),
        validRuntimeZone({
          autofill: false,
          id: "source-locked-zone",
          name: "Source locked",
          x: 80,
          y: 330,
          width: 240,
          height: 180,
          source: { kind: "collection", collectionId: deck.id }
        }),
        validRuntimeZone({
          autofill: false,
          childrenType: "piece",
          id: "piece-zone",
          name: "Piece lane",
          x: 360,
          y: 330,
          width: 240,
          height: 180,
          source: { kind: "component", componentId: pawn.id }
        }),
        validRuntimeZone({
          autofill: false,
          id: "free-zone",
          layout: "free",
          name: "Free map",
          x: 660,
          y: 80,
          width: 280,
          height: 240
        }),
        validRuntimeMixedZone({
          childrenType: "mixed",
          id: "mixed-zone",
          name: "Mixed tray",
          x: 660,
          y: 360,
          width: 280,
          height: 180
        }),
        validRuntimeContainerZone({
          id: "container-zone",
          name: "Container shelf",
          x: 80,
          y: 600,
          width: 240,
          height: 120
        })
      ]
    }
  });
  expect(setupResponse.status()).toBe(200);

  return { deck, die, guard, pawn, scout, visitor, wanderer };
}

async function createComponent(
  request: APIRequestContext,
  projectId: string,
  data: Record<string, unknown>
) {
  const response = await request.post(`/api/projects/${projectId}/components`, { data });
  expect(response.status()).toBe(201);
  return (await response.json()) as { id: string };
}

async function createCollection(
  request: APIRequestContext,
  projectId: string,
  data: Record<string, unknown>
) {
  const response = await request.post(`/api/projects/${projectId}/collections`, { data });
  expect(response.status()).toBe(201);
  return (await response.json()) as { id: string };
}

function validRuntimeZone(overrides: Record<string, unknown> = {}) {
  return {
    id: "runtime-zone",
    name: "Runtime zone",
    description: "",
    x: 80,
    y: 80,
    width: 220,
    height: 180,
    padding: 8,
    size: "fixed",
    overflow: "hidden",
    capacity: null,
    layout: "stack",
    visibility: "all",
    background: { type: "none" },
    border: { width: 1, color: "#0e7490" },
    autofill: true,
    childrenType: "card",
    face: "up",
    ...overrides
  };
}

function validRuntimeMixedZone(overrides: Record<string, unknown> = {}) {
  return {
    id: "runtime-mixed-zone",
    name: "Runtime mixed zone",
    description: "",
    x: 80,
    y: 80,
    width: 220,
    height: 180,
    padding: 8,
    size: "fixed",
    overflow: "hidden",
    capacity: null,
    layout: "stack",
    visibility: "all",
    background: { type: "none" },
    border: { width: 1, color: "#0e7490" },
    children: [],
    childrenType: "mixed",
    ...overrides
  };
}

function validRuntimeContainerZone(overrides: Record<string, unknown> = {}) {
  return {
    id: "runtime-container-zone",
    name: "Runtime container",
    description: "",
    x: 80,
    y: 80,
    width: 220,
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

function stackComponentIds(session: RuntimeSessionResponse, location: RuntimeStackLocation) {
  return stackInstances(session, location).map((instance) => instance.componentId);
}

function stackInstanceIds(session: RuntimeSessionResponse, location: RuntimeStackLocation) {
  return stackInstances(session, location).map((instance) => instance.id);
}

function stackInstances(session: RuntimeSessionResponse, location: RuntimeStackLocation) {
  return session.instances
    .filter((instance) =>
      location.kind === "zone"
        ? instance.location.kind === "zone" && instance.location.zoneId === location.zoneId
        : instance.location.kind === "placement" &&
          instance.location.placementId === location.placementId
    )
    .sort((left, right) => left.location.index - right.location.index);
}
