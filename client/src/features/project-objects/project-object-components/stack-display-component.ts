import type { ProjectObjectNode, ProjectObjectStackDisplay } from "@bg-maker/shared";
import {
  getDefaultProjectObjectStackDisplay,
  projectObjectStackDisplayOffsetLimits,
  projectObjectStackDisplayVisibleItemCountLimits
} from "@bg-maker/shared";

export function getProjectObjectStackDisplayComponent(
  object: ProjectObjectNode
): ProjectObjectStackDisplay {
  return normalizeProjectObjectStackDisplayComponent({
    ...getDefaultProjectObjectStackDisplay(),
    ...object.components?.stackDisplay
  });
}

export function withProjectObjectStackDisplayComponent(
  object: ProjectObjectNode,
  stackDisplay: ProjectObjectStackDisplay
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      stackDisplay: normalizeProjectObjectStackDisplayComponent(stackDisplay)
    }
  };
}

export function normalizeProjectObjectStackDisplayComponent(
  stackDisplay: Partial<ProjectObjectStackDisplay>
): ProjectObjectStackDisplay {
  const defaultStackDisplay = getDefaultProjectObjectStackDisplay();

  return {
    showCount:
      typeof stackDisplay.showCount === "boolean"
        ? stackDisplay.showCount
        : defaultStackDisplay.showCount,
    stackOffsetX: normalizeInteger(
      stackDisplay.stackOffsetX,
      defaultStackDisplay.stackOffsetX,
      projectObjectStackDisplayOffsetLimits
    ),
    stackOffsetY: normalizeInteger(
      stackDisplay.stackOffsetY,
      defaultStackDisplay.stackOffsetY,
      projectObjectStackDisplayOffsetLimits
    ),
    visibleItemCount: normalizeInteger(
      stackDisplay.visibleItemCount,
      defaultStackDisplay.visibleItemCount,
      projectObjectStackDisplayVisibleItemCountLimits
    )
  };
}

function normalizeInteger(
  value: unknown,
  fallback: number,
  limits: { max: number; min: number }
) {
  const normalizedValue = typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.min(limits.max, Math.max(limits.min, Math.round(normalizedValue)));
}
