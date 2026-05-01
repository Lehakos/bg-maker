import type {
  ProjectFileKind,
  ProjectFileNode,
  ProjectObjectKind,
  ProjectObjectNode,
  ProjectObjectRectTransform
} from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  appendProjectObjectNode,
  deleteProjectObjectNode,
  findProjectObjectNode,
  findProjectObjectNodeLocation,
  getExpandableProjectObjectNodeIds,
  getProjectObjectNodeChildren,
  getProjectObjectNodeRectTransform,
  moveProjectObjectNode,
  renameProjectObjectNode,
  setProjectObjectNodeRectTransform,
  setProjectObjectNodeVisibility,
  updateProjectFileNodeObjectTree
} from "./project-object-tree";

function objectNode(
  id: string,
  name: string,
  kind: ProjectObjectKind = "group",
  children: ProjectObjectNode[] = []
): ProjectObjectNode {
  return {
    children,
    id,
    kind,
    name,
    visible: true
  };
}

function fileNode(
  id: string,
  kind: ProjectFileKind,
  objectTree?: ProjectObjectNode[]
): ProjectFileNode {
  return {
    id,
    kind,
    name: id,
    objectTree,
    type: "file"
  };
}

function folderNode(id: string, children: ProjectFileNode[]): ProjectFileNode {
  return {
    children,
    id,
    name: id,
    type: "folder"
  };
}

function createObjectTree() {
  return [
    objectNode("card-1", "Card", "card"),
    objectNode("group-1", "Group", "group", [
      objectNode("token-1", "Token", "token"),
      objectNode("group-2", "Subgroup", "group", [objectNode("die-1", "Die", "die")])
    ])
  ];
}

describe("project object tree helpers", () => {
  it("finds nested objects and reports their location", () => {
    const objectTree = createObjectTree();

    expect(findProjectObjectNode(objectTree, "die-1")?.name).toBe("Die");
    expect(findProjectObjectNodeLocation(objectTree, "die-1")).toMatchObject({
      ancestors: ["group-1", "group-2"],
      index: 0,
      parentId: "group-2"
    });
    expect(findProjectObjectNode(objectTree, "missing-object")).toBeUndefined();
  });

  it("returns child and expandable object ids from nested trees", () => {
    const objectTree = createObjectTree();

    expect(getProjectObjectNodeChildren(objectTree, null)).toBe(objectTree);
    expect(getProjectObjectNodeChildren(objectTree, "group-1").map((node) => node.id)).toEqual([
      "token-1",
      "group-2"
    ]);
    expect(getProjectObjectNodeChildren(objectTree, "missing-object")).toEqual([]);
    expect([...getExpandableProjectObjectNodeIds(objectTree)]).toEqual(["group-1", "group-2"]);
  });

  it("appends, deletes, and renames objects without mutating the original tree", () => {
    const objectTree = createObjectTree();
    const newObject = objectNode("counter-1", "Counter", "counter");
    const appendedTree = appendProjectObjectNode(objectTree, "group-1", newObject);
    const renamedTree = renameProjectObjectNode(objectTree, "token-1", "Renamed token");
    const deletedTree = deleteProjectObjectNode(objectTree, "group-2");

    expect(getProjectObjectNodeChildren(appendedTree, "group-1").map((node) => node.id)).toEqual([
      "token-1",
      "group-2",
      "counter-1"
    ]);
    expect(renameProjectObjectNode(objectTree, "missing-object", "No change")).toBe(objectTree);
    expect(findProjectObjectNode(renamedTree, "token-1")?.name).toBe("Renamed token");
    expect(findProjectObjectNode(objectTree, "token-1")?.name).toBe("Token");
    expect(findProjectObjectNode(deletedTree, "group-2")).toBeUndefined();
    expect(deleteProjectObjectNode(objectTree, "missing-object")).toBe(objectTree);
  });

  it("moves objects to valid positions and rejects invalid moves", () => {
    const objectTree = createObjectTree();
    const movedTree = moveProjectObjectNode(objectTree, "die-1", null, 1);

    expect(movedTree.map((node) => node.id)).toEqual(["card-1", "die-1", "group-1"]);
    expect(findProjectObjectNodeLocation(movedTree, "die-1")?.parentId).toBeNull();
    expect(moveProjectObjectNode(objectTree, "missing-object", null, 0)).toBe(objectTree);
    expect(moveProjectObjectNode(objectTree, "group-1", "die-1", 0)).toBe(objectTree);
    expect(moveProjectObjectNode(objectTree, "card-1", null, 1)).toBe(objectTree);
  });

  it("updates visibility and transforms only when the target object exists", () => {
    const objectTree = createObjectTree();
    const rectTransform: ProjectObjectRectTransform = {
      height: 120,
      pivotX: 0.5,
      pivotY: 0.5,
      rotation: 15,
      scaleX: 2,
      scaleY: 2,
      width: 80,
      x: 10,
      y: 20
    };
    const visibilityTree = setProjectObjectNodeVisibility(objectTree, "die-1", false);
    const transformTree = setProjectObjectNodeRectTransform(objectTree, "die-1", rectTransform);

    expect(findProjectObjectNode(visibilityTree, "die-1")?.visible).toBe(false);
    expect(findProjectObjectNode(objectTree, "die-1")?.visible).toBe(true);
    expect(findProjectObjectNode(transformTree, "die-1")?.components?.rectTransform).toEqual(
      rectTransform
    );
    expect(setProjectObjectNodeVisibility(objectTree, "missing-object", false)).toBe(objectTree);
    expect(setProjectObjectNodeRectTransform(objectTree, "missing-object", rectTransform)).toBe(
      objectTree
    );
  });

  it("merges missing rect transform fields with defaults", () => {
    const object = {
      id: "partial-transform",
      kind: "card",
      name: "Partial transform",
      components: { rectTransform: { x: 12 } },
      visible: true
    } as ProjectObjectNode;

    expect(getProjectObjectNodeRectTransform(object)).toEqual({
      height: 350,
      pivotX: 0.5,
      pivotY: 0.5,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      width: 250,
      x: 12,
      y: 0
    });
  });

  it("updates object trees only for supported project file nodes", () => {
    const originalObjectTree = createObjectTree();
    const replacementObjectTree = [objectNode("zone-1", "Zone", "zone")];
    const fileTree = [
      folderNode("folder-1", [
        fileNode("table-setup-1", "tableSetup", originalObjectTree),
        fileNode("image-1", "image")
      ])
    ];
    const updatedFileTree = updateProjectFileNodeObjectTree(
      fileTree,
      "table-setup-1",
      replacementObjectTree
    );

    expect(updatedFileTree[0]?.children?.[0]?.objectTree).toBe(replacementObjectTree);
    expect(updateProjectFileNodeObjectTree(fileTree, "image-1", replacementObjectTree)).toBe(
      fileTree
    );
    expect(updateProjectFileNodeObjectTree(fileTree, "missing-file", replacementObjectTree)).toBe(
      fileTree
    );
  });
});
