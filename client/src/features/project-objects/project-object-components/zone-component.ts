import type { ProjectObjectNode, ProjectObjectZone } from "@bg-maker/shared";
import {
  getDefaultProjectObjectZone,
  normalizeProjectObjectZoneCapacity
} from "@bg-maker/shared";

export function getProjectObjectZoneComponent(object: ProjectObjectNode): ProjectObjectZone {
  return normalizeProjectObjectZoneComponent({
    ...getDefaultProjectObjectZone(),
    ...object.components?.zone
  });
}

export function withProjectObjectZoneComponent(
  object: ProjectObjectNode,
  zone: ProjectObjectZone
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      zone: normalizeProjectObjectZoneComponent(zone)
    }
  };
}

export function normalizeProjectObjectZoneComponent(
  zone: Partial<ProjectObjectZone>
): ProjectObjectZone {
  const defaultZone = getDefaultProjectObjectZone();

  return {
    capacity: normalizeProjectObjectZoneCapacity(zone.capacity ?? defaultZone.capacity),
    referenceObjectFileId:
      typeof zone.referenceObjectFileId === "string"
        ? zone.referenceObjectFileId.trim()
        : defaultZone.referenceObjectFileId
  };
}
