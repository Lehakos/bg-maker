import type {
  ProjectFileNode,
  ProjectObjectCounter,
  ProjectObjectZoneMode,
  ProjectTableSetup,
  ProjectTableSetupItemBehavior,
  ProjectTableSetupLinkedObjectItem
} from "@bg-maker/shared";
import {
  createDefaultProjectObjectNode,
  getDefaultProjectObjectCounter,
  getDefaultProjectTableSetup
} from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  createPlaytestSession,
  executePlaytestAction,
  getPlaytestCommandDestinationPreview,
  getCounterValueWithStep,
  getPlaytestItemGroupMoveTransforms,
  getPlaytestItemMovePreview,
  getPlaytestMovePreviewTransforms,
  getPlaytestRenderedObject,
  getPlaytestZoneContentMovePreviewTransforms,
  getRotatedPlaytestItemRectTransform,
  getScoreTrackMarkerValueWithStep,
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

  it("applies table item behavior at playtest start", () => {
    const fileTree = createPlaytestFileTree();
    const tableSetup = fileTree[1]?.type === "file" ? fileTree[1].tableSetup : null;
    const cardFile =
      fileTree[0]?.type === "folder"
        ? fileTree[0].children?.find((node) => node.id === "card-file")
        : null;

    if (!tableSetup || cardFile?.type !== "file" || !cardFile.objectTree?.[0]) {
      throw new Error("Expected table setup");
    }

    cardFile.objectTree[0] = {
      ...cardFile.objectTree[0],
      locked: true,
      visible: false
    };
    tableSetup.items = tableSetup.items.map((item) =>
      item.type === "linkedObject" && item.id === "card-item"
        ? {
            ...item,
            behavior: {
              side: { initialSide: "back" },
              visibility: { initialHidden: true }
            },
            locked: true,
            visible: false
          }
        : item
    );

    const session = createPlaytestSession({
      createId: createDeterministicId(),
      fileTree,
      now: () => "2026-05-05T00:00:00.000Z",
      projectId: "project-1",
      tableSetupFileNode: fileTree[1]!
    });

    expect(session?.itemsById["card-item"]).toMatchObject({
      activeSide: "back",
      hidden: true,
      revealed: false,
      visible: true
    });
    expect(getPlaytestRenderedObject(session!.itemsById["card-item"]!)).toMatchObject({
      locked: false,
      visible: true
    });
  });

  it("draws from a deck onto the table and supports undo and redo", () => {
    const session = createSession();
    const drawn = executePlaytestAction(session, {
      itemId: "deck-item",
      type: "drawFromContainer"
    });
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

  it("moves selected playtest items together from a source drag", () => {
    const session = createSession();
    const cardTransform = session.itemsById["card-item"]!.rectTransform;
    const transforms = getPlaytestItemGroupMoveTransforms(
      session,
      ["card-item", "die-item"],
      "card-item",
      cardTransform,
      {
        ...cardTransform,
        x: -80,
        y: 40
      }
    );
    const moved = executePlaytestAction(session, {
      itemTransforms: transforms,
      type: "moveItems"
    });

    expect(transforms).toMatchObject({
      "card-item": { x: -80, y: 40 },
      "die-item": { x: 160, y: 40 }
    });
    expect(moved.itemsById["card-item"]?.rectTransform).toMatchObject({ x: -80, y: 40 });
    expect(moved.itemsById["die-item"]?.rectTransform).toMatchObject({ x: 160, y: 40 });
    expect(moved.itemsById["deck-item"]?.rectTransform).toMatchObject({ x: 0, y: 0 });
  });

  it("rotates playtest items from configured toolbar step", () => {
    const fileTree = createPlaytestFileTree();
    const tableSetup = fileTree[1]?.type === "file" ? fileTree[1].tableSetup : null;

    if (!tableSetup) {
      throw new Error("Expected table setup");
    }

    tableSetup.items = tableSetup.items.map((item) =>
      item.type === "linkedObject" && item.id === "card-item"
        ? {
            ...item,
            behavior: {
              rotation: { rotatableInPlaytest: true, rotationStep: 45 }
            }
          }
        : item
    );

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

    const rotatedRight = executePlaytestAction(session, {
      direction: 1,
      itemId: "card-item",
      type: "rotateItem"
    });
    const rotatedLeft = executePlaytestAction(rotatedRight, {
      direction: -1,
      itemId: "card-item",
      type: "rotateItem"
    });

    expect(getRotatedPlaytestItemRectTransform(session.itemsById["card-item"]!, 1)).toMatchObject({
      rotation: 45
    });
    expect(rotatedRight.itemsById["card-item"]?.rectTransform.rotation).toBe(45);
    expect(rotatedRight.actionLog.at(-1)?.label).toBe("Rotate Card");
    expect(rotatedLeft.itemsById["card-item"]?.rectTransform.rotation).toBe(0);
  });

  it("blocks playtest rotation when item behavior disables it", () => {
    const fileTree = createPlaytestFileTree();
    const tableSetup = fileTree[1]?.type === "file" ? fileTree[1].tableSetup : null;

    if (!tableSetup) {
      throw new Error("Expected table setup");
    }

    tableSetup.items = tableSetup.items.map((item) =>
      item.type === "linkedObject" && item.id === "card-item"
        ? {
            ...item,
            behavior: {
              rotation: { rotatableInPlaytest: false, rotationStep: 45 }
            }
          }
        : item
    );

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

    const rotated = executePlaytestAction(session, {
      direction: 1,
      itemId: "card-item",
      type: "rotateItem"
    });

    expect(rotated).toBe(session);
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

  it("runs stack and bag container actions in playtest", () => {
    const session = createContainerSession();
    const stackContents = session.itemsById["stack-item"]?.contents ?? [];
    const bagContents = session.itemsById["bag-item"]?.contents ?? [];

    expect(stackContents).toHaveLength(2);
    expect(bagContents).toHaveLength(3);

    const stacked = executePlaytestAction(session, {
      itemId: "stack-item",
      type: "drawFromContainer"
    });
    expect(stacked.selectedItemId).toBe(stackContents[0]);
    expect(stacked.itemsById["stack-item"]?.contents).toEqual([stackContents[1]]);

    const bagged = executePlaytestAction(
      session,
      {
        itemId: "bag-item",
        type: "drawFromContainer"
      },
      { random: () => 0.5 }
    );
    expect(bagged.selectedItemId).toBe(bagContents[1]);
    expect(bagged.itemsById["bag-item"]?.contents).toEqual([bagContents[0], bagContents[2]]);
  });

  it("uses container behavior for startup shuffle, movement, interaction, and drawn side", () => {
    const session = createContainerSession({
      deckBehavior: {
        container: { drawOrder: "top", drawnItemSide: "back", shuffleOnStart: true },
        interaction: { interactableInPlaytest: true },
        movement: { movableInPlaytest: true }
      },
      random: () => 0
    });

    expect(session.itemsById["deck-item"]?.contents).toEqual(["id-1", "id-0"]);
    expect(session.actionLog.map((entry) => entry.label)).toContain("Shuffle Deck");

    const drawn = executePlaytestAction(session, {
      itemId: "deck-item",
      type: "drawFromContainer"
    });
    const drawnItem = drawn.selectedItemId ? drawn.itemsById[drawn.selectedItemId] : null;
    expect(drawnItem).toMatchObject({ activeSide: "back", hidden: false, revealed: true });

    const lockedSession = createContainerSession({
      deckBehavior: {
        interaction: { interactableInPlaytest: false },
        movement: { movableInPlaytest: false }
      }
    });
    const moved = executePlaytestAction(lockedSession, {
      itemTransforms: {
        "deck-item": {
          ...lockedSession.itemsById["deck-item"]!.rectTransform,
          x: 400
        }
      },
      type: "moveItems"
    });
    const drawnFromLocked = executePlaytestAction(lockedSession, {
      itemId: "deck-item",
      type: "drawFromContainer"
    });

    expect(moved).toBe(lockedSession);
    expect(drawnFromLocked).toBe(lockedSession);
  });

  it("executes configured draw commands to a table offset", () => {
    const session = createCommandSession({
      cardQuantity: 3,
      deckBehavior: {
        commands: [
          {
            count: 2,
            drawOrder: "top",
            drawnItemSide: "front",
            id: "draw-offset",
            label: "Draw Pair",
            offset: { x: 20, y: 10 },
            type: "drawFromContainerToTableOffset"
          }
        ]
      }
    });
    const drawn = executePlaytestAction(session, {
      commandId: "draw-offset",
      itemId: "deck-item",
      type: "executeCommand"
    });
    const [firstDrawnId, secondDrawnId] = drawn.selectedItemIds;

    expect(drawn.itemsById["deck-item"]?.contents).toHaveLength(1);
    expect(drawn.selectedItemIds).toHaveLength(2);
    expect(drawn.itemsById[firstDrawnId!]?.rectTransform).toMatchObject({ x: 20, y: 10 });
    expect(drawn.itemsById[secondDrawnId!]?.rectTransform).toMatchObject({ x: 52, y: 42 });
  });

  it("executes configured draw commands to target zone slots", () => {
    const session = createCommandSession({
      cardQuantity: 3,
      deckBehavior: {
        commands: [
          {
            count: 2,
            drawOrder: "top",
            drawnItemSide: "front",
            id: "draw-zone",
            label: "Draw to Market",
            targetItemId: "zone-item",
            type: "drawFromContainerToTargetZone"
          }
        ]
      }
    });
    const drawn = executePlaytestAction(session, {
      commandId: "draw-zone",
      itemId: "deck-item",
      type: "executeCommand"
    });

    expect(drawn.itemsById["deck-item"]?.contents).toHaveLength(1);
    expect(drawn.selectedItemIds.map((itemId) => drawn.itemsById[itemId]?.zonePlacement)).toEqual([
      { slotIndex: 0, zoneItemId: "zone-item" },
      { slotIndex: 1, zoneItemId: "zone-item" }
    ]);
  });

  it("previews configured command destinations without mutating runtime state", () => {
    const session = createCommandSession({
      cardQuantity: 3,
      deckBehavior: {
        commands: [
          {
            count: 1,
            drawOrder: "top",
            drawnItemSide: "front",
            id: "draw-offset",
            label: "Draw",
            offset: { x: 20, y: 10 },
            type: "drawFromContainerToTableOffset"
          },
          {
            count: 1,
            drawOrder: "top",
            drawnItemSide: "front",
            id: "draw-zone",
            label: "Draw to Market",
            targetItemId: "zone-item",
            type: "drawFromContainerToTargetZone"
          }
        ]
      }
    });
    const offsetPreview = getPlaytestCommandDestinationPreview(session, {
      commandId: "draw-offset",
      itemId: "deck-item"
    });
    const zonePreview = getPlaytestCommandDestinationPreview(session, {
      commandId: "draw-zone",
      itemId: "deck-item"
    });

    expect(offsetPreview?.destinationRectTransform).toMatchObject({ x: 20, y: 10 });
    expect(zonePreview).toMatchObject({
      targetItemId: "zone-item",
      targetRectTransform: { x: 100, y: 100 }
    });
    expect(zonePreview?.destinationRectTransform).toEqual(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number)
      })
    );
    expect(session.itemsById["deck-item"]?.contents).toHaveLength(3);
    expect(session.tableItemIds).toEqual(["deck-item", "zone-item"]);
  });

  it("refills only empty target zone slots from a configured command", () => {
    const session = createCommandSession({
      cardQuantity: 3,
      deckBehavior: {
        commands: [
          {
            count: 1,
            drawOrder: "top",
            drawnItemSide: "front",
            id: "draw-one-zone",
            label: "Draw One",
            targetItemId: "zone-item",
            type: "drawFromContainerToTargetZone"
          },
          {
            drawOrder: "top",
            drawnItemSide: "front",
            id: "refill-zone",
            label: "Refill Market",
            refillMode: "emptySlots",
            targetItemId: "zone-item",
            type: "refillTargetZoneFromContainer"
          }
        ]
      }
    });
    const withOccupiedSlot = executePlaytestAction(session, {
      commandId: "draw-one-zone",
      itemId: "deck-item",
      type: "executeCommand"
    });
    const refilled = executePlaytestAction(withOccupiedSlot, {
      commandId: "refill-zone",
      itemId: "deck-item",
      type: "executeCommand"
    });
    const zoneSlotIndexes = Object.values(refilled.itemsById)
      .filter((item) => item.zonePlacement?.zoneItemId === "zone-item")
      .map((item) => item.zonePlacement?.slotIndex)
      .sort();

    expect(refilled.itemsById["deck-item"]?.contents).toHaveLength(0);
    expect(zoneSlotIndexes).toEqual([0, 1, 2]);
    expect(refilled.selectedItemIds).toHaveLength(2);
  });

  it("respects accepted zone rules for configured draw commands", () => {
    const session = createCommandSession({
      cardQuantity: 1,
      deckBehavior: {
        commands: [
          {
            count: 1,
            drawOrder: "top",
            drawnItemSide: "front",
            id: "draw-zone",
            label: "Draw to Market",
            targetItemId: "zone-item",
            type: "drawFromContainerToTargetZone"
          }
        ]
      },
      zoneBehavior: { acceptedKinds: ["token"] }
    });
    const rejected = executePlaytestAction(session, {
      commandId: "draw-zone",
      itemId: "deck-item",
      type: "executeCommand"
    });

    expect(rejected).toBe(session);
  });

  it("applies drawn side before target zone side-on-enter for configured draw commands", () => {
    const session = createCommandSession({
      cardQuantity: 1,
      deckBehavior: {
        commands: [
          {
            count: 1,
            drawOrder: "top",
            drawnItemSide: "back",
            id: "draw-zone",
            label: "Draw to Market",
            targetItemId: "zone-item",
            type: "drawFromContainerToTargetZone"
          }
        ]
      },
      zoneBehavior: { sideOnEnter: "front" }
    });
    const drawn = executePlaytestAction(session, {
      commandId: "draw-zone",
      itemId: "deck-item",
      type: "executeCommand"
    });
    const drawnItem = drawn.selectedItemId ? drawn.itemsById[drawn.selectedItemId] : null;

    expect(drawnItem).toMatchObject({
      activeSide: "front",
      hidden: false,
      revealed: true,
      zonePlacement: { slotIndex: 0, zoneItemId: "zone-item" }
    });
  });

  it("safely no-ops configured commands when source or target is missing", () => {
    const sourceSession = createCommandSession({
      cardQuantity: 1,
      deckBehavior: {
        commands: [
          {
            count: 1,
            drawOrder: "top",
            drawnItemSide: "front",
            id: "draw-offset",
            label: "Draw",
            offset: { x: 20, y: 10 },
            type: "drawFromContainerToTableOffset"
          }
        ]
      }
    });
    const targetSession = createCommandSession({
      cardQuantity: 1,
      deckBehavior: {
        commands: [
          {
            count: 1,
            drawOrder: "top",
            drawnItemSide: "front",
            id: "missing-target",
            label: "Draw to Missing",
            targetItemId: "missing-zone",
            type: "drawFromContainerToTargetZone"
          }
        ]
      }
    });

    expect(
      executePlaytestAction(sourceSession, {
        commandId: "draw-offset",
        itemId: "missing-source",
        type: "executeCommand"
      })
    ).toBe(sourceSession);
    expect(
      executePlaytestAction(targetSession, {
        commandId: "missing-target",
        itemId: "deck-item",
        type: "executeCommand"
      })
    ).toBe(targetSession);
  });

  it("updates score track markers at runtime and supports undo", () => {
    const session = createScoreTrackSession();
    const increased = executePlaytestAction(session, {
      itemId: "score-item",
      markerId: "player-1",
      type: "incrementScoreTrackMarker"
    });
    const rendered = getPlaytestRenderedObject(increased.itemsById["score-item"]!);

    expect(increased.itemsById["score-item"]?.scoreTrackMarkers?.[0]?.value).toBe(1);
    expect(rendered.components?.scoreTrack?.markers[0]?.value).toBe(1);

    const undone = undoPlaytestSession(increased);
    expect(undone.itemsById["score-item"]?.scoreTrackMarkers?.[0]?.value).toBe(0);

    const redone = redoPlaytestSession(undone);
    expect(redone.itemsById["score-item"]?.scoreTrackMarkers?.[0]?.value).toBe(1);

    const clampedMin = executePlaytestAction(session, {
      itemId: "score-item",
      markerId: "player-1",
      type: "decrementScoreTrackMarker"
    });
    const clampedMax = executePlaytestAction(session, {
      itemId: "score-item",
      markerId: "player-2",
      type: "incrementScoreTrackMarker"
    });

    expect(clampedMin.itemsById["score-item"]?.scoreTrackMarkers?.[0]?.value).toBe(0);
    expect(clampedMax.itemsById["score-item"]?.scoreTrackMarkers?.[1]?.value).toBe(2);

    const scoreTrack = session.itemsById["score-item"]!.baseObject.components!.scoreTrack!;
    expect(getScoreTrackMarkerValueWithStep(scoreTrack, 2, 1)).toBe(2);
  });

  it("places items in free zones and clears placement on allowed exit", () => {
    const session = createZoneSession({ zoneMode: "free" });
    const moved = executePlaytestAction(session, {
      itemTransforms: {
        "card-item": {
          ...session.itemsById["card-item"]!.rectTransform,
          x: 120,
          y: 115
        }
      },
      type: "moveItems"
    });

    expect(moved.itemsById["card-item"]?.zonePlacement).toEqual({ zoneItemId: "zone-item" });
    expect(moved.itemsById["card-item"]?.rectTransform).toMatchObject({ x: 120, y: 115 });

    const movedOut = executePlaytestAction(moved, {
      itemTransforms: {
        "card-item": {
          ...moved.itemsById["card-item"]!.rectTransform,
          x: 0,
          y: 0
        }
      },
      type: "moveItems"
    });

    expect(movedOut.itemsById["card-item"]?.zonePlacement).toBeUndefined();
  });

  it("renders placed items above their zone even when the zone started on top", () => {
    const session = createZoneSession({ tableOrder: "zoneLast", zoneMode: "free" });
    const moved = executePlaytestAction(session, {
      itemTransforms: {
        "card-item": {
          ...session.itemsById["card-item"]!.rectTransform,
          x: 120,
          y: 115
        }
      },
      type: "moveItems"
    });

    expect(session.tableItemIds.indexOf("zone-item")).toBeGreaterThan(
      session.tableItemIds.indexOf("card-item")
    );
    expect(moved.itemsById["card-item"]?.zonePlacement).toEqual({ zoneItemId: "zone-item" });
    expect(moved.tableItemIds.indexOf("card-item")).toBeGreaterThan(
      moved.tableItemIds.indexOf("zone-item")
    );
  });

  it("moves zone contents when the zone is moved", () => {
    const session = createZoneSession({ zoneMode: "free" });
    const movedCard = executePlaytestAction(session, {
      itemTransforms: {
        "card-item": {
          ...session.itemsById["card-item"]!.rectTransform,
          x: 120,
          y: 115
        }
      },
      type: "moveItems"
    });
    const movedZone = executePlaytestAction(movedCard, {
      itemTransforms: {
        "zone-item": {
          ...movedCard.itemsById["zone-item"]!.rectTransform,
          x: 200,
          y: 150
        }
      },
      type: "moveItems"
    });

    expect(movedZone.itemsById["zone-item"]?.rectTransform).toMatchObject({ x: 200, y: 150 });
    expect(movedZone.itemsById["card-item"]).toMatchObject({
      rectTransform: { x: 220, y: 165 },
      zonePlacement: { zoneItemId: "zone-item" }
    });
  });

  it("previews zone content movement while dragging a zone", () => {
    const session = createZoneSession({ zoneMode: "free" });
    const movedCard = executePlaytestAction(session, {
      itemTransforms: {
        "card-item": {
          ...session.itemsById["card-item"]!.rectTransform,
          x: 120,
          y: 115
        }
      },
      type: "moveItems"
    });
    const transforms = getPlaytestZoneContentMovePreviewTransforms(movedCard, "zone-item", {
      ...movedCard.itemsById["zone-item"]!.rectTransform,
      x: 200,
      y: 150
    });

    expect(transforms).toEqual({
      "card-item": {
        ...movedCard.itemsById["card-item"]!.rectTransform,
        x: 220,
        y: 165
      }
    });
    expect(movedCard.itemsById["card-item"]?.rectTransform).toMatchObject({ x: 120, y: 115 });
  });

  it("previews selected playtest group movement with zone contents", () => {
    const session = createZoneSession({ zoneMode: "free" });
    const movedCard = executePlaytestAction(session, {
      itemTransforms: {
        "card-item": {
          ...session.itemsById["card-item"]!.rectTransform,
          x: 120,
          y: 115
        }
      },
      type: "moveItems"
    });
    const zoneTransform = movedCard.itemsById["zone-item"]!.rectTransform;
    const transforms = getPlaytestItemGroupMoveTransforms(
      movedCard,
      ["zone-item", "token-item"],
      "zone-item",
      zoneTransform,
      {
        ...zoneTransform,
        x: 200,
        y: 150
      }
    );
    const previewTransforms = getPlaytestMovePreviewTransforms(movedCard, transforms);

    expect(previewTransforms).toMatchObject({
      "card-item": { x: 220, y: 165 },
      "token-item": { x: 100, y: 270 },
      "zone-item": { x: 200, y: 150 }
    });
    expect(movedCard.itemsById["card-item"]?.rectTransform).toMatchObject({ x: 120, y: 115 });
    expect(movedCard.itemsById["token-item"]?.rectTransform).toMatchObject({ x: 0, y: 220 });
  });

  it("blocks exit from no-remove zones", () => {
    const session = createZoneSession({
      zoneBehavior: { allowRemove: false },
      zoneMode: "free"
    });
    const moved = executePlaytestAction(session, {
      itemTransforms: {
        "card-item": {
          ...session.itemsById["card-item"]!.rectTransform,
          x: 120,
          y: 115
        }
      },
      type: "moveItems"
    });
    const movedOut = executePlaytestAction(moved, {
      itemTransforms: {
        "card-item": {
          ...moved.itemsById["card-item"]!.rectTransform,
          x: 0,
          y: 0
        }
      },
      type: "moveItems"
    });

    expect(moved.itemsById["card-item"]?.zonePlacement).toEqual({ zoneItemId: "zone-item" });
    expect(movedOut).toBe(moved);
  });

  it("snaps slot zones and rejects full single-occupancy slots", () => {
    const session = createZoneSession({ zoneMode: "slots" });
    const movedCard = executePlaytestAction(session, {
      itemTransforms: {
        "card-item": {
          ...session.itemsById["card-item"]!.rectTransform,
          x: 65,
          y: 100
        }
      },
      type: "moveItems"
    });
    const rejectedToken = executePlaytestAction(movedCard, {
      itemTransforms: {
        "token-item": {
          ...movedCard.itemsById["token-item"]!.rectTransform,
          x: 65,
          y: 100
        }
      },
      type: "moveItems"
    });

    expect(movedCard.itemsById["card-item"]?.zonePlacement).toEqual({
      slotIndex: 0,
      zoneItemId: "zone-item"
    });
    expect(movedCard.itemsById["card-item"]?.rectTransform).toMatchObject({ x: 63.5, y: 100 });
    expect(rejectedToken).toBe(movedCard);
  });

  it("previews accepted item movement into zones", () => {
    const session = createZoneSession({ zoneMode: "slots" });
    const preview = getPlaytestItemMovePreview(session, "card-item", {
      ...session.itemsById["card-item"]!.rectTransform,
      x: 65,
      y: 100
    });

    expect(preview).toMatchObject({
      accepted: true,
      item: {
        rectTransform: { x: 63.5, y: 100 },
        zonePlacement: {
          slotIndex: 0,
          zoneItemId: "zone-item"
        }
      }
    });
    expect(session.itemsById["card-item"]?.zonePlacement).toBeUndefined();
  });

  it("allows stacked slot occupancy", () => {
    const session = createZoneSession({
      zoneBehavior: { slotOccupancy: "stack" },
      zoneMode: "slots"
    });
    const movedCard = executePlaytestAction(session, {
      itemTransforms: {
        "card-item": {
          ...session.itemsById["card-item"]!.rectTransform,
          x: 65,
          y: 100
        }
      },
      type: "moveItems"
    });
    const movedToken = executePlaytestAction(movedCard, {
      itemTransforms: {
        "token-item": {
          ...movedCard.itemsById["token-item"]!.rectTransform,
          x: 65,
          y: 100
        }
      },
      type: "moveItems"
    });

    expect(movedToken.itemsById["card-item"]?.zonePlacement).toEqual({
      slotIndex: 0,
      zoneItemId: "zone-item"
    });
    expect(movedToken.itemsById["token-item"]?.zonePlacement).toEqual({
      slotIndex: 0,
      zoneItemId: "zone-item"
    });
  });

  it("rejects unsupported accepted kinds", () => {
    const session = createZoneSession({
      zoneBehavior: { acceptedKinds: ["token"] },
      zoneMode: "free"
    });
    const rejectedCard = executePlaytestAction(session, {
      itemTransforms: {
        "card-item": {
          ...session.itemsById["card-item"]!.rectTransform,
          x: 120,
          y: 115
        }
      },
      type: "moveItems"
    });
    const movedToken = executePlaytestAction(session, {
      itemTransforms: {
        "token-item": {
          ...session.itemsById["token-item"]!.rectTransform,
          x: 120,
          y: 115
        }
      },
      type: "moveItems"
    });

    expect(rejectedCard).toBe(session);
    expect(movedToken.itemsById["token-item"]?.zonePlacement).toEqual({ zoneItemId: "zone-item" });
  });

  it("accepts specific project object files in zone filters", () => {
    const session = createZoneSession({
      zoneBehavior: { acceptedObjectFileNodeIds: ["card-file"] },
      zoneMode: "free"
    });
    const movedCard = executePlaytestAction(session, {
      itemTransforms: {
        "card-item": {
          ...session.itemsById["card-item"]!.rectTransform,
          x: 120,
          y: 115
        }
      },
      type: "moveItems"
    });
    const rejectedToken = executePlaytestAction(session, {
      itemTransforms: {
        "token-item": {
          ...session.itemsById["token-item"]!.rectTransform,
          x: 120,
          y: 115
        }
      },
      type: "moveItems"
    });

    expect(movedCard.itemsById["card-item"]?.zonePlacement).toEqual({ zoneItemId: "zone-item" });
    expect(rejectedToken).toBe(session);
  });

  it("applies side on enter and restores placement through undo and redo", () => {
    const session = createZoneSession({
      zoneBehavior: { sideOnEnter: "back" },
      zoneMode: "free"
    });
    const moved = executePlaytestAction(session, {
      itemTransforms: {
        "card-item": {
          ...session.itemsById["card-item"]!.rectTransform,
          x: 120,
          y: 115
        }
      },
      type: "moveItems"
    });

    expect(moved.itemsById["card-item"]).toMatchObject({
      activeSide: "back",
      hidden: false,
      revealed: true,
      zonePlacement: { zoneItemId: "zone-item" }
    });

    const undone = undoPlaytestSession(moved);
    const redone = redoPlaytestSession(undone);

    expect(undone.itemsById["card-item"]).toMatchObject({
      activeSide: "front",
      rectTransform: { x: 0, y: 0 }
    });
    expect(undone.itemsById["card-item"]?.zonePlacement).toBeUndefined();
    expect(redone.itemsById["card-item"]).toMatchObject({
      activeSide: "back",
      rectTransform: { x: 120, y: 115 },
      zonePlacement: { zoneItemId: "zone-item" }
    });
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

function createContainerSession({
  deckBehavior,
  random = Math.random
}: {
  deckBehavior?: ProjectTableSetupItemBehavior;
  random?: () => number;
} = {}) {
  const card = createDefaultProjectObjectNode("card-root", "card", "Card");
  const token = createDefaultProjectObjectNode("token-root", "token", "Token");
  const deck = createDefaultProjectObjectNode("deck-root", "deck", "Deck");
  const stack = createDefaultProjectObjectNode("stack-root", "stack", "Stack");
  const bag = createDefaultProjectObjectNode("bag-root", "bag", "Bag");
  deck.components = {
    ...deck.components,
    container: {
      entries: [{ objectFileNodeId: "card-file", quantity: 2 }]
    }
  };
  stack.components = {
    ...stack.components,
    container: {
      entries: [{ objectFileNodeId: "token-file", quantity: 2 }]
    }
  };
  bag.components = {
    ...bag.components,
    container: {
      entries: [{ objectFileNodeId: "token-file", quantity: 3 }]
    }
  };
  const tableSetup: ProjectTableSetup = {
    ...getDefaultProjectTableSetup(),
    items: [
      {
        behavior: deckBehavior,
        id: "deck-item",
        name: "Deck",
        sourceObjectFileNodeId: "deck-file",
        transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
        type: "linkedObject",
        values: {},
        visible: true
      },
      {
        id: "stack-item",
        name: "Stack",
        sourceObjectFileNodeId: "stack-file",
        transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 120, y: 0 },
        type: "linkedObject",
        values: {},
        visible: true
      },
      {
        id: "bag-item",
        name: "Bag",
        sourceObjectFileNodeId: "bag-file",
        transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 240, y: 0 },
        type: "linkedObject",
        values: {},
        visible: true
      }
    ]
  };
  const fileTree: ProjectFileNode[] = [
    {
      id: "objects",
      name: "Objects",
      type: "folder",
      children: [
        { id: "card-file", kind: "object", name: "Card", objectTree: [card], type: "file" },
        { id: "token-file", kind: "object", name: "Token", objectTree: [token], type: "file" },
        { id: "deck-file", kind: "object", name: "Deck", objectTree: [deck], type: "file" },
        { id: "stack-file", kind: "object", name: "Stack", objectTree: [stack], type: "file" },
        { id: "bag-file", kind: "object", name: "Bag", objectTree: [bag], type: "file" }
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
  const session = createPlaytestSession({
    createId: createDeterministicId(),
    fileTree,
    now: () => "2026-05-05T00:00:00.000Z",
    projectId: "project-1",
    random,
    tableSetupFileNode: fileTree[1]!
  });

  if (!session) {
    throw new Error("Expected playtest session");
  }

  return session;
}

function createCommandSession({
  cardQuantity,
  deckBehavior,
  zoneBehavior = {}
}: {
  cardQuantity: number;
  deckBehavior: ProjectTableSetupItemBehavior;
  zoneBehavior?: Partial<NonNullable<ProjectTableSetupItemBehavior["zone"]>>;
}) {
  const card = createDefaultProjectObjectNode("card-root", "card", "Card");
  const token = createDefaultProjectObjectNode("token-root", "token", "Token");
  const deck = createDefaultProjectObjectNode("deck-root", "deck", "Deck");
  const zone = createDefaultProjectObjectNode("zone-root", "zone", "Zone");
  deck.components = {
    ...deck.components,
    container: {
      entries: [{ objectFileNodeId: "card-file", quantity: cardQuantity }]
    }
  };
  zone.components = {
    ...zone.components,
    appearance: {
      ...zone.components!.appearance!,
      padding: 0
    },
    layout: {
      ...zone.components!.layout!,
      gap: 10,
      mode: "horizontal"
    },
    zone: {
      mode: "slots",
      sizeReferenceObjectFileId: "card-file",
      slots: 3
    }
  };
  const tableSetup: ProjectTableSetup = {
    ...getDefaultProjectTableSetup(),
    items: [
      {
        behavior: deckBehavior,
        id: "deck-item",
        name: "Deck",
        sourceObjectFileNodeId: "deck-file",
        transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
        type: "linkedObject",
        values: {},
        visible: true
      },
      {
        behavior: {
          zone: {
            acceptedKinds: [],
            acceptedObjectFileNodeIds: [],
            allowRemove: true,
            sideOnEnter: "preserve",
            slotOccupancy: "single",
            ...zoneBehavior
          }
        },
        id: "zone-item",
        name: "Zone",
        sourceObjectFileNodeId: "zone-file",
        transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 100, y: 100 },
        type: "linkedObject",
        values: {},
        visible: true
      }
    ]
  };
  const fileTree: ProjectFileNode[] = [
    {
      id: "objects",
      name: "Objects",
      type: "folder",
      children: [
        { id: "card-file", kind: "object", name: "Card", objectTree: [card], type: "file" },
        { id: "token-file", kind: "object", name: "Token", objectTree: [token], type: "file" },
        { id: "deck-file", kind: "object", name: "Deck", objectTree: [deck], type: "file" },
        { id: "zone-file", kind: "object", name: "Zone", objectTree: [zone], type: "file" }
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

function createScoreTrackSession() {
  const scoreTrack = createDefaultProjectObjectNode("score-root", "scoreTrack", "Score");
  scoreTrack.components = {
    ...scoreTrack.components,
    scoreTrack: {
      markers: [
        { color: "#dc2626", id: "player-1", label: "Player 1", value: 0 },
        { color: "#2563eb", id: "player-2", label: "Player 2", value: 2 }
      ],
      maxValue: 2,
      minValue: 0,
      orientation: "horizontal",
      showLabels: true,
      step: 1
    }
  };
  const tableSetup: ProjectTableSetup = {
    ...getDefaultProjectTableSetup(),
    items: [
      {
        id: "score-item",
        name: "Score",
        sourceObjectFileNodeId: "score-file",
        transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
        type: "linkedObject",
        values: {},
        visible: true
      }
    ]
  };
  const fileTree: ProjectFileNode[] = [
    {
      id: "objects",
      name: "Objects",
      type: "folder",
      children: [
        {
          id: "score-file",
          kind: "object",
          name: "Score",
          objectTree: [scoreTrack],
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

function createZoneSession({
  tableOrder = "zoneFirst",
  zoneBehavior = {},
  zoneMode
}: {
  tableOrder?: "zoneFirst" | "zoneLast";
  zoneBehavior?: Partial<NonNullable<ProjectTableSetupItemBehavior["zone"]>>;
  zoneMode: ProjectObjectZoneMode;
}) {
  const card = createDefaultProjectObjectNode("card-root", "card", "Card");
  const token = createDefaultProjectObjectNode("token-root", "token", "Token");
  const zone = createDefaultProjectObjectNode("zone-root", "zone", "Zone");
  zone.components = {
    ...zone.components,
    appearance: {
      ...zone.components!.appearance!,
      padding: 0
    },
    layout: {
      ...zone.components!.layout!,
      gap: 10,
      mode: "horizontal"
    },
    zone: {
      mode: zoneMode,
      sizeReferenceObjectFileId: zoneMode === "slots" ? "card-file" : "",
      slots: 2
    }
  };

  const zoneItem: ProjectTableSetupLinkedObjectItem = {
    behavior: {
      zone: {
        acceptedObjectFileNodeIds: [],
        acceptedKinds: [],
        allowRemove: true,
        sideOnEnter: "preserve",
        slotOccupancy: "single",
        ...zoneBehavior
      }
    },
    id: "zone-item",
    name: "Zone",
    sourceObjectFileNodeId: "zone-file",
    transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 100, y: 100 },
    type: "linkedObject",
    values: {},
    visible: true
  };
  const cardItem: ProjectTableSetupLinkedObjectItem = {
    id: "card-item",
    name: "Card",
    sourceObjectFileNodeId: "card-file",
    transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
    type: "linkedObject",
    values: {},
    visible: true
  };
  const tokenItem: ProjectTableSetupLinkedObjectItem = {
    id: "token-item",
    name: "Token",
    sourceObjectFileNodeId: "token-file",
    transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 220 },
    type: "linkedObject",
    values: {},
    visible: true
  };
  const tableSetup: ProjectTableSetup = {
    ...getDefaultProjectTableSetup(),
    items:
      tableOrder === "zoneFirst" ? [zoneItem, cardItem, tokenItem] : [cardItem, tokenItem, zoneItem]
  };
  const fileTree: ProjectFileNode[] = [
    {
      id: "objects",
      name: "Objects",
      type: "folder",
      children: [
        { id: "card-file", kind: "object", name: "Card", objectTree: [card], type: "file" },
        { id: "token-file", kind: "object", name: "Token", objectTree: [token], type: "file" },
        { id: "zone-file", kind: "object", name: "Zone", objectTree: [zone], type: "file" }
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

function createDeterministicId(prefix = "id") {
  let index = 0;

  return () => `${prefix}-${index++}`;
}
