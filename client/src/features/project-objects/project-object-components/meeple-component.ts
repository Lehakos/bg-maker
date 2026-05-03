import type {
  ProjectObjectMeeple,
  ProjectObjectMeepleVisualVariant,
  ProjectObjectNode
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectMeeple,
  projectObjectMeepleVisualVariants
} from "@bg-maker/shared";

const projectObjectMeepleVisualVariantSet = new Set<ProjectObjectMeepleVisualVariant>(
  projectObjectMeepleVisualVariants
);

export function getProjectObjectMeepleComponent(object: ProjectObjectNode): ProjectObjectMeeple {
  return normalizeProjectObjectMeepleComponent({
    ...getDefaultProjectObjectMeeple(),
    ...object.components?.meeple
  });
}

export function withProjectObjectMeepleComponent(
  object: ProjectObjectNode,
  meeple: ProjectObjectMeeple
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      meeple: normalizeProjectObjectMeepleComponent(meeple)
    }
  };
}

export function normalizeProjectObjectMeepleComponent(
  meeple: Partial<ProjectObjectMeeple>
): ProjectObjectMeeple {
  const defaultMeeple = getDefaultProjectObjectMeeple();
  const visualVariant = projectObjectMeepleVisualVariantSet.has(
    meeple.visualVariant as ProjectObjectMeepleVisualVariant
  )
    ? (meeple.visualVariant as ProjectObjectMeepleVisualVariant)
    : defaultMeeple.visualVariant;

  return {
    visualVariant
  };
}
