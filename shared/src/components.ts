import {
  resolveProjectColorValue,
  type ProjectColorValue,
  type ProjectParameter
} from "./projects.js";
import { normalizeIntegerDegrees, titleCase } from "./formatting.js";

export const componentTypes = ["card", "tile", "piece", "die"] as const;

export type ComponentType = (typeof componentTypes)[number];

export const cardSizePresets = ["poker", "mini", "tarot", "square", "custom"] as const;

export type CardSizePreset = (typeof cardSizePresets)[number];

export const cardLayoutSides = ["front", "back"] as const;

export type CardLayoutSide = (typeof cardLayoutSides)[number];

export const cardTextAlignments = ["left", "center", "right"] as const;

export type CardTextAlignment = (typeof cardTextAlignments)[number];

export const cardImageFits = ["contain", "cover"] as const;

export type CardImageFit = (typeof cardImageFits)[number];

export const cardVisualHorizontalAlignments = ["left", "center", "right"] as const;

export type CardVisualHorizontalAlignment = (typeof cardVisualHorizontalAlignments)[number];

export const cardVisualVerticalAlignments = ["top", "center", "bottom"] as const;

export type CardVisualVerticalAlignment = (typeof cardVisualVerticalAlignments)[number];

export const cardIconIds = [
  "sword",
  "shield",
  "heart",
  "star",
  "zap",
  "coins",
  "skull",
  "sparkles"
] as const;

export type CardIconId = (typeof cardIconIds)[number];

export type CardLayoutSize = {
  preset: CardSizePreset;
  widthMm: number;
  heightMm: number;
};

export type CardLayoutPadding = {
  topMm: number;
  rightMm: number;
  bottomMm: number;
  leftMm: number;
};

export type LayoutContentSource =
  | {
      mode: "static";
    }
  | {
      fieldKey: string;
      mode: "field";
    };

export type TextZoneContent = {
  type: "text";
  source?: LayoutContentSource;
  text: string;
  fontSize: number;
  bold: boolean;
  align: CardTextAlignment;
  color: ProjectColorValue;
};

export type VisualZoneContent = {
  type: "visual";
  source?: LayoutContentSource;
  visualType: "image" | "icon";
  dataUrl: string;
  fileName: string;
  fit: CardImageFit;
  iconId: CardIconId;
  size: number;
  color: ProjectColorValue;
  horizontalAlign: CardVisualHorizontalAlignment;
  verticalAlign: CardVisualVerticalAlignment;
};

export type LayoutZoneContent = TextZoneContent | VisualZoneContent;

export type LayoutZone = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: LayoutZoneContent;
};

export type CardSideLayout = {
  paddingMm: CardLayoutPadding;
  zones: LayoutZone[];
};

export type CardLayout = {
  version: 1;
  size: CardLayoutSize;
  sides: Record<CardLayoutSide, CardSideLayout>;
};

export const cardTemplateFieldTypes = ["text", "image", "icon", "number"] as const;

export type CardTemplateFieldType = (typeof cardTemplateFieldTypes)[number];

export type TemplateImageFieldValue = {
  dataUrl: string;
  fileName: string;
  fit?: CardImageFit;
};

export type TemplateFieldValue = string | number | CardIconId | TemplateImageFieldValue;

export type TemplateFieldValues = Record<string, TemplateFieldValue>;

export type CardTemplateField = {
  key: string;
  label: string;
  type: CardTemplateFieldType;
};

export type CardTemplate = {
  id: string;
  projectId: string;
  name: string;
  layout: CardLayout;
  fields: CardTemplateField[];
  createdAt: string;
  updatedAt: string;
};

export type CreateCardTemplateInput = {
  name: string;
  layout: CardLayout;
};

export type UpdateCardTemplateInput = Partial<CreateCardTemplateInput>;

export const cardSizePresetDimensions: Record<
  Exclude<CardSizePreset, "custom">,
  { widthMm: number; heightMm: number }
> = {
  poker: { widthMm: 63, heightMm: 88 },
  mini: { widthMm: 44, heightMm: 68 },
  tarot: { widthMm: 70, heightMm: 121 },
  square: { widthMm: 70, heightMm: 70 }
};

export const defaultCardSize: CardLayoutSize = {
  preset: "poker",
  ...cardSizePresetDimensions.poker
};

export const defaultCardPaddingMm: CardLayoutPadding = {
  topMm: 4,
  rightMm: 4,
  bottomMm: 4,
  leftMm: 4
};

export const noCardPaddingMm: CardLayoutPadding = {
  topMm: 0,
  rightMm: 0,
  bottomMm: 0,
  leftMm: 0
};

export const tileLayoutSides = ["front", "back"] as const;

export type TileLayoutSide = (typeof tileLayoutSides)[number];

export const tileShapes = ["box", "triangle", "hex", "custom"] as const;

export type TileShape = (typeof tileShapes)[number];

export type TileLayoutSize = {
  widthMm: number;
  heightMm: number;
};

export type TileAppearance = {
  fillColor: ProjectColorValue;
  strokeColor: ProjectColorValue;
};

export type TileShapePoint = {
  x: number;
  y: number;
};

export type TileCustomShape = {
  points: TileShapePoint[];
};

export type TileSideLayout = {
  paddingMm: CardLayoutPadding;
  zones: LayoutZone[];
};

export type TileLayout = {
  version: 1;
  shape: TileShape;
  sizeMm: TileLayoutSize;
  appearance: TileAppearance;
  rotationDeg: number;
  customShape?: TileCustomShape;
  sides: Record<TileLayoutSide, TileSideLayout>;
};

export type TileTemplate = {
  id: string;
  projectId: string;
  name: string;
  layout: TileLayout;
  fields: CardTemplateField[];
  createdAt: string;
  updatedAt: string;
};

export type CreateTileTemplateInput = {
  name: string;
  layout: TileLayout;
};

export type UpdateTileTemplateInput = Partial<CreateTileTemplateInput>;

export const pieceFormFactors = ["flat", "standee", "solid"] as const;

export type PieceFormFactor = (typeof pieceFormFactors)[number];

export const pieceShapes = ["circle", "box", "hex", "meeple", "pawn", "custom"] as const;

export type PieceShape = (typeof pieceShapes)[number];

export type PieceLayoutSize = {
  widthMm: number;
  heightMm: number;
  depthMm: number;
};

export type PieceAppearance = {
  fillColor: ProjectColorValue;
  strokeColor: ProjectColorValue;
};

export type PieceAppearanceInput = Partial<PieceAppearance>;

export type PieceShapePoint = {
  x: number;
  y: number;
};

export type PieceCustomShape = {
  points: PieceShapePoint[];
};

export const defaultPieceAppearance: PieceAppearance = {
  fillColor: "#f8fafc",
  strokeColor: "#0f766e"
};

export const defaultTileAppearance: TileAppearance = {
  fillColor: "#f8fafc",
  strokeColor: "#0f766e"
};

export const defaultPieceCustomShape: PieceCustomShape = {
  points: [
    { x: 50, y: 6 },
    { x: 90, y: 35 },
    { x: 74, y: 92 },
    { x: 26, y: 92 },
    { x: 10, y: 35 }
  ]
};

export const defaultTileCustomShape: TileCustomShape = {
  points: [
    { x: 50, y: 6 },
    { x: 90, y: 35 },
    { x: 74, y: 92 },
    { x: 26, y: 92 },
    { x: 10, y: 35 }
  ]
};

export type PieceLayoutFace = {
  id: string;
  name: string;
  zones: LayoutZone[];
};

export type PieceLayout = {
  version: 1;
  formFactor: PieceFormFactor;
  shape: PieceShape;
  sizeMm: PieceLayoutSize;
  appearance: PieceAppearance;
  customShape?: PieceCustomShape;
  faces: PieceLayoutFace[];
};

export type PieceTemplate = {
  id: string;
  projectId: string;
  name: string;
  layout: PieceLayout;
  fields: CardTemplateField[];
  createdAt: string;
  updatedAt: string;
};

export type CreatePieceTemplateInput = {
  name: string;
  layout: PieceLayout;
};

export type UpdatePieceTemplateInput = Partial<CreatePieceTemplateInput>;

export type ComponentCollectionItem = {
  componentId: string;
  quantity: number;
};

export const collectionTypes = ["deck", "bag", "custom"] as const;

export type ComponentCollectionType = (typeof collectionTypes)[number];

export type ComponentCollection = {
  id: string;
  projectId: string;
  type: ComponentCollectionType;
  name: string;
  description: string;
  tags: string[];
  notes: string;
  items: ComponentCollectionItem[];
  createdAt: string;
  updatedAt: string;
};

export type CreateComponentCollectionInput = {
  type: ComponentCollectionType;
  name: string;
  description?: string;
  tags?: string[];
  notes?: string;
  items?: ComponentCollectionItem[];
};

export type UpdateComponentCollectionInput = Partial<CreateComponentCollectionInput>;

export type GameComponentBase = {
  id: string;
  projectId: string;
  type: ComponentType;
  name: string;
  description: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CardComponent = GameComponentBase & {
  type: "card";
  frontText: string;
  backText: string;
  templateId: string;
  fieldValues: TemplateFieldValues;
  layout: CardLayout;
};

export type TileComponent = GameComponentBase & {
  type: "tile";
  labelText: string;
  templateId: string;
  fieldValues: TemplateFieldValues;
  layout: TileLayout;
};

export type DieComponent = GameComponentBase & {
  type: "die";
  sides: number;
  faceLabels: string[];
};

export type PieceComponent = GameComponentBase & {
  type: "piece";
  labelText: string;
  templateId: string;
  appearance: PieceAppearance;
  fieldValues: TemplateFieldValues;
  layout: PieceLayout;
};

export type GameComponent = CardComponent | TileComponent | PieceComponent | DieComponent;

export type CreateGameComponentInput = {
  type: ComponentType;
  name: string;
  description?: string;
  tags?: string[];
  notes?: string;
  frontText?: string;
  backText?: string;
  labelText?: string;
  templateId?: string;
  appearance?: PieceAppearanceInput;
  fieldValues?: TemplateFieldValues;
  layout?: CardLayout | PieceLayout | TileLayout;
  sides?: number;
  faceLabels?: string[];
};

export type UpdateGameComponentInput = Partial<Omit<CreateGameComponentInput, "type">>;

export function collectionTypeAllowsComponent(
  collectionType: ComponentCollectionType | undefined,
  componentType: ComponentType
) {
  if (!collectionType || collectionType === "custom") {
    return true;
  }

  if (collectionType === "deck") {
    return componentType === "card";
  }

  return componentType === "tile" || componentType === "piece" || componentType === "die";
}

export function formatCardLayoutSize(layout: CardLayout) {
  return `${layout.size.widthMm} x ${layout.size.heightMm} mm`;
}

export function formatPieceLayoutSize(layout: PieceLayout) {
  const { depthMm, heightMm, widthMm } = layout.sizeMm;
  return `${widthMm} x ${heightMm} x ${depthMm} mm`;
}

export function formatTileLayoutSize(layout: TileLayout) {
  const { heightMm, widthMm } = layout.sizeMm;
  return `${widthMm} x ${heightMm} mm`;
}

export function cloneCardLayout(layout: CardLayout): CardLayout {
  return JSON.parse(JSON.stringify(layout)) as CardLayout;
}

export function cloneTileLayout(layout: TileLayout): TileLayout {
  return JSON.parse(JSON.stringify(layout)) as TileLayout;
}

export function clonePieceLayout(layout: PieceLayout): PieceLayout {
  return JSON.parse(JSON.stringify(layout)) as PieceLayout;
}

export function createDefaultCardLayout(
  input: {
    backText?: string;
    frontText?: string;
    size?: CardLayoutSize;
  } = {}
): CardLayout {
  return {
    version: 1,
    size: input.size ?? defaultCardSize,
    sides: {
      front: createDefaultCardSide("front", input.frontText),
      back: createDefaultCardSide("back", input.backText)
    }
  };
}

export function createDefaultTileLayout(
  input: {
    appearance?: Partial<TileAppearance>;
    customShape?: TileCustomShape;
    faceText?: string;
    rotationDeg?: number;
    shape?: TileShape;
    size?: Partial<TileLayoutSize>;
  } = {}
): TileLayout {
  const shape = input.shape ?? "box";

  return {
    version: 1,
    shape,
    sizeMm: {
      widthMm: input.size?.widthMm ?? 50,
      heightMm: input.size?.heightMm ?? 50
    },
    appearance: {
      ...defaultTileAppearance,
      ...input.appearance
    },
    rotationDeg: normalizeIntegerDegrees(input.rotationDeg ?? 0),
    customShape:
      shape === "custom"
        ? cloneTileCustomShape(input.customShape ?? defaultTileCustomShape)
        : undefined,
    sides: {
      front: {
        paddingMm: { ...noCardPaddingMm },
        zones: [
          {
            ...createTextZone("front-label", "Label", 0, 0, 100, 100),
            content: createTextContent(input.faceText ?? "")
          }
        ]
      },
      back: {
        paddingMm: { ...noCardPaddingMm },
        zones: [
          {
            ...createVisualZone("back-art", "Art", 0, 0, 100, 100),
            content: createImageContent()
          }
        ]
      }
    }
  };
}

export function createDefaultPieceLayout(
  input: {
    appearance?: Partial<PieceAppearance>;
    customShape?: PieceCustomShape;
    faceText?: string;
    formFactor?: PieceFormFactor;
    shape?: PieceShape;
    twoSided?: boolean;
  } = {}
): PieceLayout {
  const formFactor = input.formFactor ?? "flat";
  const shape = input.shape ?? "circle";
  const twoSided = input.twoSided ?? formFactor !== "solid";
  const frontFace: PieceLayoutFace = {
    id: "front",
    name: "Front",
    zones: input.faceText
      ? [
          {
            ...createTextZone("front-label", "Label", 0, 0, 100, 100),
            content: createTextContent(input.faceText)
          }
        ]
      : []
  };

  const faces = twoSided
    ? [
        frontFace,
        {
          id: "back",
          name: "Back",
          zones: []
        }
      ]
    : [frontFace];

  return {
    version: 1,
    formFactor,
    shape,
    sizeMm: {
      widthMm: 20,
      heightMm: 20,
      depthMm: formFactor === "solid" ? 10 : 2
    },
    appearance: {
      ...defaultPieceAppearance,
      ...input.appearance
    },
    customShape:
      shape === "custom"
        ? clonePieceCustomShape(input.customShape ?? defaultPieceCustomShape)
        : undefined,
    faces
  };
}

export function clonePieceCustomShape(customShape: PieceCustomShape): PieceCustomShape {
  return {
    points: customShape.points.map((point) => ({ ...point }))
  };
}

export function cloneTileCustomShape(customShape: TileCustomShape): TileCustomShape {
  return {
    points: customShape.points.map((point) => ({ ...point }))
  };
}

export function getFirstCardSideText(side: CardSideLayout) {
  const textZone = side.zones.find(
    (zone) => zone.content.type === "text" && zone.content.text.trim().length > 0
  );

  return textZone?.content.type === "text" ? textZone.content.text.trim() : "";
}

function createDefaultCardSide(side: CardLayoutSide, text = ""): CardSideLayout {
  const trimmedText = text.trim();

  if (side === "back" && trimmedText.length === 0) {
    return {
      paddingMm: { ...noCardPaddingMm },
      zones: [
        {
          ...createVisualZone(`${side}-art`, "Art", 0, 0, 100, 100),
          content: createImageContent()
        }
      ]
    };
  }

  return {
    paddingMm: { ...defaultCardPaddingMm },
    zones: [
      {
        ...createTextZone(`${side}-title`, "Title", 0, 0, 100, 12),
        content: createTextContent("")
      },
      {
        ...createVisualZone(`${side}-art`, "Art", 0, 16, 100, 40),
        content: createImageContent()
      },
      {
        ...createTextZone(`${side}-body`, "Body", 0, 60, 100, 30),
        content: createTextContent(trimmedText)
      },
      {
        ...createTextZone(`${side}-footer`, "Footer", 0, 94, 100, 6),
        content: createTextContent("")
      }
    ]
  };
}

export function getCardTemplateFields(layout: CardLayout): CardTemplateField[] {
  return getTemplateFields(layout.sides.front.zones, layout.sides.back.zones);
}

export function getTileTemplateFields(layout: TileLayout): CardTemplateField[] {
  return getTemplateFields(layout.sides.front.zones, layout.sides.back.zones);
}

export function getPieceTemplateFields(layout: PieceLayout): CardTemplateField[] {
  return getTemplateFields(...layout.faces.map((face) => face.zones));
}

function getTemplateFields(...zoneGroups: LayoutZone[][]): CardTemplateField[] {
  const fields = new Map<string, CardTemplateField>();

  for (const zones of zoneGroups) {
    for (const zone of zones) {
      if (zone.content.source?.mode !== "field") {
        continue;
      }

      const key = zone.content.source.fieldKey.trim();

      if (!key || fields.has(key)) {
        continue;
      }

      fields.set(key, {
        key,
        label: titleCase(key),
        type: getFieldTypeForContent(zone.content)
      });
    }
  }

  return Array.from(fields.values());
}

export function getDefaultCardFieldValues(layout: CardLayout): TemplateFieldValues {
  return getDefaultFieldValues(layout.sides.front.zones, layout.sides.back.zones);
}

export function getDefaultTileFieldValues(layout: TileLayout): TemplateFieldValues {
  return getDefaultFieldValues(layout.sides.front.zones, layout.sides.back.zones);
}

export function getDefaultPieceFieldValues(layout: PieceLayout): TemplateFieldValues {
  return getDefaultFieldValues(...layout.faces.map((face) => face.zones));
}

function getDefaultFieldValues(...zoneGroups: LayoutZone[][]): TemplateFieldValues {
  const values: TemplateFieldValues = {};

  for (const zones of zoneGroups) {
    for (const zone of zones) {
      if (zone.content.source?.mode !== "field") {
        continue;
      }

      const key = zone.content.source.fieldKey.trim();

      if (!key || values[key] !== undefined) {
        continue;
      }

      switch (zone.content.type) {
        case "text":
          values[key] = zone.content.text;
          break;

        case "visual":
          if (zone.content.visualType === "icon") {
            values[key] = zone.content.iconId;
            break;
          }

          values[key] = {
            dataUrl: zone.content.dataUrl,
            fileName: zone.content.fileName,
            fit: zone.content.fit
          };
          break;
      }
    }
  }

  return values;
}

export function resolveCardLayout(
  layout: CardLayout,
  fieldValues: TemplateFieldValues = {},
  projectParameters: ProjectParameter[] = []
): CardLayout {
  return {
    ...layout,
    size: { ...layout.size },
    sides: {
      front: resolveCardSideLayout(layout.sides.front, fieldValues, projectParameters),
      back: resolveCardSideLayout(layout.sides.back, fieldValues, projectParameters)
    }
  };
}

export function resolveTileLayout(
  layout: TileLayout,
  fieldValues: TemplateFieldValues = {},
  projectParameters: ProjectParameter[] = []
): TileLayout {
  return {
    ...layout,
    sizeMm: { ...layout.sizeMm },
    appearance: {
      fillColor: resolveProjectColorValue(
        layout.appearance.fillColor,
        projectParameters,
        "#f8fafc"
      ),
      strokeColor: resolveProjectColorValue(
        layout.appearance.strokeColor,
        projectParameters,
        "#0f766e"
      )
    },
    rotationDeg: normalizeIntegerDegrees(layout.rotationDeg ?? 0),
    customShape: layout.customShape
      ? { points: layout.customShape.points.map((point) => ({ ...point })) }
      : undefined,
    sides: {
      front: resolveCardSideLayout(layout.sides.front, fieldValues, projectParameters),
      back: resolveCardSideLayout(layout.sides.back, fieldValues, projectParameters)
    }
  };
}

export function resolvePieceLayout(
  layout: PieceLayout,
  fieldValues: TemplateFieldValues = {},
  appearance?: PieceAppearanceInput,
  projectParameters: ProjectParameter[] = []
): PieceLayout {
  const resolvedAppearance = { ...layout.appearance, ...appearance };

  return {
    ...layout,
    sizeMm: { ...layout.sizeMm },
    appearance: {
      fillColor: resolveProjectColorValue(
        resolvedAppearance.fillColor,
        projectParameters,
        "#f8fafc"
      ),
      strokeColor: resolveProjectColorValue(
        resolvedAppearance.strokeColor,
        projectParameters,
        "#0f766e"
      )
    },
    customShape: layout.customShape
      ? { points: layout.customShape.points.map((point) => ({ ...point })) }
      : undefined,
    faces: layout.faces.map((face) => ({
      ...face,
      zones: face.zones.map((zone) => ({
        ...zone,
        content: resolveCardZoneContent(zone.content, fieldValues, projectParameters)
      }))
    }))
  };
}

export function getFirstTileSideText(layout: TileLayout) {
  const frontText = getFirstCardSideText(layout.sides.front);

  if (frontText) {
    return frontText;
  }

  return getFirstCardSideText(layout.sides.back);
}

export function getFirstPieceFaceText(layout: PieceLayout) {
  for (const face of layout.faces) {
    const text = getFirstCardSideText({ paddingMm: { ...noCardPaddingMm }, zones: face.zones });

    if (text) {
      return text;
    }
  }

  return "";
}

function resolveCardSideLayout(
  side: CardSideLayout,
  fieldValues: TemplateFieldValues,
  projectParameters: ProjectParameter[]
): CardSideLayout {
  return {
    paddingMm: { ...side.paddingMm },
    zones: side.zones.map((zone) => ({
      ...zone,
      content: resolveCardZoneContent(zone.content, fieldValues, projectParameters)
    }))
  };
}

function resolveCardZoneContent(
  content: LayoutZoneContent,
  fieldValues: TemplateFieldValues,
  projectParameters: ProjectParameter[]
): LayoutZoneContent {
  if (content.source?.mode !== "field") {
    return resolveLayoutZoneColor(
      { ...content, source: content.source ? { ...content.source } : { mode: "static" } },
      projectParameters
    );
  }

  const value = fieldValues[content.source.fieldKey];

  if (content.type === "text") {
    return resolveLayoutZoneColor(
      {
        ...content,
        source: { ...content.source },
        text: typeof value === "number" || typeof value === "string" ? String(value) : content.text
      },
      projectParameters
    );
  }

  if (content.visualType === "image") {
    return resolveLayoutZoneColor(
      isCardImageFieldValue(value)
        ? {
            ...content,
            source: { ...content.source },
            dataUrl: value.dataUrl,
            fileName: value.fileName,
            fit: value.fit ?? content.fit
          }
        : { ...content, source: { ...content.source } },
      projectParameters
    );
  }

  return resolveLayoutZoneColor(
    typeof value === "string" && cardIconIds.includes(value as CardIconId)
      ? { ...content, source: { ...content.source }, iconId: value as CardIconId }
      : { ...content, source: { ...content.source } },
    projectParameters
  );
}

function resolveLayoutZoneColor(
  content: LayoutZoneContent,
  projectParameters: ProjectParameter[]
): LayoutZoneContent {
  if (content.type === "text") {
    return {
      ...content,
      color: resolveProjectColorValue(content.color, projectParameters, "#1f2937")
    };
  }

  return {
    ...content,
    color: resolveProjectColorValue(content.color, projectParameters, "#0f766e")
  };
}

function getFieldTypeForContent(content: LayoutZoneContent): CardTemplateFieldType {
  switch (content.type) {
    case "text":
      return "text";

    case "visual":
      return content.visualType === "icon" ? "icon" : "image";
  }
}

function createTextZone(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number
): Omit<LayoutZone, "content"> {
  return { id, name, x, y, width, height };
}

function createVisualZone(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number
): Omit<LayoutZone, "content"> {
  return { id, name, x, y, width, height };
}

function createTextContent(text: string): TextZoneContent {
  return {
    type: "text",
    source: { mode: "static" },
    text,
    fontSize: 14,
    bold: false,
    align: "center",
    color: "#1f2937"
  };
}

function createImageContent(): VisualZoneContent {
  return {
    type: "visual",
    source: { mode: "static" },
    visualType: "image",
    dataUrl: "",
    fileName: "",
    fit: "contain",
    iconId: "sword",
    size: 28,
    color: "#0f766e",
    horizontalAlign: "center",
    verticalAlign: "center"
  };
}

export function isCardImageFieldValue(value: unknown): value is TemplateImageFieldValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "dataUrl" in value &&
    "fileName" in value &&
    typeof (value as TemplateImageFieldValue).dataUrl === "string" &&
    typeof (value as TemplateImageFieldValue).fileName === "string"
  );
}
