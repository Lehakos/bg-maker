import type { DragEvent } from "react";
import {
  type ComponentCollection,
  type ComponentType,
  type GameComponent,
  type TableSetup,
  type TableSource,
  type TableZone,
  type ZoneBackground,
  type ZoneBackgroundImageFit,
  type ZoneChildType,
  type ZoneLayout,
  type ZoneOverflowMode,
  type ZoneSizeMode,
  type ZoneSource,
  type ZoneVisibility
} from "@bg-maker/shared";

export type TablePoint = {
  x: number;
  y: number;
};

export type TableSize = {
  height: number;
  width: number;
};

export type RenderedZone = {
  absoluteX: number;
  absoluteY: number;
  depth: number;
  localX: number;
  localY: number;
  parentLayout: ZoneLayout;
  parentHeight: number;
  parentWidth: number;
  zone: TableZone;
};

export const libraryDragType = "application/x-bg-maker-table-source";
export const minZoneSizeMm = 20;
export const defaultZoneBackgroundColor = "#e0f2fe";

const tableBackgroundImageMaxBytes = 5 * 1024 * 1024;
export const minTableZoom = 0.5;
export const maxTableZoom = 2.5;

export function createDefaultTableZone({
  childrenType,
  existingZones,
  height,
  id,
  name,
  width,
  x,
  y
}: {
  childrenType: ZoneChildType;
  existingZones: TableZone[];
  height: number;
  id: string;
  name: string;
  width: number;
  x: number;
  y: number;
}): TableZone {
  const uniqueName = getUniqueZoneName(name, existingZones);
  const base = {
    id,
    name: uniqueName,
    description: "",
    x,
    y,
    width,
    height,
    padding: 8,
    size: "fixed" as ZoneSizeMode,
    overflow: "hidden" as ZoneOverflowMode,
    capacity: null,
    layout: "free" as ZoneLayout,
    visibility: "all" as ZoneVisibility,
    background: { type: "color", color: defaultZoneBackgroundColor } as ZoneBackground,
    border: { width: 1, color: "#0e7490" }
  };

  return createZoneForType(childrenType, base);
}

export function createZoneForType(
  childrenType: ZoneChildType,
  base: Omit<TableZone, "autofill" | "children" | "childrenType" | "face" | "source">
): TableZone {
  if (childrenType === "zone") {
    return {
      ...base,
      childrenType: "zone",
      children: []
    };
  }

  return {
    ...base,
    autofill: true,
    childrenType,
    face: "up"
  };
}

export function getZoneBase(
  zone: TableZone
): Omit<TableZone, "autofill" | "children" | "childrenType" | "face" | "source"> {
  return {
    id: zone.id,
    name: zone.name,
    description: zone.description,
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
    padding: zone.padding,
    size: zone.size,
    overflow: zone.overflow,
    capacity: zone.capacity,
    layout: zone.layout,
    ...(zone.gap !== undefined ? { gap: zone.gap } : {}),
    ...(zone.columns !== undefined ? { columns: zone.columns } : {}),
    visibility: zone.visibility,
    background: { ...zone.background },
    border: { ...zone.border }
  };
}

export function updateZoneInTree(
  zones: TableZone[],
  zoneId: string,
  updater: (zone: TableZone) => TableZone
): TableZone[] {
  return zones.map((zone) => {
    if (zone.id === zoneId) {
      return updater(zone);
    }

    if (zone.childrenType === "zone") {
      return {
        ...zone,
        children: updateZoneInTree(zone.children, zoneId, updater)
      };
    }

    return zone;
  });
}

export function removeZoneFromTree(zones: TableZone[], zoneId: string): TableZone[] {
  return zones
    .filter((zone) => zone.id !== zoneId)
    .map((zone) =>
      zone.childrenType === "zone"
        ? { ...zone, children: removeZoneFromTree(zone.children, zoneId) }
        : zone
    );
}

export function clampZonesToBounds(
  zones: TableZone[],
  parentWidth: number,
  parentHeight: number,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
): TableZone[] {
  return zones.map((zone) => {
    const width = Math.min(Math.max(minZoneSizeMm, zone.width), parentWidth);
    const height = Math.min(Math.max(minZoneSizeMm, zone.height), parentHeight);
    const x = clamp(zone.x, 0, Math.max(0, parentWidth - width));
    const y = clamp(zone.y, 0, Math.max(0, parentHeight - height));
    let bounded = { ...zone, height, width, x, y } as TableZone;

    if (bounded.childrenType === "zone") {
      const childParentWidth =
        bounded.size === "auto" ? Math.max(minZoneSizeMm, parentWidth - bounded.x) : bounded.width;
      const childParentHeight =
        bounded.size === "auto"
          ? Math.max(minZoneSizeMm, parentHeight - bounded.y)
          : bounded.height;

      bounded = {
        ...bounded,
        children: clampZonesToBounds(
          bounded.children,
          childParentWidth,
          childParentHeight,
          componentsById,
          collectionsById
        )
      };
    }

    const resized = applyAutoZoneSize(bounded, componentsById, collectionsById);
    const finalZone = {
      ...resized,
      width: Math.min(resized.width, Math.max(minZoneSizeMm, parentWidth - resized.x)),
      height: Math.min(resized.height, Math.max(minZoneSizeMm, parentHeight - resized.y))
    };

    return finalZone.childrenType === "zone"
      ? {
          ...finalZone,
          children: clampZonesToBounds(
            finalZone.children,
            finalZone.width,
            finalZone.height,
            componentsById,
            collectionsById
          )
        }
      : finalZone;
  });
}

export function materializeZoneItems(
  zone: ZoneSource,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
) {
  if (!zone.autofill || !zone.source) {
    return [];
  }

  const components: GameComponent[] = [];

  if (zone.source.kind === "component") {
    const component = componentsById.get(zone.source.componentId);
    if (component && component.type === zone.childrenType) {
      components.push(component);
    }
  } else {
    const collection = collectionsById.get(zone.source.collectionId);

    for (const item of collection?.items ?? []) {
      const component = componentsById.get(item.componentId);

      if (!component || component.type !== zone.childrenType) {
        continue;
      }

      for (let index = 0; index < item.quantity; index += 1) {
        components.push(component);
      }
    }
  }

  return components.slice(0, zone.capacity ?? components.length);
}

export function getZoneItemPoint(
  zone: ZoneSource,
  component: GameComponent,
  index: number
): TablePoint {
  const itemSize = getComponentTableSize(component);
  const padding = zone.padding;
  const gap = zone.gap ?? 0;

  if (zone.layout === "row") {
    return {
      x: Math.round(clamp(padding + index * (itemSize.width + gap), 0, zone.width)),
      y: Math.round(clamp(padding, 0, zone.height))
    };
  }

  if (zone.layout === "grid") {
    const columns = Math.max(1, zone.columns ?? zone.capacity ?? 1);
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      x: Math.round(clamp(padding + column * (itemSize.width + gap), 0, zone.width)),
      y: Math.round(clamp(padding + row * (itemSize.height + gap), 0, zone.height))
    };
  }

  return {
    x: Math.round(clamp(padding + index * 2, 0, zone.width)),
    y: Math.round(clamp(padding + index * 2, 0, zone.height))
  };
}

export function flattenRenderedZones(
  zones: TableZone[],
  parentAbsoluteX: number,
  parentAbsoluteY: number,
  parentWidth: number,
  parentHeight: number,
  depth: number,
  parentContainer?: Extract<TableZone, { childrenType: "zone" }>
): RenderedZone[] {
  return zones.flatMap((zone, index) => {
    const point = parentContainer
      ? getContainerChildPoint(parentContainer, zone, index)
      : { x: zone.x, y: zone.y };
    const parentLayout = parentContainer?.layout ?? "free";
    const rendered = {
      absoluteX: parentAbsoluteX + point.x,
      absoluteY: parentAbsoluteY + point.y,
      depth,
      localX: point.x,
      localY: point.y,
      parentLayout,
      parentHeight,
      parentWidth,
      zone
    };

    if (zone.childrenType !== "zone") {
      return [rendered];
    }

    return [
      rendered,
      ...flattenRenderedZones(
        zone.children,
        rendered.absoluteX,
        rendered.absoluteY,
        zone.width,
        zone.height,
        depth + 1,
        zone
      )
    ];
  });
}

export function getZoneLayoutPatch(zone: TableZone, layout: ZoneLayout): Partial<TableZone> {
  if (layout === "free" || layout === "stack") {
    return { layout, gap: undefined, columns: undefined } as Partial<TableZone>;
  }

  if (layout === "row") {
    return { layout, gap: zone.gap ?? 8, columns: undefined } as Partial<TableZone>;
  }

  return { layout, gap: zone.gap ?? 8, columns: zone.columns ?? 3 } as Partial<TableZone>;
}

export function getSetupSaveValidationError(setup: TableSetup) {
  const invalidImageZone = findInvalidBackgroundImageZone(setup.zones);

  if (invalidImageZone) {
    return `Choose a background image for "${invalidImageZone.name}" before saving`;
  }

  return null;
}

export function getLargestCollectionComponent(
  collection: ComponentCollection,
  componentsById: Map<string, GameComponent>,
  componentType: ComponentType
) {
  return collection.items
    .map((item) => componentsById.get(item.componentId))
    .filter((component): component is GameComponent => component?.type === componentType)
    .sort((left, right) => areaOfComponent(right) - areaOfComponent(left))[0];
}

export function readDragSource(event: DragEvent<HTMLElement>): TableSource | null {
  const raw =
    event.dataTransfer.getData(libraryDragType) || event.dataTransfer.getData("text/plain");

  if (!raw) {
    return null;
  }

  try {
    const source = JSON.parse(raw) as TableSource;

    if (source.kind === "component" || source.kind === "collection") {
      return source;
    }
  } catch {
    return null;
  }

  return null;
}

export function hasDragSource(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes(libraryDragType);
}

export function sourceToSelectValue(source: TableSource) {
  return source.kind === "component"
    ? `component:${source.componentId}`
    : `collection:${source.collectionId}`;
}

export function selectValueToSource(value: string): TableSource | undefined {
  const [kind, id] = value.split(":");

  if (!id) {
    return undefined;
  }

  if (kind === "component") {
    return { kind, componentId: id };
  }

  if (kind === "collection") {
    return { kind, collectionId: id };
  }

  return undefined;
}

export function getSourceName(
  source: TableSource,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
) {
  return source.kind === "component"
    ? (componentsById.get(source.componentId)?.name ?? "Missing component")
    : (collectionsById.get(source.collectionId)?.name ?? "Missing collection");
}

export function sourcesAreEqual(left: TableSource, right: TableSource) {
  return sourceToSelectValue(left) === sourceToSelectValue(right);
}

export function getCollectionQuantity(collection: ComponentCollection) {
  return collection.items.reduce((total, item) => total + item.quantity, 0);
}

export function itemMatchesQuery(name: string, tags: string[], normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  return (
    name.toLocaleLowerCase().includes(normalizedQuery) ||
    tags.some((tag) => tag.toLocaleLowerCase().includes(normalizedQuery))
  );
}

export function createBackgroundForType(
  type: ZoneBackground["type"],
  current: ZoneBackground
): ZoneBackground {
  if (type === current.type) {
    return current;
  }

  if (type === "color") {
    return { type, color: defaultZoneBackgroundColor };
  }

  if (type === "image") {
    return { type, dataUrl: "", fileName: "", fit: "cover" };
  }

  return { type: "none" };
}

export function readImageBackground(
  file: File,
  fit: ZoneBackgroundImageFit = "cover"
): Promise<ZoneBackground> {
  return new Promise((resolve, reject) => {
    const mimeType = getImageMimeType(file);

    if (!mimeType) {
      reject(new Error("Choose a PNG, JPG, GIF, WebP, or SVG image"));
      return;
    }

    if (file.size > tableBackgroundImageMaxBytes) {
      reject(new Error("Background image must be 5 MB or smaller"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read image file"));
        return;
      }

      const dataUrl = reader.result.replace(/^data:[^;]*;base64,/, `data:${mimeType};base64,`);

      resolve({
        type: "image",
        dataUrl,
        fileName: file.name,
        fit
      });
    };
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

export function getZoneBackgroundStyle(background: ZoneBackground) {
  if (background.type === "color") {
    return {
      backgroundColor: background.color,
      backgroundImage: "none"
    };
  }

  if (background.type === "image" && background.dataUrl) {
    return {
      backgroundColor: "transparent",
      backgroundImage: `url("${background.dataUrl}")`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize:
        background.fit === "stretch"
          ? "100% 100%"
          : background.fit === "contain"
            ? "contain"
            : "cover"
    };
  }

  return {
    backgroundColor: "transparent",
    backgroundImage: "none"
  };
}

export function cloneSetup(setup: TableSetup): TableSetup {
  return {
    ...setup,
    placements: setup.placements.map((placement) => ({
      ...placement,
      source: { ...placement.source }
    })),
    zones: cloneZones(setup.zones)
  };
}

export function getSetupSignature(setup: TableSetup) {
  return JSON.stringify({
    height: setup.height,
    placements: setup.placements,
    width: setup.width,
    zones: setup.zones
  });
}

export function countZones(zones: TableZone[]): number {
  return zones.reduce(
    (total, zone) => total + 1 + (zone.childrenType === "zone" ? countZones(zone.children) : 0),
    0
  );
}

export function createClientId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function toNumberInputValue(value: number | string, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function clampZoom(value: number) {
  return Math.round(clamp(value, minTableZoom, maxTableZoom) * 100) / 100;
}

export function formatZoom(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function readCssPixels(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function applyAutoZoneSize(
  zone: TableZone,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
): TableZone {
  if (zone.size !== "auto") {
    return zone;
  }

  const size = getAutoZoneSize(zone, componentsById, collectionsById);

  if (!size) {
    return zone;
  }

  return {
    ...zone,
    width: Math.round(Math.max(minZoneSizeMm, size.width)),
    height: Math.round(Math.max(minZoneSizeMm, size.height)),
    overflow: "visible"
  };
}

function getAutoZoneSize(
  zone: TableZone,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
): TableSize | null {
  if (zone.childrenType === "zone") {
    return getAutoContainerZoneSize(zone);
  }

  return getAutoSourceZoneSize(zone, componentsById, collectionsById);
}

function getAutoContainerZoneSize(zone: Extract<TableZone, { childrenType: "zone" }>): TableSize {
  const padding = zone.padding;
  const gap = zone.gap ?? 0;

  if (zone.children.length === 0) {
    return {
      height: padding * 2,
      width: padding * 2
    };
  }

  if (zone.layout === "free") {
    return {
      height: Math.max(...zone.children.map((child) => child.y + child.height)) + padding,
      width: Math.max(...zone.children.map((child) => child.x + child.width)) + padding
    };
  }

  if (zone.layout === "row") {
    return {
      height: Math.max(...zone.children.map((child) => child.height)) + padding * 2,
      width:
        zone.children.reduce((sum, child) => sum + child.width, 0) +
        gap * Math.max(0, zone.children.length - 1) +
        padding * 2
    };
  }

  if (zone.layout === "grid") {
    const columns = Math.max(1, zone.columns ?? zone.children.length);
    const rows = Math.max(1, Math.ceil(zone.children.length / columns));
    const cellSize = getContainerGridCellSize(zone.children);

    return {
      height: cellSize.height * rows + gap * (rows - 1) + padding * 2,
      width: cellSize.width * columns + gap * (columns - 1) + padding * 2
    };
  }

  return {
    height:
      Math.max(...zone.children.map((child, index) => child.height + index * 2)) + padding * 2,
    width: Math.max(...zone.children.map((child, index) => child.width + index * 2)) + padding * 2
  };
}

function getAutoSourceZoneSize(
  zone: ZoneSource,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
): TableSize | null {
  const sourceSize = getZoneSourceItemSize(zone, componentsById, collectionsById);

  if (!sourceSize) {
    return null;
  }

  const quantity = getAutoZoneSlotCount(zone, componentsById, collectionsById);
  const gap = zone.gap ?? 0;
  const padding = zone.padding;

  if (zone.layout === "row") {
    return {
      height: sourceSize.height + padding * 2,
      width: sourceSize.width * quantity + gap * (quantity - 1) + padding * 2
    };
  }

  if (zone.layout === "grid") {
    const columns = Math.max(1, zone.columns ?? quantity);
    const rows = Math.max(1, Math.ceil(quantity / columns));

    return {
      height: sourceSize.height * rows + gap * (rows - 1) + padding * 2,
      width: sourceSize.width * columns + gap * (columns - 1) + padding * 2
    };
  }

  return {
    height: sourceSize.height + padding * 2,
    width: sourceSize.width + padding * 2
  };
}

function getZoneSourceItemSize(
  zone: ZoneSource,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
): TableSize | null {
  const component =
    zone.source?.kind === "component" ? componentsById.get(zone.source.componentId) : undefined;

  if (component) {
    return getComponentTableSize(component);
  }

  const collection =
    zone.source?.kind === "collection" ? collectionsById.get(zone.source.collectionId) : undefined;

  if (!collection) {
    return null;
  }

  return getCollectionTableSize(collection, componentsById);
}

function getAutoZoneSlotCount(
  zone: ZoneSource,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
) {
  if (zone.capacity !== null) {
    return zone.capacity;
  }

  return Math.max(1, getZoneRenderQuantity(zone, componentsById, collectionsById));
}

function getZoneRenderQuantity(
  zone: ZoneSource,
  componentsById: Map<string, GameComponent>,
  collectionsById: Map<string, ComponentCollection>
) {
  return materializeZoneItems(zone, componentsById, collectionsById).length;
}

function getContainerChildPoint(
  container: Extract<TableZone, { childrenType: "zone" }>,
  child: TableZone,
  index: number
): TablePoint {
  const padding = container.padding;
  const gap = container.gap ?? 0;
  const maxX = Math.max(0, container.width - child.width);
  const maxY = Math.max(0, container.height - child.height);

  if (container.layout === "free") {
    return {
      x: Math.round(clamp(child.x, 0, maxX)),
      y: Math.round(clamp(child.y, 0, maxY))
    };
  }

  if (container.layout === "row") {
    const x = container.children
      .slice(0, index)
      .reduce((sum, previousChild) => sum + previousChild.width + gap, padding);

    return {
      x: Math.round(clamp(x, 0, maxX)),
      y: Math.round(clamp(padding, 0, maxY))
    };
  }

  if (container.layout === "grid") {
    const columns = Math.max(1, container.columns ?? container.children.length);
    const cellSize = getContainerGridCellSize(container.children);
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      x: Math.round(clamp(padding + column * (cellSize.width + gap), 0, maxX)),
      y: Math.round(clamp(padding + row * (cellSize.height + gap), 0, maxY))
    };
  }

  return {
    x: Math.round(clamp(padding + index * 2, 0, maxX)),
    y: Math.round(clamp(padding + index * 2, 0, maxY))
  };
}

function getContainerGridCellSize(children: TableZone[]): TableSize {
  return children.reduce(
    (size, child) => ({
      height: Math.max(size.height, child.height),
      width: Math.max(size.width, child.width)
    }),
    { height: minZoneSizeMm, width: minZoneSizeMm }
  );
}

function findInvalidBackgroundImageZone(zones: TableZone[]): TableZone | null {
  for (const zone of zones) {
    if (zone.background.type === "image" && !zone.background.dataUrl) {
      return zone;
    }

    if (zone.childrenType === "zone") {
      const invalidChild = findInvalidBackgroundImageZone(zone.children);

      if (invalidChild) {
        return invalidChild;
      }
    }
  }

  return null;
}

function getComponentTableSize(component: GameComponent): TableSize {
  if (component.type === "card") {
    return {
      height: component.layout.size.heightMm,
      width: component.layout.size.widthMm
    };
  }

  if (component.type === "tile") {
    return {
      height: component.layout.sizeMm.heightMm,
      width: component.layout.sizeMm.widthMm
    };
  }

  if (component.type === "piece") {
    return {
      height: component.layout.sizeMm.heightMm,
      width: component.layout.sizeMm.widthMm
    };
  }

  return {
    height: 20,
    width: 20
  };
}

function getCollectionTableSize(
  collection: ComponentCollection,
  componentsById: Map<string, GameComponent>
): TableSize | null {
  const itemSizes = collection.items
    .map((item) => {
      const component = componentsById.get(item.componentId);
      return component ? getComponentTableSize(component) : null;
    })
    .filter((size): size is TableSize => size !== null);

  if (itemSizes.length === 0) {
    return null;
  }

  return {
    height: Math.max(...itemSizes.map((size) => size.height)),
    width: Math.max(...itemSizes.map((size) => size.width))
  };
}

function areaOfComponent(component: GameComponent) {
  const size = getComponentTableSize(component);
  return size.width * size.height;
}

function getImageMimeType(file: File) {
  if (file.type.startsWith("image/")) {
    return file.type;
  }

  const extension = file.name.toLowerCase().split(".").pop();

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "gif") {
    return "image/gif";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "svg") {
    return "image/svg+xml";
  }

  return null;
}

function cloneZones(zones: TableZone[]): TableZone[] {
  return zones.map((zone) =>
    zone.childrenType === "zone"
      ? {
          ...zone,
          background: { ...zone.background },
          border: { ...zone.border },
          children: cloneZones(zone.children)
        }
      : {
          ...zone,
          background: { ...zone.background },
          border: { ...zone.border },
          source: zone.source ? { ...zone.source } : undefined
        }
  );
}

function getUniqueZoneName(name: string, zones: TableZone[]) {
  const names = new Set(flattenZones(zones).map((zone) => zone.name.toLocaleLowerCase()));
  let candidate = name;
  let suffix = 2;

  while (names.has(candidate.toLocaleLowerCase())) {
    candidate = `${name} ${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function flattenZones(zones: TableZone[]): TableZone[] {
  return zones.flatMap((zone): TableZone[] =>
    zone.childrenType === "zone" ? [zone, ...flattenZones(zone.children)] : [zone]
  );
}
