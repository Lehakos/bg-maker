import type { ProjectObjectNode, ProjectObjectRectTransform } from "@bg-maker/shared";
import {
  getDefaultProjectObjectRectTransform,
  getProjectObjectRectTransformWithCardSizePreset
} from "@bg-maker/shared";
import { getProjectObjectCardComponent } from "./card-component";

export function getProjectObjectRectTransformComponent(
  object: ProjectObjectNode
): ProjectObjectRectTransform {
  const rectTransform = {
    ...getDefaultProjectObjectRectTransform(object.kind),
    ...object.components?.rectTransform
  };

  if (object.kind === "card") {
    return getProjectObjectRectTransformWithCardSizePreset(
      rectTransform,
      getProjectObjectCardComponent(object)
    );
  }

  return rectTransform;
}

export function withProjectObjectRectTransformComponent(
  object: ProjectObjectNode,
  rectTransform: ProjectObjectRectTransform
): ProjectObjectNode {
  const nextRectTransform =
    object.kind === "card"
      ? getProjectObjectRectTransformWithCardSizePreset(
          rectTransform,
          getProjectObjectCardComponent(object)
        )
      : rectTransform;

  return {
    ...object,
    components: {
      ...object.components,
      rectTransform: nextRectTransform
    }
  };
}
