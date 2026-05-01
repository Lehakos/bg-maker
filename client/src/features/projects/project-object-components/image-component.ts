import type { ProjectObjectImage, ProjectObjectNode } from "@bg-maker/shared";
import { getDefaultProjectObjectImage } from "@bg-maker/shared";

export function getProjectObjectImageComponent(object: ProjectObjectNode): ProjectObjectImage {
  return {
    ...getDefaultProjectObjectImage(),
    ...object.components?.image
  };
}

export function withProjectObjectImageComponent(
  object: ProjectObjectNode,
  image: ProjectObjectImage
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      image
    }
  };
}
