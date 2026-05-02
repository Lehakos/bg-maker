import type {
  ProjectObjectDie,
  ProjectObjectDieFace,
  ProjectObjectDieFaceMode,
  ProjectObjectNode
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectDie,
  getDefaultProjectObjectDieFace,
  normalizeProjectObjectDieActiveFace,
  normalizeProjectObjectDieFaceCount,
  projectObjectDieFaceLabelMaxLength,
  projectObjectDieFaceModes
} from "@bg-maker/shared";

const dieFaceModes = new Set<ProjectObjectDieFaceMode>(projectObjectDieFaceModes);

export function getProjectObjectDieComponent(object: ProjectObjectNode): ProjectObjectDie {
  return normalizeProjectObjectDieComponent({
    ...getDefaultProjectObjectDie(),
    ...object.components?.die
  });
}

export function withProjectObjectDieComponent(
  object: ProjectObjectNode,
  die: ProjectObjectDie
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      die: normalizeProjectObjectDieComponent(die)
    }
  };
}

export function normalizeProjectObjectDieComponent(
  die: Partial<ProjectObjectDie>
): ProjectObjectDie {
  const faceCount = normalizeProjectObjectDieFaceCount(
    typeof die.faceCount === "number" ? die.faceCount : getDefaultProjectObjectDie().faceCount
  );
  const activeFace = normalizeProjectObjectDieActiveFace(
    typeof die.activeFace === "number" ? die.activeFace : getDefaultProjectObjectDie().activeFace,
    faceCount
  );

  return {
    activeFace,
    faceCount,
    faces: normalizeProjectObjectDieFaces(die.faces, faceCount)
  };
}

function normalizeProjectObjectDieFaces(
  faces: ProjectObjectDieFace[] | undefined,
  faceCount: number
) {
  return Array.from({ length: faceCount }, (_, index) =>
    normalizeProjectObjectDieFace(faces?.[index], index + 1)
  );
}

function normalizeProjectObjectDieFace(
  face: Partial<ProjectObjectDieFace> | undefined,
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
