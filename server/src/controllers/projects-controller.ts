import type { FastifyInstance } from "fastify";
import { apiPaths, type GameProject, type GameProjectSummary } from "@bg-maker/shared";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject
} from "../services/project-service.js";

type ProjectRouteParams = {
  projectId: string;
};

type ErrorResponse = {
  error: string;
};

export function registerProjectsController(app: FastifyInstance) {
  app.get<{ Reply: GameProjectSummary[] }>(apiPaths.projects, async () => listProjects());

  app.post<{ Body: unknown; Reply: GameProject | ErrorResponse }>(
    apiPaths.projects,
    async (request, reply) => {
      const result = createProject(request.body);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(201).send(result.value);
    }
  );

  app.get<{ Params: ProjectRouteParams; Reply: GameProject | ErrorResponse }>(
    apiPaths.project(":projectId"),
    async (request, reply) => {
      const result = getProject(request.params.projectId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return result.value;
    }
  );

  app.patch<{
    Body: unknown;
    Params: ProjectRouteParams;
    Reply: GameProject | ErrorResponse;
  }>(apiPaths.project(":projectId"), async (request, reply) => {
    const result = updateProject(request.params.projectId, request.body);

    if (!result.ok) {
      return reply.code(result.statusCode).send({ error: result.error });
    }

    return result.value;
  });

  app.delete<{ Params: ProjectRouteParams; Reply: ErrorResponse | undefined }>(
    apiPaths.project(":projectId"),
    async (request, reply) => {
      const result = deleteProject(request.params.projectId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(204).send(undefined);
    }
  );
}
