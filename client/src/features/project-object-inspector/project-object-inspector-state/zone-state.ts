import type { ProjectObjectZone } from "@bg-maker/shared";
import {
  getDefaultProjectObjectZone,
  normalizeProjectObjectZoneSlots,
  projectObjectZoneSlotLimits
} from "@bg-maker/shared";
import { parseRectTransformDraftValue, roundTo } from "./inspector-state-utils";

export type ZoneFieldKey = keyof ProjectObjectZone;
export type ZoneNumberFieldKey = Extract<ZoneFieldKey, "slots">;
export type ZoneDraft = {
  mode: ProjectObjectZone["mode"];
  sizeReferenceObjectFileId: string;
  slots: string;
};

export const zoneNumberFieldSettings = {
  slots: {
    decimals: 0,
    max: projectObjectZoneSlotLimits.max,
    min: projectObjectZoneSlotLimits.min,
    step: 1
  }
} as const satisfies Record<
  ZoneNumberFieldKey,
  { decimals: number; max: number; min: number; step: number }
>;

export function createZoneDraft(zone: ProjectObjectZone): ZoneDraft {
  return {
    mode: zone.mode,
    sizeReferenceObjectFileId: zone.sizeReferenceObjectFileId,
    slots: formatZoneNumberValue(zone.slots, "slots")
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
  if (fieldKey === "slots") {
    return normalizeProjectObjectZoneSlots(value);
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
  if (fieldKey === "mode") {
    return value === "free" || value === "slots"
      ? {
          ...zone,
          mode: value
        }
      : null;
  }

  if (fieldKey === "sizeReferenceObjectFileId") {
    return {
      ...zone,
      sizeReferenceObjectFileId: value.trim()
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
    mode: zone.mode === "slots" ? "slots" : "free",
    sizeReferenceObjectFileId:
      typeof zone.sizeReferenceObjectFileId === "string"
        ? zone.sizeReferenceObjectFileId.trim()
        : defaultZone.sizeReferenceObjectFileId,
    slots: normalizeProjectObjectZoneSlots(zone.slots)
  };
}

function areZonesEqual(left: ProjectObjectZone, right: ProjectObjectZone) {
  return (
    left.mode === right.mode &&
    left.sizeReferenceObjectFileId === right.sizeReferenceObjectFileId &&
    left.slots === right.slots
  );
}
