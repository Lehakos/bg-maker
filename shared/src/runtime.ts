import type { ComponentType } from "./components.js";
import type { TableSetup } from "./table-setup.js";

export const runtimeSessionStatuses = ["active"] as const;

export type RuntimeSessionStatus = (typeof runtimeSessionStatuses)[number];

export type RuntimeLocation =
  | {
      index: number;
      kind: "zone";
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
