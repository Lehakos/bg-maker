import type { ProjectCompositionGuide, ProjectCompositionGuideAxis } from "@bg-maker/shared";
import {
  getDefaultProjectCompositionSettings,
  type ProjectCompositionSettings
} from "@bg-maker/shared";
import { normalizeFiniteNumber } from "./project-normalization-utils.js";

const maxProjectCompositionGuides = 200;
const maxProjectCompositionGuidePosition = 10000;
const projectCompositionGuideAxes = new Set<ProjectCompositionGuideAxis>([
  "horizontal",
  "vertical"
]);

export function normalizeProjectCompositionSettings(value: unknown): ProjectCompositionSettings {
  const defaults = getDefaultProjectCompositionSettings();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    guides: normalizeProjectCompositionGuides(record.guides),
    rulersVisible:
      typeof record.rulersVisible === "boolean" ? record.rulersVisible : defaults.rulersVisible,
    snapToGuides:
      typeof record.snapToGuides === "boolean" ? record.snapToGuides : defaults.snapToGuides,
    snapToObjects:
      typeof record.snapToObjects === "boolean" ? record.snapToObjects : defaults.snapToObjects
  };
}

function normalizeProjectCompositionGuides(value: unknown): ProjectCompositionGuide[] {
  const guides = Array.isArray(value) ? value : [];
  const guideIds = new Set<string>();
  const normalizedGuides: ProjectCompositionGuide[] = [];

  for (const guide of guides.slice(0, maxProjectCompositionGuides)) {
    const normalizedGuide = normalizeProjectCompositionGuide(guide);

    if (!normalizedGuide || guideIds.has(normalizedGuide.id)) {
      continue;
    }

    guideIds.add(normalizedGuide.id);
    normalizedGuides.push(normalizedGuide);
  }

  return normalizedGuides;
}

function normalizeProjectCompositionGuide(value: unknown): ProjectCompositionGuide | null {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const axis = projectCompositionGuideAxes.has(record.axis as ProjectCompositionGuideAxis)
    ? (record.axis as ProjectCompositionGuideAxis)
    : null;

  if (!id || !axis) {
    return null;
  }

  return {
    axis,
    id,
    locked: record.locked === true,
    position: normalizeFiniteNumber(record.position, 0, {
      max: maxProjectCompositionGuidePosition,
      min: -maxProjectCompositionGuidePosition
    }),
    visible: record.visible !== false
  };
}
