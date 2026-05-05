import type {
  ProjectObjectImage,
  ProjectObjectImageFit,
  ProjectObjectShape,
  ProjectObjectShapePoint,
  ProjectObjectShapeVariant,
  ProjectObjectText,
  ProjectObjectTextAlign,
  ProjectObjectTextEffectMode,
  ProjectObjectTextFontFamily,
  ProjectObjectTextFontStyle,
  ProjectObjectTextVerticalAlign
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectShapePolygonPoints,
  projectObjectTextEffectModes,
  projectObjectTextFontFamilies,
  projectObjectShapePolygonCoordinateLimits,
  projectObjectShapePolygonPointCountLimits
} from "@bg-maker/shared";
import { clamp, isHexColor, parseRectTransformDraftValue, roundTo } from "./inspector-state-utils";

export type TextFieldKey = keyof TextDraft;
export type TextDraft = {
  autoFit: boolean;
  color: string;
  content: string;
  effectColor: string;
  effectMode: ProjectObjectTextEffectMode;
  effectStrength: string;
  fontFamily: ProjectObjectTextFontFamily;
  fontSize: string;
  fontStyle: ProjectObjectTextFontStyle;
  fontWeight: string;
  lineHeight: string;
  minFontSize: string;
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

export const textNumberFieldSettings = {
  effectStrength: { decimals: 1, max: 12, min: 0, step: 0.5 },
  fontSize: { decimals: 0, max: 512, min: 1, step: 1 },
  fontWeight: { decimals: 0, max: 900, min: 100, step: 100 },
  lineHeight: { decimals: 2, max: 4, min: 0.5, step: 0.05 },
  minFontSize: { decimals: 0, max: 512, min: 1, step: 1 }
} as const satisfies Record<
  Extract<
    TextFieldKey,
    "effectStrength" | "fontSize" | "fontWeight" | "lineHeight" | "minFontSize"
  >,
  { decimals: number; max: number; min: number; step: number }
>;

export const imageNumberFieldSettings = {
  positionX: { decimals: 0, max: 100, min: 0, step: 1 },
  positionY: { decimals: 0, max: 100, min: 0, step: 1 }
} as const satisfies Record<
  Extract<ImageFieldKey, "positionX" | "positionY">,
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

const imageFits = new Set<ProjectObjectImageFit>(["contain", "cover", "fill", "scaleDown"]);
const shapeVariants = new Set<ProjectObjectShapeVariant>([
  "diamond",
  "ellipse",
  "hexagon",
  "polygon",
  "rectangle",
  "triangle"
]);
const textAligns = new Set<ProjectObjectTextAlign>(["center", "left", "right"]);
const textEffectModes = new Set<ProjectObjectTextEffectMode>(projectObjectTextEffectModes);
const textFontFamilies = new Set<ProjectObjectTextFontFamily>(projectObjectTextFontFamilies);
const textFontStyles = new Set<ProjectObjectTextFontStyle>(["italic", "normal"]);
const textVerticalAligns = new Set<ProjectObjectTextVerticalAlign>(["bottom", "middle", "top"]);
const boldTextFontWeight = 700;
const normalTextFontWeight = 400;
const boldTextFontWeightThreshold = 600;

export function createTextDraft(text: ProjectObjectText): TextDraft {
  return {
    autoFit: text.autoFit,
    color: text.color,
    content: text.content,
    effectColor: text.effect.color,
    effectMode: text.effect.mode,
    effectStrength: formatTextNumberValue(text.effect.strength, "effectStrength"),
    fontFamily: text.fontFamily,
    fontSize: formatTextNumberValue(text.fontSize, "fontSize"),
    fontStyle: text.fontStyle,
    fontWeight: formatTextNumberValue(text.fontWeight, "fontWeight"),
    lineHeight: formatTextNumberValue(text.lineHeight, "lineHeight"),
    minFontSize: formatTextNumberValue(text.minFontSize, "minFontSize"),
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

export function getTextWithDraftField(
  text: ProjectObjectText,
  fieldKey: TextFieldKey,
  value: string | boolean
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

export function normalizeTextNumberValue(
  fieldKey: keyof typeof textNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = textNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeImageNumberValue(
  fieldKey: keyof typeof imageNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = imageNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function formatTextNumberValue(
  value: number,
  fieldKey: keyof typeof textNumberFieldSettings
) {
  const { decimals } = textNumberFieldSettings[fieldKey];

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

function createNextText(
  text: ProjectObjectText,
  fieldKey: TextFieldKey,
  value: string | boolean
): ProjectObjectText | null {
  if (fieldKey === "autoFit") {
    return {
      ...text,
      autoFit: Boolean(value)
    };
  }

  if (fieldKey === "content") {
    return {
      ...text,
      content: String(value)
    };
  }

  if (fieldKey === "color") {
    return typeof value === "string" && isHexColor(value)
      ? { ...text, color: value.toLowerCase() }
      : null;
  }

  if (fieldKey === "effectColor") {
    return typeof value === "string" && isHexColor(value)
      ? { ...text, effect: { ...text.effect, color: value.toLowerCase() } }
      : null;
  }

  if (fieldKey === "effectMode") {
    return textEffectModes.has(value as ProjectObjectTextEffectMode)
      ? { ...text, effect: { ...text.effect, mode: value as ProjectObjectTextEffectMode } }
      : null;
  }

  if (fieldKey === "fontFamily") {
    return textFontFamilies.has(value as ProjectObjectTextFontFamily)
      ? { ...text, fontFamily: value as ProjectObjectTextFontFamily }
      : null;
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

  if (typeof value !== "string") {
    return null;
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  if (fieldKey === "effectStrength") {
    return {
      ...text,
      effect: {
        ...text.effect,
        strength: normalizeTextNumberValue(fieldKey, parsedValue)
      }
    };
  }

  if (fieldKey === "minFontSize") {
    return {
      ...text,
      minFontSize: Math.min(text.fontSize, normalizeTextNumberValue(fieldKey, parsedValue))
    };
  }

  if (fieldKey === "fontSize" || fieldKey === "fontWeight" || fieldKey === "lineHeight") {
    return {
      ...text,
      [fieldKey]: normalizeTextNumberValue(fieldKey, parsedValue)
    };
  }

  return null;
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

function areTextsEqual(left: ProjectObjectText, right: ProjectObjectText) {
  return (
    left.autoFit === right.autoFit &&
    left.color === right.color &&
    left.content === right.content &&
    left.effect.color === right.effect.color &&
    left.effect.mode === right.effect.mode &&
    left.effect.strength === right.effect.strength &&
    left.fontFamily === right.fontFamily &&
    left.fontSize === right.fontSize &&
    left.fontStyle === right.fontStyle &&
    left.fontWeight === right.fontWeight &&
    left.lineHeight === right.lineHeight &&
    left.minFontSize === right.minFontSize &&
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
