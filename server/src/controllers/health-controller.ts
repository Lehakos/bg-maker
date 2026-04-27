import type { FastifyInstance } from "fastify";
import { APP_NAME, apiPaths, type HealthResponse } from "@bg-maker/shared";

export function registerHealthController(app: FastifyInstance) {
  app.get<{ Reply: HealthResponse }>(apiPaths.health, async () => ({
    appName: APP_NAME,
    status: "ok",
    timestamp: new Date().toISOString()
  }));
}
