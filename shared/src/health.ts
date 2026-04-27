import { APP_NAME } from "./app.js";

export type HealthResponse = {
  appName: typeof APP_NAME;
  status: "ok";
  timestamp: string;
};
