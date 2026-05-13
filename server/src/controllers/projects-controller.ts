import {
  apiPaths,
  type ApiErrorResponse,
  type CreateProjectResponse,
  type GetProjectResponse,
  type ListProjectsResponse,
  type UpdateProjectGameConfigResponse,
  type UpdateProjectFileTreeResponse,
  type UploadProjectImageAssetResponse
} from "@bg-maker/shared";
import type { FastifyInstance } from "fastify";
import {
  createProjectService,
  ProjectService,
  ProjectValidationError
} from "../projects/project-service.js";
import { getProjectValidationErrorStatusCode } from "../projects/project-route-errors.js";
import {
  getProjectGameConfigPayload,
  getProjectFileTreePayload,
  toCreateProjectImageAssetRequest,
  toCreateProjectRequest
} from "../projects/project-route-payloads.js";

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
          reply.code(getProjectValidationErrorStatusCode(error));

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
          reply.code(getProjectValidationErrorStatusCode(error));

          return { message: error.message };
        }

        throw error;
      }
    }
  );

  app.patch<{ Params: ProjectRouteParams }>(
    `${apiPaths.projects}/:projectId/game-config`,
    async (request, reply): Promise<UpdateProjectGameConfigResponse | ApiErrorResponse> => {
      try {
        const project = await projectService.updateProjectGameConfig(
          request.params.projectId,
          getProjectGameConfigPayload(request.body)
        );

        if (!project) {
          reply.code(404);

          return { message: "Project not found" };
        }

        return { project };
      } catch (error) {
        if (error instanceof ProjectValidationError) {
          reply.code(getProjectValidationErrorStatusCode(error));

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
        const imageAsset = await projectService.createProjectImageAsset(
          request.params.projectId,
          toCreateProjectImageAssetRequest(request.body, request.headers)
        );

        if (!imageAsset) {
          reply.code(404);

          return { message: "Project not found" };
        }

        reply.code(201);

        return { imageAsset };
      } catch (error) {
        if (error instanceof ProjectValidationError) {
          reply.code(getProjectValidationErrorStatusCode(error));

          return { message: error.message };
        }

        throw error;
      }
    }
  );

  app.put<{ Params: ProjectRouteParams & { assetId: string } }>(
    `${apiPaths.projects}/:projectId/image-assets/:assetId`,
    async (request, reply): Promise<UploadProjectImageAssetResponse | ApiErrorResponse> => {
      try {
        const imageAsset = await projectService.replaceProjectImageAsset(
          request.params.projectId,
          request.params.assetId,
          toCreateProjectImageAssetRequest(request.body, request.headers)
        );

        if (!imageAsset) {
          reply.code(404);

          return { message: "Image asset not found" };
        }

        return { imageAsset };
      } catch (error) {
        if (error instanceof ProjectValidationError) {
          reply.code(getProjectValidationErrorStatusCode(error));

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
