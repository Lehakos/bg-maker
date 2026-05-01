import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { CreateProjectRequest } from "@bg-maker/shared";
import { createProject, getProject, listProjects } from "./project-api";

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
