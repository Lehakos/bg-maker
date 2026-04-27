export const APP_NAME = "BG Maker";

export const apiPaths = {
  health: "/api/health",
  projects: "/api/projects",
  project: (projectId: string) => `/api/projects/${projectId}`
} as const;

export type HealthResponse = {
  appName: typeof APP_NAME;
  status: "ok";
  timestamp: string;
};

export const projectStatuses = ["draft", "testing", "ready"] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export type GameProject = {
  id: string;
  name: string;
  description: string;
  players: string;
  status: ProjectStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type GameProjectSummary = Pick<
  GameProject,
  "id" | "name" | "players" | "status" | "updatedAt"
>;

export type CreateGameProjectInput = {
  name: string;
  description?: string;
  players?: string;
  status?: ProjectStatus;
  notes?: string;
};

export type UpdateGameProjectInput = Partial<CreateGameProjectInput>;
