import { useMemo } from "react";
import type { LayoutZone, LayoutZoneContent } from "@bg-maker/shared";

export type ZoneEditorState = {
  activeZone: LayoutZone | null;
  selectedZoneId: string | null;
  zoneOptions: { value: string; label: string }[];
  zones: LayoutZone[];
  onSelectedZoneIdChange: (zoneId: string | null) => void;
};

export function useZoneEditor({
  selectedZoneId,
  zones,
  onSelectedZoneIdChange
}: {
  selectedZoneId: string | null;
  zones: LayoutZone[];
  onSelectedZoneIdChange: (zoneId: string | null) => void;
}): ZoneEditorState {
  const activeZone =
    selectedZoneId && zones.some((zone) => zone.id === selectedZoneId)
      ? (zones.find((zone) => zone.id === selectedZoneId) ?? null)
      : (zones[0] ?? null);
  const zoneOptions = useMemo(
    () =>
      zones.map((zone) => ({
        value: zone.id,
        label: `${zone.name} (${getZoneContentLabel(zone.content)})`
      })),
    [zones]
  );

  return {
    activeZone,
    selectedZoneId,
    zoneOptions,
    zones,
    onSelectedZoneIdChange
  };
}

function getZoneContentLabel(content: LayoutZoneContent) {
  return content.type === "text" ? "Text" : titleCase(content.visualType);
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
