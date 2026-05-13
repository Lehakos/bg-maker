import type {
  ProjectFileNode,
  ProjectGameConfig,
  ProjectGameCounter,
  ProjectObjectCounter,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectRuleCondition,
  ProjectObjectRulePlayerTarget,
  ProjectObjectRules,
  ProjectObjectScoreTrackMarker,
  ProjectObjectSide,
  ProjectTableSetup,
  ProjectTableSetupItemCommand,
  ProjectTableSetupItemDrawFromContainerToTableOffsetCommand,
  ProjectTableSetupItemDrawFromContainerToTargetZoneCommand,
  ProjectTableSetupItemRefillTargetZoneFromContainerCommand,
  ProjectTableSetupItem,
  ProjectTableSetupItemBehavior,
  ProjectTableSetupItemGameBinding
} from "@bg-maker/shared";
import {
  getDefaultProjectGameConfig,
  getProjectObjectContainerTotalCount,
  getProjectTableSetupItemId,
  hasProjectObjectSides,
  normalizeProjectObjectDieActiveFace,
  resolveProjectObjectFileRulesById,
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
import {
  getProjectTableSetupItemBehavior,
  normalizeProjectTableSetupItemRotationStep
} from "../project-table-setup/project-table-setup-behavior";

export type ProjectWorkspaceMode = "edit" | "playtest";

export type PlaytestItem = {
  activeSide: ProjectObjectSide;
  baseObject: ProjectObjectNode;
  behavior: ProjectTableSetupItemBehavior;
  contents: string[];
  counterValue?: number;
  dieFace?: number;
  gameBinding?: ProjectTableSetupItemGameBinding;
  hidden: boolean;
  id: string;
  name: string;
  rectTransform: ProjectObjectRectTransform;
  revealed: boolean;
  rules?: ProjectObjectRules;
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
  activePlayerId: string | null;
  gameState: PlaytestGameState;
  itemsById: Record<string, PlaytestItem>;
  selectedItemId: string | null;
  selectedItemIds: string[];
  tableItemIds: string[];
};

export type PlaytestGameState = {
  counterValues: Record<string, number>;
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
  gameConfigSnapshot: ProjectGameConfig;
  id: string;
  projectId: string;
  redoStack: PlaytestHistoryEntry[];
  tableSetupFileNodeId: string;
  tableSetupName: string;
  tableSetupSnapshot: ProjectTableSetup;
  undoStack: PlaytestHistoryEntry[];
};

export type PlaytestActionResultReason =
  | "conditionFailed"
  | "counterMissing"
  | "emptySource"
  | "invalidActivePlayer"
  | "missingSourceOrTarget"
  | "noChange"
  | "notInteractable"
  | "notMovable"
  | "ruleMissing"
  | "removeBlocked"
  | "slotOccupied"
  | "targetUnavailable"
  | "zoneFull"
  | "zoneRejectedItem";

export type PlaytestActionFeedbackCode = PlaytestActionResultReason;

export type PlaytestActionResult =
  | {
      session: PlaytestSession;
      status: "applied";
    }
  | {
      feedbackCode: PlaytestActionFeedbackCode;
      reason: PlaytestActionResultReason;
      session: PlaytestSession;
      status: "blocked" | "noop";
    };

export type PlaytestCreateOptions = {
  createId?: () => string;
  now?: () => string;
  gameConfig?: ProjectGameConfig;
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
      commandId: string;
      itemId: string;
      type: "executeCommand";
    }
  | {
      itemId: string;
      ruleId: string;
      type: "playCard";
    }
  | {
      playerId: string;
      type: "setActivePlayer";
    }
  | {
      direction: -1 | 1;
      itemId: string;
      type: "rotateItem";
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

export type PlaytestCommandPreviewRequest = {
  commandId: string;
  itemId: string;
};

export type PlaytestCommandDestinationPreview = {
  destinationRectTransform?: ProjectObjectRectTransform;
  targetItemId?: string;
  targetRectTransform?: ProjectObjectRectTransform;
};

type PlaytestActionContext = {
  createId: () => string;
  now: () => string;
  random: () => number;
};

const defaultDrawOffset = 32;

type PlaytestRuntimeActionResult =
  | {
      runtime: PlaytestRuntimeState;
      status: "applied";
    }
  | PlaytestRuntimeBlockedOrNoopActionResult;

type PlaytestRuntimeBlockedOrNoopActionResult = {
  reason: PlaytestActionResultReason;
  runtime: PlaytestRuntimeState;
  status: "blocked" | "noop";
};

export type PlaytestItemMovePreview =
  | {
      accepted: false;
      reason: PlaytestActionResultReason;
      targetItemId?: string;
      targetRectTransform?: ProjectObjectRectTransform;
    }
  | {
      accepted: true;
      item: PlaytestItem;
    };

export function createPlaytestSession({
  createId = createPlaytestId,
  fileTree,
  gameConfig = getDefaultProjectGameConfig(),
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
  const tableSetupItemIds = tableSetup.items.map(getProjectTableSetupItemId);
  const gameConfigSnapshot = cloneProjectGameConfig(gameConfig);

  for (const item of tableSetup.items) {
    const runtimeItem = createPlaytestItemFromTableSetupItem({
      createId,
      fileTree,
      item,
      tableSetupItemIds
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
  const activePlayerId = gameConfigSnapshot.players[0]?.id ?? null;
  const startupResult = getRuntimeWithStartupContainerShuffles(
    {
      activePlayerId,
      gameState: createInitialPlaytestGameState(gameConfigSnapshot),
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
    gameConfigSnapshot,
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
): PlaytestActionResult {
  const context: PlaytestActionContext = {
    createId: options.createId ?? createPlaytestId,
    now: options.now ?? createPlaytestTimestamp,
    random: options.random ?? Math.random
  };

  if (action.type === "selectItem" || action.type === "selectItems") {
    const nextSession = selectPlaytestItems(
      session,
      getActionSelectedItemIds(session, action),
      action.type === "selectItem" ? action.itemId : action.primaryItemId
    );

    return nextSession === session
      ? createPlaytestActionResult(session, "noop", "noChange")
      : { session: nextSession, status: "applied" };
  }

  const before = getPlaytestRuntimeState(session);
  const runtimeResult = reducePlaytestAction(before, action, context, session.gameConfigSnapshot);

  if (runtimeResult.status !== "applied") {
    return createPlaytestActionResult(session, runtimeResult.status, runtimeResult.reason);
  }

  const nextRuntime = runtimeResult.runtime;

  if (nextRuntime === before || arePlaytestRuntimeStatesEqual(before, nextRuntime)) {
    return createPlaytestActionResult(session, "noop", "noChange");
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
    session: {
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
    },
    status: "applied"
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

function createPlaytestActionResult(
  session: PlaytestSession,
  status: "blocked" | "noop",
  reason: PlaytestActionResultReason
): PlaytestActionResult {
  return {
    feedbackCode: reason,
    reason,
    session,
    status
  };
}

function createRuntimeAppliedResult(runtime: PlaytestRuntimeState): PlaytestRuntimeActionResult {
  return { runtime, status: "applied" };
}

function createRuntimeActionResult(
  runtime: PlaytestRuntimeState,
  status: "blocked" | "noop",
  reason: PlaytestActionResultReason
): PlaytestRuntimeBlockedOrNoopActionResult {
  return { reason, runtime, status };
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
  itemsById: Record<string, PlaytestItem> = {},
  session?: PlaytestSession | null
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

  const boundCounter = session ? getPlaytestItemBoundCounter(session, item) : null;
  const boundCounterValue = session ? getPlaytestItemBoundCounterValue(session, item) : null;

  if (
    object.kind === "counter" &&
    (typeof item.counterValue === "number" || typeof boundCounterValue === "number")
  ) {
    const counter = getProjectObjectNodeCounter(object);
    object =
      setProjectObjectNodeCounter([object], object.id, {
        ...counter,
        defaultValue:
          typeof boundCounterValue === "number"
            ? boundCounterValue
            : (item.counterValue ?? counter.defaultValue)
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

  if (object.kind === "scoreTrack" && (item.scoreTrackMarkers || boundCounter)) {
    const scoreTrack = getProjectObjectNodeScoreTrack(object);
    const boundMarkers = session ? getPlaytestItemBoundScoreTrackMarkers(session, item) : null;
    object =
      setProjectObjectNodeScoreTrack([object], object.id, {
        ...scoreTrack,
        markers: boundMarkers ?? item.scoreTrackMarkers ?? scoreTrack.markers
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

export function getPlaytestItemBoundCounterValue(
  session: PlaytestSession,
  item: PlaytestItem
): number | null {
  const boundCounter = getPlaytestItemBoundCounter(session, item);
  const boundCounterKey = boundCounter
    ? getPlaytestCounterValueKeyForBinding(boundCounter, item.gameBinding)
    : null;

  if (!boundCounter || !boundCounterKey) {
    return null;
  }

  return session.gameState.counterValues[boundCounterKey] ?? boundCounter.defaultValue;
}

export function getPlaytestItemBoundScoreTrackMarkers(
  session: PlaytestSession,
  item: PlaytestItem
): ProjectObjectScoreTrackMarker[] | null {
  const boundCounter = getPlaytestItemBoundCounter(session, item);

  if (boundCounter?.scope !== "player") {
    return null;
  }

  return session.gameConfigSnapshot.players.map((player) => ({
    color: player.color,
    id: player.id,
    label: player.name,
    value:
      session.gameState.counterValues[getPlayerCounterValueKey(player.id, boundCounter.id)] ??
      boundCounter.defaultValue
  }));
}

export function getPlaytestSelectedItem(session: PlaytestSession | null): PlaytestItem | null {
  if (!session?.selectedItemId) {
    return null;
  }

  return session.itemsById[session.selectedItemId] ?? null;
}

export function getPlaytestRuntimeState(session: PlaytestSession): PlaytestRuntimeState {
  return {
    activePlayerId: session.activePlayerId,
    gameState: session.gameState,
    itemsById: session.itemsById,
    selectedItemId: session.selectedItemId,
    selectedItemIds: session.selectedItemIds,
    tableItemIds: session.tableItemIds
  };
}

export function getPlaytestCommandDestinationPreview(
  runtime: PlaytestRuntimeState,
  request: PlaytestCommandPreviewRequest
): PlaytestCommandDestinationPreview | null {
  const containerItem = runtime.itemsById[request.itemId];
  const command = containerItem?.behavior.commands?.find(
    (candidate) => candidate.id === request.commandId
  );

  if (!containerItem || !command || command.type === "shuffleContainer") {
    return null;
  }

  const drawnItem = getCommandPreviewDrawnItem(runtime, containerItem);

  if (!drawnItem) {
    return null;
  }

  if (command.type === "drawFromContainerToTableOffset") {
    return {
      destinationRectTransform: {
        ...drawnItem.rectTransform,
        x: containerItem.rectTransform.x + command.offset.x,
        y: containerItem.rectTransform.y + command.offset.y
      }
    };
  }

  const targetItem = runtime.itemsById[command.targetItemId];

  if (!targetItem || targetItem.baseObject.kind !== "zone") {
    return null;
  }

  const preview: PlaytestCommandDestinationPreview = {
    targetItemId: targetItem.id,
    targetRectTransform: targetItem.rectTransform
  };

  if (!doesZoneAcceptItem(targetItem, drawnItem)) {
    return preview;
  }

  const placedItem = getDrawnItemForTargetZone({
    drawnItem,
    drawnItemSide: command.drawnItemSide,
    runtime,
    targetItem
  });

  return placedItem
    ? {
        ...preview,
        destinationRectTransform: placedItem.rectTransform
      }
    : preview;
}

export function getPlaytestCommandTargetName(
  command: ProjectTableSetupItemCommand,
  itemsById: Record<string, PlaytestItem>
): string | null {
  if (command.type === "shuffleContainer") {
    return null;
  }

  if (command.type === "drawFromContainerToTableOffset") {
    return "Table";
  }

  return itemsById[command.targetItemId]?.name ?? "Missing target";
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

function getRuntimeWithPlayedCard(
  runtime: PlaytestRuntimeState,
  itemId: string,
  ruleId: string,
  gameConfig: ProjectGameConfig,
  random: () => number
): PlaytestRuntimeActionResult {
  const item = runtime.itemsById[itemId];
  const rule = item?.rules?.playCards.find((candidate) => candidate.id === ruleId);

  if (!item || !rule) {
    return createRuntimeActionResult(
      runtime,
      "noop",
      item ? "ruleMissing" : "missingSourceOrTarget"
    );
  }

  const conditionResult = getPlayCardRuleConditionsResult(runtime, item, rule, gameConfig);

  if (!conditionResult.ok) {
    return createRuntimeActionResult(runtime, "blocked", conditionResult.reason);
  }

  let nextRuntime = runtime;

  for (const effect of rule.effects) {
    if (effect.type === "modifyCounter") {
      const counter = gameConfig.counters.find((candidate) => candidate.id === effect.counterId);
      const key = counter
        ? getPlaytestCounterValueKeyForRule(counter, effect.target, nextRuntime.activePlayerId)
        : null;

      if (!counter || !key) {
        return createRuntimeActionResult(runtime, "blocked", "counterMissing");
      }

      nextRuntime = getRuntimeWithGameCounterValue(nextRuntime, key, (value) =>
        clampCounterValue(counter, value + effect.amount)
      );
      continue;
    }

    if (effect.type === "moveThisCardToZoneRole") {
      const currentItem = nextRuntime.itemsById[itemId];
      const targetZone = currentItem
        ? findPlaytestZoneByRole(nextRuntime, effect.role, effect.owner)
        : null;

      if (!currentItem || !targetZone) {
        return createRuntimeActionResult(runtime, "blocked", "targetUnavailable");
      }

      const moveResult = getRuntimeWithItemMovedToZone(
        nextRuntime,
        currentItem,
        targetZone,
        effect.side
      );

      if (moveResult.status !== "applied") {
        return moveResult;
      }

      nextRuntime = moveResult.runtime;
      continue;
    }

    const sourceContainer = findPlaytestContainerByRole(
      nextRuntime,
      effect.sourceRole,
      effect.owner
    );
    const targetZone = findPlaytestZoneByRole(nextRuntime, effect.targetRole, effect.owner);

    if (!sourceContainer || !targetZone) {
      return createRuntimeActionResult(runtime, "blocked", "targetUnavailable");
    }

    for (let index = 0; index < effect.count; index += 1) {
      const currentSource = nextRuntime.itemsById[sourceContainer.id];
      const result =
        currentSource && targetZone
          ? getNextRuntimeWithDrawnContainerItemToTargetZone({
              containerItemId: currentSource.id,
              drawOrder: currentSource.behavior.container?.drawOrder ?? "top",
              drawnItemSide: currentSource.behavior.container?.drawnItemSide ?? "front",
              random,
              runtime: nextRuntime,
              tableInsertOffset: index,
              targetItemId: targetZone.id
            })
          : createRuntimeActionResult(nextRuntime, "blocked", "targetUnavailable");

      if (result.status !== "applied") {
        return result;
      }

      nextRuntime = result.runtime;
    }
  }

  return nextRuntime === runtime || arePlaytestRuntimeStatesEqual(runtime, nextRuntime)
    ? createRuntimeActionResult(runtime, "noop", "noChange")
    : createRuntimeAppliedResult(nextRuntime);
}

function getPlayCardRuleConditionsResult(
  runtime: PlaytestRuntimeState,
  item: PlaytestItem,
  rule: ProjectObjectRules["playCards"][number],
  gameConfig: ProjectGameConfig
): { ok: true } | { ok: false; reason: PlaytestActionResultReason } {
  if (!rule.conditions.length) {
    return { ok: true };
  }

  let firstFailure: PlaytestActionResultReason = "conditionFailed";
  let ok = true;

  for (const [index, condition] of rule.conditions.entries()) {
    const result = getPlayCardRuleConditionResult(runtime, item, condition, gameConfig);

    if (!result.ok && firstFailure === "conditionFailed") {
      firstFailure = result.reason;
    }

    if (index === 0) {
      ok = result.ok;
      continue;
    }

    ok = condition.connector === "or" ? ok || result.ok : ok && result.ok;
  }

  return ok ? { ok: true } : { ok: false, reason: firstFailure };
}

function getPlayCardRuleConditionResult(
  runtime: PlaytestRuntimeState,
  item: PlaytestItem,
  condition: ProjectObjectRuleCondition,
  gameConfig: ProjectGameConfig
): { ok: true } | { ok: false; reason: PlaytestActionResultReason } {
  if (condition.type === "cardInZoneRole") {
    const zone = findPlaytestZoneByRole(runtime, condition.role, condition.owner);

    return zone && item.zonePlacement?.zoneItemId === zone.id
      ? { ok: true }
      : { ok: false, reason: zone ? "conditionFailed" : "targetUnavailable" };
  }

  const counter = gameConfig.counters.find((candidate) => candidate.id === condition.counterId);
  const key = counter
    ? getPlaytestCounterValueKeyForRule(counter, condition.target, runtime.activePlayerId)
    : null;

  if (!counter || !key) {
    return { ok: false, reason: counter ? "invalidActivePlayer" : "counterMissing" };
  }

  const value = runtime.gameState.counterValues[key] ?? counter.defaultValue;

  if (condition.operator === "atMost") {
    return value <= condition.value ? { ok: true } : { ok: false, reason: "conditionFailed" };
  }

  if (condition.operator === "equals") {
    return value === condition.value ? { ok: true } : { ok: false, reason: "conditionFailed" };
  }

  return value >= condition.value ? { ok: true } : { ok: false, reason: "conditionFailed" };
}

function reducePlaytestAction(
  runtime: PlaytestRuntimeState,
  action: Exclude<PlaytestAction, { type: "selectItem" | "selectItems" }>,
  context: PlaytestActionContext,
  gameConfig: ProjectGameConfig
): PlaytestRuntimeActionResult {
  if (action.type === "setActivePlayer") {
    if (!gameConfig.players.some((player) => player.id === action.playerId)) {
      return createRuntimeActionResult(runtime, "blocked", "invalidActivePlayer");
    }

    return runtime.activePlayerId === action.playerId
      ? createRuntimeActionResult(runtime, "noop", "noChange")
      : createRuntimeAppliedResult({ ...runtime, activePlayerId: action.playerId });
  }

  if (action.type === "moveItems") {
    return getRuntimeWithMovedItems(runtime, action.itemTransforms);
  }

  const item = runtime.itemsById[action.itemId];

  if (!item) {
    return createRuntimeActionResult(runtime, "noop", "missingSourceOrTarget");
  }

  if (item.behavior.interaction?.interactableInPlaytest === false) {
    return createRuntimeActionResult(runtime, "blocked", "notInteractable");
  }

  if (action.type === "flipItem") {
    return createRuntimeAppliedResult(
      getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) =>
        hasProjectObjectSides(currentItem.baseObject.kind)
          ? {
              ...currentItem,
              activeSide: currentItem.activeSide === "front" ? "back" : "front",
              revealed: true
            }
          : currentItem
      )
    );
  }

  if (action.type === "rotateItem") {
    if (item.behavior.rotation?.rotatableInPlaytest === false) {
      return createRuntimeActionResult(runtime, "blocked", "notMovable");
    }

    return createRuntimeAppliedResult(
      getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
        ...currentItem,
        rectTransform: getRotatedPlaytestItemRectTransform(currentItem, action.direction)
      }))
    );
  }

  if (action.type === "hideItem") {
    return createRuntimeAppliedResult(
      getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
        ...currentItem,
        hidden: true,
        revealed: false
      }))
    );
  }

  if (action.type === "revealItem") {
    return createRuntimeAppliedResult(
      getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
        ...currentItem,
        hidden: false,
        revealed: true
      }))
    );
  }

  if (action.type === "shuffleContainer") {
    if (!isRuntimeContainer(item) || item.contents.length === 0) {
      return createRuntimeActionResult(runtime, "noop", "emptySource");
    }

    if (item.contents.length < 2) {
      return createRuntimeActionResult(runtime, "noop", "noChange");
    }

    return createRuntimeAppliedResult(
      getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
        ...currentItem,
        contents: shuffleItems(currentItem.contents, context.random)
      }))
    );
  }

  if (action.type === "drawFromContainer") {
    if (!isRuntimeContainer(item) || item.contents.length === 0) {
      return createRuntimeActionResult(runtime, "noop", "emptySource");
    }

    return createRuntimeAppliedResult(
      getRuntimeWithDrawnContainerItem(runtime, item.id, context.random)
    );
  }

  if (action.type === "executeCommand") {
    const command = item.behavior.commands?.find((candidate) => candidate.id === action.commandId);

    return command
      ? getRuntimeWithExecutedCommand(runtime, item.id, command, context.random)
      : createRuntimeActionResult(runtime, "noop", "missingSourceOrTarget");
  }

  if (action.type === "playCard") {
    return getRuntimeWithPlayedCard(runtime, item.id, action.ruleId, gameConfig, context.random);
  }

  if (action.type === "rollDie") {
    if (item.baseObject.kind !== "die") {
      return createRuntimeActionResult(runtime, "noop", "noChange");
    }

    const die = getProjectObjectNodeDie(item.baseObject);
    const face = Math.floor(context.random() * die.faceCount) + 1;

    return createRuntimeAppliedResult(
      getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
        ...currentItem,
        dieFace: normalizeProjectObjectDieActiveFace(face, die.faceCount)
      }))
    );
  }

  if (action.type === "incrementCounter" || action.type === "decrementCounter") {
    if (item.baseObject.kind !== "counter") {
      return createRuntimeActionResult(runtime, "noop", "noChange");
    }

    const counter = getProjectObjectNodeCounter(item.baseObject);
    const currentValue = item.counterValue ?? counter.defaultValue;
    const direction = action.type === "incrementCounter" ? 1 : -1;
    const nextValue = getCounterValueWithStep(counter, currentValue, direction);

    if (nextValue === currentValue) {
      return createRuntimeActionResult(runtime, "noop", "noChange");
    }

    return createRuntimeAppliedResult(
      getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
        ...currentItem,
        counterValue: nextValue
      }))
    );
  }

  if (action.type === "incrementScoreTrackMarker" || action.type === "decrementScoreTrackMarker") {
    if (item.baseObject.kind !== "scoreTrack") {
      return createRuntimeActionResult(runtime, "noop", "noChange");
    }

    const scoreTrack = getProjectObjectNodeScoreTrack(item.baseObject);
    const direction = action.type === "incrementScoreTrackMarker" ? 1 : -1;
    const currentMarkers = item.scoreTrackMarkers ?? scoreTrack.markers;
    const nextMarkers = currentMarkers.map((marker) =>
      marker.id === action.markerId
        ? {
            ...marker,
            value: getScoreTrackMarkerValueWithStep(scoreTrack, marker.value, direction)
          }
        : marker
    );

    if (
      nextMarkers.every((marker, index) => marker.value === currentMarkers[index]?.value) ||
      !currentMarkers.some((marker) => marker.id === action.markerId)
    ) {
      return createRuntimeActionResult(runtime, "noop", "noChange");
    }

    return createRuntimeAppliedResult(
      getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
        ...currentItem,
        scoreTrackMarkers: nextMarkers
      }))
    );
  }

  return createRuntimeActionResult(runtime, "noop", "noChange");
}

function createPlaytestItemFromTableSetupItem({
  createId,
  fileTree,
  item,
  tableSetupItemIds
}: {
  createId: () => string;
  fileTree: readonly ProjectFileNode[];
  item: ProjectTableSetupItem;
  tableSetupItemIds: readonly string[];
}): PlaytestItem | null {
  const object = getProjectTableSetupResolvedItemObject(fileTree, item);

  if (!object) {
    return null;
  }

  return createPlaytestItemFromObject({
    behavior: getProjectTableSetupItemBehavior({
      behavior: item.behavior,
      object,
      tableSetupItemIds
    }),
    createId,
    fileTree,
    gameBinding: item.gameBinding,
    id: item.type === "linkedObject" ? item.id : object.id,
    name: item.type === "linkedObject" ? item.name : object.name,
    object,
    rules:
      item.type === "linkedObject"
        ? resolveProjectObjectFileRulesById(fileTree, item.sourceObjectFileNodeId, new Set())
        : undefined,
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
  gameBinding,
  rules,
  sourceObjectFileNodeId
}: {
  behavior?: ProjectTableSetupItemBehavior;
  createId: () => string;
  fileTree: readonly ProjectFileNode[];
  gameBinding?: ProjectTableSetupItemGameBinding;
  id?: string;
  name?: string;
  object: ProjectObjectNode;
  rules?: ProjectObjectRules;
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
    gameBinding,
    hidden: initialHidden,
    id: runtimeId,
    name: name ?? object.name,
    rectTransform:
      object.kind === "zone"
        ? getEffectiveProjectObjectRectTransform(object, fileTree)
        : getProjectObjectNodeRectTransform(object),
    revealed: !initialHidden,
    rules,
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
        rules: resolveProjectObjectFileRulesById(fileTree, entry.objectFileNodeId, new Set()),
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

  if (!item) {
    return { accepted: false, reason: "missingSourceOrTarget" };
  }

  if (item.behavior.movement?.movableInPlaytest === false) {
    return { accepted: false, reason: "notMovable" };
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

export function getRotatedPlaytestItemRectTransform(
  item: PlaytestItem,
  direction: -1 | 1
): ProjectObjectRectTransform {
  const rotationStep = normalizeProjectTableSetupItemRotationStep(
    item.behavior.rotation?.rotationStep
  );

  return {
    ...item.rectTransform,
    rotation: item.rectTransform.rotation + rotationStep * direction
  };
}

function getRuntimeWithMovedItems(
  runtime: PlaytestRuntimeState,
  itemTransforms: Record<string, ProjectObjectRectTransform>
): PlaytestRuntimeActionResult {
  let nextRuntime = runtime;
  let blockedReason: PlaytestActionResultReason | null = null;
  let sawTransform = false;

  for (const [itemId, rectTransform] of Object.entries(itemTransforms)) {
    sawTransform = true;
    const item = nextRuntime.itemsById[itemId];

    if (!item) {
      blockedReason ??= "missingSourceOrTarget";
      continue;
    }

    if (item.behavior.movement?.movableInPlaytest === false) {
      blockedReason ??= "notMovable";
      continue;
    }

    const moveResult = getPlaytestItemMoveResult(nextRuntime, item, rectTransform);

    if (!moveResult.accepted) {
      blockedReason ??= moveResult.reason;
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

  if (nextRuntime !== runtime) {
    return createRuntimeAppliedResult(nextRuntime);
  }

  if (blockedReason) {
    return createRuntimeActionResult(runtime, "blocked", blockedReason);
  }

  return createRuntimeActionResult(
    runtime,
    "noop",
    sawTransform ? "noChange" : "missingSourceOrTarget"
  );
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
      reason: PlaytestActionResultReason;
      targetItemId?: string;
      targetRectTransform?: ProjectObjectRectTransform;
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
      return { accepted: false, reason: "removeBlocked" };
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

  if (!canMoveItemOutOfCurrentZone(runtime, item, zoneItem.id)) {
    return {
      accepted: false,
      reason: "removeBlocked",
      targetItemId: zoneItem.id,
      targetRectTransform: zoneItem.rectTransform
    };
  }

  if (!doesZoneAcceptItem(zoneItem, item)) {
    return {
      accepted: false,
      reason: "zoneRejectedItem",
      targetItemId: zoneItem.id,
      targetRectTransform: zoneItem.rectTransform
    };
  }

  const zone = getProjectObjectNodeZone(zoneItem.baseObject);

  if (zone.mode === "slots") {
    const slotMove = getNearestZoneSlotMove(zoneItem, rectTransform);

    if (!slotMove) {
      return {
        accepted: false,
        reason: "zoneFull",
        targetItemId: zoneItem.id,
        targetRectTransform: zoneItem.rectTransform
      };
    }

    if (
      zoneItem.behavior.zone?.slotOccupancy !== "stack" &&
      isZoneSlotOccupied(runtime, zoneItem.id, slotMove.slotIndex, item.id)
    ) {
      return {
        accepted: false,
        reason: "slotOccupied",
        targetItemId: zoneItem.id,
        targetRectTransform: zoneItem.rectTransform
      };
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

function getRuntimeWithItemMovedToZone(
  runtime: PlaytestRuntimeState,
  item: PlaytestItem,
  targetZone: PlaytestItem,
  sideOnEnterOverride?: ProjectObjectSide
): PlaytestRuntimeActionResult {
  if (!canMoveItemOutOfCurrentZone(runtime, item, targetZone.id)) {
    return createRuntimeActionResult(runtime, "blocked", "removeBlocked");
  }

  if (!doesZoneAcceptItem(targetZone, item)) {
    return createRuntimeActionResult(runtime, "blocked", "zoneRejectedItem");
  }

  const placedItem = getItemForTargetZone(runtime, item, targetZone, sideOnEnterOverride);

  if (!placedItem) {
    return createRuntimeActionResult(runtime, "blocked", "zoneFull");
  }

  return createRuntimeAppliedResult(
    getRuntimeWithItemPlacedAboveZone(
      getRuntimeWithUpdatedItem(runtime, item.id, () => placedItem),
      item.id,
      targetZone.id
    )
  );
}

function getItemForTargetZone(
  runtime: PlaytestRuntimeState,
  item: PlaytestItem,
  targetZone: PlaytestItem,
  sideOnEnterOverride?: ProjectObjectSide
): PlaytestItem | null {
  if (targetZone.baseObject.kind !== "zone") {
    return null;
  }

  const zone = getProjectObjectNodeZone(targetZone.baseObject);

  if (zone.mode !== "slots") {
    return getItemWithZonePlacement(
      item,
      targetZone,
      {
        ...item.rectTransform,
        x: targetZone.rectTransform.x,
        y: targetZone.rectTransform.y
      },
      { zoneItemId: targetZone.id },
      sideOnEnterOverride
    );
  }

  const slotIndex = getFirstEmptyZoneSlotIndex(runtime, targetZone);

  if (slotIndex === null) {
    return null;
  }

  const rectTransform = getZoneSlotRectTransform(targetZone, item.rectTransform, slotIndex);

  return rectTransform
    ? getItemWithZonePlacement(
        item,
        targetZone,
        rectTransform,
        {
          slotIndex,
          zoneItemId: targetZone.id
        },
        sideOnEnterOverride
      )
    : null;
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

function getFirstEmptyZoneSlotIndex(runtime: PlaytestRuntimeState, zoneItem: PlaytestItem) {
  const slotRects = zoneItem.zoneSlotRects ?? [];

  for (let slotIndex = 0; slotIndex < slotRects.length; slotIndex += 1) {
    if (!isZoneSlotOccupied(runtime, zoneItem.id, slotIndex, "")) {
      return slotIndex;
    }
  }

  return null;
}

function getItemWithZonePlacement(
  item: PlaytestItem,
  zoneItem: PlaytestItem,
  rectTransform: ProjectObjectRectTransform,
  zonePlacement: PlaytestZonePlacement,
  sideOnEnterOverride?: ProjectObjectSide
): PlaytestItem {
  const enteredZone = item.zonePlacement?.zoneItemId !== zoneItem.id;
  const sideOnEnter = sideOnEnterOverride ?? zoneItem.behavior.zone?.sideOnEnter ?? "preserve";
  const placedItem: PlaytestItem = {
    ...item,
    rectTransform,
    zonePlacement
  };

  if (
    (!enteredZone && !sideOnEnterOverride) ||
    sideOnEnter === "preserve" ||
    !hasProjectObjectSides(item.baseObject.kind)
  ) {
    return placedItem;
  }

  return {
    ...placedItem,
    activeSide: sideOnEnter,
    hidden: false,
    revealed: true
  };
}

function getZoneSlotRectTransform(
  zoneItem: PlaytestItem,
  itemRectTransform: ProjectObjectRectTransform,
  slotIndex: number
): ProjectObjectRectTransform | null {
  const slotRect = zoneItem.zoneSlotRects?.[slotIndex];

  if (!slotRect) {
    return null;
  }

  const zoneBounds = getTableItemBounds(zoneItem.rectTransform);

  return {
    ...itemRectTransform,
    x:
      zoneBounds.left +
      (slotRect.x + slotRect.width / 2) * getRectScale(zoneItem.rectTransform.scaleX),
    y:
      zoneBounds.top +
      (slotRect.y + slotRect.height / 2) * getRectScale(zoneItem.rectTransform.scaleY)
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

type ContainerDrawResult = {
  drawnItem: PlaytestItem;
  drawnItemId: string;
  nextContents: string[];
};

function getRuntimeWithExecutedCommand(
  runtime: PlaytestRuntimeState,
  containerItemId: string,
  command: ProjectTableSetupItemCommand,
  random: () => number
): PlaytestRuntimeActionResult {
  if (command.type === "shuffleContainer") {
    const item = runtime.itemsById[containerItemId];

    if (!item || !isRuntimeContainer(item) || item.contents.length === 0) {
      return createRuntimeActionResult(runtime, "noop", "emptySource");
    }

    if (item.contents.length < 2) {
      return createRuntimeActionResult(runtime, "noop", "noChange");
    }

    return createRuntimeAppliedResult(
      getRuntimeWithUpdatedItem(runtime, item.id, (currentItem) => ({
        ...currentItem,
        contents: shuffleItems(currentItem.contents, random)
      }))
    );
  }

  if (command.type === "drawFromContainerToTableOffset") {
    return getRuntimeWithDrawnContainerItemsToTableOffset(
      runtime,
      containerItemId,
      command,
      random
    );
  }

  if (command.type === "drawFromContainerToTargetZone") {
    return getRuntimeWithDrawnContainerItemsToTargetZone(runtime, containerItemId, command, random);
  }

  return getRuntimeWithRefilledTargetZoneFromContainer(runtime, containerItemId, command, random);
}

function getCommandPreviewDrawnItem(
  runtime: PlaytestRuntimeState,
  containerItem: PlaytestItem
): PlaytestItem | null {
  if (!isRuntimeContainer(containerItem)) {
    return null;
  }

  const drawnItemId = containerItem.contents[0];

  return drawnItemId ? (runtime.itemsById[drawnItemId] ?? null) : null;
}

function getRuntimeWithDrawnContainerItemsToTableOffset(
  runtime: PlaytestRuntimeState,
  containerItemId: string,
  command: ProjectTableSetupItemDrawFromContainerToTableOffsetCommand,
  random: () => number
): PlaytestRuntimeActionResult {
  let nextRuntime = runtime;
  const drawnItemIds: string[] = [];

  for (let index = 0; index < command.count; index += 1) {
    const containerItem = nextRuntime.itemsById[containerItemId];
    const draw = containerItem
      ? getContainerDrawResult(nextRuntime, containerItem, command.drawOrder, random)
      : null;

    if (!containerItem || !draw) {
      break;
    }

    const drawnItem = {
      ...draw.drawnItem,
      ...getDrawnItemVisibilityState(draw.drawnItem, command.drawnItemSide),
      rectTransform: {
        ...draw.drawnItem.rectTransform,
        x: containerItem.rectTransform.x + command.offset.x + index * defaultDrawOffset,
        y: containerItem.rectTransform.y + command.offset.y + index * defaultDrawOffset
      },
      visible: true,
      zonePlacement: undefined
    };

    nextRuntime = getRuntimeWithCommittedContainerDraw(
      nextRuntime,
      containerItemId,
      draw,
      drawnItem,
      drawnItemIds.length
    );
    drawnItemIds.push(draw.drawnItemId);
  }

  if (!drawnItemIds.length) {
    return createRuntimeActionResult(
      runtime,
      "noop",
      runtime.itemsById[containerItemId] ? "emptySource" : "missingSourceOrTarget"
    );
  }

  return createRuntimeAppliedResult(
    getRuntimeWithSelectedDrawnItems(nextRuntime, drawnItemIds, runtime)
  );
}

function getRuntimeWithDrawnContainerItemsToTargetZone(
  runtime: PlaytestRuntimeState,
  containerItemId: string,
  command: ProjectTableSetupItemDrawFromContainerToTargetZoneCommand,
  random: () => number
): PlaytestRuntimeActionResult {
  let nextRuntime = runtime;
  const drawnItemIds: string[] = [];
  let lastFailure: PlaytestRuntimeBlockedOrNoopActionResult | undefined;

  for (let index = 0; index < command.count; index += 1) {
    const result = getNextRuntimeWithDrawnContainerItemToTargetZone({
      containerItemId,
      drawOrder: command.drawOrder,
      drawnItemSide: command.drawnItemSide,
      random,
      runtime: nextRuntime,
      tableInsertOffset: drawnItemIds.length,
      targetItemId: command.targetItemId
    });

    if (result.status !== "applied") {
      lastFailure = result;
      break;
    }

    nextRuntime = result.runtime;
    drawnItemIds.push(result.drawnItemId);
  }

  if (!drawnItemIds.length) {
    return lastFailure ?? createRuntimeActionResult(runtime, "noop", "noChange");
  }

  return createRuntimeAppliedResult(
    getRuntimeWithSelectedDrawnItems(nextRuntime, drawnItemIds, runtime)
  );
}

function getRuntimeWithRefilledTargetZoneFromContainer(
  runtime: PlaytestRuntimeState,
  containerItemId: string,
  command: ProjectTableSetupItemRefillTargetZoneFromContainerCommand,
  random: () => number
): PlaytestRuntimeActionResult {
  let nextRuntime = runtime;
  const drawnItemIds: string[] = [];
  let lastFailure: PlaytestRuntimeBlockedOrNoopActionResult | undefined;

  while (true) {
    const targetItem = nextRuntime.itemsById[command.targetItemId];

    if (!targetItem || targetItem.baseObject.kind !== "zone") {
      lastFailure = createRuntimeActionResult(nextRuntime, "noop", "missingSourceOrTarget");
      break;
    }

    const zone = getProjectObjectNodeZone(targetItem.baseObject);

    if (zone.mode !== "slots") {
      lastFailure = createRuntimeActionResult(nextRuntime, "noop", "noChange");
      break;
    }

    if (getFirstEmptyZoneSlotIndex(nextRuntime, targetItem) === null) {
      lastFailure = createRuntimeActionResult(nextRuntime, "blocked", "zoneFull");
      break;
    }

    const result = getNextRuntimeWithDrawnContainerItemToTargetZone({
      containerItemId,
      drawOrder: command.drawOrder,
      drawnItemSide: command.drawnItemSide,
      random,
      runtime: nextRuntime,
      tableInsertOffset: drawnItemIds.length,
      targetItemId: command.targetItemId
    });

    if (result.status !== "applied") {
      lastFailure = result;
      break;
    }

    nextRuntime = result.runtime;
    drawnItemIds.push(result.drawnItemId);
  }

  if (!drawnItemIds.length) {
    return lastFailure ?? createRuntimeActionResult(runtime, "noop", "noChange");
  }

  return createRuntimeAppliedResult(
    getRuntimeWithSelectedDrawnItems(nextRuntime, drawnItemIds, runtime)
  );
}

function getNextRuntimeWithDrawnContainerItemToTargetZone({
  containerItemId,
  drawOrder,
  drawnItemSide,
  random,
  runtime,
  tableInsertOffset,
  targetItemId
}: {
  containerItemId: string;
  drawOrder: ProjectTableSetupItemDrawFromContainerToTargetZoneCommand["drawOrder"];
  drawnItemSide: ProjectObjectSide;
  random: () => number;
  runtime: PlaytestRuntimeState;
  tableInsertOffset: number;
  targetItemId: string;
}):
  | {
      drawnItemId: string;
      runtime: PlaytestRuntimeState;
      status: "applied";
    }
  | PlaytestRuntimeBlockedOrNoopActionResult {
  const containerItem = runtime.itemsById[containerItemId];
  const targetItem = runtime.itemsById[targetItemId];
  const draw = containerItem
    ? getContainerDrawResult(runtime, containerItem, drawOrder, random)
    : null;

  if (!containerItem) {
    return createRuntimeActionResult(runtime, "noop", "missingSourceOrTarget");
  }

  if (!targetItem || targetItem.baseObject.kind !== "zone") {
    return createRuntimeActionResult(runtime, "noop", "missingSourceOrTarget");
  }

  if (!draw) {
    return createRuntimeActionResult(runtime, "noop", "emptySource");
  }

  if (!doesZoneAcceptItem(targetItem, draw.drawnItem)) {
    return createRuntimeActionResult(runtime, "blocked", "zoneRejectedItem");
  }

  const placedItem = getDrawnItemForTargetZone({
    drawnItem: draw.drawnItem,
    drawnItemSide,
    runtime,
    targetItem
  });

  if (!placedItem) {
    return createRuntimeActionResult(runtime, "blocked", "zoneFull");
  }

  const withDrawnItem = getRuntimeWithCommittedContainerDraw(
    runtime,
    containerItemId,
    draw,
    placedItem,
    tableInsertOffset
  );

  return {
    drawnItemId: draw.drawnItemId,
    runtime: getRuntimeWithItemPlacedAboveZone(withDrawnItem, draw.drawnItemId, targetItem.id),
    status: "applied"
  };
}

function getDrawnItemForTargetZone({
  drawnItem,
  drawnItemSide,
  runtime,
  targetItem
}: {
  drawnItem: PlaytestItem;
  drawnItemSide: ProjectObjectSide;
  runtime: PlaytestRuntimeState;
  targetItem: PlaytestItem;
}): PlaytestItem | null {
  if (targetItem.baseObject.kind !== "zone") {
    return null;
  }

  const zone = getProjectObjectNodeZone(targetItem.baseObject);
  const visibleDrawnItem = {
    ...drawnItem,
    ...getDrawnItemVisibilityState(drawnItem, drawnItemSide),
    visible: true,
    zonePlacement: undefined
  };

  if (zone.mode !== "slots") {
    return getItemWithZonePlacement(
      visibleDrawnItem,
      targetItem,
      {
        ...visibleDrawnItem.rectTransform,
        x: targetItem.rectTransform.x,
        y: targetItem.rectTransform.y
      },
      { zoneItemId: targetItem.id }
    );
  }

  const slotIndex = getFirstEmptyZoneSlotIndex(runtime, targetItem);

  if (slotIndex === null) {
    return null;
  }

  const rectTransform = getZoneSlotRectTransform(
    targetItem,
    visibleDrawnItem.rectTransform,
    slotIndex
  );

  return rectTransform
    ? getItemWithZonePlacement(visibleDrawnItem, targetItem, rectTransform, {
        slotIndex,
        zoneItemId: targetItem.id
      })
    : null;
}

function getContainerDrawResult(
  runtime: PlaytestRuntimeState,
  containerItem: PlaytestItem,
  drawOrder: ProjectTableSetupItemDrawFromContainerToTargetZoneCommand["drawOrder"],
  random: () => number
): ContainerDrawResult | null {
  if (!isRuntimeContainer(containerItem) || !containerItem.contents.length) {
    return null;
  }

  const drawIndex =
    drawOrder === "random" ? Math.floor(random() * containerItem.contents.length) : 0;
  const drawnItemId = containerItem.contents[drawIndex];
  const drawnItem = drawnItemId ? runtime.itemsById[drawnItemId] : undefined;

  if (!drawnItemId || !drawnItem) {
    return null;
  }

  return {
    drawnItem,
    drawnItemId,
    nextContents: containerItem.contents.filter((_, index) => index !== drawIndex)
  };
}

function getRuntimeWithCommittedContainerDraw(
  runtime: PlaytestRuntimeState,
  containerItemId: string,
  draw: ContainerDrawResult,
  drawnItem: PlaytestItem,
  tableInsertOffset: number
): PlaytestRuntimeState {
  const containerItem = runtime.itemsById[containerItemId];

  if (!containerItem) {
    return runtime;
  }

  const insertIndex = runtime.tableItemIds.indexOf(containerItemId);
  const nextTableItemIds = [...runtime.tableItemIds];
  nextTableItemIds.splice(
    insertIndex >= 0
      ? Math.min(insertIndex + tableInsertOffset + 1, nextTableItemIds.length)
      : nextTableItemIds.length,
    0,
    draw.drawnItemId
  );

  return {
    ...runtime,
    itemsById: {
      ...runtime.itemsById,
      [containerItemId]: {
        ...containerItem,
        contents: draw.nextContents
      },
      [draw.drawnItemId]: drawnItem
    },
    tableItemIds: nextTableItemIds
  };
}

function getRuntimeWithSelectedDrawnItems(
  runtime: PlaytestRuntimeState,
  drawnItemIds: readonly string[],
  fallbackRuntime: PlaytestRuntimeState
): PlaytestRuntimeState {
  if (!drawnItemIds.length) {
    return fallbackRuntime;
  }

  return {
    ...runtime,
    selectedItemId: drawnItemIds[0] ?? null,
    selectedItemIds: [...drawnItemIds]
  };
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

  if (action.type === "setActivePlayer") {
    return "Change active player";
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

  if (action.type === "rotateItem") {
    return `Rotate ${itemName}`;
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

  if (action.type === "executeCommand") {
    const command = beforeItem?.behavior.commands?.find(
      (candidate) => candidate.id === action.commandId
    );

    return command?.label || `Run ${itemName}`;
  }

  if (action.type === "playCard") {
    const rule = beforeItem?.rules?.playCards.find((candidate) => candidate.id === action.ruleId);

    return rule?.label || `Play ${itemName}`;
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

function createInitialPlaytestGameState(gameConfig: ProjectGameConfig): PlaytestGameState {
  const counterValues: Record<string, number> = {};

  for (const counter of gameConfig.counters) {
    if (counter.scope === "shared") {
      counterValues[getSharedCounterValueKey(counter.id)] = counter.defaultValue;
      continue;
    }

    for (const player of gameConfig.players) {
      counterValues[getPlayerCounterValueKey(player.id, counter.id)] = counter.defaultValue;
    }
  }

  return { counterValues };
}

function getRuntimeWithGameCounterValue(
  runtime: PlaytestRuntimeState,
  key: string,
  updateValue: (value: number) => number
): PlaytestRuntimeState {
  const currentValue = runtime.gameState.counterValues[key] ?? 0;
  const nextValue = updateValue(currentValue);

  if (nextValue === currentValue) {
    return runtime;
  }

  return {
    ...runtime,
    gameState: {
      ...runtime.gameState,
      counterValues: {
        ...runtime.gameState.counterValues,
        [key]: nextValue
      }
    }
  };
}

function getPlaytestCounterValueKeyForRule(
  counter: ProjectGameCounter,
  target: ProjectObjectRulePlayerTarget,
  activePlayerId: string | null
) {
  if (counter.scope === "shared") {
    return getSharedCounterValueKey(counter.id);
  }

  if (target === "shared") {
    return null;
  }

  return activePlayerId ? getPlayerCounterValueKey(activePlayerId, counter.id) : null;
}

function getPlaytestCounterValueKeyForBinding(
  counter: ProjectGameCounter,
  binding: ProjectTableSetupItemGameBinding | undefined
) {
  if (counter.scope === "shared") {
    return getSharedCounterValueKey(counter.id);
  }

  return binding?.counterOwner?.type === "player"
    ? getPlayerCounterValueKey(binding.counterOwner.playerId, counter.id)
    : null;
}

function getPlaytestItemBoundCounter(session: PlaytestSession, item: PlaytestItem) {
  return item.gameBinding?.counterId
    ? (session.gameConfigSnapshot.counters.find(
        (counter) => counter.id === item.gameBinding?.counterId
      ) ?? null)
    : null;
}

function getSharedCounterValueKey(counterId: string) {
  return `shared:${counterId}`;
}

function getPlayerCounterValueKey(playerId: string, counterId: string) {
  return `player:${playerId}:${counterId}`;
}

function clampCounterValue(counter: ProjectGameCounter, value: number) {
  return Math.min(counter.maxValue, Math.max(counter.minValue, value));
}

function cloneProjectGameConfig(gameConfig: ProjectGameConfig): ProjectGameConfig {
  return {
    counters: gameConfig.counters.map((counter) => ({ ...counter })),
    players: gameConfig.players.map((player) => ({ ...player }))
  };
}

function isRuntimeContainer(item: PlaytestItem) {
  return Boolean(item.baseObject.components?.container);
}

function findPlaytestZoneByRole(
  runtime: PlaytestRuntimeState,
  role: string,
  owner: ProjectObjectRulePlayerTarget
) {
  return runtime.tableItemIds
    .map((itemId) => runtime.itemsById[itemId])
    .find(
      (item) =>
        item?.baseObject.kind === "zone" &&
        doesGameBindingRoleMatch(item.gameBinding?.role, role) &&
        doesGameBindingOwnerMatch(item.gameBinding?.owner, owner, runtime.activePlayerId)
    );
}

function findPlaytestContainerByRole(
  runtime: PlaytestRuntimeState,
  role: string,
  owner: ProjectObjectRulePlayerTarget
) {
  return runtime.tableItemIds
    .map((itemId) => runtime.itemsById[itemId])
    .find(
      (item) =>
        item &&
        isRuntimeContainer(item) &&
        doesGameBindingRoleMatch(item.gameBinding?.role, role) &&
        doesGameBindingOwnerMatch(item.gameBinding?.owner, owner, runtime.activePlayerId)
    );
}

function doesGameBindingRoleMatch(bindingRole: string | undefined, role: string) {
  const normalizedRole = normalizeRole(role);

  return Boolean(normalizedRole) && normalizeRole(bindingRole) === normalizedRole;
}

function normalizeRole(role: string | undefined) {
  return (role ?? "").trim().toLowerCase();
}

function doesGameBindingOwnerMatch(
  bindingOwner: ProjectTableSetupItemGameBinding["owner"] | undefined,
  target: ProjectObjectRulePlayerTarget,
  activePlayerId: string | null
) {
  if (target === "shared") {
    return !bindingOwner || bindingOwner.type === "shared";
  }

  return (
    Boolean(activePlayerId) &&
    bindingOwner?.type === "player" &&
    bindingOwner.playerId === activePlayerId
  );
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
    left.activePlayerId === right.activePlayerId &&
    left.gameState === right.gameState &&
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
