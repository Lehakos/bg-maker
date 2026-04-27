import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerComponentsController } from "./controllers/components-controller.js";
import { registerHealthController } from "./controllers/health-controller.js";
import { registerProjectsController } from "./controllers/projects-controller.js";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: true
  });

  registerHealthController(app);
  registerProjectsController(app);
  registerComponentsController(app);

  return app;
}
