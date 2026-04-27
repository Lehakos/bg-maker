export const APP_NAME = "BG Maker";

export const apiPaths = {
  health: "/api/health",
  prototypes: "/api/prototypes"
} as const;

export type HealthResponse = {
  appName: typeof APP_NAME;
  status: "ok";
  timestamp: string;
};

export type GamePrototypeSummary = {
  id: string;
  name: string;
  players: string;
  status: "draft" | "testing" | "ready";
  updatedAt: string;
};
