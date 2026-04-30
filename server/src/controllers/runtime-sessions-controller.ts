import type { FastifyInstance } from "fastify";
import {
  apiPaths,
  type RuntimeSession,
  type RuntimeSessionSummary
} from "@bg-maker/shared";
import {
  applyRuntimeAction,
  createRuntimeSession,
  deleteRuntimeSession,
  getRuntimeSession,
  listRuntimeSessions
} from "../services/runtime-session-service.js";

type ProjectRouteParams = {
  projectId: string;
};

type SessionRouteParams = ProjectRouteParams & {
  sessionId: string;
};

type ErrorResponse = {
  error: string;
};

export function registerRuntimeSessionsController(app: FastifyInstance) {
  app.get<{ Params: ProjectRouteParams; Reply: ErrorResponse | RuntimeSessionSummary[] }>(
    apiPaths.runtimeSessions(":projectId"),
    async (request, reply) => {
      const result = listRuntimeSessions(request.params.projectId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return result.value;
    }
  );

  app.post<{ Body: unknown; Params: ProjectRouteParams; Reply: ErrorResponse | RuntimeSession }>(
    apiPaths.runtimeSessions(":projectId"),
    async (request, reply) => {
      const result = createRuntimeSession(request.params.projectId, request.body);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(201).send(result.value);
    }
  );

  app.get<{ Params: SessionRouteParams; Reply: ErrorResponse | RuntimeSession }>(
    apiPaths.runtimeSession(":projectId", ":sessionId"),
    async (request, reply) => {
      const result = getRuntimeSession(request.params.projectId, request.params.sessionId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return result.value;
    }
  );

  app.post<{ Body: unknown; Params: SessionRouteParams; Reply: ErrorResponse | RuntimeSession }>(
    apiPaths.runtimeSessionActions(":projectId", ":sessionId"),
    async (request, reply) => {
      const result = applyRuntimeAction(
        request.params.projectId,
        request.params.sessionId,
        request.body
      );

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return result.value;
    }
  );

  app.delete<{ Params: SessionRouteParams; Reply: ErrorResponse | undefined }>(
    apiPaths.runtimeSession(":projectId", ":sessionId"),
    async (request, reply) => {
      const result = deleteRuntimeSession(request.params.projectId, request.params.sessionId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(204).send(undefined);
    }
  );
}
