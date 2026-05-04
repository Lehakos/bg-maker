import type { ProjectFileNode, ProjectObjectNode } from "@bg-maker/shared";
import { getDefaultProjectTableSetup } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import { getDraggedProjectObjectRectTransform } from "../project-workspace/transform-drag-helpers";
import {
  createProjectTableSetupLinkedObjectItem,
  createProjectTableSetupLinkedObjectItemAtPoint,
  createProjectTableSetupLocalObjectItem,
  getProjectTableSetupWithDuplicatedItems,
  getProjectTableSetupWithAddedItem,
  getProjectTableSetupWithItemLocked,
  getProjectTableSetupWithLocalObjectTree,
  getProjectTableSetupWithItemTransform,
  getProjectTableSetupWithReorderedItem,
  getProjectTableSetupWithMovedItem,
  getProjectTableSetupWithRemovedItem
} from "./project-table-setup";
import { renameProjectObjectNode } from "../project-objects/project-object-tree";
import {
  getProjectTableSetupWithAlignedItems,
  getProjectTableSetupWithDistributedItems,
  getProjectTableSetupWithTransformedGroupItems
} from "./project-table-setup-geometry";

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

  it("creates dropped linked objects at the table point and snaps to grid", () => {
    const fileTree = [
      objectFile("card-file", "Card", {
        id: "card-root",
        kind: "card",
        name: "Card root",
        visible: true
      })
    ];
    const tableSetup = {
      ...getDefaultProjectTableSetup(),
      grid: {
        size: 50,
        snap: true,
        visible: true
      }
    };
    const item = createProjectTableSetupLinkedObjectItemAtPoint(fileTree, "card-file", tableSetup, {
      x: 74,
      y: -126
    });

    expect(item).toMatchObject({
      sourceObjectFileNodeId: "card-file",
      transform: { x: 50, y: -150 },
      type: "linkedObject"
    });
    expect(
      createProjectTableSetupLinkedObjectItemAtPoint([], "missing-file", tableSetup, {
        x: 74,
        y: -126
      })
    ).toBeNull();
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

  it("duplicates, locks, and z-orders table setup items", () => {
    const firstItem = createProjectTableSetupLocalObjectItem("label");
    const secondItem = createProjectTableSetupLocalObjectItem("zone");
    const firstItemId = firstItem.type === "localObject" ? firstItem.object.id : firstItem.id;
    const secondItemId = secondItem.type === "localObject" ? secondItem.object.id : secondItem.id;
    const tableSetup = {
      ...getDefaultProjectTableSetup(),
      items: [firstItem, secondItem]
    };
    const duplicated = getProjectTableSetupWithDuplicatedItems(tableSetup, [firstItemId]);
    const duplicateId = duplicated.itemIds[0]!;
    const locked = getProjectTableSetupWithItemLocked(duplicated.tableSetup, duplicateId, true);
    const reordered = getProjectTableSetupWithReorderedItem(tableSetup, firstItemId, "sendFront");

    expect(duplicated.tableSetup.items.map((item) => getItemId(item))).toEqual([
      firstItemId,
      duplicateId,
      secondItemId
    ]);
    expect(duplicateId).not.toBe(firstItemId);
    expect(getItemId(locked.items[1]!)).toBe(duplicateId);
    expect(locked.items[1]).toMatchObject({ object: { locked: true } });
    expect(reordered.items.map(getItemId)).toEqual([secondItemId, firstItemId]);
  });

  it("updates only the selected local table setup object tree", () => {
    const firstItem = createProjectTableSetupLocalObjectItem("group");
    const secondItem = createProjectTableSetupLocalObjectItem("group");

    if (firstItem.type !== "localObject" || secondItem.type !== "localObject") {
      throw new Error("Expected local objects");
    }

    const firstChild = {
      id: "first-child",
      kind: "label" as const,
      name: "First child",
      visible: true
    };
    const secondChild = {
      id: "second-child",
      kind: "label" as const,
      name: "Second child",
      visible: true
    };
    const tableSetup = {
      ...getDefaultProjectTableSetup(),
      items: [
        {
          ...firstItem,
          object: {
            ...firstItem.object,
            children: [firstChild]
          }
        },
        {
          ...secondItem,
          object: {
            ...secondItem.object,
            children: [secondChild]
          }
        }
      ]
    };
    const nextObjectTree = renameProjectObjectNode(
      [tableSetup.items[0]!.type === "localObject" ? tableSetup.items[0]!.object : firstItem.object],
      "first-child",
      "Renamed child"
    );
    const updatedTableSetup = getProjectTableSetupWithLocalObjectTree(
      tableSetup,
      firstItem.object.id,
      nextObjectTree
    );

    expect(updatedTableSetup.items[0]).toMatchObject({
      object: {
        children: [{ id: "first-child", name: "Renamed child" }]
      },
      type: "localObject"
    });
    expect(updatedTableSetup.items[1]).toMatchObject({
      object: {
        children: [{ id: "second-child", name: "Second child" }]
      },
      type: "localObject"
    });
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

  it("aligns selected items to table bounds and distributes unlocked table setup items", () => {
    const firstItem = createProjectTableSetupLocalObjectItem("label");
    const secondItem = createProjectTableSetupLocalObjectItem("label");
    const thirdItem = createProjectTableSetupLocalObjectItem("label");
    const fileTree: ProjectFileNode[] = [];
    const tableSetup = {
      ...getDefaultProjectTableSetup(),
      items: [firstItem, secondItem, thirdItem]
    };
    const ids = tableSetup.items.map(getItemId);
    const positioned = ids.reduce(
      (currentTableSetup, itemId, index) =>
        getProjectTableSetupWithItemTransform(currentTableSetup, itemId, {
          height: 20,
          pivotX: 0.5,
          pivotY: 0.5,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          width: 40,
          x: index === 2 ? 200 : index * 50,
          y: index * 30
        }),
      tableSetup
    );
    const aligned = getProjectTableSetupWithAlignedItems({
      alignment: "top",
      fileTree,
      itemIds: ids,
      tableSetup: positioned
    });
    const alignedSingle = getProjectTableSetupWithAlignedItems({
      alignment: "right",
      fileTree,
      itemIds: [ids[0]!],
      tableSetup: positioned
    });
    const distributed = getProjectTableSetupWithDistributedItems({
      direction: "horizontal",
      fileTree,
      itemIds: ids,
      tableSetup: positioned
    });
    const distributedPair = getProjectTableSetupWithDistributedItems({
      direction: "horizontal",
      fileTree,
      itemIds: ids.slice(0, 2),
      tableSetup: positioned
    });

    expect(
      aligned.items.map((item) =>
        item.type === "localObject" ? item.object.components?.rectTransform?.y : null
      )
    ).toEqual([-290, -290, -290]);
    expect(
      alignedSingle.items.map((item) =>
        item.type === "localObject" ? item.object.components?.rectTransform?.x : null
      )
    ).toEqual([430, 50, 200]);
    expect(
      distributed.items.map((item) =>
        item.type === "localObject" ? item.object.components?.rectTransform?.x : null
      )
    ).toEqual([-430, 0, 430]);
    expect(
      distributedPair.items.map((item) =>
        item.type === "localObject" ? item.object.components?.rectTransform?.x : null
      )
    ).toEqual([-430, 430, 200]);
  });

  it("transforms unlocked selected table setup items as a group", () => {
    const firstItem = createProjectTableSetupLocalObjectItem("label");
    const secondItem = createProjectTableSetupLocalObjectItem("label");
    const lockedItem = createProjectTableSetupLocalObjectItem("label");
    const fileTree: ProjectFileNode[] = [];
    const tableSetup = {
      ...getDefaultProjectTableSetup(),
      items: [firstItem, secondItem, lockedItem]
    };
    const ids = tableSetup.items.map(getItemId);
    const positioned = ids.reduce(
      (currentTableSetup, itemId, index) =>
        getProjectTableSetupWithItemTransform(currentTableSetup, itemId, {
          height: 20,
          pivotX: 0.5,
          pivotY: 0.5,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          width: 40,
          x: index * 50,
          y: index * 30
        }),
      tableSetup
    );
    const locked = getProjectTableSetupWithItemLocked(positioned, ids[2]!, true);
    const transformed = getProjectTableSetupWithTransformedGroupItems({
      after: {
        height: 30,
        pivotX: 0.5,
        pivotY: 0.5,
        rotation: 15,
        scaleX: 1,
        scaleY: 1,
        width: 50,
        x: 10,
        y: 20
      },
      before: {
        height: 20,
        pivotX: 0.5,
        pivotY: 0.5,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        width: 40,
        x: 0,
        y: 0
      },
      fileTree,
      itemIds: ids,
      sourceItemId: ids[0]!,
      tableSetup: locked
    });

    expect(
      transformed.items.map((item) =>
        item.type === "localObject" ? item.object.components?.rectTransform : null
      )
    ).toMatchObject([
      { height: 30, rotation: 15, width: 50, x: 10, y: 20 },
      { height: 30, rotation: 15, width: 50, x: 60, y: 50 },
      { height: 20, rotation: 0, width: 40, x: 100, y: 60 }
    ]);
  });
});

function getItemId(item: ReturnType<typeof createProjectTableSetupLocalObjectItem>) {
  return item.type === "localObject" ? item.object.id : item.id;
}
