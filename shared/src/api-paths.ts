export const apiPaths = {
  health: "/api/health",
  projects: "/api/projects",
  project: (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}`,
  projectFileTree: (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/file-tree`
} as const;
