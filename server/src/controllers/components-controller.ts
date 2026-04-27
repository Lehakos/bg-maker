import type { FastifyInstance } from "fastify";
import { apiPaths, type GameComponent } from "@bg-maker/shared";
import {
  createComponent,
  deleteComponent,
  listComponents,
  updateComponent
} from "../services/component-service.js";

type ProjectRouteParams = {
  projectId: string;
};

type ComponentRouteParams = ProjectRouteParams & {
  componentId: string;
};

type ErrorResponse = {
  error: string;
};

export function registerComponentsController(app: FastifyInstance) {
  app.get<{ Params: ProjectRouteParams; Reply: GameComponent[] | ErrorResponse }>(
    apiPaths.components(":projectId"),
    async (request, reply) => {
      const result = listComponents(request.params.projectId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return result.value;
    }
  );

  app.post<{ Body: unknown; Params: ProjectRouteParams; Reply: GameComponent | ErrorResponse }>(
    apiPaths.components(":projectId"),
    async (request, reply) => {
      const result = createComponent(request.params.projectId, request.body);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(201).send(result.value);
    }
  );

  app.patch<{
    Body: unknown;
    Params: ComponentRouteParams;
    Reply: GameComponent | ErrorResponse;
  }>(apiPaths.component(":projectId", ":componentId"), async (request, reply) => {
    const result = updateComponent(
      request.params.projectId,
      request.params.componentId,
      request.body
    );

    if (!result.ok) {
      return reply.code(result.statusCode).send({ error: result.error });
    }

    return result.value;
  });

  app.delete<{ Params: ComponentRouteParams; Reply: ErrorResponse | undefined }>(
    apiPaths.component(":projectId", ":componentId"),
    async (request, reply) => {
      const result = deleteComponent(request.params.projectId, request.params.componentId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(204).send(undefined);
    }
  );
}
