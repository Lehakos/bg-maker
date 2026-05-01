import type {
  ProjectFileNode,
  ProjectObjectNode,
  ProjectObjectRectTransform
} from "@bg-maker/shared";
import type { EditorCommand } from "./editor-command-history";
import { findProjectFileNode } from "./project-file-tree";
import {
  isProjectObjectTreeFileNode,
  setProjectObjectNodeRectTransform,
  updateProjectFileNodeObjectTree
} from "./project-object-tree";

export type ProjectEditorCommand = EditorCommand<ProjectFileNode[]>;

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
    execute: () => after,
    id: crypto.randomUUID(),
    label,
    undo: () => before
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
    execute: (fileTree) => updateProjectFileNodeObjectTree(fileTree, fileNodeId, after),
    id: crypto.randomUUID(),
    label,
    undo: (fileTree) => updateProjectFileNodeObjectTree(fileTree, fileNodeId, before)
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
    execute: (fileTree) =>
      updateProjectFileNodeObjectTreeWithRectTransform(fileTree, fileNodeId, objectId, after),
    id: crypto.randomUUID(),
    label,
    undo: (fileTree) =>
      updateProjectFileNodeObjectTreeWithRectTransform(fileTree, fileNodeId, objectId, before)
  };
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
