import type { ProjectCompositionSettings, ProjectObjectNode } from "@bg-maker/shared";
import { getDefaultProjectCompositionSettings } from "@bg-maker/shared";

export function getProjectObjectCompositionComponent(
  object: ProjectObjectNode
): ProjectCompositionSettings {
  return {
    ...getDefaultProjectCompositionSettings(),
    ...object.components?.composition,
    guides: object.components?.composition?.guides ?? []
  };
}

export function withProjectObjectCompositionComponent(
  object: ProjectObjectNode,
  composition: ProjectCompositionSettings
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      composition
    }
  };
}
