import { createContext } from "react";
import type { ProjectWorkspaceStore } from "./project-workspace-store";

export const ProjectWorkspaceStoreContext = createContext<ProjectWorkspaceStore | null>(null);
