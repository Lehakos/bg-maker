import type { Project, ProjectFileKind, ProjectFileNode } from "@bg-maker/shared";
import { projectAssetsFolderId, projectAssetsFolderName } from "@bg-maker/shared";
import { normalizeProjectImageAsset } from "./project-image-assets.js";
import {
  ensureProjectObjectFileRoot,
  normalizeProjectObjectTree
} from "./project-object-tree-normalizer.js";
import { ProjectValidationError } from "./project-validation-error.js";

const maxProjectFileTreeDepth = 12;
const maxProjectFileTreeNodes = 500;
const projectFileKinds = new Set<ProjectFileKind>(["tableSetup", "object", "image", "document"]);

export function normalizeStoredProject(value: unknown): Project | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const project = value as Partial<Record<keyof Project, unknown>>;
  const {
    id,
    name,
    description,
    createdAt,
    updatedAt,
    tableSetupsCount,
    objectsCount,
    playtestsCount,
    notes,
    fileTree
  } = project;

  const hasProjectShape =
    typeof id === "string" &&
    typeof name === "string" &&
    typeof description === "string" &&
    typeof createdAt === "string" &&
    typeof updatedAt === "string" &&
    typeof tableSetupsCount === "number" &&
    typeof objectsCount === "number" &&
    typeof playtestsCount === "number" &&
    typeof notes === "string";

  if (!hasProjectShape) {
    return null;
  }

  return {
    id,
    name,
    description,
    createdAt,
    updatedAt,
    tableSetupsCount,
    objectsCount,
    playtestsCount,
    notes,
    fileTree: Array.isArray(fileTree)
      ? normalizeStoredProjectFileTree(fileTree)
      : createDefaultProjectFileTree()
  };
}

export function createDefaultProjectFileTree(): ProjectFileNode[] {
  return [
    {
      id: "table-setups",
      name: "Table setups",
      type: "folder",
      children: []
    },
    {
      id: "objects",
      name: "Objects",
      type: "folder",
      children: []
    },
    {
      id: projectAssetsFolderId,
      name: projectAssetsFolderName,
      type: "folder",
      children: []
    }
  ];
}

export function normalizeProjectFileTree(value: unknown): ProjectFileNode[] {
  if (!Array.isArray(value)) {
    throw new ProjectValidationError("Project file tree must be an array");
  }

  const nodeIds = new Set<string>();
  const nodeCount = { value: 0 };

  return ensureProjectAssetsFolder(
    value.map((node) => normalizeProjectFileNode(node, 0, nodeIds, nodeCount))
  );
}

function normalizeStoredProjectFileTree(value: unknown): ProjectFileNode[] {
  try {
    return normalizeProjectFileTree(value);
  } catch {
    return [];
  }
}

function ensureProjectAssetsFolder(fileTree: ProjectFileNode[]): ProjectFileNode[] {
  const { assetsNode, fileTree: fileTreeWithoutAssets } = extractProjectAssetsFolder(fileTree);

  if (assetsNode && assetsNode.type !== "folder") {
    throw new ProjectValidationError("Project assets folder is invalid");
  }

  return [
    ...fileTreeWithoutAssets,
    {
      id: projectAssetsFolderId,
      name: projectAssetsFolderName,
      type: "folder",
      children: assetsNode?.children ?? []
    }
  ];
}

function extractProjectAssetsFolder(fileTree: ProjectFileNode[]): {
  assetsNode?: ProjectFileNode;
  fileTree: ProjectFileNode[];
} {
  let assetsNode: ProjectFileNode | undefined;
  const nextFileTree = fileTree.reduce<ProjectFileNode[]>((nodes, node) => {
    if (node.id === projectAssetsFolderId) {
      assetsNode = node;
      return nodes;
    }

    if (node.type === "folder") {
      const extractedChildren = extractProjectAssetsFolder(node.children ?? []);

      if (extractedChildren.assetsNode) {
        assetsNode = extractedChildren.assetsNode;
      }

      nodes.push({
        ...node,
        children: extractedChildren.fileTree
      });

      return nodes;
    }

    nodes.push(node);

    return nodes;
  }, []);

  return {
    assetsNode,
    fileTree: nextFileTree
  };
}

function normalizeProjectFileNode(
  value: unknown,
  depth: number,
  nodeIds: Set<string>,
  nodeCount: { value: number }
): ProjectFileNode {
  if (!value || typeof value !== "object") {
    throw new ProjectValidationError("Project file tree nodes must be objects");
  }

  if (depth > maxProjectFileTreeDepth) {
    throw new ProjectValidationError("Project file tree is too deeply nested");
  }

  nodeCount.value += 1;

  if (nodeCount.value > maxProjectFileTreeNodes) {
    throw new ProjectValidationError("Project file tree has too many nodes");
  }

  const record = value as Partial<Record<keyof ProjectFileNode, unknown>>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const name = typeof record.name === "string" ? record.name.trim() : "";

  if (!id) {
    throw new ProjectValidationError("Project file tree node id is required");
  }

  if (nodeIds.has(id)) {
    throw new ProjectValidationError("Project file tree node ids must be unique");
  }

  if (!name) {
    throw new ProjectValidationError("Project file tree node name is required");
  }

  if (record.type !== "folder" && record.type !== "file") {
    throw new ProjectValidationError("Project file tree node type is invalid");
  }

  nodeIds.add(id);

  if (record.type === "folder") {
    const children = Array.isArray(record.children)
      ? record.children.map((child) =>
          normalizeProjectFileNode(child, depth + 1, nodeIds, nodeCount)
        )
      : [];

    return {
      id,
      name,
      type: "folder",
      children
    };
  }

  const kind = projectFileKinds.has(record.kind as ProjectFileKind)
    ? (record.kind as ProjectFileKind)
    : "document";
  const objectTree =
    kind === "tableSetup"
      ? {
          objectTree: Array.isArray(record.objectTree)
            ? normalizeProjectObjectTree(record.objectTree)
            : []
        }
      : kind === "object"
        ? {
            objectTree: ensureProjectObjectFileRoot(
              Array.isArray(record.objectTree) ? normalizeProjectObjectTree(record.objectTree) : [],
              id,
              name
            )
          }
        : {};
  const imageAsset = kind === "image" ? normalizeProjectImageAsset(record.imageAsset) : undefined;

  return {
    id,
    name,
    type: "file",
    kind,
    ...(imageAsset ? { imageAsset } : {}),
    ...objectTree
  };
}
