import type {
  ProjectObjectAppearance,
  ProjectObjectBorderStyle,
  ProjectObjectCard,
  ProjectObjectCardSide,
  ProjectObjectCardSizePresetValue,
  ProjectObjectDie,
  ProjectObjectDieFace,
  ProjectObjectDieFaceMode,
  ProjectObjectImage,
  ProjectObjectImageFit,
  ProjectObjectLayout,
  ProjectObjectLayoutAlignment,
  ProjectObjectLayoutJustification,
  ProjectObjectLayoutMode,
  ProjectObjectRectTransform,
  ProjectObjectShape,
  ProjectObjectShapePoint,
  ProjectObjectShapeVariant,
  ProjectObjectText,
  ProjectObjectTextAlign,
  ProjectObjectTextFontStyle,
  ProjectObjectTextVerticalAlign
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectShapePolygonPoints,
  getDefaultProjectObjectDieFace,
  normalizeProjectObjectDieActiveFace,
  normalizeProjectObjectDieFaceCount,
  projectObjectCardCustomSizePresetId,
  projectObjectCardSides,
  projectObjectCardSizePresets,
  projectObjectDieFaceCountLimits,
  projectObjectDieFaceLabelMaxLength,
  projectObjectDieFaceModes,
  projectObjectShapePolygonCoordinateLimits,
  projectObjectShapePolygonPointCountLimits
} from "@bg-maker/shared";

export type RectTransformFieldKey = keyof ProjectObjectRectTransform;

export type RectTransformDraft = Record<RectTransformFieldKey, string>;

export type AppearanceFieldKey = keyof ProjectObjectAppearance;
export type AppearanceDraft = {
  backgroundColor: string;
  backgroundOpacity: string;
  borderColor: string;
  borderRadius: string;
  borderStyle: ProjectObjectBorderStyle;
  borderWidth: string;
  opacity: string;
  padding: string;
};

export type CardFieldKey = keyof ProjectObjectCard;
export type CardDraft = {
  activeSide: ProjectObjectCardSide;
  sizePreset: ProjectObjectCardSizePresetValue;
};

export type DieFieldKey = "activeFace" | "faceCount";
export type DieFaceFieldKey = keyof ProjectObjectDieFace;
export type DieDraft = {
  activeFace: string;
  faceCount: string;
};

export type TextFieldKey = keyof ProjectObjectText;
export type TextDraft = {
  color: string;
  content: string;
  fontSize: string;
  fontStyle: ProjectObjectTextFontStyle;
  fontWeight: string;
  lineHeight: string;
  textAlign: ProjectObjectTextAlign;
  verticalAlign: ProjectObjectTextVerticalAlign;
};

export type ImageFieldKey = keyof ProjectObjectImage;
export type ImageDraft = {
  assetId: string;
  fit: ProjectObjectImageFit;
  positionX: string;
  positionY: string;
};

export type ShapePolygonPointFieldKey = keyof ProjectObjectShapePoint;
export type ShapePolygonPointDraft = Record<ShapePolygonPointFieldKey, string>;

export type LayoutFieldKey = keyof ProjectObjectLayout;
export type LayoutDraft = {
  alignItems: ProjectObjectLayoutAlignment;
  columns: string;
  gap: string;
  justifyContent: ProjectObjectLayoutJustification;
  mode: ProjectObjectLayoutMode;
};

export const rectTransformFieldSettings: Record<
  RectTransformFieldKey,
  { decimals: number; max: number; min: number; step: number }
> = {
  height: { decimals: 0, max: 10000, min: 1, step: 1 },
  pivotX: { decimals: 3, max: 1, min: 0, step: 0.05 },
  pivotY: { decimals: 3, max: 1, min: 0, step: 0.05 },
  rotation: { decimals: 0, max: 3600, min: -3600, step: 1 },
  scaleX: { decimals: 3, max: 8, min: 0.1, step: 0.1 },
  scaleY: { decimals: 3, max: 8, min: 0.1, step: 0.1 },
  width: { decimals: 0, max: 10000, min: 1, step: 1 },
  x: { decimals: 0, max: 10000, min: -10000, step: 1 },
  y: { decimals: 0, max: 10000, min: -10000, step: 1 }
};

export const appearanceNumberFieldSettings = {
  backgroundOpacity: { decimals: 2, max: 1, min: 0, step: 0.05 },
  borderRadius: { decimals: 0, max: 1000, min: 0, step: 1 },
  borderWidth: { decimals: 0, max: 1000, min: 0, step: 1 },
  opacity: { decimals: 2, max: 1, min: 0, step: 0.05 },
  padding: { decimals: 0, max: 1000, min: 0, step: 1 }
} as const satisfies Record<
  Extract<
    AppearanceFieldKey,
    "backgroundOpacity" | "borderRadius" | "borderWidth" | "opacity" | "padding"
  >,
  { decimals: number; max: number; min: number; step: number }
>;

export const textNumberFieldSettings = {
  fontSize: { decimals: 0, max: 512, min: 1, step: 1 },
  fontWeight: { decimals: 0, max: 900, min: 100, step: 100 },
  lineHeight: { decimals: 2, max: 4, min: 0.5, step: 0.05 }
} as const satisfies Record<
  Extract<TextFieldKey, "fontSize" | "fontWeight" | "lineHeight">,
  { decimals: number; max: number; min: number; step: number }
>;

export const dieNumberFieldSettings = {
  faceCount: {
    decimals: 0,
    max: projectObjectDieFaceCountLimits.max,
    min: projectObjectDieFaceCountLimits.min,
    step: 1
  }
} as const satisfies Record<
  Extract<DieFieldKey, "faceCount">,
  { decimals: number; max: number; min: number; step: number }
>;

export const imageNumberFieldSettings = {
  positionX: { decimals: 0, max: 100, min: 0, step: 1 },
  positionY: { decimals: 0, max: 100, min: 0, step: 1 }
} as const satisfies Record<
  Extract<ImageFieldKey, "positionX" | "positionY">,
  { decimals: number; max: number; min: number; step: number }
>;

export const layoutNumberFieldSettings = {
  columns: { decimals: 0, max: 24, min: 1, step: 1 },
  gap: { decimals: 0, max: 10000, min: 0, step: 1 }
} as const satisfies Record<
  Extract<LayoutFieldKey, "columns" | "gap">,
  { decimals: number; max: number; min: number; step: number }
>;

export const shapePolygonPointFieldSettings = {
  x: {
    decimals: 1,
    max: projectObjectShapePolygonCoordinateLimits.max,
    min: projectObjectShapePolygonCoordinateLimits.min,
    step: 1
  },
  y: {
    decimals: 1,
    max: projectObjectShapePolygonCoordinateLimits.max,
    min: projectObjectShapePolygonCoordinateLimits.min,
    step: 1
  }
} as const satisfies Record<
  ShapePolygonPointFieldKey,
  { decimals: number; max: number; min: number; step: number }
>;

const borderStyles = new Set<ProjectObjectBorderStyle>(["none", "solid", "dashed", "dotted"]);
const imageFits = new Set<ProjectObjectImageFit>(["contain", "cover", "fill", "scaleDown"]);
const cardSizePresetValues = new Set<ProjectObjectCardSizePresetValue>([
  projectObjectCardCustomSizePresetId,
  ...projectObjectCardSizePresets.map((preset) => preset.id)
]);
const cardSides = new Set<ProjectObjectCardSide>(projectObjectCardSides);
const dieFaceModes = new Set<ProjectObjectDieFaceMode>(projectObjectDieFaceModes);
const layoutAlignments = new Set<ProjectObjectLayoutAlignment>(["center", "end", "start"]);
const layoutJustifications = new Set<ProjectObjectLayoutJustification>([
  "center",
  "end",
  "spaceBetween",
  "start"
]);
const layoutModes = new Set<ProjectObjectLayoutMode>(["free", "grid", "horizontal", "vertical"]);
const shapeVariants = new Set<ProjectObjectShapeVariant>([
  "diamond",
  "ellipse",
  "hexagon",
  "polygon",
  "rectangle",
  "triangle"
]);
const textAligns = new Set<ProjectObjectTextAlign>(["center", "left", "right"]);
const textFontStyles = new Set<ProjectObjectTextFontStyle>(["italic", "normal"]);
const textVerticalAligns = new Set<ProjectObjectTextVerticalAlign>(["bottom", "middle", "top"]);
const boldTextFontWeight = 700;
const normalTextFontWeight = 400;
const boldTextFontWeightThreshold = 600;

export function createRectTransformDraft(
  rectTransform: ProjectObjectRectTransform | null
): RectTransformDraft {
  const activeRectTransform = rectTransform ?? {
    height: 0,
    pivotX: 0,
    pivotY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    width: 0,
    x: 0,
    y: 0
  };

  return {
    height: formatRectTransformValue(activeRectTransform.height, "height"),
    pivotX: formatRectTransformValue(activeRectTransform.pivotX, "pivotX"),
    pivotY: formatRectTransformValue(activeRectTransform.pivotY, "pivotY"),
    rotation: formatRectTransformValue(activeRectTransform.rotation, "rotation"),
    scaleX: formatRectTransformValue(activeRectTransform.scaleX, "scaleX"),
    scaleY: formatRectTransformValue(activeRectTransform.scaleY, "scaleY"),
    width: formatRectTransformValue(activeRectTransform.width, "width"),
    x: formatRectTransformValue(activeRectTransform.x, "x"),
    y: formatRectTransformValue(activeRectTransform.y, "y")
  };
}

export function formatRectTransformValue(value: number, fieldKey: RectTransformFieldKey) {
  const { decimals } = rectTransformFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function parseRectTransformDraftValue(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function normalizeRectTransformValue(fieldKey: RectTransformFieldKey, value: number) {
  const { decimals, max, min } = rectTransformFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function getRectTransformWithDraftField(
  rectTransform: ProjectObjectRectTransform,
  fieldKey: RectTransformFieldKey,
  value: string
) {
  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  const nextRectTransform = {
    ...rectTransform,
    [fieldKey]: normalizeRectTransformValue(fieldKey, parsedValue)
  };

  return areRectTransformsEqual(rectTransform, nextRectTransform) ? null : nextRectTransform;
}

export function areRectTransformsEqual(
  left: ProjectObjectRectTransform,
  right: ProjectObjectRectTransform
) {
  return (
    left.height === right.height &&
    left.pivotX === right.pivotX &&
    left.pivotY === right.pivotY &&
    left.rotation === right.rotation &&
    left.scaleX === right.scaleX &&
    left.scaleY === right.scaleY &&
    left.width === right.width &&
    left.x === right.x &&
    left.y === right.y
  );
}

export function createAppearanceDraft(appearance: ProjectObjectAppearance): AppearanceDraft {
  return {
    backgroundColor: appearance.backgroundColor,
    backgroundOpacity: formatAppearanceNumberValue(
      appearance.backgroundOpacity,
      "backgroundOpacity"
    ),
    borderColor: appearance.borderColor,
    borderRadius: formatAppearanceNumberValue(appearance.borderRadius, "borderRadius"),
    borderStyle: appearance.borderStyle,
    borderWidth: formatAppearanceNumberValue(appearance.borderWidth, "borderWidth"),
    opacity: formatAppearanceNumberValue(appearance.opacity, "opacity"),
    padding: formatAppearanceNumberValue(appearance.padding, "padding")
  };
}

export function createCardDraft(card: ProjectObjectCard): CardDraft {
  return {
    activeSide: card.activeSide,
    sizePreset: card.sizePreset
  };
}

export function createDieDraft(die: ProjectObjectDie): DieDraft {
  return {
    activeFace: String(normalizeProjectObjectDieActiveFace(die.activeFace, die.faceCount)),
    faceCount: formatDieNumberValue(die.faceCount, "faceCount")
  };
}

export function createTextDraft(text: ProjectObjectText): TextDraft {
  return {
    color: text.color,
    content: text.content,
    fontSize: formatTextNumberValue(text.fontSize, "fontSize"),
    fontStyle: text.fontStyle,
    fontWeight: formatTextNumberValue(text.fontWeight, "fontWeight"),
    lineHeight: formatTextNumberValue(text.lineHeight, "lineHeight"),
    textAlign: text.textAlign,
    verticalAlign: text.verticalAlign
  };
}

export function createImageDraft(image: ProjectObjectImage): ImageDraft {
  return {
    assetId: image.assetId,
    fit: image.fit,
    positionX: formatImageNumberValue(image.positionX, "positionX"),
    positionY: formatImageNumberValue(image.positionY, "positionY")
  };
}

export function createLayoutDraft(layout: ProjectObjectLayout): LayoutDraft {
  return {
    alignItems: layout.alignItems,
    columns: formatLayoutNumberValue(layout.columns, "columns"),
    gap: formatLayoutNumberValue(layout.gap, "gap"),
    justifyContent: layout.justifyContent,
    mode: layout.mode
  };
}

export function getAppearanceWithDraftField(
  appearance: ProjectObjectAppearance,
  fieldKey: AppearanceFieldKey,
  value: string
) {
  const nextAppearance = createNextAppearance(appearance, fieldKey, value);

  if (!nextAppearance) {
    return null;
  }

  return areAppearancesEqual(appearance, nextAppearance) ? null : nextAppearance;
}

export function getCardWithDraftField(
  card: ProjectObjectCard,
  fieldKey: CardFieldKey,
  value: string
) {
  const nextCard = createNextCard(card, fieldKey, value);

  if (!nextCard) {
    return null;
  }

  return areCardsEqual(card, nextCard) ? null : nextCard;
}

export function getDieWithDraftField(die: ProjectObjectDie, fieldKey: DieFieldKey, value: string) {
  const nextDie = createNextDie(die, fieldKey, value);

  if (!nextDie) {
    return null;
  }

  return areDiesEqual(die, nextDie) ? null : nextDie;
}

export function getDieFaces(die: ProjectObjectDie): ProjectObjectDieFace[] {
  const faceCount = normalizeProjectObjectDieFaceCount(die.faceCount);

  return Array.from({ length: faceCount }, (_, index) =>
    normalizeDieFace(die.faces[index], index + 1)
  );
}

export function getDieFace(die: ProjectObjectDie, faceNumber: number) {
  const faces = getDieFaces(die);
  const normalizedFaceNumber = normalizeProjectObjectDieActiveFace(faceNumber, faces.length);

  return faces[normalizedFaceNumber - 1] ?? getDefaultProjectObjectDieFace(normalizedFaceNumber);
}

export function getDieWithFaceField(
  die: ProjectObjectDie,
  faceNumber: number,
  fieldKey: DieFaceFieldKey,
  value: string
) {
  const normalizedDie = normalizeDie(die);
  const normalizedFaceNumber = normalizeProjectObjectDieActiveFace(
    faceNumber,
    normalizedDie.faceCount
  );
  const faceIndex = normalizedFaceNumber - 1;
  const currentFace = normalizedDie.faces[faceIndex] ?? getDefaultProjectObjectDieFace(faceNumber);
  const nextFace = createNextDieFace(currentFace, fieldKey, value);

  if (!nextFace) {
    return null;
  }

  const nextDie = {
    ...normalizedDie,
    activeFace: normalizedFaceNumber,
    faces: normalizedDie.faces.map((face, index) => (index === faceIndex ? nextFace : face))
  };

  return areDiesEqual(normalizedDie, nextDie) ? null : nextDie;
}

export function getTextWithDraftField(
  text: ProjectObjectText,
  fieldKey: TextFieldKey,
  value: string
) {
  const nextText = createNextText(text, fieldKey, value);

  if (!nextText) {
    return null;
  }

  return areTextsEqual(text, nextText) ? null : nextText;
}

export function getImageWithDraftField(
  image: ProjectObjectImage,
  fieldKey: ImageFieldKey,
  value: string
) {
  const nextImage = createNextImage(image, fieldKey, value);

  if (!nextImage) {
    return null;
  }

  return areImagesEqual(image, nextImage) ? null : nextImage;
}

export function getLayoutWithDraftField(
  layout: ProjectObjectLayout,
  fieldKey: LayoutFieldKey,
  value: string
) {
  const nextLayout = createNextLayout(layout, fieldKey, value);

  if (!nextLayout) {
    return null;
  }

  return areLayoutsEqual(layout, nextLayout) ? null : nextLayout;
}

export function getShapeWithVariant(shape: ProjectObjectShape, variant: string) {
  if (!shapeVariants.has(variant as ProjectObjectShapeVariant)) {
    return null;
  }

  const nextShape = {
    ...shape,
    variant: variant as ProjectObjectShapeVariant
  };

  return shape.variant === nextShape.variant ? null : nextShape;
}

export function getShapePolygonPoints(shape: ProjectObjectShape): ProjectObjectShapePoint[] {
  const points = shape.polygonPoints ?? getDefaultProjectObjectShapePolygonPoints();
  const normalizedPoints = points
    .slice(0, projectObjectShapePolygonPointCountLimits.max)
    .map((point) => ({
      x: normalizeShapePolygonPointValue("x", point.x),
      y: normalizeShapePolygonPointValue("y", point.y)
    }));

  return normalizedPoints.length >= projectObjectShapePolygonPointCountLimits.min
    ? normalizedPoints
    : getDefaultProjectObjectShapePolygonPoints();
}

export function createShapePolygonPointDrafts(shape: ProjectObjectShape): ShapePolygonPointDraft[] {
  return getShapePolygonPoints(shape).map((point) => ({
    x: formatShapePolygonPointValue(point.x, "x"),
    y: formatShapePolygonPointValue(point.y, "y")
  }));
}

export function getShapeWithPolygonPointDraftField(
  shape: ProjectObjectShape,
  pointIndex: number,
  fieldKey: ShapePolygonPointFieldKey,
  value: string
) {
  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  const points = getShapePolygonPoints(shape);
  const point = points[pointIndex];

  if (!point) {
    return null;
  }

  return getShapeWithPolygonPoint(shape, pointIndex, {
    ...point,
    [fieldKey]: normalizeShapePolygonPointValue(fieldKey, parsedValue)
  });
}

export function getShapeWithPolygonPoint(
  shape: ProjectObjectShape,
  pointIndex: number,
  point: ProjectObjectShapePoint
) {
  const points = getShapePolygonPoints(shape);

  if (!points[pointIndex]) {
    return null;
  }

  const nextPoints = points.map((currentPoint, index) =>
    index === pointIndex
      ? {
          x: normalizeShapePolygonPointValue("x", point.x),
          y: normalizeShapePolygonPointValue("y", point.y)
        }
      : currentPoint
  );

  return getShapeWithPolygonPoints(shape, nextPoints);
}

export function getShapeWithAddedPolygonPoint(shape: ProjectObjectShape) {
  const points = getShapePolygonPoints(shape);

  if (points.length >= projectObjectShapePolygonPointCountLimits.max) {
    return null;
  }

  const firstPoint = points[0] ?? { x: 50, y: 50 };
  const lastPoint = points[points.length - 1] ?? firstPoint;
  const nextPoint = {
    x: normalizeShapePolygonPointValue("x", (firstPoint.x + lastPoint.x) / 2),
    y: normalizeShapePolygonPointValue("y", (firstPoint.y + lastPoint.y) / 2)
  };

  return getShapeWithPolygonPoints(shape, [...points, nextPoint]);
}

export function getShapeWithRemovedPolygonPoint(shape: ProjectObjectShape, pointIndex: number) {
  const points = getShapePolygonPoints(shape);

  if (
    points.length <= projectObjectShapePolygonPointCountLimits.min ||
    pointIndex < 0 ||
    pointIndex >= points.length
  ) {
    return null;
  }

  return getShapeWithPolygonPoints(
    shape,
    points.filter((_, index) => index !== pointIndex)
  );
}

export function getShapeWithDefaultPolygonPoints(shape: ProjectObjectShape) {
  return getShapeWithPolygonPoints(shape, getDefaultProjectObjectShapePolygonPoints());
}

export function normalizeShapePolygonPointValue(
  fieldKey: ShapePolygonPointFieldKey,
  value: number
) {
  const { decimals, max, min } = shapePolygonPointFieldSettings[fieldKey];
  const numericValue = Number.isFinite(value) ? value : min;

  return roundTo(clamp(numericValue, min, max), decimals);
}

export function formatShapePolygonPointValue(value: number, fieldKey: ShapePolygonPointFieldKey) {
  const { decimals } = shapePolygonPointFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function normalizeAppearanceNumberValue(
  fieldKey: keyof typeof appearanceNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = appearanceNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeTextNumberValue(
  fieldKey: keyof typeof textNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = textNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeDieNumberValue(
  fieldKey: keyof typeof dieNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = dieNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeImageNumberValue(
  fieldKey: keyof typeof imageNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = imageNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeLayoutNumberValue(
  fieldKey: keyof typeof layoutNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = layoutNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function formatAppearanceNumberValue(
  value: number,
  fieldKey: keyof typeof appearanceNumberFieldSettings
) {
  const { decimals } = appearanceNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function formatTextNumberValue(
  value: number,
  fieldKey: keyof typeof textNumberFieldSettings
) {
  const { decimals } = textNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function formatDieNumberValue(value: number, fieldKey: keyof typeof dieNumberFieldSettings) {
  const { decimals } = dieNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function getTextFontWeightForBold(isBold: boolean) {
  return isBold ? boldTextFontWeight : normalTextFontWeight;
}

export function getTextFontStyleForItalic(isItalic: boolean): ProjectObjectTextFontStyle {
  return isItalic ? "italic" : "normal";
}

export function isTextFontWeightBold(value: number | string) {
  const parsedValue = typeof value === "number" ? value : parseRectTransformDraftValue(value);

  return parsedValue !== null && parsedValue >= boldTextFontWeightThreshold;
}

export function formatImageNumberValue(
  value: number,
  fieldKey: keyof typeof imageNumberFieldSettings
) {
  const { decimals } = imageNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function formatLayoutNumberValue(
  value: number,
  fieldKey: keyof typeof layoutNumberFieldSettings
) {
  const { decimals } = layoutNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

function createNextAppearance(
  appearance: ProjectObjectAppearance,
  fieldKey: AppearanceFieldKey,
  value: string
): ProjectObjectAppearance | null {
  if (fieldKey === "backgroundColor" || fieldKey === "borderColor") {
    return isHexColor(value) ? { ...appearance, [fieldKey]: value.toLowerCase() } : null;
  }

  if (fieldKey === "borderStyle") {
    return borderStyles.has(value as ProjectObjectBorderStyle)
      ? { ...appearance, borderStyle: value as ProjectObjectBorderStyle }
      : null;
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  return {
    ...appearance,
    [fieldKey]: normalizeAppearanceNumberValue(fieldKey, parsedValue)
  };
}

function createNextCard(
  card: ProjectObjectCard,
  fieldKey: CardFieldKey,
  value: string
): ProjectObjectCard | null {
  if (fieldKey === "activeSide") {
    return cardSides.has(value as ProjectObjectCardSide)
      ? { ...card, activeSide: value as ProjectObjectCardSide }
      : null;
  }

  if (fieldKey === "sizePreset") {
    return cardSizePresetValues.has(value as ProjectObjectCardSizePresetValue)
      ? { ...card, sizePreset: value as ProjectObjectCardSizePresetValue }
      : null;
  }

  return null;
}

function createNextDie(
  die: ProjectObjectDie,
  fieldKey: DieFieldKey,
  value: string
): ProjectObjectDie | null {
  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  if (fieldKey === "faceCount") {
    const faceCount = normalizeProjectObjectDieFaceCount(parsedValue);
    const faces = resizeDieFaces(die, faceCount);

    return {
      ...die,
      activeFace: normalizeProjectObjectDieActiveFace(die.activeFace, faceCount),
      faceCount,
      faces
    };
  }

  if (fieldKey === "activeFace") {
    return {
      ...die,
      activeFace: normalizeProjectObjectDieActiveFace(parsedValue, die.faceCount)
    };
  }

  return null;
}

function createNextDieFace(
  face: ProjectObjectDieFace,
  fieldKey: DieFaceFieldKey,
  value: string
): ProjectObjectDieFace | null {
  if (fieldKey === "mode") {
    return dieFaceModes.has(value as ProjectObjectDieFaceMode)
      ? { ...face, mode: value as ProjectObjectDieFaceMode }
      : null;
  }

  if (fieldKey === "label") {
    return {
      ...face,
      label: value.slice(0, projectObjectDieFaceLabelMaxLength)
    };
  }

  if (fieldKey === "imageAssetId") {
    return {
      ...face,
      imageAssetId: value
    };
  }

  return null;
}

function createNextText(
  text: ProjectObjectText,
  fieldKey: TextFieldKey,
  value: string
): ProjectObjectText | null {
  if (fieldKey === "content") {
    return {
      ...text,
      content: value
    };
  }

  if (fieldKey === "color") {
    return isHexColor(value) ? { ...text, color: value.toLowerCase() } : null;
  }

  if (fieldKey === "textAlign") {
    return textAligns.has(value as ProjectObjectTextAlign)
      ? { ...text, textAlign: value as ProjectObjectTextAlign }
      : null;
  }

  if (fieldKey === "fontStyle") {
    return textFontStyles.has(value as ProjectObjectTextFontStyle)
      ? { ...text, fontStyle: value as ProjectObjectTextFontStyle }
      : null;
  }

  if (fieldKey === "verticalAlign") {
    return textVerticalAligns.has(value as ProjectObjectTextVerticalAlign)
      ? { ...text, verticalAlign: value as ProjectObjectTextVerticalAlign }
      : null;
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  return {
    ...text,
    [fieldKey]: normalizeTextNumberValue(fieldKey, parsedValue)
  };
}

function createNextImage(
  image: ProjectObjectImage,
  fieldKey: ImageFieldKey,
  value: string
): ProjectObjectImage | null {
  if (fieldKey === "assetId") {
    return {
      ...image,
      assetId: value
    };
  }

  if (fieldKey === "fit") {
    return imageFits.has(value as ProjectObjectImageFit)
      ? { ...image, fit: value as ProjectObjectImageFit }
      : null;
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  return {
    ...image,
    [fieldKey]: normalizeImageNumberValue(fieldKey, parsedValue)
  };
}

function createNextLayout(
  layout: ProjectObjectLayout,
  fieldKey: LayoutFieldKey,
  value: string
): ProjectObjectLayout | null {
  if (fieldKey === "alignItems") {
    return layoutAlignments.has(value as ProjectObjectLayoutAlignment)
      ? { ...layout, alignItems: value as ProjectObjectLayoutAlignment }
      : null;
  }

  if (fieldKey === "justifyContent") {
    return layoutJustifications.has(value as ProjectObjectLayoutJustification)
      ? { ...layout, justifyContent: value as ProjectObjectLayoutJustification }
      : null;
  }

  if (fieldKey === "mode") {
    return layoutModes.has(value as ProjectObjectLayoutMode)
      ? { ...layout, mode: value as ProjectObjectLayoutMode }
      : null;
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  return {
    ...layout,
    [fieldKey]: normalizeLayoutNumberValue(fieldKey, parsedValue)
  };
}

function areAppearancesEqual(left: ProjectObjectAppearance, right: ProjectObjectAppearance) {
  return (
    left.backgroundColor === right.backgroundColor &&
    left.backgroundOpacity === right.backgroundOpacity &&
    left.borderColor === right.borderColor &&
    left.borderRadius === right.borderRadius &&
    left.borderStyle === right.borderStyle &&
    left.borderWidth === right.borderWidth &&
    left.opacity === right.opacity &&
    left.padding === right.padding
  );
}

function areCardsEqual(left: ProjectObjectCard, right: ProjectObjectCard) {
  return left.activeSide === right.activeSide && left.sizePreset === right.sizePreset;
}

function areDiesEqual(left: ProjectObjectDie, right: ProjectObjectDie) {
  return (
    left.activeFace === right.activeFace &&
    left.faceCount === right.faceCount &&
    areDieFacesEqual(getDieFaces(left), getDieFaces(right))
  );
}

function areDieFacesEqual(
  left: readonly ProjectObjectDieFace[],
  right: readonly ProjectObjectDieFace[]
) {
  return (
    left.length === right.length &&
    left.every((leftFace, index) => {
      const rightFace = right[index];

      return (
        Boolean(rightFace) &&
        leftFace.imageAssetId === rightFace.imageAssetId &&
        leftFace.label === rightFace.label &&
        leftFace.mode === rightFace.mode
      );
    })
  );
}

function areTextsEqual(left: ProjectObjectText, right: ProjectObjectText) {
  return (
    left.color === right.color &&
    left.content === right.content &&
    left.fontSize === right.fontSize &&
    left.fontStyle === right.fontStyle &&
    left.fontWeight === right.fontWeight &&
    left.lineHeight === right.lineHeight &&
    left.textAlign === right.textAlign &&
    left.verticalAlign === right.verticalAlign
  );
}

function areImagesEqual(left: ProjectObjectImage, right: ProjectObjectImage) {
  return (
    left.assetId === right.assetId &&
    left.fit === right.fit &&
    left.positionX === right.positionX &&
    left.positionY === right.positionY
  );
}

function areLayoutsEqual(left: ProjectObjectLayout, right: ProjectObjectLayout) {
  return (
    left.alignItems === right.alignItems &&
    left.columns === right.columns &&
    left.gap === right.gap &&
    left.justifyContent === right.justifyContent &&
    left.mode === right.mode
  );
}

function getShapeWithPolygonPoints(
  shape: ProjectObjectShape,
  polygonPoints: readonly ProjectObjectShapePoint[]
): ProjectObjectShape | null {
  const nextPolygonPoints = normalizeShapePolygonPoints(polygonPoints);

  return areShapePolygonPointsEqual(getShapePolygonPoints(shape), nextPolygonPoints)
    ? null
    : {
        ...shape,
        polygonPoints: nextPolygonPoints
      };
}

function normalizeDie(die: ProjectObjectDie): ProjectObjectDie {
  const faceCount = normalizeProjectObjectDieFaceCount(die.faceCount);

  return {
    activeFace: normalizeProjectObjectDieActiveFace(die.activeFace, faceCount),
    faceCount,
    faces: getDieFaces({ ...die, faceCount })
  };
}

function resizeDieFaces(die: ProjectObjectDie, faceCount: number) {
  const currentFaces = getDieFaces(die);

  return Array.from({ length: faceCount }, (_, index) =>
    normalizeDieFace(currentFaces[index], index + 1)
  );
}

function normalizeDieFace(
  face: ProjectObjectDieFace | undefined,
  faceNumber: number
): ProjectObjectDieFace {
  const defaultFace = getDefaultProjectObjectDieFace(faceNumber);
  const mode = dieFaceModes.has(face?.mode as ProjectObjectDieFaceMode)
    ? (face?.mode as ProjectObjectDieFaceMode)
    : defaultFace.mode;

  return {
    imageAssetId: typeof face?.imageAssetId === "string" ? face.imageAssetId : "",
    label:
      typeof face?.label === "string"
        ? face.label.slice(0, projectObjectDieFaceLabelMaxLength)
        : defaultFace.label,
    mode
  };
}

function normalizeShapePolygonPoints(
  polygonPoints: readonly ProjectObjectShapePoint[]
): ProjectObjectShapePoint[] {
  const points = polygonPoints
    .slice(0, projectObjectShapePolygonPointCountLimits.max)
    .map((point) => ({
      x: normalizeShapePolygonPointValue("x", point.x),
      y: normalizeShapePolygonPointValue("y", point.y)
    }));

  return points.length >= projectObjectShapePolygonPointCountLimits.min
    ? points
    : getDefaultProjectObjectShapePolygonPoints();
}

function areShapePolygonPointsEqual(
  left: readonly ProjectObjectShapePoint[],
  right: readonly ProjectObjectShapePoint[]
) {
  return (
    left.length === right.length &&
    left.every((leftPoint, index) => {
      const rightPoint = right[index];

      return Boolean(rightPoint) && leftPoint.x === rightPoint.x && leftPoint.y === rightPoint.y;
    })
  );
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}
