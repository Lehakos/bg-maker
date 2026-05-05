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

export type ProjectWorkspaceSelectionTarget =
  | {
      fileNodeId: string;
      objectId: string | null;
      objectIds: string[];
      type: "objectFile";
    }
  | {
      fileNodeId: string;
      itemId: string | null;
      itemIds: string[];
      type: "tableSetupItems";
    }
  | {
      fileNodeId: string;
      itemId: string;
      objectId: string | null;
      type: "tableSetupLocalObject";
    }
  | null;

export type ProjectWorkspaceOpenTab = {
  id: string;
  kind: "object" | "tableSetup";
  name: string;
};

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
  selectedTableSetupLocalItem: Extract<ProjectTableSetupItem, { type: "localObject" }> | null;
  selectedViewportObjectId: string | null;
  selectedViewportObjectIds: string[];
  selectionTarget: ProjectWorkspaceSelectionTarget;
};

export type ProjectWorkspaceStoreState = {
  activeTool: WorkspaceTool;
  canRedo: boolean;
  canUndo: boolean;
  canvasScale: number;
  closeAllWorkspaceTabs: () => void;
  closeOtherWorkspaceTabs: (nodeId: string) => void;
  closeWorkspaceTab: (nodeId: string) => void;
  closeWorkspaceTabsToRight: (nodeId: string) => void;
  clipboard: ProjectWorkspaceClipboard;
  executeCommand: (command: ProjectEditorCommand) => void;
  fileTree: ProjectFileNode[];
  objectSideSelections: ProjectObjectSideSelections;
  openObjectForEditing: (options: { fileNodeId: string; objectId?: string | null }) => void;
  openTabIds: string[];
  openWorkspaceNode: (nodeId: string | null) => void;
  projectId: string;
  redo: () => void;
  redoStack: ProjectEditorCommand[];
  saveFileTree: (fileTree: ProjectFileNode[]) => void;
  selectObject: (objectId: string | null) => void;
  selectObjects: (objectIds: string[], primaryObjectId?: string | null) => void;
  selectTableSetupItems: (itemIds: string[], primaryItemId?: string | null) => void;
  selectTableSetupLocalObject: (itemId: string, objectId?: string | null) => void;
  selectedNodeId: string | null;
  selectionTarget: ProjectWorkspaceSelectionTarget;
  resizeAspectLocked: boolean;
  setActiveTool: (tool: WorkspaceTool) => void;
  setCanvasScale: (scale: number) => void;
  setClipboard: (clipboard: ProjectWorkspaceClipboard) => void;
  setResizeAspectLocked: (locked: boolean) => void;
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
  const initialOpenTabIds = readProjectWorkspaceOpenTabIds(projectId, fileTree);
  const initialSelectedNodeId = initialOpenTabIds[0] ?? fileTree[0]?.id ?? null;

  return createStore<ProjectWorkspaceStoreState>((set, get) => ({
    activeTool: "select",
    canRedo: false,
    canUndo: false,
    canvasScale: defaultCanvasScale,
    closeAllWorkspaceTabs: () => {
      const state = get();
      const nextTabState = getProjectWorkspaceClosedTabState({
        fileTree: state.fileTree,
        openTabIds: state.openTabIds,
        selectedNodeId: state.selectedNodeId,
        tabIdsToClose: state.openTabIds
      });

      if (nextTabState.openTabIds === state.openTabIds) {
        return;
      }

      writeProjectWorkspaceOpenTabIds(state.projectId, nextTabState.openTabIds);
      set(nextTabState);
    },
    closeOtherWorkspaceTabs: (nodeId) => {
      const state = get();

      if (!state.openTabIds.includes(nodeId)) {
        return;
      }

      const nextTabState = getProjectWorkspaceClosedTabState({
        fileTree: state.fileTree,
        openTabIds: state.openTabIds,
        preferredSelectedNodeId: nodeId,
        selectedNodeId: state.selectedNodeId,
        tabIdsToClose: state.openTabIds.filter((openTabId) => openTabId !== nodeId)
      });

      if (nextTabState.openTabIds === state.openTabIds) {
        return;
      }

      writeProjectWorkspaceOpenTabIds(state.projectId, nextTabState.openTabIds);
      set(nextTabState);
    },
    closeWorkspaceTab: (nodeId) => {
      const state = get();
      const nextTabState = getProjectWorkspaceClosedTabState({
        fileTree: state.fileTree,
        openTabIds: state.openTabIds,
        selectedNodeId: state.selectedNodeId,
        tabIdsToClose: [nodeId]
      });

      if (nextTabState.openTabIds === state.openTabIds) {
        return;
      }

      writeProjectWorkspaceOpenTabIds(state.projectId, nextTabState.openTabIds);
      set(nextTabState);
    },
    closeWorkspaceTabsToRight: (nodeId) => {
      const state = get();
      const openTabIndex = state.openTabIds.indexOf(nodeId);

      if (openTabIndex < 0) {
        return;
      }

      const nextTabState = getProjectWorkspaceClosedTabState({
        fileTree: state.fileTree,
        openTabIds: state.openTabIds,
        preferredSelectedNodeId: nodeId,
        selectedNodeId: state.selectedNodeId,
        tabIdsToClose: state.openTabIds.slice(openTabIndex + 1)
      });

      if (nextTabState.openTabIds === state.openTabIds) {
        return;
      }

      writeProjectWorkspaceOpenTabIds(state.projectId, nextTabState.openTabIds);
      set(nextTabState);
    },
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

      const openTabIds = pruneProjectWorkspaceOpenTabIds(
        state.openTabIds,
        nextEditorState.fileTree
      );
      if (openTabIds !== state.openTabIds) {
        writeProjectWorkspaceOpenTabIds(state.projectId, openTabIds);
      }

      set({
        canRedo: false,
        canUndo: true,
        fileTree: nextEditorState.fileTree,
        objectSideSelections: nextEditorState.objectSideSelections,
        openTabIds,
        redoStack: [],
        undoStack: [...state.undoStack, command]
      });
    },
    fileTree,
    objectSideSelections: {},
    openObjectForEditing: ({ fileNodeId, objectId = null }) => {
      const state = get();
      const node = findProjectFileNode(state.fileTree, fileNodeId);

      if (!isProjectWorkspaceTabNode(node) || node.kind !== "object") {
        return;
      }

      const openTabIds = addProjectWorkspaceOpenTabId(state.openTabIds, fileNodeId);
      writeProjectWorkspaceOpenTabIds(state.projectId, openTabIds);
      set({
        openTabIds,
        selectedNodeId: fileNodeId,
        selectionTarget: {
          fileNodeId,
          objectId,
          objectIds: objectId ? [objectId] : [],
          type: "objectFile"
        }
      });
    },
    openTabIds: initialOpenTabIds,
    openWorkspaceNode: (nodeId) => {
      const state = get();
      const node = nodeId ? findProjectFileNode(state.fileTree, nodeId) : undefined;
      const openTabIds = isProjectWorkspaceTabNode(node)
        ? addProjectWorkspaceOpenTabId(state.openTabIds, node.id)
        : state.openTabIds;

      if (openTabIds !== state.openTabIds) {
        writeProjectWorkspaceOpenTabIds(state.projectId, openTabIds);
      }

      set({
        openTabIds,
        selectedNodeId: nodeId
      });
    },
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

      const openTabIds = pruneProjectWorkspaceOpenTabIds(
        state.openTabIds,
        nextEditorState.fileTree
      );
      if (openTabIds !== state.openTabIds) {
        writeProjectWorkspaceOpenTabIds(state.projectId, openTabIds);
      }

      set({
        canRedo: redoStack.length > 0,
        canUndo: undoStack.length > 0,
        fileTree: nextEditorState.fileTree,
        objectSideSelections: nextEditorState.objectSideSelections,
        openTabIds,
        redoStack,
        undoStack
      });
    },
    redoStack: [],
    resizeAspectLocked: false,
    saveFileTree,
    selectObject: (objectId) => {
      const state = get();
      const { selectedContentFileNode, selectionTarget } = getProjectWorkspaceSelection(state);

      if (!selectedContentFileNode) {
        set({ selectionTarget: null });
        return;
      }

      if (
        selectedContentFileNode.kind === "tableSetup" &&
        selectionTarget?.type === "tableSetupLocalObject" &&
        selectionTarget.fileNodeId === selectedContentFileNode.id
      ) {
        set({
          selectionTarget: {
            ...selectionTarget,
            objectId
          }
        });
        return;
      }

      if (selectedContentFileNode.kind === "tableSetup") {
        set({
          selectionTarget: {
            fileNodeId: selectedContentFileNode.id,
            itemId: objectId,
            itemIds: objectId ? [objectId] : [],
            type: "tableSetupItems"
          }
        });
        return;
      }

      set({
        selectionTarget: {
          fileNodeId: selectedContentFileNode.id,
          objectId,
          objectIds: objectId ? [objectId] : [],
          type: "objectFile"
        }
      });
    },
    selectObjects: (objectIds, primaryObjectId) => {
      const state = get();
      const { selectedContentFileNode, selectionTarget } = getProjectWorkspaceSelection(state);
      const normalizedObjectIds = [...new Set(objectIds)];
      const nextPrimaryObjectId =
        primaryObjectId === null ? null : (primaryObjectId ?? normalizedObjectIds.at(-1) ?? null);

      if (!selectedContentFileNode) {
        set({ selectionTarget: null });
        return;
      }

      if (
        selectedContentFileNode.kind === "tableSetup" &&
        selectionTarget?.type === "tableSetupLocalObject" &&
        selectionTarget.fileNodeId === selectedContentFileNode.id
      ) {
        set({
          selectionTarget: {
            ...selectionTarget,
            objectId: nextPrimaryObjectId
          }
        });
        return;
      }

      if (selectedContentFileNode.kind === "tableSetup") {
        set({
          selectionTarget: {
            fileNodeId: selectedContentFileNode.id,
            itemId: nextPrimaryObjectId,
            itemIds: normalizedObjectIds,
            type: "tableSetupItems"
          }
        });
        return;
      }

      set({
        selectionTarget: {
          fileNodeId: selectedContentFileNode.id,
          objectId: nextPrimaryObjectId,
          objectIds: normalizedObjectIds,
          type: "objectFile"
        }
      });
    },
    selectTableSetupItems: (itemIds, primaryItemId) => {
      const state = get();
      const { selectedContentFileNode } = getProjectWorkspaceSelection(state);

      if (selectedContentFileNode?.kind !== "tableSetup") {
        return;
      }

      const normalizedItemIds = [...new Set(itemIds)];
      const nextPrimaryItemId =
        primaryItemId === null ? null : (primaryItemId ?? normalizedItemIds.at(-1) ?? null);

      set({
        selectionTarget: {
          fileNodeId: selectedContentFileNode.id,
          itemId: nextPrimaryItemId,
          itemIds: normalizedItemIds,
          type: "tableSetupItems"
        }
      });
    },
    selectTableSetupLocalObject: (itemId, objectId = null) => {
      const state = get();
      const { selectedContentFileNode } = getProjectWorkspaceSelection(state);

      if (selectedContentFileNode?.kind !== "tableSetup") {
        return;
      }

      set({
        selectionTarget: {
          fileNodeId: selectedContentFileNode.id,
          itemId,
          objectId,
          type: "tableSetupLocalObject"
        }
      });
    },
    selectedNodeId: initialSelectedNodeId,
    selectionTarget: null,
    setActiveTool: (activeTool) => set({ activeTool }),
    setCanvasScale: (canvasScale) => set({ canvasScale: normalizeCanvasScale(canvasScale) }),
    setClipboard: (clipboard) => set({ clipboard }),
    setResizeAspectLocked: (resizeAspectLocked) => set({ resizeAspectLocked }),
    setSaveFileTree: (nextSaveFileTree) => set({ saveFileTree: nextSaveFileTree }),
    setSelectedNodeId: (nodeId) => get().openWorkspaceNode(nodeId),
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

      const openTabIds = pruneProjectWorkspaceOpenTabIds(
        state.openTabIds,
        nextEditorState.fileTree
      );
      if (openTabIds !== state.openTabIds) {
        writeProjectWorkspaceOpenTabIds(state.projectId, openTabIds);
      }

      set({
        canRedo: redoStack.length > 0,
        canUndo: undoStack.length > 0,
        fileTree: nextEditorState.fileTree,
        objectSideSelections: nextEditorState.objectSideSelections,
        openTabIds,
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
    "fileTree" | "objectSideSelections" | "selectedNodeId" | "selectionTarget"
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

  if (selectedContentFileNode?.kind === "object") {
    const objectTree = getProjectWorkspaceContentObjectTree(
      state.fileTree,
      selectedContentFileNode,
      state.objectSideSelections
    );
    const defaultSelectedObjectId = objectTree[0]?.id ?? null;
    const selectionTarget =
      state.selectionTarget?.type === "objectFile" &&
      state.selectionTarget.fileNodeId === selectedContentFileNode.id
        ? state.selectionTarget
        : null;
    const selectedObjectId = getValidProjectObjectId(
      objectTree,
      selectionTarget?.objectId ?? null,
      selectionTarget?.objectIds ?? [],
      defaultSelectedObjectId
    );
    const selectedObjectIds = getValidProjectObjectIds(
      objectTree,
      selectionTarget?.objectIds ?? (selectedObjectId ? [selectedObjectId] : []),
      selectedObjectId
    );
    const selectedProjectObject = selectedObjectId
      ? (findProjectObjectNode(objectTree, selectedObjectId) ?? null)
      : null;

    return {
      effectiveSelectedNodeId,
      selectedContentFileNode,
      selectedFileNode,
      selectedObjectId,
      selectedObjectIds,
      selectedProjectObject,
      selectedTableSetupItem: null,
      selectedTableSetupLocalItem: null,
      selectedViewportObjectId: selectedObjectId,
      selectedViewportObjectIds: selectedObjectIds,
      selectionTarget
    };
  }

  const tableSetup =
    selectedContentFileNode?.kind === "tableSetup"
      ? getProjectFileNodeTableSetup(selectedContentFileNode)
      : null;
  const localSelectionTarget =
    selectedContentFileNode?.kind === "tableSetup" &&
    state.selectionTarget?.type === "tableSetupLocalObject" &&
    state.selectionTarget.fileNodeId === selectedContentFileNode.id
      ? state.selectionTarget
      : null;
  const selectedTableSetupLocalItem = localSelectionTarget
    ? (tableSetup?.items.find(
        (item): item is Extract<ProjectTableSetupItem, { type: "localObject" }> =>
          item.type === "localObject" &&
          getProjectTableSetupItemId(item) === localSelectionTarget.itemId
      ) ?? null)
    : null;

  if (selectedContentFileNode?.kind === "tableSetup" && selectedTableSetupLocalItem) {
    const itemId = getProjectTableSetupItemId(selectedTableSetupLocalItem);
    const objectTree = [selectedTableSetupLocalItem.object];
    const selectedObjectId = getValidProjectObjectId(
      objectTree,
      localSelectionTarget?.objectId ?? null,
      [],
      selectedTableSetupLocalItem.object.id
    );
    const selectedProjectObject = selectedObjectId
      ? (findProjectObjectNode(objectTree, selectedObjectId) ?? null)
      : null;

    return {
      effectiveSelectedNodeId,
      selectedContentFileNode,
      selectedFileNode,
      selectedObjectId,
      selectedObjectIds: selectedObjectId ? [selectedObjectId] : [],
      selectedProjectObject,
      selectedTableSetupItem: selectedTableSetupLocalItem,
      selectedTableSetupLocalItem,
      selectedViewportObjectId: itemId,
      selectedViewportObjectIds: [itemId],
      selectionTarget: localSelectionTarget
    };
  }

  const tableSetupSelectionTarget =
    selectedContentFileNode?.kind === "tableSetup" &&
    state.selectionTarget?.type === "tableSetupItems" &&
    state.selectionTarget.fileNodeId === selectedContentFileNode.id
      ? state.selectionTarget
      : null;
  const validItemIds = new Set((tableSetup?.items ?? []).map(getProjectTableSetupItemId));
  const selectedObjectIds = getValidProjectTableSetupItemIds(
    validItemIds,
    tableSetupSelectionTarget?.itemIds ?? [],
    tableSetupSelectionTarget?.itemId ?? null
  );
  const selectedObjectId =
    tableSetupSelectionTarget?.itemId && validItemIds.has(tableSetupSelectionTarget.itemId)
      ? tableSetupSelectionTarget.itemId
      : (selectedObjectIds[0] ?? null);
  const selectedTableSetupItem =
    selectedContentFileNode?.kind === "tableSetup" && selectedObjectId
      ? (tableSetup?.items.find((item) => getProjectTableSetupItemId(item) === selectedObjectId) ??
        null)
      : null;
  const selectedTableSetupLocalObject =
    selectedTableSetupItem?.type === "localObject" ? selectedTableSetupItem.object : null;

  return {
    effectiveSelectedNodeId,
    selectedContentFileNode,
    selectedFileNode,
    selectedObjectId,
    selectedObjectIds,
    selectedProjectObject: selectedTableSetupLocalObject,
    selectedTableSetupItem,
    selectedTableSetupLocalItem: null,
    selectedViewportObjectId: selectedObjectId,
    selectedViewportObjectIds: selectedObjectIds,
    selectionTarget: tableSetupSelectionTarget
  };
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

function getValidProjectObjectId(
  objectTree: ProjectObjectNode[],
  objectId: string | null,
  objectIds: readonly string[],
  defaultObjectId: string | null
) {
  if (objectId && findProjectObjectNode(objectTree, objectId)) {
    return objectId;
  }

  return (
    objectIds.find((candidateId) => findProjectObjectNode(objectTree, candidateId)) ??
    defaultObjectId
  );
}

function getValidProjectObjectIds(
  objectTree: ProjectObjectNode[],
  objectIds: readonly string[],
  defaultObjectId: string | null
) {
  const validObjectIds = [...new Set(objectIds)].filter((objectId) =>
    findProjectObjectNode(objectTree, objectId)
  );

  return validObjectIds.length ? validObjectIds : defaultObjectId ? [defaultObjectId] : [];
}

function getValidProjectTableSetupItemIds(
  validItemIds: ReadonlySet<string>,
  itemIds: readonly string[],
  defaultItemId: string | null
) {
  const selectedItemIds = [...new Set(itemIds)].filter((itemId) => validItemIds.has(itemId));

  if (selectedItemIds.length) {
    return selectedItemIds;
  }

  return defaultItemId && validItemIds.has(defaultItemId) ? [defaultItemId] : [];
}

function addProjectWorkspaceOpenTabId(openTabIds: string[], nodeId: string) {
  return openTabIds.includes(nodeId) ? openTabIds : [...openTabIds, nodeId];
}

type ProjectWorkspaceClosedTabStateOptions = {
  fileTree: ProjectFileNode[];
  openTabIds: string[];
  preferredSelectedNodeId?: string | null;
  selectedNodeId: string | null;
  tabIdsToClose: readonly string[];
};

function getProjectWorkspaceClosedTabState({
  fileTree,
  openTabIds,
  preferredSelectedNodeId = null,
  selectedNodeId,
  tabIdsToClose
}: ProjectWorkspaceClosedTabStateOptions): Pick<
  ProjectWorkspaceStoreState,
  "openTabIds" | "selectedNodeId"
> {
  const tabIdsToCloseSet = new Set(tabIdsToClose);
  const firstClosedTabIndex = openTabIds.findIndex((nodeId) => tabIdsToCloseSet.has(nodeId));

  if (firstClosedTabIndex < 0) {
    return { openTabIds, selectedNodeId };
  }

  const nextOpenTabIds = openTabIds.filter((nodeId) => !tabIdsToCloseSet.has(nodeId));
  const nextSelectedNodeId = getSelectedNodeIdAfterClosingWorkspaceTabs({
    fileTree,
    firstClosedTabIndex,
    openTabIds: nextOpenTabIds,
    preferredSelectedNodeId,
    selectedNodeId,
    tabIdsToClose: tabIdsToCloseSet
  });

  return {
    openTabIds: nextOpenTabIds,
    selectedNodeId: nextSelectedNodeId
  };
}

function getSelectedNodeIdAfterClosingWorkspaceTabs({
  fileTree,
  firstClosedTabIndex,
  openTabIds,
  preferredSelectedNodeId,
  selectedNodeId,
  tabIdsToClose
}: {
  fileTree: ProjectFileNode[];
  firstClosedTabIndex: number;
  openTabIds: string[];
  preferredSelectedNodeId: string | null;
  selectedNodeId: string | null;
  tabIdsToClose: ReadonlySet<string>;
}) {
  if (!selectedNodeId || !tabIdsToClose.has(selectedNodeId)) {
    return selectedNodeId;
  }

  if (preferredSelectedNodeId && openTabIds.includes(preferredSelectedNodeId)) {
    return preferredSelectedNodeId;
  }

  return (
    openTabIds[firstClosedTabIndex] ??
    openTabIds[firstClosedTabIndex - 1] ??
    fileTree[0]?.id ??
    null
  );
}

function pruneProjectWorkspaceOpenTabIds(openTabIds: string[], fileTree: ProjectFileNode[]) {
  const nextOpenTabIds = openTabIds.filter((nodeId) =>
    isProjectWorkspaceTabNode(findProjectFileNode(fileTree, nodeId))
  );

  return nextOpenTabIds.length === openTabIds.length ? openTabIds : nextOpenTabIds;
}

function readProjectWorkspaceOpenTabIds(projectId: string, fileTree: ProjectFileNode[]) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(getProjectWorkspaceOpenTabsStorageKey(projectId));
    const openTabIds = value ? JSON.parse(value) : [];

    if (!Array.isArray(openTabIds)) {
      return [];
    }

    return pruneProjectWorkspaceOpenTabIds(
      openTabIds.filter((nodeId): nodeId is string => typeof nodeId === "string"),
      fileTree
    );
  } catch {
    return [];
  }
}

function writeProjectWorkspaceOpenTabIds(projectId: string, openTabIds: readonly string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getProjectWorkspaceOpenTabsStorageKey(projectId),
      JSON.stringify(openTabIds)
    );
  } catch {
    // Local storage is a convenience; navigation state can still work without it.
  }
}

function getProjectWorkspaceOpenTabsStorageKey(projectId: string) {
  return `bg-maker:workspace:${projectId}:open-tabs`;
}

function isProjectWorkspaceTabNode(
  node: ProjectFileNode | null | undefined
): node is ProjectFileNode & { kind: "object" | "tableSetup"; type: "file" } {
  return node?.type === "file" && (node.kind === "object" || node.kind === "tableSetup");
}
