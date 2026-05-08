import type { ProjectTableSetupItemBehavior } from "@bg-maker/shared";
import { createDefaultProjectObjectNode } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  cloneProjectTableSetupItemBehavior,
  getProjectTableSetupItemBehavior,
  getSupportedProjectTableSetupItemBehaviorKeys,
  remapProjectTableSetupItemBehaviorCommandTargets
} from "./project-table-setup-behavior";

describe("project table setup behavior", () => {
  it("resolves common and side behavior for double-sided objects", () => {
    const card = createDefaultProjectObjectNode("card-1", "card", "Card");
    const behavior = getProjectTableSetupItemBehavior({
      behavior: {
        side: { initialSide: "back" },
        visibility: { initialHidden: true }
      },
      object: card
    });

    expect(getSupportedProjectTableSetupItemBehaviorKeys(card)).toEqual([
      "movement",
      "rotation",
      "interaction",
      "visibility",
      "side"
    ]);
    expect(behavior).toMatchObject({
      interaction: { interactableInPlaytest: true },
      movement: { movableInPlaytest: true },
      rotation: { rotatableInPlaytest: true, rotationStep: 90 },
      side: { initialSide: "back" },
      visibility: { initialHidden: true }
    });
  });

  it("resolves container defaults by object kind", () => {
    const deck = createDefaultProjectObjectNode("deck-1", "deck", "Deck");
    const bag = createDefaultProjectObjectNode("bag-1", "bag", "Bag");

    expect(getProjectTableSetupItemBehavior({ object: deck }).container).toMatchObject({
      drawOrder: "top",
      drawnItemSide: "front",
      shuffleOnStart: false
    });
    expect(getProjectTableSetupItemBehavior({ object: bag }).container).toMatchObject({
      drawOrder: "random",
      drawnItemSide: "front",
      shuffleOnStart: false
    });
  });

  it("ignores stale unsupported behavior keys and normalizes invalid values", () => {
    const label = createDefaultProjectObjectNode("label-1", "label", "Label");
    const behavior = getProjectTableSetupItemBehavior({
      behavior: {
        container: {
          drawOrder: "random",
          drawnItemSide: "back",
          shuffleOnStart: true
        },
        side: { initialSide: "back" },
        movement: { movableInPlaytest: false },
        rotation: { rotatableInPlaytest: false, rotationStep: 37.5 }
      },
      object: label
    });

    expect(behavior).toEqual({
      interaction: { interactableInPlaytest: true },
      movement: { movableInPlaytest: false },
      rotation: { rotatableInPlaytest: false, rotationStep: 38 },
      visibility: { initialHidden: false }
    });
  });

  it("supports zone behavior only for zone objects", () => {
    const zone = createDefaultProjectObjectNode("zone-1", "zone", "Zone");
    const card = createDefaultProjectObjectNode("card-1", "card", "Card");
    const behavior = getProjectTableSetupItemBehavior({
      behavior: {
        zone: {
          acceptedObjectFileNodeIds: [" card-file ", "card-file", ""],
          acceptedKinds: ["card", "zone", "card"],
          allowRemove: false,
          sideOnEnter: "back",
          slotOccupancy: "stack"
        }
      },
      object: zone
    });

    expect(getSupportedProjectTableSetupItemBehaviorKeys(zone)).toEqual([
      "movement",
      "rotation",
      "interaction",
      "visibility",
      "zone"
    ]);
    expect(behavior.zone).toEqual({
      acceptedObjectFileNodeIds: ["card-file"],
      acceptedKinds: ["card"],
      allowRemove: false,
      sideOnEnter: "back",
      slotOccupancy: "stack"
    });
    expect(
      getProjectTableSetupItemBehavior({
        behavior: {
          zone: {
            acceptedObjectFileNodeIds: ["card-file"],
            acceptedKinds: ["card"],
            allowRemove: false,
            sideOnEnter: "back",
            slotOccupancy: "stack"
          }
        },
        object: card
      }).zone
    ).toBeUndefined();
  });

  it("normalizes zone behavior defaults", () => {
    const zone = createDefaultProjectObjectNode("zone-1", "zone", "Zone");

    expect(getProjectTableSetupItemBehavior({ object: zone }).zone).toEqual({
      acceptedObjectFileNodeIds: [],
      acceptedKinds: [],
      allowRemove: true,
      sideOnEnter: "preserve",
      slotOccupancy: "single"
    });
  });

  it("normalizes container commands and drops missing targets", () => {
    const deck = createDefaultProjectObjectNode("deck-1", "deck", "Deck");
    const card = createDefaultProjectObjectNode("card-1", "card", "Card");
    const behavior = getProjectTableSetupItemBehavior({
      behavior: {
        commands: [
          {
            count: 2.6,
            drawOrder: "sideways",
            drawnItemSide: "edge",
            id: " draw-zone ",
            label: " Draw to Market ",
            targetItemId: "zone-item",
            type: "drawFromContainerToTargetZone"
          },
          {
            drawOrder: "random",
            drawnItemSide: "back",
            id: "missing-target",
            label: "Missing",
            targetItemId: "missing-zone",
            type: "refillTargetZoneFromContainer"
          },
          {
            count: 1200,
            drawOrder: "random",
            drawnItemSide: "back",
            id: "offset",
            label: " ",
            offset: { x: 12.4, y: Number.POSITIVE_INFINITY },
            type: "drawFromContainerToTableOffset"
          }
        ] as unknown as ProjectTableSetupItemBehavior["commands"]
      },
      object: deck,
      tableSetupItemIds: ["deck-item", "zone-item"]
    });

    expect(behavior.commands).toEqual([
      {
        count: 3,
        drawOrder: "top",
        drawnItemSide: "front",
        id: "draw-zone",
        label: "Draw to Market",
        targetItemId: "zone-item",
        type: "drawFromContainerToTargetZone"
      },
      {
        count: 999,
        drawOrder: "random",
        drawnItemSide: "back",
        id: "offset",
        label: "Draw",
        offset: { x: 12, y: 0 },
        type: "drawFromContainerToTableOffset"
      }
    ]);
    expect(
      getProjectTableSetupItemBehavior({
        behavior: { commands: behavior.commands },
        object: card,
        tableSetupItemIds: ["zone-item"]
      }).commands
    ).toBeUndefined();
  });

  it("clones and remaps command targets without sharing nested state", () => {
    const behavior: ProjectTableSetupItemBehavior = {
      commands: [
        {
          count: 1,
          drawOrder: "top",
          drawnItemSide: "front",
          id: "offset",
          label: "Draw",
          offset: { x: 96, y: 32 },
          type: "drawFromContainerToTableOffset"
        },
        {
          drawOrder: "top",
          drawnItemSide: "front",
          id: "refill",
          label: "Refill",
          refillMode: "emptySlots",
          targetItemId: "zone-item",
          type: "refillTargetZoneFromContainer"
        }
      ]
    };
    const cloned = cloneProjectTableSetupItemBehavior(behavior);
    const offsetCommand = cloned?.commands?.[0];

    if (offsetCommand?.type !== "drawFromContainerToTableOffset") {
      throw new Error("Expected offset command");
    }

    offsetCommand.offset.x = 12;

    const originalOffsetCommand = behavior.commands?.[0];

    expect(
      originalOffsetCommand?.type === "drawFromContainerToTableOffset"
        ? originalOffsetCommand.offset.x
        : null
    ).toBe(96);
    expect(
      remapProjectTableSetupItemBehaviorCommandTargets(
        cloned,
        new Map([["zone-item", "zone-copy"]])
      )?.commands?.[1]
    ).toMatchObject({
      targetItemId: "zone-copy"
    });
  });
});
