import type { ComponentCollection, GameComponent } from "./components.js";

export const zoneChildTypes = ["zone", "card", "piece", "tile"] as const;

export type ZoneChildType = (typeof zoneChildTypes)[number];

export const zoneLayouts = ["free", "stack", "row", "grid"] as const;

export type ZoneLayout = (typeof zoneLayouts)[number];

export const zoneVisibilityModes = ["all", "player", "opponents", "nobody"] as const;

export type ZoneVisibility = (typeof zoneVisibilityModes)[number];

export const zoneSizeModes = ["auto", "fixed"] as const;

export type ZoneSizeMode = (typeof zoneSizeModes)[number];

export const zoneOverflowModes = ["hidden", "visible"] as const;

export type ZoneOverflowMode = (typeof zoneOverflowModes)[number];

export const zoneSourceFaces = ["up", "down"] as const;

export type ZoneSourceFace = (typeof zoneSourceFaces)[number];

export const tablePlacementFaces = ["front", "back"] as const;

export type TablePlacementFace = (typeof tablePlacementFaces)[number];

export const zoneBackgroundImageFits = ["cover", "contain", "stretch"] as const;

export type ZoneBackgroundImageFit = (typeof zoneBackgroundImageFits)[number];

export type ZoneCapacity = number | null;

export type TableSource =
  | {
      kind: "component";
      componentId: string;
    }
  | {
      kind: "collection";
      collectionId: string;
    };

export type ZoneBackground =
  | {
      type: "none";
    }
  | {
      color: string;
      type: "color";
    }
  | {
      dataUrl: string;
      fileName: string;
      fit: ZoneBackgroundImageFit;
      type: "image";
    };

export type ZoneBorder = {
  color: string;
  width: number;
};

export type ZoneBase = {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  padding: number;
  size: ZoneSizeMode;
  overflow: ZoneOverflowMode;
  capacity: ZoneCapacity;
  layout: ZoneLayout;
  gap?: number;
  columns?: number;
  visibility: ZoneVisibility;
  background: ZoneBackground;
  border: ZoneBorder;
};

export type ZoneContainer = ZoneBase & {
  childrenType: "zone";
  children: TableZone[];
};

export type ZoneSource = ZoneBase & {
  autofill: boolean;
  childrenType: Exclude<ZoneChildType, "zone">;
  face: ZoneSourceFace;
  source?: TableSource;
};

export type TableZone = ZoneContainer | ZoneSource;

export type TablePlacement = {
  id: string;
  source: TableSource;
  x: number;
  y: number;
  rotationDeg: number;
  face: TablePlacementFace;
};

export type TableSetup = {
  projectId: string;
  width: number;
  height: number;
  zones: TableZone[];
  placements: TablePlacement[];
  createdAt: string;
  updatedAt: string;
};

export type UpdateTableSetupInput = {
  width?: number;
  height?: number;
  zones?: TableZone[];
  placements?: TablePlacement[];
};

export const defaultTableSetupSize = {
  width: 1600,
  height: 1000
} as const;

export function collectionMatchesZoneChildType(
  collection: ComponentCollection,
  childrenType: Exclude<ZoneChildType, "zone">,
  componentsById: Map<string, GameComponent>
) {
  return collection.items.every(
    (item) => componentsById.get(item.componentId)?.type === childrenType
  );
}

export function tableSourceMatchesZoneChildType(
  source: TableSource,
  childrenType: Exclude<ZoneChildType, "zone">,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
) {
  if (source.kind === "component") {
    return componentsById.get(source.componentId)?.type === childrenType;
  }

  const collection = collectionsById.get(source.collectionId);
  return collection
    ? collectionMatchesZoneChildType(collection, childrenType, componentsById)
    : false;
}
