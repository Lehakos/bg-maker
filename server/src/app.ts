import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerCardTemplatesController } from "./controllers/card-templates-controller.js";
import { registerCollectionsController } from "./controllers/collections-controller.js";
import { registerComponentsController } from "./controllers/components-controller.js";
import { registerHealthController } from "./controllers/health-controller.js";
import { registerPieceTemplatesController } from "./controllers/piece-templates-controller.js";
import { registerProjectsController } from "./controllers/projects-controller.js";
import { registerTileTemplatesController } from "./controllers/tile-templates-controller.js";

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
  registerTileTemplatesController(app);
  registerPieceTemplatesController(app);
  registerComponentsController(app);
  registerCollectionsController(app);

  return app;
}
