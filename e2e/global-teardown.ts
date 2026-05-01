import { rm } from "node:fs/promises";

export default async function globalTeardown() {
  const dataDirectory = process.env.BGM_E2E_DATA_DIR;

  if (!dataDirectory?.startsWith("/private/tmp/bg-maker-e2e-")) {
    return;
  }

  await rm(dataDirectory, { recursive: true, force: true });
}
