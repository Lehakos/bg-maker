import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  APP_NAME,
  apiPaths,
  type GamePrototypeSummary,
  type HealthResponse
} from "@bg-maker/shared";

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

app.get<{ Reply: HealthResponse }>(apiPaths.health, async () => ({
  appName: APP_NAME,
  status: "ok",
  timestamp: new Date().toISOString()
}));

app.get<{ Reply: GamePrototypeSummary[] }>(apiPaths.prototypes, async () => [
  {
    id: "solo-dungeon",
    name: "Solo Dungeon",
    players: "1",
    status: "draft",
    updatedAt: new Date().toISOString()
  },
  {
    id: "market-race",
    name: "Market Race",
    players: "2-4",
    status: "testing",
    updatedAt: new Date().toISOString()
  }
]);

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
