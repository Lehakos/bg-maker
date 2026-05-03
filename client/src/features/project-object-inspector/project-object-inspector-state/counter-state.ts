import type {
  ProjectObjectCounter,
  ProjectObjectCounterBoundsMode,
  ProjectObjectCounterDisplayMode
} from "@bg-maker/shared";
import {
  projectObjectCounterAffixMaxLength,
  projectObjectCounterBoundsModes,
  projectObjectCounterDisplayModes,
  projectObjectCounterStepLimits,
  projectObjectCounterValueLimits
} from "@bg-maker/shared";
import { clamp, parseRectTransformDraftValue, roundTo } from "./inspector-state-utils";

export type CounterFieldKey = keyof ProjectObjectCounter;
export type CounterNumberFieldKey = Extract<
  CounterFieldKey,
  "defaultValue" | "maxValue" | "minValue" | "step"
>;
export type CounterDraft = {
  boundsMode: ProjectObjectCounterBoundsMode;
  defaultValue: string;
  displayMode: ProjectObjectCounterDisplayMode;
  maxValue: string;
  minValue: string;
  prefix: string;
  step: string;
  suffix: string;
};

export const counterNumberFieldSettings = {
  defaultValue: {
    decimals: 0,
    max: projectObjectCounterValueLimits.max,
    min: projectObjectCounterValueLimits.min,
    step: 1
  },
  maxValue: {
    decimals: 0,
    max: projectObjectCounterValueLimits.max,
    min: projectObjectCounterValueLimits.min,
    step: 1
  },
  minValue: {
    decimals: 0,
    max: projectObjectCounterValueLimits.max,
    min: projectObjectCounterValueLimits.min,
    step: 1
  },
  step: {
    decimals: 0,
    max: projectObjectCounterStepLimits.max,
    min: projectObjectCounterStepLimits.min,
    step: 1
  }
} as const satisfies Record<
  CounterNumberFieldKey,
  { decimals: number; max: number; min: number; step: number }
>;

const counterBoundsModes = new Set<ProjectObjectCounterBoundsMode>(projectObjectCounterBoundsModes);
const counterDisplayModes = new Set<ProjectObjectCounterDisplayMode>(
  projectObjectCounterDisplayModes
);

export function createCounterDraft(counter: ProjectObjectCounter): CounterDraft {
  return {
    boundsMode: counter.boundsMode,
    defaultValue: formatCounterNumberValue(counter.defaultValue, "defaultValue"),
    displayMode: counter.displayMode,
    maxValue: formatCounterNumberValue(counter.maxValue, "maxValue"),
    minValue: formatCounterNumberValue(counter.minValue, "minValue"),
    prefix: counter.prefix,
    step: formatCounterNumberValue(counter.step, "step"),
    suffix: counter.suffix
  };
}

export function getCounterWithDraftField(
  counter: ProjectObjectCounter,
  fieldKey: CounterFieldKey,
  value: string
) {
  const nextCounter = createNextCounter(counter, fieldKey, value);

  if (!nextCounter) {
    return null;
  }

  return areCountersEqual(counter, nextCounter) ? null : nextCounter;
}

export function normalizeCounterNumberValue(
  fieldKey: keyof typeof counterNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = counterNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function formatCounterNumberValue(
  value: number,
  fieldKey: keyof typeof counterNumberFieldSettings
) {
  const { decimals } = counterNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

function createNextCounter(
  counter: ProjectObjectCounter,
  fieldKey: CounterFieldKey,
  value: string
): ProjectObjectCounter | null {
  if (fieldKey === "boundsMode") {
    return counterBoundsModes.has(value as ProjectObjectCounterBoundsMode)
      ? normalizeCounter({ ...counter, boundsMode: value as ProjectObjectCounterBoundsMode })
      : null;
  }

  if (fieldKey === "displayMode") {
    return counterDisplayModes.has(value as ProjectObjectCounterDisplayMode)
      ? { ...counter, displayMode: value as ProjectObjectCounterDisplayMode }
      : null;
  }

  if (fieldKey === "prefix" || fieldKey === "suffix") {
    return {
      ...counter,
      [fieldKey]: value.slice(0, projectObjectCounterAffixMaxLength)
    };
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  return normalizeCounter({
    ...counter,
    [fieldKey]: normalizeCounterNumberValue(fieldKey, parsedValue)
  });
}

function normalizeCounter(counter: ProjectObjectCounter): ProjectObjectCounter {
  const minValue = normalizeCounterNumberValue("minValue", counter.minValue);
  const maxValue = Math.max(minValue, normalizeCounterNumberValue("maxValue", counter.maxValue));
  const defaultValue = normalizeCounterNumberValue(
    "defaultValue",
    counter.boundsMode === "none"
      ? counter.defaultValue
      : clamp(counter.defaultValue, minValue, maxValue)
  );

  return {
    ...counter,
    defaultValue,
    maxValue,
    minValue,
    prefix: counter.prefix.slice(0, projectObjectCounterAffixMaxLength),
    step: normalizeCounterNumberValue("step", counter.step),
    suffix: counter.suffix.slice(0, projectObjectCounterAffixMaxLength)
  };
}

function areCountersEqual(left: ProjectObjectCounter, right: ProjectObjectCounter) {
  return (
    left.boundsMode === right.boundsMode &&
    left.defaultValue === right.defaultValue &&
    left.displayMode === right.displayMode &&
    left.maxValue === right.maxValue &&
    left.minValue === right.minValue &&
    left.prefix === right.prefix &&
    left.step === right.step &&
    left.suffix === right.suffix
  );
}
