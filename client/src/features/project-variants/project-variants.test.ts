import type {
  ProjectFileNode,
  ProjectObjectNode,
  ProjectObjectTemplate,
  ProjectTableSetupItem
} from "@bg-maker/shared";
import { getDefaultProjectObjectText, getDefaultProjectTableSetup } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import { findProjectFileNode, findProjectFileNodeLocation } from "../project-files/project-file-tree";
import {
  createLinkedObjectFilesFromVariantRows,
  createReusableObjectFromSelection,
  collectProjectImageAssetReferences,
  detachLinkedObjectFile,
  detachLinkedTableItem,
  parseVariantImportTable,
  saveTableLocalObjectAsReusable
} from "./project-variants";

const template: ProjectObjectTemplate = {
  variables: [
    { id: "title", name: "Title", type: "text", defaultValue: "Default title" },
    { id: "cost", name: "Cost", type: "number", defaultValue: 1 },
    { id: "accent", name: "Accent", type: "color", defaultValue: "#000000" },
    { id: "portrait", name: "Portrait", type: "image", defaultValue: "" }
  ]
};

function folder(id: string, name: string, children: ProjectFileNode[] = []): ProjectFileNode {
  return {
    children,
    id,
    name,
    type: "folder"
  };
}

function objectNode(
  id: string,
  name: string,
  children: ProjectObjectNode[] = []
): ProjectObjectNode {
  return {
    children,
    id,
    kind: "card",
    name,
    visible: true
  };
}

function objectFile(
  id: string,
  name: string,
  object: ProjectObjectNode,
  objectTemplate?: ProjectObjectTemplate
): ProjectFileNode {
  return {
    id,
    kind: "object",
    name,
    objectTree: [object],
    ...(objectTemplate ? { template: objectTemplate } : {}),
    type: "file"
  };
}

function imageFile(id: string, name: string, assetId: string, fileName = name): ProjectFileNode {
  return {
    id,
    imageAsset: {
      byteSize: 100,
      contentType: "image/png",
      createdAt: "2026-01-01T00:00:00.000Z",
      fileName,
      id: assetId
    },
    kind: "image",
    name,
    type: "file"
  };
}

describe("project variant helpers", () => {
  it("creates a reusable object from a root object and replaces the source file with a link", () => {
    const root = objectNode("card-root", "Variant Card");
    const fileTree = [folder("objects", "Objects", [objectFile("variant", "Warrior", root, template)])];
    const result = createReusableObjectFromSelection({
      fileTree,
      name: "Character Template",
      objectFileNodeId: "variant",
      objectId: "card-root"
    });

    expect(result).not.toBeNull();
    const variantFile = findProjectFileNode(result!.fileTree, "variant");
    const reusableFile = result!.fileTree
      .flatMap((node) => (node.type === "folder" ? (node.children ?? []) : [node]))
      .find((node) => node.name === "Character Template");

    expect(variantFile).toMatchObject({
      id: "variant",
      kind: "object",
      sourceRef: {
        sourceObjectFileNodeId: reusableFile?.id,
        values: {}
      }
    });
    expect(variantFile).not.toHaveProperty("objectTree");
    expect(variantFile).not.toHaveProperty("template");
    expect(reusableFile).toMatchObject({
      kind: "object",
      template,
      objectTree: [{ kind: "card", name: "Character Template" }]
    });
    expect(result?.selectedObjectId).toBe(reusableFile?.objectTree?.[0]?.id);
  });

  it("creates a reusable object from a child object without changing the original tree", () => {
    const child = {
      ...objectNode("title-label", "Title label"),
      bindings: [{ target: "text.content" as const, variableId: "title" }]
    };
    const root = objectNode("card-root", "Card", [child]);
    const fileTree = [objectFile("card-file", "Card", root, template)];
    const result = createReusableObjectFromSelection({
      fileTree,
      name: "Reusable title",
      objectFileNodeId: "card-file",
      objectId: "title-label"
    });
    const originalFile = findProjectFileNode(result!.fileTree, "card-file");
    const reusableFile = result!.fileTree.find((node) => node.name === "Reusable title");

    expect(originalFile).toMatchObject({
      objectTree: [{ children: [{ id: "title-label", name: "Title label" }] }]
    });
    expect(originalFile).not.toHaveProperty("sourceRef");
    expect(reusableFile).toMatchObject({
      kind: "object",
      objectTree: [{ name: "Reusable title" }]
    });
    expect(reusableFile?.objectTree?.[0]).not.toHaveProperty("bindings");
    expect(result?.selectedObjectId).toBe("title-label");
  });

  it("saves a table setup local object as reusable and preserves table item state", () => {
    const localObject: ProjectObjectNode = {
      id: "local-card",
      kind: "shape",
      locked: true,
      name: "Local Card",
      visible: false,
      components: {
        rectTransform: {
          height: 88,
          pivotX: 0.5,
          pivotY: 0.5,
          rotation: 15,
          scaleX: 1.25,
          scaleY: 0.75,
          width: 63,
          x: 120,
          y: 240
        }
      }
    };
    const tableSetup = {
      ...getDefaultProjectTableSetup(),
      items: [{ object: localObject, type: "localObject" as const }]
    };
    const fileTree = [
      folder("setups", "Setups", [
        {
          id: "table-file",
          kind: "tableSetup" as const,
          name: "Opening table",
          tableSetup,
          type: "file" as const
        }
      ])
    ];
    const result = saveTableLocalObjectAsReusable({
      fileTree,
      itemId: "local-card",
      name: "Card Source",
      tableSetupFileNodeId: "table-file"
    });
    const tableFile = findProjectFileNode(result!.fileTree, "table-file");
    const item = tableFile?.tableSetup?.items[0];
    const reusableFile = findProjectFileNode(result!.fileTree, result!.selectedTableSetupItemId ?? "");

    expect(item).toMatchObject({
      id: "local-card",
      locked: true,
      name: "Local Card",
      transform: { rotation: 15, scaleX: 1.25, scaleY: 0.75, x: 120, y: 240 },
      type: "linkedObject",
      visible: false
    });
    expect(findProjectFileNodeLocation(result!.fileTree, (item as ProjectTableSetupItem & { sourceObjectFileNodeId?: string }).sourceObjectFileNodeId ?? "")?.parentId).toBe("setups");
    expect(reusableFile).toBeUndefined();
  });

  it("detaches linked object files into independent resolved object trees", () => {
    const sourceRoot: ProjectObjectNode = {
      id: "source-root",
      kind: "card",
      name: "Source Card",
      visible: true,
      bindings: [{ target: "text.content", variableId: "title" }],
      components: {
        text: {
          ...getDefaultProjectObjectText("card"),
          content: "Default title"
        }
      }
    };
    const fileTree: ProjectFileNode[] = [
      objectFile("source-file", "Source", sourceRoot, template),
      {
        id: "variant-file",
        kind: "object",
        name: "Scout",
        sourceRef: {
          sourceObjectFileNodeId: "source-file",
          values: { title: "Scout" }
        },
        type: "file"
      }
    ];
    const result = detachLinkedObjectFile({ fileTree, objectFileNodeId: "variant-file" });
    const detachedFile = findProjectFileNode(result!.fileTree, "variant-file");

    expect(detachedFile).not.toHaveProperty("sourceRef");
    expect(detachedFile).toMatchObject({
      objectTree: [
        {
          name: "Scout",
          components: {
            text: {
              content: "Scout"
            }
          }
        }
      ]
    });
    expect(detachedFile?.objectTree?.[0]).not.toHaveProperty("bindings");
  });

  it("detaches linked table items into local objects with resolved values and transform", () => {
    const sourceRoot: ProjectObjectNode = {
      id: "source-root",
      kind: "card",
      name: "Source Card",
      visible: true,
      bindings: [{ target: "text.content", variableId: "title" }],
      components: {
        rectTransform: {
          height: 88,
          pivotX: 0.5,
          pivotY: 0.5,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          width: 63,
          x: 0,
          y: 0
        },
        text: {
          ...getDefaultProjectObjectText("card"),
          content: "Default title"
        }
      }
    };
    const tableSetup = {
      ...getDefaultProjectTableSetup(),
      items: [
        {
          id: "linked-card",
          name: "Elite",
          sourceObjectFileNodeId: "source-file",
          transform: { rotation: 5, scaleX: 1.2, scaleY: 0.8, x: 30, y: 40 },
          type: "linkedObject" as const,
          values: { title: "Elite" },
          visible: true
        }
      ]
    };
    const fileTree: ProjectFileNode[] = [
      objectFile("source-file", "Source", sourceRoot, template),
      {
        id: "table-file",
        kind: "tableSetup",
        name: "Table",
        tableSetup,
        type: "file"
      }
    ];
    const result = detachLinkedTableItem({
      fileTree,
      itemId: "linked-card",
      tableSetupFileNodeId: "table-file"
    });
    const tableFile = findProjectFileNode(result!.fileTree, "table-file");
    const detachedItem = tableFile?.tableSetup?.items[0];

    expect(detachedItem).toMatchObject({
      object: {
        id: "linked-card",
        name: "Elite",
        components: {
          rectTransform: { rotation: 5, scaleX: 1.2, scaleY: 0.8, x: 30, y: 40 },
          text: { content: "Elite" }
        }
      },
      type: "localObject"
    });
    expect(detachedItem?.type === "localObject" ? detachedItem.object.bindings : []).toBeUndefined();
  });

  it("parses CSV and TSV variant rows with names, defaults, and validation errors", () => {
    const imageAssetReferences = [
      {
        fileName: "asset-1.png",
        folderPath: "Assets",
        id: "asset-1",
        name: "asset-1.png",
        path: "Assets/asset-1.png"
      }
    ];
    const csv = [
      "name,Title,Cost,Accent,Portrait,extra",
      '"Elite, Guard",Guard,3,#FFAA00,asset-1,ignored',
      ",Scout,,#00ff00,asset-1,ignored",
      "Bad,Bad cost,nope,#00ff00,asset-1,ignored",
      "Bad image,Bad image,4,#00ff00,missing-asset,ignored"
    ].join("\n");
    const parsedCsv = parseVariantImportTable({
      imageAssetReferences,
      sourceName: "Card Template",
      table: csv,
      template
    });
    const parsedTsv = parseVariantImportTable({
      sourceName: "Card Template",
      table: "title\tcost\taccent\nRunner\t7\t#112233",
      template
    });

    expect(parsedCsv.rows.map((row) => row.name)).toEqual([
      "Elite, Guard",
      "Scout",
      "Bad",
      "Bad image"
    ]);
    expect(parsedCsv.rows[0]?.values).toMatchObject({
      title: "Guard",
      cost: 3,
      accent: "#ffaa00",
      portrait: "asset-1"
    });
    expect(parsedCsv.rows[1]?.values).toMatchObject({
      cost: 1
    });
    expect(parsedCsv.rows[2]?.errors).toEqual(["Cost must be a number."]);
    expect(parsedCsv.rows[3]?.errors).toEqual([
      "Portrait must reference an existing image asset id or path."
    ]);
    expect(parsedTsv.rows[0]).toMatchObject({
      name: "Runner",
      values: {
        title: "Runner",
        cost: 7,
        accent: "#112233"
      }
    });
  });

  it("collects image asset references with full file tree paths", () => {
    const fileTree = [
      folder("assets", "Assets", [
        folder("heroes", "Heroes", [imageFile("image-file", "zaraloud.png", "asset-1")])
      ])
    ];

    expect(collectProjectImageAssetReferences(fileTree)).toEqual([
      {
        fileName: "zaraloud.png",
        folderPath: "Assets/Heroes",
        id: "asset-1",
        name: "zaraloud.png",
        path: "Assets/Heroes/zaraloud.png"
      }
    ]);
  });

  it("resolves imported image values by id, unique name, or full path", () => {
    const imageAssetReferences = [
      {
        fileName: "zaraloud.png",
        folderPath: "Assets/Heroes",
        id: "asset-hero",
        name: "zaraloud.png",
        path: "Assets/Heroes/zaraloud.png"
      },
      {
        fileName: "zaraloud.png",
        folderPath: "Assets/Villains",
        id: "asset-villain",
        name: "zaraloud.png",
        path: "Assets/Villains/zaraloud.png"
      },
      {
        fileName: "skull.png",
        folderPath: "Assets/Icons",
        id: "asset-skull",
        name: "skull.png",
        path: "Assets/Icons/skull.png"
      }
    ];
    const parsed = parseVariantImportTable({
      imageAssetReferences,
      sourceName: "Card Template",
      table: [
        "name,title,portrait",
        "By id,One,asset-hero",
        "By path,Two,Assets/Villains/zaraloud.png",
        "By unique name,Three,skull.png",
        "Ambiguous,Four,zaraloud.png"
      ].join("\n"),
      template
    });

    expect(parsed.rows[0]?.values.portrait).toBe("asset-hero");
    expect(parsed.rows[1]?.values.portrait).toBe("asset-villain");
    expect(parsed.rows[2]?.values.portrait).toBe("asset-skull");
    expect(parsed.rows[3]?.errors).toEqual([
      "Portrait matches multiple image assets; use an asset id or full path."
    ]);
  });

  it("creates linked object files from valid imported variant rows", () => {
    const sourceRoot = objectNode("source-root", "Card Template");
    const fileTree = [folder("cards", "Cards", [objectFile("source-file", "Card Template", sourceRoot, template)])];
    const parsed = parseVariantImportTable({
      sourceName: "Card Template",
      table: "name,title,cost,accent\nGuard,Guard,3,#ffaa00",
      template
    });
    const result = createLinkedObjectFilesFromVariantRows({
      fileTree,
      rows: parsed.rows,
      sourceObjectFileNodeId: "source-file"
    });
    const createdFileNodeId = result?.selectedFileNodeId ?? "";
    const createdFile = findProjectFileNode(result!.fileTree, createdFileNodeId);

    expect(createdFile).toMatchObject({
      kind: "object",
      name: "Guard",
      sourceRef: {
        sourceObjectFileNodeId: "source-file",
        values: {
          title: "Guard",
          cost: 3,
          accent: "#ffaa00"
        }
      }
    });
    expect(findProjectFileNodeLocation(result!.fileTree, createdFileNodeId)?.parentId).toBe("cards");
  });

  it("blocks linked object file creation when imported rows contain errors", () => {
    const sourceRoot = objectNode("source-root", "Card Template");
    const fileTree = [
      folder("cards", "Cards", [objectFile("source-file", "Card Template", sourceRoot, template)])
    ];
    const parsed = parseVariantImportTable({
      sourceName: "Card Template",
      table: "name,title,cost,accent\nGuard,Guard,3,#ffaa00\nBad,Bad,nope,#ffaa00",
      template
    });
    const result = createLinkedObjectFilesFromVariantRows({
      fileTree,
      rows: parsed.rows,
      sourceObjectFileNodeId: "source-file"
    });

    expect(result).toBeNull();
  });
});
