import {
  doesProjectObjectClipChildren,
  type ProjectFileKind,
  type ProjectFileNode,
  type ProjectObjectAppearance,
  type ProjectObjectCard,
  type ProjectObjectImage,
  type ProjectObjectKind,
  type ProjectObjectLayout,
  type ProjectObjectNode,
  type ProjectObjectRectTransform,
  type ProjectObjectShape,
  type ProjectObjectText
} from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  appendProjectObjectNode,
  deleteProjectObjectNode,
  findProjectObjectNode,
  findProjectObjectNodeLocation,
  getExpandableProjectObjectNodeIds,
  getProjectObjectNodeAppearance,
  getProjectObjectNodeCard,
  getProjectObjectNodeChildren,
  getProjectObjectNodeDoubleSide,
  getProjectObjectNodeVisibleChildren,
  getProjectObjectNodeImage,
  getProjectObjectNodeLayout,
  getProjectObjectNodeRectTransform,
  getProjectObjectNodeShape,
  getProjectObjectNodeText,
  moveProjectObjectNode,
  renameProjectObjectNode,
  setProjectObjectNodeAppearance,
  setProjectObjectNodeCard,
  setProjectObjectNodeDoubleSide,
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

  it("locks card dimensions to the selected size preset", () => {
    const objectTree = [objectNode("card-1", "Card", "card")];
    const bridgeCard: ProjectObjectCard = {
      activeSide: "front",
      sizePreset: "bridge"
    };
    const customCard: ProjectObjectCard = {
      activeSide: "front",
      sizePreset: "custom"
    };
    const oversizedRectTransform: ProjectObjectRectTransform = {
      height: 200,
      pivotX: 0.5,
      pivotY: 0.5,
      rotation: 0,
      scaleX: 2,
      scaleY: 3,
      width: 200,
      x: 10,
      y: 20
    };

    const bridgeTree = setProjectObjectNodeCard(objectTree, "card-1", bridgeCard);
    const resizedBridgeTree = setProjectObjectNodeRectTransform(
      bridgeTree,
      "card-1",
      oversizedRectTransform
    );
    const customTree = setProjectObjectNodeCard(resizedBridgeTree, "card-1", customCard);
    const resizedCustomTree = setProjectObjectNodeRectTransform(
      customTree,
      "card-1",
      oversizedRectTransform
    );

    expect(getProjectObjectNodeCard(findProjectObjectNode(bridgeTree, "card-1")!)).toEqual(
      bridgeCard
    );
    expect(getProjectObjectNodeDoubleSide(findProjectObjectNode(bridgeTree, "card-1")!)).toEqual({
      enabled: true
    });
    expect(
      getProjectObjectNodeRectTransform(findProjectObjectNode(resizedBridgeTree, "card-1")!)
    ).toMatchObject({
      height: 89,
      scaleX: 1,
      scaleY: 1,
      width: 57,
      x: 10,
      y: 20
    });
    expect(
      getProjectObjectNodeRectTransform(findProjectObjectNode(resizedCustomTree, "card-1")!)
    ).toMatchObject({
      height: 200,
      scaleX: 2,
      scaleY: 3,
      width: 200
    });
    expect(
      setProjectObjectNodeDoubleSide(objectTree, "card-1", { enabled: false })[0]?.components
        ?.doubleSide
    ).toEqual({ enabled: false });
  });

  it("keeps card children on the active card side", () => {
    const objectTree = [objectNode("card-1", "Card", "card")];
    const frontChild = objectNode("front-label", "Front label", "label");
    const backChild = objectNode("back-label", "Back label", "label");
    const frontTree = appendProjectObjectNode(objectTree, "card-1", frontChild);
    const backCardTree = setProjectObjectNodeCard(frontTree, "card-1", {
      activeSide: "back",
      sizePreset: "poker"
    });
    const backTree = appendProjectObjectNode(backCardTree, "card-1", backChild);
    const card = findProjectObjectNode(backTree, "card-1")!;
    const movedOutTree = moveProjectObjectNode(backTree, "back-label", null, 1);

    expect(findProjectObjectNode(backTree, "front-label")?.cardSide).toBe("front");
    expect(findProjectObjectNode(backTree, "back-label")?.cardSide).toBe("back");
    expect(getProjectObjectNodeVisibleChildren(card).map((child) => child.id)).toEqual([
      "back-label"
    ]);
    expect(findProjectObjectNode(movedOutTree, "back-label")?.cardSide).toBeUndefined();
  });

  it("clips card and shape children by object kind", () => {
    expect(doesProjectObjectClipChildren("card")).toBe(true);
    expect(doesProjectObjectClipChildren("shape")).toBe(true);
    expect(doesProjectObjectClipChildren("group")).toBe(false);
    expect(doesProjectObjectClipChildren("label")).toBe(false);
    expect(doesProjectObjectClipChildren("image")).toBe(false);
  });

  it("stores double-sided card appearance on the active side", () => {
    const objectTree = [objectNode("card-1", "Card", "card")];
    const frontAppearance: ProjectObjectAppearance = {
      backgroundColor: "#f8fafc",
      backgroundOpacity: 1,
      borderColor: "#94a3b8",
      borderRadius: 10,
      borderStyle: "solid",
      borderWidth: 2,
      opacity: 1,
      padding: 6
    };
    const backAppearance: ProjectObjectAppearance = {
      backgroundColor: "#34d399",
      backgroundOpacity: 1,
      borderColor: "#047857",
      borderRadius: 14,
      borderStyle: "dashed",
      borderWidth: 3,
      opacity: 0.9,
      padding: 8
    };
    const frontTree = setProjectObjectNodeAppearance(objectTree, "card-1", frontAppearance);
    const backCardTree = setProjectObjectNodeCard(frontTree, "card-1", {
      activeSide: "back",
      sizePreset: "poker"
    });
    const backTree = setProjectObjectNodeAppearance(backCardTree, "card-1", backAppearance);
    const frontAgainTree = setProjectObjectNodeCard(backTree, "card-1", {
      activeSide: "front",
      sizePreset: "poker"
    });

    expect(getProjectObjectNodeAppearance(findProjectObjectNode(backTree, "card-1")!)).toEqual(
      backAppearance
    );
    expect(
      getProjectObjectNodeAppearance(findProjectObjectNode(frontAgainTree, "card-1")!)
    ).toEqual(frontAppearance);
    expect(
      findProjectObjectNode(frontAgainTree, "card-1")?.components?.doubleSide?.sideComponents
    ).toMatchObject({
      back: { appearance: backAppearance },
      front: { appearance: frontAppearance }
    });
    expect(
      findProjectObjectNode(frontAgainTree, "card-1")?.components?.appearance
    ).toBeUndefined();
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
      polygonPoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 }
      ],
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
