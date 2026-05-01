import type { ProjectFileNode, ProjectImageAsset } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import { findProjectFileNode } from "./project-file-tree";
import {
  appendProjectImageAssetFileNode,
  getProjectImageAssetOptionById,
  getProjectImageAssetOptions
} from "./project-image-assets";

const imageAsset: ProjectImageAsset = {
  id: "asset-1",
  byteSize: 123,
  contentType: "image/png",
  createdAt: "2026-01-01T00:00:00.000Z",
  fileName: "token.png"
};

function folder(id: string, name: string, children: ProjectFileNode[] = []): ProjectFileNode {
  return {
    children,
    id,
    name,
    type: "folder"
  };
}

function imageFile(id: string, name: string, asset = imageAsset): ProjectFileNode {
  return {
    id,
    imageAsset: asset,
    kind: "image",
    name,
    type: "file"
  };
}

describe("project image asset helpers", () => {
  it("resolves available image assets from image file nodes", () => {
    const fileTree = [
      folder("assets", "Assets", [imageFile("image-file-1", "Token")]),
      imageFile("root-image", "Root image", { ...imageAsset, id: "asset-2" })
    ];
    const imageAssets = getProjectImageAssetOptions("project 1", fileTree);

    expect(imageAssets.map((asset) => asset.asset.id)).toEqual(["asset-1", "asset-2"]);
    expect(getProjectImageAssetOptionById(imageAssets, "asset-1")).toMatchObject({
      fileNodeId: "image-file-1",
      name: "Token",
      url: "/api/projects/project%201/image-assets/asset-1"
    });
    expect(getProjectImageAssetOptionById([], "asset-1")).toBeUndefined();
  });

  it("adds uploaded image assets to the Assets folder and hides deleted assets", () => {
    const fileTree = [folder("assets", "Assets")];
    const { fileTree: nextFileTree, fileNode } = appendProjectImageAssetFileNode(
      fileTree,
      imageAsset
    );

    expect(fileNode).toMatchObject({
      imageAsset,
      kind: "image",
      name: "token.png",
      type: "file"
    });
    expect(findProjectFileNode(nextFileTree, fileNode.id)).toMatchObject({ imageAsset });
    expect(
      getProjectImageAssetOptionById(getProjectImageAssetOptions("project-1", []), "asset-1")
    ).toBeUndefined();
  });

  it("creates the Assets folder when uploading into a tree that does not have it yet", () => {
    const { fileTree: nextFileTree, fileNode } = appendProjectImageAssetFileNode([], imageAsset);

    expect(findProjectFileNode(nextFileTree, "assets")).toMatchObject({
      name: "Assets",
      type: "folder"
    });
    expect(findProjectFileNode(nextFileTree, fileNode.id)).toMatchObject({ imageAsset });
  });
});
