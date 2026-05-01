import {
  apiPaths,
  type ApiErrorResponse,
  type CreateProjectRequest,
  type CreateProjectResponse,
  type GetProjectResponse,
  type ListProjectsResponse,
  type UpdateProjectFileTreeResponse
} from "@bg-maker/shared";
import type { FastifyInstance } from "fastify";
import {
  createProjectService,
  ProjectService,
  ProjectValidationError
} from "../services/project-service.js";

type ProjectRouteParams = {
  projectId: string;
};

export function registerProjectsController(
  app: FastifyInstance,
  projectService: ProjectService = createProjectService()
) {
  app.get(
    apiPaths.projects,
    async (): Promise<ListProjectsResponse> => ({
      projects: await projectService.listProjects()
    })
  );

  app.post(
    apiPaths.projects,
    async (request, reply): Promise<CreateProjectResponse | ApiErrorResponse> => {
      try {
        const project = await projectService.createProject(toCreateProjectRequest(request.body));
        reply.code(201);

        return { project };
      } catch (error) {
        if (error instanceof ProjectValidationError) {
          reply.code(400);

          return { message: error.message };
        }

        throw error;
      }
    }
  );

  app.get<{ Params: ProjectRouteParams }>(
    `${apiPaths.projects}/:projectId`,
    async (request, reply): Promise<GetProjectResponse | ApiErrorResponse> => {
      const project = await projectService.getProject(request.params.projectId);

      if (!project) {
        reply.code(404);

        return { message: "Project not found" };
      }

      return { project };
    }
  );

  app.patch<{ Params: ProjectRouteParams }>(
    `${apiPaths.projects}/:projectId/file-tree`,
    async (request, reply): Promise<UpdateProjectFileTreeResponse | ApiErrorResponse> => {
      try {
        const project = await projectService.updateProjectFileTree(
          request.params.projectId,
          getProjectFileTreePayload(request.body)
        );

        if (!project) {
          reply.code(404);

          return { message: "Project not found" };
        }

        return { project };
      } catch (error) {
        if (error instanceof ProjectValidationError) {
          reply.code(400);

          return { message: error.message };
        }

        throw error;
      }
    }
  );
}

function toCreateProjectRequest(body: unknown): CreateProjectRequest {
  if (!body || typeof body !== "object") {
    return { name: "" };
  }

  const record = body as Record<string, unknown>;

  return {
    name: typeof record.name === "string" ? record.name : "",
    description: typeof record.description === "string" ? record.description : undefined
  };
}

function getProjectFileTreePayload(body: unknown): unknown {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const record = body as Record<string, unknown>;

  return record.fileTree;
}
