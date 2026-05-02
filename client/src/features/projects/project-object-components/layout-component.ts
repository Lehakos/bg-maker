import type { ProjectObjectLayout, ProjectObjectNode } from "@bg-maker/shared";
import { getDefaultProjectObjectLayout } from "@bg-maker/shared";

export function getProjectObjectLayoutComponent(object: ProjectObjectNode): ProjectObjectLayout {
  return {
    ...getDefaultProjectObjectLayout(),
    ...object.components?.layout
  };
}

export function withProjectObjectLayoutComponent(
  object: ProjectObjectNode,
  layout: ProjectObjectLayout
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      layout
    }
  };
}
