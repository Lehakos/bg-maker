import {
  apiPaths,
  type CreateProjectRequest,
  type CreateProjectResponse,
  type GetProjectResponse,
  type ListProjectsResponse,
  type Project,
  type ProjectImageAsset,
  type ProjectSummary,
  type UpdateProjectFileTreeRequest,
  type UpdateProjectFileTreeResponse,
  type UpdateProjectGameConfigRequest,
  type UpdateProjectGameConfigResponse,
  type UploadProjectImageAssetResponse
} from "@bg-maker/shared";
import { apiRequest } from "../../lib/api-client";

export async function listProjects(): Promise<ProjectSummary[]> {
  const response = await apiRequest<ListProjectsResponse>(apiPaths.projects);

  return response.projects;
}

export async function getProject(projectId: string): Promise<Project> {
  const response = await apiRequest<GetProjectResponse>(apiPaths.project(projectId));

  return response.project;
}

export async function createProject(request: CreateProjectRequest): Promise<Project> {
  const response = await apiRequest<CreateProjectResponse>(apiPaths.projects, {
    method: "POST",
    body: JSON.stringify(request)
  });

  return response.project;
}

export async function updateProjectFileTree(
  projectId: string,
  request: UpdateProjectFileTreeRequest
): Promise<Project> {
  const response = await apiRequest<UpdateProjectFileTreeResponse>(
    apiPaths.projectFileTree(projectId),
    {
      method: "PATCH",
      body: JSON.stringify(request)
    }
  );

  return response.project;
}

export async function updateProjectGameConfig(
  projectId: string,
  request: UpdateProjectGameConfigRequest
): Promise<Project> {
  const response = await apiRequest<UpdateProjectGameConfigResponse>(
    apiPaths.projectGameConfig(projectId),
    {
      method: "PATCH",
      body: JSON.stringify(request)
    }
  );

  return response.project;
}

export async function uploadProjectImageAsset(
  projectId: string,
  file: File
): Promise<ProjectImageAsset> {
  const response = await apiRequest<UploadProjectImageAssetResponse>(
    apiPaths.projectImageAssets(projectId),
    {
      method: "POST",
      body: file,
      headers: {
        "Content-Type": file.type,
        "X-File-Name": file.name
      }
    }
  );

  return response.imageAsset;
}

export async function replaceProjectImageAsset(
  projectId: string,
  assetId: string,
  file: File
): Promise<ProjectImageAsset> {
  const response = await apiRequest<UploadProjectImageAssetResponse>(
    apiPaths.projectImageAsset(projectId, assetId),
    {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
        "X-File-Name": file.name
      }
    }
  );

  return response.imageAsset;
}
