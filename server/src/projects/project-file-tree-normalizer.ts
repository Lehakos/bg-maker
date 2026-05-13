import type {
  Project,
  ProjectFileKind,
  ProjectFileNode,
  ProjectGameConfig,
  ProjectGameCounter,
  ProjectGameCounterScope,
  ProjectObjectPlayCardRule,
  ProjectObjectKind,
  ProjectObjectRuleCondition,
  ProjectObjectRuleConditionConnector,
  ProjectObjectRuleCounterOperator,
  ProjectObjectRuleEffect,
  ProjectObjectRulePlayerTarget,
  ProjectObjectRules,
  ProjectObjectSourceRef,
  ProjectObjectTemplate,
  ProjectObjectVariableDefinition,
  ProjectObjectVariableType,
  ProjectObjectVariableValue,
  ProjectTableSetup,
  ProjectTableSetupItemCommand,
  ProjectTableSetupItemCommandTableOffset,
  ProjectTableSetupItemCommandType,
  ProjectTableSetupItem,
  ProjectTableSetupItemBehavior,
  ProjectTableSetupItemContainerDrawOrder,
  ProjectTableSetupItemGameBinding,
  ProjectTableSetupGameBindingOwner,
  ProjectTableSetupItemTransform
} from "@bg-maker/shared";
import {
  getDefaultProjectGameConfig,
  getDefaultProjectTableSetup,
  getDefaultProjectTableSetupGrid,
  getDefaultProjectTableSetupItemTransform,
  getDefaultProjectObjectVariableValue,
  projectGameCounterLabelMaxLength,
  projectGameCounterStepLimits,
  projectGameCounterValueLimits,
  projectGamePlayerNameMaxLength,
  projectObjectContainerEntryQuantityLimits,
  projectObjectRuleAtomCountLimits,
  projectObjectRuleDrawCountLimits,
  projectObjectRuleLabelMaxLength,
  projectObjectRuleRoleMaxLength,
  projectAssetsFolderId,
  projectAssetsFolderName,
  projectObjectKinds,
  projectObjectVariableTypes,
  projectTableSetupGridSizeLimits,
  projectTableSetupSizeLimits
} from "@bg-maker/shared";
import { normalizeProjectImageAsset } from "./project-image-assets.js";
import {
  ensureProjectObjectFileRoot,
  normalizeProjectObjectTree
} from "./project-object-tree-normalizer.js";
import { ProjectValidationError } from "./project-validation-error.js";
import {
  hasOwnRecordKey,
  normalizeFiniteNumber,
  normalizeHexColor,
  normalizeIntegerNumber
} from "./project-normalization-utils.js";
import { normalizeProjectCompositionSettings } from "./project-composition-normalizer.js";

const maxProjectFileTreeDepth = 12;
const maxProjectFileTreeNodes = 500;
const maxProjectObjectSourceValueCount = 100;
const maxProjectObjectVariableCount = 100;
const maxProjectObjectVariableNameLength = 80;
const maxProjectObjectVariableTextValueLength = 2000;
const maxProjectTableSetupItemCount = 1000;
const maxProjectTableSetupItemCommandCount = 100;
const maxProjectTableSetupItemCommandLabelLength = 80;
const projectFileKinds = new Set<ProjectFileKind>(["tableSetup", "object", "image", "document"]);
const projectGameCounterScopes = new Set<ProjectGameCounterScope>(["player", "shared"]);
const projectObjectRuleConditionConnectors = new Set<ProjectObjectRuleConditionConnector>([
  "and",
  "or"
]);
const projectObjectRulePlayerTargets = new Set<ProjectObjectRulePlayerTarget>([
  "activePlayer",
  "shared"
]);
const projectObjectRuleCounterOperators = new Set<ProjectObjectRuleCounterOperator>([
  "atLeast",
  "atMost",
  "equals"
]);
const projectObjectKindSet = new Set<ProjectObjectKind>(projectObjectKinds);
const projectObjectVariableTypeSet = new Set<ProjectObjectVariableType>(projectObjectVariableTypes);
const projectTableSetupContainerDrawOrderSet = new Set<ProjectTableSetupItemContainerDrawOrder>([
  "random",
  "top"
]);
const projectTableSetupItemCommandTypeSet = new Set<ProjectTableSetupItemCommandType>([
  "drawFromContainerToTableOffset",
  "drawFromContainerToTargetZone",
  "refillTargetZoneFromContainer",
  "shuffleContainer"
]);
const projectTableSetupItemCommandOffsetLimits = {
  max: 9999,
  min: -9999
} as const;

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
    gameConfig,
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
    gameConfig: normalizeProjectGameConfig(gameConfig),
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

export function normalizeProjectGameConfig(value: unknown): ProjectGameConfig {
  const defaultConfig = getDefaultProjectGameConfig();
  const record = getRecord(value);
  const players = normalizeProjectGamePlayers(record.players, defaultConfig.players);
  const counters = normalizeProjectGameCounters(record.counters);

  return {
    counters,
    players: players.length ? players : defaultConfig.players
  };
}

function normalizeProjectGamePlayers(value: unknown, fallback: ProjectGameConfig["players"]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const ids = new Set<string>();
  const players: ProjectGameConfig["players"] = [];

  for (const [index, player] of value.slice(0, 12).entries()) {
    const record = getRecord(player);
    const fallbackPlayer = fallback[index] ?? fallback[index % fallback.length]!;
    const id = normalizeUniqueId(record.id, `player-${index + 1}`, ids);
    const name = normalizeLabel(record.name, fallbackPlayer.name, projectGamePlayerNameMaxLength);

    players.push({
      color: normalizeHexColor(record.color, fallbackPlayer.color),
      id,
      name
    });
    ids.add(id);
  }

  return players;
}

function normalizeProjectGameCounters(value: unknown): ProjectGameCounter[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = new Set<string>();
  const counters: ProjectGameCounter[] = [];

  for (const [index, counter] of value.slice(0, 100).entries()) {
    const record = getRecord(counter);
    const id = normalizeUniqueId(record.id, `counter-${index + 1}`, ids);
    const minValue = normalizeFiniteNumber(record.minValue, 0, projectGameCounterValueLimits);
    const maxValue = Math.max(
      minValue,
      normalizeFiniteNumber(record.maxValue, 999, projectGameCounterValueLimits)
    );

    counters.push({
      defaultValue: normalizeFiniteNumber(record.defaultValue, minValue, {
        max: maxValue,
        min: minValue
      }),
      id,
      label: normalizeLabel(record.label, `Counter ${index + 1}`, projectGameCounterLabelMaxLength),
      maxValue,
      minValue,
      scope: projectGameCounterScopes.has(record.scope as ProjectGameCounterScope)
        ? (record.scope as ProjectGameCounterScope)
        : "player",
      step: normalizeFiniteNumber(record.step, 1, projectGameCounterStepLimits)
    });
    ids.add(id);
  }

  return counters;
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
  const sourceRef = kind === "object" ? normalizeProjectObjectSourceRef(record.sourceRef) : null;
  const rules = kind === "object" ? normalizeProjectObjectRulesField(record.rules) : {};
  const objectTree =
    kind === "tableSetup"
      ? {
          tableSetup: normalizeProjectTableSetup(record.tableSetup)
        }
      : kind === "object" && sourceRef
        ? {
            ...rules,
            sourceRef
          }
        : kind === "object"
          ? {
              objectTree: ensureProjectObjectFileRoot(
                Array.isArray(record.objectTree)
                  ? normalizeProjectObjectTree(record.objectTree)
                  : [],
                id,
                name
              ),
              ...rules,
              ...normalizeProjectObjectTemplateField(record.template)
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

function normalizeProjectTableSetup(value: unknown): ProjectTableSetup {
  const defaultTableSetup = getDefaultProjectTableSetup();
  const defaultGrid = getDefaultProjectTableSetupGrid();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const grid =
    record.grid && typeof record.grid === "object" ? (record.grid as Record<string, unknown>) : {};

  return {
    backgroundColor: normalizeHexColor(record.backgroundColor, defaultTableSetup.backgroundColor),
    composition: normalizeProjectCompositionSettings(record.composition),
    grid: {
      size: normalizeIntegerNumber(grid.size, defaultGrid.size, projectTableSetupGridSizeLimits),
      snap: grid.snap === true,
      visible: grid.visible !== false
    },
    height: normalizeIntegerNumber(
      record.height,
      defaultTableSetup.height,
      projectTableSetupSizeLimits
    ),
    items: normalizeProjectTableSetupItems(record.items),
    width: normalizeIntegerNumber(
      record.width,
      defaultTableSetup.width,
      projectTableSetupSizeLimits
    )
  };
}

function normalizeProjectTableSetupItems(value: unknown): ProjectTableSetupItem[] {
  const items = Array.isArray(value) ? value : [];
  const itemIds = new Set<string>();
  const normalizedItems: ProjectTableSetupItem[] = [];

  for (const item of items.slice(0, maxProjectTableSetupItemCount)) {
    const normalizedItem = normalizeProjectTableSetupItem(item);

    if (!normalizedItem) {
      continue;
    }

    const itemId =
      normalizedItem.type === "linkedObject" ? normalizedItem.id : normalizedItem.object.id;

    if (itemIds.has(itemId)) {
      continue;
    }

    itemIds.add(itemId);
    normalizedItems.push(normalizedItem);
  }

  return normalizedItems;
}

function normalizeProjectTableSetupItem(value: unknown): ProjectTableSetupItem | null {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  if (record.type === "linkedObject") {
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const sourceObjectFileNodeId =
      typeof record.sourceObjectFileNodeId === "string" ? record.sourceObjectFileNodeId.trim() : "";

    if (!id || !sourceObjectFileNodeId) {
      return null;
    }

    const behavior = normalizeProjectTableSetupItemBehavior(record.behavior);
    const gameBinding = normalizeProjectTableSetupItemGameBinding(record.gameBinding);

    return {
      ...(behavior ? { behavior } : {}),
      ...(gameBinding ? { gameBinding } : {}),
      id,
      name: name || "Linked object",
      sourceObjectFileNodeId,
      transform: normalizeProjectTableSetupItemTransform(record.transform),
      type: "linkedObject",
      values: normalizeLooseProjectObjectVariableValues(record.values),
      locked: record.locked === true,
      visible: record.visible !== false
    };
  }

  if (record.type === "localObject") {
    try {
      const objectTree = normalizeProjectObjectTree([record.object]);
      const object = objectTree[0];
      const behavior = normalizeProjectTableSetupItemBehavior(record.behavior);
      const gameBinding = normalizeProjectTableSetupItemGameBinding(record.gameBinding);

      return object
        ? {
            ...(behavior ? { behavior } : {}),
            ...(gameBinding ? { gameBinding } : {}),
            object,
            type: "localObject"
          }
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeProjectTableSetupItemGameBinding(
  value: unknown
): ProjectTableSetupItemGameBinding | undefined {
  const record = getRecord(value);
  const role = normalizeOptionalText(record.role, projectObjectRuleRoleMaxLength);
  const owner = normalizeProjectTableSetupGameBindingOwner(record.owner);
  const counterId = normalizeOptionalText(record.counterId, 120);
  const counterOwner = normalizeProjectTableSetupGameBindingOwner(record.counterOwner);
  const binding: ProjectTableSetupItemGameBinding = {
    ...(role ? { role } : {}),
    ...(owner ? { owner } : {}),
    ...(counterId ? { counterId } : {}),
    ...(counterOwner ? { counterOwner } : {})
  };

  return Object.keys(binding).length ? binding : undefined;
}

function normalizeProjectTableSetupGameBindingOwner(
  value: unknown
): ProjectTableSetupGameBindingOwner | undefined {
  const record = getRecord(value);

  if (record.type === "shared") {
    return { type: "shared" };
  }

  if (record.type === "player") {
    const playerId = normalizeOptionalText(record.playerId, 120);

    return playerId ? { type: "player", playerId } : undefined;
  }

  return undefined;
}

function normalizeProjectTableSetupItemBehavior(
  value: unknown
): ProjectTableSetupItemBehavior | undefined {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const behavior: ProjectTableSetupItemBehavior = {};

  if (hasOwnRecordKey(record, "movement")) {
    const movement = getRecord(record.movement);

    behavior.movement = {
      movableInPlaytest:
        typeof movement.movableInPlaytest === "boolean" ? movement.movableInPlaytest : true
    };
  }

  if (hasOwnRecordKey(record, "interaction")) {
    const interaction = getRecord(record.interaction);

    behavior.interaction = {
      interactableInPlaytest:
        typeof interaction.interactableInPlaytest === "boolean"
          ? interaction.interactableInPlaytest
          : true
    };
  }

  if (hasOwnRecordKey(record, "visibility")) {
    const visibility = getRecord(record.visibility);

    behavior.visibility = {
      initialHidden:
        typeof visibility.initialHidden === "boolean" ? visibility.initialHidden : false
    };
  }

  if (hasOwnRecordKey(record, "side")) {
    const side = getRecord(record.side);

    behavior.side = {
      initialSide: side.initialSide === "back" ? "back" : "front"
    };
  }

  if (hasOwnRecordKey(record, "container")) {
    const container = getRecord(record.container);

    behavior.container = {
      drawOrder: projectTableSetupContainerDrawOrderSet.has(
        container.drawOrder as ProjectTableSetupItemContainerDrawOrder
      )
        ? (container.drawOrder as ProjectTableSetupItemContainerDrawOrder)
        : "top",
      drawnItemSide: container.drawnItemSide === "back" ? "back" : "front",
      shuffleOnStart:
        typeof container.shuffleOnStart === "boolean" ? container.shuffleOnStart : false
    };
  }

  if (hasOwnRecordKey(record, "commands")) {
    behavior.commands = normalizeProjectTableSetupItemCommands(record.commands, behavior.container);
  }

  if (hasOwnRecordKey(record, "zone")) {
    const zone = getRecord(record.zone);

    behavior.zone = {
      acceptedObjectFileNodeIds: normalizeProjectTableSetupZoneAcceptedObjectFileNodeIds(
        zone.acceptedObjectFileNodeIds
      ),
      acceptedKinds: normalizeProjectTableSetupZoneAcceptedKinds(zone.acceptedKinds),
      allowRemove: typeof zone.allowRemove === "boolean" ? zone.allowRemove : true,
      sideOnEnter:
        zone.sideOnEnter === "back" || zone.sideOnEnter === "front" ? zone.sideOnEnter : "preserve",
      slotOccupancy: zone.slotOccupancy === "stack" ? "stack" : "single"
    };
  }

  return Object.keys(behavior).length ? behavior : undefined;
}

function normalizeProjectTableSetupItemCommands(
  value: unknown,
  container: ProjectTableSetupItemBehavior["container"]
): ProjectTableSetupItemCommand[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const commands: ProjectTableSetupItemCommand[] = [];
  const usedIds = new Set<string>();

  for (const [index, command] of value.slice(0, maxProjectTableSetupItemCommandCount).entries()) {
    const normalizedCommand = normalizeProjectTableSetupItemCommand(command, {
      container,
      index,
      usedIds
    });

    if (normalizedCommand) {
      commands.push(normalizedCommand);
      usedIds.add(normalizedCommand.id);
    }
  }

  return commands;
}

function normalizeProjectTableSetupItemCommand(
  value: unknown,
  {
    container,
    index,
    usedIds
  }: {
    container: ProjectTableSetupItemBehavior["container"];
    index: number;
    usedIds: ReadonlySet<string>;
  }
): ProjectTableSetupItemCommand | null {
  const record = getRecord(value);
  const type = normalizeProjectTableSetupItemCommandType(record.type);

  if (!type) {
    return null;
  }

  const common = {
    id: normalizeProjectTableSetupItemCommandId(record.id, index, usedIds),
    label: normalizeProjectTableSetupItemCommandLabel(record.label, type)
  };

  if (type === "shuffleContainer") {
    return {
      ...common,
      type
    };
  }

  const drawSettings = {
    drawOrder: normalizeProjectTableSetupItemCommandDrawOrder(
      record.drawOrder,
      container?.drawOrder ?? "top"
    ),
    drawnItemSide:
      record.drawnItemSide === "back" || record.drawnItemSide === "front"
        ? record.drawnItemSide
        : (container?.drawnItemSide ?? "front")
  };

  if (type === "drawFromContainerToTableOffset") {
    return {
      ...common,
      ...drawSettings,
      count: normalizeIntegerNumber(record.count, projectObjectContainerEntryQuantityLimits.min, {
        max: projectObjectContainerEntryQuantityLimits.max,
        min: projectObjectContainerEntryQuantityLimits.min
      }),
      offset: normalizeProjectTableSetupItemCommandOffset(record.offset),
      type
    };
  }

  const targetItemId = typeof record.targetItemId === "string" ? record.targetItemId.trim() : "";

  if (!targetItemId) {
    return null;
  }

  if (type === "drawFromContainerToTargetZone") {
    return {
      ...common,
      ...drawSettings,
      count: normalizeIntegerNumber(record.count, projectObjectContainerEntryQuantityLimits.min, {
        max: projectObjectContainerEntryQuantityLimits.max,
        min: projectObjectContainerEntryQuantityLimits.min
      }),
      targetItemId,
      type
    };
  }

  return {
    ...common,
    ...drawSettings,
    refillMode: "emptySlots",
    targetItemId,
    type
  };
}

function normalizeProjectTableSetupItemCommandType(
  value: unknown
): ProjectTableSetupItemCommandType | null {
  return projectTableSetupItemCommandTypeSet.has(value as ProjectTableSetupItemCommandType)
    ? (value as ProjectTableSetupItemCommandType)
    : null;
}

function normalizeProjectTableSetupItemCommandId(
  value: unknown,
  index: number,
  usedIds: ReadonlySet<string>
) {
  const fallbackId = `command-${index + 1}`;
  const baseId = typeof value === "string" && value.trim() ? value.trim() : fallbackId;

  if (!usedIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  let nextId = `${baseId}-${suffix}`;

  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${baseId}-${suffix}`;
  }

  return nextId;
}

function normalizeProjectTableSetupItemCommandLabel(
  value: unknown,
  type: ProjectTableSetupItemCommandType
) {
  const fallback = getDefaultProjectTableSetupItemCommandLabel(type);

  if (typeof value !== "string") {
    return fallback;
  }

  const label = value.trim().slice(0, maxProjectTableSetupItemCommandLabelLength);

  return label || fallback;
}

function getDefaultProjectTableSetupItemCommandLabel(type: ProjectTableSetupItemCommandType) {
  if (type === "shuffleContainer") {
    return "Shuffle";
  }

  if (type === "drawFromContainerToTargetZone") {
    return "Draw to Zone";
  }

  if (type === "refillTargetZoneFromContainer") {
    return "Refill Zone";
  }

  return "Draw";
}

function normalizeProjectTableSetupItemCommandDrawOrder(
  value: unknown,
  fallback: ProjectTableSetupItemContainerDrawOrder
): ProjectTableSetupItemContainerDrawOrder {
  return projectTableSetupContainerDrawOrderSet.has(
    value as ProjectTableSetupItemContainerDrawOrder
  )
    ? (value as ProjectTableSetupItemContainerDrawOrder)
    : fallback;
}

function normalizeProjectTableSetupItemCommandOffset(
  value: unknown
): ProjectTableSetupItemCommandTableOffset {
  const record = getRecord(value);

  return {
    x: normalizeIntegerNumber(record.x, 96, projectTableSetupItemCommandOffsetLimits),
    y: normalizeIntegerNumber(record.y, 32, projectTableSetupItemCommandOffsetLimits)
  };
}

function normalizeProjectTableSetupZoneAcceptedKinds(value: unknown): ProjectObjectKind[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const acceptedKinds: ProjectObjectKind[] = [];

  for (const kind of value) {
    if (
      typeof kind === "string" &&
      kind !== "zone" &&
      projectObjectKindSet.has(kind as ProjectObjectKind) &&
      !acceptedKinds.includes(kind as ProjectObjectKind)
    ) {
      acceptedKinds.push(kind as ProjectObjectKind);
    }
  }

  return acceptedKinds;
}

function normalizeProjectTableSetupZoneAcceptedObjectFileNodeIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const acceptedObjectFileNodeIds: string[] = [];

  for (const fileNodeId of value) {
    if (
      typeof fileNodeId === "string" &&
      fileNodeId.trim() &&
      !acceptedObjectFileNodeIds.includes(fileNodeId.trim())
    ) {
      acceptedObjectFileNodeIds.push(fileNodeId.trim());
    }
  }

  return acceptedObjectFileNodeIds;
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeLabel(value: unknown, fallback: string, maxLength: number) {
  return normalizeOptionalText(value, maxLength) || fallback;
}

function normalizeUniqueId(value: unknown, fallback: string, usedIds: ReadonlySet<string>) {
  const baseId = normalizeOptionalText(value, 120) || fallback;

  if (!usedIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  let nextId = `${baseId}-${suffix}`;

  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${baseId}-${suffix}`;
  }

  return nextId;
}

function normalizeProjectTableSetupItemTransform(value: unknown): ProjectTableSetupItemTransform {
  const defaultTransform = getDefaultProjectTableSetupItemTransform();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    rotation: normalizeFiniteNumber(record.rotation, defaultTransform.rotation, {
      max: 360000,
      min: -360000
    }),
    scaleX: normalizeFiniteNumber(record.scaleX, defaultTransform.scaleX, {
      max: 100,
      min: 0.01
    }),
    scaleY: normalizeFiniteNumber(record.scaleY, defaultTransform.scaleY, {
      max: 100,
      min: 0.01
    }),
    x: normalizeFiniteNumber(record.x, defaultTransform.x, {
      max: 100000,
      min: -100000
    }),
    y: normalizeFiniteNumber(record.y, defaultTransform.y, {
      max: 100000,
      min: -100000
    })
  };
}

function normalizeProjectObjectTemplateField(value: unknown): {
  template?: ProjectObjectTemplate;
} {
  const template = normalizeProjectObjectTemplate(value);

  return template.variables.length ? { template } : {};
}

function normalizeProjectObjectRulesField(value: unknown): {
  rules?: ProjectObjectRules;
} {
  const rules = normalizeProjectObjectRules(value);

  return rules.playCards.length ? { rules } : {};
}

function normalizeProjectObjectRules(value: unknown): ProjectObjectRules {
  const record = getRecord(value);

  return {
    playCards: normalizeProjectObjectPlayCardRules(record.playCards)
  };
}

function normalizeProjectObjectPlayCardRules(value: unknown): ProjectObjectPlayCardRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rules: ProjectObjectPlayCardRule[] = [];
  const ids = new Set<string>();

  for (const [index, rule] of value.slice(0, projectObjectRuleAtomCountLimits.max).entries()) {
    const normalizedRule = normalizeProjectObjectPlayCardRule(rule, index, ids);

    if (normalizedRule) {
      rules.push(normalizedRule);
      ids.add(normalizedRule.id);
    }
  }

  return rules;
}

function normalizeProjectObjectPlayCardRule(
  value: unknown,
  index: number,
  usedIds: ReadonlySet<string>
): ProjectObjectPlayCardRule | null {
  const record = getRecord(value);
  const id = normalizeUniqueId(record.id, `play-card-${index + 1}`, usedIds);
  const conditions = normalizeProjectObjectRuleConditions(record.conditions);
  const effects = normalizeProjectObjectRuleEffects(record.effects);

  if (!conditions.length && !effects.length && !hasOwnRecordKey(record, "label")) {
    return null;
  }

  return {
    conditions,
    effects,
    id,
    label: normalizeLabel(record.label, "Play card", projectObjectRuleLabelMaxLength)
  };
}

function normalizeProjectObjectRuleConditions(value: unknown): ProjectObjectRuleCondition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const conditions: ProjectObjectRuleCondition[] = [];
  const ids = new Set<string>();

  for (const [index, condition] of value.slice(0, projectObjectRuleAtomCountLimits.max).entries()) {
    const record = getRecord(condition);
    const id = normalizeUniqueId(record.id, `condition-${index + 1}`, ids);

    if (record.type === "cardInZoneRole") {
      const role = normalizeOptionalText(record.role, projectObjectRuleRoleMaxLength);

      if (!role) {
        continue;
      }

      conditions.push({
        ...normalizeProjectObjectRuleConditionConnectorField(record.connector, conditions.length),
        id,
        owner: normalizeProjectObjectRulePlayerTarget(record.owner),
        role,
        type: "cardInZoneRole"
      });
      ids.add(id);
      continue;
    }

    if (record.type === "counter") {
      const counterId = normalizeOptionalText(record.counterId, 120) ?? "";

      conditions.push({
        ...normalizeProjectObjectRuleConditionConnectorField(record.connector, conditions.length),
        counterId,
        id,
        operator: projectObjectRuleCounterOperators.has(
          record.operator as ProjectObjectRuleCounterOperator
        )
          ? (record.operator as ProjectObjectRuleCounterOperator)
          : "atLeast",
        target: normalizeProjectObjectRulePlayerTarget(record.target),
        type: "counter",
        value: normalizeFiniteNumber(record.value, 0, projectGameCounterValueLimits)
      });
      ids.add(id);
    }
  }

  return conditions;
}

function normalizeProjectObjectRuleConditionConnectorField(
  value: unknown,
  currentConditionCount: number
): {
  connector?: ProjectObjectRuleConditionConnector;
} {
  if (currentConditionCount === 0) {
    return {};
  }

  return {
    connector: projectObjectRuleConditionConnectors.has(
      value as ProjectObjectRuleConditionConnector
    )
      ? (value as ProjectObjectRuleConditionConnector)
      : "and"
  };
}

function normalizeProjectObjectRuleEffects(value: unknown): ProjectObjectRuleEffect[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const effects: ProjectObjectRuleEffect[] = [];
  const ids = new Set<string>();

  for (const [index, effect] of value.slice(0, projectObjectRuleAtomCountLimits.max).entries()) {
    const record = getRecord(effect);
    const id = normalizeUniqueId(record.id, `effect-${index + 1}`, ids);

    if (record.type === "modifyCounter") {
      const counterId = normalizeOptionalText(record.counterId, 120) ?? "";

      effects.push({
        amount: normalizeFiniteNumber(record.amount, 1, projectGameCounterValueLimits),
        counterId,
        id,
        target: normalizeProjectObjectRulePlayerTarget(record.target),
        type: "modifyCounter"
      });
      ids.add(id);
      continue;
    }

    if (record.type === "moveThisCardToZoneRole") {
      const role = normalizeOptionalText(record.role, projectObjectRuleRoleMaxLength);

      if (!role) {
        continue;
      }

      effects.push({
        id,
        owner: normalizeProjectObjectRulePlayerTarget(record.owner),
        role,
        side: record.side === "back" ? "back" : "front",
        type: "moveThisCardToZoneRole"
      });
      ids.add(id);
      continue;
    }

    if (record.type === "drawCards") {
      const sourceRole = normalizeOptionalText(record.sourceRole, projectObjectRuleRoleMaxLength);
      const targetRole = normalizeOptionalText(record.targetRole, projectObjectRuleRoleMaxLength);

      if (!sourceRole || !targetRole) {
        continue;
      }

      effects.push({
        count: normalizeIntegerNumber(
          record.count,
          projectObjectRuleDrawCountLimits.min,
          projectObjectRuleDrawCountLimits
        ),
        id,
        owner: normalizeProjectObjectRulePlayerTarget(record.owner),
        sourceRole,
        targetRole,
        type: "drawCards"
      });
      ids.add(id);
    }
  }

  return effects;
}

function normalizeProjectObjectRulePlayerTarget(value: unknown): ProjectObjectRulePlayerTarget {
  return projectObjectRulePlayerTargets.has(value as ProjectObjectRulePlayerTarget)
    ? (value as ProjectObjectRulePlayerTarget)
    : "activePlayer";
}

function normalizeProjectObjectTemplate(value: unknown): ProjectObjectTemplate {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const variables = normalizeProjectObjectVariableDefinitions(record.variables);

  return {
    variables
  };
}

function normalizeProjectObjectVariableDefinitions(
  value: unknown
): ProjectObjectVariableDefinition[] {
  const variables = Array.isArray(value) ? value : [];
  const variableIds = new Set<string>();
  const normalizedVariables: ProjectObjectVariableDefinition[] = [];

  for (const variable of variables.slice(0, maxProjectObjectVariableCount)) {
    const record =
      variable && typeof variable === "object" ? (variable as Record<string, unknown>) : {};
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const type = projectObjectVariableTypeSet.has(record.type as ProjectObjectVariableType)
      ? (record.type as ProjectObjectVariableType)
      : "text";

    if (!id || variableIds.has(id)) {
      continue;
    }

    variableIds.add(id);
    normalizedVariables.push({
      id,
      name: (name || "Property").slice(0, maxProjectObjectVariableNameLength),
      type,
      defaultValue: normalizeProjectObjectVariableValue(record.defaultValue, type)
    });
  }

  return normalizedVariables;
}

function normalizeProjectObjectSourceRef(value: unknown): ProjectObjectSourceRef | null {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sourceObjectFileNodeId =
    typeof record.sourceObjectFileNodeId === "string" ? record.sourceObjectFileNodeId.trim() : "";

  if (!sourceObjectFileNodeId) {
    return null;
  }

  return {
    sourceObjectFileNodeId,
    values: normalizeLooseProjectObjectVariableValues(record.values)
  };
}

function normalizeLooseProjectObjectVariableValues(
  value: unknown
): Record<string, ProjectObjectVariableValue> {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const values: Record<string, ProjectObjectVariableValue> = {};

  for (const [key, rawValue] of Object.entries(record).slice(0, maxProjectObjectSourceValueCount)) {
    const variableId = key.trim();

    if (!variableId) {
      continue;
    }

    values[variableId] =
      typeof rawValue === "number"
        ? normalizeFiniteNumber(rawValue, 0, {
            max: Number.MAX_SAFE_INTEGER,
            min: -Number.MAX_SAFE_INTEGER
          })
        : String(rawValue ?? "").slice(0, maxProjectObjectVariableTextValueLength);
  }

  return values;
}

function normalizeProjectObjectVariableValue(
  value: unknown,
  type: ProjectObjectVariableType
): ProjectObjectVariableValue {
  if (type === "number") {
    return normalizeFiniteNumber(value, Number(getDefaultProjectObjectVariableValue(type)), {
      max: Number.MAX_SAFE_INTEGER,
      min: -Number.MAX_SAFE_INTEGER
    });
  }

  if (type === "color") {
    return normalizeHexColor(value, String(getDefaultProjectObjectVariableValue(type)));
  }

  return String(value ?? getDefaultProjectObjectVariableValue(type)).slice(
    0,
    maxProjectObjectVariableTextValueLength
  );
}
