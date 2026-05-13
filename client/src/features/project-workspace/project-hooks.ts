import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { CreateProjectRequest, ProjectFileNode, ProjectGameConfig } from "@bg-maker/shared";
import {
  createProject,
  getProject,
  listProjects,
  updateProjectFileTree,
  updateProjectGameConfig
} from "./project-api";

export const projectQueryKeys = {
  all: ["projects"] as const,
  list: () => [...projectQueryKeys.all, "list"] as const,
  detail: (projectId: string) => [...projectQueryKeys.all, "detail", projectId] as const
};

export function useProjects() {
  return useQuery({
    queryKey: projectQueryKeys.list(),
    queryFn: listProjects
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProject(projectId)
  });
}

export function useCreateProject() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateProjectRequest) => createProject(request),
    onSuccess: async (project) => {
      queryClient.setQueryData(projectQueryKeys.detail(project.id), project);
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.list() });
      await navigate({
        to: "/projects/$projectId",
        params: { projectId: project.id }
      });
    }
  });
}

export function useUpdateProjectFileTree(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileTree: ProjectFileNode[]) => updateProjectFileTree(projectId, { fileTree }),
    onSuccess: async (project) => {
      queryClient.setQueryData(projectQueryKeys.detail(project.id), project);
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.list() });
    }
  });
}

export function useUpdateProjectGameConfig(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameConfig: ProjectGameConfig) =>
      updateProjectGameConfig(projectId, { gameConfig }),
    onSuccess: async (project) => {
      queryClient.setQueryData(projectQueryKeys.detail(project.id), project);
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.list() });
    }
  });
}
