import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerCardTemplatesController } from "./controllers/card-templates-controller.js";
import { registerComponentsController } from "./controllers/components-controller.js";
import { registerHealthController } from "./controllers/health-controller.js";
import { registerProjectsController } from "./controllers/projects-controller.js";

export async function buildApp() {
  const app = Fastify({
    bodyLimit: 3 * 1024 * 1024,
    logger: true
  });

  await app.register(cors, {
    origin: true
  });

  registerHealthController(app);
  registerProjectsController(app);
  registerCardTemplatesController(app);
  registerComponentsController(app);

  return app;
}
