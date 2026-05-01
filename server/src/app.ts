import cors from "@fastify/cors";
import { projectImageAssetContentTypes } from "@bg-maker/shared";
import Fastify from "fastify";
import { registerHealthController } from "./controllers/health-controller.js";
import { registerProjectsController } from "./controllers/projects-controller.js";
import { maxProjectImageAssetBytes, type ProjectService } from "./services/project-service.js";

export type BuildAppOptions = {
  projectService?: ProjectService;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    bodyLimit: 3 * 1024 * 1024,
    logger: true
  });

  await app.register(cors, {
    origin: true
  });

  projectImageAssetContentTypes.forEach((contentType) => {
    app.addContentTypeParser(
      contentType,
      { bodyLimit: maxProjectImageAssetBytes, parseAs: "buffer" },
      (_request, body, done) => {
        done(null, body);
      }
    );
  });

  registerHealthController(app);
  registerProjectsController(app, options.projectService);

  return app;
}
