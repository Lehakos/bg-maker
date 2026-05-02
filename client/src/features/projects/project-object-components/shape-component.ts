import type { ProjectObjectNode, ProjectObjectShape } from "@bg-maker/shared";
import { getDefaultProjectObjectShape } from "@bg-maker/shared";
import {
  getProjectObjectDoubleSideComponent,
  getProjectObjectSideComponent,
  withProjectObjectSideComponent
} from "./double-side-component";

export function getProjectObjectShapeComponent(object: ProjectObjectNode): ProjectObjectShape {
  return {
    ...getDefaultProjectObjectShape(),
    ...object.components?.shape,
    ...getProjectObjectSideComponent(object, "shape")
  };
}

export function withProjectObjectShapeComponent(
  object: ProjectObjectNode,
  shape: ProjectObjectShape
): ProjectObjectNode {
  if (getProjectObjectDoubleSideComponent(object).enabled) {
    return withProjectObjectSideComponent(object, "shape", shape);
  }

  return {
    ...object,
    components: {
      ...object.components,
      shape
    }
  };
}
