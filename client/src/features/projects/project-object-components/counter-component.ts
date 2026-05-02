import type {
  ProjectObjectCounter,
  ProjectObjectCounterBoundsMode,
  ProjectObjectCounterDisplayMode,
  ProjectObjectNode
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectCounter,
  projectObjectCounterAffixMaxLength,
  projectObjectCounterBoundsModes,
  projectObjectCounterDisplayModes,
  projectObjectCounterStepLimits,
  projectObjectCounterValueLimits
} from "@bg-maker/shared";

const counterBoundsModes = new Set<ProjectObjectCounterBoundsMode>(projectObjectCounterBoundsModes);
const counterDisplayModes = new Set<ProjectObjectCounterDisplayMode>(
  projectObjectCounterDisplayModes
);

export function getProjectObjectCounterComponent(object: ProjectObjectNode): ProjectObjectCounter {
  return normalizeProjectObjectCounterComponent({
    ...getDefaultProjectObjectCounter(),
    ...object.components?.counter
  });
}

export function withProjectObjectCounterComponent(
  object: ProjectObjectNode,
  counter: ProjectObjectCounter
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      counter: normalizeProjectObjectCounterComponent(counter)
    }
  };
}

export function normalizeProjectObjectCounterComponent(
  counter: Partial<ProjectObjectCounter>
): ProjectObjectCounter {
  const defaultCounter = getDefaultProjectObjectCounter();
  const minValue = normalizeCounterValue(
    typeof counter.minValue === "number" ? counter.minValue : defaultCounter.minValue
  );
  const maxValue = Math.max(
    minValue,
    normalizeCounterValue(
      typeof counter.maxValue === "number" ? counter.maxValue : defaultCounter.maxValue
    )
  );
  const boundsMode = counterBoundsModes.has(counter.boundsMode as ProjectObjectCounterBoundsMode)
    ? (counter.boundsMode as ProjectObjectCounterBoundsMode)
    : defaultCounter.boundsMode;
  const defaultValue = normalizeCounterDefaultValue(
    typeof counter.defaultValue === "number" ? counter.defaultValue : defaultCounter.defaultValue,
    boundsMode,
    minValue,
    maxValue
  );

  return {
    boundsMode,
    defaultValue,
    displayMode: counterDisplayModes.has(
      counter.displayMode as ProjectObjectCounterDisplayMode
    )
      ? (counter.displayMode as ProjectObjectCounterDisplayMode)
      : defaultCounter.displayMode,
    maxValue,
    minValue,
    prefix: normalizeCounterAffix(counter.prefix),
    step: normalizeCounterStep(
      typeof counter.step === "number" ? counter.step : defaultCounter.step
    ),
    suffix: normalizeCounterAffix(counter.suffix)
  };
}

function normalizeCounterDefaultValue(
  value: number,
  boundsMode: ProjectObjectCounterBoundsMode,
  minValue: number,
  maxValue: number
) {
  const normalizedValue = normalizeCounterValue(value);

  return boundsMode === "none"
    ? normalizedValue
    : Math.min(maxValue, Math.max(minValue, normalizedValue));
}

function normalizeCounterValue(value: number) {
  const normalizedValue = Number.isFinite(value) ? Math.round(value) : 0;

  return Math.min(
    projectObjectCounterValueLimits.max,
    Math.max(projectObjectCounterValueLimits.min, normalizedValue)
  );
}

function normalizeCounterStep(value: number) {
  const normalizedValue = Number.isFinite(value) ? Math.round(value) : 1;

  return Math.min(
    projectObjectCounterStepLimits.max,
    Math.max(projectObjectCounterStepLimits.min, normalizedValue)
  );
}

function normalizeCounterAffix(value: unknown) {
  return typeof value === "string" ? value.slice(0, projectObjectCounterAffixMaxLength) : "";
}
