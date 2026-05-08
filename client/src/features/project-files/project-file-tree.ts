import type {
  ProjectFileKind,
  ProjectFileNode,
  ProjectImageAsset,
  ProjectObjectKind,
  ProjectObjectNode,
  ProjectObjectSourceRef,
  ProjectObjectTemplate,
  ProjectTableSetup,
  ProjectTableSetupItem
} from "@bg-maker/shared";
import {
  getDefaultProjectTableSetup,
  getDefaultProjectObjectName,
  getProjectTableSetupItemId,
  projectAssetsFolderId,
  projectAssetsFolderName
} from "@bg-maker/shared";
import { createProjectObjectNode } from "../project-objects/project-object-tree";
import {
  cloneProjectTableSetupItemBehavior,
  remapProjectTableSetupItemBehaviorCommandTargets
} from "../project-table-setup/project-table-setup-behavior";

export type ProjectFileTreeParentId = string | null;

export type ProjectFileTreeLocation = {
  node: ProjectFileNode;
  parentId: ProjectFileTreeParentId;
  index: number;
  ancestors: string[];
};

export type CreateProjectFileNodeOptions = {
  imageAsset?: ProjectImageAsset;
  objectRootKind?: ProjectObjectKind;
  sourceRef?: ProjectObjectSourceRef;
  template?: ProjectObjectTemplate;
};

const projectFileKindSortOrder: Record<ProjectFileKind, number> = {
  tableSetup: 0,
  object: 1,
  image: 2,
  document: 3
};

const projectFileTreeNameCollator = new Intl.Collator(["ru", "en"], {
  numeric: true,
  sensitivity: "base"
});

export function createFolderNode(name = "New folder"): ProjectFileNode {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || "New folder",
    type: "folder",
    children: []
  };
}

export function createProjectAssetsFolderNode(children: ProjectFileNode[] = []): ProjectFileNode {
  return {
    id: projectAssetsFolderId,
    name: projectAssetsFolderName,
    type: "folder",
    children
  };
}

export function createProjectFileNode(
  kind: ProjectFileKind,
  name = getDefaultProjectFileNodeName(kind),
  options: CreateProjectFileNodeOptions = {}
): ProjectFileNode {
  const nextName = name.trim() || getDefaultProjectFileNodeName(kind, options.objectRootKind);
  const objectTree =
    kind === "tableSetup"
      ? { tableSetup: getDefaultProjectTableSetup() }
      : kind === "object" && options.sourceRef
        ? { sourceRef: options.sourceRef }
        : kind === "object"
          ? {
              objectTree: [createProjectObjectNode(options.objectRootKind ?? "group", nextName)],
              ...(options.template ? { template: options.template } : {})
            }
          : {};
  const imageAsset =
    kind === "image" && options.imageAsset ? { imageAsset: options.imageAsset } : {};

  return {
    id: crypto.randomUUID(),
    name: nextName,
    type: "file",
    kind,
    ...imageAsset,
    ...objectTree
  };
}

export function appendProjectFileNode(
  fileTree: ProjectFileNode[],
  parentId: ProjectFileTreeParentId,
  node: ProjectFileNode
): ProjectFileNode[] {
  return sortProjectFileTree(appendProjectFileNodeInChildren(fileTree, parentId, node));
}

export function ensureProjectAssetsFolder(fileTree: ProjectFileNode[]): ProjectFileNode[] {
  const assetsLocation = findProjectFileNodeLocation(fileTree, projectAssetsFolderId);
  const assetsChildren =
    assetsLocation?.node.type === "folder" ? (assetsLocation.node.children ?? []) : [];
  const fileTreeWithoutAssets = assetsLocation
    ? removeProjectFileNode(fileTree, projectAssetsFolderId)
    : fileTree;

  return sortProjectFileTree([
    ...fileTreeWithoutAssets,
    createProjectAssetsFolderNode(assetsChildren)
  ]);
}

export function sortProjectFileTree(fileTree: ProjectFileNode[]): ProjectFileNode[] {
  return fileTree.map(sortProjectFileNodeChildren).sort(compareProjectFileNodes);
}

function sortProjectFileNodeChildren(node: ProjectFileNode): ProjectFileNode {
  if (node.type !== "folder") {
    return node;
  }

  return {
    ...node,
    children: sortProjectFileTree(node.children ?? [])
  };
}

export function findProjectFileNode(fileTree: ProjectFileNode[], nodeId: string) {
  return findProjectFileNodeLocation(fileTree, nodeId)?.node;
}

export function findProjectFileNodeLocation(
  fileTree: ProjectFileNode[],
  nodeId: string
): ProjectFileTreeLocation | undefined {
  return findProjectFileNodeLocationInChildren(fileTree, nodeId, null, []);
}

export function getProjectFileNodeChildren(
  fileTree: ProjectFileNode[],
  parentId: ProjectFileTreeParentId
) {
  if (parentId === null) {
    return fileTree;
  }

  const parentNode = findProjectFileNode(fileTree, parentId);

  return parentNode?.type === "folder" ? (parentNode.children ?? []) : [];
}

export function moveProjectFileNodeToParent(
  fileTree: ProjectFileNode[],
  activeId: string,
  targetParentId: ProjectFileTreeParentId
) {
  const activeLocation = findProjectFileNodeLocation(fileTree, activeId);

  if (
    !activeLocation ||
    activeId === targetParentId ||
    isProtectedProjectFileNode(activeLocation.node)
  ) {
    return fileTree;
  }

  const targetParentNode = targetParentId
    ? findProjectFileNode(fileTree, targetParentId)
    : undefined;

  if (targetParentId && targetParentNode?.type !== "folder") {
    return fileTree;
  }

  if (targetParentId && isProjectFileNodeDescendant(fileTree, targetParentId, activeId)) {
    return fileTree;
  }

  if (activeLocation.parentId === targetParentId) {
    return fileTree;
  }

  const fileTreeWithoutActiveNode = removeProjectFileNode(fileTree, activeId);

  return appendProjectFileNode(fileTreeWithoutActiveNode, targetParentId, activeLocation.node);
}

export function deleteProjectFileNode(
  fileTree: ProjectFileNode[],
  nodeId: string
): ProjectFileNode[] {
  if (isProtectedProjectFileNode(findProjectFileNode(fileTree, nodeId))) {
    return fileTree;
  }

  return sortProjectFileTree(removeProjectFileNode(fileTree, nodeId));
}

export function duplicateProjectFileNode(
  fileTree: ProjectFileNode[],
  nodeId: string
): { fileTree: ProjectFileNode[]; node: ProjectFileNode } | null {
  const location = findProjectFileNodeLocation(fileTree, nodeId);

  if (!location || isProtectedProjectFileNode(location.node)) {
    return null;
  }

  const duplicatedNode = cloneProjectFileNode(location.node, {
    name: `${location.node.name} Copy`
  });

  return {
    fileTree: appendProjectFileNode(fileTree, location.parentId, duplicatedNode),
    node: duplicatedNode
  };
}

export function cloneProjectFileNode(
  node: ProjectFileNode,
  options: { name?: string } = {}
): ProjectFileNode {
  const fileIdMap = new Map<string, string>();
  const clonedNode = cloneProjectFileNodeWithIdMap(node, fileIdMap, options.name ?? node.name);

  return remapProjectFileNodeReferences(clonedNode, fileIdMap);
}

export function renameProjectFileNode(
  fileTree: ProjectFileNode[],
  nodeId: string,
  name: string
): ProjectFileNode[] {
  if (isProtectedProjectFileNode(findProjectFileNode(fileTree, nodeId))) {
    return fileTree;
  }

  return sortProjectFileTree(renameProjectFileNodeInChildren(fileTree, nodeId, name));
}

export function updateProjectFileNode(
  fileTree: ProjectFileNode[],
  nodeId: string,
  updateNode: (node: ProjectFileNode) => ProjectFileNode
): ProjectFileNode[] {
  const result = updateProjectFileNodeInChildren(fileTree, nodeId, updateNode);

  return result.changed ? sortProjectFileTree(result.nodes) : fileTree;
}

export function isProtectedProjectFileNode(node: ProjectFileNode | null | undefined) {
  return node?.type === "folder" && node.id === projectAssetsFolderId;
}

function renameProjectFileNodeInChildren(
  fileTree: ProjectFileNode[],
  nodeId: string,
  name: string
): ProjectFileNode[] {
  return fileTree.map((node) => {
    if (node.id === nodeId) {
      return {
        ...node,
        name
      };
    }

    if (node.type === "folder") {
      return {
        ...node,
        children: renameProjectFileNodeInChildren(node.children ?? [], nodeId, name)
      };
    }

    return node;
  });
}

function updateProjectFileNodeInChildren(
  fileTree: ProjectFileNode[],
  nodeId: string,
  updateNode: (node: ProjectFileNode) => ProjectFileNode
): { changed: boolean; nodes: ProjectFileNode[] } {
  let changed = false;
  const nodes = fileTree.map((node) => {
    if (node.id === nodeId) {
      changed = true;
      return updateNode(node);
    }

    if (node.type === "folder") {
      const childResult = updateProjectFileNodeInChildren(node.children ?? [], nodeId, updateNode);

      if (childResult.changed) {
        changed = true;
        return {
          ...node,
          children: childResult.nodes
        };
      }
    }

    return node;
  });

  return { changed, nodes };
}

export function countProjectFileTreeNodes(fileTree: ProjectFileNode[]): number {
  return fileTree.reduce((count, node) => {
    if (node.type !== "folder") {
      return count + 1;
    }

    return count + 1 + countProjectFileTreeNodes(node.children ?? []);
  }, 0);
}

function getDefaultProjectFileNodeName(kind: ProjectFileKind, objectRootKind?: ProjectObjectKind) {
  if (kind === "tableSetup") {
    return "New table setup";
  }

  if (kind === "object") {
    return getDefaultProjectObjectName(objectRootKind ?? "group");
  }

  if (kind === "image") {
    return "New image";
  }

  return "New file";
}

function cloneProjectFileNodeWithIdMap(
  node: ProjectFileNode,
  fileIdMap: Map<string, string>,
  name: string
): ProjectFileNode {
  const nextId = crypto.randomUUID();
  fileIdMap.set(node.id, nextId);

  if (node.type === "folder") {
    return {
      ...node,
      id: nextId,
      name,
      children: (node.children ?? []).map((child) =>
        cloneProjectFileNodeWithIdMap(child, fileIdMap, child.name)
      )
    };
  }

  return {
    ...node,
    id: nextId,
    name,
    ...(node.objectTree ? { objectTree: node.objectTree.map(cloneProjectObjectNode) } : {}),
    ...(node.tableSetup ? { tableSetup: cloneProjectTableSetup(node.tableSetup) } : {})
  };
}

function cloneProjectObjectNode(node: ProjectObjectNode): ProjectObjectNode {
  return {
    ...node,
    id: crypto.randomUUID(),
    children: (node.children ?? []).map(cloneProjectObjectNode)
  };
}

function cloneProjectTableSetup(tableSetup: ProjectTableSetup): ProjectTableSetup {
  const clonedItems = tableSetup.items.map(cloneProjectTableSetupItem);
  const itemIdMap = new Map(
    tableSetup.items.map((item, index) => [
      getProjectTableSetupItemId(item),
      getProjectTableSetupItemId(clonedItems[index]!)
    ])
  );

  return {
    ...tableSetup,
    items: clonedItems.map((item) => ({
      ...item,
      behavior: remapProjectTableSetupItemBehaviorCommandTargets(item.behavior, itemIdMap)
    }))
  };
}

function cloneProjectTableSetupItem(item: ProjectTableSetupItem): ProjectTableSetupItem {
  if (item.type === "linkedObject") {
    return {
      ...item,
      behavior: cloneProjectTableSetupItemBehavior(item.behavior),
      id: crypto.randomUUID()
    };
  }

  return {
    ...item,
    behavior: cloneProjectTableSetupItemBehavior(item.behavior),
    object: cloneProjectObjectNode(item.object)
  };
}

function remapProjectFileNodeReferences(
  node: ProjectFileNode,
  fileIdMap: ReadonlyMap<string, string>
): ProjectFileNode {
  if (node.type === "folder") {
    return {
      ...node,
      children: (node.children ?? []).map((child) =>
        remapProjectFileNodeReferences(child, fileIdMap)
      )
    };
  }

  return {
    ...node,
    ...(node.sourceRef
      ? {
          sourceRef: {
            ...node.sourceRef,
            sourceObjectFileNodeId:
              fileIdMap.get(node.sourceRef.sourceObjectFileNodeId) ??
              node.sourceRef.sourceObjectFileNodeId
          }
        }
      : {}),
    ...(node.objectTree
      ? {
          objectTree: node.objectTree.map((object) =>
            remapProjectObjectReferences(object, fileIdMap)
          )
        }
      : {}),
    ...(node.tableSetup
      ? { tableSetup: remapProjectTableSetupReferences(node.tableSetup, fileIdMap) }
      : {})
  };
}

function remapProjectObjectReferences(
  object: ProjectObjectNode,
  fileIdMap: ReadonlyMap<string, string>
): ProjectObjectNode {
  const container = object.components?.container;
  const zone = object.components?.zone;
  const components = object.components
    ? {
        ...object.components,
        ...(container
          ? {
              container: {
                ...container,
                entries: container.entries.map((entry) => ({
                  ...entry,
                  objectFileNodeId: fileIdMap.get(entry.objectFileNodeId) ?? entry.objectFileNodeId
                }))
              }
            }
          : {}),
        ...(zone
          ? {
              zone: {
                ...zone,
                sizeReferenceObjectFileId:
                  fileIdMap.get(zone.sizeReferenceObjectFileId) ?? zone.sizeReferenceObjectFileId
              }
            }
          : {})
      }
    : undefined;

  return {
    ...object,
    ...(components ? { components } : {}),
    children: (object.children ?? []).map((child) => remapProjectObjectReferences(child, fileIdMap))
  };
}

function remapProjectTableSetupReferences(
  tableSetup: ProjectTableSetup,
  fileIdMap: ReadonlyMap<string, string>
): ProjectTableSetup {
  return {
    ...tableSetup,
    items: tableSetup.items.map((item) => {
      if (item.type === "linkedObject") {
        return {
          ...item,
          behavior: remapProjectTableSetupItemBehaviorReferences(item.behavior, fileIdMap),
          sourceObjectFileNodeId:
            fileIdMap.get(item.sourceObjectFileNodeId) ?? item.sourceObjectFileNodeId
        };
      }

      return {
        ...item,
        behavior: remapProjectTableSetupItemBehaviorReferences(item.behavior, fileIdMap),
        object: remapProjectObjectReferences(item.object, fileIdMap)
      };
    })
  };
}

function remapProjectTableSetupItemBehaviorReferences(
  behavior: ProjectTableSetupItem["behavior"],
  fileIdMap: ReadonlyMap<string, string>
): ProjectTableSetupItem["behavior"] {
  const clonedBehavior = cloneProjectTableSetupItemBehavior(behavior);

  if (!clonedBehavior?.zone) {
    return clonedBehavior;
  }

  return {
    ...clonedBehavior,
    zone: {
      ...clonedBehavior.zone,
      acceptedObjectFileNodeIds: clonedBehavior.zone.acceptedObjectFileNodeIds.map(
        (fileNodeId) => fileIdMap.get(fileNodeId) ?? fileNodeId
      )
    }
  };
}

function appendProjectFileNodeInChildren(
  fileTree: ProjectFileNode[],
  parentId: ProjectFileTreeParentId,
  node: ProjectFileNode
): ProjectFileNode[] {
  if (parentId === null) {
    return [...fileTree, node];
  }

  return fileTree.map((item) => {
    if (item.id === parentId && item.type === "folder") {
      return {
        ...item,
        children: [...(item.children ?? []), node]
      };
    }

    if (item.type === "folder") {
      return {
        ...item,
        children: appendProjectFileNodeInChildren(item.children ?? [], parentId, node)
      };
    }

    return item;
  });
}

function compareProjectFileNodes(left: ProjectFileNode, right: ProjectFileNode) {
  if (left.type !== right.type) {
    return left.type === "folder" ? -1 : 1;
  }

  if (left.type === "file" && right.type === "file") {
    const kindComparison =
      getProjectFileKindSortIndex(left.kind) - getProjectFileKindSortIndex(right.kind);

    if (kindComparison !== 0) {
      return kindComparison;
    }
  }

  const nameComparison = projectFileTreeNameCollator.compare(left.name, right.name);

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return left.id.localeCompare(right.id);
}

function getProjectFileKindSortIndex(kind?: ProjectFileKind) {
  return kind ? projectFileKindSortOrder[kind] : Number.MAX_SAFE_INTEGER;
}

function findProjectFileNodeLocationInChildren(
  fileTree: ProjectFileNode[],
  nodeId: string,
  parentId: ProjectFileTreeParentId,
  ancestors: string[]
): ProjectFileTreeLocation | undefined {
  for (const [index, node] of fileTree.entries()) {
    if (node.id === nodeId) {
      return {
        node,
        parentId,
        index,
        ancestors
      };
    }

    if (node.type === "folder") {
      const childLocation = findProjectFileNodeLocationInChildren(
        node.children ?? [],
        nodeId,
        node.id,
        [...ancestors, node.id]
      );

      if (childLocation) {
        return childLocation;
      }
    }
  }

  return undefined;
}

function isProjectFileNodeDescendant(
  fileTree: ProjectFileNode[],
  possibleDescendantId: string,
  nodeId: string
) {
  return (
    findProjectFileNodeLocation(fileTree, possibleDescendantId)?.ancestors.includes(nodeId) ?? false
  );
}

function removeProjectFileNode(fileTree: ProjectFileNode[], nodeId: string): ProjectFileNode[] {
  return fileTree.reduce<ProjectFileNode[]>((nodes, node) => {
    if (node.id === nodeId) {
      return nodes;
    }

    if (node.type === "folder") {
      nodes.push({
        ...node,
        children: removeProjectFileNode(node.children ?? [], nodeId)
      });

      return nodes;
    }

    nodes.push(node);

    return nodes;
  }, []);
}
