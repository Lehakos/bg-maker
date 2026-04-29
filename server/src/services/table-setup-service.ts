import {
  defaultTableSetupSize,
  tablePlacementFaces,
  zoneBackgroundImageFits,
  zoneChildTypes,
  zoneLayouts,
  zoneOverflowModes,
  zoneSizeModes,
  zoneSourceFaces,
  zoneVisibilityModes,
  type ComponentCollection,
  type TablePlacement,
  type TableSetup,
  type TableSource,
  type TableZone,
  type UpdateTableSetupInput,
  type ZoneBackground,
  type ZoneBase,
  type ZoneBorder,
  type ZoneChildType,
  type ZoneSource
} from "@bg-maker/shared";
import {
  getProjectCollections,
  getProjectComponents,
  getProjectTableSetup,
  projects,
  setProjectTableSetup
} from "./in-memory-store.js";
import { touchProject } from "./project-service.js";
import { fail, ok, type ServiceResult } from "./service-result.js";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

type ZoneParseContext = {
  ids: Set<string>;
  names: Set<string>;
  projectId: string;
  tableHeight: number;
  tableWidth: number;
  totalZones: number;
};

const oldZoneFields = ["accepts", "appearance", "sizePolicy"] as const;
const oldPlacementFields = [
  "collectionId",
  "componentId",
  "presentation",
  "quantity",
  "slotIndex",
  "zoneId"
] as const;
const imageMaxBytes = 5 * 1024 * 1024;

export function getTableSetup(projectId: string): ServiceResult<TableSetup> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  return ok(getProjectTableSetup(projectId) ?? createDefaultTableSetup(projectId));
}

export function updateTableSetup(projectId: string, value: unknown): ServiceResult<TableSetup> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const currentSetup = getProjectTableSetup(projectId) ?? createDefaultTableSetup(projectId);
  const input = parseUpdateTableSetupInput(value, projectId, currentSetup);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const updatedSetup: TableSetup = {
    ...currentSetup,
    ...input.value,
    projectId,
    updatedAt: new Date().toISOString()
  };

  setProjectTableSetup(projectId, updatedSetup);
  touchProject(projectId);

  return ok(updatedSetup);
}

export function tableSetupUsesComponent(projectId: string, componentId: string) {
  const setup = getProjectTableSetup(projectId);

  if (!setup) {
    return false;
  }

  return (
    setup.placements.some((placement) => sourceUsesComponent(placement.source, componentId)) ||
    flattenZones(setup.zones).some(
      (zone) => zone.childrenType !== "zone" && sourceUsesComponent(zone.source, componentId)
    )
  );
}

export function tableSetupUsesCollection(projectId: string, collectionId: string) {
  const setup = getProjectTableSetup(projectId);

  if (!setup) {
    return false;
  }

  return (
    setup.placements.some((placement) => sourceUsesCollection(placement.source, collectionId)) ||
    flattenZones(setup.zones).some(
      (zone) => zone.childrenType !== "zone" && sourceUsesCollection(zone.source, collectionId)
    )
  );
}

function createDefaultTableSetup(projectId: string): TableSetup {
  const timestamp = new Date().toISOString();

  return {
    projectId,
    width: defaultTableSetupSize.width,
    height: defaultTableSetupSize.height,
    zones: [],
    placements: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function parseUpdateTableSetupInput(
  value: unknown,
  projectId: string,
  currentSetup: TableSetup
): ParseResult<UpdateTableSetupInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const width = readOptionalNumber(value.width, "Table width mm", { min: 300, max: 6000 });
  const height = readOptionalNumber(value.height, "Table height mm", { min: 300, max: 6000 });

  if (!width.ok) {
    return width;
  }

  if (!height.ok) {
    return height;
  }

  const tableWidth = width.value ?? currentSetup.width;
  const tableHeight = height.value ?? currentSetup.height;
  const zones = readOptionalZones(value.zones, projectId, tableWidth, tableHeight);

  if (!zones.ok) {
    return zones;
  }

  const placements = readOptionalPlacements(value.placements, projectId, tableWidth, tableHeight);

  if (!placements.ok) {
    return placements;
  }

  const input: UpdateTableSetupInput = {};

  if (width.value !== undefined) {
    input.width = width.value;
  }

  if (height.value !== undefined) {
    input.height = height.value;
  }

  if (zones.value !== undefined) {
    input.zones = zones.value;
  }

  if (placements.value !== undefined) {
    input.placements = placements.value;
  }

  return { ok: true, value: input };
}

function readOptionalZones(
  value: unknown,
  projectId: string,
  tableWidth: number,
  tableHeight: number
): ParseResult<TableZone[] | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "Table zones must be an array" };
  }

  const context: ZoneParseContext = {
    ids: new Set<string>(),
    names: new Set<string>(),
    projectId,
    tableHeight,
    tableWidth,
    totalZones: 0
  };
  const zones = readZones(value, context, tableWidth, tableHeight);

  return zones.ok ? { ok: true, value: zones.value } : zones;
}

function readZones(
  value: unknown[],
  context: ZoneParseContext,
  parentWidth: number,
  parentHeight: number
): ParseResult<TableZone[]> {
  const zones: TableZone[] = [];

  for (const item of value) {
    const zone = readZone(item, context, parentWidth, parentHeight);

    if (!zone.ok) {
      return zone;
    }

    zones.push(zone.value);
  }

  return { ok: true, value: zones };
}

function readZone(
  value: unknown,
  context: ZoneParseContext,
  parentWidth: number,
  parentHeight: number
): ParseResult<TableZone> {
  if (!isRecord(value)) {
    return { ok: false, error: "Table zone entries must be objects" };
  }

  for (const field of oldZoneFields) {
    if (field in value) {
      return { ok: false, error: `Table zone field "${field}" is no longer supported` };
    }
  }

  context.totalZones += 1;

  if (context.totalZones > 100) {
    return { ok: false, error: "Table setup can include at most 100 zones" };
  }

  const base = readZoneBase(value, context, parentWidth, parentHeight);

  if (!base.ok) {
    return base;
  }

  if (!zoneChildTypes.includes(value.childrenType as ZoneChildType)) {
    return { ok: false, error: "Table zone child type is invalid" };
  }

  if (value.childrenType === "zone") {
    if (!Array.isArray(value.children)) {
      return { ok: false, error: "Container zone children must be an array" };
    }

    const children = readZones(value.children, context, base.value.width, base.value.height);

    if (!children.ok) {
      return children;
    }

    return {
      ok: true,
      value: {
        ...base.value,
        childrenType: "zone",
        children: children.value
      }
    };
  }

  if ("children" in value) {
    return { ok: false, error: "Source zones cannot include child zones" };
  }

  const face = readRequiredEnum(value.face, zoneSourceFaces, "Table zone source face");
  const autofill = readRequiredBoolean(value.autofill, "Table zone autofill");
  const sourceChildType = value.childrenType as Exclude<ZoneChildType, "zone">;
  const source =
    value.source === undefined
      ? ({ ok: true, value: undefined } as ParseResult<TableSource | undefined>)
      : readTableSource(value.source, context.projectId, sourceChildType);

  if (!face.ok) {
    return face;
  }

  if (!autofill.ok) {
    return autofill;
  }

  if (!source.ok) {
    return source;
  }

  return {
    ok: true,
    value: {
      ...base.value,
      autofill: autofill.value,
      childrenType: sourceChildType,
      face: face.value,
      ...(source.value ? { source: source.value } : {})
    } as ZoneSource
  };
}

function readZoneBase(
  value: Record<string, unknown>,
  context: ZoneParseContext,
  parentWidth: number,
  parentHeight: number
): ParseResult<ZoneBase> {
  const id = readRequiredString(value.id, "Table zone id");
  const name = readRequiredString(value.name, "Table zone name");
  const description = readOptionalString(value.description);
  const x = readRequiredNumber(value.x, "Table zone X mm", { min: 0, max: parentWidth });
  const y = readRequiredNumber(value.y, "Table zone Y mm", { min: 0, max: parentHeight });
  const width = readRequiredNumber(value.width, "Table zone width mm", {
    min: 20,
    max: parentWidth
  });
  const height = readRequiredNumber(value.height, "Table zone height mm", {
    min: 20,
    max: parentHeight
  });
  const padding = readRequiredNumber(value.padding, "Table zone padding mm", { min: 0, max: 500 });
  const size = readRequiredEnum(value.size, zoneSizeModes, "Table zone size");
  const overflow = readRequiredEnum(value.overflow, zoneOverflowModes, "Table zone overflow");
  const capacity = readZoneCapacity(value.capacity);
  const layout = readRequiredEnum(value.layout, zoneLayouts, "Table zone layout");
  const gap = readOptionalNumber(value.gap, "Table zone gap mm", { min: 0, max: 500 });
  const columns = readOptionalInteger(value.columns, "Table zone columns", { min: 1, max: 25 });
  const visibility = readRequiredEnum(
    value.visibility,
    zoneVisibilityModes,
    "Table zone visibility"
  );
  const background = readRequiredZoneBackground(value.background);
  const border = readRequiredZoneBorder(value.border);

  if (!id.ok) {
    return id;
  }

  if (!name.ok) {
    return name;
  }

  if (!x.ok) {
    return x;
  }

  if (!y.ok) {
    return y;
  }

  if (!width.ok) {
    return width;
  }

  if (!height.ok) {
    return height;
  }

  if (!padding.ok) {
    return padding;
  }

  if (!size.ok) {
    return size;
  }

  if (!overflow.ok) {
    return overflow;
  }

  if (!capacity.ok) {
    return capacity;
  }

  if (!layout.ok) {
    return layout;
  }

  if (!gap.ok) {
    return gap;
  }

  if (!columns.ok) {
    return columns;
  }

  if (!visibility.ok) {
    return visibility;
  }

  if (!background.ok) {
    return background;
  }

  if (!border.ok) {
    return border;
  }

  if (context.ids.has(id.value)) {
    return { ok: false, error: "Table zone ids must be unique" };
  }

  const normalizedName = name.value.toLocaleLowerCase();

  if (context.names.has(normalizedName)) {
    return { ok: false, error: "Table zone names must be unique" };
  }

  if (x.value + width.value > parentWidth || y.value + height.value > parentHeight) {
    return { ok: false, error: "Table zone must stay within parent bounds" };
  }

  if (value.gap !== undefined && layout.value !== "row" && layout.value !== "grid") {
    return { ok: false, error: "Table zone gap is only valid for row and grid layouts" };
  }

  if (value.columns !== undefined && layout.value !== "grid") {
    return { ok: false, error: "Table zone columns are only valid for grid layouts" };
  }

  if (size.value === "auto" && overflow.value !== "visible") {
    return { ok: false, error: "Auto-sized zones must use visible overflow" };
  }

  context.ids.add(id.value);
  context.names.add(normalizedName);

  return {
    ok: true,
    value: {
      id: id.value,
      name: name.value,
      description: description ?? "",
      x: x.value,
      y: y.value,
      width: width.value,
      height: height.value,
      padding: padding.value,
      size: size.value,
      overflow: overflow.value,
      capacity: capacity.value,
      layout: layout.value,
      ...(gap.value !== undefined ? { gap: gap.value } : {}),
      ...(columns.value !== undefined ? { columns: columns.value } : {}),
      visibility: visibility.value,
      background: background.value,
      border: border.value
    }
  };
}

function readOptionalPlacements(
  value: unknown,
  projectId: string,
  tableWidth: number,
  tableHeight: number
): ParseResult<TablePlacement[] | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "Table placements must be an array" };
  }

  if (value.length > 500) {
    return { ok: false, error: "Table setup can include at most 500 placements" };
  }

  const ids = new Set<string>();
  const placements: TablePlacement[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return { ok: false, error: "Table placement entries must be objects" };
    }

    for (const field of oldPlacementFields) {
      if (field in item) {
        return { ok: false, error: `Table placement field "${field}" is no longer supported` };
      }
    }

    const id = readRequiredString(item.id, "Table placement id");
    const source = readTableSource(item.source, projectId);
    const x = readRequiredNumber(item.x, "Table placement X mm", { min: 0, max: tableWidth });
    const y = readRequiredNumber(item.y, "Table placement Y mm", { min: 0, max: tableHeight });
    const rotationDeg = readRequiredNumber(item.rotationDeg, "Table placement rotation", {
      min: -3600,
      max: 3600
    });
    const face = readRequiredEnum(item.face, tablePlacementFaces, "Table placement face");

    if (!id.ok) {
      return id;
    }

    if (!source.ok) {
      return source;
    }

    if (!x.ok) {
      return x;
    }

    if (!y.ok) {
      return y;
    }

    if (!rotationDeg.ok) {
      return rotationDeg;
    }

    if (!face.ok) {
      return face;
    }

    if (ids.has(id.value)) {
      return { ok: false, error: "Table placement ids must be unique" };
    }

    ids.add(id.value);
    placements.push({
      id: id.value,
      source: source.value,
      x: x.value,
      y: y.value,
      rotationDeg: normalizeDegrees(rotationDeg.value),
      face: face.value
    });
  }

  return { ok: true, value: placements };
}

function readTableSource(
  value: unknown,
  projectId: string,
  zoneChildType?: Exclude<ZoneChildType, "zone">
): ParseResult<TableSource> {
  if (!isRecord(value)) {
    return { ok: false, error: "Table source must be an object" };
  }

  if (value.kind === "component") {
    const componentId = readRequiredString(value.componentId, "Table source component id");

    if (!componentId.ok) {
      return componentId;
    }

    const component = getProjectComponents(projectId).find((entry) => entry.id === componentId.value);

    if (!component) {
      return { ok: false, error: "Table source must reference a component in the same project" };
    }

    if (zoneChildType && component.type !== zoneChildType) {
      return { ok: false, error: "Table source component type does not match zone child type" };
    }

    if (zoneChildType && component.type === "die") {
      return { ok: false, error: "Dice cannot be used as zone sources" };
    }

    return { ok: true, value: { kind: "component", componentId: component.id } };
  }

  if (value.kind === "collection") {
    const collectionId = readRequiredString(value.collectionId, "Table source collection id");

    if (!collectionId.ok) {
      return collectionId;
    }

    const collection = getProjectCollections(projectId).find(
      (entry) => entry.id === collectionId.value
    );

    if (!collection) {
      return { ok: false, error: "Table source must reference a collection in the same project" };
    }

    if (zoneChildType) {
      const compatibility = getCollectionZoneCompatibility(collection, projectId, zoneChildType);

      if (!compatibility.ok) {
        return compatibility;
      }
    }

    return { ok: true, value: { kind: "collection", collectionId: collection.id } };
  }

  return { ok: false, error: "Table source kind is invalid" };
}

function getCollectionZoneCompatibility(
  collection: ComponentCollection,
  projectId: string,
  zoneChildType: Exclude<ZoneChildType, "zone">
): ParseResult<undefined> {
  const components = getProjectComponents(projectId);

  for (const item of collection.items) {
    const component = components.find((entry) => entry.id === item.componentId);

    if (!component) {
      return { ok: false, error: "Table source collection contains a missing component" };
    }

    if (component.type === "die") {
      return { ok: false, error: "Dice cannot be used as zone sources" };
    }

    if (component.type !== zoneChildType) {
      return { ok: false, error: "Table source collection type does not match zone child type" };
    }
  }

  return { ok: true, value: undefined };
}

export function getTableSourceQuantity(
  source: TableSource | undefined,
  projectId: string
): number {
  if (!source) {
    return 0;
  }

  if (source.kind === "component") {
    return getProjectComponents(projectId).some((component) => component.id === source.componentId)
      ? 1
      : 0;
  }

  const collection = getProjectCollections(projectId).find((item) => item.id === source.collectionId);

  return collection?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
}

function readZoneCapacity(value: unknown): ParseResult<number | null> {
  if (value === null) {
    return { ok: true, value: null };
  }

  return readRequiredInteger(value, "Table zone capacity", { min: 1, max: 25 });
}

function readRequiredZoneBackground(value: unknown): ParseResult<ZoneBackground> {
  if (!isRecord(value)) {
    return { ok: false, error: "Table zone background must be an object" };
  }

  if (value.type === "none") {
    return { ok: true, value: { type: "none" } };
  }

  if (value.type === "color") {
    const color = readRequiredHexColor(value.color, "Table zone background color");

    return color.ok ? { ok: true, value: { type: "color", color: color.value } } : color;
  }

  if (value.type === "image") {
    const dataUrl = readRequiredImageDataUrl(value.dataUrl);
    const fileName = readRequiredString(value.fileName, "Table zone background image file name");
    const fit = readRequiredEnum(
      value.fit,
      zoneBackgroundImageFits,
      "Table zone background image fit"
    );

    if (!dataUrl.ok) {
      return dataUrl;
    }

    if (!fileName.ok) {
      return fileName;
    }

    if (!fit.ok) {
      return fit;
    }

    return {
      ok: true,
      value: {
        type: "image",
        dataUrl: dataUrl.value,
        fileName: fileName.value,
        fit: fit.value
      }
    };
  }

  return { ok: false, error: "Table zone background type is invalid" };
}

function readRequiredZoneBorder(value: unknown): ParseResult<ZoneBorder> {
  if (!isRecord(value)) {
    return { ok: false, error: "Table zone border must be an object" };
  }

  const width = readRequiredNumber(value.width, "Table zone border width", { min: 0, max: 20 });
  const color = readRequiredHexColor(value.color, "Table zone border color");

  if (!width.ok) {
    return width;
  }

  if (!color.ok) {
    return color;
  }

  return { ok: true, value: { width: width.value, color: color.value } };
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function readRequiredString(value: unknown, label: string): ParseResult<string> {
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string` };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: false, error: `${label} must not be empty` };
  }

  return { ok: true, value: trimmed };
}

function readOptionalNumber(
  value: unknown,
  label: string,
  range: { max?: number; min?: number } = {}
): ParseResult<number | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  const number = readRequiredNumber(value, label, range);

  return number.ok ? { ok: true, value: number.value } : number;
}

function readOptionalInteger(
  value: unknown,
  label: string,
  range: { max?: number; min?: number } = {}
): ParseResult<number | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  const number = readRequiredInteger(value, label, range);

  return number.ok ? { ok: true, value: number.value } : number;
}

function readRequiredNumber(
  value: unknown,
  label: string,
  range: { max?: number; min?: number } = {}
): ParseResult<number> {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, error: `${label} must be a number` };
  }

  if (range.min !== undefined && value < range.min) {
    return { ok: false, error: `${label} must be at least ${range.min}` };
  }

  if (range.max !== undefined && value > range.max) {
    return { ok: false, error: `${label} must be at most ${range.max}` };
  }

  return { ok: true, value };
}

function readRequiredInteger(
  value: unknown,
  label: string,
  range: { max?: number; min?: number } = {}
): ParseResult<number> {
  const number = readRequiredNumber(value, label, range);

  if (!number.ok) {
    return number;
  }

  if (!Number.isInteger(number.value)) {
    return { ok: false, error: `${label} must be an integer` };
  }

  return number;
}

function readRequiredBoolean(value: unknown, label: string): ParseResult<boolean> {
  if (typeof value !== "boolean") {
    return { ok: false, error: `${label} must be a boolean` };
  }

  return { ok: true, value };
}

function readRequiredEnum<const T extends readonly string[]>(
  value: unknown,
  values: T,
  label: string
): ParseResult<T[number]> {
  if (!values.includes(value as T[number])) {
    return { ok: false, error: `${label} is invalid` };
  }

  return { ok: true, value: value as T[number] };
}

function readRequiredHexColor(value: unknown, label: string): ParseResult<string> {
  const color = readRequiredString(value, label);

  if (!color.ok) {
    return color;
  }

  if (!/^#[\da-f]{6}$/i.test(color.value)) {
    return { ok: false, error: `${label} must be a hex color` };
  }

  return color;
}

function readRequiredImageDataUrl(value: unknown): ParseResult<string> {
  const dataUrl = readRequiredString(value, "Table zone background image data URL");

  if (!dataUrl.ok) {
    return dataUrl;
  }

  const match = /^data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);base64,([a-z\d+/=]+)$/i.exec(
    dataUrl.value
  );

  if (!match) {
    return { ok: false, error: "Table zone background image must be a base64 image data URL" };
  }

  if (Buffer.byteLength(match[1], "base64") > imageMaxBytes) {
    return { ok: false, error: "Table zone background image must be 5 MB or smaller" };
  }

  return dataUrl;
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flattenZones(zones: TableZone[]): TableZone[] {
  return zones.flatMap((zone): TableZone[] =>
    zone.childrenType === "zone" ? [zone, ...flattenZones(zone.children)] : [zone]
  );
}

function sourceUsesComponent(source: TableSource | undefined, componentId: string) {
  return source?.kind === "component" && source.componentId === componentId;
}

function sourceUsesCollection(source: TableSource | undefined, collectionId: string) {
  return source?.kind === "collection" && source.collectionId === collectionId;
}
