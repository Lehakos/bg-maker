import type {
  ProjectFileNode,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectSide
} from "@bg-maker/shared";
import type { EditorCommand } from "./editor-command-history";
import { findProjectFileNode } from "../project-files/project-file-tree";
import {
  isProjectObjectTreeFileNode,
  setProjectObjectNodeRectTransform,
  updateProjectFileNodeObjectTree
} from "../project-objects/project-object-tree";
import {
  getProjectObjectSideSelectionsWithSelection,
  type ProjectObjectSideSelections
} from "./project-object-side-selection";

export type ProjectEditorState = {
  fileTree: ProjectFileNode[];
  objectSideSelections: ProjectObjectSideSelections;
};

export type ProjectEditorCommand = EditorCommand<ProjectEditorState>;

export function createReplaceProjectFileTreeCommand({
  after,
  before,
  label
}: {
  after: ProjectFileNode[];
  before: ProjectFileNode[];
  label: string;
}): ProjectEditorCommand {
  return {
    execute: (state) => (state.fileTree === after ? state : { ...state, fileTree: after }),
    id: crypto.randomUUID(),
    label,
    undo: (state) => (state.fileTree === before ? state : { ...state, fileTree: before })
  };
}

export function createUpdateProjectObjectTreeCommand({
  after,
  before,
  fileNodeId,
  label
}: {
  after: ProjectObjectNode[];
  before: ProjectObjectNode[];
  fileNodeId: string;
  label: string;
}): ProjectEditorCommand {
  return {
    execute: (state) => updateProjectEditorStateObjectTree(state, fileNodeId, after),
    id: crypto.randomUUID(),
    label,
    undo: (state) => updateProjectEditorStateObjectTree(state, fileNodeId, before)
  };
}

export function createSetProjectObjectSideSelectionCommand({
  after,
  before,
  fileNodeId,
  objectId
}: {
  after: ProjectObjectSide;
  before: ProjectObjectSide;
  fileNodeId: string;
  objectId: string;
}): ProjectEditorCommand {
  return {
    execute: (state) => updateProjectEditorStateObjectSide(state, fileNodeId, objectId, after),
    id: crypto.randomUUID(),
    label: `Show ${after}`,
    undo: (state) => updateProjectEditorStateObjectSide(state, fileNodeId, objectId, before)
  };
}

export function createUpdateProjectObjectRectTransformCommand({
  after,
  before,
  fileNodeId,
  label,
  objectId
}: {
  after: ProjectObjectRectTransform;
  before: ProjectObjectRectTransform;
  fileNodeId: string;
  label: string;
  objectId: string;
}): ProjectEditorCommand {
  return {
    execute: (state) =>
      updateProjectEditorStateWithRectTransform(state, fileNodeId, objectId, after),
    id: crypto.randomUUID(),
    label,
    undo: (state) =>
      updateProjectEditorStateWithRectTransform(state, fileNodeId, objectId, before)
  };
}

function updateProjectEditorStateObjectTree(
  state: ProjectEditorState,
  fileNodeId: string,
  objectTree: ProjectObjectNode[]
): ProjectEditorState {
  const nextFileTree = updateProjectFileNodeObjectTree(state.fileTree, fileNodeId, objectTree);

  return nextFileTree === state.fileTree ? state : { ...state, fileTree: nextFileTree };
}

function updateProjectEditorStateObjectSide(
  state: ProjectEditorState,
  fileNodeId: string,
  objectId: string,
  activeSide: ProjectObjectSide
): ProjectEditorState {
  const nextObjectSideSelections = getProjectObjectSideSelectionsWithSelection(
    state.objectSideSelections,
    fileNodeId,
    objectId,
    activeSide
  );

  return nextObjectSideSelections === state.objectSideSelections
    ? state
    : { ...state, objectSideSelections: nextObjectSideSelections };
}

function updateProjectEditorStateWithRectTransform(
  state: ProjectEditorState,
  fileNodeId: string,
  objectId: string,
  rectTransform: ProjectObjectRectTransform
): ProjectEditorState {
  const nextFileTree = updateProjectFileNodeObjectTreeWithRectTransform(
    state.fileTree,
    fileNodeId,
    objectId,
    rectTransform
  );

  return nextFileTree === state.fileTree ? state : { ...state, fileTree: nextFileTree };
}

function updateProjectFileNodeObjectTreeWithRectTransform(
  fileTree: ProjectFileNode[],
  fileNodeId: string,
  objectId: string,
  rectTransform: ProjectObjectRectTransform
) {
  const fileNode = findProjectFileNode(fileTree, fileNodeId);

  if (!isProjectObjectTreeFileNode(fileNode)) {
    return fileTree;
  }

  const objectTree = fileNode.objectTree ?? [];
  const nextObjectTree = setProjectObjectNodeRectTransform(objectTree, objectId, rectTransform);

  if (nextObjectTree === objectTree) {
    return fileTree;
  }

  return updateProjectFileNodeObjectTree(fileTree, fileNodeId, nextObjectTree);
}
