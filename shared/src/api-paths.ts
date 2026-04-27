export const apiPaths = {
  health: "/api/health",
  projects: "/api/projects",
  project: (projectId: string) => `/api/projects/${projectId}`,
  components: (projectId: string) => `/api/projects/${projectId}/components`,
  component: (projectId: string, componentId: string) =>
    `/api/projects/${projectId}/components/${componentId}`
} as const;
