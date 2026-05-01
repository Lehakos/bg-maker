import { apiPaths, type HealthResponse } from "@bg-maker/shared";
import type { FastifyInstance } from "fastify";

export function registerHealthController(app: FastifyInstance) {
  app.get(
    apiPaths.health,
    async (): Promise<HealthResponse> => ({
      ok: true,
      service: "bg-maker-api"
    })
  );
}
