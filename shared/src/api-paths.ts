export const apiPaths = {
  health: "/api/health",
  projects: "/api/projects",
  project: (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}`,
  projectImageAsset: (projectId: string, assetId: string) =>
    `/api/projects/${encodeURIComponent(projectId)}/image-assets/${encodeURIComponent(assetId)}`,
  projectImageAssets: (projectId: string) =>
    `/api/projects/${encodeURIComponent(projectId)}/image-assets`,
  projectFileTree: (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/file-tree`
} as const;
