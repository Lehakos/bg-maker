import type { ComponentCollection, ComponentType, GameComponent } from "./components.js";

export const zoneChildTypes = ["zone", "card", "piece", "tile", "mixed"] as const;

export type ZoneChildType = (typeof zoneChildTypes)[number];

export const zoneSourceChildTypes = ["card", "piece", "tile"] as const;

export type ZoneSourceChildType = (typeof zoneSourceChildTypes)[number];

export type ZoneItemChildType = Exclude<ZoneChildType, "zone">;

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
  childrenType: ZoneSourceChildType;
  face: ZoneSourceFace;
  source?: TableSource;
};

export type ZoneMixed = ZoneBase & {
  children: ZoneMixedChild[];
  childrenType: "mixed";
};

export type ZoneMixedChild = {
  face: TablePlacementFace;
  id: string;
  rotationDeg: number;
  source: TableSource;
  x: number;
  y: number;
};

export type ZoneItemContainer = ZoneMixed | ZoneSource;

export type TableZone = ZoneContainer | ZoneItemContainer;

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
  childrenType: ZoneSourceChildType,
  componentsById: Map<string, GameComponent>
) {
  return collection.items.every((item) => {
    const component = componentsById.get(item.componentId);
    return component ? componentMatchesZoneChildType(component, childrenType) : false;
  });
}

export function componentMatchesZoneChildType(
  component: GameComponent,
  childrenType: ZoneItemChildType
) {
  return componentTypeMatchesZoneChildType(component.type, childrenType);
}

export function componentTypeMatchesZoneChildType(
  componentType: ComponentType,
  childrenType: ZoneItemChildType
) {
  return childrenType === "mixed" || componentType === childrenType;
}

export function tableSourceMatchesZoneChildType(
  source: TableSource,
  childrenType: ZoneSourceChildType,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
) {
  if (source.kind === "component") {
    const component = componentsById.get(source.componentId);
    return component ? componentMatchesZoneChildType(component, childrenType) : false;
  }

  const collection = collectionsById.get(source.collectionId);
  return collection
    ? collectionMatchesZoneChildType(collection, childrenType, componentsById)
    : false;
}

export function zoneAcceptsItems(zone: TableZone): zone is ZoneItemContainer {
  return zone.childrenType !== "zone";
}

export function zoneSupportsSource(zone: TableZone): zone is ZoneSource {
  return zoneSourceChildTypes.includes(zone.childrenType as ZoneSourceChildType);
}
