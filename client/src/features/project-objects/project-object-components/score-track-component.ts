import type {
  ProjectObjectNode,
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

const scoreTrackOrientations = new Set<ProjectObjectScoreTrackOrientation>(
  projectObjectScoreTrackOrientations
);

export function getProjectObjectScoreTrackComponent(
  object: ProjectObjectNode
): ProjectObjectScoreTrack {
  return normalizeProjectObjectScoreTrackComponent({
    ...getDefaultProjectObjectScoreTrack(),
    ...object.components?.scoreTrack
  });
}

export function withProjectObjectScoreTrackComponent(
  object: ProjectObjectNode,
  scoreTrack: ProjectObjectScoreTrack
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      scoreTrack: normalizeProjectObjectScoreTrackComponent(scoreTrack)
    }
  };
}

export function normalizeProjectObjectScoreTrackComponent(
  scoreTrack: Partial<ProjectObjectScoreTrack>
): ProjectObjectScoreTrack {
  const defaultScoreTrack = getDefaultProjectObjectScoreTrack();
  const minValue = normalizeScoreTrackInteger(scoreTrack.minValue, defaultScoreTrack.minValue);
  const step = normalizeScoreTrackInteger(scoreTrack.step, defaultScoreTrack.step, {
    max: projectObjectScoreTrackStepLimits.max,
    min: projectObjectScoreTrackStepLimits.min
  });
  const maxValue = Math.max(
    minValue + step,
    normalizeScoreTrackInteger(scoreTrack.maxValue, defaultScoreTrack.maxValue)
  );

  return {
    markers: normalizeScoreTrackMarkers(
      scoreTrack.markers,
      defaultScoreTrack.markers,
      minValue,
      maxValue
    ),
    maxValue,
    minValue,
    orientation: scoreTrackOrientations.has(
      scoreTrack.orientation as ProjectObjectScoreTrackOrientation
    )
      ? (scoreTrack.orientation as ProjectObjectScoreTrackOrientation)
      : defaultScoreTrack.orientation,
    showLabels:
      typeof scoreTrack.showLabels === "boolean"
        ? scoreTrack.showLabels
        : defaultScoreTrack.showLabels,
    step
  };
}

function normalizeScoreTrackMarkers(
  markers: ProjectObjectScoreTrack["markers"] | undefined,
  fallbackMarkers: ProjectObjectScoreTrack["markers"],
  minValue: number,
  maxValue: number
) {
  const sourceMarkers =
    Array.isArray(markers) && markers.length >= projectObjectScoreTrackMarkerCountLimits.min
      ? markers
      : fallbackMarkers;

  return sourceMarkers
    .slice(0, projectObjectScoreTrackMarkerCountLimits.max)
    .map((marker, index) =>
      normalizeScoreTrackMarker(
        marker,
        fallbackMarkers[index] ?? fallbackMarkers[0]!,
        minValue,
        maxValue
      )
    )
    .filter((marker): marker is ProjectObjectScoreTrackMarker => Boolean(marker.id));
}

function normalizeScoreTrackMarker(
  marker: Partial<ProjectObjectScoreTrackMarker>,
  fallback: ProjectObjectScoreTrackMarker,
  minValue: number,
  maxValue: number
): ProjectObjectScoreTrackMarker {
  const id = typeof marker.id === "string" ? marker.id.trim() : fallback.id;
  const label = typeof marker.label === "string" ? marker.label : fallback.label;

  return {
    color: normalizeHexColor(marker.color, fallback.color),
    id,
    label: label.slice(0, projectObjectScoreTrackMarkerLabelMaxLength),
    value: clampScoreTrackValue(
      normalizeScoreTrackInteger(marker.value, fallback.value),
      minValue,
      maxValue
    )
  };
}

function normalizeScoreTrackInteger(
  value: unknown,
  fallback: number,
  limits: { max: number; min: number } = projectObjectScoreTrackValueLimits
) {
  const normalizedValue = typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.min(limits.max, Math.max(limits.min, Math.round(normalizedValue)));
}

function clampScoreTrackValue(value: number, minValue: number, maxValue: number) {
  return Math.min(maxValue, Math.max(minValue, value));
}

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();

  return /^#[0-9a-fA-F]{6}$/.test(trimmedValue) ? trimmedValue.toLowerCase() : fallback;
}
