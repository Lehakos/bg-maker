import type { ProjectObjectAppearance, ProjectObjectNode } from "@bg-maker/shared";
import { getDefaultProjectObjectAppearance } from "@bg-maker/shared";
import {
  getProjectObjectDoubleSideComponent,
  getProjectObjectSideComponent,
  withProjectObjectSideComponent
} from "./double-side-component";

export function getProjectObjectAppearanceComponent(
  object: ProjectObjectNode
): ProjectObjectAppearance {
  return {
    ...getDefaultProjectObjectAppearance(object.kind),
    ...object.components?.appearance,
    ...getProjectObjectSideComponent(object, "appearance")
  };
}

export function withProjectObjectAppearanceComponent(
  object: ProjectObjectNode,
  appearance: ProjectObjectAppearance
): ProjectObjectNode {
  if (getProjectObjectDoubleSideComponent(object).enabled) {
    return withProjectObjectSideComponent(object, "appearance", appearance);
  }

  return {
    ...object,
    components: {
      ...object.components,
      appearance
    }
  };
}
