import type { ProjectFileKind, ProjectFileNode } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  appendProjectFileNode,
  countProjectFileTreeNodes,
  createProjectAssetsFolderNode,
  createProjectFileNode,
  deleteProjectFileNode,
  duplicateProjectFileNode,
  ensureProjectAssetsFolder,
  findProjectFileNode,
  findProjectFileNodeLocation,
  getProjectFileNodeChildren,
  moveProjectFileNodeToParent,
  renameProjectFileNode,
  sortProjectFileTree
} from "./project-file-tree";

function folder(id: string, name: string, children: ProjectFileNode[] = []): ProjectFileNode {
  return {
    children,
    id,
    name,
    type: "folder"
  };
}

function file(id: string, name: string, kind: ProjectFileKind = "document"): ProjectFileNode {
  return {
    id,
    kind,
    name,
    type: "file"
  };
}

function createFileTree() {
  return [
    file("root-image", "Image 10", "image"),
    folder("folder-beta", "Beta", [
      file("nested-doc", "Nested doc"),
      folder("folder-alpha-child", "Alpha child", [file("deep-object", "Deep object", "object")])
    ]),
    file("root-setup", "Setup", "tableSetup"),
    folder("folder-alpha", "Alpha", [
      file("alpha-image-10", "Image 10", "image"),
      file("alpha-image-2", "Image 2", "image")
    ]),
    file("root-object", "Object", "object"),
    file("root-doc", "Doc")
  ];
}

describe("project file tree helpers", () => {
  it("sorts folders before files, then files by kind and natural name", () => {
    const fileTree = createFileTree();
    const sortedFileTree = sortProjectFileTree(fileTree);

    expect(sortedFileTree.map((node) => node.id)).toEqual([
      "folder-alpha",
      "folder-beta",
      "root-setup",
      "root-object",
      "root-image",
      "root-doc"
    ]);
    expect(
      getProjectFileNodeChildren(sortedFileTree, "folder-alpha").map((node) => node.id)
    ).toEqual(["alpha-image-2", "alpha-image-10"]);
    expect(fileTree.map((node) => node.id)).toEqual([
      "root-image",
      "folder-beta",
      "root-setup",
      "folder-alpha",
      "root-object",
      "root-doc"
    ]);
  });

  it("duplicates file tree nodes with new ids and remaps internal object references", () => {
    const sourceObject = file("source-object", "Source", "object");
    const derivedObject: ProjectFileNode = {
      id: "derived-object",
      kind: "object",
      name: "Derived",
      sourceRef: {
        sourceObjectFileNodeId: "source-object",
        values: {}
      },
      type: "file"
    };
    const fileTree = [folder("bundle", "Bundle", [sourceObject, derivedObject])];
    const result = duplicateProjectFileNode(fileTree, "bundle");

    expect(result).not.toBeNull();
    expect(result?.node).toMatchObject({
      name: "Bundle Copy",
      type: "folder"
    });
    expect(result?.node.id).not.toBe("bundle");

    const duplicatedChildren = result?.node.type === "folder" ? (result.node.children ?? []) : [];
    const duplicatedSource = duplicatedChildren.find((node) => node.name === "Source");
    const duplicatedDerived = duplicatedChildren.find((node) => node.name === "Derived");

    expect(duplicatedSource?.id).toBeTruthy();
    expect(duplicatedSource?.id).not.toBe("source-object");
    expect(duplicatedDerived?.id).not.toBe("derived-object");
    expect(duplicatedDerived?.sourceRef?.sourceObjectFileNodeId).toBe(duplicatedSource?.id);
    expect(findProjectFileNode(fileTree, result!.node.id)).toBeUndefined();
  });

  it("finds nested nodes with parent, index, and ancestor metadata", () => {
    const fileTree = createFileTree();

    expect(findProjectFileNode(fileTree, "deep-object")?.name).toBe("Deep object");
    expect(findProjectFileNodeLocation(fileTree, "deep-object")).toMatchObject({
      ancestors: ["folder-beta", "folder-alpha-child"],
      index: 0,
      parentId: "folder-alpha-child"
    });
    expect(findProjectFileNode(fileTree, "missing-node")).toBeUndefined();
  });

  it("returns children for root and folder parents only", () => {
    const fileTree = createFileTree();

    expect(getProjectFileNodeChildren(fileTree, null)).toBe(fileTree);
    expect(getProjectFileNodeChildren(fileTree, "folder-beta").map((node) => node.id)).toEqual([
      "nested-doc",
      "folder-alpha-child"
    ]);
    expect(getProjectFileNodeChildren(fileTree, "root-image")).toEqual([]);
    expect(getProjectFileNodeChildren(fileTree, "missing-node")).toEqual([]);
  });

  it("appends a node to a folder, sorts the result, and leaves the input tree unchanged", () => {
    const fileTree = createFileTree();
    const newNode = file("new-doc", "A document");
    const nextFileTree = appendProjectFileNode(fileTree, "folder-beta", newNode);

    expect(findProjectFileNode(nextFileTree, "new-doc")).toEqual(newNode);
    expect(getProjectFileNodeChildren(nextFileTree, "folder-beta").map((node) => node.id)).toEqual([
      "folder-alpha-child",
      "new-doc",
      "nested-doc"
    ]);
    expect(findProjectFileNode(fileTree, "new-doc")).toBeUndefined();
  });

  it("creates object files with a visible root object node", () => {
    const objectFile = createProjectFileNode("object", "Title label", {
      objectRootKind: "label"
    });

    expect(objectFile.objectTree).toHaveLength(1);
    expect(objectFile.objectTree?.[0]).toMatchObject({
      children: [],
      kind: "label",
      name: "Title label",
      visible: true,
      components: {
        appearance: {
          backgroundColor: "#ffffff"
        },
        rectTransform: {
          height: 32,
          width: 160
        },
        text: {
          content: "Title label"
        }
      }
    });
  });

  it("creates image file nodes with uploaded asset metadata", () => {
    const imageFile = createProjectFileNode("image", "token.png", {
      imageAsset: {
        id: "asset-1",
        byteSize: 123,
        contentType: "image/png",
        createdAt: "2026-01-01T00:00:00.000Z",
        fileName: "token.png"
      }
    });

    expect(imageFile).toMatchObject({
      imageAsset: {
        id: "asset-1",
        contentType: "image/png",
        fileName: "token.png"
      },
      kind: "image",
      name: "token.png"
    });
  });

  it("renames and deletes nested nodes without mutating the original tree", () => {
    const fileTree = createFileTree();
    const renamedFileTree = renameProjectFileNode(fileTree, "nested-doc", "Renamed doc");
    const deletedFileTree = deleteProjectFileNode(fileTree, "folder-beta");

    expect(findProjectFileNode(renamedFileTree, "nested-doc")?.name).toBe("Renamed doc");
    expect(findProjectFileNode(fileTree, "nested-doc")?.name).toBe("Nested doc");
    expect(findProjectFileNode(deletedFileTree, "folder-beta")).toBeUndefined();
    expect(findProjectFileNode(deletedFileTree, "deep-object")).toBeUndefined();
    expect(countProjectFileTreeNodes(fileTree)).toBe(11);
  });

  it("preserves the protected Assets folder across rename, delete, and move helpers", () => {
    const assetsFolder = createProjectAssetsFolderNode([file("asset-file", "Token", "image")]);
    const fileTree = [folder("folder-alpha", "Alpha"), assetsFolder];

    expect(renameProjectFileNode(fileTree, "assets", "Images")).toBe(fileTree);
    expect(deleteProjectFileNode(fileTree, "assets")).toBe(fileTree);
    expect(moveProjectFileNodeToParent(fileTree, "assets", "folder-alpha")).toBe(fileTree);
  });

  it("creates or restores a root Assets folder", () => {
    const nestedAssets = createProjectAssetsFolderNode([file("asset-file", "Token", "image")]);
    const restoredFileTree = ensureProjectAssetsFolder([
      folder("folder-alpha", "Alpha", [nestedAssets])
    ]);

    expect(
      findProjectFileNodeLocation(ensureProjectAssetsFolder([]), "assets")?.parentId
    ).toBeNull();
    expect(findProjectFileNodeLocation(restoredFileTree, "assets")).toMatchObject({
      parentId: null
    });
    expect(findProjectFileNode(restoredFileTree, "asset-file")).toBeDefined();
  });

  it("moves nodes to valid parents and keeps the target tree sorted", () => {
    const fileTree = createFileTree();
    const nextFileTree = moveProjectFileNodeToParent(fileTree, "deep-object", null);

    expect(findProjectFileNodeLocation(nextFileTree, "deep-object")?.parentId).toBeNull();
    expect(nextFileTree.map((node) => node.id)).toEqual([
      "folder-alpha",
      "folder-beta",
      "root-setup",
      "deep-object",
      "root-object",
      "root-image",
      "root-doc"
    ]);
    expect(findProjectFileNodeLocation(fileTree, "deep-object")?.parentId).toBe(
      "folder-alpha-child"
    );
  });

  it("rejects missing, invalid, descendant, and same-parent moves", () => {
    const fileTree = createFileTree();

    expect(moveProjectFileNodeToParent(fileTree, "missing-node", null)).toBe(fileTree);
    expect(moveProjectFileNodeToParent(fileTree, "root-doc", "root-object")).toBe(fileTree);
    expect(moveProjectFileNodeToParent(fileTree, "folder-beta", "folder-alpha-child")).toBe(
      fileTree
    );
    expect(moveProjectFileNodeToParent(fileTree, "root-doc", null)).toBe(fileTree);
  });
});
