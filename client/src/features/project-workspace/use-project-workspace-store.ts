import { useContext, useMemo } from "react";
import { useStore } from "zustand";
import { ProjectWorkspaceStoreContext } from "./project-workspace-context";
import {
  getProjectWorkspaceSelection,
  type ProjectWorkspaceSelection,
  type ProjectWorkspaceStoreState
} from "./project-workspace-store";

export function useProjectWorkspaceStore<T>(
  selector: (state: ProjectWorkspaceStoreState) => T
): T {
  const store = useContext(ProjectWorkspaceStoreContext);

  if (!store) {
    throw new Error("ProjectWorkspaceProvider is required");
  }

  return useStore(store, selector);
}

export function useProjectWorkspaceSelection(): ProjectWorkspaceSelection {
  const fileTree = useProjectWorkspaceStore((state) => state.fileTree);
  const selectedNodeId = useProjectWorkspaceStore((state) => state.selectedNodeId);
  const selectedObject = useProjectWorkspaceStore((state) => state.selectedObject);

  return useMemo(
    () =>
      getProjectWorkspaceSelection({
        fileTree,
        selectedNodeId,
        selectedObject
      }),
    [fileTree, selectedNodeId, selectedObject]
  );
}
