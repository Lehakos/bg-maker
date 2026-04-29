import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const envSearchDirectories = [
  process.cwd(),
  currentDirectory,
  dirname(currentDirectory),
  dirname(dirname(currentDirectory))
];

const envFilePath = envSearchDirectories
  .map((directory) => join(directory, ".env"))
  .find((filePath) => existsSync(filePath));

if (envFilePath) {
  loadEnvFile(envFilePath);
}

const app = await buildApp();

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
