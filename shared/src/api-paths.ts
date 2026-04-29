export const apiPaths = {
  health: "/api/health",
  projects: "/api/projects",
  project: (projectId: string) => `/api/projects/${projectId}`,
  cardTemplates: (projectId: string) => `/api/projects/${projectId}/card-templates`,
  cardTemplate: (projectId: string, templateId: string) =>
    `/api/projects/${projectId}/card-templates/${templateId}`,
  tileTemplates: (projectId: string) => `/api/projects/${projectId}/tile-templates`,
  tileTemplate: (projectId: string, templateId: string) =>
    `/api/projects/${projectId}/tile-templates/${templateId}`,
  pieceTemplates: (projectId: string) => `/api/projects/${projectId}/piece-templates`,
  pieceTemplate: (projectId: string, templateId: string) =>
    `/api/projects/${projectId}/piece-templates/${templateId}`,
  components: (projectId: string) => `/api/projects/${projectId}/components`,
  component: (projectId: string, componentId: string) =>
    `/api/projects/${projectId}/components/${componentId}`,
  collections: (projectId: string) => `/api/projects/${projectId}/collections`,
  collection: (projectId: string, collectionId: string) =>
    `/api/projects/${projectId}/collections/${collectionId}`,
  tableSetup: (projectId: string) => `/api/projects/${projectId}/table-setup`
} as const;
