import type { ProjectObjectNode, ProjectObjectText } from "@bg-maker/shared";
import { getDefaultProjectObjectText } from "@bg-maker/shared";

export function getProjectObjectTextComponent(object: ProjectObjectNode): ProjectObjectText {
  return {
    ...getDefaultProjectObjectText(object.kind, object.name),
    ...object.components?.text
  };
}

export function withProjectObjectTextComponent(
  object: ProjectObjectNode,
  text: ProjectObjectText
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      text
    }
  };
}
