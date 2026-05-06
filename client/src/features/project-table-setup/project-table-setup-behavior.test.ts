import { createDefaultProjectObjectNode } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  getProjectTableSetupItemBehavior,
  getSupportedProjectTableSetupItemBehaviorKeys
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
      "interaction",
      "visibility",
      "side"
    ]);
    expect(behavior).toMatchObject({
      interaction: { interactableInPlaytest: true },
      movement: { movableInPlaytest: true },
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
        movement: { movableInPlaytest: false }
      },
      object: label
    });

    expect(behavior).toEqual({
      interaction: { interactableInPlaytest: true },
      movement: { movableInPlaytest: false },
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
});
