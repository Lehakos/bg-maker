import type { FastifyInstance } from "fastify";
import { apiPaths, type PieceTemplate } from "@bg-maker/shared";
import {
  createPieceTemplate,
  deletePieceTemplate,
  listPieceTemplates,
  updatePieceTemplate
} from "../services/piece-template-service.js";

type ProjectRouteParams = {
  projectId: string;
};

type PieceTemplateRouteParams = ProjectRouteParams & {
  templateId: string;
};

type ErrorResponse = {
  error: string;
};

export function registerPieceTemplatesController(app: FastifyInstance) {
  app.get<{ Params: ProjectRouteParams; Reply: PieceTemplate[] | ErrorResponse }>(
    apiPaths.pieceTemplates(":projectId"),
    async (request, reply) => {
      const result = listPieceTemplates(request.params.projectId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return result.value;
    }
  );

  app.post<{ Body: unknown; Params: ProjectRouteParams; Reply: PieceTemplate | ErrorResponse }>(
    apiPaths.pieceTemplates(":projectId"),
    async (request, reply) => {
      const result = createPieceTemplate(request.params.projectId, request.body);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(201).send(result.value);
    }
  );

  app.patch<{
    Body: unknown;
    Params: PieceTemplateRouteParams;
    Reply: PieceTemplate | ErrorResponse;
  }>(apiPaths.pieceTemplate(":projectId", ":templateId"), async (request, reply) => {
    const result = updatePieceTemplate(
      request.params.projectId,
      request.params.templateId,
      request.body
    );

    if (!result.ok) {
      return reply.code(result.statusCode).send({ error: result.error });
    }

    return result.value;
  });

  app.delete<{ Params: PieceTemplateRouteParams; Reply: ErrorResponse | void }>(
    apiPaths.pieceTemplate(":projectId", ":templateId"),
    async (request, reply) => {
      const result = deletePieceTemplate(request.params.projectId, request.params.templateId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(204).send(undefined);
    }
  );
}
