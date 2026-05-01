import type { ProjectFileKind, ProjectFileNode } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  appendProjectFileNode,
  countProjectFileTreeNodes,
  deleteProjectFileNode,
  findProjectFileNode,
  findProjectFileNodeLocation,
  getProjectFileNodeChildren,
  moveProjectFileNodeToParent,
  renameProjectFileNode,
  sortProjectFileTree
} from "./project-file-tree";

function folder(
  id: string,
  name: string,
  children: ProjectFileNode[] = []
): ProjectFileNode {
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
    expect(getProjectFileNodeChildren(sortedFileTree, "folder-alpha").map((node) => node.id)).toEqual(
      ["alpha-image-2", "alpha-image-10"]
    );
    expect(fileTree.map((node) => node.id)).toEqual([
      "root-image",
      "folder-beta",
      "root-setup",
      "folder-alpha",
      "root-object",
      "root-doc"
    ]);
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
