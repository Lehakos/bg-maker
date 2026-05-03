import type { ProjectObjectZone } from "@bg-maker/shared";
import {
  getDefaultProjectObjectZone,
  normalizeProjectObjectZoneCapacity,
  projectObjectZoneCapacityLimits
} from "@bg-maker/shared";
import { parseRectTransformDraftValue, roundTo } from "./inspector-state-utils";

export type ZoneFieldKey = keyof ProjectObjectZone;
export type ZoneNumberFieldKey = Extract<ZoneFieldKey, "capacity">;
export type ZoneDraft = {
  capacity: string;
  referenceObjectFileId: string;
};

export const zoneNumberFieldSettings = {
  capacity: {
    decimals: 0,
    max: projectObjectZoneCapacityLimits.max,
    min: projectObjectZoneCapacityLimits.min,
    step: 1
  }
} as const satisfies Record<
  ZoneNumberFieldKey,
  { decimals: number; max: number; min: number; step: number }
>;

export function createZoneDraft(zone: ProjectObjectZone): ZoneDraft {
  return {
    capacity: formatZoneNumberValue(zone.capacity, "capacity"),
    referenceObjectFileId: zone.referenceObjectFileId
  };
}

export function getZoneWithDraftField(
  zone: ProjectObjectZone,
  fieldKey: ZoneFieldKey,
  value: string
) {
  const nextZone = createNextZone(zone, fieldKey, value);

  if (!nextZone) {
    return null;
  }

  return areZonesEqual(zone, nextZone) ? null : nextZone;
}

export function normalizeZoneNumberValue(
  fieldKey: keyof typeof zoneNumberFieldSettings,
  value: number
) {
  if (fieldKey === "capacity") {
    return normalizeProjectObjectZoneCapacity(value);
  }

  return value;
}

export function formatZoneNumberValue(
  value: number,
  fieldKey: keyof typeof zoneNumberFieldSettings
) {
  const { decimals } = zoneNumberFieldSettings[fieldKey];

  return String(roundTo(normalizeZoneNumberValue(fieldKey, value), decimals));
}

function createNextZone(
  zone: ProjectObjectZone,
  fieldKey: ZoneFieldKey,
  value: string
): ProjectObjectZone | null {
  if (fieldKey === "referenceObjectFileId") {
    return {
      ...zone,
      referenceObjectFileId: value.trim()
    };
  }

  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  return normalizeZone({
    ...zone,
    [fieldKey]: normalizeZoneNumberValue(fieldKey, parsedValue)
  });
}

function normalizeZone(zone: ProjectObjectZone): ProjectObjectZone {
  const defaultZone = getDefaultProjectObjectZone();

  return {
    ...zone,
    capacity: normalizeProjectObjectZoneCapacity(zone.capacity),
    referenceObjectFileId:
      typeof zone.referenceObjectFileId === "string"
        ? zone.referenceObjectFileId.trim()
        : defaultZone.referenceObjectFileId
  };
}

function areZonesEqual(left: ProjectObjectZone, right: ProjectObjectZone) {
  return (
    left.capacity === right.capacity &&
    left.referenceObjectFileId === right.referenceObjectFileId
  );
}
