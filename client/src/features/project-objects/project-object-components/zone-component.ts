import type { ProjectObjectNode, ProjectObjectZone } from "@bg-maker/shared";
import { getDefaultProjectObjectZone, normalizeProjectObjectZoneSlots } from "@bg-maker/shared";

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
    mode: zone.mode === "slots" ? "slots" : "free",
    sizeReferenceObjectFileId:
      typeof zone.sizeReferenceObjectFileId === "string"
        ? zone.sizeReferenceObjectFileId.trim()
        : defaultZone.sizeReferenceObjectFileId,
    slots: normalizeProjectObjectZoneSlots(zone.slots ?? defaultZone.slots)
  };
}
