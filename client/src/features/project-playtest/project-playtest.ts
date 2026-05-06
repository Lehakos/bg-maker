import type {
  ProjectFileNode,
  ProjectObjectCounter,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectScoreTrackMarker,
  ProjectObjectSide,
  ProjectTableSetup,
  ProjectTableSetupItem,
  ProjectTableSetupItemBehavior
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
  getProjectObjectNodeScoreTrack,
  getProjectObjectNodeZone,
  getProjectObjectNodeWithActiveSide,
  setProjectObjectNodeContainer,
  setProjectObjectNodeCounter,
  setProjectObjectNodeDie,
  setProjectObjectNodeRectTransform,
  setProjectObjectNodeScoreTrack
} from "../project-objects/project-object-tree";
import {
  getEffectiveProjectObjectRectTransform,
  getProjectObjectZoneSlotRects,
  type ProjectObjectZoneSlotRect
} from "../project-objects/project-object-zone";
import {
  getProjectFileNodeTableSetup,
  getProjectTableSetupResolvedItemObject
} from "../project-table-setup/project-table-setup";
import { getProjectTableSetupItemBehavior } from "../project-table-setup/project-table-setup-behavior";

export type ProjectWorkspaceMode = "edit" | "playtest";

export type PlaytestItem = {
  activeSide: ProjectObjectSide;
  baseObject: ProjectObjectNode;
  behavior: ProjectTableSetupItemBehavior;
  contents: string[];
  counterValue?: number;
  dieFace?: number;
  hidden: boolean;
  id: string;
  name: string;
  rectTransform: ProjectObjectRectTransform;
  revealed: boolean;
  scoreTrackMarkers?: ProjectObjectScoreTrackMarker[];
  sourceObjectFileNodeId?: string;
  visible: boolean;
  zonePlacement?: PlaytestZonePlacement;
  zoneSlotRects?: ProjectObjectZoneSlotRect[];
};

export type PlaytestZonePlacement = {
  slotIndex?: number;
  zoneItemId: string;
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
  random?: () => number;
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
      markerId: string;
      type: "decrementScoreTrackMarker" | "incrementScoreTrackMarker";
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

export type PlaytestItemMovePreview =
  | {
      accepted: false;
    }
  | {
      accepted: true;
      item: PlaytestItem;
    };

export function createPlaytestSession({
  createId = createPlaytestId,
  fileTree,
  now = createPlaytestTimestamp,
  projectId,
  random = Math.random,
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
  const startupResult = getRuntimeWithStartupContainerShuffles(
    {
      itemsById,
      selectedItemId: null,
      selectedItemIds: [],
      tableItemIds
    },
    random
  );

  return {
    actionLog: [
      {
        createdAt,
        id: createId(),
        label: `Started playtest from ${tableSetupFileNode.name}`
      },
      ...startupResult.labels.map((label) => ({
        createdAt,
        id: createId(),
        label
      }))
    ],
    createdAt,
    id: createId(),
    ...startupResult.runtime,
    projectId,
    redoStack: [],
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
    locked: item.behavior.movement?.movableInPlaytest === false,
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
    object =
      setProjectObjectNodeCounter([object], object.id, {
        ...counter,
        defaultValue: item.counterValue
      })[0] ?? object;
  }

  if (object.kind === "die" && typeof item.dieFace === "number") {
    const die = getProjectObjectNodeDie(object);
    object =
      setProjectObjectNodeDie([object], object.id, {
        ...die,
        activeFace: normalizeProjectObjectDieActiveFace(item.dieFace, die.faceCount)
      })[0] ?? object;
  }

  if (object.kind === "scoreTrack" && item.scoreTrackMarkers) {
    const scoreTrack = getProjectObjectNodeScoreTrack(object);
    object =
      setProjectObjectNodeScoreTrack([object], object.id, {
        ...scoreTrack,
        markers: item.scoreTrackMarkers
      })[0] ?? object;
  }

  if (isRuntimeContainer(item)) {
    object =
      setProjectObjectNodeContainer([object], object.id, {
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
          .filter((entry): entry is { objectFileNodeId: string; quantity: number } =>
            Boolean(entry)
          )
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

export function getScoreTrackMarkerValueWithStep(
  scoreTrack: { maxValue: number; minValue: number; step: number },
  currentValue: number,
  direction: -1 | 1
) {
  const nextValue = currentValue + scoreTrack.step * direction;

  return Math.min(scoreTrack.maxValue, Math.max(scoreTrack.minValue, nextValue));
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

  if (item.behavior.interaction?.interactableInPlaytest === false) {
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
    return getRuntimeWithDrawnContainerItem(runtime, item.id, context.random);
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

  if (action.type === "incrementScoreTrackMarker" || action.type === "decrementScoreTrackMarker") {
    if (item.baseObject.kind !== "scoreTrack") {
      return runtime;
    }

    const scoreTrack = getProjectObjectNodeScoreTrack(item.baseObject);
    const direction = action.type === "incrementScoreTrackMarker" ? 1 : -1;

    return getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
      ...currentItem,
      scoreTrackMarkers: (currentItem.scoreTrackMarkers ?? scoreTrack.markers).map((marker) =>
        marker.id === action.markerId
          ? {
              ...marker,
              value: getScoreTrackMarkerValueWithStep(scoreTrack, marker.value, direction)
            }
          : marker
      )
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
    behavior: getProjectTableSetupItemBehavior({
      behavior: item.behavior,
      object
    }),
    createId,
    fileTree,
    id: item.type === "linkedObject" ? item.id : object.id,
    name: item.type === "linkedObject" ? item.name : object.name,
    object,
    sourceObjectFileNodeId: item.type === "linkedObject" ? item.sourceObjectFileNodeId : undefined
  });
}

function createPlaytestItemFromObject({
  createId,
  fileTree,
  id,
  name,
  object,
  behavior,
  sourceObjectFileNodeId
}: {
  behavior?: ProjectTableSetupItemBehavior;
  createId: () => string;
  fileTree: readonly ProjectFileNode[];
  id?: string;
  name?: string;
  object: ProjectObjectNode;
  sourceObjectFileNodeId?: string;
}): PlaytestItem {
  const runtimeId = id ?? createId();
  const die = object.kind === "die" ? getProjectObjectNodeDie(object) : null;
  const counter = object.kind === "counter" ? getProjectObjectNodeCounter(object) : null;
  const scoreTrack = object.kind === "scoreTrack" ? getProjectObjectNodeScoreTrack(object) : null;
  const runtimeBehavior = behavior ?? getProjectTableSetupItemBehavior({ object });
  const initialHidden = runtimeBehavior.visibility?.initialHidden ?? false;
  return {
    activeSide: getInitialActiveSide(object, runtimeBehavior),
    baseObject: cloneProjectObjectNode({
      ...object,
      id: runtimeId,
      name: name ?? object.name
    }),
    behavior: runtimeBehavior,
    contents: [],
    counterValue: counter?.defaultValue,
    dieFace: die?.activeFace,
    hidden: initialHidden,
    id: runtimeId,
    name: name ?? object.name,
    rectTransform:
      object.kind === "zone"
        ? getEffectiveProjectObjectRectTransform(object, fileTree)
        : getProjectObjectNodeRectTransform(object),
    revealed: !initialHidden,
    scoreTrackMarkers: scoreTrack?.markers.map((marker) => ({ ...marker })),
    sourceObjectFileNodeId,
    visible: true,
    zoneSlotRects:
      object.kind === "zone" ? getProjectObjectZoneSlotRects(fileTree, object) : undefined
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
        fileTree,
        object,
        sourceObjectFileNodeId: entry.objectFileNodeId
      });

      itemsById[contentItem.id] = contentItem;
      containerItem.contents.push(contentItem.id);
    }
  }
}

export function getPlaytestItemMovePreview(
  runtime: PlaytestRuntimeState,
  itemId: string,
  rectTransform: ProjectObjectRectTransform
): PlaytestItemMovePreview {
  const item = runtime.itemsById[itemId];

  if (!item || item.behavior.movement?.movableInPlaytest === false) {
    return { accepted: false };
  }

  return getPlaytestItemMoveResult(runtime, item, rectTransform);
}

export function getPlaytestZoneContentMovePreviewTransforms(
  runtime: PlaytestRuntimeState,
  zoneItemId: string,
  rectTransform: ProjectObjectRectTransform
): Record<string, ProjectObjectRectTransform> {
  const zoneItem = runtime.itemsById[zoneItemId];

  if (!zoneItem || zoneItem.baseObject.kind !== "zone") {
    return {};
  }

  return getMovedZoneContentTransforms(runtime, zoneItemId, {
    x: rectTransform.x - zoneItem.rectTransform.x,
    y: rectTransform.y - zoneItem.rectTransform.y
  });
}

export function getPlaytestItemGroupMoveTransforms(
  runtime: PlaytestRuntimeState,
  itemIds: readonly string[],
  sourceItemId: string,
  before: ProjectObjectRectTransform,
  after: ProjectObjectRectTransform
): Record<string, ProjectObjectRectTransform> {
  const sourceItem = runtime.itemsById[sourceItemId];

  if (!sourceItem) {
    return {};
  }

  const selectedIds = new Set(itemIds);
  const groupIds = selectedIds.has(sourceItemId) ? selectedIds : new Set([sourceItemId]);
  const deltaX = after.x - before.x;
  const deltaY = after.y - before.y;
  const transforms: Record<string, ProjectObjectRectTransform> = {};

  for (const itemId of runtime.tableItemIds) {
    if (!groupIds.has(itemId)) {
      continue;
    }

    const item = runtime.itemsById[itemId];

    if (!item || item.behavior.movement?.movableInPlaytest === false) {
      continue;
    }

    transforms[itemId] =
      itemId === sourceItemId
        ? after
        : {
            ...item.rectTransform,
            x: item.rectTransform.x + deltaX,
            y: item.rectTransform.y + deltaY
          };
  }

  return transforms;
}

export function getPlaytestMovePreviewTransforms(
  runtime: PlaytestRuntimeState,
  itemTransforms: Record<string, ProjectObjectRectTransform>
): Record<string, ProjectObjectRectTransform> {
  const previewTransforms: Record<string, ProjectObjectRectTransform> = { ...itemTransforms };

  for (const [itemId, rectTransform] of Object.entries(itemTransforms)) {
    const item = runtime.itemsById[itemId];

    if (item?.baseObject.kind !== "zone") {
      continue;
    }

    Object.assign(
      previewTransforms,
      getPlaytestZoneContentMovePreviewTransforms(runtime, itemId, rectTransform)
    );
  }

  return previewTransforms;
}

function getRuntimeWithMovedItems(
  runtime: PlaytestRuntimeState,
  itemTransforms: Record<string, ProjectObjectRectTransform>
): PlaytestRuntimeState {
  let nextRuntime = runtime;

  for (const [itemId, rectTransform] of Object.entries(itemTransforms)) {
    const item = nextRuntime.itemsById[itemId];

    if (!item || item.behavior.movement?.movableInPlaytest === false) {
      continue;
    }

    const moveResult = getPlaytestItemMoveResult(nextRuntime, item, rectTransform);

    if (!moveResult.accepted) {
      continue;
    }

    nextRuntime = getRuntimeWithUpdatedItem(nextRuntime, itemId, () => moveResult.item);

    if (item.baseObject.kind === "zone") {
      nextRuntime = getRuntimeWithMovedZoneContents(nextRuntime, item.id, {
        x: moveResult.item.rectTransform.x - item.rectTransform.x,
        y: moveResult.item.rectTransform.y - item.rectTransform.y
      });
      continue;
    }

    if (moveResult.item.zonePlacement) {
      nextRuntime = getRuntimeWithItemPlacedAboveZone(
        nextRuntime,
        item.id,
        moveResult.item.zonePlacement.zoneItemId
      );
    }
  }

  return nextRuntime;
}

function getRuntimeWithMovedZoneContents(
  runtime: PlaytestRuntimeState,
  zoneItemId: string,
  delta: { x: number; y: number }
): PlaytestRuntimeState {
  const transforms = getMovedZoneContentTransforms(runtime, zoneItemId, delta);

  if (!Object.keys(transforms).length) {
    return runtime;
  }

  const itemsById = { ...runtime.itemsById };

  for (const [itemId, rectTransform] of Object.entries(transforms)) {
    const item = itemsById[itemId];

    if (item) {
      itemsById[itemId] = { ...item, rectTransform };
    }
  }

  return { ...runtime, itemsById };
}

function getMovedZoneContentTransforms(
  runtime: PlaytestRuntimeState,
  zoneItemId: string,
  delta: { x: number; y: number }
): Record<string, ProjectObjectRectTransform> {
  if (delta.x === 0 && delta.y === 0) {
    return {};
  }

  const transforms: Record<string, ProjectObjectRectTransform> = {};

  for (const item of Object.values(runtime.itemsById)) {
    if (item.zonePlacement?.zoneItemId !== zoneItemId) {
      continue;
    }

    transforms[item.id] = {
      ...item.rectTransform,
      x: item.rectTransform.x + delta.x,
      y: item.rectTransform.y + delta.y
    };
  }

  return transforms;
}

function getRuntimeWithItemPlacedAboveZone(
  runtime: PlaytestRuntimeState,
  itemId: string,
  zoneItemId: string
): PlaytestRuntimeState {
  const itemIndex = runtime.tableItemIds.indexOf(itemId);
  const zoneIndex = runtime.tableItemIds.indexOf(zoneItemId);

  if (itemIndex < 0 || zoneIndex < 0) {
    return runtime;
  }

  const tableItemIds = runtime.tableItemIds.filter((candidateItemId) => candidateItemId !== itemId);
  const lastZoneContentIndex = tableItemIds.reduce((lastIndex, candidateItemId, index) => {
    const candidate = runtime.itemsById[candidateItemId];

    return candidateItemId === zoneItemId || candidate?.zonePlacement?.zoneItemId === zoneItemId
      ? index
      : lastIndex;
  }, -1);

  if (lastZoneContentIndex < 0) {
    return runtime;
  }

  tableItemIds.splice(lastZoneContentIndex + 1, 0, itemId);

  return areStringArraysEqual(tableItemIds, runtime.tableItemIds)
    ? runtime
    : { ...runtime, tableItemIds };
}

type PlaytestItemMoveResult =
  | {
      accepted: false;
    }
  | {
      accepted: true;
      item: PlaytestItem;
    };

function getPlaytestItemMoveResult(
  runtime: PlaytestRuntimeState,
  item: PlaytestItem,
  rectTransform: ProjectObjectRectTransform
): PlaytestItemMoveResult {
  if (item.baseObject.kind === "zone") {
    return {
      accepted: true,
      item: {
        ...item,
        rectTransform,
        zonePlacement: undefined
      }
    };
  }

  const zoneItem = getCandidateZoneItem(runtime, item.id, rectTransform);

  if (!zoneItem) {
    if (!canMoveItemOutOfCurrentZone(runtime, item, null)) {
      return { accepted: false };
    }

    return {
      accepted: true,
      item: {
        ...item,
        rectTransform,
        zonePlacement: undefined
      }
    };
  }

  if (
    !canMoveItemOutOfCurrentZone(runtime, item, zoneItem.id) ||
    !doesZoneAcceptItem(zoneItem, item)
  ) {
    return { accepted: false };
  }

  const zone = getProjectObjectNodeZone(zoneItem.baseObject);

  if (zone.mode === "slots") {
    const slotMove = getNearestZoneSlotMove(zoneItem, rectTransform);

    if (!slotMove) {
      return { accepted: false };
    }

    if (
      zoneItem.behavior.zone?.slotOccupancy !== "stack" &&
      isZoneSlotOccupied(runtime, zoneItem.id, slotMove.slotIndex, item.id)
    ) {
      return { accepted: false };
    }

    return {
      accepted: true,
      item: getItemWithZonePlacement(item, zoneItem, slotMove.rectTransform, {
        slotIndex: slotMove.slotIndex,
        zoneItemId: zoneItem.id
      })
    };
  }

  return {
    accepted: true,
    item: getItemWithZonePlacement(item, zoneItem, rectTransform, {
      zoneItemId: zoneItem.id
    })
  };
}

function getCandidateZoneItem(
  runtime: PlaytestRuntimeState,
  movedItemId: string,
  rectTransform: ProjectObjectRectTransform
): PlaytestItem | null {
  const center = getTableItemCenter(rectTransform);

  for (const itemId of [...runtime.tableItemIds].reverse()) {
    if (itemId === movedItemId) {
      continue;
    }

    const item = runtime.itemsById[itemId];

    if (
      !item ||
      !item.visible ||
      item.baseObject.kind !== "zone" ||
      !isPointInsideRect(center, item.rectTransform)
    ) {
      continue;
    }

    return item;
  }

  return null;
}

function doesZoneAcceptItem(zoneItem: PlaytestItem, item: PlaytestItem) {
  if (item.baseObject.kind === "zone") {
    return false;
  }

  const acceptedKinds = zoneItem.behavior.zone?.acceptedKinds ?? [];
  const acceptedObjectFileNodeIds = zoneItem.behavior.zone?.acceptedObjectFileNodeIds ?? [];

  return (
    (acceptedKinds.length === 0 && acceptedObjectFileNodeIds.length === 0) ||
    acceptedKinds.includes(item.baseObject.kind) ||
    (item.sourceObjectFileNodeId
      ? acceptedObjectFileNodeIds.includes(item.sourceObjectFileNodeId)
      : false)
  );
}

function canMoveItemOutOfCurrentZone(
  runtime: PlaytestRuntimeState,
  item: PlaytestItem,
  nextZoneItemId: string | null
) {
  const currentZoneItemId = item.zonePlacement?.zoneItemId;

  if (!currentZoneItemId || currentZoneItemId === nextZoneItemId) {
    return true;
  }

  const currentZoneItem = runtime.itemsById[currentZoneItemId];

  return currentZoneItem?.behavior.zone?.allowRemove !== false;
}

function getNearestZoneSlotMove(
  zoneItem: PlaytestItem,
  rectTransform: ProjectObjectRectTransform
): { rectTransform: ProjectObjectRectTransform; slotIndex: number } | null {
  const slotRects = zoneItem.zoneSlotRects ?? [];

  if (!slotRects.length) {
    return null;
  }

  const zoneBounds = getTableItemBounds(zoneItem.rectTransform);
  const itemCenter = getTableItemCenter(rectTransform);
  const itemCenterInZone = {
    x: (itemCenter.x - zoneBounds.left) / getRectScale(zoneItem.rectTransform.scaleX),
    y: (itemCenter.y - zoneBounds.top) / getRectScale(zoneItem.rectTransform.scaleY)
  };
  let nearestSlotIndex = 0;
  let nearestSlotDistance = Number.POSITIVE_INFINITY;

  for (const [index, slotRect] of slotRects.entries()) {
    const slotCenter = getRectCenter(slotRect);
    const distance = getSquaredDistance(itemCenterInZone, slotCenter);

    if (distance < nearestSlotDistance) {
      nearestSlotDistance = distance;
      nearestSlotIndex = index;
    }
  }

  const slotRect = slotRects[nearestSlotIndex];

  if (!slotRect) {
    return null;
  }

  return {
    rectTransform: {
      ...rectTransform,
      x:
        zoneBounds.left +
        (slotRect.x + slotRect.width / 2) * getRectScale(zoneItem.rectTransform.scaleX),
      y:
        zoneBounds.top +
        (slotRect.y + slotRect.height / 2) * getRectScale(zoneItem.rectTransform.scaleY)
    },
    slotIndex: nearestSlotIndex
  };
}

function isZoneSlotOccupied(
  runtime: PlaytestRuntimeState,
  zoneItemId: string,
  slotIndex: number,
  movedItemId: string
) {
  return Object.values(runtime.itemsById).some(
    (item) =>
      item.id !== movedItemId &&
      item.zonePlacement?.zoneItemId === zoneItemId &&
      item.zonePlacement.slotIndex === slotIndex
  );
}

function getItemWithZonePlacement(
  item: PlaytestItem,
  zoneItem: PlaytestItem,
  rectTransform: ProjectObjectRectTransform,
  zonePlacement: PlaytestZonePlacement
): PlaytestItem {
  const enteredZone = item.zonePlacement?.zoneItemId !== zoneItem.id;
  const sideOnEnter = zoneItem.behavior.zone?.sideOnEnter ?? "preserve";
  const placedItem: PlaytestItem = {
    ...item,
    rectTransform,
    zonePlacement
  };

  if (!enteredZone || sideOnEnter === "preserve" || !hasProjectObjectSides(item.baseObject.kind)) {
    return placedItem;
  }

  return {
    ...placedItem,
    activeSide: sideOnEnter,
    hidden: false,
    revealed: true
  };
}

function getRectCenter(rect: Pick<ProjectObjectRectTransform, "height" | "width" | "x" | "y">) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

function getTableItemCenter(rect: Pick<ProjectObjectRectTransform, "x" | "y">) {
  return {
    x: rect.x,
    y: rect.y
  };
}

function isPointInsideRect(
  point: { x: number; y: number },
  rect: Pick<ProjectObjectRectTransform, "height" | "scaleX" | "scaleY" | "width" | "x" | "y">
) {
  const bounds = getTableItemBounds(rect);

  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  );
}

function getTableItemBounds(
  rect: Pick<ProjectObjectRectTransform, "height" | "scaleX" | "scaleY" | "width" | "x" | "y">
) {
  const width = rect.width * getRectScale(rect.scaleX);
  const height = rect.height * getRectScale(rect.scaleY);

  return {
    bottom: rect.y + height / 2,
    left: rect.x - width / 2,
    right: rect.x + width / 2,
    top: rect.y - height / 2
  };
}

function getRectScale(scale: number) {
  return Number.isFinite(scale) && scale !== 0 ? Math.abs(scale) : 1;
}

function getSquaredDistance(left: { x: number; y: number }, right: { x: number; y: number }) {
  const distanceX = left.x - right.x;
  const distanceY = left.y - right.y;

  return distanceX * distanceX + distanceY * distanceY;
}

function getRuntimeWithDrawnContainerItem(
  runtime: PlaytestRuntimeState,
  containerItemId: string,
  random: () => number
): PlaytestRuntimeState {
  const containerItem = runtime.itemsById[containerItemId];

  if (!containerItem || !isRuntimeContainer(containerItem) || !containerItem.contents.length) {
    return runtime;
  }

  const drawIndex =
    containerItem.behavior.container?.drawOrder === "random"
      ? Math.floor(random() * containerItem.contents.length)
      : 0;
  const drawnItemId = containerItem.contents[drawIndex];
  const nextContents = containerItem.contents.filter((_, index) => index !== drawIndex);
  const drawnItem = drawnItemId ? runtime.itemsById[drawnItemId] : undefined;

  if (!drawnItemId || !drawnItem) {
    return runtime;
  }

  const insertIndex = runtime.tableItemIds.indexOf(containerItemId);
  const nextTableItemIds = [...runtime.tableItemIds];
  nextTableItemIds.splice(
    insertIndex >= 0 ? insertIndex + 1 : nextTableItemIds.length,
    0,
    drawnItemId
  );

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
      ...getDrawnItemVisibilityState(
        drawnItem,
        containerItem.behavior.container?.drawnItemSide ?? "front"
      ),
      rectTransform: drawnRectTransform,
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

  if (action.type === "incrementScoreTrackMarker" || action.type === "decrementScoreTrackMarker") {
    const marker = afterItem?.scoreTrackMarkers?.find(
      (candidate) => candidate.id === action.markerId
    );
    const direction = action.type === "incrementScoreTrackMarker" ? "Increase" : "Decrease";

    return marker
      ? `${direction} ${marker.label || action.markerId} on ${itemName}`
      : `${direction} score on ${itemName}`;
  }

  return `Decrease ${itemName}`;
}

function getRuntimeWithStartupContainerShuffles(
  runtime: PlaytestRuntimeState,
  random: () => number
): { labels: string[]; runtime: PlaytestRuntimeState } {
  let nextRuntime = runtime;
  const labels: string[] = [];

  for (const itemId of runtime.tableItemIds) {
    const item = nextRuntime.itemsById[itemId];

    if (
      !item ||
      !isRuntimeContainer(item) ||
      !item.behavior.container?.shuffleOnStart ||
      item.contents.length < 2
    ) {
      continue;
    }

    nextRuntime = getRuntimeWithUpdatedItem(nextRuntime, item.id, (currentItem) => ({
      ...currentItem,
      contents: shuffleItems(currentItem.contents, random)
    }));
    labels.push(`Shuffle ${item.name}`);
  }

  return { labels, runtime: nextRuntime };
}

function isRuntimeContainer(item: PlaytestItem) {
  return Boolean(item.baseObject.components?.container);
}

function getInitialActiveSide(
  object: ProjectObjectNode,
  behavior: ProjectTableSetupItemBehavior
): ProjectObjectSide {
  if (!hasProjectObjectSides(object.kind)) {
    return "front";
  }

  return getProjectObjectNodeDoubleSide(object).enabled
    ? (behavior.side?.initialSide ?? "front")
    : "front";
}

function getDrawnItemVisibilityState(
  item: PlaytestItem,
  drawnItemSide: ProjectObjectSide
): Pick<PlaytestItem, "activeSide" | "hidden" | "revealed"> {
  if (hasProjectObjectSides(item.baseObject.kind)) {
    return {
      activeSide: drawnItemSide,
      hidden: false,
      revealed: true
    };
  }

  return {
    activeSide: "front",
    hidden: drawnItemSide === "back",
    revealed: drawnItemSide === "front"
  };
}

function getEntryQuantity(quantity: number) {
  return Math.max(
    0,
    getProjectObjectContainerTotalCount({ entries: [{ objectFileNodeId: "x", quantity }] })
  );
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
