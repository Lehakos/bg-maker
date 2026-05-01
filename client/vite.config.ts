import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET ?? env.VITE_API_URL ?? "http://localhost:3000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5174,
      proxy: {
        "/api": apiProxyTarget
      }
    }
  };
});
