import type { FastifyInstance } from "fastify";
import { apiPaths, type TileTemplate } from "@bg-maker/shared";
import {
  createTileTemplate,
  deleteTileTemplate,
  listTileTemplates,
  updateTileTemplate
} from "../services/tile-template-service.js";

type ProjectRouteParams = {
  projectId: string;
};

type TileTemplateRouteParams = ProjectRouteParams & {
  templateId: string;
};

type ErrorResponse = {
  error: string;
};

export function registerTileTemplatesController(app: FastifyInstance) {
  app.get<{ Params: ProjectRouteParams; Reply: TileTemplate[] | ErrorResponse }>(
    apiPaths.tileTemplates(":projectId"),
    async (request, reply) => {
      const result = listTileTemplates(request.params.projectId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return result.value;
    }
  );

  app.post<{ Body: unknown; Params: ProjectRouteParams; Reply: TileTemplate | ErrorResponse }>(
    apiPaths.tileTemplates(":projectId"),
    async (request, reply) => {
      const result = createTileTemplate(request.params.projectId, request.body);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(201).send(result.value);
    }
  );

  app.patch<{
    Body: unknown;
    Params: TileTemplateRouteParams;
    Reply: TileTemplate | ErrorResponse;
  }>(apiPaths.tileTemplate(":projectId", ":templateId"), async (request, reply) => {
    const result = updateTileTemplate(
      request.params.projectId,
      request.params.templateId,
      request.body
    );

    if (!result.ok) {
      return reply.code(result.statusCode).send({ error: result.error });
    }

    return result.value;
  });

  app.delete<{ Params: TileTemplateRouteParams; Reply: ErrorResponse | void }>(
    apiPaths.tileTemplate(":projectId", ":templateId"),
    async (request, reply) => {
      const result = deleteTileTemplate(request.params.projectId, request.params.templateId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(204).send(undefined);
    }
  );
}
