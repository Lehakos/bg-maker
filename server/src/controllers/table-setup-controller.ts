import type { FastifyInstance } from "fastify";
import { apiPaths, type TableSetup } from "@bg-maker/shared";
import { getTableSetup, updateTableSetup } from "../services/table-setup-service.js";

type ProjectRouteParams = {
  projectId: string;
};

type ErrorResponse = {
  error: string;
};

export function registerTableSetupController(app: FastifyInstance) {
  app.get<{ Params: ProjectRouteParams; Reply: ErrorResponse | TableSetup }>(
    apiPaths.tableSetup(":projectId"),
    async (request, reply) => {
      const result = getTableSetup(request.params.projectId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return result.value;
    }
  );

  app.put<{ Body: unknown; Params: ProjectRouteParams; Reply: ErrorResponse | TableSetup }>(
    apiPaths.tableSetup(":projectId"),
    async (request, reply) => {
      const result = updateTableSetup(request.params.projectId, request.body);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return result.value;
    }
  );
}
