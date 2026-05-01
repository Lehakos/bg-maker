import type { ProjectObjectRectTransform } from "@bg-maker/shared";

export type RectTransformFieldKey = keyof ProjectObjectRectTransform;

export type RectTransformDraft = Record<RectTransformFieldKey, string>;

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number) {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}
