import type { ProjectFileNode, ProjectObjectNode } from "@bg-maker/shared";
import { getDefaultProjectTableSetup } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import { getDraggedProjectObjectRectTransform } from "../project-workspace/transform-drag-helpers";
import {
  createProjectTableSetupLinkedObjectItem,
  createProjectTableSetupLocalObjectItem,
  getProjectTableSetupWithAddedItem,
  getProjectTableSetupWithItemTransform,
  getProjectTableSetupWithMovedItem,
  getProjectTableSetupWithRemovedItem
} from "./project-table-setup";

function objectFile(id: string, name: string, object: ProjectObjectNode): ProjectFileNode {
  return {
    id,
    kind: "object",
    name,
    objectTree: [object],
    type: "file"
  };
}

describe("project table setup helpers", () => {
  it("adds linked objects and local primitives to table setup items", () => {
    const fileTree = [
      objectFile("card-file", "Card", {
        id: "card-root",
        kind: "card",
        name: "Card root",
        visible: true
      })
    ];
    const tableSetup = getDefaultProjectTableSetup();
    const linkedItem = createProjectTableSetupLinkedObjectItem(fileTree, "card-file");
    const localItem = createProjectTableSetupLocalObjectItem("zone");

    expect(linkedItem).toMatchObject({
      name: "Card",
      sourceObjectFileNodeId: "card-file",
      transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
      type: "linkedObject",
      values: {},
      visible: true
    });
    expect(localItem).toMatchObject({
      object: {
        kind: "zone",
        visible: true
      },
      type: "localObject"
    });

    const withLinkedItem = getProjectTableSetupWithAddedItem(tableSetup, linkedItem!);
    const withBothItems = getProjectTableSetupWithAddedItem(withLinkedItem, localItem);

    expect(withBothItems.items).toHaveLength(2);
  });

  it("reorders and removes table setup items", () => {
    const firstItem = createProjectTableSetupLocalObjectItem("label");
    const secondItem = createProjectTableSetupLocalObjectItem("zone");
    const tableSetup = {
      ...getDefaultProjectTableSetup(),
      items: [firstItem, secondItem]
    };
    const firstItemId = firstItem.type === "localObject" ? firstItem.object.id : firstItem.id;
    const secondItemId = secondItem.type === "localObject" ? secondItem.object.id : secondItem.id;
    const movedTableSetup = getProjectTableSetupWithMovedItem(tableSetup, secondItemId, -1);
    const removedTableSetup = getProjectTableSetupWithRemovedItem(movedTableSetup, secondItemId);

    expect(
      movedTableSetup.items.map((item) => (item.type === "localObject" ? item.object.id : item.id))
    ).toEqual([secondItemId, firstItemId]);
    expect(
      removedTableSetup.items.map((item) =>
        item.type === "localObject" ? item.object.id : item.id
      )
    ).toEqual([firstItemId]);
  });

  it("updates linked item scale and local primitive size separately", () => {
    const linkedItem = {
      id: "linked-1",
      name: "Linked",
      sourceObjectFileNodeId: "source-1",
      transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
      type: "linkedObject" as const,
      values: {},
      visible: true
    };
    const localItem = createProjectTableSetupLocalObjectItem("label");
    const tableSetup = {
      ...getDefaultProjectTableSetup(),
      items: [linkedItem, localItem]
    };
    const localItemId = localItem.type === "localObject" ? localItem.object.id : localItem.id;
    const linkedTableSetup = getProjectTableSetupWithItemTransform(tableSetup, "linked-1", {
      rotation: 0,
      scaleX: 1.5,
      scaleY: 0.75,
      x: 10,
      y: 20
    });
    const localTableSetup = getProjectTableSetupWithItemTransform(linkedTableSetup, localItemId, {
      height: 48,
      pivotX: 0.5,
      pivotY: 0.5,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      width: 160,
      x: 12,
      y: 24
    });

    expect(localTableSetup.items[0]).toMatchObject({
      transform: { scaleX: 1.5, scaleY: 0.75, x: 10, y: 20 }
    });
    expect(localTableSetup.items[1]).toMatchObject({
      object: {
        components: {
          rectTransform: {
            height: 48,
            width: 160,
            x: 12,
            y: 24
          }
        }
      }
    });
  });

  it("snaps moved table item transforms to the grid", () => {
    const transform = getDraggedProjectObjectRectTransform(
      "move",
      {
        height: 50,
        pivotX: 0.5,
        pivotY: 0.5,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        width: 50,
        x: 0,
        y: 0
      },
      74,
      126,
      0,
      { snapSize: 50 }
    );

    expect(transform).toMatchObject({ x: 50, y: 150 });
  });
});
