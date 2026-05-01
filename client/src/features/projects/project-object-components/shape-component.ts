import type { ProjectObjectNode, ProjectObjectShape } from "@bg-maker/shared";
import { getDefaultProjectObjectShape } from "@bg-maker/shared";

export function getProjectObjectShapeComponent(object: ProjectObjectNode): ProjectObjectShape {
  return {
    ...getDefaultProjectObjectShape(),
    ...object.components?.shape
  };
}

export function withProjectObjectShapeComponent(
  object: ProjectObjectNode,
  shape: ProjectObjectShape
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      shape
    }
  };
}
