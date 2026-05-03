import type {
  ProjectObjectDie,
  ProjectObjectDieFace,
  ProjectObjectDieFaceMode
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectDieFace,
  normalizeProjectObjectDieActiveFace,
  normalizeProjectObjectDieFaceCount,
  projectObjectDieFaceCountLimits,
  projectObjectDieFaceLabelMaxLength,
  projectObjectDieFaceModes
} from "@bg-maker/shared";
import { clamp, parseRectTransformDraftValue, roundTo } from "./inspector-state-utils";

export type DieFieldKey = "activeFace" | "faceCount";
export type DieFaceFieldKey = keyof ProjectObjectDieFace;
export type DieDraft = {
  activeFace: string;
  faceCount: string;
};

export const dieNumberFieldSettings = {
  faceCount: {
    decimals: 0,
    max: projectObjectDieFaceCountLimits.max,
    min: projectObjectDieFaceCountLimits.min,
    step: 1
  }
} as const satisfies Record<
  Extract<DieFieldKey, "faceCount">,
  { decimals: number; max: number; min: number; step: number }
>;

const dieFaceModes = new Set<ProjectObjectDieFaceMode>(projectObjectDieFaceModes);

export function createDieDraft(die: ProjectObjectDie): DieDraft {
  return {
    activeFace: String(normalizeProjectObjectDieActiveFace(die.activeFace, die.faceCount)),
    faceCount: formatDieNumberValue(die.faceCount, "faceCount")
  };
}

export function getDieWithDraftField(die: ProjectObjectDie, fieldKey: DieFieldKey, value: string) {
  const nextDie = createNextDie(die, fieldKey, value);

  if (!nextDie) {
    return null;
  }

  return areDiesEqual(die, nextDie) ? null : nextDie;
}

export function getDieFaces(die: ProjectObjectDie): ProjectObjectDieFace[] {
  const faceCount = normalizeProjectObjectDieFaceCount(die.faceCount);

  return Array.from({ length: faceCount }, (_, index) =>
    normalizeDieFace(die.faces[index], index + 1)
  );
}

export function getDieFace(die: ProjectObjectDie, faceNumber: number) {
  const faces = getDieFaces(die);
  const normalizedFaceNumber = normalizeProjectObjectDieActiveFace(faceNumber, faces.length);

  return faces[normalizedFaceNumber - 1] ?? getDefaultProjectObjectDieFace(normalizedFaceNumber);
}

export function getDieWithFaceField(
  die: ProjectObjectDie,
  faceNumber: number,
  fieldKey: DieFaceFieldKey,
  value: string
) {
  const normalizedDie = normalizeDie(die);
  const normalizedFaceNumber = normalizeProjectObjectDieActiveFace(
    faceNumber,
    normalizedDie.faceCount
  );
  const faceIndex = normalizedFaceNumber - 1;
  const currentFace = normalizedDie.faces[faceIndex] ?? getDefaultProjectObjectDieFace(faceNumber);
  const nextFace = createNextDieFace(currentFace, fieldKey, value);

  if (!nextFace) {
    return null;
  }

  const nextDie = {
    ...normalizedDie,
    activeFace: normalizedFaceNumber,
    faces: normalizedDie.faces.map((face, index) => (index === faceIndex ? nextFace : face))
  };

  return areDiesEqual(normalizedDie, nextDie) ? null : nextDie;
}

export function normalizeDieNumberValue(
  fieldKey: keyof typeof dieNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = dieNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function formatDieNumberValue(value: number, fieldKey: keyof typeof dieNumberFieldSettings) {
  const { decimals } = dieNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

function createNextDie(
  die: ProjectObjectDie,
  fieldKey: DieFieldKey,
  value: string
): ProjectObjectDie | null {
  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null) {
    return null;
  }

  if (fieldKey === "faceCount") {
    const faceCount = normalizeProjectObjectDieFaceCount(parsedValue);
    const faces = resizeDieFaces(die, faceCount);

    return {
      ...die,
      activeFace: normalizeProjectObjectDieActiveFace(die.activeFace, faceCount),
      faceCount,
      faces
    };
  }

  if (fieldKey === "activeFace") {
    return {
      ...die,
      activeFace: normalizeProjectObjectDieActiveFace(parsedValue, die.faceCount)
    };
  }

  return null;
}

function createNextDieFace(
  face: ProjectObjectDieFace,
  fieldKey: DieFaceFieldKey,
  value: string
): ProjectObjectDieFace | null {
  if (fieldKey === "mode") {
    return dieFaceModes.has(value as ProjectObjectDieFaceMode)
      ? { ...face, mode: value as ProjectObjectDieFaceMode }
      : null;
  }

  if (fieldKey === "label") {
    return {
      ...face,
      label: value.slice(0, projectObjectDieFaceLabelMaxLength)
    };
  }

  if (fieldKey === "imageAssetId") {
    return {
      ...face,
      imageAssetId: value
    };
  }

  return null;
}

function normalizeDie(die: ProjectObjectDie): ProjectObjectDie {
  const faceCount = normalizeProjectObjectDieFaceCount(die.faceCount);

  return {
    activeFace: normalizeProjectObjectDieActiveFace(die.activeFace, faceCount),
    faceCount,
    faces: getDieFaces({ ...die, faceCount })
  };
}

function resizeDieFaces(die: ProjectObjectDie, faceCount: number) {
  const currentFaces = getDieFaces(die);

  return Array.from({ length: faceCount }, (_, index) =>
    normalizeDieFace(currentFaces[index], index + 1)
  );
}

function normalizeDieFace(
  face: ProjectObjectDieFace | undefined,
  faceNumber: number
): ProjectObjectDieFace {
  const defaultFace = getDefaultProjectObjectDieFace(faceNumber);
  const mode = dieFaceModes.has(face?.mode as ProjectObjectDieFaceMode)
    ? (face?.mode as ProjectObjectDieFaceMode)
    : defaultFace.mode;

  return {
    imageAssetId: typeof face?.imageAssetId === "string" ? face.imageAssetId : "",
    label:
      typeof face?.label === "string"
        ? face.label.slice(0, projectObjectDieFaceLabelMaxLength)
        : defaultFace.label,
    mode
  };
}

function areDiesEqual(left: ProjectObjectDie, right: ProjectObjectDie) {
  return (
    left.activeFace === right.activeFace &&
    left.faceCount === right.faceCount &&
    areDieFacesEqual(getDieFaces(left), getDieFaces(right))
  );
}

function areDieFacesEqual(
  left: readonly ProjectObjectDieFace[],
  right: readonly ProjectObjectDieFace[]
) {
  return (
    left.length === right.length &&
    left.every((leftFace, index) => {
      const rightFace = right[index];

      return (
        Boolean(rightFace) &&
        leftFace.imageAssetId === rightFace.imageAssetId &&
        leftFace.label === rightFace.label &&
        leftFace.mode === rightFace.mode
      );
    })
  );
}
