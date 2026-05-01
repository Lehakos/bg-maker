import {
  apiPaths,
  type ApiErrorResponse,
  type CreateProjectRequest,
  type CreateProjectResponse,
  type GetProjectResponse,
  type ListProjectsResponse,
  type UpdateProjectFileTreeResponse,
  type UploadProjectImageAssetResponse
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

  app.post<{ Params: ProjectRouteParams }>(
    `${apiPaths.projects}/:projectId/image-assets`,
    async (request, reply): Promise<UploadProjectImageAssetResponse | ApiErrorResponse> => {
      try {
        if (!Buffer.isBuffer(request.body)) {
          reply.code(400);

          return { message: "Image asset data is required" };
        }

        const imageAsset = await projectService.createProjectImageAsset(request.params.projectId, {
          contentType: getHeaderValue(request.headers["content-type"]),
          data: request.body,
          fileName: getHeaderValue(request.headers["x-file-name"])
        });

        if (!imageAsset) {
          reply.code(404);

          return { message: "Project not found" };
        }

        reply.code(201);

        return { imageAsset };
      } catch (error) {
        if (error instanceof ProjectValidationError) {
          reply.code(error.message === "Unsupported image content type" ? 415 : 400);

          return { message: error.message };
        }

        throw error;
      }
    }
  );

  app.get<{ Params: ProjectRouteParams & { assetId: string } }>(
    `${apiPaths.projects}/:projectId/image-assets/:assetId`,
    async (request, reply): Promise<ApiErrorResponse | Buffer> => {
      const imageAsset = await projectService.getProjectImageAsset(
        request.params.projectId,
        request.params.assetId
      );

      if (!imageAsset) {
        reply.code(404);

        return { message: "Image asset not found" };
      }

      reply
        .header("Cache-Control", "no-store")
        .header("Content-Length", String(imageAsset.data.byteLength))
        .header("Content-Type", imageAsset.imageAsset.contentType);

      return imageAsset.data;
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

function getHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
