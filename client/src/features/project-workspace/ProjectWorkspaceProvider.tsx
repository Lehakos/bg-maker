import type { ProjectFileNode, ProjectGameConfig } from "@bg-maker/shared";
import { type ReactNode, useEffect, useState } from "react";
import { ProjectWorkspaceStoreContext } from "./project-workspace-context";
import { createProjectWorkspaceStore } from "./project-workspace-store";

type ProjectWorkspaceProviderProps = {
  children: ReactNode;
  initialFileTree: ProjectFileNode[];
  initialGameConfig: ProjectGameConfig;
  projectId: string;
  saveFileTree: (fileTree: ProjectFileNode[]) => void;
};

export function ProjectWorkspaceProvider({
  children,
  initialFileTree,
  initialGameConfig,
  projectId,
  saveFileTree
}: ProjectWorkspaceProviderProps) {
  const [store] = useState(() =>
    createProjectWorkspaceStore({
      initialFileTree,
      initialGameConfig,
      projectId,
      saveFileTree
    })
  );

  useEffect(() => {
    store.getState().setGameConfig(initialGameConfig);
  }, [initialGameConfig, store]);

  useEffect(() => {
    store.getState().setSaveFileTree(saveFileTree);
  }, [saveFileTree, store]);

  return (
    <ProjectWorkspaceStoreContext.Provider value={store}>
      {children}
    </ProjectWorkspaceStoreContext.Provider>
  );
}
