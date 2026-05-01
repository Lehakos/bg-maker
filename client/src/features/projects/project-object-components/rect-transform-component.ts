import type { ProjectObjectNode, ProjectObjectRectTransform } from "@bg-maker/shared";
import { getDefaultProjectObjectRectTransform } from "@bg-maker/shared";

export function getProjectObjectRectTransformComponent(
  object: ProjectObjectNode
): ProjectObjectRectTransform {
  return {
    ...getDefaultProjectObjectRectTransform(object.kind),
    ...object.components?.rectTransform
  };
}

export function withProjectObjectRectTransformComponent(
  object: ProjectObjectNode,
  rectTransform: ProjectObjectRectTransform
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      rectTransform
    }
  };
}
