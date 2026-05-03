import type { ProjectObjectNode, ProjectObjectText } from "@bg-maker/shared";
import { getDefaultProjectObjectText } from "@bg-maker/shared";
import {
  getProjectObjectDoubleSideComponent,
  getProjectObjectSideComponent,
  withProjectObjectSideComponent
} from "./double-side-component";

export function getProjectObjectTextComponent(object: ProjectObjectNode): ProjectObjectText {
  return {
    ...getDefaultProjectObjectText(object.kind, object.name),
    ...object.components?.text,
    ...getProjectObjectSideComponent(object, "text")
  };
}

export function withProjectObjectTextComponent(
  object: ProjectObjectNode,
  text: ProjectObjectText
): ProjectObjectNode {
  if (getProjectObjectDoubleSideComponent(object).enabled) {
    return withProjectObjectSideComponent(object, "text", text);
  }

  return {
    ...object,
    components: {
      ...object.components,
      text
    }
  };
}
