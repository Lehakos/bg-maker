import {
  apiPaths,
  type CreateProjectRequest,
  type CreateProjectResponse,
  type GetProjectResponse,
  type ListProjectsResponse,
  type Project,
  type ProjectSummary
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
