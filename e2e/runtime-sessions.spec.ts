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
    const { deck, die, guard, scout, visitor } = await createRuntimeFixture(request, project.id);

    const sessionResponse = await request.post(`/api/projects/${project.id}/sessions`, {
      data: { name: "API playtest" }
    });
    expect(sessionResponse.status()).toBe(201);
    const session = (await sessionResponse.json()) as RuntimeSessionResponse;
    expect(session.instances).toHaveLength(4);
    expect(stackComponentIds(session, { kind: "zone", zoneId: "deck-zone" })).toEqual([
      scout.id,
      guard.id
    ]);
    expect(stackComponentIds(session, { kind: "zone", zoneId: "play-zone" })).toEqual([]);

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

    const visitorInstance = shuffled.instances.find((instance) => instance.componentId === visitor.id);
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

    const sessionsResponse = await request.get(`/api/projects/${project.id}/sessions`);
    expect(sessionsResponse.status()).toBe(200);
    await expect(sessionsResponse.json()).resolves.toMatchObject([
      { id: session.id, actionCount: 4, instanceCount: 4, name: "API playtest" }
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
    await sessions.expectZonesVisible(["Deck", "Play area", "Piece lane"]);

    await sessions.shuffleStack("Deck");
    await sessions.expectActionVisible("Shuffled Deck");

    await sessions.moveTopZoneItem("Deck", "Piece lane");
    await sessions.expectNoAction(/Moved .* to Piece lane/);

    await sessions.moveTopZoneItem("Deck", "Play area");
    await sessions.expectActionVisible(/Moved .* to Play area/);

    await sessions.rollDie("Fate die");
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
};

type RuntimeInstanceResponse = {
  id: string;
  componentId: string;
  lastRoll?: { value: number };
  location:
    | { index: number; kind: "zone"; zoneId: string }
    | { index: number; kind: "placement"; placementId: string };
};

type RuntimeStackLocation =
  | { kind: "zone"; zoneId: string }
  | { kind: "placement"; placementId: string };

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
        })
      ]
    }
  });
  expect(setupResponse.status()).toBe(200);

  return { deck, die, guard, pawn, scout, visitor };
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
