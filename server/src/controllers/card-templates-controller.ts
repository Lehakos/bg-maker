import type { FastifyInstance } from "fastify";
import { apiPaths, type CardTemplate } from "@bg-maker/shared";
import {
  createCardTemplate,
  deleteCardTemplate,
  listCardTemplates,
  updateCardTemplate
} from "../services/card-template-service.js";

type ProjectRouteParams = {
  projectId: string;
};

type CardTemplateRouteParams = ProjectRouteParams & {
  templateId: string;
};

type ErrorResponse = {
  error: string;
};

export function registerCardTemplatesController(app: FastifyInstance) {
  app.get<{ Params: ProjectRouteParams; Reply: CardTemplate[] | ErrorResponse }>(
    apiPaths.cardTemplates(":projectId"),
    async (request, reply) => {
      const result = listCardTemplates(request.params.projectId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return result.value;
    }
  );

  app.post<{ Body: unknown; Params: ProjectRouteParams; Reply: CardTemplate | ErrorResponse }>(
    apiPaths.cardTemplates(":projectId"),
    async (request, reply) => {
      const result = createCardTemplate(request.params.projectId, request.body);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(201).send(result.value);
    }
  );

  app.patch<{
    Body: unknown;
    Params: CardTemplateRouteParams;
    Reply: CardTemplate | ErrorResponse;
  }>(apiPaths.cardTemplate(":projectId", ":templateId"), async (request, reply) => {
    const result = updateCardTemplate(
      request.params.projectId,
      request.params.templateId,
      request.body
    );

    if (!result.ok) {
      return reply.code(result.statusCode).send({ error: result.error });
    }

    return result.value;
  });

  app.delete<{ Params: CardTemplateRouteParams; Reply: ErrorResponse | void }>(
    apiPaths.cardTemplate(":projectId", ":templateId"),
    async (request, reply) => {
      const result = deleteCardTemplate(request.params.projectId, request.params.templateId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(204).send(undefined);
    }
  );
}
