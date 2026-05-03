import type {
  ProjectFileNode,
  ProjectObjectKind,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectVariableValue,
  ProjectTableSetup,
  ProjectTableSetupItem,
  ProjectTableSetupItemTransform,
  ProjectTableSetupLinkedObjectItem
} from "@bg-maker/shared";
import {
  findProjectFileNodeInTree,
  getDefaultProjectTableSetup,
  getDefaultProjectTableSetupItemTransform,
  getProjectTableSetupItemId,
  resolveProjectObjectFileObjectTree,
  resolveProjectTableSetupItemObject
} from "@bg-maker/shared";
import { updateProjectFileNode } from "../project-files/project-file-tree";
import {
  createProjectObjectNode,
  getProjectObjectNodeRectTransform,
  setProjectObjectNodeRectTransform
} from "../project-objects/project-object-tree";

export type ProjectTableSetupObjectFileOption = {
  id: string;
  label: string;
  rootKind?: ProjectObjectKind;
};

export function getProjectFileNodeTableSetup(fileNode: ProjectFileNode | null | undefined) {
  return fileNode?.kind === "tableSetup"
    ? (fileNode.tableSetup ?? getDefaultProjectTableSetup())
    : null;
}

export function createProjectTableSetupLinkedObjectItem(
  fileTree: readonly ProjectFileNode[],
  sourceObjectFileNodeId: string
): ProjectTableSetupLinkedObjectItem | null {
  const sourceFileNode = findProjectFileNodeInTree(fileTree, sourceObjectFileNodeId);
  const sourceObject = resolveProjectObjectFileObjectTree(fileTree, sourceFileNode)[0];

  if (!sourceFileNode || sourceFileNode.kind !== "object" || !sourceObject) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    name: sourceFileNode.name || sourceObject.name,
    sourceObjectFileNodeId,
    transform: getDefaultProjectTableSetupItemTransform(),
    type: "linkedObject",
    values: {},
    visible: true
  };
}

export function createProjectTableSetupLocalObjectItem(
  kind: ProjectObjectKind
): ProjectTableSetupItem {
  return {
    object: createProjectObjectNode(kind),
    type: "localObject"
  };
}

export function getProjectTableSetupObjectFileOptions(
  fileTree: readonly ProjectFileNode[]
): ProjectTableSetupObjectFileOption[] {
  const options: ProjectTableSetupObjectFileOption[] = [];

  collectProjectTableSetupObjectFileOptions(fileTree, fileTree, options);

  return options;
}

export function getProjectTableSetupWithAddedItem(
  tableSetup: ProjectTableSetup,
  item: ProjectTableSetupItem
): ProjectTableSetup {
  return {
    ...tableSetup,
    items: [...tableSetup.items, item]
  };
}

export function getProjectTableSetupWithRemovedItem(
  tableSetup: ProjectTableSetup,
  itemId: string
): ProjectTableSetup {
  const nextItems = tableSetup.items.filter((item) => getProjectTableSetupItemId(item) !== itemId);

  return nextItems.length === tableSetup.items.length
    ? tableSetup
    : { ...tableSetup, items: nextItems };
}

export function getProjectTableSetupWithMovedItem(
  tableSetup: ProjectTableSetup,
  itemId: string,
  direction: -1 | 1
): ProjectTableSetup {
  const itemIndex = tableSetup.items.findIndex(
    (item) => getProjectTableSetupItemId(item) === itemId
  );
  const targetIndex = itemIndex + direction;

  if (itemIndex < 0 || targetIndex < 0 || targetIndex >= tableSetup.items.length) {
    return tableSetup;
  }

  const items = [...tableSetup.items];
  const [item] = items.splice(itemIndex, 1);

  if (!item) {
    return tableSetup;
  }

  items.splice(targetIndex, 0, item);

  return { ...tableSetup, items };
}

export function getProjectTableSetupWithItemName(
  tableSetup: ProjectTableSetup,
  itemId: string,
  name: string
): ProjectTableSetup {
  const nextName = name.trim();

  if (!nextName) {
    return tableSetup;
  }

  return updateProjectTableSetupItem(tableSetup, itemId, (item) =>
    item.type === "linkedObject"
      ? { ...item, name: nextName }
      : { ...item, object: { ...item.object, name: nextName } }
  );
}

export function getProjectTableSetupWithItemVisibility(
  tableSetup: ProjectTableSetup,
  itemId: string,
  visible: boolean
): ProjectTableSetup {
  return updateProjectTableSetupItem(tableSetup, itemId, (item) =>
    item.type === "linkedObject"
      ? { ...item, visible }
      : { ...item, object: { ...item.object, visible } }
  );
}

export function getProjectTableSetupWithItemTransform(
  tableSetup: ProjectTableSetup,
  itemId: string,
  transform: ProjectTableSetupItemTransform | ProjectObjectRectTransform
): ProjectTableSetup {
  return updateProjectTableSetupItem(tableSetup, itemId, (item) => {
    if (item.type === "linkedObject") {
      return {
        ...item,
        transform: normalizeProjectTableSetupItemTransform(transform)
      };
    }

    const nextObjectTree = setProjectObjectNodeRectTransform([item.object], item.object.id, {
      ...getProjectObjectNodeRectTransform(item.object),
      ...transform
    });

    return nextObjectTree[0] ? { ...item, object: nextObjectTree[0] } : item;
  });
}

export function getProjectTableSetupWithLocalObjectTree(
  tableSetup: ProjectTableSetup,
  itemId: string,
  objectTree: ProjectObjectNode[]
): ProjectTableSetup {
  const nextObject = objectTree[0];

  if (!nextObject) {
    return tableSetup;
  }

  return updateProjectTableSetupItem(tableSetup, itemId, (item) =>
    item.type === "localObject" ? { ...item, object: nextObject } : item
  );
}

export function getProjectTableSetupWithLinkedItemValues(
  tableSetup: ProjectTableSetup,
  itemId: string,
  values: Record<string, ProjectObjectVariableValue>
): ProjectTableSetup {
  return updateProjectTableSetupItem(tableSetup, itemId, (item) =>
    item.type === "linkedObject" ? { ...item, values } : item
  );
}

export function updateProjectFileNodeTableSetup(
  fileTree: ProjectFileNode[],
  fileNodeId: string,
  tableSetup: ProjectTableSetup
): ProjectFileNode[] {
  return updateProjectFileNode(fileTree, fileNodeId, (node) =>
    node.kind === "tableSetup" ? { ...node, tableSetup } : node
  );
}

export function getProjectTableSetupResolvedItemObject(
  fileTree: readonly ProjectFileNode[],
  item: ProjectTableSetupItem
) {
  return resolveProjectTableSetupItemObject(fileTree, item);
}

function updateProjectTableSetupItem(
  tableSetup: ProjectTableSetup,
  itemId: string,
  updateItem: (item: ProjectTableSetupItem) => ProjectTableSetupItem
): ProjectTableSetup {
  let changed = false;
  const items = tableSetup.items.map((item) => {
    if (getProjectTableSetupItemId(item) !== itemId) {
      return item;
    }

    changed = true;
    return updateItem(item);
  });

  return changed ? { ...tableSetup, items } : tableSetup;
}

function normalizeProjectTableSetupItemTransform(
  transform: ProjectTableSetupItemTransform | ProjectObjectRectTransform
): ProjectTableSetupItemTransform {
  return {
    rotation: transform.rotation,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
    x: transform.x,
    y: transform.y
  };
}

function collectProjectTableSetupObjectFileOptions(
  fileTree: readonly ProjectFileNode[],
  rootFileTree: readonly ProjectFileNode[],
  options: ProjectTableSetupObjectFileOption[]
) {
  for (const node of fileTree) {
    if (node.type === "folder") {
      collectProjectTableSetupObjectFileOptions(node.children ?? [], rootFileTree, options);
      continue;
    }

    if (node.kind !== "object") {
      continue;
    }

    const rootObject = resolveProjectObjectFileObjectTree(rootFileTree, node)[0];

    options.push({
      id: node.id,
      label: node.name,
      rootKind: rootObject?.kind
    });
  }
}
