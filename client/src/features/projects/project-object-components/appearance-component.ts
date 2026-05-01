import type { ProjectObjectAppearance, ProjectObjectNode } from "@bg-maker/shared";
import { getDefaultProjectObjectAppearance } from "@bg-maker/shared";

export function getProjectObjectAppearanceComponent(
  object: ProjectObjectNode
): ProjectObjectAppearance {
  return {
    ...getDefaultProjectObjectAppearance(object.kind),
    ...object.components?.appearance
  };
}

export function withProjectObjectAppearanceComponent(
  object: ProjectObjectNode,
  appearance: ProjectObjectAppearance
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      appearance
    }
  };
}
