import type { ProjectObjectAppearance, ProjectObjectBorderStyle } from "@bg-maker/shared";
import { clamp, isHexColor, parseRectTransformDraftValue, roundTo } from "./inspector-state-utils";

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

const borderStyles = new Set<ProjectObjectBorderStyle>(["none", "solid", "dashed", "dotted"]);

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

export function normalizeAppearanceNumberValue(
  fieldKey: keyof typeof appearanceNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = appearanceNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function formatAppearanceNumberValue(
  value: number,
  fieldKey: keyof typeof appearanceNumberFieldSettings
) {
  const { decimals } = appearanceNumberFieldSettings[fieldKey];

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
