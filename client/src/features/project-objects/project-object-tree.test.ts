import {
  doesProjectObjectClipChildren,
  getProjectObjectContainerAcceptedObjectKinds,
  type ProjectFileKind,
  type ProjectFileNode,
  type ProjectObjectAppearance,
  type ProjectObjectBag,
  type ProjectObjectCard,
  type ProjectObjectContainer,
  type ProjectObjectCounter,
  type ProjectObjectDeck,
  type ProjectObjectDie,
  type ProjectObjectImage,
  type ProjectObjectKind,
  type ProjectObjectLayout,
  type ProjectObjectMeeple,
  type ProjectObjectNode,
  type ProjectObjectRectTransform,
  type ProjectObjectShape,
  type ProjectObjectStackDisplay,
  type ProjectObjectText,
  type ProjectObjectZone
} from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  appendProjectObjectNode,
  cloneProjectObjectNode,
  clearProjectObjectTreeActiveSides,
  deleteProjectObjectNode,
  findProjectObjectNode,
  findProjectObjectNodeLocation,
  getExpandableProjectObjectNodeIds,
  getProjectObjectNodeActiveSide,
  getProjectObjectNodeAppearance,
  getProjectObjectNodeBag,
  getProjectObjectNodeCard,
  getProjectObjectNodeContainer,
  getProjectObjectNodeCounter,
  getProjectObjectNodeDeck,
  getProjectObjectNodeDie,
  getProjectObjectNodeChildren,
  getProjectObjectNodeDoubleSide,
  getProjectObjectNodeVisibleChildren,
  getProjectObjectNodeImage,
  getProjectObjectNodeLayout,
  getProjectObjectNodeMeeple,
  getProjectObjectNodeRectTransform,
  getProjectObjectNodeShape,
  getProjectObjectNodeStackDisplay,
  getProjectObjectNodeText,
  getProjectObjectNodeZone,
  getProjectObjectNodeWithActiveSide,
  getProjectObjectTreeWithActiveSides,
  insertProjectObjectNodeAfter,
  moveProjectObjectNode,
  renameProjectObjectNode,
  reorderProjectObjectNode,
  setProjectObjectNodeLocked,
  setProjectObjectNodeAppearance,
  setProjectObjectNodeBag,
  setProjectObjectNodeCard,
  setProjectObjectNodeContainer,
  setProjectObjectNodeCounter,
  setProjectObjectNodeDeck,
  setProjectObjectNodeDie,
  setProjectObjectNodeDoubleSide,
  setProjectObjectNodeImage,
  setProjectObjectNodeLayout,
  setProjectObjectNodeMeeple,
  setProjectObjectNodeRectTransform,
  setProjectObjectNodeShape,
  setProjectObjectNodeStackDisplay,
  setProjectObjectNodeText,
  setProjectObjectNodeVisibility,
  setProjectObjectNodeZone,
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

function objectTreeWithActiveSide(
  objectTree: ProjectObjectNode[],
  objectId: string,
  activeSide: "back" | "front"
) {
  return getProjectObjectTreeWithActiveSides(objectTree, (object) =>
    object.id === objectId ? activeSide : "front"
  );
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

  it("clones objects with fresh ids and inserts duplicates after the source", () => {
    const objectTree = createObjectTree();
    const source = findProjectObjectNode(objectTree, "group-1")!;
    const clonedObject = cloneProjectObjectNode(source, { offset: 24 });
    const duplicatedTree = insertProjectObjectNodeAfter(objectTree, "group-1", clonedObject);

    expect(clonedObject.id).not.toBe(source.id);
    expect(clonedObject.name).toBe("Group Copy");
    expect(clonedObject.children?.map((child) => child.id)).not.toEqual(
      source.children?.map((child) => child.id)
    );
    expect(duplicatedTree.map((node) => node.id)).toEqual([
      "shape-1",
      "group-1",
      clonedObject.id
    ]);
  });

  it("locks objects and reorders unlocked siblings", () => {
    const objectTree = createObjectTree();
    const lockedTree = setProjectObjectNodeLocked(objectTree, "shape-1", true);
    const reorderedTree = reorderProjectObjectNode(objectTree, "shape-1", "sendFront");

    expect(findProjectObjectNode(lockedTree, "shape-1")?.locked).toBe(true);
    expect(reorderedTree.map((node) => node.id)).toEqual(["group-1", "shape-1"]);
    expect(reorderProjectObjectNode(objectTree, "shape-1", "sendBack")).toBe(objectTree);
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
      sizePreset: "bridge"
    };
    const customCard: ProjectObjectCard = {
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
      setProjectObjectNodeDoubleSide(objectTree, "card-1", {
        enabled: false
      })[0]?.components?.doubleSide
    ).toEqual({ enabled: false });
  });

  it("creates deck defaults and locks deck dimensions to the selected size preset", () => {
    const objectTree = [objectNode("deck-1", "Deck", "deck")];
    const bridgeDeck: ProjectObjectDeck = {
      sizePreset: "bridge"
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

    const bridgeTree = setProjectObjectNodeDeck(objectTree, "deck-1", bridgeDeck);
    const resizedBridgeTree = setProjectObjectNodeRectTransform(
      bridgeTree,
      "deck-1",
      oversizedRectTransform
    );
    const deck = findProjectObjectNode(bridgeTree, "deck-1")!;

    expect(getProjectObjectNodeDeck(deck)).toEqual(bridgeDeck);
    expect(getProjectObjectNodeContainer(deck)).toEqual({
      entries: []
    });
    expect(getProjectObjectNodeStackDisplay(deck)).toMatchObject({
      showCount: true,
      visibleItemCount: 4
    });
    expect(
      getProjectObjectNodeRectTransform(findProjectObjectNode(resizedBridgeTree, "deck-1")!)
    ).toMatchObject({
      height: 89,
      scaleX: 1,
      scaleY: 1,
      width: 57,
      x: 10,
      y: 20
    });
  });

  it("creates bag defaults as a free-sized token container", () => {
    const objectTree = [objectNode("bag-1", "Bag", "bag")];
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

    const resizedTree = setProjectObjectNodeRectTransform(
      objectTree,
      "bag-1",
      oversizedRectTransform
    );
    const bag = findProjectObjectNode(resizedTree, "bag-1")!;

    expect(getProjectObjectNodeBag(bag)).toEqual({
      appearanceVariant: "bag"
    });
    expect(getProjectObjectNodeContainer(bag)).toEqual({
      entries: []
    });
    expect(bag.components?.stackDisplay).toBeUndefined();
    expect(getProjectObjectContainerAcceptedObjectKinds("bag")).toEqual(["token", "meeple"]);
    expect(getProjectObjectContainerAcceptedObjectKinds("deck")).toEqual(["card"]);
    expect(getProjectObjectNodeRectTransform(bag)).toMatchObject({
      height: 200,
      scaleX: 2,
      scaleY: 3,
      width: 200,
      x: 10,
      y: 20
    });
  });

  it("creates and updates meeple defaults as a free-sized visual piece", () => {
    const objectTree = [objectNode("meeple-1", "Meeple", "meeple")];
    const coneMeeple: ProjectObjectMeeple = {
      visualVariant: "cone"
    };
    const oversizedRectTransform: ProjectObjectRectTransform = {
      height: 140,
      pivotX: 0.5,
      pivotY: 0.5,
      rotation: 20,
      scaleX: 1.5,
      scaleY: 0.8,
      width: 90,
      x: 10,
      y: 20
    };

    const meepleTree = setProjectObjectNodeMeeple(objectTree, "meeple-1", coneMeeple);
    const resizedTree = setProjectObjectNodeRectTransform(
      meepleTree,
      "meeple-1",
      oversizedRectTransform
    );
    const meeple = findProjectObjectNode(resizedTree, "meeple-1")!;

    expect(getProjectObjectNodeMeeple(objectTree[0]!)).toEqual({
      visualVariant: "meeple"
    });
    expect(getProjectObjectNodeMeeple(meeple)).toEqual(coneMeeple);
    expect(getProjectObjectNodeAppearance(meeple)).toMatchObject({
      backgroundColor: "#fee2e2",
      borderColor: "#dc2626"
    });
    expect(getProjectObjectNodeRectTransform(meeple)).toMatchObject({
      height: 140,
      scaleX: 1.5,
      scaleY: 0.8,
      width: 90,
      x: 10,
      y: 20
    });
    expect(meeple.components?.doubleSide).toBeUndefined();
    expect(meeple.components?.shape).toBeUndefined();
  });

  it("keeps card children on the active card side", () => {
    const objectTree = [objectNode("card-1", "Card", "card")];
    const frontChild = objectNode("front-label", "Front label", "label");
    const backChild = objectNode("back-label", "Back label", "label");
    const frontTree = appendProjectObjectNode(objectTree, "card-1", frontChild);
    const backCardTree = objectTreeWithActiveSide(frontTree, "card-1", "back");
    const backTree = appendProjectObjectNode(backCardTree, "card-1", backChild);
    const card = findProjectObjectNode(backTree, "card-1")!;
    const movedOutTree = moveProjectObjectNode(backTree, "back-label", null, 1);

    expect(findProjectObjectNode(backTree, "front-label")?.parentSide).toBe("front");
    expect(findProjectObjectNode(backTree, "back-label")?.parentSide).toBe("back");
    expect(getProjectObjectNodeVisibleChildren(card).map((child) => child.id)).toEqual([
      "back-label"
    ]);
    expect(findProjectObjectNode(movedOutTree, "back-label")?.parentSide).toBeUndefined();
  });

  it("keeps token children on the active token side", () => {
    const objectTree = [objectNode("token-1", "Token", "token")];
    const frontChild = objectNode("front-image", "Front image", "image");
    const backChild = objectNode("back-label", "Back label", "label");
    const frontTree = appendProjectObjectNode(objectTree, "token-1", frontChild);
    const backTokenTree = objectTreeWithActiveSide(frontTree, "token-1", "back");
    const backTree = appendProjectObjectNode(backTokenTree, "token-1", backChild);
    const token = findProjectObjectNode(backTree, "token-1")!;
    const movedOutTree = moveProjectObjectNode(backTree, "back-label", null, 1);

    expect(getProjectObjectNodeActiveSide(token)).toBe("back");
    expect(findProjectObjectNode(backTree, "front-image")?.parentSide).toBe("front");
    expect(findProjectObjectNode(backTree, "back-label")?.parentSide).toBe("back");
    expect(getProjectObjectNodeVisibleChildren(token).map((child) => child.id)).toEqual([
      "back-label"
    ]);
    expect(findProjectObjectNode(movedOutTree, "back-label")?.parentSide).toBeUndefined();
  });

  it("can preview another active side without mutating the object", () => {
    const objectTree = [objectNode("card-1", "Card", "card")];
    const frontChild = objectNode("front-label", "Front label", "label");
    const backChild = objectNode("back-label", "Back label", "label");
    const frontTree = appendProjectObjectNode(objectTree, "card-1", frontChild);
    const backCardTree = objectTreeWithActiveSide(frontTree, "card-1", "back");
    const backTree = appendProjectObjectNode(backCardTree, "card-1", backChild);
    const card = findProjectObjectNode(backTree, "card-1")!;
    const previewCard = getProjectObjectNodeWithActiveSide(card, "front");

    expect(getProjectObjectNodeActiveSide(card)).toBe("back");
    expect(getProjectObjectNodeVisibleChildren(card).map((child) => child.id)).toEqual([
      "back-label"
    ]);
    expect(getProjectObjectNodeActiveSide(previewCard)).toBe("front");
    expect(getProjectObjectNodeVisibleChildren(previewCard).map((child) => child.id)).toEqual([
      "front-label"
    ]);
    expect(
      findProjectObjectNode(clearProjectObjectTreeActiveSides(backTree), "card-1")?.components
        ?.doubleSide
    ).toEqual({ enabled: true });
  });

  it("clips card, token, counter, die, and shape children by object kind", () => {
    expect(doesProjectObjectClipChildren("bag")).toBe(true);
    expect(doesProjectObjectClipChildren("card")).toBe(true);
    expect(doesProjectObjectClipChildren("deck")).toBe(true);
    expect(doesProjectObjectClipChildren("token")).toBe(true);
    expect(doesProjectObjectClipChildren("meeple")).toBe(true);
    expect(doesProjectObjectClipChildren("counter")).toBe(true);
    expect(doesProjectObjectClipChildren("die")).toBe(true);
    expect(doesProjectObjectClipChildren("shape")).toBe(true);
    expect(doesProjectObjectClipChildren("group")).toBe(false);
    expect(doesProjectObjectClipChildren("label")).toBe(false);
    expect(doesProjectObjectClipChildren("image")).toBe(false);
    expect(doesProjectObjectClipChildren("zone")).toBe(false);
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
    const backCardTree = objectTreeWithActiveSide(frontTree, "card-1", "back");
    const backTree = setProjectObjectNodeAppearance(backCardTree, "card-1", backAppearance);
    const frontAgainTree = objectTreeWithActiveSide(backTree, "card-1", "front");

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
    expect(findProjectObjectNode(frontAgainTree, "card-1")?.components?.appearance).toBeUndefined();
  });

  it("stores token shape as a shared component across both sides", () => {
    const objectTree = [objectNode("token-1", "Token", "token")];
    const frontShape: ProjectObjectShape = {
      polygonPoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 }
      ],
      variant: "triangle"
    };
    const backShape: ProjectObjectShape = {
      polygonPoints: [
        { x: 0, y: 50 },
        { x: 50, y: 0 },
        { x: 100, y: 50 },
        { x: 50, y: 100 }
      ],
      variant: "diamond"
    };
    const frontTree = setProjectObjectNodeShape(objectTree, "token-1", frontShape);
    const backTokenTree = objectTreeWithActiveSide(frontTree, "token-1", "back");
    const backTree = setProjectObjectNodeShape(backTokenTree, "token-1", backShape);
    const frontAgainTree = objectTreeWithActiveSide(backTree, "token-1", "front");
    const token = findProjectObjectNode(frontAgainTree, "token-1");

    expect(getProjectObjectNodeShape(findProjectObjectNode(backTokenTree, "token-1")!)).toEqual(
      frontShape
    );
    expect(getProjectObjectNodeShape(token!)).toEqual(backShape);
    expect(token?.components?.shape).toEqual(backShape);
    expect(token?.components?.doubleSide?.sideComponents).toBeUndefined();
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
    const counter: ProjectObjectCounter = {
      boundsMode: "clamp",
      defaultValue: 5,
      displayMode: "valueAndMax",
      maxValue: 10,
      minValue: 0,
      prefix: "",
      step: 1,
      suffix: " HP"
    };
    const die: ProjectObjectDie = {
      activeFace: 2,
      faceCount: 4,
      faces: [
        { imageAssetId: "", label: "1", mode: "text" },
        { imageAssetId: "asset-1", label: "Skull", mode: "image" },
        { imageAssetId: "", label: "3", mode: "text" },
        { imageAssetId: "", label: "4", mode: "text" }
      ]
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
    const doubleSide = {
      enabled: true
    };
    const deck: ProjectObjectDeck = {
      sizePreset: "custom"
    };
    const bag: ProjectObjectBag = {
      appearanceVariant: "box"
    };
    const meeple: ProjectObjectMeeple = {
      visualVariant: "standee"
    };
    const container: ProjectObjectContainer = {
      entries: [
        { objectFileNodeId: "card-file-1", quantity: 2 },
        { objectFileNodeId: "card-file-2", quantity: 3 }
      ]
    };
    const stackDisplay: ProjectObjectStackDisplay = {
      showCount: false,
      stackOffsetX: 4,
      stackOffsetY: -3,
      visibleItemCount: 6
    };
    const zone: ProjectObjectZone = {
      capacity: 5,
      referenceObjectFileId: "card-file-1"
    };

    const appearanceTree = setProjectObjectNodeAppearance(objectTree, "shape-1", appearance);
    const textTree = setProjectObjectNodeText(objectTree, "label-1", text);
    const imageTree = setProjectObjectNodeImage(objectTree, "image-1", image);
    const counterTree = setProjectObjectNodeCounter(
      [objectNode("counter-1", "Counter", "counter")],
      "counter-1",
      counter
    );
    const dieTree = setProjectObjectNodeDie([objectNode("die-1", "Die", "die")], "die-1", die);
    const layoutTree = setProjectObjectNodeLayout(objectTree, "group-1", layout);
    const shapeTree = setProjectObjectNodeShape(objectTree, "shape-1", shape);
    const tokenTree = setProjectObjectNodeDoubleSide(
      [objectNode("token-1", "Token", "token")],
      "token-1",
      doubleSide
    );
    const deckObjectTree = [objectNode("deck-1", "Deck", "deck")];
    const deckTree = setProjectObjectNodeDeck(deckObjectTree, "deck-1", deck);
    const containerTree = setProjectObjectNodeContainer(deckTree, "deck-1", container);
    const stackDisplayTree = setProjectObjectNodeStackDisplay(
      containerTree,
      "deck-1",
      stackDisplay
    );
    const bagTree = setProjectObjectNodeBag([objectNode("bag-1", "Bag", "bag")], "bag-1", bag);
    const meepleTree = setProjectObjectNodeMeeple(
      [objectNode("meeple-1", "Meeple", "meeple")],
      "meeple-1",
      meeple
    );
    const zoneTree = setProjectObjectNodeZone(
      [objectNode("zone-1", "Zone", "zone")],
      "zone-1",
      zone
    );

    expect(
      getProjectObjectNodeAppearance(findProjectObjectNode(appearanceTree, "shape-1")!)
    ).toEqual(appearance);
    expect(getProjectObjectNodeText(findProjectObjectNode(textTree, "label-1")!)).toEqual(text);
    expect(getProjectObjectNodeImage(findProjectObjectNode(imageTree, "image-1")!)).toEqual(image);
    expect(getProjectObjectNodeCounter(findProjectObjectNode(counterTree, "counter-1")!)).toEqual(
      counter
    );
    expect(getProjectObjectNodeDie(findProjectObjectNode(dieTree, "die-1")!)).toEqual(die);
    expect(getProjectObjectNodeLayout(findProjectObjectNode(layoutTree, "group-1")!)).toEqual(
      layout
    );
    expect(getProjectObjectNodeShape(findProjectObjectNode(shapeTree, "shape-1")!)).toEqual(shape);
    expect(getProjectObjectNodeDoubleSide(findProjectObjectNode(tokenTree, "token-1")!)).toEqual(
      doubleSide
    );
    expect(getProjectObjectNodeDeck(findProjectObjectNode(stackDisplayTree, "deck-1")!)).toEqual(
      deck
    );
    expect(
      getProjectObjectNodeContainer(findProjectObjectNode(stackDisplayTree, "deck-1")!)
    ).toEqual(container);
    expect(
      getProjectObjectNodeStackDisplay(findProjectObjectNode(stackDisplayTree, "deck-1")!)
    ).toEqual(stackDisplay);
    expect(getProjectObjectNodeBag(findProjectObjectNode(bagTree, "bag-1")!)).toEqual(bag);
    expect(getProjectObjectNodeMeeple(findProjectObjectNode(meepleTree, "meeple-1")!)).toEqual(
      meeple
    );
    expect(getProjectObjectNodeZone(findProjectObjectNode(zoneTree, "zone-1")!)).toEqual(zone);
    expect(getProjectObjectNodeLayout(findProjectObjectNode(zoneTree, "zone-1")!)).toMatchObject({
      mode: "grid"
    });
    expect(findProjectObjectNode(objectTree, "image-1")?.components?.image).toBeUndefined();
    expect(setProjectObjectNodeCounter(objectTree, "missing-object", counter)).toBe(objectTree);
    expect(setProjectObjectNodeContainer(objectTree, "missing-object", container)).toBe(
      objectTree
    );
    expect(setProjectObjectNodeBag(objectTree, "missing-object", bag)).toBe(objectTree);
    expect(setProjectObjectNodeMeeple(objectTree, "missing-object", meeple)).toBe(objectTree);
    expect(setProjectObjectNodeDeck(objectTree, "missing-object", deck)).toBe(objectTree);
    expect(setProjectObjectNodeImage(objectTree, "missing-object", image)).toBe(objectTree);
    expect(setProjectObjectNodeDie(objectTree, "missing-object", die)).toBe(objectTree);
    expect(setProjectObjectNodeLayout(objectTree, "missing-object", layout)).toBe(objectTree);
    expect(setProjectObjectNodeStackDisplay(objectTree, "missing-object", stackDisplay)).toBe(
      objectTree
    );
    expect(setProjectObjectNodeZone(objectTree, "missing-object", zone)).toBe(objectTree);
    expect(setProjectObjectNodeDoubleSide(objectTree, "missing-object", doubleSide)).toBe(
      objectTree
    );
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
