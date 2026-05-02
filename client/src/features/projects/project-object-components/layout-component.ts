import type { ProjectObjectKind, ProjectObjectLayout, ProjectObjectNode } from "@bg-maker/shared";
import { getDefaultProjectObjectLayout } from "@bg-maker/shared";
import {
  getProjectObjectDoubleSideComponent,
  getProjectObjectSideComponent,
  withProjectObjectSideComponent
} from "./double-side-component";

export function getProjectObjectLayoutComponent(object: ProjectObjectNode): ProjectObjectLayout {
  const layout = {
    ...getDefaultProjectObjectLayout(object.kind),
    ...object.components?.layout,
    ...getProjectObjectSideComponent(object, "layout")
  };

  return normalizeProjectObjectLayoutComponent(layout, object.kind);
}

export function withProjectObjectLayoutComponent(
  object: ProjectObjectNode,
  layout: ProjectObjectLayout
): ProjectObjectNode {
  const nextLayout = normalizeProjectObjectLayoutComponent(layout, object.kind);

  if (getProjectObjectDoubleSideComponent(object).enabled) {
    return withProjectObjectSideComponent(object, "layout", nextLayout);
  }

  return {
    ...object,
    components: {
      ...object.components,
      layout: nextLayout
    }
  };
}

function normalizeProjectObjectLayoutComponent(
  layout: ProjectObjectLayout,
  kind: ProjectObjectKind
): ProjectObjectLayout {
  if (kind === "zone") {
    return {
      ...layout,
      alignItems: "start",
      justifyContent: "start",
      mode: layout.mode === "free" ? "grid" : layout.mode
    };
  }

  return layout;
}
