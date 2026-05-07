import type {
  ProjectObjectKind,
  ProjectObjectNode,
  ProjectObjectSide,
  ProjectTableSetupItemBehavior,
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
import { hasProjectObjectSides, projectObjectKinds } from "@bg-maker/shared";

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
  object
}: {
  behavior?: ProjectTableSetupItemBehavior | null;
  object: ProjectObjectNode;
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
