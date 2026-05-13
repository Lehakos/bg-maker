import type { ProjectGameConfig } from "./game.js";
import type { ProjectImageAsset } from "./assets.js";
import type { Project, ProjectFileNode } from "./project-files.js";
import type { ProjectSummary } from "./summary.js";

export type ListProjectsResponse = {
  projects: ProjectSummary[];
};

export type GetProjectResponse = {
  project: Project;
};

export type CreateProjectRequest = {
  name: string;
  description?: string;
};

export type CreateProjectResponse = {
  project: Project;
};

export type UpdateProjectFileTreeRequest = {
  fileTree: ProjectFileNode[];
};

export type UpdateProjectFileTreeResponse = {
  project: Project;
};

export type UpdateProjectGameConfigRequest = {
  gameConfig: ProjectGameConfig;
};

export type UpdateProjectGameConfigResponse = {
  project: Project;
};

export type UploadProjectImageAssetResponse = {
  imageAsset: ProjectImageAsset;
};

export type ApiErrorResponse = {
  message: string;
};
