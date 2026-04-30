import type { ComponentType } from "./components.js";
import type { TableSetup } from "./table-setup.js";

export const runtimeSessionStatuses = ["active"] as const;

export type RuntimeSessionStatus = (typeof runtimeSessionStatuses)[number];

export const runtimeFreeZoneSnap = 20;
export const runtimeFreeZoneMagnetDistance = 18;

export type RuntimeFreeZoneSnapRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export function clampRuntimeFreeZonePoint(input: {
  itemHeight: number;
  itemWidth: number;
  x: number;
  y: number;
  zoneHeight: number;
  zoneWidth: number;
}) {
  return {
    x: clampNumber(input.x, 0, Math.max(0, input.zoneWidth - input.itemWidth)),
    y: clampNumber(input.y, 0, Math.max(0, input.zoneHeight - input.itemHeight))
  };
}

export function snapRuntimeFreeZonePoint(input: {
  itemHeight: number;
  itemWidth: number;
  snapRects?: RuntimeFreeZoneSnapRect[];
  x: number;
  y: number;
  zoneHeight: number;
  zoneWidth: number;
}) {
  const magnetPoint = getRuntimeFreeZoneMagnetPoint(input);

  if (magnetPoint) {
    return clampRuntimeFreeZonePoint({
      ...input,
      x: magnetPoint.x,
      y: magnetPoint.y
    });
  }

  return clampRuntimeFreeZonePoint({
    ...input,
    x: Math.round(input.x / runtimeFreeZoneSnap) * runtimeFreeZoneSnap,
    y: Math.round(input.y / runtimeFreeZoneSnap) * runtimeFreeZoneSnap
  });
}

function getRuntimeFreeZoneMagnetPoint(input: {
  itemHeight: number;
  itemWidth: number;
  snapRects?: RuntimeFreeZoneSnapRect[];
  x: number;
  y: number;
  zoneHeight: number;
  zoneWidth: number;
}) {
  const candidates = (input.snapRects ?? []).flatMap((rect) => [
    { x: rect.x - input.itemWidth, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y - input.itemHeight },
    { x: rect.x, y: rect.y + rect.height }
  ]);
  const validCandidates = candidates
    .filter(
      (candidate) =>
        candidate.x >= 0 &&
        candidate.y >= 0 &&
        candidate.x + input.itemWidth <= input.zoneWidth &&
        candidate.y + input.itemHeight <= input.zoneHeight
    )
    .map((candidate) => ({
      ...candidate,
      distance: Math.hypot(candidate.x - input.x, candidate.y - input.y)
    }))
    .filter((candidate) => candidate.distance <= runtimeFreeZoneMagnetDistance)
    .sort((left, right) => left.distance - right.distance);

  return validCandidates[0] ?? null;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export type RuntimeLocation =
  | {
      index: number;
      kind: "zone";
      x?: number;
      y?: number;
      zoneId: string;
    }
  | {
      index: number;
      kind: "placement";
      placementId: string;
    };

export type RuntimeInstanceOrigin =
  | {
      kind: "zone";
      zoneId: string;
    }
  | {
      kind: "placement";
      placementId: string;
    };

export type RuntimeRollResult = {
  label?: string;
  rolledAt: string;
  value: number;
};

export type RuntimeInstance = {
  id: string;
  componentId: string;
  componentType: ComponentType;
  faceUp: boolean;
  lastRoll?: RuntimeRollResult;
  location: RuntimeLocation;
  origin: RuntimeInstanceOrigin;
  rotationDeg: number;
  tapped: boolean;
};

export type RuntimeActionInput =
  | {
      instanceId: string;
      target: RuntimeLocation;
      type: "MOVE_INSTANCE";
    }
  | {
      location: RuntimeLocation;
      type: "SHUFFLE_STACK";
    }
  | {
      faceUp?: boolean;
      instanceId: string;
      type: "FLIP_INSTANCE";
    }
  | {
      deltaDeg?: number;
      instanceId: string;
      rotationDeg?: number;
      tapped?: boolean;
      type: "ROTATE_INSTANCE";
    }
  | {
      instanceId: string;
      type: "ROLL_DIE";
    }
  | {
      type: "RESET_SESSION";
    };

export type RuntimeActionLogEntry = {
  id: string;
  action: RuntimeActionInput | { type: "CREATE_SESSION" };
  createdAt: string;
  message: string;
};

export type RuntimeSession = {
  id: string;
  projectId: string;
  name: string;
  status: RuntimeSessionStatus;
  setupSnapshot: TableSetup;
  instances: RuntimeInstance[];
  actionLog: RuntimeActionLogEntry[];
  createdAt: string;
  updatedAt: string;
};

export type RuntimeSessionSummary = {
  id: string;
  projectId: string;
  name: string;
  status: RuntimeSessionStatus;
  createdAt: string;
  updatedAt: string;
  instanceCount: number;
  actionCount: number;
};

export type CreateRuntimeSessionInput = {
  name?: string;
};
