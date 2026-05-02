import type { ProjectObjectImage, ProjectObjectNode } from "@bg-maker/shared";
import { getDefaultProjectObjectImage } from "@bg-maker/shared";
import {
  getProjectObjectDoubleSideComponent,
  getProjectObjectSideComponent,
  withProjectObjectSideComponent
} from "./double-side-component";

export function getProjectObjectImageComponent(object: ProjectObjectNode): ProjectObjectImage {
  return {
    ...getDefaultProjectObjectImage(),
    ...object.components?.image,
    ...getProjectObjectSideComponent(object, "image")
  };
}

export function withProjectObjectImageComponent(
  object: ProjectObjectNode,
  image: ProjectObjectImage
): ProjectObjectNode {
  if (getProjectObjectDoubleSideComponent(object).enabled) {
    return withProjectObjectSideComponent(object, "image", image);
  }

  return {
    ...object,
    components: {
      ...object.components,
      image
    }
  };
}
