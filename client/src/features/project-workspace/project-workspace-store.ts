import type {
  ProjectFileNode,
  ProjectObjectNode,
  ProjectTableSetup,
  ProjectTableSetupItem
} from "@bg-maker/shared";
import { getProjectTableSetupItemId } from "@bg-maker/shared";
import { resolveProjectObjectFileObjectTree } from "@bg-maker/shared";
import { createStore, type StoreApi } from "zustand/vanilla";
import { findProjectFileNode, sortProjectFileTree } from "../project-files/project-file-tree";
import {
  findProjectObjectNode,
  getProjectObjectTreeWithActiveSides,
  isProjectObjectTreeFileNode
} from "../project-objects/project-object-tree";
import { getProjectFileNodeTableSetup } from "../project-table-setup/project-table-setup";
import type { ProjectEditorCommand, ProjectEditorState } from "./project-editor-commands";
import {
  getProjectObjectSideSelection,
  type ProjectObjectSideSelections
} from "./project-object-side-selection";
import {
  defaultCanvasScale,
  normalizeCanvasScale,
  type WorkspaceTool
} from "./project-workspace-view-state";

type SelectedProjectObject = {
  fileNodeId: string;
  objectId: string | null;
  objectIds?: string[];
} | null;

export type ProjectWorkspaceClipboard =
  | {
      items: ProjectTableSetupItem[];
      type: "tableSetupItems";
    }
  | {
      objects: ProjectObjectNode[];
      type: "objectNodes";
    }
  | null;

export type ProjectWorkspaceObjectTreeFileNode = ProjectFileNode & {
  kind: "object" | "tableSetup";
  objectTree?: ProjectObjectNode[];
  tableSetup?: ProjectTableSetup;
  type: "file";
};

export type ProjectWorkspaceSelection = {
  effectiveSelectedNodeId: string | null;
  selectedContentFileNode: ProjectWorkspaceObjectTreeFileNode | null;
  selectedFileNode: ProjectFileNode | undefined;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  selectedProjectObject: ProjectObjectNode | null;
  selectedTableSetupItem: ProjectTableSetupItem | null;
};

export type ProjectWorkspaceStoreState = {
  activeTool: WorkspaceTool;
  canRedo: boolean;
  canUndo: boolean;
  canvasScale: number;
  clipboard: ProjectWorkspaceClipboard;
  executeCommand: (command: ProjectEditorCommand) => void;
  fileTree: ProjectFileNode[];
  objectSideSelections: ProjectObjectSideSelections;
  projectId: string;
  redo: () => void;
  redoStack: ProjectEditorCommand[];
  saveFileTree: (fileTree: ProjectFileNode[]) => void;
  selectObject: (objectId: string | null) => void;
  selectObjects: (objectIds: string[], primaryObjectId?: string | null) => void;
  selectedNodeId: string | null;
  selectedObject: SelectedProjectObject;
  setActiveTool: (tool: WorkspaceTool) => void;
  setCanvasScale: (scale: number) => void;
  setClipboard: (clipboard: ProjectWorkspaceClipboard) => void;
  setSaveFileTree: (saveFileTree: (fileTree: ProjectFileNode[]) => void) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  undo: () => void;
  undoStack: ProjectEditorCommand[];
};

export type ProjectWorkspaceStore = StoreApi<ProjectWorkspaceStoreState>;

type CreateProjectWorkspaceStoreOptions = {
  initialFileTree: ProjectFileNode[];
  projectId: string;
  saveFileTree: (fileTree: ProjectFileNode[]) => void;
};

export function createProjectWorkspaceStore({
  initialFileTree,
  projectId,
  saveFileTree
}: CreateProjectWorkspaceStoreOptions): ProjectWorkspaceStore {
  const fileTree = sortProjectFileTree(initialFileTree);

  return createStore<ProjectWorkspaceStoreState>((set, get) => ({
    activeTool: "select",
    canRedo: false,
    canUndo: false,
    canvasScale: defaultCanvasScale,
    clipboard: null,
    executeCommand: (command) => {
      const state = get();
      const editorState = getProjectEditorState(state);
      const nextEditorState = command.execute(editorState);

      if (Object.is(nextEditorState, editorState)) {
        return;
      }

      if (nextEditorState.fileTree !== state.fileTree) {
        state.saveFileTree(nextEditorState.fileTree);
      }

      set({
        canRedo: false,
        canUndo: true,
        fileTree: nextEditorState.fileTree,
        objectSideSelections: nextEditorState.objectSideSelections,
        redoStack: [],
        undoStack: [...state.undoStack, command]
      });
    },
    fileTree,
    objectSideSelections: {},
    projectId,
    redo: () => {
      const state = get();
      const command = state.redoStack.at(-1);

      if (!command) {
        return;
      }

      const nextEditorState = command.execute(getProjectEditorState(state));
      const redoStack = state.redoStack.slice(0, -1);
      const undoStack = [...state.undoStack, command];

      if (nextEditorState.fileTree !== state.fileTree) {
        state.saveFileTree(nextEditorState.fileTree);
      }

      set({
        canRedo: redoStack.length > 0,
        canUndo: undoStack.length > 0,
        fileTree: nextEditorState.fileTree,
        objectSideSelections: nextEditorState.objectSideSelections,
        redoStack,
        undoStack
      });
    },
    redoStack: [],
    saveFileTree,
    selectObject: (objectId) => {
      const state = get();
      const { selectedContentFileNode } = getProjectWorkspaceSelection(state);

      set({
        selectedObject: selectedContentFileNode
          ? {
              fileNodeId: selectedContentFileNode.id,
              objectId,
              objectIds: objectId ? [objectId] : []
            }
          : null
      });
    },
    selectObjects: (objectIds, primaryObjectId) => {
      const state = get();
      const { selectedContentFileNode } = getProjectWorkspaceSelection(state);
      const normalizedObjectIds = [...new Set(objectIds)];
      const nextPrimaryObjectId =
        primaryObjectId === null
          ? null
          : (primaryObjectId ?? normalizedObjectIds.at(-1) ?? null);

      set({
        selectedObject: selectedContentFileNode
          ? {
              fileNodeId: selectedContentFileNode.id,
              objectId: nextPrimaryObjectId,
              objectIds: normalizedObjectIds
            }
          : null
      });
    },
    selectedNodeId: fileTree[0]?.id ?? null,
    selectedObject: null,
    setActiveTool: (activeTool) => set({ activeTool }),
    setCanvasScale: (canvasScale) => set({ canvasScale: normalizeCanvasScale(canvasScale) }),
    setClipboard: (clipboard) => set({ clipboard }),
    setSaveFileTree: (nextSaveFileTree) => set({ saveFileTree: nextSaveFileTree }),
    setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
    undo: () => {
      const state = get();
      const command = state.undoStack.at(-1);

      if (!command) {
        return;
      }

      const nextEditorState = command.undo(getProjectEditorState(state));
      const redoStack = [...state.redoStack, command];
      const undoStack = state.undoStack.slice(0, -1);

      if (nextEditorState.fileTree !== state.fileTree) {
        state.saveFileTree(nextEditorState.fileTree);
      }

      set({
        canRedo: redoStack.length > 0,
        canUndo: undoStack.length > 0,
        fileTree: nextEditorState.fileTree,
        objectSideSelections: nextEditorState.objectSideSelections,
        redoStack,
        undoStack
      });
    },
    undoStack: []
  }));
}

function getProjectEditorState(state: ProjectWorkspaceStoreState): ProjectEditorState {
  return {
    fileTree: state.fileTree,
    objectSideSelections: state.objectSideSelections
  };
}

export function getProjectWorkspaceSelection(
  state: Pick<
    ProjectWorkspaceStoreState,
    "fileTree" | "objectSideSelections" | "selectedNodeId" | "selectedObject"
  >
): ProjectWorkspaceSelection {
  const effectiveSelectedNodeId =
    state.selectedNodeId && findProjectFileNode(state.fileTree, state.selectedNodeId)
      ? state.selectedNodeId
      : (state.fileTree[0]?.id ?? null);
  const selectedFileNode = effectiveSelectedNodeId
    ? findProjectFileNode(state.fileTree, effectiveSelectedNodeId)
    : undefined;
  const selectedContentFileNode = isProjectObjectTreeFileNode(selectedFileNode)
    ? selectedFileNode
    : null;
  const defaultSelectedObjectId =
    selectedContentFileNode?.kind === "object"
      ? (getProjectWorkspaceContentObjectTree(
          state.fileTree,
          selectedContentFileNode,
          state.objectSideSelections
        )[0]?.id ?? null)
      : null;
  const selectedObjectId = getSelectedObjectId({
    defaultSelectedObjectId,
    fileTree: state.fileTree,
    selectedContentFileNode,
    selectedObject: state.selectedObject
  });
  const selectedObjectIds = getSelectedObjectIds({
    defaultSelectedObjectId: selectedObjectId,
    fileTree: state.fileTree,
    selectedContentFileNode,
    selectedObject: state.selectedObject
  });
  const selectedProjectObject =
    selectedContentFileNode?.kind === "object" && selectedObjectId
      ? (findProjectObjectNode(
          getProjectWorkspaceContentObjectTree(
            state.fileTree,
            selectedContentFileNode,
            state.objectSideSelections
          ),
          selectedObjectId
        ) ?? null)
      : null;
  const selectedTableSetupItem =
    selectedContentFileNode?.kind === "tableSetup" && selectedObjectId
      ? (getProjectFileNodeTableSetup(selectedContentFileNode)?.items.find(
          (item) => (item.type === "linkedObject" ? item.id : item.object.id) === selectedObjectId
        ) ?? null)
      : null;
  const selectedTableSetupLocalObject =
    selectedTableSetupItem?.type === "localObject" ? selectedTableSetupItem.object : null;

  return {
    effectiveSelectedNodeId,
    selectedContentFileNode,
    selectedFileNode,
    selectedObjectId,
    selectedObjectIds,
    selectedProjectObject: selectedProjectObject ?? selectedTableSetupLocalObject,
    selectedTableSetupItem
  };
}

function getSelectedObjectId({
  defaultSelectedObjectId,
  fileTree,
  selectedContentFileNode,
  selectedObject
}: {
  defaultSelectedObjectId: string | null;
  fileTree: ProjectFileNode[];
  selectedContentFileNode: ProjectWorkspaceObjectTreeFileNode | null;
  selectedObject: SelectedProjectObject;
}) {
  if (!selectedContentFileNode || selectedObject?.fileNodeId !== selectedContentFileNode.id) {
    return defaultSelectedObjectId;
  }

  if (!selectedObject.objectId) {
    return selectedObject.objectIds?.[0] ?? defaultSelectedObjectId;
  }

  if (selectedContentFileNode.kind === "tableSetup") {
    const validItemIds = new Set(
      (getProjectFileNodeTableSetup(selectedContentFileNode)?.items ?? []).map(
        getProjectTableSetupItemId
      )
    );

    if (validItemIds.has(selectedObject.objectId)) {
      return selectedObject.objectId;
    }

    return selectedObject.objectIds?.find((objectId) => validItemIds.has(objectId)) ?? defaultSelectedObjectId;
  }

  const objectTree = getProjectWorkspaceContentObjectTree(fileTree, selectedContentFileNode, {});

  if (findProjectObjectNode(objectTree, selectedObject.objectId)) {
    return selectedObject.objectId;
  }

  return (
    selectedObject.objectIds?.find((objectId) => findProjectObjectNode(objectTree, objectId)) ??
    defaultSelectedObjectId
  );
}

function getSelectedObjectIds({
  defaultSelectedObjectId,
  fileTree,
  selectedContentFileNode,
  selectedObject
}: {
  defaultSelectedObjectId: string | null;
  fileTree: ProjectFileNode[];
  selectedContentFileNode: ProjectWorkspaceObjectTreeFileNode | null;
  selectedObject: SelectedProjectObject;
}) {
  if (!selectedContentFileNode) {
    return [];
  }

  const candidateIds =
    selectedObject?.fileNodeId === selectedContentFileNode.id
      ? (selectedObject.objectIds ?? (selectedObject.objectId ? [selectedObject.objectId] : []))
      : defaultSelectedObjectId
        ? [defaultSelectedObjectId]
        : [];
  const uniqueCandidateIds = [...new Set(candidateIds)];

  if (selectedContentFileNode.kind === "tableSetup") {
    const tableSetup = getProjectFileNodeTableSetup(selectedContentFileNode);
    const validItemIds = new Set((tableSetup?.items ?? []).map(getProjectTableSetupItemId));
    const selectedItemIds = uniqueCandidateIds.filter((itemId) => validItemIds.has(itemId));

    return selectedItemIds.length
      ? selectedItemIds
      : defaultSelectedObjectId
        ? [defaultSelectedObjectId]
        : [];
  }

  const objectTree = getProjectWorkspaceContentObjectTree(fileTree, selectedContentFileNode, {});
  const selectedObjectIds = uniqueCandidateIds.filter((objectId) =>
    findProjectObjectNode(objectTree, objectId)
  );

  return selectedObjectIds.length
    ? selectedObjectIds
    : defaultSelectedObjectId
      ? [defaultSelectedObjectId]
      : [];
}

export function getProjectWorkspaceContentObjectTree(
  fileTree: ProjectFileNode[],
  contentFileNode: ProjectWorkspaceObjectTreeFileNode | null,
  objectSideSelections: ProjectObjectSideSelections
) {
  const objectTree = contentFileNode?.sourceRef
    ? resolveProjectObjectFileObjectTree(fileTree, contentFileNode)
    : (contentFileNode?.objectTree ?? []);
  const fileNodeId = contentFileNode?.id;

  if (!fileNodeId) {
    return objectTree;
  }

  return getProjectObjectTreeWithActiveSides(objectTree, (object) =>
    getProjectObjectSideSelection(objectSideSelections, fileNodeId, object.id)
  );
}
