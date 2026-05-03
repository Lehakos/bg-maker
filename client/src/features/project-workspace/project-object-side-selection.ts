import type { ProjectObjectSide } from "@bg-maker/shared";

export type ProjectObjectSideSelections = Record<string, ProjectObjectSide>;

export function getProjectObjectSideSelectionKey(fileNodeId: string, objectId: string) {
  return `${fileNodeId}:${objectId}`;
}

export function getProjectObjectSideSelection(
  selections: ProjectObjectSideSelections,
  fileNodeId: string,
  objectId: string
): ProjectObjectSide {
  return selections[getProjectObjectSideSelectionKey(fileNodeId, objectId)] ?? "front";
}

export function getProjectObjectSideSelectionsWithSelection(
  selections: ProjectObjectSideSelections,
  fileNodeId: string,
  objectId: string,
  activeSide: ProjectObjectSide
): ProjectObjectSideSelections {
  const key = getProjectObjectSideSelectionKey(fileNodeId, objectId);
  const currentSide = selections[key] ?? "front";

  if (currentSide === activeSide) {
    return selections;
  }

  const nextSelections = { ...selections };

  if (activeSide === "front") {
    delete nextSelections[key];
  } else {
    nextSelections[key] = activeSide;
  }

  return nextSelections;
}
