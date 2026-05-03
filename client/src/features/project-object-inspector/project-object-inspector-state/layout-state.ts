import type {
  ProjectObjectLayout,
  ProjectObjectLayoutAlignment,
  ProjectObjectLayoutJustification,
  ProjectObjectLayoutMode
} from "@bg-maker/shared";
import { clamp, parseRectTransformDraftValue, roundTo } from "./inspector-state-utils";

export type LayoutFieldKey = keyof ProjectObjectLayout;
export type LayoutDraft = {
  alignItems: ProjectObjectLayoutAlignment;
  columns: string;
  gap: string;
  justifyContent: ProjectObjectLayoutJustification;
  mode: ProjectObjectLayoutMode;
};

export const layoutNumberFieldSettings = {
  columns: { decimals: 0, max: 24, min: 1, step: 1 },
  gap: { decimals: 0, max: 10000, min: 0, step: 1 }
} as const satisfies Record<
  Extract<LayoutFieldKey, "columns" | "gap">,
  { decimals: number; max: number; min: number; step: number }
>;

const layoutAlignments = new Set<ProjectObjectLayoutAlignment>(["center", "end", "start"]);
const layoutJustifications = new Set<ProjectObjectLayoutJustification>([
  "center",
  "end",
  "spaceBetween",
  "start"
]);
const layoutModes = new Set<ProjectObjectLayoutMode>(["free", "grid", "horizontal", "vertical"]);

export function createLayoutDraft(layout: ProjectObjectLayout): LayoutDraft {
  return {
    alignItems: layout.alignItems,
    columns: formatLayoutNumberValue(layout.columns, "columns"),
    gap: formatLayoutNumberValue(layout.gap, "gap"),
    justifyContent: layout.justifyContent,
    mode: layout.mode
  };
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

export function normalizeLayoutNumberValue(
  fieldKey: keyof typeof layoutNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = layoutNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function formatLayoutNumberValue(
  value: number,
  fieldKey: keyof typeof layoutNumberFieldSettings
) {
  const { decimals } = layoutNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
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

function areLayoutsEqual(left: ProjectObjectLayout, right: ProjectObjectLayout) {
  return (
    left.alignItems === right.alignItems &&
    left.columns === right.columns &&
    left.gap === right.gap &&
    left.justifyContent === right.justifyContent &&
    left.mode === right.mode
  );
}
