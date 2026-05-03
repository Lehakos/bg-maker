import type { ProjectFileNode } from "@bg-maker/shared";
import { type ReactNode, useEffect, useState } from "react";
import { ProjectWorkspaceStoreContext } from "./project-workspace-context";
import { createProjectWorkspaceStore } from "./project-workspace-store";

type ProjectWorkspaceProviderProps = {
  children: ReactNode;
  initialFileTree: ProjectFileNode[];
  projectId: string;
  saveFileTree: (fileTree: ProjectFileNode[]) => void;
};

export function ProjectWorkspaceProvider({
  children,
  initialFileTree,
  projectId,
  saveFileTree
}: ProjectWorkspaceProviderProps) {
  const [store] = useState(() =>
    createProjectWorkspaceStore({
      initialFileTree,
      projectId,
      saveFileTree
    })
  );

  useEffect(() => {
    store.getState().setSaveFileTree(saveFileTree);
  }, [saveFileTree, store]);

  return (
    <ProjectWorkspaceStoreContext.Provider value={store}>
      {children}
    </ProjectWorkspaceStoreContext.Provider>
  );
}
