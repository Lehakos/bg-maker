import type {
  ProjectObjectScoreTrack,
  ProjectObjectScoreTrackMarker,
  ProjectObjectScoreTrackOrientation
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectScoreTrack,
  projectObjectScoreTrackMarkerCountLimits,
  projectObjectScoreTrackMarkerLabelMaxLength,
  projectObjectScoreTrackOrientations,
  projectObjectScoreTrackStepLimits,
  projectObjectScoreTrackValueLimits
} from "@bg-maker/shared";
import { clamp, parseRectTransformDraftValue, roundTo } from "./inspector-state-utils";

export type ScoreTrackFieldKey = keyof ProjectObjectScoreTrack;
export type ScoreTrackNumberFieldKey = Extract<
  ScoreTrackFieldKey,
  "maxValue" | "minValue" | "step"
>;
export type ScoreTrackMarkerFieldKey = keyof ProjectObjectScoreTrackMarker;
export type ScoreTrackMarkerDraft = {
  color: string;
  id: string;
  label: string;
  value: string;
};
export type ScoreTrackDraft = {
  markers: ScoreTrackMarkerDraft[];
  maxValue: string;
  minValue: string;
  orientation: ProjectObjectScoreTrackOrientation;
  showLabels: boolean;
  step: string;
};

export const scoreTrackNumberFieldSettings = {
  maxValue: {
    decimals: 0,
    max: projectObjectScoreTrackValueLimits.max,
    min: projectObjectScoreTrackValueLimits.min,
    step: 1
  },
  minValue: {
    decimals: 0,
    max: projectObjectScoreTrackValueLimits.max,
    min: projectObjectScoreTrackValueLimits.min,
    step: 1
  },
  step: {
    decimals: 0,
    max: projectObjectScoreTrackStepLimits.max,
    min: projectObjectScoreTrackStepLimits.min,
    step: 1
  }
} as const satisfies Record<
  ScoreTrackNumberFieldKey,
  { decimals: number; max: number; min: number; step: number }
>;

export const scoreTrackMarkerValueFieldSettings = {
  max: projectObjectScoreTrackValueLimits.max,
  min: projectObjectScoreTrackValueLimits.min,
  step: 1
} as const;

const scoreTrackOrientations = new Set<ProjectObjectScoreTrackOrientation>(
  projectObjectScoreTrackOrientations
);
const scoreTrackMarkerColors = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#7c3aed",
  "#0891b2"
] as const;

export function createScoreTrackDraft(scoreTrack: ProjectObjectScoreTrack): ScoreTrackDraft {
  return {
    markers: scoreTrack.markers.map(createScoreTrackMarkerDraft),
    maxValue: formatScoreTrackNumberValue(scoreTrack.maxValue, "maxValue"),
    minValue: formatScoreTrackNumberValue(scoreTrack.minValue, "minValue"),
    orientation: scoreTrack.orientation,
    showLabels: scoreTrack.showLabels,
    step: formatScoreTrackNumberValue(scoreTrack.step, "step")
  };
}

export function getScoreTrackWithDraftField(
  scoreTrack: ProjectObjectScoreTrack,
  fieldKey: ScoreTrackFieldKey,
  value: string | boolean
) {
  const nextScoreTrack = createNextScoreTrack(scoreTrack, fieldKey, value);

  if (!nextScoreTrack) {
    return null;
  }

  return areScoreTracksEqual(scoreTrack, nextScoreTrack) ? null : nextScoreTrack;
}

export function getScoreTrackWithAddedMarker(
  scoreTrack: ProjectObjectScoreTrack,
  markerId: string
) {
  if (scoreTrack.markers.length >= projectObjectScoreTrackMarkerCountLimits.max) {
    return null;
  }

  const markerIndex = scoreTrack.markers.length;
  const nextScoreTrack = normalizeScoreTrack({
    ...scoreTrack,
    markers: [
      ...scoreTrack.markers,
      {
        color: scoreTrackMarkerColors[markerIndex % scoreTrackMarkerColors.length],
        id: markerId.trim(),
        label: `Player ${markerIndex + 1}`,
        value: scoreTrack.minValue
      }
    ]
  });

  return areScoreTracksEqual(scoreTrack, nextScoreTrack) ? null : nextScoreTrack;
}

export function getScoreTrackWithRemovedMarker(
  scoreTrack: ProjectObjectScoreTrack,
  markerId: string
) {
  const nextScoreTrack = normalizeScoreTrack({
    ...scoreTrack,
    markers: scoreTrack.markers.filter((marker) => marker.id !== markerId)
  });

  return areScoreTracksEqual(scoreTrack, nextScoreTrack) ? null : nextScoreTrack;
}

export function getScoreTrackWithMarkerField(
  scoreTrack: ProjectObjectScoreTrack,
  markerId: string,
  fieldKey: ScoreTrackMarkerFieldKey,
  value: string
) {
  if (fieldKey === "id") {
    return null;
  }

  const markerIndex = scoreTrack.markers.findIndex((marker) => marker.id === markerId);

  if (markerIndex === -1) {
    return null;
  }

  const nextMarker = createNextScoreTrackMarker(scoreTrack.markers[markerIndex]!, fieldKey, value);

  if (!nextMarker) {
    return null;
  }

  const nextScoreTrack = normalizeScoreTrack({
    ...scoreTrack,
    markers: scoreTrack.markers.map((marker, index) =>
      index === markerIndex ? nextMarker : marker
    )
  });

  return areScoreTracksEqual(scoreTrack, nextScoreTrack) ? null : nextScoreTrack;
}

export function normalizeScoreTrackNumberValue(
  fieldKey: keyof typeof scoreTrackNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = scoreTrackNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeScoreTrackMarkerValue(value: number) {
  return roundTo(
    clamp(value, projectObjectScoreTrackValueLimits.min, projectObjectScoreTrackValueLimits.max),
    0
  );
}

export function formatScoreTrackNumberValue(
  value: number,
  fieldKey: keyof typeof scoreTrackNumberFieldSettings
) {
  const { decimals } = scoreTrackNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function formatScoreTrackMarkerValue(value: number) {
  return String(normalizeScoreTrackMarkerValue(value));
}

function createScoreTrackMarkerDraft(marker: ProjectObjectScoreTrackMarker): ScoreTrackMarkerDraft {
  return {
    color: marker.color,
    id: marker.id,
    label: marker.label,
    value: formatScoreTrackMarkerValue(marker.value)
  };
}

function createNextScoreTrack(
  scoreTrack: ProjectObjectScoreTrack,
  fieldKey: ScoreTrackFieldKey,
  value: string | boolean
): ProjectObjectScoreTrack | null {
  if (fieldKey === "orientation") {
    return typeof value === "string" &&
      scoreTrackOrientations.has(value as ProjectObjectScoreTrackOrientation)
      ? normalizeScoreTrack({
          ...scoreTrack,
          orientation: value as ProjectObjectScoreTrackOrientation
        })
      : null;
  }

  if (fieldKey === "showLabels") {
    return typeof value === "boolean" ? { ...scoreTrack, showLabels: value } : null;
  }

  if (fieldKey === "markers") {
    return null;
  }

  const parsedValue = typeof value === "string" ? parseRectTransformDraftValue(value) : null;

  if (parsedValue === null) {
    return null;
  }

  return normalizeScoreTrack({
    ...scoreTrack,
    [fieldKey]: normalizeScoreTrackNumberValue(fieldKey, parsedValue)
  });
}

function createNextScoreTrackMarker(
  marker: ProjectObjectScoreTrackMarker,
  fieldKey: ScoreTrackMarkerFieldKey,
  value: string
): ProjectObjectScoreTrackMarker | null {
  if (fieldKey === "label") {
    return {
      ...marker,
      label: value.slice(0, projectObjectScoreTrackMarkerLabelMaxLength)
    };
  }

  if (fieldKey === "color") {
    return /^#[0-9a-fA-F]{6}$/.test(value) ? { ...marker, color: value.toLowerCase() } : null;
  }

  if (fieldKey === "value") {
    const parsedValue = parseRectTransformDraftValue(value);

    return parsedValue === null
      ? null
      : {
          ...marker,
          value: normalizeScoreTrackMarkerValue(parsedValue)
        };
  }

  return null;
}

function normalizeScoreTrack(scoreTrack: ProjectObjectScoreTrack): ProjectObjectScoreTrack {
  const defaultScoreTrack = getDefaultProjectObjectScoreTrack();
  const minValue = normalizeScoreTrackNumberValue("minValue", scoreTrack.minValue);
  const step = normalizeScoreTrackNumberValue("step", scoreTrack.step);
  const maxValue = Math.max(
    minValue + step,
    normalizeScoreTrackNumberValue("maxValue", scoreTrack.maxValue)
  );
  const markers = scoreTrack.markers
    .slice(0, projectObjectScoreTrackMarkerCountLimits.max)
    .map((marker, index) =>
      normalizeScoreTrackMarker(
        marker,
        defaultScoreTrack.markers[index] ?? marker,
        minValue,
        maxValue
      )
    )
    .filter((marker): marker is ProjectObjectScoreTrackMarker => Boolean(marker.id));

  return {
    markers,
    maxValue,
    minValue,
    orientation: scoreTrackOrientations.has(scoreTrack.orientation)
      ? scoreTrack.orientation
      : defaultScoreTrack.orientation,
    showLabels:
      typeof scoreTrack.showLabels === "boolean"
        ? scoreTrack.showLabels
        : defaultScoreTrack.showLabels,
    step
  };
}

function normalizeScoreTrackMarker(
  marker: ProjectObjectScoreTrackMarker,
  fallback: ProjectObjectScoreTrackMarker,
  minValue: number,
  maxValue: number
): ProjectObjectScoreTrackMarker {
  return {
    color: /^#[0-9a-fA-F]{6}$/.test(marker.color) ? marker.color.toLowerCase() : fallback.color,
    id: marker.id.trim(),
    label: marker.label.slice(0, projectObjectScoreTrackMarkerLabelMaxLength),
    value: Math.min(maxValue, Math.max(minValue, normalizeScoreTrackMarkerValue(marker.value)))
  };
}

function areScoreTracksEqual(left: ProjectObjectScoreTrack, right: ProjectObjectScoreTrack) {
  return (
    left.maxValue === right.maxValue &&
    left.minValue === right.minValue &&
    left.orientation === right.orientation &&
    left.showLabels === right.showLabels &&
    left.step === right.step &&
    left.markers.length === right.markers.length &&
    left.markers.every((leftMarker, index) => {
      const rightMarker = right.markers[index];

      return (
        Boolean(rightMarker) &&
        leftMarker.color === rightMarker.color &&
        leftMarker.id === rightMarker.id &&
        leftMarker.label === rightMarker.label &&
        leftMarker.value === rightMarker.value
      );
    })
  );
}
