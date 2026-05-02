import type { ProjectObjectLayout, ProjectObjectNode } from "@bg-maker/shared";
import { getDefaultProjectObjectLayout } from "@bg-maker/shared";
import {
  getProjectObjectDoubleSideComponent,
  getProjectObjectSideComponent,
  withProjectObjectSideComponent
} from "./double-side-component";

export function getProjectObjectLayoutComponent(object: ProjectObjectNode): ProjectObjectLayout {
  return {
    ...getDefaultProjectObjectLayout(),
    ...object.components?.layout,
    ...getProjectObjectSideComponent(object, "layout")
  };
}

export function withProjectObjectLayoutComponent(
  object: ProjectObjectNode,
  layout: ProjectObjectLayout
): ProjectObjectNode {
  if (getProjectObjectDoubleSideComponent(object).enabled) {
    return withProjectObjectSideComponent(object, "layout", layout);
  }

  return {
    ...object,
    components: {
      ...object.components,
      layout
    }
  };
}
