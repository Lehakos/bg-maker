export const apiPaths = {
  health: "/api/health",
  projects: "/api/projects",
  project: (projectId: string) => `/api/projects/${projectId}`,
  cardTemplates: (projectId: string) => `/api/projects/${projectId}/card-templates`,
  cardTemplate: (projectId: string, templateId: string) =>
    `/api/projects/${projectId}/card-templates/${templateId}`,
  components: (projectId: string) => `/api/projects/${projectId}/components`,
  component: (projectId: string, componentId: string) =>
    `/api/projects/${projectId}/components/${componentId}`
} as const;
