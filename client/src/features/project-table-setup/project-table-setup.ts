import type {
  ProjectFileNode,
  ProjectObjectKind,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectTableSetupItemBehavior,
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
  getProjectTableSetupItemLocked,
  getProjectTableSetupItemId,
  resolveProjectObjectFileObjectTree,
  resolveProjectTableSetupItemObject
} from "@bg-maker/shared";
import { updateProjectFileNode } from "../project-files/project-file-tree";
import {
  cloneProjectObjectNode,
  createProjectObjectNode,
  getProjectObjectNodeRectTransform,
  setProjectObjectNodeRectTransform
} from "../project-objects/project-object-tree";
import { cloneProjectTableSetupItemBehavior } from "./project-table-setup-behavior";

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
    locked: false,
    visible: true
  };
}

export function createProjectTableSetupLinkedObjectItemAtPoint(
  fileTree: readonly ProjectFileNode[],
  sourceObjectFileNodeId: string,
  tableSetup: ProjectTableSetup,
  point: { x: number; y: number }
): ProjectTableSetupLinkedObjectItem | null {
  const item = createProjectTableSetupLinkedObjectItem(fileTree, sourceObjectFileNodeId);

  if (!item) {
    return null;
  }

  const snapSize = tableSetup.grid.snap ? tableSetup.grid.size : null;

  return {
    ...item,
    transform: {
      ...item.transform,
      x: snapTableSetupDropValue(point.x, snapSize),
      y: snapTableSetupDropValue(point.y, snapSize)
    }
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

export function cloneProjectTableSetupItem(
  item: ProjectTableSetupItem,
  options: { name?: string; offset?: number } = {}
): ProjectTableSetupItem {
  const offset = options.offset ?? 0;
  const name =
    options.name ??
    (item.type === "linkedObject" ? `${item.name} Copy` : `${item.object.name} Copy`);

  if (item.type === "linkedObject") {
    return {
      ...item,
      behavior: cloneProjectTableSetupItemBehavior(item.behavior),
      id: crypto.randomUUID(),
      name,
      transform: {
        ...item.transform,
        x: item.transform.x + offset,
        y: item.transform.y + offset
      }
    };
  }

  return {
    ...item,
    behavior: cloneProjectTableSetupItemBehavior(item.behavior),
    object: cloneProjectObjectNode(item.object, { name, offset })
  };
}

export function getProjectTableSetupWithDuplicatedItems(
  tableSetup: ProjectTableSetup,
  itemIds: readonly string[],
  offset = 24
): { itemIds: string[]; tableSetup: ProjectTableSetup } {
  const selectedIds = new Set(itemIds);
  const sourceEntries = tableSetup.items
    .map((item, index) => ({ item, index, itemId: getProjectTableSetupItemId(item) }))
    .filter(({ itemId }) => selectedIds.has(itemId));

  if (!sourceEntries.length) {
    return { itemIds: [], tableSetup };
  }

  const clonedItems = sourceEntries.map(({ item }) => cloneProjectTableSetupItem(item, { offset }));
  const clonedItemIds = clonedItems.map(getProjectTableSetupItemId);
  const insertIndex = Math.max(...sourceEntries.map(({ index }) => index)) + 1;
  const items = [
    ...tableSetup.items.slice(0, insertIndex),
    ...clonedItems,
    ...tableSetup.items.slice(insertIndex)
  ];

  return {
    itemIds: clonedItemIds,
    tableSetup: { ...tableSetup, items }
  };
}

export function getProjectTableSetupWithInsertedItems(
  tableSetup: ProjectTableSetup,
  itemIds: readonly string[],
  itemsToInsert: readonly ProjectTableSetupItem[],
  offset = 24
): { itemIds: string[]; tableSetup: ProjectTableSetup } {
  if (!itemsToInsert.length) {
    return { itemIds: [], tableSetup };
  }

  const selectedIds = new Set(itemIds);
  const selectedIndexes = tableSetup.items
    .map((item, index) => (selectedIds.has(getProjectTableSetupItemId(item)) ? index : -1))
    .filter((index) => index >= 0);
  const insertIndex = selectedIndexes.length ? Math.max(...selectedIndexes) + 1 : tableSetup.items.length;
  const clonedItems = itemsToInsert.map((item) => cloneProjectTableSetupItem(item, { offset }));
  const clonedItemIds = clonedItems.map(getProjectTableSetupItemId);

  return {
    itemIds: clonedItemIds,
    tableSetup: {
      ...tableSetup,
      items: [
        ...tableSetup.items.slice(0, insertIndex),
        ...clonedItems,
        ...tableSetup.items.slice(insertIndex)
      ]
    }
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

export type ProjectTableSetupZOrderCommand = "backward" | "forward" | "sendBack" | "sendFront";

export function getProjectTableSetupWithReorderedItem(
  tableSetup: ProjectTableSetup,
  itemId: string,
  command: ProjectTableSetupZOrderCommand
): ProjectTableSetup {
  const itemIndex = tableSetup.items.findIndex(
    (item) => getProjectTableSetupItemId(item) === itemId
  );

  if (itemIndex < 0 || getProjectTableSetupItemLocked(tableSetup.items[itemIndex]!)) {
    return tableSetup;
  }

  const targetIndex = getZOrderTargetIndex(itemIndex, tableSetup.items.length, command);

  if (targetIndex === itemIndex) {
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

export function getProjectTableSetupWithItemLocked(
  tableSetup: ProjectTableSetup,
  itemId: string,
  locked: boolean
): ProjectTableSetup {
  return updateProjectTableSetupItem(tableSetup, itemId, (item) =>
    item.type === "linkedObject"
      ? { ...item, locked }
      : { ...item, object: { ...item.object, locked } }
  );
}

export function getProjectTableSetupWithItemBehavior(
  tableSetup: ProjectTableSetup,
  itemId: string,
  behavior: ProjectTableSetupItemBehavior
): ProjectTableSetup {
  return updateProjectTableSetupItem(tableSetup, itemId, (item) => ({
    ...item,
    behavior
  }));
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

export function getProjectTableSetupWithItemTransforms(
  tableSetup: ProjectTableSetup,
  transforms: ReadonlyMap<string, ProjectTableSetupItemTransform | ProjectObjectRectTransform>
): ProjectTableSetup {
  let nextTableSetup = tableSetup;

  for (const [itemId, transform] of transforms) {
    const item = nextTableSetup.items.find(
      (candidate) => getProjectTableSetupItemId(candidate) === itemId
    );

    if (!item || getProjectTableSetupItemLocked(item)) {
      continue;
    }

    nextTableSetup = getProjectTableSetupWithItemTransform(nextTableSetup, itemId, transform);
  }

  return nextTableSetup;
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

function snapTableSetupDropValue(value: number, snapSize: number | null) {
  if (!snapSize || snapSize <= 0) {
    return Math.round(value);
  }

  return Math.round(value / snapSize) * snapSize;
}

function getZOrderTargetIndex(
  currentIndex: number,
  itemCount: number,
  command: ProjectTableSetupZOrderCommand
) {
  if (command === "sendBack") {
    return 0;
  }

  if (command === "backward") {
    return Math.max(0, currentIndex - 1);
  }

  if (command === "forward") {
    return Math.min(itemCount - 1, currentIndex + 1);
  }

  return itemCount - 1;
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
