import type {
  ProjectFileKind,
  ProjectFileNode,
  ProjectObjectAppearance,
  ProjectObjectImage,
  ProjectObjectKind,
  ProjectObjectLayout,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectShape,
  ProjectObjectText
} from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  appendProjectObjectNode,
  deleteProjectObjectNode,
  findProjectObjectNode,
  findProjectObjectNodeLocation,
  getExpandableProjectObjectNodeIds,
  getProjectObjectNodeAppearance,
  getProjectObjectNodeChildren,
  getProjectObjectNodeImage,
  getProjectObjectNodeLayout,
  getProjectObjectNodeRectTransform,
  getProjectObjectNodeShape,
  getProjectObjectNodeText,
  moveProjectObjectNode,
  renameProjectObjectNode,
  setProjectObjectNodeAppearance,
  setProjectObjectNodeImage,
  setProjectObjectNodeLayout,
  setProjectObjectNodeRectTransform,
  setProjectObjectNodeShape,
  setProjectObjectNodeText,
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
    objectNode("shape-1", "Shape", "shape"),
    objectNode("group-1", "Group", "group", [
      objectNode("label-1", "Label", "label"),
      objectNode("group-2", "Subgroup", "group", [objectNode("image-1", "Image", "image")])
    ])
  ];
}

describe("project object tree helpers", () => {
  it("finds nested objects and reports their location", () => {
    const objectTree = createObjectTree();

    expect(findProjectObjectNode(objectTree, "image-1")?.name).toBe("Image");
    expect(findProjectObjectNodeLocation(objectTree, "image-1")).toMatchObject({
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
      "label-1",
      "group-2"
    ]);
    expect(getProjectObjectNodeChildren(objectTree, "missing-object")).toEqual([]);
    expect([...getExpandableProjectObjectNodeIds(objectTree)]).toEqual(["group-1", "group-2"]);
  });

  it("appends, deletes, and renames objects without mutating the original tree", () => {
    const objectTree = createObjectTree();
    const newObject = objectNode("shape-2", "Shape", "shape");
    const appendedTree = appendProjectObjectNode(objectTree, "group-1", newObject);
    const renamedTree = renameProjectObjectNode(objectTree, "label-1", "Renamed label");
    const deletedTree = deleteProjectObjectNode(objectTree, "group-2");

    expect(getProjectObjectNodeChildren(appendedTree, "group-1").map((node) => node.id)).toEqual([
      "label-1",
      "group-2",
      "shape-2"
    ]);
    expect(renameProjectObjectNode(objectTree, "missing-object", "No change")).toBe(objectTree);
    expect(findProjectObjectNode(renamedTree, "label-1")?.name).toBe("Renamed label");
    expect(findProjectObjectNode(objectTree, "label-1")?.name).toBe("Label");
    expect(findProjectObjectNode(deletedTree, "group-2")).toBeUndefined();
    expect(deleteProjectObjectNode(objectTree, "missing-object")).toBe(objectTree);
  });

  it("moves objects to valid positions and rejects invalid moves", () => {
    const objectTree = createObjectTree();
    const movedTree = moveProjectObjectNode(objectTree, "image-1", null, 1);

    expect(movedTree.map((node) => node.id)).toEqual(["shape-1", "image-1", "group-1"]);
    expect(findProjectObjectNodeLocation(movedTree, "image-1")?.parentId).toBeNull();
    expect(moveProjectObjectNode(objectTree, "missing-object", null, 0)).toBe(objectTree);
    expect(moveProjectObjectNode(objectTree, "group-1", "image-1", 0)).toBe(objectTree);
    expect(moveProjectObjectNode(objectTree, "shape-1", null, 1)).toBe(objectTree);
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
    const visibilityTree = setProjectObjectNodeVisibility(objectTree, "image-1", false);
    const transformTree = setProjectObjectNodeRectTransform(objectTree, "image-1", rectTransform);

    expect(findProjectObjectNode(visibilityTree, "image-1")?.visible).toBe(false);
    expect(findProjectObjectNode(objectTree, "image-1")?.visible).toBe(true);
    expect(findProjectObjectNode(transformTree, "image-1")?.components?.rectTransform).toEqual(
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
      kind: "shape",
      name: "Partial transform",
      components: { rectTransform: { x: 12 } },
      visible: true
    } as ProjectObjectNode;

    expect(getProjectObjectNodeRectTransform(object)).toEqual({
      height: 120,
      pivotX: 0.5,
      pivotY: 0.5,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      width: 120,
      x: 12,
      y: 0
    });
  });

  it("merges and updates behavior components without mutating the original tree", () => {
    const objectTree = createObjectTree();
    const appearance: ProjectObjectAppearance = {
      backgroundColor: "#abcdef",
      backgroundOpacity: 0,
      borderColor: "#123456",
      borderRadius: 8,
      borderStyle: "solid",
      borderWidth: 2,
      opacity: 0.8,
      padding: 6
    };
    const text: ProjectObjectText = {
      color: "#111111",
      content: "Updated label",
      fontSize: 18,
      fontStyle: "italic",
      fontWeight: 700,
      lineHeight: 1.3,
      textAlign: "left",
      verticalAlign: "top"
    };
    const image: ProjectObjectImage = {
      assetId: "asset-1",
      fit: "cover",
      positionX: 40,
      positionY: 60
    };
    const layout: ProjectObjectLayout = {
      alignItems: "center",
      columns: 3,
      gap: 16,
      justifyContent: "spaceBetween",
      mode: "horizontal"
    };
    const shape: ProjectObjectShape = {
      variant: "triangle"
    };

    const appearanceTree = setProjectObjectNodeAppearance(objectTree, "shape-1", appearance);
    const textTree = setProjectObjectNodeText(objectTree, "label-1", text);
    const imageTree = setProjectObjectNodeImage(objectTree, "image-1", image);
    const layoutTree = setProjectObjectNodeLayout(objectTree, "group-1", layout);
    const shapeTree = setProjectObjectNodeShape(objectTree, "shape-1", shape);

    expect(
      getProjectObjectNodeAppearance(findProjectObjectNode(appearanceTree, "shape-1")!)
    ).toEqual(appearance);
    expect(getProjectObjectNodeText(findProjectObjectNode(textTree, "label-1")!)).toEqual(text);
    expect(getProjectObjectNodeImage(findProjectObjectNode(imageTree, "image-1")!)).toEqual(image);
    expect(getProjectObjectNodeLayout(findProjectObjectNode(layoutTree, "group-1")!)).toEqual(
      layout
    );
    expect(getProjectObjectNodeShape(findProjectObjectNode(shapeTree, "shape-1")!)).toEqual(shape);
    expect(findProjectObjectNode(objectTree, "image-1")?.components?.image).toBeUndefined();
    expect(setProjectObjectNodeImage(objectTree, "missing-object", image)).toBe(objectTree);
    expect(setProjectObjectNodeLayout(objectTree, "missing-object", layout)).toBe(objectTree);
  });

  it("updates object trees only for supported project file nodes", () => {
    const originalObjectTree = createObjectTree();
    const replacementObjectTree = [objectNode("image-2", "Image", "image")];
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
