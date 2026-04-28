import type { FastifyInstance } from "fastify";
import { apiPaths, type ComponentCollection } from "@bg-maker/shared";
import {
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection
} from "../services/collection-service.js";

type ProjectRouteParams = {
  projectId: string;
};

type CollectionRouteParams = ProjectRouteParams & {
  collectionId: string;
};

type ErrorResponse = {
  error: string;
};

export function registerCollectionsController(app: FastifyInstance) {
  app.get<{ Params: ProjectRouteParams; Reply: ComponentCollection[] | ErrorResponse }>(
    apiPaths.collections(":projectId"),
    async (request, reply) => {
      const result = listCollections(request.params.projectId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return result.value;
    }
  );

  app.post<{
    Body: unknown;
    Params: ProjectRouteParams;
    Reply: ComponentCollection | ErrorResponse;
  }>(apiPaths.collections(":projectId"), async (request, reply) => {
    const result = createCollection(request.params.projectId, request.body);

    if (!result.ok) {
      return reply.code(result.statusCode).send({ error: result.error });
    }

    return reply.code(201).send(result.value);
  });

  app.patch<{
    Body: unknown;
    Params: CollectionRouteParams;
    Reply: ComponentCollection | ErrorResponse;
  }>(apiPaths.collection(":projectId", ":collectionId"), async (request, reply) => {
    const result = updateCollection(
      request.params.projectId,
      request.params.collectionId,
      request.body
    );

    if (!result.ok) {
      return reply.code(result.statusCode).send({ error: result.error });
    }

    return result.value;
  });

  app.delete<{ Params: CollectionRouteParams; Reply: ErrorResponse | void }>(
    apiPaths.collection(":projectId", ":collectionId"),
    async (request, reply) => {
      const result = deleteCollection(request.params.projectId, request.params.collectionId);

      if (!result.ok) {
        return reply.code(result.statusCode).send({ error: result.error });
      }

      return reply.code(204).send(undefined);
    }
  );
}
