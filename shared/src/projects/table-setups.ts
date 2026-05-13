import { getDefaultProjectCompositionSettings } from "./object-defaults.js";
import type {
  ProjectCompositionSettings,
  ProjectObjectKind,
  ProjectObjectNode,
  ProjectObjectSide,
  ProjectObjectVariableValue
} from "./objects.js";

export type ProjectTableSetupGrid = {
  size: number;
  snap: boolean;
  visible: boolean;
};

export type ProjectTableSetupItemTransform = {
  rotation: number;
  scaleX: number;
  scaleY: number;
  x: number;
  y: number;
};

export type ProjectTableSetupItemMovementBehavior = {
  movableInPlaytest: boolean;
};

export type ProjectTableSetupItemRotationBehavior = {
  rotatableInPlaytest: boolean;
  rotationStep: number;
};

export type ProjectTableSetupItemInteractionBehavior = {
  interactableInPlaytest: boolean;
};

export type ProjectTableSetupItemVisibilityBehavior = {
  initialHidden: boolean;
};

export type ProjectTableSetupItemSideBehavior = {
  initialSide: ProjectObjectSide;
};

export type ProjectTableSetupItemContainerDrawOrder = "random" | "top";

export type ProjectTableSetupItemContainerBehavior = {
  drawOrder: ProjectTableSetupItemContainerDrawOrder;
  drawnItemSide: ProjectObjectSide;
  shuffleOnStart: boolean;
};

export type ProjectTableSetupItemCommandType =
  | "drawFromContainerToTableOffset"
  | "drawFromContainerToTargetZone"
  | "refillTargetZoneFromContainer"
  | "shuffleContainer";

export type ProjectTableSetupItemCommandTableOffset = {
  x: number;
  y: number;
};

export type ProjectTableSetupItemCommandBase = {
  id: string;
  label: string;
};

export type ProjectTableSetupItemShuffleContainerCommand = ProjectTableSetupItemCommandBase & {
  type: "shuffleContainer";
};

export type ProjectTableSetupItemDrawFromContainerToTableOffsetCommand =
  ProjectTableSetupItemCommandBase & {
    count: number;
    drawOrder: ProjectTableSetupItemContainerDrawOrder;
    drawnItemSide: ProjectObjectSide;
    offset: ProjectTableSetupItemCommandTableOffset;
    type: "drawFromContainerToTableOffset";
  };

export type ProjectTableSetupItemDrawFromContainerToTargetZoneCommand =
  ProjectTableSetupItemCommandBase & {
    count: number;
    drawOrder: ProjectTableSetupItemContainerDrawOrder;
    drawnItemSide: ProjectObjectSide;
    targetItemId: string;
    type: "drawFromContainerToTargetZone";
  };

export type ProjectTableSetupItemRefillTargetZoneFromContainerCommand =
  ProjectTableSetupItemCommandBase & {
    drawOrder: ProjectTableSetupItemContainerDrawOrder;
    drawnItemSide: ProjectObjectSide;
    refillMode: "emptySlots";
    targetItemId: string;
    type: "refillTargetZoneFromContainer";
  };

export type ProjectTableSetupItemCommand =
  | ProjectTableSetupItemDrawFromContainerToTableOffsetCommand
  | ProjectTableSetupItemDrawFromContainerToTargetZoneCommand
  | ProjectTableSetupItemRefillTargetZoneFromContainerCommand
  | ProjectTableSetupItemShuffleContainerCommand;

export type ProjectTableSetupGameBindingOwner =
  | {
      type: "player";
      playerId: string;
    }
  | {
      type: "shared";
    };

export type ProjectTableSetupItemGameBinding = {
  counterId?: string;
  counterOwner?: ProjectTableSetupGameBindingOwner;
  owner?: ProjectTableSetupGameBindingOwner;
  role?: string;
};

export type ProjectTableSetupItemZoneSideOnEnter = "back" | "front" | "preserve";

export type ProjectTableSetupItemZoneSlotOccupancy = "single" | "stack";

export type ProjectTableSetupItemZoneBehavior = {
  acceptedObjectFileNodeIds: string[];
  acceptedKinds: ProjectObjectKind[];
  allowRemove: boolean;
  sideOnEnter: ProjectTableSetupItemZoneSideOnEnter;
  slotOccupancy: ProjectTableSetupItemZoneSlotOccupancy;
};

export type ProjectTableSetupItemBehavior = {
  commands?: ProjectTableSetupItemCommand[];
  container?: ProjectTableSetupItemContainerBehavior;
  interaction?: ProjectTableSetupItemInteractionBehavior;
  movement?: ProjectTableSetupItemMovementBehavior;
  rotation?: ProjectTableSetupItemRotationBehavior;
  side?: ProjectTableSetupItemSideBehavior;
  visibility?: ProjectTableSetupItemVisibilityBehavior;
  zone?: ProjectTableSetupItemZoneBehavior;
};

export type ProjectTableSetupLinkedObjectItem = {
  behavior?: ProjectTableSetupItemBehavior;
  gameBinding?: ProjectTableSetupItemGameBinding;
  id: string;
  name: string;
  sourceObjectFileNodeId: string;
  transform: ProjectTableSetupItemTransform;
  type: "linkedObject";
  values: Record<string, ProjectObjectVariableValue>;
  locked?: boolean;
  visible: boolean;
};

export type ProjectTableSetupLocalObjectItem = {
  behavior?: ProjectTableSetupItemBehavior;
  gameBinding?: ProjectTableSetupItemGameBinding;
  object: ProjectObjectNode;
  type: "localObject";
};

export type ProjectTableSetupItem =
  | ProjectTableSetupLinkedObjectItem
  | ProjectTableSetupLocalObjectItem;

export type ProjectTableSetup = {
  backgroundColor: string;
  composition?: ProjectCompositionSettings;
  grid: ProjectTableSetupGrid;
  height: number;
  items: ProjectTableSetupItem[];
  width: number;
};

export const defaultProjectTableSetupBackgroundColor = "#6f8b70";

export const projectTableSetupSizeLimits = {
  max: 5000,
  min: 100
} as const;

export const projectTableSetupGridSizeLimits = {
  max: 500,
  min: 5
} as const;

export function getDefaultProjectTableSetupGrid(): ProjectTableSetupGrid {
  return {
    size: 50,
    snap: false,
    visible: true
  };
}

export function getDefaultProjectTableSetupItemTransform(): ProjectTableSetupItemTransform {
  return {
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    x: 0,
    y: 0
  };
}

export function getDefaultProjectTableSetup(): ProjectTableSetup {
  return {
    backgroundColor: defaultProjectTableSetupBackgroundColor,
    composition: getDefaultProjectCompositionSettings(),
    grid: getDefaultProjectTableSetupGrid(),
    height: 600,
    items: [],
    width: 900
  };
}

export function getProjectTableSetupItemId(item: ProjectTableSetupItem) {
  return item.type === "linkedObject" ? item.id : item.object.id;
}

export function getProjectTableSetupItemName(item: ProjectTableSetupItem) {
  return item.type === "linkedObject" ? item.name : item.object.name;
}

export function getProjectTableSetupItemVisible(item: ProjectTableSetupItem) {
  return item.type === "linkedObject" ? item.visible : item.object.visible;
}

export function getProjectTableSetupItemLocked(item: ProjectTableSetupItem) {
  return item.type === "linkedObject" ? item.locked === true : item.object.locked === true;
}
