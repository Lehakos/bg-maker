import type { ProjectFileNode, ProjectObjectNode } from "@bg-maker/shared";
import { createStore, type StoreApi } from "zustand/vanilla";
import { findProjectFileNode, sortProjectFileTree } from "../project-files/project-file-tree";
import {
  findProjectObjectNode,
  isProjectObjectTreeFileNode
} from "../project-objects/project-object-tree";
import type { ProjectEditorCommand } from "./project-editor-commands";
import {
  defaultCanvasScale,
  normalizeCanvasScale,
  type WorkspaceTool
} from "./project-workspace-view-state";

type SelectedProjectObject = {
  fileNodeId: string;
  objectId: string | null;
} | null;

export type ProjectWorkspaceObjectTreeFileNode = ProjectFileNode & {
  kind: "object" | "tableSetup";
  objectTree?: ProjectObjectNode[];
  type: "file";
};

export type ProjectWorkspaceSelection = {
  effectiveSelectedNodeId: string | null;
  selectedContentFileNode: ProjectWorkspaceObjectTreeFileNode | null;
  selectedFileNode: ProjectFileNode | undefined;
  selectedObjectId: string | null;
  selectedProjectObject: ProjectObjectNode | null;
};

export type ProjectWorkspaceStoreState = {
  activeTool: WorkspaceTool;
  canRedo: boolean;
  canUndo: boolean;
  canvasScale: number;
  executeCommand: (command: ProjectEditorCommand) => void;
  fileTree: ProjectFileNode[];
  projectId: string;
  redo: () => void;
  redoStack: ProjectEditorCommand[];
  saveFileTree: (fileTree: ProjectFileNode[]) => void;
  selectObject: (objectId: string | null) => void;
  selectedNodeId: string | null;
  selectedObject: SelectedProjectObject;
  setActiveTool: (tool: WorkspaceTool) => void;
  setCanvasScale: (scale: number) => void;
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
    executeCommand: (command) => {
      const state = get();
      const nextFileTree = command.execute(state.fileTree);

      if (Object.is(nextFileTree, state.fileTree)) {
        return;
      }

      state.saveFileTree(nextFileTree);
      set({
        canRedo: false,
        canUndo: true,
        fileTree: nextFileTree,
        redoStack: [],
        undoStack: [...state.undoStack, command]
      });
    },
    fileTree,
    projectId,
    redo: () => {
      const state = get();
      const command = state.redoStack.at(-1);

      if (!command) {
        return;
      }

      const nextFileTree = command.execute(state.fileTree);
      const redoStack = state.redoStack.slice(0, -1);
      const undoStack = [...state.undoStack, command];

      state.saveFileTree(nextFileTree);
      set({
        canRedo: redoStack.length > 0,
        canUndo: undoStack.length > 0,
        fileTree: nextFileTree,
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
              objectId
            }
          : null
      });
    },
    selectedNodeId: fileTree[0]?.id ?? null,
    selectedObject: null,
    setActiveTool: (activeTool) => set({ activeTool }),
    setCanvasScale: (canvasScale) => set({ canvasScale: normalizeCanvasScale(canvasScale) }),
    setSaveFileTree: (nextSaveFileTree) => set({ saveFileTree: nextSaveFileTree }),
    setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
    undo: () => {
      const state = get();
      const command = state.undoStack.at(-1);

      if (!command) {
        return;
      }

      const nextFileTree = command.undo(state.fileTree);
      const redoStack = [...state.redoStack, command];
      const undoStack = state.undoStack.slice(0, -1);

      state.saveFileTree(nextFileTree);
      set({
        canRedo: redoStack.length > 0,
        canUndo: undoStack.length > 0,
        fileTree: nextFileTree,
        redoStack,
        undoStack
      });
    },
    undoStack: []
  }));
}

export function getProjectWorkspaceSelection(
  state: Pick<ProjectWorkspaceStoreState, "fileTree" | "selectedNodeId" | "selectedObject">
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
      ? (selectedContentFileNode.objectTree?.[0]?.id ?? null)
      : null;
  const selectedObjectId = getSelectedObjectId({
    defaultSelectedObjectId,
    selectedContentFileNode,
    selectedObject: state.selectedObject
  });
  const selectedProjectObject =
    selectedContentFileNode && selectedObjectId
      ? (findProjectObjectNode(selectedContentFileNode.objectTree ?? [], selectedObjectId) ?? null)
      : null;

  return {
    effectiveSelectedNodeId,
    selectedContentFileNode,
    selectedFileNode,
    selectedObjectId,
    selectedProjectObject
  };
}

function getSelectedObjectId({
  defaultSelectedObjectId,
  selectedContentFileNode,
  selectedObject
}: {
  defaultSelectedObjectId: string | null;
  selectedContentFileNode: ProjectWorkspaceObjectTreeFileNode | null;
  selectedObject: SelectedProjectObject;
}) {
  if (!selectedContentFileNode || selectedObject?.fileNodeId !== selectedContentFileNode.id) {
    return defaultSelectedObjectId;
  }

  if (!selectedObject.objectId) {
    return defaultSelectedObjectId;
  }

  return findProjectObjectNode(selectedContentFileNode.objectTree ?? [], selectedObject.objectId)
    ? selectedObject.objectId
    : defaultSelectedObjectId;
}
