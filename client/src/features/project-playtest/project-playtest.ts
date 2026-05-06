import type {
  ProjectFileNode,
  ProjectObjectCounter,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectSide,
  ProjectTableSetup,
  ProjectTableSetupItem
} from "@bg-maker/shared";
import {
  getProjectObjectContainerTotalCount,
  hasProjectObjectSides,
  normalizeProjectObjectDieActiveFace,
  resolveProjectObjectFileObjectTreeById
} from "@bg-maker/shared";
import {
  getProjectObjectNodeCounter,
  getProjectObjectNodeDie,
  getProjectObjectNodeDoubleSide,
  getProjectObjectNodeRectTransform,
  getProjectObjectNodeWithActiveSide,
  setProjectObjectNodeContainer,
  setProjectObjectNodeCounter,
  setProjectObjectNodeDie,
  setProjectObjectNodeRectTransform
} from "../project-objects/project-object-tree";
import {
  getProjectFileNodeTableSetup,
  getProjectTableSetupResolvedItemObject
} from "../project-table-setup/project-table-setup";

export type ProjectWorkspaceMode = "edit" | "playtest";

export type PlaytestItem = {
  activeSide: ProjectObjectSide;
  baseObject: ProjectObjectNode;
  contents: string[];
  counterValue?: number;
  dieFace?: number;
  hidden: boolean;
  id: string;
  name: string;
  rectTransform: ProjectObjectRectTransform;
  revealed: boolean;
  sourceObjectFileNodeId?: string;
  visible: boolean;
};

export type PlaytestRuntimeState = {
  itemsById: Record<string, PlaytestItem>;
  selectedItemId: string | null;
  selectedItemIds: string[];
  tableItemIds: string[];
};

export type PlaytestHistoryEntry = {
  after: PlaytestRuntimeState;
  before: PlaytestRuntimeState;
  createdAt: string;
  id: string;
  label: string;
};

export type PlaytestLogEntry = {
  createdAt: string;
  id: string;
  label: string;
};

export type PlaytestSession = PlaytestRuntimeState & {
  actionLog: PlaytestLogEntry[];
  createdAt: string;
  id: string;
  projectId: string;
  redoStack: PlaytestHistoryEntry[];
  tableSetupFileNodeId: string;
  tableSetupName: string;
  tableSetupSnapshot: ProjectTableSetup;
  undoStack: PlaytestHistoryEntry[];
};

export type PlaytestCreateOptions = {
  createId?: () => string;
  now?: () => string;
  projectId: string;
  tableSetupFileNode: ProjectFileNode;
  fileTree: readonly ProjectFileNode[];
};

export type PlaytestAction =
  | {
      itemId: string;
      type: "decrementCounter" | "incrementCounter";
    }
  | {
      itemId: string;
      type:
        | "drawFromContainer"
        | "flipItem"
        | "hideItem"
        | "revealItem"
        | "rollDie"
        | "shuffleContainer";
    }
  | {
      itemIds: string[];
      primaryItemId?: string | null;
      type: "selectItems";
    }
  | {
      itemId: string | null;
      type: "selectItem";
    }
  | {
      itemTransforms: Record<string, ProjectObjectRectTransform>;
      label?: string;
      type: "moveItems";
    };

type PlaytestActionContext = {
  createId: () => string;
  now: () => string;
  random: () => number;
};

const defaultDrawOffset = 32;

export function createPlaytestSession({
  createId = createPlaytestId,
  fileTree,
  now = createPlaytestTimestamp,
  projectId,
  tableSetupFileNode
}: PlaytestCreateOptions): PlaytestSession | null {
  if (tableSetupFileNode.type !== "file" || tableSetupFileNode.kind !== "tableSetup") {
    return null;
  }

  const tableSetup = getProjectFileNodeTableSetup(tableSetupFileNode);

  if (!tableSetup) {
    return null;
  }

  const itemsById: Record<string, PlaytestItem> = {};
  const tableItemIds: string[] = [];

  for (const item of tableSetup.items) {
    const runtimeItem = createPlaytestItemFromTableSetupItem({
      createId,
      fileTree,
      item
    });

    if (!runtimeItem) {
      continue;
    }

    itemsById[runtimeItem.id] = runtimeItem;
    tableItemIds.push(runtimeItem.id);
    addContainerContents({
      containerItem: runtimeItem,
      createId,
      fileTree,
      itemsById
    });
  }

  const createdAt = now();

  return {
    actionLog: [
      {
        createdAt,
        id: createId(),
        label: `Started playtest from ${tableSetupFileNode.name}`
      }
    ],
    createdAt,
    id: createId(),
    itemsById,
    projectId,
    redoStack: [],
    selectedItemId: null,
    selectedItemIds: [],
    tableItemIds,
    tableSetupFileNodeId: tableSetupFileNode.id,
    tableSetupName: tableSetupFileNode.name,
    tableSetupSnapshot: cloneTableSetup(tableSetup),
    undoStack: []
  };
}

export function executePlaytestAction(
  session: PlaytestSession,
  action: PlaytestAction,
  options: Partial<PlaytestActionContext> = {}
): PlaytestSession {
  const context: PlaytestActionContext = {
    createId: options.createId ?? createPlaytestId,
    now: options.now ?? createPlaytestTimestamp,
    random: options.random ?? Math.random
  };

  if (action.type === "selectItem" || action.type === "selectItems") {
    return selectPlaytestItems(
      session,
      getActionSelectedItemIds(session, action),
      action.type === "selectItem" ? action.itemId : action.primaryItemId
    );
  }

  const before = getPlaytestRuntimeState(session);
  const nextRuntime = reducePlaytestAction(before, action, context);

  if (nextRuntime === before || arePlaytestRuntimeStatesEqual(before, nextRuntime)) {
    return session;
  }

  const createdAt = context.now();
  const label = getPlaytestActionLabel(before, nextRuntime, action);
  const historyEntry: PlaytestHistoryEntry = {
    after: nextRuntime,
    before,
    createdAt,
    id: context.createId(),
    label
  };

  return {
    ...session,
    ...nextRuntime,
    actionLog: [
      ...session.actionLog,
      {
        createdAt,
        id: context.createId(),
        label
      }
    ],
    redoStack: [],
    undoStack: [...session.undoStack, historyEntry]
  };
}

export function undoPlaytestSession(
  session: PlaytestSession,
  options: Pick<Partial<PlaytestActionContext>, "createId" | "now"> = {}
): PlaytestSession {
  const entry = session.undoStack.at(-1);

  if (!entry) {
    return session;
  }

  const createId = options.createId ?? createPlaytestId;
  const now = options.now ?? createPlaytestTimestamp;

  return {
    ...session,
    ...entry.before,
    actionLog: [
      ...session.actionLog,
      {
        createdAt: now(),
        id: createId(),
        label: `Undo ${entry.label}`
      }
    ],
    redoStack: [...session.redoStack, entry],
    undoStack: session.undoStack.slice(0, -1)
  };
}

export function redoPlaytestSession(
  session: PlaytestSession,
  options: Pick<Partial<PlaytestActionContext>, "createId" | "now"> = {}
): PlaytestSession {
  const entry = session.redoStack.at(-1);

  if (!entry) {
    return session;
  }

  const createId = options.createId ?? createPlaytestId;
  const now = options.now ?? createPlaytestTimestamp;

  return {
    ...session,
    ...entry.after,
    actionLog: [
      ...session.actionLog,
      {
        createdAt: now(),
        id: createId(),
        label: `Redo ${entry.label}`
      }
    ],
    redoStack: session.redoStack.slice(0, -1),
    undoStack: [...session.undoStack, entry]
  };
}

export function selectPlaytestItems(
  session: PlaytestSession,
  itemIds: readonly string[],
  primaryItemId?: string | null
): PlaytestSession {
  const validItemIds = [...new Set(itemIds)].filter((itemId) =>
    session.tableItemIds.includes(itemId)
  );
  const selectedItemId =
    primaryItemId === null
      ? null
      : primaryItemId && validItemIds.includes(primaryItemId)
        ? primaryItemId
        : (validItemIds.at(-1) ?? null);

  if (
    session.selectedItemId === selectedItemId &&
    areStringArraysEqual(session.selectedItemIds, validItemIds)
  ) {
    return session;
  }

  return {
    ...session,
    selectedItemId,
    selectedItemIds: selectedItemId ? validItemIds : []
  };
}

export function getPlaytestRenderedObject(
  item: PlaytestItem,
  itemsById: Record<string, PlaytestItem> = {}
): ProjectObjectNode {
  let object =
    setProjectObjectNodeRectTransform(
      [cloneProjectObjectNode(item.baseObject)],
      item.baseObject.id,
      item.rectTransform
    )[0] ?? cloneProjectObjectNode(item.baseObject);

  object = {
    ...object,
    id: item.id,
    name: item.name,
    visible: item.visible
  };

  if (hasProjectObjectSides(object.kind)) {
    object = getProjectObjectNodeWithActiveSide(
      object,
      item.hidden && !item.revealed ? "back" : item.activeSide
    );
  }

  if (object.kind === "counter" && typeof item.counterValue === "number") {
    const counter = getProjectObjectNodeCounter(object);
    object = setProjectObjectNodeCounter([object], object.id, {
      ...counter,
      defaultValue: item.counterValue
    })[0] ?? object;
  }

  if (object.kind === "die" && typeof item.dieFace === "number") {
    const die = getProjectObjectNodeDie(object);
    object = setProjectObjectNodeDie([object], object.id, {
      ...die,
      activeFace: normalizeProjectObjectDieActiveFace(item.dieFace, die.faceCount)
    })[0] ?? object;
  }

  if ((object.kind === "deck" || object.kind === "stack") && item.contents) {
    object = setProjectObjectNodeContainer([object], object.id, {
      entries: item.contents
        .map((contentItemId) => {
          const contentItem = itemsById[contentItemId];

          return contentItem?.sourceObjectFileNodeId
            ? {
                objectFileNodeId: contentItem.sourceObjectFileNodeId,
                quantity: 1
              }
            : null;
        })
        .filter((entry): entry is { objectFileNodeId: string; quantity: number } => Boolean(entry))
    })[0] ?? object;
  }

  return object;
}

export function getPlaytestSelectedItem(session: PlaytestSession | null): PlaytestItem | null {
  if (!session?.selectedItemId) {
    return null;
  }

  return session.itemsById[session.selectedItemId] ?? null;
}

export function getPlaytestRuntimeState(session: PlaytestSession): PlaytestRuntimeState {
  return {
    itemsById: session.itemsById,
    selectedItemId: session.selectedItemId,
    selectedItemIds: session.selectedItemIds,
    tableItemIds: session.tableItemIds
  };
}

export function getCounterValueWithStep(
  counter: ProjectObjectCounter,
  currentValue: number,
  direction: -1 | 1
) {
  const nextValue = currentValue + counter.step * direction;

  if (counter.boundsMode === "none") {
    return nextValue;
  }

  if (counter.boundsMode === "wrap") {
    if (nextValue > counter.maxValue) {
      return counter.minValue;
    }

    if (nextValue < counter.minValue) {
      return counter.maxValue;
    }
  }

  return Math.min(counter.maxValue, Math.max(counter.minValue, nextValue));
}

function reducePlaytestAction(
  runtime: PlaytestRuntimeState,
  action: Exclude<PlaytestAction, { type: "selectItem" | "selectItems" }>,
  context: PlaytestActionContext
): PlaytestRuntimeState {
  if (action.type === "moveItems") {
    return getRuntimeWithMovedItems(runtime, action.itemTransforms);
  }

  const item = runtime.itemsById[action.itemId];

  if (!item) {
    return runtime;
  }

  if (action.type === "flipItem") {
    return getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) =>
      hasProjectObjectSides(currentItem.baseObject.kind)
        ? {
            ...currentItem,
            activeSide: currentItem.activeSide === "front" ? "back" : "front",
            revealed: true
          }
        : currentItem
    );
  }

  if (action.type === "hideItem") {
    return getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
      ...currentItem,
      hidden: true,
      revealed: false
    }));
  }

  if (action.type === "revealItem") {
    return getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
      ...currentItem,
      hidden: false,
      revealed: true
    }));
  }

  if (action.type === "shuffleContainer") {
    if (!isRuntimeContainer(item) || item.contents.length < 2) {
      return runtime;
    }

    return getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
      ...currentItem,
      contents: shuffleItems(currentItem.contents, context.random)
    }));
  }

  if (action.type === "drawFromContainer") {
    return getRuntimeWithDrawnContainerItem(runtime, item.id);
  }

  if (action.type === "rollDie") {
    if (item.baseObject.kind !== "die") {
      return runtime;
    }

    const die = getProjectObjectNodeDie(item.baseObject);
    const face = Math.floor(context.random() * die.faceCount) + 1;

    return getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
      ...currentItem,
      dieFace: normalizeProjectObjectDieActiveFace(face, die.faceCount)
    }));
  }

  if (action.type === "incrementCounter" || action.type === "decrementCounter") {
    if (item.baseObject.kind !== "counter") {
      return runtime;
    }

    const counter = getProjectObjectNodeCounter(item.baseObject);
    const currentValue = item.counterValue ?? counter.defaultValue;
    const direction = action.type === "incrementCounter" ? 1 : -1;

    return getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
      ...currentItem,
      counterValue: getCounterValueWithStep(counter, currentValue, direction)
    }));
  }

  return runtime;
}

function createPlaytestItemFromTableSetupItem({
  createId,
  fileTree,
  item
}: {
  createId: () => string;
  fileTree: readonly ProjectFileNode[];
  item: ProjectTableSetupItem;
}): PlaytestItem | null {
  const object = getProjectTableSetupResolvedItemObject(fileTree, item);

  if (!object) {
    return null;
  }

  return createPlaytestItemFromObject({
    createId,
    id: item.type === "linkedObject" ? item.id : object.id,
    name: item.type === "linkedObject" ? item.name : object.name,
    object,
    sourceObjectFileNodeId: item.type === "linkedObject" ? item.sourceObjectFileNodeId : undefined,
    visible: item.type === "linkedObject" ? item.visible : object.visible
  });
}

function createPlaytestItemFromObject({
  createId,
  id,
  name,
  object,
  sourceObjectFileNodeId,
  visible
}: {
  createId: () => string;
  id?: string;
  name?: string;
  object: ProjectObjectNode;
  sourceObjectFileNodeId?: string;
  visible?: boolean;
}): PlaytestItem {
  const runtimeId = id ?? createId();
  const die = object.kind === "die" ? getProjectObjectNodeDie(object) : null;
  const counter = object.kind === "counter" ? getProjectObjectNodeCounter(object) : null;
  return {
    activeSide: getInitialActiveSide(object),
    baseObject: cloneProjectObjectNode({
      ...object,
      id: runtimeId,
      name: name ?? object.name
    }),
    contents: [],
    counterValue: counter?.defaultValue,
    dieFace: die?.activeFace,
    hidden: false,
    id: runtimeId,
    name: name ?? object.name,
    rectTransform: getProjectObjectNodeRectTransform(object),
    revealed: true,
    sourceObjectFileNodeId,
    visible: visible ?? object.visible
  };
}

function addContainerContents({
  containerItem,
  createId,
  fileTree,
  itemsById
}: {
  containerItem: PlaytestItem;
  createId: () => string;
  fileTree: readonly ProjectFileNode[];
  itemsById: Record<string, PlaytestItem>;
}) {
  if (!isRuntimeContainer(containerItem)) {
    return;
  }

  const container = containerItem.baseObject.components?.container;

  for (const entry of container?.entries ?? []) {
    for (let index = 0; index < getEntryQuantity(entry.quantity); index += 1) {
      const object = resolveProjectObjectFileObjectTreeById(
        fileTree,
        entry.objectFileNodeId,
        {},
        new Set()
      )[0];

      if (!object) {
        continue;
      }

      const contentItem = createPlaytestItemFromObject({
        createId,
        object,
        sourceObjectFileNodeId: entry.objectFileNodeId,
        visible: true
      });

      itemsById[contentItem.id] = contentItem;
      containerItem.contents.push(contentItem.id);
    }
  }
}

function getRuntimeWithMovedItems(
  runtime: PlaytestRuntimeState,
  itemTransforms: Record<string, ProjectObjectRectTransform>
): PlaytestRuntimeState {
  let nextRuntime = runtime;

  for (const [itemId, rectTransform] of Object.entries(itemTransforms)) {
    if (!nextRuntime.itemsById[itemId]) {
      continue;
    }

    nextRuntime = getRuntimeWithUpdatedItem(nextRuntime, itemId, (item) => ({
      ...item,
      rectTransform
    }));
  }

  return nextRuntime;
}

function getRuntimeWithDrawnContainerItem(
  runtime: PlaytestRuntimeState,
  containerItemId: string
): PlaytestRuntimeState {
  const containerItem = runtime.itemsById[containerItemId];

  if (!containerItem || !isRuntimeContainer(containerItem) || !containerItem.contents.length) {
    return runtime;
  }

  const [drawnItemId, ...nextContents] = containerItem.contents;
  const drawnItem = drawnItemId ? runtime.itemsById[drawnItemId] : undefined;

  if (!drawnItemId || !drawnItem) {
    return runtime;
  }

  const drawIndex = runtime.tableItemIds.indexOf(containerItemId);
  const nextTableItemIds = [...runtime.tableItemIds];
  nextTableItemIds.splice(drawIndex >= 0 ? drawIndex + 1 : nextTableItemIds.length, 0, drawnItemId);

  const drawnRectTransform = {
    ...drawnItem.rectTransform,
    x: containerItem.rectTransform.x + drawnItem.rectTransform.width + defaultDrawOffset,
    y: containerItem.rectTransform.y + defaultDrawOffset
  };
  const nextItemsById = {
    ...runtime.itemsById,
    [containerItemId]: {
      ...containerItem,
      contents: nextContents
    },
    [drawnItemId]: {
      ...drawnItem,
      hidden: false,
      rectTransform: drawnRectTransform,
      revealed: true,
      visible: true
    }
  };

  return {
    ...runtime,
    itemsById: nextItemsById,
    selectedItemId: drawnItemId,
    selectedItemIds: [drawnItemId],
    tableItemIds: nextTableItemIds
  };
}

function getRuntimeWithUpdatedItem(
  runtime: PlaytestRuntimeState,
  itemId: string,
  update: (item: PlaytestItem) => PlaytestItem
): PlaytestRuntimeState {
  const item = runtime.itemsById[itemId];

  if (!item) {
    return runtime;
  }

  const nextItem = update(item);

  if (nextItem === item) {
    return runtime;
  }

  return {
    ...runtime,
    itemsById: {
      ...runtime.itemsById,
      [itemId]: nextItem
    }
  };
}

function getActionSelectedItemIds(
  session: PlaytestSession,
  action: Extract<PlaytestAction, { type: "selectItem" | "selectItems" }>
) {
  if (action.type === "selectItem") {
    return action.itemId ? [action.itemId] : [];
  }

  return action.itemIds.filter((itemId) => session.tableItemIds.includes(itemId));
}

function getPlaytestActionLabel(
  before: PlaytestRuntimeState,
  after: PlaytestRuntimeState,
  action: Exclude<PlaytestAction, { type: "selectItem" | "selectItems" }>
) {
  if (action.type === "moveItems") {
    return action.label ?? "Move item";
  }

  const beforeItem = before.itemsById[action.itemId];
  const afterItem = after.itemsById[action.itemId];
  const itemName = beforeItem?.name ?? afterItem?.name ?? "Item";

  if (action.type === "flipItem") {
    return `Flip ${itemName}`;
  }

  if (action.type === "hideItem") {
    return `Hide ${itemName}`;
  }

  if (action.type === "revealItem") {
    return `Reveal ${itemName}`;
  }

  if (action.type === "shuffleContainer") {
    return `Shuffle ${itemName}`;
  }

  if (action.type === "drawFromContainer") {
    const drawnItemId = after.selectedItemIds[0];
    const drawnItem = drawnItemId ? after.itemsById[drawnItemId] : null;

    return drawnItem ? `Draw ${drawnItem.name}` : `Draw from ${itemName}`;
  }

  if (action.type === "rollDie") {
    const face = afterItem?.dieFace;

    return typeof face === "number" ? `Roll ${itemName}: ${face}` : `Roll ${itemName}`;
  }

  if (action.type === "incrementCounter") {
    return `Increase ${itemName}`;
  }

  return `Decrease ${itemName}`;
}

function isRuntimeContainer(item: PlaytestItem) {
  return item.baseObject.kind === "deck" || item.baseObject.kind === "stack";
}

function getInitialActiveSide(object: ProjectObjectNode): ProjectObjectSide {
  if (!hasProjectObjectSides(object.kind)) {
    return "front";
  }

  return getProjectObjectNodeDoubleSide(object).enabled ? "front" : "front";
}

function getEntryQuantity(quantity: number) {
  return Math.max(0, getProjectObjectContainerTotalCount({ entries: [{ objectFileNodeId: "x", quantity }] }));
}

function shuffleItems<T>(items: readonly T[], random: () => number): T[] {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    const item = nextItems[index]!;
    nextItems[index] = nextItems[targetIndex]!;
    nextItems[targetIndex] = item;
  }

  return nextItems;
}

function arePlaytestRuntimeStatesEqual(left: PlaytestRuntimeState, right: PlaytestRuntimeState) {
  return (
    left.itemsById === right.itemsById &&
    left.selectedItemId === right.selectedItemId &&
    left.selectedItemIds === right.selectedItemIds &&
    left.tableItemIds === right.tableItemIds
  );
}

function areStringArraysEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function cloneProjectObjectNode(object: ProjectObjectNode): ProjectObjectNode {
  return {
    ...object,
    bindings: object.bindings?.map((binding) => ({ ...binding })),
    children: object.children?.map(cloneProjectObjectNode),
    components: cloneProjectObjectComponents(object.components)
  };
}

function cloneProjectObjectComponents(components: ProjectObjectNode["components"]) {
  return components ? JSON.parse(JSON.stringify(components)) : undefined;
}

function cloneTableSetup(tableSetup: ProjectTableSetup): ProjectTableSetup {
  return JSON.parse(JSON.stringify(tableSetup));
}

function createPlaytestId() {
  return crypto.randomUUID();
}

function createPlaytestTimestamp() {
  return new Date().toISOString();
}
