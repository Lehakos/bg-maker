import type {
  ProjectObjectKind,
  ProjectObjectNode,
  ProjectObjectSide,
  ProjectTableSetupItemBehavior,
  ProjectTableSetupItemCommand,
  ProjectTableSetupItemCommandTableOffset,
  ProjectTableSetupItemCommandType,
  ProjectTableSetupItemContainerBehavior,
  ProjectTableSetupItemContainerDrawOrder,
  ProjectTableSetupItemInteractionBehavior,
  ProjectTableSetupItemMovementBehavior,
  ProjectTableSetupItemRotationBehavior,
  ProjectTableSetupItemSideBehavior,
  ProjectTableSetupItemVisibilityBehavior,
  ProjectTableSetupItemZoneBehavior,
  ProjectTableSetupItemZoneSideOnEnter,
  ProjectTableSetupItemZoneSlotOccupancy
} from "@bg-maker/shared";
import {
  hasProjectObjectSides,
  projectObjectContainerEntryQuantityLimits,
  projectObjectKinds
} from "@bg-maker/shared";

export type ProjectTableSetupItemBehaviorComponentKey = keyof ProjectTableSetupItemBehavior;

export type ProjectTableSetupItemBehaviorModule = {
  key: ProjectTableSetupItemBehaviorComponentKey;
  supports: (object: ProjectObjectNode) => boolean;
};

export const defaultProjectTableSetupItemRotationStep = 90;

export const projectTableSetupItemRotationStepLimits = {
  max: 360,
  min: 1
} as const;

export const behaviorModules: ProjectTableSetupItemBehaviorModule[] = [
  {
    key: "movement",
    supports: () => true
  },
  {
    key: "rotation",
    supports: () => true
  },
  {
    key: "interaction",
    supports: () => true
  },
  {
    key: "visibility",
    supports: () => true
  },
  {
    key: "side",
    supports: (object) => hasProjectObjectSides(object.kind)
  },
  {
    key: "container",
    supports: supportsContainerBehavior
  },
  {
    key: "commands",
    supports: supportsContainerBehavior
  },
  {
    key: "zone",
    supports: supportsZoneBehavior
  }
];

export function getSupportedProjectTableSetupItemBehaviorKeys(
  object: ProjectObjectNode
): ProjectTableSetupItemBehaviorComponentKey[] {
  return behaviorModules.filter((module) => module.supports(object)).map((module) => module.key);
}

export function getProjectTableSetupItemBehavior({
  behavior,
  object,
  tableSetupItemIds
}: {
  behavior?: ProjectTableSetupItemBehavior | null;
  object: ProjectObjectNode;
  tableSetupItemIds?: readonly string[];
}): ProjectTableSetupItemBehavior {
  const normalizedBehavior: ProjectTableSetupItemBehavior = {
    interaction: normalizeInteractionBehavior(behavior?.interaction),
    movement: normalizeMovementBehavior(behavior?.movement),
    rotation: normalizeRotationBehavior(behavior?.rotation),
    visibility: normalizeVisibilityBehavior(behavior?.visibility)
  };

  if (hasProjectObjectSides(object.kind)) {
    normalizedBehavior.side = normalizeSideBehavior(behavior?.side);
  }

  if (supportsContainerBehavior(object)) {
    normalizedBehavior.container = normalizeContainerBehavior(behavior?.container, object);
    normalizedBehavior.commands = normalizeCommands(
      behavior?.commands,
      normalizedBehavior.container,
      tableSetupItemIds
    );
  }

  if (supportsZoneBehavior(object)) {
    normalizedBehavior.zone = normalizeZoneBehavior(behavior?.zone);
  }

  return normalizedBehavior;
}

export function cloneProjectTableSetupItemBehavior(
  behavior: ProjectTableSetupItemBehavior | undefined
): ProjectTableSetupItemBehavior | undefined {
  if (!behavior) {
    return undefined;
  }

  return {
    ...(behavior.commands
      ? { commands: behavior.commands.map(cloneProjectTableSetupItemCommand) }
      : {}),
    ...(behavior.container ? { container: { ...behavior.container } } : {}),
    ...(behavior.interaction ? { interaction: { ...behavior.interaction } } : {}),
    ...(behavior.movement ? { movement: { ...behavior.movement } } : {}),
    ...(behavior.rotation ? { rotation: { ...behavior.rotation } } : {}),
    ...(behavior.side ? { side: { ...behavior.side } } : {}),
    ...(behavior.visibility ? { visibility: { ...behavior.visibility } } : {}),
    ...(behavior.zone
      ? {
          zone: {
            ...behavior.zone,
            acceptedKinds: [...behavior.zone.acceptedKinds],
            acceptedObjectFileNodeIds: [...(behavior.zone.acceptedObjectFileNodeIds ?? [])]
          }
        }
      : {})
  };
}

export const defaultProjectTableSetupItemCommandOffset: ProjectTableSetupItemCommandTableOffset = {
  x: 96,
  y: 32
};

export const projectTableSetupItemCommandCountLimits = projectObjectContainerEntryQuantityLimits;

export const projectTableSetupItemCommandOffsetLimits = {
  max: 9999,
  min: -9999
} as const;

export function createProjectTableSetupItemCommand({
  container,
  createId = () => crypto.randomUUID(),
  targetItemId = "",
  type
}: {
  container?: ProjectTableSetupItemContainerBehavior;
  createId?: () => string;
  targetItemId?: string;
  type: ProjectTableSetupItemCommandType;
}): ProjectTableSetupItemCommand {
  const id = createId();
  const label = getDefaultProjectTableSetupItemCommandLabel(type);
  const drawOrder = container?.drawOrder ?? "top";
  const drawnItemSide = container?.drawnItemSide ?? "front";

  if (type === "shuffleContainer") {
    return { id, label, type };
  }

  if (type === "drawFromContainerToTargetZone") {
    return {
      count: 1,
      drawOrder,
      drawnItemSide,
      id,
      label,
      targetItemId,
      type
    };
  }

  if (type === "refillTargetZoneFromContainer") {
    return {
      drawOrder,
      drawnItemSide,
      id,
      label,
      refillMode: "emptySlots",
      targetItemId,
      type
    };
  }

  return {
    count: 1,
    drawOrder,
    drawnItemSide,
    id,
    label,
    offset: { ...defaultProjectTableSetupItemCommandOffset },
    type
  };
}

export function getDefaultProjectTableSetupItemCommandLabel(
  type: ProjectTableSetupItemCommandType
) {
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

export function normalizeProjectTableSetupItemCommandCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return projectTableSetupItemCommandCountLimits.min;
  }

  return Math.min(
    projectTableSetupItemCommandCountLimits.max,
    Math.max(projectTableSetupItemCommandCountLimits.min, Math.round(value))
  );
}

export function normalizeProjectTableSetupItemCommandOffsetValue(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    projectTableSetupItemCommandOffsetLimits.max,
    Math.max(projectTableSetupItemCommandOffsetLimits.min, Math.round(value))
  );
}

export function cleanProjectTableSetupItemBehaviorCommandTargets(
  behavior: ProjectTableSetupItemBehavior | undefined,
  validTargetItemIds: readonly string[]
): ProjectTableSetupItemBehavior | undefined {
  const clonedBehavior = cloneProjectTableSetupItemBehavior(behavior);

  if (!clonedBehavior?.commands?.length) {
    return clonedBehavior;
  }

  const validTargetSet = new Set(validTargetItemIds);
  const commands = clonedBehavior.commands.filter((command) =>
    doesCommandTargetStillExist(command, validTargetSet)
  );

  return {
    ...clonedBehavior,
    commands
  };
}

export function remapProjectTableSetupItemBehaviorCommandTargets(
  behavior: ProjectTableSetupItemBehavior | undefined,
  itemIdMap: ReadonlyMap<string, string>
): ProjectTableSetupItemBehavior | undefined {
  const clonedBehavior = cloneProjectTableSetupItemBehavior(behavior);

  if (!clonedBehavior?.commands?.length || itemIdMap.size === 0) {
    return clonedBehavior;
  }

  return {
    ...clonedBehavior,
    commands: clonedBehavior.commands.map((command) => remapCommandTarget(command, itemIdMap))
  };
}

function normalizeMovementBehavior(
  behavior: ProjectTableSetupItemMovementBehavior | null | undefined
): ProjectTableSetupItemMovementBehavior {
  return {
    movableInPlaytest:
      typeof behavior?.movableInPlaytest === "boolean" ? behavior.movableInPlaytest : true
  };
}

function normalizeRotationBehavior(
  behavior: ProjectTableSetupItemRotationBehavior | null | undefined
): ProjectTableSetupItemRotationBehavior {
  return {
    rotatableInPlaytest:
      typeof behavior?.rotatableInPlaytest === "boolean" ? behavior.rotatableInPlaytest : true,
    rotationStep: normalizeProjectTableSetupItemRotationStep(behavior?.rotationStep)
  };
}

export function normalizeProjectTableSetupItemRotationStep(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultProjectTableSetupItemRotationStep;
  }

  return Math.min(
    projectTableSetupItemRotationStepLimits.max,
    Math.max(projectTableSetupItemRotationStepLimits.min, Math.round(value))
  );
}

function normalizeInteractionBehavior(
  behavior: ProjectTableSetupItemInteractionBehavior | null | undefined
): ProjectTableSetupItemInteractionBehavior {
  return {
    interactableInPlaytest:
      typeof behavior?.interactableInPlaytest === "boolean" ? behavior.interactableInPlaytest : true
  };
}

function normalizeVisibilityBehavior(
  behavior: ProjectTableSetupItemVisibilityBehavior | null | undefined
): ProjectTableSetupItemVisibilityBehavior {
  return {
    initialHidden: typeof behavior?.initialHidden === "boolean" ? behavior.initialHidden : false
  };
}

function normalizeSideBehavior(
  behavior: ProjectTableSetupItemSideBehavior | null | undefined
): ProjectTableSetupItemSideBehavior {
  return {
    initialSide: isProjectObjectSide(behavior?.initialSide) ? behavior.initialSide : "front"
  };
}

function normalizeContainerBehavior(
  behavior: ProjectTableSetupItemContainerBehavior | null | undefined,
  object: ProjectObjectNode
): ProjectTableSetupItemContainerBehavior {
  return {
    drawOrder: normalizeContainerDrawOrder(behavior?.drawOrder, object),
    drawnItemSide: isProjectObjectSide(behavior?.drawnItemSide) ? behavior.drawnItemSide : "front",
    shuffleOnStart: typeof behavior?.shuffleOnStart === "boolean" ? behavior.shuffleOnStart : false
  };
}

function normalizeContainerDrawOrder(
  drawOrder: ProjectTableSetupItemContainerDrawOrder | undefined,
  object: ProjectObjectNode
): ProjectTableSetupItemContainerDrawOrder {
  if (drawOrder === "random" || drawOrder === "top") {
    return drawOrder;
  }

  return object.kind === "bag" ? "random" : "top";
}

function normalizeCommands(
  value: unknown,
  container: ProjectTableSetupItemContainerBehavior,
  validTargetItemIds: readonly string[] | undefined
): ProjectTableSetupItemCommand[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const commands: ProjectTableSetupItemCommand[] = [];
  const usedIds = new Set<string>();
  const validTargetSet = validTargetItemIds ? new Set(validTargetItemIds) : null;

  for (const [index, command] of value.entries()) {
    if (!command || typeof command !== "object") {
      continue;
    }

    const normalizedCommand = normalizeCommand(
      command as Record<string, unknown>,
      container,
      index,
      usedIds,
      validTargetSet
    );

    if (normalizedCommand) {
      commands.push(normalizedCommand);
      usedIds.add(normalizedCommand.id);
    }
  }

  return commands;
}

function normalizeCommand(
  command: Record<string, unknown>,
  container: ProjectTableSetupItemContainerBehavior,
  index: number,
  usedIds: ReadonlySet<string>,
  validTargetItemIds: ReadonlySet<string> | null
): ProjectTableSetupItemCommand | null {
  const type = normalizeCommandType(command.type);

  if (!type) {
    return null;
  }

  const common = {
    id: normalizeCommandId(command.id, index, usedIds),
    label: normalizeCommandLabel(command.label, type)
  };

  if (type === "shuffleContainer") {
    return { ...common, type };
  }

  const drawSettings = {
    drawOrder: normalizeCommandDrawOrder(command.drawOrder, container.drawOrder),
    drawnItemSide: isProjectObjectSide(command.drawnItemSide)
      ? command.drawnItemSide
      : container.drawnItemSide
  };

  if (type === "drawFromContainerToTableOffset") {
    return {
      ...common,
      ...drawSettings,
      count: normalizeProjectTableSetupItemCommandCount(command.count),
      offset: normalizeCommandOffset(command.offset),
      type
    };
  }

  const targetItemId = normalizeCommandTargetItemId(command.targetItemId, validTargetItemIds);

  if (!targetItemId) {
    return null;
  }

  if (type === "drawFromContainerToTargetZone") {
    return {
      ...common,
      ...drawSettings,
      count: normalizeProjectTableSetupItemCommandCount(command.count),
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

function normalizeCommandType(value: unknown): ProjectTableSetupItemCommandType | null {
  return value === "drawFromContainerToTableOffset" ||
    value === "drawFromContainerToTargetZone" ||
    value === "refillTargetZoneFromContainer" ||
    value === "shuffleContainer"
    ? value
    : null;
}

function normalizeCommandId(value: unknown, index: number, usedIds: ReadonlySet<string>) {
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

function normalizeCommandLabel(value: unknown, type: ProjectTableSetupItemCommandType) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : getDefaultProjectTableSetupItemCommandLabel(type);
}

function normalizeCommandDrawOrder(
  value: unknown,
  fallback: ProjectTableSetupItemContainerDrawOrder
): ProjectTableSetupItemContainerDrawOrder {
  return value === "random" || value === "top" ? value : fallback;
}

function normalizeCommandOffset(value: unknown): ProjectTableSetupItemCommandTableOffset {
  if (!value || typeof value !== "object") {
    return { ...defaultProjectTableSetupItemCommandOffset };
  }

  const offset = value as Partial<ProjectTableSetupItemCommandTableOffset>;

  return {
    x: normalizeProjectTableSetupItemCommandOffsetValue(offset.x),
    y: normalizeProjectTableSetupItemCommandOffsetValue(offset.y)
  };
}

function normalizeCommandTargetItemId(
  value: unknown,
  validTargetItemIds: ReadonlySet<string> | null
) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const targetItemId = value.trim();

  return !validTargetItemIds || validTargetItemIds.has(targetItemId) ? targetItemId : null;
}

function cloneProjectTableSetupItemCommand(
  command: ProjectTableSetupItemCommand
): ProjectTableSetupItemCommand {
  if (command.type === "drawFromContainerToTableOffset") {
    return {
      ...command,
      offset: { ...command.offset }
    };
  }

  return { ...command };
}

function doesCommandTargetStillExist(
  command: ProjectTableSetupItemCommand,
  validTargetItemIds: ReadonlySet<string>
) {
  return !("targetItemId" in command) || validTargetItemIds.has(command.targetItemId);
}

function remapCommandTarget(
  command: ProjectTableSetupItemCommand,
  itemIdMap: ReadonlyMap<string, string>
): ProjectTableSetupItemCommand {
  if (!("targetItemId" in command)) {
    return command;
  }

  return {
    ...command,
    targetItemId: itemIdMap.get(command.targetItemId) ?? command.targetItemId
  };
}

function supportsContainerBehavior(object: ProjectObjectNode): boolean {
  return Boolean(object.components?.container);
}

function supportsZoneBehavior(object: ProjectObjectNode): boolean {
  return object.kind === "zone";
}

function isProjectObjectSide(value: unknown): value is ProjectObjectSide {
  return value === "back" || value === "front";
}

function normalizeZoneBehavior(
  behavior: ProjectTableSetupItemZoneBehavior | null | undefined
): ProjectTableSetupItemZoneBehavior {
  return {
    acceptedObjectFileNodeIds: normalizeZoneAcceptedObjectFileNodeIds(
      behavior?.acceptedObjectFileNodeIds
    ),
    acceptedKinds: normalizeZoneAcceptedKinds(behavior?.acceptedKinds),
    allowRemove: typeof behavior?.allowRemove === "boolean" ? behavior.allowRemove : true,
    sideOnEnter: normalizeZoneSideOnEnter(behavior?.sideOnEnter),
    slotOccupancy: normalizeZoneSlotOccupancy(behavior?.slotOccupancy)
  };
}

function normalizeZoneAcceptedKinds(value: unknown): ProjectObjectKind[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const validKinds = new Set(projectObjectKinds);
  const acceptedKinds: ProjectObjectKind[] = [];

  for (const kind of value) {
    if (
      typeof kind === "string" &&
      kind !== "zone" &&
      validKinds.has(kind as ProjectObjectKind) &&
      !acceptedKinds.includes(kind as ProjectObjectKind)
    ) {
      acceptedKinds.push(kind as ProjectObjectKind);
    }
  }

  return acceptedKinds;
}

function normalizeZoneAcceptedObjectFileNodeIds(value: unknown): string[] {
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

function normalizeZoneSideOnEnter(value: unknown): ProjectTableSetupItemZoneSideOnEnter {
  return value === "back" || value === "front" || value === "preserve" ? value : "preserve";
}

function normalizeZoneSlotOccupancy(value: unknown): ProjectTableSetupItemZoneSlotOccupancy {
  return value === "stack" ? "stack" : "single";
}
