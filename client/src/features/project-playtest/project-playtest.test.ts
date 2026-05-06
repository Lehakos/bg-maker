import type { ProjectFileNode, ProjectObjectCounter, ProjectTableSetup } from "@bg-maker/shared";
import {
  createDefaultProjectObjectNode,
  getDefaultProjectObjectCounter,
  getDefaultProjectTableSetup
} from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  createPlaytestSession,
  executePlaytestAction,
  getCounterValueWithStep,
  getPlaytestRenderedObject,
  redoPlaytestSession,
  undoPlaytestSession
} from "./project-playtest";

describe("project playtest runtime", () => {
  it("creates a local table snapshot and expands deck contents without mutating the file tree", () => {
    const fileTree = createPlaytestFileTree();
    const before = JSON.stringify(fileTree);
    const session = createPlaytestSession({
      createId: createDeterministicId(),
      fileTree,
      now: () => "2026-05-05T00:00:00.000Z",
      projectId: "project-1",
      tableSetupFileNode: fileTree[1]!
    });

    expect(session?.tableItemIds).toEqual(["deck-item", "card-item", "die-item", "counter-item"]);
    expect(session?.itemsById["deck-item"]?.contents).toHaveLength(2);
    expect(session?.itemsById["counter-item"]?.counterValue).toBe(0);
    expect(JSON.stringify(fileTree)).toBe(before);
  });

  it("draws from a deck onto the table and supports undo and redo", () => {
    const session = createSession();
    const drawn = executePlaytestAction(session, { itemId: "deck-item", type: "drawFromContainer" });
    const drawnItemId = drawn.selectedItemId;

    expect(drawn.itemsById["deck-item"]?.contents).toHaveLength(1);
    expect(drawnItemId).toBeTruthy();
    expect(drawn.tableItemIds).toContain(drawnItemId);
    expect(drawn.undoStack).toHaveLength(1);

    const undone = undoPlaytestSession(drawn, {
      createId: createDeterministicId("undo"),
      now: () => "2026-05-05T00:01:00.000Z"
    });

    expect(undone.itemsById["deck-item"]?.contents).toHaveLength(2);
    expect(undone.tableItemIds).not.toContain(drawnItemId);
    expect(undone.redoStack).toHaveLength(1);

    const redone = redoPlaytestSession(undone, {
      createId: createDeterministicId("redo"),
      now: () => "2026-05-05T00:02:00.000Z"
    });

    expect(redone.itemsById["deck-item"]?.contents).toHaveLength(1);
    expect(redone.tableItemIds).toContain(drawnItemId);
  });

  it("shuffles, flips, hides, reveals, rolls, and increments runtime values", () => {
    const session = createSession();
    const deckContents = session.itemsById["deck-item"]?.contents ?? [];
    const shuffled = executePlaytestAction(
      session,
      { itemId: "deck-item", type: "shuffleContainer" },
      { random: () => 0 }
    );

    expect(shuffled.itemsById["deck-item"]?.contents).toEqual([...deckContents].reverse());

    const flipped = executePlaytestAction(shuffled, { itemId: "card-item", type: "flipItem" });
    expect(flipped.itemsById["card-item"]?.activeSide).toBe("back");

    const hidden = executePlaytestAction(flipped, { itemId: "deck-item", type: "hideItem" });
    expect(hidden.itemsById["deck-item"]).toMatchObject({ hidden: true, revealed: false });

    const revealed = executePlaytestAction(hidden, { itemId: "deck-item", type: "revealItem" });
    expect(revealed.itemsById["deck-item"]).toMatchObject({ hidden: false, revealed: true });

    const rolled = executePlaytestAction(
      revealed,
      { itemId: "die-item", type: "rollDie" },
      { random: () => 0.99 }
    );
    expect(rolled.itemsById["die-item"]?.dieFace).toBe(6);

    const increased = executePlaytestAction(rolled, {
      itemId: "counter-item",
      type: "incrementCounter"
    });
    expect(increased.itemsById["counter-item"]?.counterValue).toBe(1);
  });

  it("renders runtime overrides into project objects", () => {
    const session = createSession();
    const next = executePlaytestAction(
      executePlaytestAction(session, { itemId: "counter-item", type: "incrementCounter" }),
      { itemId: "die-item", type: "rollDie" },
      { random: () => 0.99 }
    );
    const counter = getPlaytestRenderedObject(next.itemsById["counter-item"]!, next.itemsById);
    const die = getPlaytestRenderedObject(next.itemsById["die-item"]!, next.itemsById);

    expect(counter.components?.counter?.defaultValue).toBe(1);
    expect(die.components?.die?.activeFace).toBe(6);
  });

  it("applies counter bounds modes consistently", () => {
    const baseCounter: ProjectObjectCounter = {
      ...getDefaultProjectObjectCounter(),
      maxValue: 1,
      minValue: 0,
      step: 1
    };

    expect(getCounterValueWithStep({ ...baseCounter, boundsMode: "clamp" }, 1, 1)).toBe(1);
    expect(getCounterValueWithStep({ ...baseCounter, boundsMode: "wrap" }, 1, 1)).toBe(0);
    expect(getCounterValueWithStep({ ...baseCounter, boundsMode: "none" }, 1, 1)).toBe(2);
  });
});

function createSession() {
  const fileTree = createPlaytestFileTree();
  const session = createPlaytestSession({
    createId: createDeterministicId(),
    fileTree,
    now: () => "2026-05-05T00:00:00.000Z",
    projectId: "project-1",
    tableSetupFileNode: fileTree[1]!
  });

  if (!session) {
    throw new Error("Expected playtest session");
  }

  return session;
}

function createPlaytestFileTree(): ProjectFileNode[] {
  const card = createDefaultProjectObjectNode("card-root", "card", "Card");
  const deck = createDefaultProjectObjectNode("deck-root", "deck", "Deck");
  const die = createDefaultProjectObjectNode("die-root", "die", "Die");
  const counter = createDefaultProjectObjectNode("counter-root", "counter", "Counter");
  const tableSetup: ProjectTableSetup = {
    ...getDefaultProjectTableSetup(),
    items: [
      {
        id: "deck-item",
        name: "Deck",
        sourceObjectFileNodeId: "deck-file",
        transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
        type: "linkedObject",
        values: {},
        visible: true
      },
      {
        id: "card-item",
        name: "Card",
        sourceObjectFileNodeId: "card-file",
        transform: { rotation: 0, scaleX: 1, scaleY: 1, x: -120, y: 0 },
        type: "linkedObject",
        values: {},
        visible: true
      },
      {
        id: "die-item",
        name: "Die",
        sourceObjectFileNodeId: "die-file",
        transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 120, y: 0 },
        type: "linkedObject",
        values: {},
        visible: true
      },
      {
        id: "counter-item",
        name: "Counter",
        sourceObjectFileNodeId: "counter-file",
        transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 240, y: 0 },
        type: "linkedObject",
        values: {},
        visible: true
      }
    ]
  };

  deck.components = {
    ...deck.components,
    container: {
      entries: [{ objectFileNodeId: "card-file", quantity: 2 }]
    }
  };

  return [
    {
      id: "objects",
      name: "Objects",
      type: "folder",
      children: [
        { id: "card-file", kind: "object", name: "Card", objectTree: [card], type: "file" },
        { id: "deck-file", kind: "object", name: "Deck", objectTree: [deck], type: "file" },
        { id: "die-file", kind: "object", name: "Die", objectTree: [die], type: "file" },
        {
          id: "counter-file",
          kind: "object",
          name: "Counter",
          objectTree: [counter],
          type: "file"
        }
      ]
    },
    {
      id: "setup-file",
      kind: "tableSetup",
      name: "Setup",
      tableSetup,
      type: "file"
    }
  ];
}

function createDeterministicId(prefix = "id") {
  let index = 0;

  return () => `${prefix}-${index++}`;
}
