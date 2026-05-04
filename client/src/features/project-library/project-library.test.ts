import type { ProjectFileNode, ProjectImageAsset, ProjectObjectKind } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  collectProjectAssetBrowserItems,
  collectProjectObjectLibraryItems,
  filterProjectAssetBrowserItems,
  filterProjectObjectLibraryItems
} from "./project-library";
import {
  parseProjectImageAssetDragPayload,
  parseProjectObjectFileDragPayload,
  serializeProjectImageAssetDragPayload,
  serializeProjectObjectFileDragPayload
} from "./project-drag-payloads";

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

function objectFile(id: string, name: string, kind: ProjectObjectKind): ProjectFileNode {
  return {
    id,
    kind: "object",
    name,
    objectTree: [
      {
        id: `${id}-root`,
        kind,
        name,
        visible: true
      }
    ],
    type: "file"
  };
}

function linkedObjectFile(
  id: string,
  name: string,
  sourceObjectFileNodeId: string
): ProjectFileNode {
  return {
    id,
    kind: "object",
    name,
    sourceRef: {
      sourceObjectFileNodeId,
      values: {}
    },
    type: "file"
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

describe("project library helpers", () => {
  it("collects object library items from object file nodes with paths and resolved root kind", () => {
    const fileTree = [
      folder("objects", "Objects", [
        folder("cards", "Cards", [
          objectFile("card-file", "Warrior Card", "card"),
          linkedObjectFile("linked-card-file", "Elite Warrior", "card-file")
        ]),
        objectFile("token-file", "Gold Token", "token")
      ])
    ];
    const items = collectProjectObjectLibraryItems(fileTree);

    expect(items.map((item) => item.fileNodeId)).toEqual([
      "card-file",
      "linked-card-file",
      "token-file"
    ]);
    expect(items[0]).toMatchObject({
      linked: false,
      parentPath: "Objects / Cards",
      path: "Objects / Cards / Warrior Card",
      rootKind: "card"
    });
    expect(items[1]).toMatchObject({
      linked: true,
      rootKind: "card"
    });
    expect(
      filterProjectObjectLibraryItems(items, { rootKind: "token" }).map((item) => item.name)
    ).toEqual(["Gold Token"]);
    expect(
      filterProjectObjectLibraryItems(items, { search: "cards elite" }).map(
        (item) => item.name
      )
    ).toEqual(["Elite Warrior"]);
  });

  it("collects and filters asset browser items from image file nodes", () => {
    const secondImageAsset = {
      ...imageAsset,
      id: "asset-2",
      fileName: "card-front.webp"
    };
    const fileTree = [
      folder("assets", "Assets", [
        imageFile("token-image", "Token Image"),
        folder("cards", "Cards", [imageFile("card-image", "Card Face", secondImageAsset)])
      ])
    ];
    const items = collectProjectAssetBrowserItems("project 1", fileTree);

    expect(items.map((item) => item.fileNodeId)).toEqual(["token-image", "card-image"]);
    expect(items[1]).toMatchObject({
      asset: secondImageAsset,
      parentPath: "Assets / Cards",
      path: "Assets / Cards / Card Face",
      url: "/api/projects/project%201/image-assets/asset-2"
    });
    expect(
      filterProjectAssetBrowserItems(items, { search: "front" }).map((item) => item.name)
    ).toEqual(["Card Face"]);
  });

  it("serializes and parses project drag payloads", () => {
    expect(
      parseProjectObjectFileDragPayload(serializeProjectObjectFileDragPayload("object-1"))
    ).toEqual({
      fileNodeId: "object-1",
      type: "projectObjectFile"
    });
    expect(
      parseProjectImageAssetDragPayload(serializeProjectImageAssetDragPayload("asset-1"))
    ).toEqual({
      assetId: "asset-1",
      type: "projectImageAsset"
    });
    expect(parseProjectObjectFileDragPayload("{")).toBeNull();
    expect(
      parseProjectImageAssetDragPayload(serializeProjectObjectFileDragPayload("object-1"))
    ).toBeNull();
  });
});
