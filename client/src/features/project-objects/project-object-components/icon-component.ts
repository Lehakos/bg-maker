import type { ProjectObjectIcon, ProjectObjectNode } from "@bg-maker/shared";
import { getDefaultProjectObjectIcon } from "@bg-maker/shared";

export function getProjectObjectIconComponent(object: ProjectObjectNode): ProjectObjectIcon {
  return {
    ...getDefaultProjectObjectIcon(),
    ...object.components?.icon
  };
}

export function withProjectObjectIconComponent(
  object: ProjectObjectNode,
  icon: ProjectObjectIcon
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      icon
    }
  };
}
